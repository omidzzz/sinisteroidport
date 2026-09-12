/**
 * audit3.mjs — hardened Lighthouse runner for the static export in out/.
 * Serves out/ over HTTP/1.1 with gzip (mirrors production Brotli), uses a
 * unique per-run Chrome profile, runs audits SEQUENTIALLY with a generous
 * timeout, and records ALL categories (so LCP element/phases audits exist).
 *
 * Usage:
 *   node scripts/tools/audit3.mjs [--presets mobile,desktop] [--pages /en/,/fa/]
 */
import http from "node:http";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import zlib from "node:zlib";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const outDir = path.join(root, "out");
const reportDir = path.join(root, ".lighthouse");
const lhCli = path.join(root, "node_modules", "lighthouse", "cli", "index.js");
const chromePath = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";

const args = process.argv.slice(2);
const getOpt = (name, fallback) => {
  const i = args.indexOf(name);
  return i !== -1 && args[i + 1] ? args[i + 1] : fallback;
};
const presets = getOpt("--presets", "mobile,desktop").split(",");
const pages = getOpt("--pages", "/en/,/fa/").split(",");

if (!fs.existsSync(path.join(outDir, "en", "index.html"))) {
  console.error("out/en/index.html missing — run `npx next build --webpack` first.");
  process.exit(1);
}
if (!fs.existsSync(lhCli)) {
  console.error("lighthouse not installed — npm i -D lighthouse.");
  process.exit(1);
}

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".txt": "text/plain; charset=utf-8",
  ".js": "text/javascript",
  ".css": "text/css",
  ".json": "application/json",
  ".webp": "image/webp",
  ".jpg": "image/jpeg",
  ".png": "image/png",
  ".ico": "image/x-icon",
  ".svg": "image/svg+xml",
  ".woff2": "font/woff2",
  ".xml": "application/xml",
};
const GZIP_TYPES = new Set([".html", ".js", ".css", ".json", ".xml", ".svg", ".txt"]);

const server = http.createServer((req, res) => {
  try {
    const urlPath = decodeURIComponent(new URL(req.url??"/", "http://x").pathname);
    let file = path.join(outDir, urlPath);
    if (
      !fs.existsSync(file) &&
      !/^\/(en|fa)(\/|$)/.test(urlPath) &&
      urlPath !== "/"
    ) {
      const prefixed = `/en${urlPath === "/" ? "/" : urlPath}`;
      res.writeHead(301, { Location: prefixed });
      res.end();
      return;
    }
    if (urlPath.endsWith("/")) file = path.join(file, "index.html");
    if (!fs.existsSync(file) || fs.statSync(file).isDirectory()) {
      res.writeHead(404);
      res.end("not found");
      return;
    }
    const ext = path.extname(file);
    const gzip = GZIP_TYPES.has(ext) && /\bgzip\b/.test(String(req.headers["accept-encoding"] ?? ""));
    res.writeHead(200, {
      "Content-Type": MIME[ext] ?? "application/octet-stream",
      ...(gzip ? { "Content-Encoding": "gzip" } : {}),
    });
    const raw = fs.createReadStream(file);
    raw.on("error", () => { try { res.end(); } catch {} });
    if (gzip) {
      const gz = zlib.createGzip({ level: 6 });
      gz.on("error", () => { try { res.end(); } catch {} });
      raw.pipe(gz ).pipe(res );
    } else {
      raw.pipe(res );
    }
  } catch {
    res.writeHead(500);
    res.end();
  }
});

