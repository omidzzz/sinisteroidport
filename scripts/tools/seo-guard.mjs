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
 *  7. FAQ coverage: every post carrying FAQ items ships FAQPage JSON-LD.
 *  8. Blog index exposes its archive as CollectionPage/ItemList, and llms.txt
 *     carries the citation-guidance block.
 *  9. Brand unity (Option A): every built surface names the same person,
 *     the same website and the same origin as src/lib/brand.json; the
 *     canonical logotype renders; Persian pages pin the Latin brand forms
 *     LTR; the site name is never transliterated; and the theme grounds are
 *     declared in brand.json only.
 */

import fs from "node:fs";
import path from "node:path";
import { BRAND, root, SITE } from "../lib/brand.mjs";

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

// 1. Check home & section canonicals + feed identity. Feeds are the one
// place the Option-A split is machine-visible without parsing prose: the
// author must be the person (Omid), the link/home the website (Sinisteroid).
const homeEn = fs.readFileSync(path.join(outDir, "en", "index.html"), "utf8");
const homeFa = fs.readFileSync(path.join(outDir, "fa", "index.html"), "utf8");

assert(
  "Home /en/ canonical is clean (no double slashes)",
  homeEn.includes(`<link rel="canonical" href="${SITE}/en/"/>`)
);
assert(
  "Home /fa/ canonical is clean (no double slashes)",
  homeFa.includes(`<link rel="canonical" href="${SITE}/fa/"/>`)
);

/* Brand identity in feeds (Option A). Feeds are a WEBSITE artifact whose
   writing is AUTHORED by the person, so each feed must name both: the
   person (Latin "Omid", or "امید" in the Persian channel title) and the
   site origin. The locale matters — the Persian RSS channel is titled
   امید – نوشته‌ها, so asserting the Latin spelling alone would be wrong. */
const feedFiles = [
  ["public/feed.xml", "en"],
  ["public/fa/feed.xml", "fa"],
  ["public/feed.json", "en"],
  ["public/fa/feed.json", "fa"],
];
for (const [rel, locale] of feedFiles) {
  const text = fs.existsSync(path.join(root, rel))
    ? fs.readFileSync(path.join(root, rel), "utf8")
    : "";
  const person = locale === "fa" ? BRAND.personFa : BRAND.person;
  assert(
    `${rel}: authored by ${person}, served from ${BRAND.domain}`,
    text.includes(person) && text.includes(BRAND.domain)
  );
}
assert(
  "Person JSON-LD keeps Option-A identity (Omid, alternateName امید)",
  homeEn.includes(`"name":"${BRAND.person}"`) &&
    homeFa.includes(`"alternateName":"${BRAND.personFa}"`)
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
  !robots.includes(`Sitemap: ${SITE}/llms.txt`)
);
assert(
  "Robots.txt advertises the sitemap on the canonical origin",
  robots.includes(`Sitemap: ${SITE}/sitemap.xml`)
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
  "Blog index embeds BreadcrumbList, CollectionPage and ItemList JSON-LD",
  blogEn.includes('"@type":"BreadcrumbList"') &&
    blogEn.includes('"@type":"CollectionPage"') &&
    blogEn.includes('"@type":"ItemList"')
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

// 7. FAQ coverage — a post whose chosen translation (locale content, or the
// EN fallback the route serves) carries FAQ items must publish FAQPage
// JSON-LD in the matching locale document.
const faqGaps = [];
for (const file of postFiles) {
  const post = JSON.parse(fs.readFileSync(path.join(postsDir, file), "utf8"));
  if (!post.slug) continue;
  for (const locale of ["en", "fa"]) {
    const translation = post.translations?.[locale] ?? post.translations?.en;
    if (!(Array.isArray(translation?.faq) && translation.faq.length > 0)) continue;
    const htmlPath = path.join(outDir, locale, "blog", post.slug, "index.html");
    const html = fs.existsSync(htmlPath) ? fs.readFileSync(htmlPath, "utf8") : "";
    if (!html.includes('"@type":"FAQPage"')) faqGaps.push(`${locale}/blog/${post.slug}/`);
  }
}
assert(
  "Every FAQ-bearing post ships FAQPage JSON-LD",
  faqGaps.length === 0,
  faqGaps.slice(0, 5).join(", ")
);

// 8. llms.txt carries the citation-guidance block (GEO attribution)
assert(
  "llms.txt explains how to cite the site",
  llms.includes("## Citing this site")
);

// 9. BRAND UNITY (Option A) — one person, one website, one origin, one
// logotype. Everything below is derived from src/lib/brand.json, the same file
// the app imports, so a surface that hard-codes a second spelling fails here
// instead of shipping a competing identity.

/* 9a. The source is internally consistent. Cheap to check, and it means every
   later assertion can trust these values instead of re-deriving them. */
assert(
  `logoFull is the bracket lockup (${BRAND.logoPrefix}[${BRAND.logoSuffix}])`,
  BRAND.logoFull === `${BRAND.logoPrefix}[${BRAND.logoSuffix}]`
);
assert(
  `domain is the https origin of host (${BRAND.domain} / ${BRAND.host})`,
  BRAND.domain === `https://${BRAND.host}`
);
assert(
  `socialHandle is the site handle (@${BRAND.site.toLowerCase()})`,
  BRAND.socialHandle === `@${BRAND.site.toLowerCase()}`
);
assert(
  `personSlug is the ASCII slug of the person (${BRAND.personSlug})`,
  BRAND.personSlug === BRAND.person.toLowerCase() &&
    /^[a-z0-9-]+$/.test(BRAND.personSlug)
);
assert(
  `promptHost is personSlug@site (${BRAND.promptHost})`,
  BRAND.promptHost === `${BRAND.personSlug}@${BRAND.site.toLowerCase()}`
);
assert(
  "no siteFa field — the site name has ONE spelling in both locales",
  !("siteFa" in BRAND),
  "siteFa invites exactly the Persian transliteration Option A forbids"
);
assert(
  "person, personFa and site are all populated",
  Boolean(BRAND.person && BRAND.personFa && BRAND.site)
);

/* 9b. The Person / WebSite nodes agree with each other and with the brand:
   the author and the site owner are the same entity under the same @id. */
const homeLd =
  homeEn.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)?.[1] ?? "";
