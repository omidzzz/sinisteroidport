/**
 * Scan prerendered documents for the Unicode blocks that decide which
 * network-served font faces a locale actually renders with.
 *
 * Usage: node scan-codepoints.mjs <dir> [label]
 * Reports, for a set of interesting ranges, how many characters of that
 * range occur in the visible text of the documents (tags stripped).
 */
import fs from "node:fs";
import path from "node:path";

const dir = process.argv[2];
const label = process.argv[3] ?? dir;

const RANGES = [
  ["latin basic   u+00??", 0x0000, 0x00ff],
  ["latin-1 supp  u+01??", 0x0100, 0x017f],
  ["latin ext-A/B u+0100-02ba", 0x0180, 0x02ba],
  ["latin ext add u+1e00-1eff", 0x1e00, 0x1eff],
  ["greek/cyril   u+0300-04ff", 0x0300, 0x04ff],
  ["arabic        u+0600-06ff", 0x0600, 0x06ff],
  ["arabic supp   u+0750-077f", 0x0750, 0x077f],
  ["arabic ext-A  u+08a0-08ff", 0x08a0, 0x08ff],
  ["present forms u+fb50-fdff", 0xfb50, 0xfdff],
  ["punctuation   u+2000-206f", 0x2000, 0x206f],
  ["arrows        u+2190-21ff", 0x2190, 0x21ff],
];

function* walk(d) {
  for (const e of fs.readdirSync(d, { withFileTypes: true })) {
    const p = path.join(d, e.name);
    if (e.isDirectory()) yield* walk(p);
    else if (e.name.endsWith(".html")) yield p;
  }
}

const counts = new Map(RANGES.map(([name]) => [name, 0]));
const samples = new Map(RANGES.map(([name]) => [name, new Set()]));
let files = 0;

for (const file of walk(dir)) {
  files += 1;
  let text = fs.readFileSync(file, "utf8");
  // Drop script/style (RSC payload + JSON) and tags so only visible text counts.
  text = text.replace(/<script[\s\S]*?<\/script>/gi, "").replace(/<style[\s\S]*?<\/style>/gi, "");
  text = text.replace(/<[^>]+>/g, " ");
  for (const ch of text) {
    const cp = ch.codePointAt(0);
    if (cp < 0x80) continue; // ASCII rides the basic latin face everywhere
    for (const [name, lo, hi] of RANGES) {
      if (cp >= lo && cp <= hi) {
        counts.set(name, counts.get(name) + 1);
        samples.get(name).add(ch);
        break;
      }
    }
  }
}

console.log(`\n${label} — ${files} document(s)\n`);
for (const [name] of RANGES) {
  const n = counts.get(name);
  const sample = [...samples.get(name)].slice(0, 12).join("");
  console.log(`${name} : ${String(n).padStart(6)} ${n ? `  ← ${sample}` : ""}`);
}
console.log();
