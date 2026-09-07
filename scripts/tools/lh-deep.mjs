import fs from "node:fs";
import path from "node:path";

// Deep-dump the most useful audits from a Lighthouse JSON report.
// Usage: node scripts/tools/lh-deep.mjs <report.json> [extraAuditId ...]

const reportPath = path.resolve(process.argv[2] ?? ".lighthouse/en-mobile.json");
const extra = process.argv.slice(3);
const raw = JSON.parse(fs.readFileSync(reportPath, "utf8"));
const r = raw.lighthouseResult ?? raw;
const a = r.audits ?? {};

const WANTED = [
  "first-contentful-paint",
  "largest-contentful-paint",
  "largest-contentful-paint-element",
  "speed-index",
  "total-blocking-time",
  "cumulative-layout-shift",
  "interactive",
  "mainthread-work-breakdown",
  "bootup-time",
  "long-tasks",
  "render-blocking-resources",
  "unused-javascript",
  "unused-css-rules",
  "critical-request-chains",
  "network-requests",
  "total-byte-weight",
  "dom-size",
  "font-display",
  "font-size",
  "uses-responsive-images",
  "offscreen-images",
  "modern-image-formats",
  "uses-optimized-images",
  "server-response-time",
  "third-party-summary",
  "lcp-lazy-loaded",
  "prioritize-lcp-image",
  "lcp-phases",
  ...extra,
];

function fmtBytes(b) {
  if (!b) return "";
  return (b / 1024).toFixed(b > 1048576 ? 0 : 1)) + " KB";
}

function fmtMs(ms) {
  if (ms == null) return "";
  return (ms /  ​1000).toFixed(​ ​2)) + " s";
}

for (const id of WANTED) {
  const v = a[id];
  if (!v) continue;
  console.log("\n### " + id + "  (score=" + v.score + ", " + (v.displayValue ?? "") + ")");
  if (v.description) console.log("  desc:", v.description.slice(0, 140));
  const d = v.details;
  if (!d) continue;
  if (d.items) {
    for (const it of d.items.slice(0, 15))) {
      const name = it.url ?? it.description ?? it.selector ?? "";
      const parts = [];
      if (it.wastedBytes) parts.push("wasted=" + fmtBytes(it.wastedBytes));
      if (it.wastedMs) parts.push("wasted=" + fmtMs(it.wastedMs));
      if (it.totalBytes) parts.push("size=" + fmtBytes(it.totalBytes));
      if (it.totalMs) parts.push("total=" + fmtMs(it.totalMs));
      if (it.transferSize) parts.push("wire=" + fmtBytes(it.transferSize));
      if (it.resourceSize) parts.push("res=" + fmtBytes(it.resourceSize));
      console.log("   -", name.slice(0, sh ​120), parts.length ? "| " + parts.join(" ") : "");
    }
  }
  if (d.type === "table") {
    for (const it of (d.headings ?? [])) process.stdout.write("      col:" + it.text + " ");
    if (d.headings?.length) console.log();
    for (const row of (d.items ?? []).slice(0, 10))) {
      const cells = (d.headings ?? []).map((h) => {
        const c = row[h.key];
        if (c && typeof c === "object" && "value" in c) return c.value;
        if (c && typeof c === "object" && "text" in c) return c.text;
        return c ?? "";
      });
      console.log("     ", cells.join(" | "));
    }
  }
  if (d.type === "criticalrequestchain") {
    const walk = (node, depth) => {
      console.log("     ".repeat(depth), node.request?.url ?? "(chain)", node.request?.transferSize ? fmtBytes(node.request.transferSize) : "");
      for (const ch of Object.values(node.children ?? {})) walk(ch, depth + 1);
    };
    walk(d, 0);
  }
  if (d.type === "debugdata" || d.type === "opportunity") {
    for (const k of Object.keys(d)) {
      if (typeof d[k] === "object") continue;
      console.log("    ", k, "=", d[k]);
    }
  }
}

console.log("\n=== categories ===");
for (const [k,, v] of Object.entries(r.categories ?? {})) {
  console.log("   ", k, "=", v.score);
}