assert(
  "Home JSON-LD names the person and the origin",
  homeLd.includes(`"name":"${BRAND.person}"`) && homeLd.includes(BRAND.domain)
);
assert(
  `Person node uses the brand's personSlug (@id ${BRAND.domain}/#${BRAND.personSlug})`,
  homeLd.includes(`"@id":"${BRAND.domain}/#${BRAND.personSlug}"`)
);
assert(
  `WebSite node is the website, not the person (${BRAND.site})`,
  homeLd.includes(`"@type":"WebSite"`) &&
    homeLd.includes(`"name":"${BRAND.site}"`)
);

/* 9c. The manifest is generated from the same source — short_name is the
   website, the long name is the person, and the PWA chrome paints the dark
   edition ground. */
const manifestPath = path.join(outDir, "manifest.json");
const manifestText = fs.existsSync(manifestPath)
  ? fs.readFileSync(manifestPath, "utf8")
  : "";
const manifest = manifestText ? JSON.parse(manifestText) : null;
assert(
  `manifest short_name is the site handle (${BRAND.site})`,
  manifest?.short_name === BRAND.site
);
assert(
  `manifest name carries the person (${BRAND.person})`,
  typeof manifest?.name === "string" && manifest.name.includes(BRAND.person)
);
assert(
  `manifest theme/background are the brand grounds (${BRAND.themeColors.dark})`,
  manifest?.theme_color === BRAND.themeColors.dark &&
    manifest?.background_color === BRAND.themeColors.dark
);

/* 9d. Sitemap + both llms profiles are built from the same origin. */
assert(
  "sitemap carries only the canonical origin",
  sitemap.includes(SITE) && !sitemap.includes("localhost")
);
const llmsFull = fs.existsSync(path.join(outDir, "llms-full.txt"))
  ? fs.readFileSync(path.join(outDir, "llms-full.txt"), "utf8")
  : "";
