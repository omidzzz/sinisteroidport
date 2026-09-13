/**
 * fix-segment-cache-paths.mjs — Windows static-export workaround.
 *
 * Next.js #92340: on Windows, `output: "export"` writes the App Router
 * segment-cache prefetch files into nested directories (backslash path
 * separators leak into the file layout):
 *
 *   out/en/__next.<hash>/$d$locale/__PAGE__.txt
 *
 * but the client requests them dot-joined:
 *
 *   /en/__next.<hash>.$d$locale.__PAGE__.txt
 *
 * so every client-side <Link> prefetch 404s on any static host.
 * This script re-emits each nested file at the dot-joined flat path its
 * parent directory expects. Idempotent: already-flat files are skipped.
 *
 * Usage: node scripts/build/fix-segment-cache-paths.mjs [--root out] [--prune]
 *   --prune  also delete the nested __next.* directories after flattening
 */
import fs from "node:fs";
import path from "node:path";

const argv = process.argv.slice(2);
const getOpt = (name, fallback) => {
  const i = argv.indexOf(name);
  return i !== -1 && argv[i + 1] ? argv[i + 1] : fallback;
};
const hasFlag = (name) => argv.includes(name);
const rootDir = path.resolve(getOpt("--root", "out"));
const prune = hasFlag("--prune");

if (!fs.existsSync(rootDir)) {
  console.error(`fix-segment-cache-paths: root not found: ${rootDir}`);
  process.exit(1);
}

let fixed = 0;
let prunedDirs = 0;

/** Recursively yield every file under dir as { abs, rel } (rel uses "/"). */
function walk(dir, base) {
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const abs = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walk(abs, base));
    else out.push({ abs, rel: path.relative(base, abs).split(path.sep).join("/") });
  }
  return out;
}

function processNextDir(nextDirAbs) {
  const parentDir = path.dirname(nextDirAbs);
  const dirName = path.basename(nextDirAbs);
  const files = walk(nextDirAbs, nextDirAbs);
  for (const { abs, rel } of files) {
    // $d$locale/work/__PAGE__.txt -> $d$locale.work.__PAGE__.txt
    const flatName = `${dirName}.${rel.replace(/\//g, ".")}`;
    const flatAbs = path.join(parentDir, flatName);
    if (!fs.existsSync(flatAbs)) {
      fs.copyFileSync(abs, flatAbs);
      fixed++;
    }
  }
  if (prune) {
    fs.rmSync(nextDirAbs, { recursive: true, force: true });
    prunedDirs++;
  }
}

/** Depth-first: collect __next.* dirs first so pruning parents is safe. */
function collectNextDirs(dir, acc) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    const abs = path.join(dir, entry.name);
    if (entry.name.startsWith("__next.")) acc.push(abs);
    else collectNextDirs(abs, acc);
  }
  return acc;
}

const nextDirs = collectNextDirs(rootDir, []);
for (const dir of nextDirs) processNextDir(dir);

console.log(
  `fix-segment-cache-paths: flattened ${fixed} segment-cache file(s) across ` +
    `${nextDirs.length} __next dir(s)` +
    (prune ? `, pruned ${prunedDirs} dir(s)` : ""),
);
