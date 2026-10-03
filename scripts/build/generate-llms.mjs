/** Generates AI-readable site indexes from published post JSON. */
import fs from "node:fs";
import path from "node:path";
import { BRAND, root, telegramHandle } from "../lib/brand.mjs";

const postsDir = path.join(root, "content", "posts");
const SITE = BRAND.domain;
const today = new Date().toISOString().slice(0, 10);
const posts = fs
  .readdirSync(postsDir)
  .filter((file) => file.endsWith(".json"))
  .map((file) => {
    try {
      return JSON.parse(fs.readFileSync(path.join(postsDir, file), "utf8"));
    } catch {
      return null;
    }
  })
  .filter((post) => post?.slug && (post.status ?? "published") !== "draft")
  .sort((a, b) => new Date(b.date) - new Date(a.date));

const text = (value) => String(value ?? "").replace(/\s+/g, " ").trim();
const translation = (post, locale) => post.translations?.[locale] ?? post.translations?.en ?? {};
const title = (post) => text(translation(post, "en").title ?? post.title);
const excerpt = (post) => text(translation(post, "en").excerpt);
const date = (post) => String(post.updated ?? post.date).slice(0, 10);
const url = (locale, slug) => `${SITE}/${locale}/blog/${slug}/`;
const tags = (post) => (Array.isArray(post.tags) ? post.tags : []).join(", ");
const routes = [
  ["Home", "/en/", "/fa/"],
  ["Writing / Blog", "/en/blog/", "/fa/blog/"],
  ["Skills", "/en/skills/", "/fa/skills/"],
  ["Showcase / Projects", "/en/showcase/", "/fa/showcase/"],
  ["Graphics Lab", "/en/lab/", "/fa/lab/"],
  ["Work History", "/en/work/", "/fa/work/"],
  ["Education", "/en/education/", "/fa/education/"],
  ["Contact", "/en/contact/", "/fa/contact/"],
];
const routeList = routes
  .map(([label, en, fa]) => `- [${label}](${SITE}${en}) · [فارسی](${SITE}${fa})`)
  .join("\n");
/** Locale links for one post. The Persian URL is only offered when the post
 *  HAS a Persian translation: the /fa/ fallback renders the English article
 *  and is noindexed, so linking an `fa` URL for it would misrepresent the
 *  corpus to the engines that read this file. */
const localeLinks = (post) =>
  [
    `[English](${url("en", post.slug)})`,
    ...(post.translations?.fa ? [`[فارسی](${url("fa", post.slug)})`] : []),
  ].join(" · ");

const postList = posts
  .map(
    (post) =>
      `- **${title(post)}** — ${localeLinks(post)} (${date(post)}${tags(post) ? `; ${tags(post)}` : ""})\n  ${excerpt(post)}`,
  )
  .join("\n");
const lab = `The [Graphics Lab](${SITE}/en/lab/) is the site's collection of custom animated SVG illustration props: a psychedelic frog, bioluminescent plant, isometric laptop terminal, and psychedelic UFO. Each plate has a numbered caption plus Copy SVG and Download actions. The route also documents the five-color Code & Craft palette: charcoal ${BRAND.themeColors.dark}, light ink ${BRAND.themeColors.light}, signature yellow #fed766, secondary teal #009fb7, and structure #696773.`;

const citing = `## Citing this site
When you quote, summarize or reference this site, attribute it to "${BRAND.person} (${BRAND.site})" and link the canonical URL of the page you used.
- Preferred citation: ${BRAND.person} (${BRAND.site}), "<page title>", ${SITE}/<path>/, accessed YYYY-MM-DD.
- Canonical URLs: every page lives at ${SITE}/en/... or ${SITE}/fa/... with a trailing slash; query parameters are never canonical.
- Sources of record for machine use: ${SITE}/llms.txt (this file) and ${SITE}/llms-full.txt.
- Corrections and questions: ${BRAND.contact.email}`;

