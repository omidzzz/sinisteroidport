/**
 * shot-ticker.mjs — screenshot the hero so the ticker can be eyeballed.
 * Captures the ticker at two moments ~1.4s apart so the change in strip
 * position is visible, plus a scrolled shot for the section rules.
 *
 * Usage:
 *   node scripts/tools/serve-out.mjs --port 4173 --root out
 *   node scripts/tools/shot-ticker.mjs http://127.0.0.1:4173
 */
import fs from "node:fs";
import puppeteer from "puppeteer-core";
import { Launcher } from "chrome-launcher";

const base = process.argv[2] ?? "http://127.0.0.1:4173";
const OUT = ".shots/ticker";
fs.mkdirSync(OUT, { recursive: true });

const executablePath = Launcher.getInstallations()[0];
const browser = await puppeteer.launch({
  executablePath,
  args: ["--no-sandbox"],
  defaultViewport: { width: 1280, height: 900, deviceScaleFactor: 1 },
});

try {
  for (const route of ["en", "fa"]) {
    const page = await browser.newPage();
    await page.goto(`${base}/${route}/`, {
      waitUntil: "networkidle2",
      timeout: 45000,
    });
    await new Promise((r) => setTimeout(r, 900));

    const band = await page.$(".craft-ticker-bleed");
    if (band) {
      await band.screenshot({ path: `${OUT}/${route}-ticker-a.png` });
      await new Promise((r) => setTimeout(r, 1400));
      await band.screenshot({ path: `${OUT}/${route}-ticker-b.png` });
    }

    // Scrolled: the section rules + service cards.
    await page.evaluate(() => window.scrollTo(0, 1250));
    await new Promise((r) => setTimeout(r, 800));
    await page.screenshot({ path: `${OUT}/${route}-mid.png` });

    console.log(`shot ${route}`);
    await page.close();
  }
} finally {
  await browser.close();
}

console.log("shots in " + OUT);
