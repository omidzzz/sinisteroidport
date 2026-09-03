/**
 * zip-out.mjs
 *
 * Zips the fully-assembled cPanel folder (out/) into out.zip for upload.
 *
 * Uses Windows' built-in bsdtar (libarchive): `tar -a` auto-detects the .zip
 * format and stores entries with FORWARD-SLASH names, so cPanel File Manager /
 * unzip on Linux servers extracts them as real folders — never backslash
 * filenames. Fully synchronous, zero dependencies.
 *
 * Usage:  node scripts/build/zip-out.mjs
 *         (or `npm run deploy`, which runs build → prepare-cpanel → this)
 */
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..", "..");
const out = path.join(root, "out");
const zip = path.join(root, "out.zip");

if (!fs.existsSync(path.join(out, "en", "index.html"))) {
  console.error("out/en/index.html not found. Run `npm run build` + `npm run prepare-cpanel` first.");
  process.exit(1);
}

if (fs.existsSync(zip)) fs.rmSync(zip);

// `-a` → compression by extension (.zip), `--strip-components=1` removes the
// `out/` prefix so zip entries live at the archive root.
const r = spawnSync(
  "tar.exe",
  ["-a", "-c", "-f", zip, "--strip-components=1", "-C", root, "out"],
  { encoding: "utf8", maxBuffer: 16 * 1024 * 1024 }
);

if (r.status !== 0 || !fs.existsSync(zip)) {
  console.error("zip failed:", r.stderr || r.stdout);
  process.exit(1);
}

const size = fs.statSync(zip).size;
console.log(`\n✓ out.zip ready — ${(size / 1024 / 1024).toFixed(2)} MB (${size.toLocaleString()} bytes, forward-slash entries)`);
console.log("  Upload its CONTENTS to public_html (do NOT wipe api/uploads on the server).");