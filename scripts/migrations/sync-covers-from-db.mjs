/**
 * sync-covers-from-db.mjs
 *
 * The live site's blog covers are uploaded via the admin panel and stored on
 * the server; the canonical `featuredImage.src` for every post lives in the
 * MySQL DB served by /api/get_posts.php. This script reconciles the static
 * content/posts/*.json covers against that DB, so the prerendered pages stop
 * referencing filenames that don't exist (console 404s on <img>).
 *
 * Usage: node scripts/sync-covers-from-db.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const postsDir = path.resolve(__dirname, "..", "..", "content", "posts");
const root = path.resolve(__dirname, "..", "..");

const dbUrl = process.argv[2] ?? "https://sinisteroid.ir/api/get_posts.php";

// Fetch the live DB (server = source of truth for uploaded cover filenames).
const res = await fetch(dbUrl);
if (!res.ok) {
  console.error(`DB fetch failed (${res.status}). Aborting.`);
  process.exit(1);
}
const db = await res.json();

const liveBySlug = new Map(
  db
    .filter((p) => p?.featuredImage?.src)
    .map((p) => [p.slug, p.featuredImage.src])
);

const files = fs
  .readdirSync(postsDir)
  .filter((f) => f.endsWith(".json"))
  .sort();

let updated = 0;
let skipped = 0;

for (const f of files) {
  const fp = path.join(postsDir, f);
  const raw = fs.readFileSync(fp, "utf8");
  const post = JSON.parse(raw);
  const repo = post.featuredImage?.src;
  const live = liveBySlug.get(post.slug);
  if (!repo || !live || repo === live) {
    skipped++;
    continue;
  }
  // Targeted replace only the src inside the featuredImage block.
  const next = raw.replace(
    /("featuredImage"\s*:\s*\{[^}]*?"src"\s*:\s*")[^"]*(")/,
    `$1${live}$2`
  );
  // Safety: make sure the new content is still valid JSON and really changed.
  JSON.parse(next);
  if (next === raw) {
    console.log(`  !! could not patch ${post.slug} (regex missed)`);
    skipped++;
    continue;
  }
  fs.writeFileSync(fp, next);
  console.log(`  ${post.slug}`);
  console.log(`    ${repo}  →  ${live}`);
  updated++;
}

console.log(`\nDone. ${updated} cover(s) synced, ${skipped} unchanged.`);

// local safety copy so a consumer of this repo without the server uploads can
// still see which covers the server expects.
fs.writeFileSync(
  path.join(root, "scripts", "covers-expected.txt"),
  [...liveBySlug.values()].sort().join("\n") + "\n"
);
console.log("Wrote scripts/covers-expected.txt (server cover list).");