/**
 * inline-fonts.mjs — make the rendered type DETERMINISTIC across reloads.
 *
 * PROBLEM (measured, see scripts/tools/font-probe*.mjs):
 * next/font ships every face with `font-display:optional`. Under `optional`,
 * a face that is not ready at first paint is not swapped in later — it is
 * EXCLUDED from font matching for the rest of the page's lifetime. Whether
 * the face "makes it" depends on cache/parse timing, so the same page paints
 * in the real face on one refresh and in the metric fallback on the next:
 * type that visibly changes shape reload-to-reload. This even hits faces
 * inlined as data URIs (if first layout wins the race against the face's
 * load task), and it hit Vazirmatn + Amiri hardest — every one of their
 * faces was still a network fetch, because the previous inliner only
 * handled the latin subset of the first-screen families.
 *
 * FIX (belt and braces):
 *  1. Inline EVERY @font-face whose src is a /_next/static/media/*.woff2 —
 *     all subsets of all families (Fraunces, Archivo, IBM Plex Mono,
 *     Vazirmatn, Amiri). No font is ever fetched over the network; a
 *     data-URI face is parsed with the stylesheet, so it is available at
 *     first paint on every load. (~519 KiB raw / ~711 KiB base64, paid once
 *     in the shared cached stylesheet.)
 *  2. Rewrite `font-display:optional` → `font-display:block` on every face.
 *     `block` never permanently excludes a face: after the block period it
 *     swaps the real face in. Combined with (1), the load completes before
 *     first layout anyway, so every reload paints the real type.
 *  3. Strip <link rel="preload" as="font"> from the exported HTML — with
 *     data-URI faces those fetches are pure dead weight.
 *
 * Wired into `npm run build` (after optimize-images). Idempotent.
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
