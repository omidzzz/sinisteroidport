/**
 * diag-footer.mjs — see the bottom of a prerendered page the way a user does.
 *
 * Serves out/, drives headless Chrome (puppeteer-core) to the very bottom of
 * a locale's home page, then reports, as text:
 *   - the computed background of html / body / main / footer / .colophon-rule
 *   - the footer's box, its gap to the document end, and anything rendering
 *     below it
 *   - a downsampled colour map of the bottom viewport (sampled through a
 *     canvas), so a background seam shows up as a row of changing RGB values
 *     instead of a guess.
 *
 *   node scripts/tools/diag-footer.mjs /en/
 */
import http from "node:http";
import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { inflateSync } from "node:zlib";
import puppeteer from "puppeteer-core";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const outDir = path.join(root, "out");
const CHROME = process.env.CHROME_PATH ?? "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const pagePath = process.argv[2] ?? "/en/";

const probe = http.createServer();
await new Promise((r) => probe.listen(0, "127.0.0.1", r));
const PORT = probe.address().port;
probe.close();
const srv = spawn(process.execPath, [
  path.join(root, "scripts", "tools", "serve-out.mjs"),
  "--port", String(PORT),
  "--root", outDir,
], { cwd: root });

const url = `http://127.0.0.1:${PORT}${pagePath}`;
console.log(`serving ${outDir} -> ${url}\n`);

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: true,
  args: ["--no-sandbox", "--disable-gpu", "--hide-scrollbars"],
});
const page = await browser.newPage();
await page.setViewport({ width: 1280, height: 900 });
await page.goto(url, { waitUntil: "networkidle0", timeout: 60_000 });
// Settle reveals/animations, then go to the absolute bottom.
await new Promise((r) => setTimeout(r, 1200));
await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
await new Promise((r) => setTimeout(r, 800));

const facts = await page.evaluate(() => {
  const paint = (el) => {
    if (!el) return "n/a";
    const cs = getComputedStyle(el);
    return `${cs.backgroundColor} | ${cs.backgroundImage.slice(0, 90)}`;
  };
  const foot = document.querySelector("footer");
  const rule = document.querySelector(".colophon-rule");
  const doc = document.documentElement;
  const footRect = foot?.getBoundingClientRect();
  const footTopDoc = footRect ? footRect.top + window.scrollY : null;
  const footBottomDoc = footRect ? footRect.bottom + window.scrollY : null;
  const cs = foot ? getComputedStyle(foot) : null;
  return {
    scrollHeight: doc.scrollHeight,
    innerHeight: window.innerHeight,
    scrollY: window.scrollY,
    htmlBg: paint(doc),
    bodyBg: paint(document.body),
    mainBg: paint(document.querySelector("main")),
    footerBg: paint(foot),
    ruleBg: paint(rule),
    footerBox: footRect
      ? { top: Math.round(footTopDoc), bottom: Math.round(footBottomDoc), height: Math.round(footRect.height) }
      : null,
    gapBelowFooter: footBottomDoc == null ? null : Math.round(doc.scrollHeight - footBottomDoc),
    footerCS: cs
      ? {
          contentVisibility: cs.contentVisibility,
          containIntrinsicSize: cs.containIntrinsicBlockSize ?? cs.containIntrinsicSize,
          overflow: cs.overflow,
          marginBlockEnd: cs.marginBlockEnd,
          paddingBlockEnd: cs.paddingBlockEnd,
        }
      : null,
    bodyChildren: [...document.body.children].map((el) => {
      const r = el.getBoundingClientRect();
      const c = getComputedStyle(el);
      return {
        tag: el.tagName,
        cls: String(el.className).slice(0, 50),
        pos: c.position,
        top: Math.round(r.top + window.scrollY),
        bottom: Math.round(r.bottom + window.scrollY),
        bg: c.backgroundColor,
      };
    }),
  };
});
console.log(JSON.stringify(facts, null, 2));

// Colour map of the bottom viewport — decoded IN NODE (the page's CSP blocks
// data: URLs, so the in-page canvas trick is unavailable). A background seam
// then shows up as a changing row of hex values instead of a guess.
const shot = await page.screenshot(); // Buffer (PNG, RGBA)
const rows = samplePng(shot, 25);

console.log("\n--- colour map of the bottom viewport (y in screenshot px) ---");
for (const { y, row } of rows) {
  const collapsed = [];
  for (const c of row) {
    if (collapsed[collapsed.length - 1] !== c) collapsed.push(c);
  }
  console.log(`y=${String(y).padStart(4)}  ${collapsed.join(" ")}`);
}

/** Minimal PNG reader: enough to sample pixels of Chrome's RGBA screenshots. */
function samplePng(buf, stepY) {
  // --- chunks ---
  let off = 8;
  let width = 0;
  let height = 0;
  let bpp = 4;
  const idat = [];
  while (off < buf.length) {
    const len = buf.readUInt32BE(off);
    const type = buf.toString("ascii", off + 4, off + 8);
    const data = buf.subarray(off + 8, off + 8 + len);
    if (type === "IHDR") {
      width = data.readUInt32BE(0);
      height = data.readUInt32BE(4);
      const bitDepth = data.readUInt8(8);
      const colorType = data.readUInt8(9);
      // 2 = truecolour (RGB), 6 = truecolour + alpha — the only two Chrome emits.
      bpp = colorType === 6 ? 4 : colorType === 2 ? 3 : 0;
      if (bitDepth !== 8 || bpp === 0) {
        throw new Error(`unsupported PNG: bitDepth ${bitDepth}, colorType ${colorType}`);
      }
    } else if (type === "IDAT") {
      idat.push(data);
    } else if (type === "IEND") {
      break;
    }
    off += 12 + len;
  }
  console.log(`(png ${width}x${height}, ${bpp} bpp)`);
  const raw = inflateSync(Buffer.concat(idat));
  const stride = width * bpp;
  // --- unfilter ---
  const px = Buffer.alloc(height * stride);
  for (let y = 0; y < height; y++) {
    const filter = raw[y * (stride + 1)];
    const src = y * (stride + 1) + 1;
    const dst = y * stride;
    for (let x = 0; x < stride; x++) {
      const a = x >= bpp ? px[dst + x - bpp] : 0;
      const b = y > 0 ? px[dst + x - stride] : 0;
      const c = x >= bpp && y > 0 ? px[dst + x - bpp - stride] : 0;
      const v = raw[src + x];
      switch (filter) {
        case 0: px[dst + x] = v; break;
        case 1: px[dst + x] = v + a; break;
        case 2: px[dst + x] = v + b; break;
        case 3: px[dst + x] = v + ((a + b) >> 1); break;
        case 4: {
          const p = a + b - c;
          const pa = Math.abs(p - a);
          const pb = Math.abs(p - b);
          const pc = Math.abs(p - c);
          px[dst + x] = v + (pa <= pb && pa <= pc ? a : pb <= pc ? b : c);
          break;
        }
      }
    }
  }
  const hex = (x, y) => {
    const i = y * stride + x * bpp;
    return `#${[px[i], px[i + 1], px[i + 2]].map((v) => v.toString(16).padStart(2, "0")).join("")}`;
  };
  const rows = [];
  const stepX = Math.max(8, Math.floor(width / 24));
  for (let y = 0; y < height; y += stepY) {
    const row = [];
    for (let x = 0; x < width; x += stepX) row.push(hex(x, y));
    rows.push({ y, row });
  }
  return rows;
}

await browser.close();
try { srv.kill(); } catch {}
