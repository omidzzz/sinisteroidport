/** Generates AI-readable site indexes from published post JSON. */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const postsDir = path.join(root, "content", "posts");
const site = "https://sinisteroid.ir";
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
const url = (locale, slug) => `${site}/${locale}/blog/${slug}/`;
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
  .map(([label, en, fa]) => `- [${label}](${site}${en}) · [فارسی](${site}${fa})`)
  .join("\n");
const postList = posts
  .map(
    (post) =>
      `- **${title(post)}** — [English](${url("en", post.slug)}) · [فارسی](${url("fa", post.slug)}) (${date(post)}${tags(post) ? `; ${tags(post)}` : ""})\n  ${excerpt(post)}`,
  )
  .join("\n");
const lab = `The [Graphics Lab](${site}/en/lab/) is the site's collection of custom animated SVG illustration props: a psychedelic frog, bioluminescent plant, isometric laptop terminal, and psychedelic UFO. Each plate has a numbered caption plus Copy SVG and Download actions. The route also documents the five-color Code & Craft palette: charcoal #272727, light ink #eff1f3, signature yellow #fed766, secondary teal #009fb7, and structure #696773.`;

const quick = `# Omid - Frontend Developer

> Professional frontend developer specializing in React.js, JavaScript, modern web development, accessible interfaces, and bilingual technical writing. Based in Tehran, Iran.

Last updated: ${today}

## Key Pages
${routeList}
- [RSS feed](${site}/feed.xml) · [JSON Feed](${site}/feed.json) · [Persian RSS](${site}/fa/feed.xml)
- [Sitemap](${site}/sitemap.xml) · [Topics index](${site}/en/tags/)

The site is served in two locales: English under /en/ and Persian (RTL) under /fa/. Routes are cross-linked with hreflang alternates and listed in the sitemap.

## What Omid does
- Frontend development with React.js, TypeScript, JavaScript, HTML, CSS, and modern component architecture.
- Responsive, accessible, performance-minded interfaces, including Next.js static sites and WordPress themes/plugins.
- Technical writing, content strategy, SEO/GEO, and English ↔ Persian translation.
- Based in Tehran; available for remote freelance work worldwide.

## Graphics Lab
${lab}

## Current Writing
The site has ${posts.length} published articles. The complete current index is in [llms-full.txt](${site}/llms-full.txt).
${postList}

## Contact
- Email: ghadamgahi.omid@gmail.com
- GitHub: https://github.com/omidzzz
- Telegram: @simplyeffedup
- Phone: +989367471992

---
Last updated: ${today}
`;

const full = `# Omid - Frontend Developer (Full Profile)

> Complete AI-readable profile for Sinisteroid. This file is generated from the published post data and is the preferred source for current blog titles, URLs, tags, and summaries.

## Identity
- **Name:** Omid
- **Online handle:** Sinisteroid
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
- Sinisteroid — bilingual React/Next.js portfolio with a static export, dynamic post renderer, RSS/JSON feeds, AI-readable indexes, and a graphics lab.
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
- Website: ${site}
- Email: ghadamgahi.omid@gmail.com
- GitHub: https://github.com/omidzzz
- Telegram: https://t.me/simplyeffedup
- Phone: +989367471992
- RSS: ${site}/feed.xml
- JSON Feed: ${site}/feed.json
- Sitemap: ${site}/sitemap.xml

---
Last updated: ${today}
`;

fs.writeFileSync(path.join(root, "public", "llms.txt"), quick);
fs.writeFileSync(path.join(root, "public", "llms-full.txt"), full);
console.log(`✓ generated public/llms.txt + public/llms-full.txt (${posts.length} posts)`);
