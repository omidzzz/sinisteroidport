/**
 * generate-rss.mjs
 *
 * Generates RSS 2.0 feeds from content/posts:
 *   public/feed.xml      (English)
 *   public/fa/feed.xml   (Persian)
 * Runs automatically as part of `npm run build`.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const SITE = "https://sinisteroid.ir";

const esc = (s) =>
  String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

const postsDir = path.join(root, "content", "posts");
const posts = fs.existsSync(postsDir)
  ? fs
      .readdirSync(postsDir)
      .filter((f) => f.endsWith(".json"))
      .map((f) => {
        try {
          return JSON.parse(fs.readFileSync(path.join(postsDir, f), "utf8"));
        } catch {
          return null;
        }
      })
      .filter((p) => p && p.slug && (p.status ?? "published") !== "draft")
      .sort((a, b) => new Date(b.date) - new Date(a.date))
  : [];

function item(post, locale) {
  const t = post.translations?.[locale] ?? post.translations?.en;
  const title = t?.title ?? post.title;
  const excerpt = t?.excerpt ?? "";
  const url = `${SITE}/${locale}/blog/${post.slug}/`;
  const pub = new Date(post.updated ?? post.date).toUTCString();
  return `    <item>
      <title>${esc(title)}</title>
      <link>${url}</link>
      <guid isPermaLink="true">${url}</guid>
      <pubDate>${pub}</pubDate>
      <description>${esc(excerpt)}</description>${
        Array.isArray(post.tags) && post.tags.length
          ? `\n      ${post.tags.map((tg) => `<category>${esc(tg)}</category>`).join("")}`
          : ""
      }
    </item>`;
}

function feed(locale, selfPath) {
  const isFa = locale === "fa";
  const title = isFa
    ? "امید – نوشته‌ها"
    : "Omid – Writing";
  const desc = isFa
    ? "توسعه فرانت‌اند، طراحی، ابزارهای هوش مصنوعی محلی و آینده جست‌وجو."
    : "Frontend development, design, local AI tooling, and the shifting landscape of search.";
  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${esc(title)}</title>
    <link>${SITE}/${locale}/blog/</link>
    <atom:link href="${SITE}${selfPath}" rel="self" type="application/rss+xml" />
    <description>${esc(desc)}</description>
    <language>${isFa ? "fa-ir" : "en-us"}</language>
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
${posts.map((p) => item(p, locale)).join("\n")}
  </channel>
</rss>
`;
}

fs.writeFileSync(path.join(root, "public", "feed.xml"), feed("en", "/feed.xml"));
const faDir = path.join(root, "public", "fa");
fs.mkdirSync(faDir, { recursive: true });
fs.writeFileSync(path.join(faDir, "feed.xml"), feed("fa", "/fa/feed.xml"));

// ── JSON Feed 1.1 (https://jsonfeed.org/) ──────────────────────────────
// Preferred by several aggregators and AI ingest pipelines; same source of
// truth as the RSS feeds, plus a cover image per item.
function jsonFeed(locale, selfPath) {
  const isFa = locale === "fa";
  const items = posts.map((p) => {
    const t = p.translations?.[locale] ?? p.translations?.en;
    const url = `${SITE}/${locale}/blog/${p.slug}/`;
    return {
      id: url,
      url,
      title: t?.title ?? p.title ?? "",
      content_text: t?.excerpt ?? "",
      summary: t?.excerpt ?? "",
      date_published: new Date(p.date).toISOString(),
      ...(p.updated
        ? { date_modified: new Date(p.updated).toISOString() }
        : {}),
      ...(Array.isArray(p.tags) && p.tags.length ? { tags: p.tags } : {}),
      ...(p.featuredImage?.src
        ? { image: p.featuredImage.src.startsWith("/") ? `${SITE}${p.featuredImage.src}` : p.featuredImage.src }
        : {}),
      authors: [{ name: "Omid", url: SITE }],
    };
  });
  return {
    version: "https://jsonfeed.org/version/1.1",
    title: isFa ? "امید – نوشته‌ها" : "Omid – Writing",
    home_page_url: `${SITE}/${locale}/blog/`,
    feed_url: `${SITE}${selfPath}`,
    description: isFa
      ? "توسعه فرانت‌اند، طراحی، ابزارهای هوش مصنوعی محلی و آینده جست‌وجو."
      : "Frontend development, design, local AI tooling, and the shifting landscape of search.",
    language: isFa ? "fa-ir" : "en-us",
    authors: [{ name: "Omid", url: SITE }],
    items,
  };
}

fs.writeFileSync(
  path.join(root, "public", "feed.json"),
  JSON.stringify(jsonFeed("en", "/feed.json"), null, 2) + "\n"
);
fs.writeFileSync(
  path.join(faDir, "feed.json"),
  JSON.stringify(jsonFeed("fa", "/fa/feed.json"), null, 2) + "\n"
);
console.log(`✓ wrote public/feed.xml + public/fa/feed.xml (${posts.length} posts)`);
console.log(`✓ wrote public/feed.json + public/fa/feed.json (${posts.length} posts)`);