assert(
  "llms-full.txt names the person, the site and the origin",
  [BRAND.person, BRAND.site, BRAND.domain].every((v) => llmsFull.includes(v))
);

/* 9e. The canonical lockup actually RENDERS. LogoType splits the wordmark
   into spans (prefix / bracket / suffix / bracket), so the built HTML is
   checked for that exact shape — a lockup that silently loses its brackets
   still looks like "a logo" in review, but it is no longer the brand. */
const lockupShape =
  '<span class="logo-sinister">' +
  BRAND.logoPrefix +
  '</span><span class="logo-glyph">[</span>';
assert(
  `footer renders the canonical lockup ${BRAND.logoFull}`,
  homeEn.includes(lockupShape) && homeFa.includes(lockupShape)
);
assert(
  "lockup suffix renders from the brand",
  homeEn.includes(`<span class="logo-id">${BRAND.logoSuffix.slice(1)}</span>`)
);

/* 9f. Persian pages keep the Latin brand forms pinned LTR. The hero wordmark,
   the footer lockup and the console host are all ASCII; under dir="rtl" an
   unpinned one reorders into "OID]SINISTER[" or flips the @host. */
for (const [doc, name] of [
  [homeEn, "en"],
  [homeFa, "fa"],
]) {
  assert(
    `${name}: hero wordmark pinned dir="ltr"`,
    /<h1 class="craft-hero-name" dir="ltr">/.test(doc)
  );
  assert(
    `${name}: logotype pinned dir="ltr"`,
    /<span dir="ltr" class="logo-type[^"]*"/.test(doc)
  );
}
assert(
  `fa: console host is the declared person@site (${BRAND.promptHost}) and pinned LTR`,
  new RegExp(`craft-prompt-host" dir="ltr"[^>]*>${BRAND.promptHost}<`).test(
    homeFa
  )
);

/* 9g. No transliterated site name. Option A keeps Sinisteroid Latin in BOTH
   locales; a Persian spelling of the handle is a second identity in exactly
   the surface (Persian metadata, JSON-LD, feeds) that search engines read.
   Scoped to the site name only — the resident agent's own name is a separate
   product identity and is not what this rule governs. */
const TRANSLITERATIONS = ["سینیسترویید", "سینستروئید"];
const srcFiles = [];
(function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full);
    else if (/\.(ts|tsx)$/.test(entry.name)) srcFiles.push(full);
  }
})(path.join(root, "src"));
const transliterations = [];
for (const file of srcFiles) {
  const text = fs.readFileSync(file, "utf8");
  for (const bad of TRANSLITERATIONS) {
    if (text.includes(bad)) {
      transliterations.push(`${path.relative(root, file)}: ${bad}`);
    }
  }
}
for (const doc of [homeEn, homeFa]) {
  for (const bad of TRANSLITERATIONS) {
    if (doc.includes(bad)) transliterations.push(`built HTML: ${bad}`);
  }
}
assert(
  "no transliterated site name in source or built HTML",
  transliterations.length === 0,
  transliterations.slice(0, 5).join(", ")
);

/* 9h. Palette integrity. Two different failure modes, two checks:
   (1) The theme GROUNDS are declared in brand.json only — a TypeScript
       literal is a second declaration that can drift from the brand. (The
       CSS token sheet legitimately repeats these hexes; it is the styling
       source of truth, and verify-craft cross-checks the ink side.)
   (2) The three signature INKS are declared in brand.json AND repeated
       across the token sheet and the @property initial-values. Those two
       CSS files can disagree with each other, and with the brand, with
       nothing watching — so verify-craft asserts all three agree. */
const strayThemeHex = [];
for (const file of srcFiles) {
  const text = fs.readFileSync(file, "utf8");
  for (const hex of [BRAND.themeColors.light, BRAND.themeColors.dark]) {
    // brand.json is the declaration; the brand.ts doc comment names it too.
    if (file.endsWith(path.join("lib", "brand.ts"))) continue;
    if (text.toLowerCase().includes(hex.toLowerCase())) {
      strayThemeHex.push(`${path.relative(root, file)}: ${hex}`);
    }
  }
}
assert(
  "theme grounds are declared only in brand.json",
  strayThemeHex.length === 0,
  strayThemeHex.slice(0, 5).join(", ")
);

