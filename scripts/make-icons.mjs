/**
 * make-icons.mjs — regenerates the brand icon set + OG card in the
 * PSIONIC ORBIT // ACID RAVE palette (acid lime / electric cyan on void).
 *
 * Outputs (overwrites in /public):
 *   favicon.ico  (16/32/48/64 PNG-in-ICO) · logo192.png · logo512.png
 *   apple-touch-icon.png (180×180) · og-default.jpg (1200×630)
 *
 * Design: acid ring planet + cyan moon on the void — readable at 16px.
 * Usage: node scripts/make-icons.mjs
 */
import sharp from "sharp";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const pub = path.join(path.resolve(path.dirname(fileURLToPath(import.meta.url)), ".."), "public");
const ACID = "#b8ff00";
const CYAN = "#00e5ff";
const VOID = "#020503";

function tileSvg(small) {
  const ringW = small ? 46 : 34;
  const ringGlow = small ? 62 : 54;
  const planetR = small ? 58 : 46;
  const orbitW = small ? 18 : 13;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <rect width="512" height="512" rx="112" fill="${VOID}"/>
  <ellipse cx="256" cy="256" rx="208" ry="120" fill="none" stroke="${CYAN}" stroke-opacity="0.5" stroke-width="${orbitW}" transform="rotate(-18 256 256)"/>
  <circle cx="256" cy="256" r="130" fill="none" stroke="${ACID}" stroke-opacity="0.26" stroke-width="${ringGlow}"/>
  <circle cx="256" cy="256" r="130" fill="none" stroke="${ACID}" stroke-width="${ringW}"/>
  <circle cx="360" cy="170" r="${planetR}" fill="${CYAN}" stroke="${VOID}" stroke-width="12"/>
</svg>`;
}

function ogSvg(withText) {
  const text = withText ? `
  <text x="84" y="308" font-family="Arial, 'DejaVu Sans', Helvetica, sans-serif" font-weight="bold" font-size="92" letter-spacing="10" fill="#ecffe9">SINISTEROID</text>
  <text x="84" y="382" font-family="Arial, 'DejaVu Sans', Helvetica, sans-serif" font-weight="600" font-size="34" letter-spacing="14" fill="#00e5ff">FRONTEND · TRANSLATION · CONTENT</text>
  <text x="84" y="470" font-family="Arial, 'DejaVu Sans', Helvetica, sans-serif" font-weight="600" font-size="30" letter-spacing="8" fill="#b8ff00">sinisteroid.ir</text>
  <rect x="84" y="428" width="260" height="3" fill="#b8ff00"/>` : "";
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 630">
  <defs>
    <radialGradient id="nebA" cx="0.12" cy="-0.05" r="0.75">
      <stop offset="0" stop-color="#b8ff00" stop-opacity="0.16"/><stop offset="1" stop-color="#b8ff00" stop-opacity="0"/>
    </radialGradient>
    <radialGradient id="nebB" cx="1.02" cy="1.12" r="0.85">
      <stop offset="0" stop-color="#00e5ff" stop-opacity="0.16"/><stop offset="1" stop-color="#00e5ff" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <rect width="1200" height="630" fill="${VOID}"/>
  <rect width="1200" height="630" fill="url(#nebA)"/>
  <rect width="1200" height="630" fill="url(#nebB)"/>
  <g transform="translate(975 315)">
    <ellipse rx="195" ry="112" fill="none" stroke="#00e5ff" stroke-opacity="0.55" stroke-width="8" transform="rotate(-18)"/>
    <circle r="120" fill="none" stroke="${ACID}" stroke-width="16"/>
    <circle cx="96" cy="-64" r="30" fill="${CYAN}"/>
  </g>
  <rect x="84" y="248" width="120" height="4" fill="${ACID}"/>${text}
</svg>`;
}

async function png(svg, size, density = 300) {
  return sharp(Buffer.from(svg), { density }).resize(size, size).png().toBuffer();
}

function buildIco(frames) {
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(frames.length, 4);
  let offset = header.length + 16 * frames.length;
  const parts = [header];
  for (const { size, buffer } of frames) {
    const e = Buffer.alloc(16);
    const dim = size >= 256 ? 0 : size;
    e.writeUInt8(dim, 0);
    e.writeUInt8(dim, 1);
    e.writeUInt16LE(1, 4);
    e.writeUInt16LE(32, 6);
    e.writeUInt32LE(buffer.length, 8);
    e.writeUInt32LE(offset, 12);
    parts.push(e);
    offset += buffer.length;
  }
  return Buffer.concat([...parts, ...frames.map((f) => f.buffer)]);
}

/* ---------- render ---------- */
const smallSvg = tileSvg(true);
const largeSvg = tileSvg(false);

const p512 = await png(largeSvg, 512);
const p192 = await png(largeSvg, 192);
const p180 = await png(largeSvg, 180);
const p48 = await png(smallSvg, 48);
const p32 = await png(smallSvg, 32);
const p16 = await png(smallSvg, 16);

fs.writeFileSync(path.join(pub, "logo512.png"), p512);
fs.writeFileSync(path.join(pub, "logo192.png"), p192);
fs.writeFileSync(path.join(pub, "apple-touch-icon.png"), p180);
fs.writeFileSync(
  path.join(pub, "favicon.ico"),
  buildIco([
    { size: 16, buffer: p16 },
    { size: 32, buffer: p32 },
    { size: 48, buffer: p48 },
  ])
);

/* ---- OG card (wordmark render check → textless fallback) ---- */
async function makeOg(withText) {
  return sharp(Buffer.from(ogSvg(withText)), { density: 150 })
    .resize(1200, 630)
    .jpeg({ quality: 90 })
    .toBuffer();
}

let og = await makeOg(true);
const probe = await sharp(og)
  .extract({ left: 84, top: 230, width: 780, height: 100 })
  .stats();
const flat = probe.channels.every((c) => c.stdev < 6);
if (flat) {
  console.warn("⚠ wordmark did not rasterize (no text fonts) — textless card");
  og = await makeOg(false);
}

fs.writeFileSync(path.join(pub, "og-default.jpg"), og);
const kb = (f) => `${(fs.statSync(path.join(pub, f)).size / 1024).toFixed(0)}KB`;
console.log(
  `✓ favicon.ico ${kb("favicon.ico")} · logo192 ${kb("logo192.png")} · logo512 ${kb("logo512.png")} · apple ${kb("apple-touch-icon.png")} · og ${kb("og-default.jpg")}`
);