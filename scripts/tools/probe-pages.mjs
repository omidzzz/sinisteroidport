/**
 * probe-pages.mjs — load key routes in real Chrome and report what they do.
 *
 * Retiring CSS is easy to get wrong in ways a static check cannot see, so this
 * is the browser-level counterpart to verify-craft: it loads each route from the
 * served `out/`, screenshots it, reports console/page errors, and prints the
 * computed style of a probe element — proof that the sheet which styles that
 * element is still doing its job.
 *
 * Uses the installed Chrome via chrome-launcher (puppeteer-core, no download).
 *
 * Usage:
 *   node scripts/tools/serve-out.mjs --port 4173 --root out
 *   npm run probe:pages -- http://127.0.0.1:4173
 *
 * Screenshots land in .lighthouse/probe (gitignored).
 */
import fs from "node:fs";
import puppeteer from "puppeteer-core";
import { Launcher } from "chrome-launcher";

const base = process.argv[2] ?? "http://127.0.0.1:4173";
const OUT = ".lighthouse/probe";
fs.mkdirSync(OUT, { recursive: true });
const executablePath = Launcher.getInstallations()[0];

/** Route + the element that proves its body sheet is applied. */
const PAGES = [
  { path: "/en/", probe: ".craft-hero-name" },
  { path: "/en/work/", probe: ".tl-card" },
  { path: "/en/skills/", probe: ".skill-cell" },
  { path: "/en/education/", probe: ".edu-card" },
  { path: "/en/showcase/", probe: ".bento-frame" },
  { path: "/en/lab/", probe: ".lab-plate" },
  { path: "/en/blog/", probe: ".issue-card" },
  { path: "/en/contact/", probe: ".contact-value" },
  { path: "/fa/", probe: ".craft-prompt" },
];

const browser = await puppeteer.launch({ executablePath, args: ["--no-sandbox"] });
const report = [];

for (const { path: route, probe } of PAGES) {
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 950, deviceScaleFactor: 1 });
  const errors = [];
  page.on("pageerror", (e) => errors.push(String(e).slice(0, 120)));
  page.on("console", (m) => {
    if (m.type() === "error") errors.push(m.text().slice(0, 120));
  });

  await page.goto(base + route, { waitUntil: "networkidle2", timeout: 45000 });
  await new Promise((r) => setTimeout(r, 700));

  const probeResult = await page.evaluate((sel) => {
    const el = document.querySelector(sel);
    if (!el) return "element missing";
    const s = getComputedStyle(el);
    return `${s.display} · border ${s.borderTopWidth} · ${s.backgroundColor}`;
  }, probe);

  const name = route.replace(/\/+$/, "").replace(/\//g, "_") || "root";
  await page.screenshot({ path: `${OUT}/${name}.png`, fullPage: true });
  report.push(`${route.padEnd(16)} ${probe.padEnd(18)} ${probeResult}   errors:${errors.length}`);
  await page.close();
}

await browser.close();
console.log(report.join("\n"));
