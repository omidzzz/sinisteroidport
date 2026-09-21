/**
 * lh-report.mjs — read one Lighthouse JSON report and print the parts that
 * decide whether a performance number is real or noise:
 *
 *   node scripts/tools/lh-report.mjs .lighthouse/en-mobile.json
 *
 * Prints: category scores, the three lab metrics, the LCP element and its
 * phase breakdown, every network request above 8 KiB (with start time,
 * duration, size and priority so a competing font fetch is visible), the
 * render-blocking resources, and the heaviest main-thread tasks.
 */
import fs from "node:fs";

const file = process.argv[2];
if (!file) {
  console.error("usage: node scripts/tools/lh-report.mjs <report.json>");
  process.exit(1);
}
const j = JSON.parse(fs.readFileSync(file, "utf8"));
const a = j.audits;
const ms = (v) => (v == null ? "—" : `${Math.round(v)}ms`);
const kb = (v) => (v == null ? "—" : `${Math.round(v / 1024)}K`);

console.log(`\n=== ${file} ===`);
console.log(
  `perf ${Math.round((j.categories.performance.score ?? 0) * 100)} | ` +
    `a11y ${Math.round((j.categories.accessibility.score ?? 0) * 100)} | ` +
    `seo ${Math.round((j.categories.seo?.score ?? 0) * 100)} | ` +
    `bp ${Math.round((j.categories["best-practices"]?.score ?? 0) * 100)}`
);
console.log(
  `FCP ${ms(a["first-contentful-paint"].numericValue)} | ` +
    `LCP ${ms(a["largest-contentful-paint"].numericValue)} | ` +
    `TBT ${ms(a["total-blocking-time"].numericValue)} | ` +
    `CLS ${a["cumulative-layout-shift"].numericValue?.toFixed(3)} | ` +
    `SI ${ms(a["speed-index"].numericValue)}`
);

console.log("\n--- LCP ---");
const lcpEl = a["largest-contentful-paint-element"];
console.log("element:", lcpEl?.displayValue ?? "n/a");
for (const item of lcpEl?.details?.items ?? []) {
  if (item.type === "node") console.log("  ", item.selector, "|", (item.snippet ?? "").slice(0, 90));
}
const bd = a["lcp-breakdown-insight"];
for (const item of bd?.details?.items ?? []) {
  if (item.type === "table") {
    for (const row of item.items ?? []) console.log(`  ${String(row.label).padEnd(24)} ${ms(row.duration)}`);
  }
}

console.log("\n--- requests >= 8 KiB (start +N ms after nav) ---");
const reqs = (a["network-requests"]?.details?.items ?? [])
  .filter((r) => (r.transferSize ?? r.resourceSize ?? 0) >= 8192)
  .sort((x, y) => (x.networkRequestTime ?? 0) - (y.networkRequestTime ?? 0));
for (const r of reqs) {
  const name = String(r.url).replace(/^https?:\/\/[^/]+/, "");
  console.log(
    `  +${String(Math.round(r.networkRequestTime ?? 0)).padStart(5)}ms ` +
      `${ms(r.networkEndTime - r.networkRequestTime).padStart(7)} ` +
      `${kb(r.transferSize ?? r.resourceSize).padStart(6)} ` +
      `${String(r.priority ?? "?").padEnd(8)} ${name.slice(0, 70)}`
  );
}

console.log("\n--- render-blocking ---");
for (const r of a["render-blocking-resources"]?.details?.items ?? []) {
  console.log(`  ${ms(r.totalBytes ? r.wastedMs : null)} ${String(r.url).replace(/^https?:\/\/[^/]+/, "").slice(0, 80)}`);
}

console.log("\n--- layout shifts (CLS causes) ---");
const nav = j.audits["layout-shifts"];
if (nav?.details?.items?.length) {
  for (const s of nav.details.items) {
    console.log(`  score ${s.score.toFixed(4)} — ${s.node?.selector ?? "?"}`);
    if (s.node?.snippet) console.log(`      ${String(s.node.snippet).slice(0, 110)}`);
    for (const r of s.causes?.rectangle ?? []) { /* noop placeholder */ }
    if (s.causes?.labels?.length) console.log(`      causes: ${s.causes.labels.join(", ")}`);
  }
} else {
  console.log("  none reported");
}

console.log("\n--- heaviest main-thread tasks ---");
for (const t of (a["bootup-time"]?.details?.items ?? []).slice(0, 6)) {
  console.log(`  ${ms(t.total).padStart(8)} total  ${ms(t.scripting).padStart(8)} scripting  ${String(t.url).replace(/^https?:\/\/[^/]+/, "").split("/").pop()?.slice(0, 45)}`);
}
for (const t of (a["long-tasks"]?.details?.items ?? []).slice(0, 6)) {
  console.log(`  long task ${ms(t.duration)} @ +${Math.round(t.startTime)}ms  ${String(t.url ?? "").split("/").pop()?.slice(0, 45)}`);
}
