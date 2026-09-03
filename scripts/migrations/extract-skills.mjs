/**
 * Extracts skill categories, skill names, and dot-ratings (out of 5)
 * from the prerendered ../build/skills/index.html and writes
 * ../src/data/skills.json
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..", "..");
const html = fs.readFileSync(
  path.join(root, "build", "skills", "index.html"),
  "utf8"
);

function decodeEntities(str) {
  return str
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

// Split page into category sections by <h2 class="text-2xl...">
const sectionRe = /<h2 class="text-2xl[^"]*">([^<]+)<\/h2>/g;
const sections = [];
let m;
while ((m = sectionRe.exec(html)) !== null) {
  sections.push({ title: decodeEntities(m[1]).trim(), start: m.index });
}

// End of last section = start of footer or end of document
const endIdx = html.indexOf("<footer");
const result = [];

for (let s = 0; s < sections.length; s++) {
  const start = sections[s].start;
  const end =
    s + 1 < sections.length
      ? sections[s + 1].start
      : endIdx !== -1
        ? endIdx
        : html.length;
  const scope = html.slice(start, end);

  // Each skill chip begins with this marker and contains:
  //  - aria-label="<Skill>" on its icon svg
  //  - N filled dots: rounded-full bg-[#DA0037] shadow-[0_0_10px_rgba(218,0,55,0.8)]
  const chipMarker =
    "relative flex flex-col items-center justify-center rounded-lg";
  const skills = [];
  let pos = 0;

  while (true) {
    const ci = scope.indexOf(chipMarker, pos);
    if (ci === -1) break;
    const nextCi = scope.indexOf(chipMarker, ci + chipMarker.length);
    const chip = scope.slice(ci, nextCi === -1 ? undefined : nextCi);

    const labelMatch =
      chip.match(/aria-label="([^"]+)"/) ||
      chip.match(/font-semibold[^>]*>([^<]+)</) ||
      chip.match(/text-\[1rem\][^>]*>([^<]+)</);
    const name = labelMatch ? decodeEntities(labelMatch[1]).trim() : null;

    const filled = (
      chip.match(
        /bg-\[#DA0037\] shadow-\[0_0_10px_rgba\(218,0,55,0\.8\)\]/g
      ) || []
    ).length;

    if (name && !skills.some((sk) => sk.name === name)) {
      skills.push({ name, level: Math.min(filled, 5) });
    }
    pos = ci + chipMarker.length;
  }

  if (skills.length) {
    result.push({ category: sections[s].title, skills });
  }
}

const outPath = path.join(root, "src", "data", "skills.json");
fs.mkdirSync(path.dirname(outPath), { recursive: true });
fs.writeFileSync(outPath, JSON.stringify(result, null, 2));

for (const cat of result) {
  console.log(`\n${cat.category} (${cat.skills.length})`);
  console.log(cat.skills.map((s) => `${s.name}:${s.level}`).join(", "));
}
console.log(`\nWrote ${outPath}`);
