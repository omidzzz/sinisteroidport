/**
 * serve-out.mjs — stand-alone static server for Lighthouse audits.
 * Serves <rootDir> over HTTP/1.1 with gzip on 127.0.0.1:<port>.
 * Runs as its own process so the Lighthouse CLI never stalls it
 * (a server co-located with a blocking spawnSync deadlocks the page load).
 *
 * Usage: node scripts/tools/serve-out.mjs --port 4173 --root out
 */
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";

const argv = process.argv.slice(2);
const getOpt = (name, fallback) => {
  const i = argv.indexOf(name);
  return i !== -1 && argv[i + 1] ? argv[i + 1] : fallback;
};
const PORT = Number(getOpt("--port", "0"));
const rootDir = path.resolve(getOpt("--root", "out"));
const bounds = getOpt("--host", "127.0.0.1");
// `--latency N` — delay every response's first byte by N ms so local audits
// see PSI-like server latency. Without it an instant disk serve lets fonts
// arrive before first paint and hides the font-swap reflow that PSI counts
// as CLS.
const LATENCY_MS = Math.max(0, parseInt(getOpt("--latency", "0"), 10) || 0);

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
    const urlPath = decodeURIComponent(new URL(req.url ?? "/", `http://${bounds}`).pathname);
    let file = path.join(rootDir, urlPath);
    if (urlPath.endsWith("/")) file = path.join(file, "index.html");
    if (!fs.existsSync(file) || fs.statSync(file).isDirectory()) {
      res.writeHead(404);
      res.end("not found");
      return;
    }
    const ext = path.extname(file);
    const gzip = GZIP_TYPES.has(ext) && /\bgzip\b/.test(String(req.headers["accept-encoding"] ?? ""));
    const send = () => {
      res.writeHead(200, {
        "Content-Type": MIME[ext] ?? "application/octet-stream",
        ...(gzip ? { "Content-Encoding": "gzip" } : {}),
      });
      const raw = fs.createReadStream(file);
      raw.on("error", () => { try { res.end(); } catch {} });
      if (gzip) {
        const gz = zlib.createGzip({ level: 6 });
        gz.on("error", () => { try { res.end(); } catch {} });
        raw.pipe(gz).pipe(res);
      } else {
        raw.pipe(res);
      }
    };
    if (LATENCY_MS > 0) setTimeout(send, LATENCY_MS);
    else send();
  } catch {
    res.writeHead(500);
    res.end();
  }
});

await new Promise((r) => server.listen(PORT, bounds, r));
console.log(`serving ${rootDir} on ${bounds}:${server.address().port}`);