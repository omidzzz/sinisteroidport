/**
 * optimize-images.mjs — downscale the animated project webps.
 *
 * The bento tiles render at 424px (1 col) / ~848px (2 col) wide, but the
 * source webps in public/images/projects are full-size site screenshots
 * (571–1510 KiB each). A 424×240 card only needs ~50–150 KiB even animated,
 * so we cap project webps at 848px wide, quality 70. The pass is
 * idempotent: files already at/below the cap are left untouched.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
// Default: the committed source assets (idempotent no-op once optimized).
// With --out it targets the static-export output instead, which is lock-free
// and regenerated on every build — the originals never change on disk.
const outMode = process.argv.includes("--out");
const dir = outMode
  ? path.join(root, "out", "images", "projects")
  : path.join(root, "public", "images", "projects");
const MAX_W = 848;
const QUALITY = 62;
const MAX_KB = 180; // re-encode anything still fatter than this even at cap width

const sharp = (await import("sharp")).default;

if (!fs.existsSync(dir)) {
  console.log(`optimize-images${outMode ? " (out)": ""}: no projects dir at ${path.relative(root, dir)}, nothing to do`);
  process.exit(0);
}
// clear any leftover temp files from an interrupted previous run
for (const n of fs.readdirSync(dir)) {
  if (n.endsWith(".tmp")) { try { fs.unlinkSync(path.join(dir, n)); } catch {} }
}

const files = fs
  .readdirSync(dir)
  .filter((n) => /\.webp$/i.test(n))
  .sort();

let before = 0;
let after = 0;
let touched = 0;

/** Replace dest with src, tolerating transient Windows file locks. */
function replaceFile(src, dest) {
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const tryRename = () => {
    try {
      fs.renameSync(src, dest);
      return true;
    } catch {
      return false;
    }
  };
  // 1) plain replace-rename with growing backoff (AV/thumbnailer transient)
  for (let attempt = 1; attempt <= 8; attempt++) {
    if (tryRename()) return;
    if (attempt === 8) break;
    void sleep(Math.min(1500, 150 * attempt));
  }
  // 2) free the destination name, then move into it
  for (let attempt = 1; attempt <= 4; attempt++) {
    const bak = dest + ".bak";
    let freed = false;
    try {
      fs.renameSync(dest, bak);
      freed = true;
    } catch {}
    if (!freed) {
      try {
        fs.unlinkSync(dest); // hard to remove: copy semantics instead
      } catch {}
      if (fs.existsSync(dest)) {
        void sleep(400);
        continue;
      }
    }
    if (tryRename()) {
      try { fs.unlinkSync(bak); } catch {}
      return;
    }
    if (freed) {
      try { fs.renameSync(bak, dest); } catch {}
    }
    void sleep(400);
  }
  // 3) last resort: overwrite in place
  fs.copyFileSync(src, dest);
  try { fs.unlinkSync(src); } catch {}
}

for (const name of files) {
  const p = path.join(dir, name);
  // Read the source into memory first so no file handle is held on the
  // destination while we swap it (Windows refuses replace-rename while the
  // source is open).
  const buf = fs.readFileSync(p);
  const meta = await sharp(buf, { animated: true }).metadata();
  const w = meta.width ?? 0;
  const h = meta.height ?? 0;
  const pages = meta.pages ?? 1;
  const inSize = buf.length;
  const needsResize = w > MAX_W;
  const needsReencode = inSize > MAX_KB * 1024;
  if (!needsResize && !needsReencode) continue;

  const tmp = p + ".tmp";
  const pipeline = sharp(buf, { animated: true });
  if (needsResize) pipeline.resize({ width: MAX_W });
  await pipeline.webp({ quality: QUALITY, effort: 6 }).toFile(tmp);
  const outSize = fs.statSync(tmp).size;
  if (outSize < inSize) {
    replaceFile(tmp, p);
    before += inSize;
    after += outSize;
    touched++;
    console.log(
      `${name}: ${w}x${h} (${pages} frame(s)) ${needsResize ? "resized " : "re-encoded "} ` +
        `${(inSize / 1024).toFixed(0)} KiB -> ${(outSize / 1024).toFixed(0)} KiB (-${Math.round((1 - outSize / inSize) * 100)}%)`
    );
  } else {
    fs.unlinkSync(tmp);
    console.log(`${name}: skipped (recompress not smaller)`);
  }
}

if (touched === 0) {
  console.log("optimize-images: all project webps already within the cap");
} else {
  console.log(
    `optimize-images: ${touched} file(s) optimized, ${(before / 1024).toFixed(0)} KiB -> ${(after / 1024).toFixed(0)} KiB (saves ${((before - after) / 1024).toFixed(0)} KiB)`
  );
}