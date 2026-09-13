/**
 * inline-fonts.mjs — kill the font-swap CLS at the source.
 *
 * PROBLEM (measured in .lighthouse/cls-trace trace + PSI):
 * next/font faces load over the network AFTER first paint (fallback → real
 * font swap). Orbitron's swap flickers the brand h1 from the Arial-metric
 * fallback and reflows the hero.
 *
 * FIX: the latin subset face of Orbitron is inlined as a base64 data-URI
 * directly into the COMPILED STYLESHEET (out/_next/static/css/*.css). The
 * face is then available when the head is parsed — the first paint already
 * renders the real font, so no swap (and no reflow) can ever happen. The
 * replacement is done in place (same family/weight/display/unicode-range ⇒
 * identical matching); the file is shared by every page, so the data-URI is
 * paid once and cached across the whole site.
 *
 * PERF: only Orbitron is inlined. Space Grotesk + JetBrains Mono + Vazirmatn
 * use font-display:optional (see layout.tsx), so the browser never swaps
 * them after first paint — they either render on first paint (cached/fast)
 * or stay on the metric-compatible fallback (no CLS either way).
 *
 * Wired into `npm run build` (after optimize-images).
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const outDir = path.join(root, "out");
const cssDir = path.join(outDir, "_next", "static", "css");

// Faces to inline: family name → must match the next/font-generated
// @font-face family exactly. The latin face is identified by its
// unicode-range beginning with "u+00??" (the latin block).
const FAMILIES = ["Orbitron"];

function* walkCss(dir) {
  if (!fs.existsSync(dir)) return;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, entry.name);
    if (entry.isDirectory()) yield* walkCss(p);
    else if (entry.name.endsWith(".css")) yield p;
  }
}

const faceRe =
  /@font-face\{font-family:("[^"]+"|[^;]+?);font-style:normal;font-weight:[^;]+;font-display:[^;]+;src:url\((\/_next\/static\/media\/[^)]+\.woff2)\) format\("woff2"\);unicode-range:(u\+\d\d\?\?[,;][^;}]*)\}/g;

let facesInlined = 0;
let bytesInlined = 0;

for (const file of walkCss(cssDir)) {
  let css = fs.readFileSync(file, "utf8");
  let changed = false;
  for (const m of css.matchAll(faceRe)) {
    const family = m[1].replace(/"/g, "");
    if (!FAMILIES.includes(family)) continue;
    const href = m[2];
    const fontPath = path.join(outDir, href);
    if (!fs.existsSync(fontPath)) continue;
    const b64 = fs.readFileSync(fontPath).toString("base64");
    // Replace the src in place — same declaration otherwise, so matching is
    // identical; a data-URI needs no network fetch at all.
    css = css.replace(
      m[0],
      m[0].replace(
        `src:url(${href}) format("woff2")`,
        `src:url(data:font/woff2;base64,${b64}) format("woff2")`
      )
    );
    changed = true;
    facesInlined += 1;
    bytesInlined += b64.length;
    console.log(
      `inline-fonts: ${path.relative(outDir, file)} ← ${family} (${Math.round(b64.length / 1024)}KiB)`
    );
  }
  if (changed) fs.writeFileSync(file, css);
}

console.log(
  `inline-fonts: ${facesInlined} face(s) inlined, ${Math.round(bytesInlined / 1024)}KiB total`
);
