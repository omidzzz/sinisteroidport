/**
 * backfill-covers.mjs
 *
 * Adds `featuredImage` to content/posts/*.json for posts that are missing it,
 * harvesting the cover path from the reference build (build/blog/<slug>/index.html —
 * the prerendered pages the host actually served, which always contain the cover
 * image path in the body).
 *
 * Rules:
 *  - Posts that already have a good featuredImage are skipped.
 *  - Placeholder filenames (`REPLACE-*`) are skipped.
 *  - The first /api/uploads/*.webp in the page body is treated as the cover.
 *
 * Usage: node scripts/migrations/backfill-covers.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..", "..");
const postsDir = path.join(root, "content", "posts");
const buildBlogDir = path.join(root, "build", "blog");

let updated = 0;
let already = 0;
let skipped = 0;

for (const f of fs.readdirSync(postsDir).filter((f) => f.endsWith(".json"))) {
  const filePath = path.join(postsDir, f);
  const post = JSON.parse(fs.readFileSync(filePath, "utf8"));

  // Already has a real cover → leave it.
  if (post.featuredImage?.src && !/REPLACE/i.test(post.featuredImage.src)) {
    already++;
    continue;
  }

  const htmlPath = path.join(buildBlogDir, post.slug, "index.html");
  if (!fs.existsSync(htmlPath)) {
    console.warn(`⚠ ${post.slug}: no reference page, skipped`);
    skipped++;
    continue;
  }

  const html = fs.readFileSync(htmlPath, "utf8");
  const m = html.match(/\/api\/uploads\/[a-zA-Z0-9._-]+\.webp/);
  if (!m || /REPLACE/i.test(m[0])) {
    console.warn(`⚠ ${post.slug}: no usable cover ref (${m?.[0] ?? "none"}), skipped`);
    skipped++;
    continue;
  }

  post.featuredImage = {
    src: m[0],
    alt: {
      en: post.translations?.en?.title ?? post.title ?? "",
      fa: post.translations?.fa?.title ?? post.translations?.en?.title ?? "",
    },
  };

  fs.writeFileSync(filePath, JSON.stringify(post, null, 2) + "\n");
  console.log(`✓ ${post.slug} → ${m[0]}`);
  updated++;
}

console.log(`\nDone. Updated ${updated}, already had cover ${already}, skipped ${skipped}.`);