/* 9i. sameAs is closed over the brand's contact URLs. The schema is the one
   place a second social profile could quietly appear (a hand-added Twitter
   URL, say) — a surface no other guard sees, since feeds and llms.txt carry
   no social identity. Both directions are checked: nothing invented, and
   nothing in the brand forgotten. */
const sameAsMatch = homeLd.match(/"sameAs":\[([^\]]*)\]/);
const sameAs = sameAsMatch
  ? [...sameAsMatch[1].matchAll(/"([^"]+)"/g)].map((m) => m[1])
  : [];
const brandProfiles = [BRAND.contact.github, BRAND.contact.telegram];
assert(
  "Person sameAs declares exactly the brand's profile URLs",
  sameAs.length === brandProfiles.length &&
    brandProfiles.every((u) => sameAs.includes(u)),
  `sameAs=[${sameAs.join(", ")}] vs brand=[${brandProfiles.join(", ")}]`
);

/* 9j. hreflang is RECIPROCAL. Each locale document must advertise the same
   alternate set — a one-way alternate tells Google the two pages are
   equivalents while the other side denies it, which is how a bilingual site
   silently collapses to one indexed locale. x-default must appear on both
   and point at the same URL. */
const hreflangOf = (doc) =>
  Object.fromEntries(
    [...doc.matchAll(/<link rel="alternate" hrefLang="([^"]*)" href="([^"]*)"/g)].map(
      (m) => [m[1], m[2]]
    )
  );
const reciprocalRoutes = ["", "blog", "showcase", "skills", "education", "work", "lab", "contact"];
const asymmetric = [];
for (const route of reciprocalRoutes) {
  const read = (locale) =>
    fs.existsSync(path.join(outDir, locale, route, "index.html"))
      ? fs.readFileSync(path.join(outDir, locale, route, "index.html"), "utf8")
      : "";
  const en = hreflangOf(read("en"));
  const fa = hreflangOf(read("fa"));
  const label = route || "(root)";
  if (Object.keys(en).length === 0) {
    asymmetric.push(`${label}: /en/ ships no hreflang alternates`);
    continue;
  }
  if (JSON.stringify(en) !== JSON.stringify(fa)) {
    asymmetric.push(`${label}: en=${JSON.stringify(en)} fa=${JSON.stringify(fa)}`);
  }
  if (en["x-default"] !== fa["x-default"]) {
    asymmetric.push(`${label}: x-default disagrees (${en["x-default"]} vs ${fa["x-default"]})`);
  }
}
assert(
  `hreflang alternates are reciprocal across all ${reciprocalRoutes.length} section routes`,
  asymmetric.length === 0,
  asymmetric.slice(0, 3).join(" | ")
);

/* 9k. The two llms profiles describe the SAME corpus. They are generated by
   one script but hand-tuned separately (quick vs full), so a post added to
   the full index alone would give an AI crawler two conflicting answers
   about what the site has published. */
const postCount = (text) => (text.match(/^- \*\*.*— \[(?:English|فارسی)\]/gm) ?? []).length;
assert(
  `llms.txt and llms-full.txt list the same number of posts (${postCount(llms)})`,
  postCount(llms) > 0 && postCount(llms) === postCount(llmsFull),
  `quick=${postCount(llms)} full=${postCount(llmsFull)}`
);
assert(
  "llms.txt and llms-full.txt both carry the canonical locale routes",
  ["/en/", "/fa/", "/en/contact/", "/fa/contact/"].every((frag) =>
    [llms, llmsFull].every((t) => t.includes(`${SITE}${frag}`))
  )
);
assert(
  "llms profiles state the same post total as the sitemap's blog corpus",
  llms.includes(`The site has ${postFiles.length} published articles.`)
);

console.log("\n=================================");
if (fails > 0) {
  console.error(`✗ ${fails} SEO check(s) failed.`);
  process.exit(1);
} else {
  console.log("✓ All SEO & GEO guard assertions passed flawlessly!");
}