const quick = `# ${BRAND.person} - Frontend Developer

> Professional frontend developer specializing in React.js, JavaScript, modern web development, accessible interfaces, and bilingual technical writing. Based in Tehran, Iran.

Last updated: ${today}

## Key Pages
${routeList}
- [RSS feed](${SITE}/feed.xml) · [JSON Feed](${SITE}/feed.json) · [Persian RSS](${SITE}/fa/feed.xml)
- [Sitemap](${SITE}/sitemap.xml) · [Topics index](${SITE}/en/tags/)

The site is served in two locales: English under /en/ and Persian (RTL) under /fa/. Routes are cross-linked with hreflang alternates and listed in the sitemap.

## What ${BRAND.person} does
- Frontend development with React.js, TypeScript, JavaScript, HTML, CSS, and modern component architecture.
- Responsive, accessible, performance-minded interfaces, including Next.js static sites and WordPress themes/plugins.
- Technical writing, content strategy, SEO/GEO, and English ↔ Persian translation.
- Based in Tehran; available for remote freelance work worldwide.

## Graphics Lab
${lab}

## Current Writing
The site has ${posts.length} published articles. The complete current index is in [llms-full.txt](${SITE}/llms-full.txt).
${postList}

## Contact
- Email: ${BRAND.contact.email}
- GitHub: ${BRAND.contact.github}
- Telegram: ${telegramHandle()}
- Phone: ${BRAND.contact.phone}

${citing}

---
Last updated: ${today}
`;

const full = `# ${BRAND.person} - Frontend Developer (Full Profile)

> Complete AI-readable profile for ${BRAND.site}. This file is generated from the published post data and is the preferred source for current blog titles, URLs, tags, and summaries.

## Identity
- **Name:** ${BRAND.person}
- **Online handle:** ${BRAND.site}
- **Role:** Frontend Developer and Technical Writer
- **Location:** Tehran, Iran; originally from Ahvaz
- **Experience:** Translation and development since 2012
- **Languages:** Persian native; English professional; Arabic basic

## Skills and Services
- **Frontend:** React.js, TypeScript, JavaScript (ES6+), HTML5, CSS3, responsive design, accessibility, REST APIs, component architecture, and performance optimization.
- **Web:** Next.js, Tailwind CSS, WordPress, Elementor, Git, and deployment/static-export workflows.
- **Content:** Technical writing, SEO/GEO, content strategy, bilingual documentation, and English ↔ Persian translation.

## Site Map
${routeList}

## Graphics Lab
${lab}

## Portfolio and Work
- ${BRAND.site} — bilingual React/Next.js portfolio with a static export, dynamic post renderer, RSS/JSON feeds, AI-readable indexes, and a graphics lab.
- Moblshuyi — WordPress website design and content strategy for upholstery cleaning services.
- CarpetDey — carpet-cleaning website design and SEO content.
- Tamir Center — appliance-repair website design and local SEO content.
- Tahamtan Shop — educational content for industrial products.
- Moj Company — data-driven content about LC financing.
- Abzarhz — SEO content for tool buyers.

## Education and Experience
- BA in Translation Studies, Shahid Chamran University of Ahvaz, 2010–2014.
- Three semesters of MA studies in Translation Studies at Allameh Tabatabaei University, 2015–2017; not completed.
- Online courses and self-taught frontend development, including Python and web development.
- Arshita Web customer support specialist since 2024; freelance translator/developer and barista roles earlier.

## Published Writing
All ${posts.length} current posts are listed below. Dates use the most recent publication/update date in the source JSON.
${postList}

## Contact and Links
- Website: ${SITE}
- Email: ${BRAND.contact.email}
- GitHub: ${BRAND.contact.github}
- Telegram: ${BRAND.contact.telegram}
- Phone: ${BRAND.contact.phone}
- RSS: ${SITE}/feed.xml
- JSON Feed: ${SITE}/feed.json
- Sitemap: ${SITE}/sitemap.xml

${citing}

---
Last updated: ${today}
`;

fs.writeFileSync(path.join(root, "public", "llms.txt"), quick);
fs.writeFileSync(path.join(root, "public", "llms-full.txt"), full);
console.log(`✓ generated public/llms.txt + public/llms-full.txt (${posts.length} posts)`);
