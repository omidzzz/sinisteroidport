/** trace-mobile.mjs — one-off mobile audit for /en/ with --save-assets. */
import { spawn, spawnSync } from "node:child_process";
import path from "node:path";
import fs from "node:fs";
import os from "node:os";
import http from "node:http";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const probe = http.createServer();
await new Promise((r) => probe.listen(0, "127.0.0.1", r));
const PORT = probe.address().port;
probe.close();
const srv = spawn(process.execPath, [
  path.join(root, "scripts", "tools", "serve-out.mjs"),
  "--port", String(PORT), "--root", path.join(root, "out"),
], { cwd: root });
await new Promise((r) => setTimeout(r, 1500));

const outPath = path.join(root, ".lighthouse", "trace-run");
fs.rmSync(outPath, { recursive: true, force: true });
fs.mkdirSync(outPath, { recursive: true });
const profile = path.join(os.tmpdir(), `lh-trace-${Date.now()}`);
const lhCli = path.join(root, "node_modules", "lighthouse", "cli", "index.js");
const chromePath = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const res = spawnSync(process.execPath, [
  lhCli, `http://127.0.0.1:${PORT}/en/`,
  "--output=json", `--output-path=${path.join(outPath, "report.json")}`,
  "--save-assets", "--chrome-path=" + chromePath,
  "--chrome-flags=--headless=new --no-sandbox --disable-gpu --disable-dev-shm-usage --disable-background-networking --no-first-run --disable-default-apps --disable-component-update --user-data-dir=" + profile,
  "--quiet",
], { cwd: root, encoding: "utf8", timeout: 15 * 60_000 });
try { fs.rmSync(profile, { recursive: true, force: true }); } catch {}
srv.kill();
console.log("exit:", res.status);
console.log("files:", fs.readdirSync(outPath).filter((f) => !/\.json$/.test(f) || /proto/.test(f) || /trace/.test(f)));

const report = JSON.parse(fs.readFileSync(path.join(outPath, "report.json"), "utf8"));
const a = report.audits;
for (const k of ["first-contentful-paint", "largest-contentful-paint", "total-blocking-time", "cumulative-layout-shift", "speed-index"]) {
  console.log(k, "=", a[k]?.displayValue);
}
console.log("perf score:", report.categories.performance.score);