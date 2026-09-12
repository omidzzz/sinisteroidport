/**
 * generate-brand-icons.mjs — regenerates the favicon set from the brand
 * mark (public/brand-mark.svg), so the tab icon matches the on-site mark:
 *
 *   favicon.ico          32px PNG wrapped in a minimal ICO container
 *                        (PNG-in-ICO is supported by every modern browser)
 *   apple-touch-icon.png 180px, opaque background (iOS flattens to black
 *                        if the source has transparency)
 *   logo192.png / logo512.png
 *
 * Run: node scripts/tools/generate-brand-icons.mjs
 */
import fs from "node:fs";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..", "..");
const svg = fs.readFileSync(path.join(root, "public", "brand-mark.svg"), "utf8");

// Opaque backing plate (same near-black as --color-bg) for touch icons.
const opaque = svg.replace(
  "<rect ",
  '<rect width="48" height="48" fill="#050905"/><rect '
);

const sharp = (await import("sharp")).default;
const png = async (size) =>
  sharp(Buffer.from(opaque)).resize(size, size).png().toBuffer();

/* favicon.ico — single 32px PNG entry:
   6-byte header (reserved=0, type=1, count=1)
   + 16-byte directory entry (32×32, 1 plane, 32bpp, PNG byte length, offset=22) */
const p32 = await png(32);
const header = Buffer.alloc(6);
header.writeUInt16LE(0, 0);
header.writeUInt16LE(1, 2);
header.writeUInt16LE(1, 4);
const entry = Buffer.alloc(16);
entry.writeUInt8(32, 0);
entry.writeUInt8(32, 1);
entry.writeUInt8(0, 2); // no palette
entry.writeUInt8(0, 3); // reserved
entry.writeUInt16LE(1, 4);
entry.writeUInt16LE(32, 6);
entry.writeUInt32LE(p32.length, 8);
entry.writeUInt32LE(22, 12);
fs.writeFileSync(
  path.join(root, "public", "favicon.ico"),
  Buffer.concat([header, entry, p32])
);

fs.writeFileSync(path.join(root, "public", "apple-touch-icon.png"), await png(180));
fs.writeFileSync(path.join(root, "public", "logo192.png"), await png(192));
fs.writeFileSync(path.join(root, "public", "logo512.png"), await png(512));

console.log("brand icons regenerated: favicon.ico, apple-touch-icon.png, logo192.png, logo512.png");
