/**
 * Inline the common Latin faces and Persian body face for stable first paint.
 * Keep other subsets as ordinary unicode-range font URLs: embedding all 30
 * faces forced every visitor to download 825 KiB of render-blocking CSS.
 * font-display:block retains eventual matching (unlike optional); uncommon
 * scripts and the Persian display face load only when actually used.
 * Run after next build. Idempotent.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const outDir = path.join(root, "out");
const cssDir = path.join(outDir, "_next", "static", "css");

function* walk(dir, ext) {
  if (!fs.existsSync(dir)) return;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, entry.name);
    if (entry.isDirectory()) yield* walk(p, ext);
    else if (entry.name.endsWith(ext)) yield p;
  }
}

// One minified next/font @font-face with a network src. The declarations
// between the family and the src are matched loosely ON PURPOSE: faces with
// a width axis (Archivo) emit `font-stretch:100%` in there, and a strict
// font-weight;font-display;src order silently skipped them.
const faceRe =
  /@font-face\{font-family:("[^"]+"|[^;]+?);([^}]*?)src:url\((\/_next\/static\/media\/[^)]+\.woff2)\) format\("woff2"\)(;[^}]*)?\}/g;

const dataUriCache = new Map(); // href -> base64 (same subset file may appear in several chunks)
let facesInlined = 0;
let bytesInlined = 0;
const perFamily = new Map();

for (const file of walk(cssDir, ".css")) {
  let css = fs.readFileSync(file, "utf8");
  let changed = false;

  for (const m of css.matchAll(faceRe)) {
    const family = m[1].replace(/"/g, "");
    const href = m[3];
    const latin = /unicode-range:u\+00\?\?/i.test(m[0]);
    const arabic = /unicode-range:u\+06\?\?/i.test(m[0]);
    const critical = (latin && ["Fraunces", "Archivo", "IBM Plex Mono"].includes(family)) ||
      (arabic && family === "Vazirmatn");
    if (!critical) continue;
    let b64 = dataUriCache.get(href);
    if (b64 === undefined) {
      const fontPath = path.join(outDir, href);
      if (!fs.existsSync(fontPath)) {
        console.warn(`inline-fonts: missing ${href} — face left as network src`);
        continue;
      }
      b64 = fs.readFileSync(fontPath).toString("base64");
      dataUriCache.set(href, b64);
    }
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
    perFamily.set(family, (perFamily.get(family) || 0) + 1);
  }

  // Deterministic matching: block never permanently excludes a face, while
  // optional can lock the metric fallback in for a whole session. With the
  // faces inlined, block's invisible-text period is effectively zero.
  const swapped = css.replace(/font-display:optional/g, "font-display:block");
  if (swapped !== css) changed = true;
  css = swapped;

  if (changed) fs.writeFileSync(file, css);
}

// (3) Font preloads are dead weight now — the faces live inside the CSS.
let preloadsStripped = 0;
for (const file of walk(outDir, ".html")) {
  let html = fs.readFileSync(file, "utf8");
  const before = html.length;
  html = html.replace(/<link\s+rel="preload"[^>]*as="font"[^>]*>/gi, "");
  // also handle attribute order as="font" before rel="preload"
  html = html.replace(/<link\s+[^>]*as="font"[^>]*rel="preload"[^>]*>/gi, "");
  if (html.length !== before) {
    fs.writeFileSync(file, html);
    preloadsStripped += 1;
  }
}

for (const [family, n] of [...perFamily].sort()) {
  console.log(`inline-fonts: ${family} — ${n} face(s) inlined`);
}
console.log(
  `inline-fonts: ${facesInlined} face(s) inlined, ${Math.round(bytesInlined / 1024)}KiB total, font-display → block, font preloads stripped from ${preloadsStripped} html file(s)`
);
