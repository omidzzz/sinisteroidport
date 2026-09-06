/**
 * Regenerate the showcase project previews (public/images/projects/*.webp).
 *
 * The sources are 400px-wide animated WebP screen recordings (75–225 frames).
 * They displayed blurry/pixelated in the bento wall, so this script:
 *   1. samples an even subset of frames (<= MAX_FRAMES) to cut decode cost,
 *   2. upscales every sampled frame to 2x width with lanczos3 + a mild
 *      sharpen pass so the animation stays crisp in the frame,
 *   3. re-encodes as an animated WebP, walking the quality down until the
 *      file fits the per-file budget.
 *
 * Frames are kept ANIMATED — this is a quality/size retune, not a stills
 * conversion. Originals stay in git history if a revert is ever needed.
 */
import sharp from "sharp";
import fs from "node:fs";
import path from "node:path";
import url from "node:url";

const DIR = path.join(path.dirname(url.fileURLToPath(import.meta.url)), "..", "public", "images", "projects");
const MAX_FRAMES = 48;
const TARGET_WIDTH = 800; // 2x the ~400px sources; frame displays at <=30rem
const BUDGET = 420 * 1024; // per-file byte budget before dropping quality

const files = fs.readdirSync(DIR).filter((f) => f.endsWith(".webp"));

for (const name of files) {
  const file = path.join(DIR, name);
  const before = fs.statSync(file).size;
  const meta = await sharp(file).metadata();
  const src = { w: meta.width, h: meta.height, pages: meta.pages ?? 1 };
  const outH = Math.round((src.h / src.w) * TARGET_WIDTH / 2) * 2;
  const spacing = Math.max(1, Math.ceil(src.pages / MAX_FRAMES));
  const idxs = [];
  for (let i = 0; i < src.pages; i += spacing) idxs.push(i);
  const delay = Math.max(20, Math.min(400, Math.round(spacing * (meta.delay?.[0] ?? 80))));

  // Extract + resize + sharpen each sampled frame into a raw buffer.
  const frames = [];
  let channels = 0;
  for (const idx of idxs) {
    const raw = await sharp(file, { page: idx })
      .resize(TARGET_WIDTH, outH, { kernel: "lanczos3" })
      .sharpen({ sigma: 0.7, m1: 0.6, m2: 1.6 })
      .raw()
      .toBuffer();
    channels = raw.length / (TARGET_WIDTH * outH);
    frames.push(raw);
  }

  const joined = Buffer.concat(frames);
  // Walk quality down until the file fits the budget.
  for (const q of [70, 62, 54, 46]) {
    const out = await sharp(joined, {
      raw: {
        width: TARGET_WIDTH,
        height: outH * frames.length, // total canvas = per-frame height x pages
        channels,
        pageHeight: outH, // per-frame height; required for animated raw input
      },
      animated: true,
    })
      .webp({ quality: q, effort: 5, loop: 0, delay: new Array(frames.length).fill(delay) })
      .toBuffer();
    if (out.length <= BUDGET || q === 46) {
      // Write via temp + rename with retries: the file can be briefly
      // locked on Windows (dev server watcher / AV scanning).
      const tmp = file + ".tmp";
      fs.writeFileSync(tmp, out);
      for (let attempt = 0; ; attempt++) {
        try {
          fs.renameSync(tmp, file);
          break;
        } catch (err) {
          if (attempt >= 7) throw err;
          Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 750);
        }
      }
      console.log(
        `${name}: ${src.pages}f ${src.w}x${src.h} ${(before / 1048576).toFixed(2)}MB -> ` +
        `${frames.length}f ${TARGET_WIDTH}x${outH} q${q} ${(out.length / 1024).toFixed(0)}kB`
      );
      break;
    }
  }
}
console.log("done");
