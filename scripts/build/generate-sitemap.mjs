/**
 * generate-sitemap.mjs
 *
 * Regenerates public/sitemap.xml from the actual content/posts directory.
 * Canonical scheme: locale-prefixed URLs only (/en/... and /fa/...),
 * cross-linked with hreflang alternates. No bare URLs, no ?lang= params —
 * those variants are handled by 301 redirects in .htaccess.
 *
 * Runs automatically as part of `npm run build`.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..", "..");
const SITE = "https://sinisteroid.ir";

const today = new Date().toISOString().slice(0, 10);

// ── Collect published posts ─────────────────────────────────────────
const postsDir = path.join(root, "content", "posts");
let posts = [];
if (fs.existsSync(postsDir)) {
  posts = fs
    .readdirSync(postsDir)
    .filter((f) => f.endsWith(".json"))
    .map((f) => {
      try {
        return JSON.parse(fs.readFileSync(path.join(postsDir, f), "utf8"));
      } catch {
        console.warn(`  ! skipping unparseable ${f}`);
        return null;
      }
    })
    .filter((p) => p && p.slug && (p.status ?? "published") !== "draft")
    .map((p) => ({
      slug: p.slug,
      lastmod: String(p.updated ?? p.date ?? today).slice(0, 10),
      image:
        p.featuredImage?.src && p.featuredImage.src.startsWith("/")
          ? `${SITE}${p.featuredImage.src}`
          : null,
    }));
}

// ── URL builders ────────────────────────────────────────────────────
function localeUrl(locale, pathNoLocale) {
  return pathNoLocale
    ? `${SITE}/${locale}/${pathNoLocale}/`
    : `${SITE}/${locale}/`;
}

function urlBlock({ en, fa, priority, changefreq, lastmod, image }) {
  return `  <url>
    <loc>${en}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>${changefreq}</changefreq>
    <priority>${priority}</priority>
    <xhtml:link rel="alternate" hreflang="en" href="${en}" />
    <xhtml:link rel="alternate" hreflang="fa" href="${fa}" />
    <xhtml:link rel="alternate" hreflang="x-default" href="${en}" />${
      image
        ? `
    <image:image>
      <image:loc>${image}</image:loc>
    </image:image>`
        : ""
    }
  </url>`;
}

const blocks = [];

// Static sections (both locales)
const sections = [
  { path: "", priority: "1.0", changefreq: "weekly" },
  { path: "blog", priority: "0.9", changefreq: "daily" },
  { path: "showcase", priority: "0.8", changefreq: "monthly" },
  { path: "skills", priority: "0.7", changefreq: "monthly" },
  { path: "education", priority: "0.6", changefreq: "monthly" },
  { path: "work", priority: "0.6", changefreq: "monthly" },
];

for (const s of sections) {
  blocks.push(
    urlBlock({
      en: localeUrl("en", s.path),
      fa: localeUrl("fa", s.path),
      priority: s.priority,
      changefreq: s.changefreq,
      lastmod: today,
    })
  );
}

// Blog posts (both locales)
for (const p of posts) {
  blocks.push(
    urlBlock({
      en: localeUrl("en", `blog/${p.slug}`),
      fa: localeUrl("fa", `blog/${p.slug}`),
      priority: "0.8",
      changefreq: "monthly",
      lastmod: p.lastmod,
      image: p.image,
    })
  );
}

// Tag archive pages (canonical taxonomy, both locales)
const tagsPath = path.join(root, "src", "data", "tags.json");
const postsRaw = fs
  .readdirSync(postsDir)
  .filter((f) => f.endsWith(".json"))
  .map((f) => {
    try {
      return JSON.parse(fs.readFileSync(path.join(postsDir, f), "utf8"));
    } catch {
      return null;
    }
  })
  .filter((p) => p && p.slug && (p.status ?? "published") !== "draft");
const usedTagSlugs = new Set();
if (fs.existsSync(tagsPath)) {
  const tagData = JSON.parse(fs.readFileSync(tagsPath, "utf8"));
  const canonical = new Set(tagData.canonical.map((t) => t.slug));
  for (const p of postsRaw)
    for (const t of p.tags ?? []) {
      const slug = tagData.map[t] ?? (canonical.has(t) ? t : null);
      if (slug) usedTagSlugs.add(slug);
    }
  for (const slug of usedTagSlugs) {
    blocks.push(
      urlBlock({
        en: localeUrl("en", `tags/${slug}`),
        fa: localeUrl("fa", `tags/${slug}`),
        priority: "0.5",
        changefreq: "weekly",
        lastmod: today,
      })
    );
  }
}

const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:image="http://www.google.com/schemas/sitemap-image/1.1"
        xmlns:xhtml="http://www.w3.org/1999/xhtml">
${blocks.join("\n")}
</urlset>
`;

const outPath = path.join(root, "public", "sitemap.xml");
fs.writeFileSync(outPath, xml);
console.log(
  `✓ wrote public/sitemap.xml (${sections.length} sections + ${posts.length} posts, ×2 locales)`
);

