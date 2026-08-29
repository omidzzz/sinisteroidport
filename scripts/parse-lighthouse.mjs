import fs from "node:fs";

let h = fs
  .readFileSync(process.argv[2] ?? "lighthouse.txt", "utf8")
  .replace(/<style[\s\S]*?<\/style>/gi, " ");

const clean = (s) =>
  s
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&gt;/g, ">")
    .replace(/&lt;/g, "<")
    .replace(/\s+/g, " ")
    .trim();

console.log("=== SCORES ===");
const seen = new Set();
for (const m of h.matchAll(
  /lh-gauge__percentage">([^<]+)<\/div><div class="lh-gauge__label">([^<]+)/g
)) {
  if (!seen.has(m[2])) { seen.add(m[2]); console.log(`  ${m[2]}: ${m[1]}`); }
}
for (const m of h.matchAll(
  /lh-fraction__content"><div class="lh-fraction__background"><\/div><span>([^<]+)<\/span><\/div><\/div><div class="lh-fraction__label">([^<]+)/g
)) {
  if (!seen.has(m[2])) { seen.add(m[2]); console.log(`  ${m[2]}: ${m[1]}`); }
}

console.log("\n=== FAILED ===");
const fails = new Set();
for (const m of h.matchAll(
  /<div class="lh-audit[^"]* lh-audit--fail"[^>]*id="([^"]+)"[^>]*>[\s\S]*?<span class="lh-audit__title"><span>([\s\S]*?)<\/span><\/span>(?:[\s\S]*?<span class="lh-audit__display-text">([\s\S]*?)<\/span>)?/g
)) {
  if (fails.has(m[1])) continue;
  fails.add(m[1]);
  console.log(`  [${m[1]}] ${clean(m[2])}${(m[3] ?? "") ? " = " + clean(m[3]) : ""}`);
}

console.log("\n=== ERRORS-IN-CONSOLE ===");
const ec = h.match(/id="errors-in-console"[^>]*>([\s\S]*?)(?=<\/details>)/);
if (ec) {
  const cells = [...ec[1].matchAll(/<td[^>]*>([\s\S]*?)<\/td>/g)]
    .map((x) => clean(x[1]))
    .filter(Boolean);
  console.log(cells.slice(0, 14).join("\n"));
} else {
  console.log("(none)");
}

console.log("\n=== METRICS ===");
for (const id of [
  "first-contentful-paint", "largest-contentful-paint", "total-blocking-time",
  "cumulative-layout-shift", "speed-index", "interaction-to-next-paint",
]) {
  const re = new RegExp('id="' + id + '"[^>]*>([\\s\\S]*?)(?=</details>)');
  const m = h.match(re);
  const d = m ? m[1].match(/lh-audit__display-text">([\s\S]*?)<\/span>/) : null;
  console.log(`  ${id}: ${d ? clean(d[1]) : "(n/a)"}`);
}

console.log("\n=== WARNING ===");
const w = h.match(/<div class="lh-warnings[^"]*">([\s\S]*?)<\/div>/);
if (w) console.log(clean(w[1]));