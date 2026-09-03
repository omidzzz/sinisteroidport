/**
 * Extracts blog post content from the prerendered HTML files in ../build/blog/
 * and generates JSON post files in ../content/posts/.
 *
 * Slugs that already have a JSON file (migrated from build/api/*.json) are skipped,
 * since those files contain richer structured content.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..", "..");
const buildBlogDir = path.join(root, "build", "blog");
const outDir = path.join(root, "content", "posts");

function decodeEntities(str) {
  return str
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;|&rsquo;/g, "\u2019")
    .replace(/&lsquo;/g, "\u2018")
    .replace(/&rdquo;|&ldquo;/g, '"')
    .replace(/&mdash;/g, "\u2014")
    .replace(/&ndash;/g, "\u2013")
    .replace(/&nbsp;/g, " ")
    .replace(/&hellip;/g, "\u2026");
}

function stripTags(html) {
  return decodeEntities(html.replace(/<[^>]+>/g, ""))
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function matchMeta(html, name) {
  const re = new RegExp(
    `<meta[^>]*name="${name}"[^>]*content="([^"]*)"`,
    "i"
  );
  const m = html.match(re);
  return m ? decodeEntities(m[1]) : "";
}

function extractContent(html) {
  // Isolate the article body if possible
  const articleStart = html.indexOf("article-content");
  let scope = html;
  if (articleStart !== -1) {
    const endIdx = html.indexOf("<footer", articleStart);
    scope = html.slice(
      Math.max(0, articleStart - 200),
      endIdx !== -1 ? endIdx : undefined
    );
    // Drop everything up to and including the article-title heading
    const afterTitle = scope.search(
      /<h[12][^>]*class="[^"]*article-title/i
    );
    if (afterTitle !== -1) {
      // Skip past the closing tag of the title element
      const close = scope.indexOf("</h2>", afterTitle);
      scope = close !== -1 ? scope.slice(close + 5) : scope;
    }
  }

  // Capture headings, real paragraphs (<p> but NOT <path>/<polyline>),
  // list items and blockquotes in document order.
  const tokenRe =
    /<(h[2-4])(\s[^>]*)?>([\s\S]*?)<\/\1>|<p(\s[^>]*)?>([\s\S]*?)<\/p>|<li(\s[^>]*)?>([\s\S]*?)<\/li>|<blockquote(\s[^>]*)?>([\s\S]*?)<\/blockquote>/gi;

  const blocks = [];
  let currentList = null;
  let m;

  const flushList = () => {
    if (currentList && currentList.items.length) {
      blocks.push(currentList);
    }
    currentList = null;
  };

  while ((m = tokenRe.exec(scope)) !== null) {
    const [, headingTag, , headingText, , paraText, , liText, , quoteText] = m;
    const text = stripTags(
      headingText ?? paraText ?? liText ?? quoteText ?? ""
    );
    if (!text || text.length < 3) continue;

    if (headingTag) {
      flushList();
      blocks.push({
        type: "heading",
        level: parseInt(headingTag[1], 10),
        text,
      });
    } else if (paraText !== undefined) {
      flushList();
      blocks.push({ type: "paragraph", text });
    } else if (liText !== undefined) {
      if (!currentList) {
        currentList = { type: "list", style: "bullet", items: [] };
      }
      currentList.items.push(text);
    } else if (quoteText !== undefined) {
      flushList();
      blocks.push({ type: "quote", text });
    }
  }
  flushList();

  // Mark the very first paragraph as a lead paragraph
  const firstPara = blocks.find((b) => b.type === "paragraph");
  if (firstPara) firstPara.style = "lead";

  return blocks;
}

function slugifyTitle(title) {
  // Derive a couple of topical tags from the title words
  const stop = new Set([
    "the","a","an","of","for","and","or","to","in","is","are","what","why",
    "how","your","you","it","its","with","that","this","on","vs","now","here",
    "should","use","which","from","be","can","do","does","not","we","by","at",
  ]);
  const words = title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .split(/\s+/)
    .filter((w) => w.length > 3 && !stop.has(w));
  return [...new Set(words)].slice(0, 4);
}

fs.mkdirSync(outDir, { recursive: true });

const existingSlugs = new Set(
  fs
    .readdirSync(outDir)
    .filter((f) => f.endsWith(".json"))
    .map((f) => f.replace(/\.json$/, ""))
);

if (!fs.existsSync(buildBlogDir)) {
  console.error(`Build folder not found: ${buildBlogDir}`);
  process.exit(1);
}

let created = 0;
let skipped = 0;

for (const entry of fs.readdirSync(buildBlogDir, { withFileTypes: true })) {
  if (!entry.isDirectory()) continue;
  const slug = entry.name;
  if (existingSlugs.has(slug)) {
    console.log(`↷ skip ${slug} (already migrated)`);
    skipped++;
    continue;
  }

  const htmlPath = path.join(buildBlogDir, slug, "index.html");
  if (!fs.existsSync(htmlPath)) continue;
  let html = fs.readFileSync(htmlPath, "utf8");
  // Remove script/style blocks (JSON-LD contains selectors that confuse extraction)
  html = html
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "");

  const titleMatch =
    html.match(/<h[12][^>]*class="[^"]*article-title[^"]*"[^>]*>([\s\S]*?)<\/h[12]>/i) ||
    html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i);
  const rawTitle = titleMatch ? stripTags(titleMatch[1]) : "";
  const metaTitle = matchMeta(html, "title") || rawTitle;
  // Prefer clean H1; fall back to meta title trimmed of site suffixes
  const title =
    rawTitle ||
    metaTitle.replace(/\s*[|\u2013\u2014-]\s*[^|\u2013\u2014]*$/, "").trim();
  const description = matchMeta(html, "description");
  const dateMatch = html.match(/"datePublished":\s*"([^"]+)"/);
  const date = dateMatch ? dateMatch[1].slice(0, 10) : new Date().toISOString().slice(0, 10);

  const content = extractContent(html);
  if (!content.length) {
    console.warn(`⚠ no content extracted for ${slug}`);
  }

  const post = {
    slug,
    title,
    date,
    tags: slugifyTitle(title),
    translations: {
      en: { title, excerpt: description, content },
    },
  };

  fs.writeFileSync(
    path.join(outDir, `${slug}.json`),
    JSON.stringify(post, null, 2)
  );
  created++;
  console.log(`✓ ${slug} (${content.length} blocks)`);
}

console.log(`\nDone. Created ${created}, skipped ${skipped}.`);
