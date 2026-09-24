/**
 * normalize-post-links.mjs
 *
 * Rewrites the author-supplied CTA links in content/posts/*.json so internal
 * targets are locale-prefixed:
 *
 *   /blog/<slug>                               -> /<locale>/blog/<slug>/
 *   https://sinisteroid.ir/blog/<slug>         -> /<locale>/blog/<slug>/
 *   https://sinisteroid.ir/<locale>/blog/<slug>-> /<locale>/blog/<slug>/
 *
 * Why: bare /blog/... URLs 301-redirect to /en/... (.htaccess). Every one of
 * those links therefore cost a redirect hop, and on a Persian page it threw
 * the reader out of the Persian site entirely. Locale-correct hrefs keep the
 * crawl to one hop and keep Persian readers in Persian.
 *
 * A translated page never links to an untranslated fallback either: when the
 * target post has no translation for that locale, the link points at the
 * /en/ article (the only indexable URL it has).
 *
 * External URLs (claude.com, cline.bot, schema.org, ...) are never touched.
 *
 * Usage:  npm run normalize-links              (dry run — prints the plan)
 *         npm run normalize-links -- --write   (apply)
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const postsDir = path.join(root, "content", "posts");
const WRITE = process.argv.includes("--write");

const files = fs
  .readdirSync(postsDir)
  .filter((f) => f.endsWith(".json"))
  .sort();

const posts = files.map((f) => ({
  file: f,
  data: JSON.parse(fs.readFileSync(path.join(postsDir, f), "utf8")),
}));

/** Slugs that carry a real Persian translation. */
const faSlugs = new Set(
  posts.filter((p) => p.data.translations?.fa).map((p) => p.data.slug)
);

const BARE = /^\/blog\/([A-Za-z0-9._~-]+)\/?$/;
const ABS = /^https?:\/\/(?:www\.)?sinisteroid\.ir\/(?:en\/|fa\/)?blog\/([A-Za-z0-9._~-]+)\/?$/;

/** Locale-correct, one-hop href for an internal blog link. */
function target(slug, locale) {
  if (locale === "fa" && !faSlugs.has(slug)) return `/en/blog/${slug}/`;
  return `/${locale}/blog/${slug}/`;
}

const changes = [];

for (const { file, data } of posts) {
  let touched = false;
  for (const locale of ["en", "fa"]) {
    const translation = data.translations?.[locale];
    if (!translation?.content) continue;
    for (const block of translation.content) {
      const href = block.buttonUrl;
      if (!href) continue;
      const m = BARE.exec(href) ?? ABS.exec(href);
      if (!m) continue;
      const next = target(m[1], locale);
      if (next === href) continue;
      block.buttonUrl = next;
      touched = true;
      changes.push(`${file} [${locale}] ${href} -> ${next}`);
    }
  }
  if (touched && WRITE) {
    fs.writeFileSync(
      path.join(postsDir, file),
      JSON.stringify(data, null, 2) + "\n"
    );
  }
}

console.log(
  `${WRITE ? "✓ rewrote" : "· dry run:"} ${changes.length} internal link(s) across ${
    new Set(changes.map((c) => c.split(" ")[0])).size
  } post file(s)`
);
for (const c of changes) console.log(`  ${c}`);
if (!WRITE && changes.length) {
  console.log("\nRe-run with `npm run normalize-links -- --write` to apply.");
}
