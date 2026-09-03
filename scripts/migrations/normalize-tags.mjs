/**
 * normalize-tags.mjs — one-time content migration.
 *
 * Older posts carried junk tags (title-word fragments like "whats",
 * "difference", "without"). This rewrites `tags` in every content/posts/*.json
 * onto the canonical taxonomy in src/data/tags.json (same mapping as
 * src/lib/tags.ts). Idempotent — safe to re-run.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..", "..");
const postsDir = path.join(root, "content", "posts");
const tagData = JSON.parse(
  fs.readFileSync(path.join(root, "src", "data", "tags.json"), "utf8")
);
const canonicalSlugs = new Set(tagData.canonical.map((t) => t.slug));

function normalizeTags(tags) {
  if (!Array.isArray(tags)) return [];
  const out = [];
  for (const raw of tags) {
    const slug = tagData.map[raw] ?? (canonicalSlugs.has(raw) ? raw : null);
    if (slug && !out.includes(slug)) out.push(slug);
  }
  return out.slice(0, 6);
}

for (const file of fs.readdirSync(postsDir).filter((f) => f.endsWith(".json"))) {
  const filePath = path.join(postsDir, file);
  const post = JSON.parse(fs.readFileSync(filePath, "utf8"));
  const next = normalizeTags(post.tags);
  if (JSON.stringify(next) === JSON.stringify(post.tags)) continue;
  post.tags = next;
  fs.writeFileSync(filePath, JSON.stringify(post, null, 2) + "\n");
  console.log(`  ~ ${file}: → ${next.join(", ")}`);
}
console.log("Tags normalized.");