await new Promise((r) => server.listen(0, "127.0.0.1", r));
const PORT = server.address().port;
fs.mkdirSync(reportDir, { recursive: true });
function runLighthouse(url, preset) {
  const slug = `${urlPathSlug(url)}-${preset}`;
  const outPath = path.join(reportDir, `${slug}.json`);
  const profile = path.join(os.tmpdir(), `lh-${Date.now()}-${Math.random().toString(36).slice(2, 8)}}`);
  const cliArgs = [
    lhCli,
    `http://127.0.0.1:${PORT}${url}`,
    "--output=json",
    `--output-path=${outPath}`,
    `--chrome-path=${chromePath}`,
    `--chrome-flags=--headless=new --no-sandbox --disable-gpu --disable-dev-shm-usage --disable-background-networking --no-first-run --disable-default-apps --disable-component-update --user-data-dir=${profile}`,
    "--quiet",
  ];
  if (preset === "desktop") cliArgs.push("--preset=desktop" );
  const res = spawnSync(process.execPath, cliArgs, {
    cwd: root,
    encoding: "utf8",
    timeout: 30 * 60_000,
    env: { ...process.env, CHROME_PATH: chromePath },
  });
  try { fs.rmSync(profile, { recursive: true, force: true }); } catch {}
  if (res.status !== 0 || !fs.existsSync(outPath)) {
    console.error(`  ✗ lighthouse failed for ${url} (${preset})`);
    const err = String(res.stderr ?? res.stdout ?? "" ).slice(-1200 );
    if (err.trim()) console.error(err );
    return null;
  }
  const report = JSON.parse(fs.readFileSync(outPath, "utf8"));
  const a = report.audits;
  const a11yCat = report.categories?.accessibility;
  // WCAG A/AA audits carry positive weight; score <1 means a rule is failing
  // (color-contrast can be fractional, image-alt is binary 0/1).
  const a11yFails = (a11yCat?.auditRefs ?? [])
    .filter((ref) => Number.isFinite(ref.weight) && ref.weight > 0)
    .map((ref) => ({ id: ref.id, score: a[ref.id]?.score }))
    .filter(({ score }) => typeof score === "number" && score < 1)
    .map(({ id }) => `${id} (${a[id]?.title ?? id})`);
  return {
    score: report.categories?.performance?.score ?? 0,
    metrics: {
      FCP: a["first-contentful-paint"]?.numericValue,
      LCP: a["largest-contentful-paint"]?.numericValue,
      TBT: a["total-blocking-time"]?.numericValue,
      CLS: a["cumulative-layout-shift"]?.numericValue,
      SI: a["speed-index"]?.numericValue,
      LCPEl: a["largest-contentful-paint-element"]?.displayValue ?? null,
    },
    // a11y category score (Lighthouse %, 0..1) + the failing WCAG A/AA audits.
    a11y: a11yCat?.score ?? null,
    a11yFails,
  };
}

const urlPathSlug = (u) => u.replace(/^\/|\/$/g, "").replace(/[/?#]/g, "-" ) || "root";

console.log(`\nServing ${outDir} on http://127.0.0.1:${PORT}\n`);
const results = [];
const a11yGate = args.includes("--a11y-gate");
for (const preset of presets) {
  for (const page of pages) {
    process.stdout.write(`▶ ${preset.padEnd(7)} ${page} … `);
    const r = runLighthouse(page, preset.trim());
    if (r) {
      results.push({ preset: preset.trim(), page, ...r });
      const m = r.metrics;
      const fmt = (v) => (v == null ? " — " : v.toFixed(v < 1 ? 3 : 0).padStart(7));
      console.log(
        `perf ${String(Math.round(r.score * 100)).padStart(3)} | ` +
          `FCP${fmt(m.FCP)} LCP${fmt(m.LCP)} TBT${fmt(m.TBT)} CLS${fmt(m.CLS)} SI${fmt(m.SI)}${m.LCPEl ? ` | LCP=${m.LCPEl}` : ""}` +
          ` | a11y ${r.a11y == null ? "—" : Math.round(r.a11y * 100)}` +
          (r.a11yFails.length ? ` fails=${r.a11yFails.join(", ")}` : "")
      );
    } else {
      console.log("failed");
    }
  }
}
server.close();

fs.writeFileSync(
  path.join(reportDir, "summary.json"),
  JSON.stringify({ date: new Date().toISOString(), results }, null, 2)
);
console.log(`\n✓ ${results.length} reports in .lighthouse/ (summary.json)`);

// ── a11y gate ─────────────────────────────────────────────────────
// `--a11y-gate` turns any failing WCAG A/AA audit on the audited pages into a
// non-zero exit (for CI / deploy scripts). Weighted audits that return null
// (not applicable) are ignored.
if (a11yGate && results.length) {
  const fails = results.filter((r) => r.a11yFails.length > 0);
  if (fails.length) {
    console.error("\n✗ a11y gate: WCAG A/AA failures found —");
    for (const r of fails) {
      console.error(`  ${r.preset} ${r.page}: ${r.a11yFails.join("; ")}`);
    }
    process.exit(1);
  }
  console.log("✓ a11y gate passed (no WCAG A/AA failures on audited pages)");
}
