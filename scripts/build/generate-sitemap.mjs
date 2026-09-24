/**
 * generate-sitemap.mjs
 *
 * Regenerates public/sitemap.xml from the actual content/posts directory.
 * Canonical scheme: locale-prefixed URLs only (/en/... and /fa/...),
 * cross-linked with hreflang alternates. No bare URLs, no ?lang= params —
 * those variants are handled by 301 redirects in .htaccess.
 *
 * Two rules this file obeys:
 *  1. lastmod is the date the page's SOURCE last changed (git), never the
 *     build date. A lastmod that moves without content teaches Google to
 *     ignore the field entirely, and an ignored lastmod earns no recrawl.
 *  2. An alternate is only advertised for a locale the page exists in. Posts
 *     ship English-only until translated; their /fa/ URL serves the English
 *     article and is noindexed, so it must not appear here.
 *
 * changefreq and priority were dropped on purpose: Google has ignored both
 * for years, and they only add noise to the file.
 *
 * Runs automatically as part of `npm run build`.
 */
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..", "..");
const SITE = "https://sinisteroid.ir";

const today = new Date().toISOString().slice(0, 10);

/** Last commit date (YYYY-MM-DD) for a repo-relative file — the honest lastmod
 *  for pages whose content lives in source. Falls back to $fallback when the
 *  file is untracked or git is unavailable (tarball deploy, shallow CI). */
function gitLastmod(relPath, fallback = today) {
  try {
    const out = execFileSync("git", ["log", "-1", "--format=%cs", "--", relPath], {
      cwd: root,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    }).trim();
    return /^\d{4}-\d{2}-\d{2}$/.test(out) ? out : fallback;
  } catch {
    return fallback;
  }
}

/** Newest of two YYYY-MM-DD strings; "" loses to anything. */
const newest = (a, b) => (a > b ? a : b);

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
      // A real Persian translation — not the EN fallback the /fa/ route serves
      // (and noindexes) when translations.fa is missing.
      hasFa: Boolean(p.translations?.fa),
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

/**
 * One <url> block per locale the page exists in, each carrying the complete
 * alternate set (a self-reference plus every other locale) and the shared
 * x-default. `locales` defaults to both, so only genuinely untranslated
 * content (a post with no Persian translation) narrows it to ["en"].
 */
function urlBlocks({ path: pathNoLocale, lastmod, locales = ["en", "fa"], image }) {
  const alternates = locales
    .map(
      (l) =>
        `    <xhtml:link rel="alternate" hreflang="${l}" href="${localeUrl(l, pathNoLocale)}" />`
    )
    .join("\n");
  const xDefault = locales.includes("en")
    ? `\n    <xhtml:link rel="alternate" hreflang="x-default" href="${localeUrl("en", pathNoLocale)}" />`
    : "";
  return locales
    .map(
      (l) => `  <url>
    <loc>${localeUrl(l, pathNoLocale)}</loc>
    <lastmod>${lastmod}</lastmod>
${alternates}${xDefault}${
        image
          ? `
    <image:image>
      <image:loc>${image}</image:loc>
    </image:image>`
          : ""
      }
  </url>`
    )
    .join("\n");
}

const blocks = [];

// Static sections — both locales, lastmod from each route's own source file.
const sections = [
  { path: "", file: "src/app/(main)/[locale]/page.tsx" },
  { path: "blog", file: "src/app/(main)/[locale]/blog/page.tsx" },
  { path: "showcase", file: "src/app/(main)/[locale]/showcase/page.tsx" },
  { path: "skills", file: "src/app/(main)/[locale]/skills/page.tsx" },
  { path: "education", file: "src/app/(main)/[locale]/education/page.tsx" },
  { path: "work", file: "src/app/(main)/[locale]/work/page.tsx" },
  { path: "lab", file: "src/app/(main)/[locale]/lab/page.tsx" },
  { path: "contact", file: "src/app/(main)/[locale]/contact/page.tsx" },
];

for (const s of sections) {
  blocks.push(urlBlocks({ path: s.path, lastmod: gitLastmod(s.file) }));
}

// Blog posts — the /fa/ URL is listed only when the Persian translation
// exists (see hasFa above).
for (const p of posts) {
  blocks.push(
    urlBlocks({
      path: `blog/${p.slug}`,
      lastmod: p.lastmod,
      locales: p.hasFa ? ["en", "fa"] : ["en"],
      image: p.image,
    })
  );
}

// Tag archive pages — both locales (the hub chrome and lead ARE translated),
// lastmod = the newest post filed under the tag.
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
  const tagLastmod = new Map();
  for (const p of postsRaw)
    for (const t of p.tags ?? []) {
      const slug = tagData.map[t] ?? (canonical.has(t) ? t : null);
      if (!slug) continue;
      usedTagSlugs.add(slug);
      const date = String(p.updated ?? p.date ?? today).slice(0, 10);
      tagLastmod.set(slug, newest(tagLastmod.get(slug) ?? "", date));
    }
  for (const slug of [...usedTagSlugs].sort()) {
    blocks.push(
      urlBlocks({
        path: `tags/${slug}`,
        lastmod: tagLastmod.get(slug) ?? today,
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
  `✓ wrote public/sitemap.xml (${sections.length} sections + ${posts.length} posts + ${usedTagSlugs.size} tag hubs; locale-aware hreflang, git lastmod)`
);

