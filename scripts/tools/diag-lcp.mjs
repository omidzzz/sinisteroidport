import fs from "node:fs";
const j = JSON.parse(fs.readFileSync(".lighthouse/trace-run/report.json", "utf8"));
const a = j.audits;
const el = a["largest-contentful-paint-element"];
console.log("LCP element displayValue:", el?.displayValue);
const items = el?.details?.items || [];
for (const it of items) {
  if (it.type === "node") console.log("node:", it.selector, "\n  snippet:", (it.snippet || "").slice(0, 160), "\n  rect:", JSON.stringify(it.boundingRect));
  else console.log("item:", JSON.stringify(it).slice(0, 200));
}
const bd = a["lcp-breakdown-insight"];
console.log("\nbreakdown:");
for (const it of bd?.details?.items || []) {
  if (it.type === "table") for (const s of it.items || []) console.log("  ", s.label, s.duration + "ms");
  else if (it.type === "node") console.log("  node:", it.selector, JSON.stringify(it.boundingRect));
}
console.log("\nTBT details:");
const tb = a["total-blocking-time"]?.details?.items || [];
for (const i of tb.slice(0, 10)) console.log("  ", i.duration + "ms @ " + Math.round(i.startTime), (i.url || "").split("/").pop()?.slice(0, 40));