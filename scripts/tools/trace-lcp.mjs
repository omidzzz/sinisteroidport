/**
 * trace-lcp.mjs — capture a Lighthouse trace for LCP analysis.
 *
 * Usage: node scripts/tools/trace-lcp.mjs
 * Requires: a static server running on $SERVE_PORT (default 51377)
 */
import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const port = process.env.SERVE_PORT || "51377";
const target = `http://127.0.0.1:${port}/en/`;

const chromePath = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const lhCli = path.join(root, "node_modules", "lighthouse", "cli", "index.js");

const outJson = path.join(root, ".lighthouse", "trace-lcp-out.json");
const outTrace = path.join(root, ".lighthouse", "trace-lcp.trace.json");

const args = [
  lhCli,
  target,
  "--output=json",
  `--output-path=${outJson}`,
  `--chrome-path=${chromePath}`,
  "--chrome-flags=--headless=new --no-sandbox --disable-gpu --disable-dev-shm-usage --disable-background-networking --no-first-run --disable-default-apps --disable-component-update --timeout=60000",
  "--quiet",
  "--trace",
  `--trace-path=${outTrace}`,
];

console.log("Running Lighthouse trace for", target);
const child = spawn(process.execPath, args, { cwd: root, stdio: ["ignore", "pipe", "pipe"] });

let stdout = "";
let stderr = "";
child.stdout.on("data", (d) => (stdout += d.toString()));
child.stderr.on("data", (d) => (stderr += d.toString()));

child.on("close", (code) => {
  console.log("exit:", code);
  if (stderr) console.log("stderr:", stderr.slice(-500));
  if (stdout) console.log("stdout:", stdout.slice(-500));
  
  // Check outputs
  const jsonExists = fs.existsSync(outJson);
  const traceExists = fs.existsSync(outTrace);
  console.log("\nJSON output:", jsonExists, jsonExists ? fs.statSync(outJson).size + " bytes" : "MISSING");
  console.log("Trace output:", traceExists, traceExists ? fs.statSync(outTrace).size + " bytes" : "MISSING");
  
  if (jsonExists) {
    const j = JSON.parse(fs.readFileSync(outJson, "utf8"));
    const a = j.audits;
    console.log("\n--- Results ---");
    console.log("LCP:", a["largest-contentful-paint"]?.numericValue, a["largest-contentful-paint"]?.displayValue);
    console.log("FCP:", a["first-contentful-paint"]?.numericValue, a["first-contentful-paint"]?.displayValue);
    console.log("TBT:", a["total-blocking-time"]?.numericValue);
    console.log("CLS:", a["cumulative-layout-shift"]?.numericValue);
  }
});
