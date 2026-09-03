/**
 * audit.mjs — reproducible Lighthouse performance audits for the static export.
 *
 * Usage:
 *   npm run build        (fresh static export in out/)
 *   node scripts/tools/audit.mjs [--presets mobile,desktop] [--pages /en/,/en/blog/]
 *
 * Serves out/ on 127.0.0.1:4173 (dependency-free static server) and runs
 * the Lighthouse CLI (via npx, no devDependency) per page × preset. Writes
 * raw JSON reports to .lighthouse/ and prints a score/metric table so perf
 * changes can be verified metric-by-metric instead of by feel.
 */
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const outDir = path.join(root, "out");
const reportDir = path.join(root, ".lighthouse");

const args = process.argv.slice(2);
const getOpt = (name, fallback) => {
  const i = args.indexOf(name);
  return i !== -1 && args[i + 1] ? args[i + 1] : fallback;
};
const presets = getOpt("--presets", "mobile,desktop").split(",");
const pages = getOpt(
  "--pages",
  ["/en/", "/en/blog/", "/en/blog/design-without-words-is-decoration/"].join(",")
).split(",");

if (!fs.existsSync(path.join(outDir, "en", "index.html"))) {
  console.error("out/en/index.html missing — run `npm run build` first.");
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

const server = http.createServer((req, res) => {
  try {
    let urlPath = decodeURIComponent(new URL(req.url, "http://x").pathname);
    // Same canonicalization the .htaccess does: locale-less URLs are 301'd
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
    res.writeHead(200, {
      "Content-Type": MIME[path.extname(file)] ?? "application/octet-stream",
    });
    fs.createReadStream(file).pipe(res);
  } catch {
    res.writeHead(500);
    res.end();
  }
});

// Ephemeral port — concurrent/parallel audits never collide.
await new Promise((r) => server.listen(0, "127.0.0.1", r));
const PORT = server.address().port;

fs.mkdirSync(reportDir, { recursive: true });

/** One Lighthouse run → parsed { score, metrics } or null. */
function runLighthouse(url, preset) {
  const slug = `${urlPathSlug(url)}-${preset}`;
  const outPath = path.join(reportDir, `${slug}.json`);
  // NB: build ONE shell string — spawnSync with shell:true + args array
  // strips the embedded quotes around --chrome-flags on Windows, and
  // lighthouse then rejects the split flags as unknown arguments.
  const flags = [
    `--output=json`,
    `--output-path="${outPath}"`,
    `--only-categories=performance`,
    `--chrome-flags="--headless=new --disable-dev-shm-usage"`,
    `--quiet`,
  ];
  if (preset === "desktop") flags.push(`--preset=desktop`);
  const cmd = `npx --yes lighthouse http://127.0.0.1:${PORT}${url} ${flags.join(" ")}`;
  const res = spawnSync(cmd, {
    cwd: root,
    shell: true,
    encoding: "utf8",
    timeout: 5 * 60_000,
  });
  if (res.status !== 0 || !fs.existsSync(outPath)) {
    console.error(`  ✗ lighthouse failed for ${url} (${preset})`);
    const err = String(res.stderr ?? res.stdout ?? "").slice(-800);
    if (err.trim()) console.error(err);
    return null;
  }
  const report = JSON.parse(fs.readFileSync(outPath, "utf8"));
  const a = report.audits;
  return {
    score: report.categories?.performance?.score ?? 0,
    metrics: {
      FCP: a["first-contentful-paint"]?.numericValue,
      LCP: a["largest-contentful-paint"]?.numericValue,
      TBT: a["total-blocking-time"]?.numericValue,
      CLS: a["cumulative-layout-shift"]?.numericValue,
      SI: a["speed-index"]?.numericValue,
    },
  };
}

const urlPathSlug = (u) => u.replace(/^\/|\/$/g, "").replace(/[/?#]/g, "-") || "root";

console.log(`\nServing ${outDir} on http://127.0.0.1:${PORT}\n`);
const results = [];
for (const preset of presets) {
  for (const page of pages) {
    process.stdout.write(`▶ ${preset.padEnd(7)} ${page} … `);
    const r = runLighthouse(page, preset.trim());
    if (r) {
      results.push({ preset: preset.trim(), page, ...r });
      const m = r.metrics;
      const fmt = (v) => (v == null ? "  —  " : v.toFixed(v < 1 ? 3 : 0).padStart(7));
      console.log(
        `perf ${String(Math.round(r.score * 100)).padStart(3)} | ` +
          `FCP${fmt(m.FCP)} LCP${fmt(m.LCP)} TBT${fmt(m.TBT)} CLS${fmt(m.CLS)} SI${fmt(m.SI)}`
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
