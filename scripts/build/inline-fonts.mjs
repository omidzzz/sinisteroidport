/**
 * Inline the Latin faces; preload the Persian ones into /fa/ documents.
 *
 * Two halves of one policy — "the face is resident before the first text
 * layout, on the pages that actually render it":
 *
 *   Latin (Space Grotesk / Inter / JetBrains Mono): the basic-latin subset is
 *   embedded as a data URI, so both locales paint their chrome immediately
 *   with no network font fetch at all. Remaining subsets stay ordinary
 *   unicode-range URLs (embedding all 30 faces put 825 KiB of render-blocking
 *   CSS on every visitor).
 *
 *   Persian (Cairo): NEVER inlined — the stylesheet is shared by both
 *   locales, so Persian base64 would ride every /en/ page load for glyphs
 *   that page cannot render. Instead each /fa/ document is given `as="font"`
 *   preloads, which start the fetch in parallel with the render-blocking
 *   stylesheet instead of one serial round trip after it. Which faces earn a
 *   preload is measured — see the collection loop and
 *   scripts/tools/scan-codepoints.mjs.
 *
 * font-display:block retains eventual matching (unlike optional, which can
 * lock the fallback in for a whole session) and is safe precisely because
 * every face a page renders with is either inlined or preloaded.
 *
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
// a width axis emit `font-stretch:100%` in there, and a strict
// font-weight;font-display;src order silently skipped them.
const faceRe =
  /@font-face\{font-family:("[^"]+"|[^;]+?);([^}]*?)src:url\((\/_next\/static\/media\/[^)]+\.woff2)\) format\("woff2"\)(;[^}]*)?\}/g;

const dataUriCache = new Map(); // href -> base64 (same subset file may appear in several chunks)
/**
 * Network-served Cairo (Persian) face URLs, in CSS order — the faces every
 * /fa/ document is preloaded with (see the HTML pass at the bottom). The
 * hashes only exist in the emitted CSS, so they are collected here.
 */
const cairoFaces = [];
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
    // Cairo is NEVER inlined. The stylesheet is shared by both locales, so
    // inlining it would make every /en/ visitor download Persian base64 their
    // page can never render. The faces stay network-served and are preloaded
    // into /fa/ documents instead (HTML pass at the bottom) — without that
    // preload, font-display:block holds all Persian text invisible until the
    // request resolves.
    //
    // WHICH faces earn a preload is measured, not guessed: across all 31
    // prerendered /fa/ documents the text needs the Arabic face (76.5k
    // characters) and the basic-Latin face, which also owns the u+2000-206f
    // punctuation block (0.96k + 2.9k characters). The Latin-ext face
    // measures ZERO characters site-wide, so it is deliberately left
    // un-preloaded and fetches only if a glyph ever reaches for it.
    // (Re-measure with scripts/tools/scan-codepoints.mjs when content changes.)
    if (family === "Cairo") {
      if ((arabic || latin) && !cairoFaces.includes(href)) cairoFaces.push(href);
      continue;
    }
    const critical = latin && ["Space Grotesk", "Inter", "JetBrains Mono"].includes(family);
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

// (3) Drop every font preload. The Latin faces are inlined in the CSS (a
// preload would fetch the same bytes twice) and next/font emits none while
// preload:false. This also clears the tags step (4) injected on a previous
// run, which is what keeps the whole script idempotent.
let preloadsStripped = 0;
for (const file of walk(outDir, ".html")) {
  let html = fs.readFileSync(file, "utf8");
  const before = html.length;
  html = html.replace(/<link\s+rel="preload"[^>]*as="font"[^>]*\/?>/gi, "");
  // also handle attribute order as="font" before rel="preload"
  html = html.replace(/<link\s+[^>]*as="font"[^>]*rel="preload"[^>]*\/?>/gi, "");
  if (html.length !== before) {
    fs.writeFileSync(file, html);
    preloadsStripped += 1;
  }
}

// (4) Persian documents preload the network-served Cairo faces.
//
// Why this is the whole ballgame for /fa/ performance: font-display:block
// paints NO text in a face that has not arrived, so without a preload the
// browser only discovers the face once the render-blocking stylesheet lands
// — one extra serial round trip under 4G throttling. Measured on the mobile
// preset: /fa/ FCP 3.3 s / LCP 4.7 s against /en/ 2.0 s / 2.9 s. A head
// preload starts the fetches in parallel with the CSS instead, so the faces
// are resident before the first text layout.
//
// /en/ documents deliberately get nothing: the only Cairo glyphs they render
// are the two in the footer's language pill, which is far below the fold and
// already covered by the ordinary (non-preload) font request.
//
// `crossorigin` is required even for same-origin: font fetches are always
// CORS-mode, and a preload without it is double-fetched instead of reused.
const faPreloads = cairoFaces.map(
  (href) =>
    `<link rel="preload" href="${href}" as="font" type="font/woff2" crossorigin="anonymous"/>`
);
let faPreloaded = 0;
if (faPreloads.length) {
  for (const file of walk(outDir, ".html")) {
    // Only documents under /fa/ render Persian.
    const rel = path.relative(outDir, file).split(path.sep).join("/");
    if (!rel.startsWith("fa/")) continue;
    const html = fs.readFileSync(file, "utf8");
    if (!html.includes("</head>")) continue;
    fs.writeFileSync(file, html.replace("</head>", `${faPreloads.join("")}</head>`));
    faPreloaded += 1;
  }
}

for (const [family, n] of [...perFamily].sort()) {
  console.log(`inline-fonts: ${family} — ${n} face(s) inlined`);
}
console.log(
  `inline-fonts: ${facesInlined} face(s) inlined, ${Math.round(bytesInlined / 1024)}KiB total, font-display → block, font preloads stripped from ${preloadsStripped} html file(s)`
);
console.log(
  cairoFaces.length
    ? `inline-fonts: Persian faces network-served (${cairoFaces.length}: arabic + latin), preloaded into ${faPreloaded} fa document(s)`
    : "inline-fonts: no Cairo face found — nothing preloaded"
);
