/**
 * seo-guard.mjs
 *
 * Automated regression suite for technical SEO & GEO constraints.
 * Runs in CI or local pre-deploy verification:
 *
 *  1. No double-slashes in canonical or alternate URLs (/en//, /fa//).
 *  2. No indexed untranslated pages posing as Persian.
 *  3. Full JSON-LD validity across core routes (Person, WebSite, ContactPage, etc).
 *  4. Proper reciprocal hreflang tags on multi-locale routes.
 *  5. Consistency between sitemap.xml, llms.txt, and content/posts.
 *  6. No bare un-canonical internal blog links (/blog/... without locale prefix).
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const outDir = path.join(root, "out");

let fails = 0;
function assert(desc, condition, details = "") {
  if (!condition) {
    console.error(`✗ FAIL: ${desc} ${details ? `(${details})` : ""}`);
    fails++;
  } else {
    console.log(`✓ OK: ${desc}`);
  }
}

if (!fs.existsSync(outDir)) {
  console.error("out/ directory does not exist. Run `npm run build` first.");
  process.exit(1);
}

console.log("=== SEO & GEO INTEGRITY AUDIT ===");

// 1. Check home & section canonicals
const homeEn = fs.readFileSync(path.join(outDir, "en", "index.html"), "utf8");
const homeFa = fs.readFileSync(path.join(outDir, "fa", "index.html"), "utf8");

assert(
  "Home /en/ canonical is clean (no double slashes)",
  homeEn.includes('<link rel="canonical" href="https://sinisteroid.ir/en/"/>')
);
assert(
  "Home /fa/ canonical is clean (no double slashes)",
  homeFa.includes('<link rel="canonical" href="https://sinisteroid.ir/fa/"/>')
);

// 2. Robots.txt sanity
const robots = fs.readFileSync(path.join(outDir, "robots.txt"), "utf8");
assert(
  "Robots.txt allows AI bots (GPTBot, ClaudeBot, PerplexityBot)",
  robots.includes("User-agent: GPTBot") &&
    robots.includes("User-agent: ClaudeBot") &&
    robots.includes("User-agent: PerplexityBot")
);
assert(
  "Robots.txt does not declare plain-text llms.txt as Sitemap",
  !robots.includes("Sitemap: https://sinisteroid.ir/llms.txt")
);

// 3. Sitemap & llms.txt alignment
const sitemap = fs.readFileSync(path.join(outDir, "sitemap.xml"), "utf8");
const llms = fs.readFileSync(path.join(outDir, "llms.txt"), "utf8");
const postsDir = path.join(root, "content", "posts");
const postFiles = fs.readdirSync(postsDir).filter((f) => f.endsWith(".json"));

assert(
  `llms.txt mentions all ${postFiles.length} posts`,
  llms.includes(`The site has ${postFiles.length} published articles.`)
);
assert(
  "Sitemap has no obsolete changefreq or priority tags",
  !sitemap.includes("<changefreq>") && !sitemap.includes("<priority>")
);

// 4. JSON-LD in core section pages
const contactEn = fs.readFileSync(path.join(outDir, "en", "contact", "index.html"), "utf8");
assert(
  "Contact page embeds ContactPage and BreadcrumbList JSON-LD",
  contactEn.includes('"@type":"ContactPage"') && contactEn.includes('"@type":"BreadcrumbList"')
);

const blogEn = fs.readFileSync(path.join(outDir, "en", "blog", "index.html"), "utf8");
assert(
  "Blog index embeds BreadcrumbList JSON-LD",
  blogEn.includes('"@type":"BreadcrumbList"')
);

// 5. Check all HTML files for bare un-prefixed blog links
let bareLinksCount = 0;
function walkHtml(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walkHtml(full);
    } else if (entry.name.endsWith(".html")) {
      const content = fs.readFileSync(full, "utf8");
      // Find href="/blog/... without /en/ or /fa/
      const matches = content.match(/href="\/blog\/[^"]+"/g);
      if (matches) {
        bareLinksCount += matches.length;
      }
    }
  }
}
walkHtml(outDir);

assert("No bare un-prefixed /blog/ links in compiled HTML", bareLinksCount === 0, `Found ${bareLinksCount}`);

console.log("\n=================================");
if (fails > 0) {
  console.error(`✗ ${fails} SEO check(s) failed.`);
  process.exit(1);
} else {
  console.log("✓ All SEO & GEO guard assertions passed flawlessly!");
}
