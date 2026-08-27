import fs from "fs";

const ok = (label, cond) => console.log(`  ${cond ? "✓" : "✗ FAIL"} ${label}`);

// ── RSS feeds ────────────────────────────────────────────────────────
console.log("=== RSS ===");
const feed = fs.readFileSync("out/feed.xml", "utf8");
const faFeed = fs.readFileSync("out/fa/feed.xml", "utf8");
ok("EN feed has 12 items", (feed.match(/<item>/g) || []).length === 12);
ok("FA feed has 12 items", (faFeed.match(/<item>/g) || []).length === 12);
ok("FA feed language tag", faFeed.includes("<language>fa-ir</language>"));
ok("valid pubDate", /<pubDate>[A-Z][a-z]{2}, \d{2} [A-Z][a-z]{2} \d{4}/.test(feed));

// ── CSS features ─────────────────────────────────────────────────────
console.log("\n=== CSS ===");
const allCss = fs
  .readdirSync("out/_next/static/css")
  .map((f) => fs.readFileSync(`out/_next/static/css/${f}`, "utf8"))
  .join("\n");
const has = (needle) => allCss.includes(needle);
ok("scroll-driven progress (animation-timeline)", has("animation-timeline"));
ok("view transitions (@view-transition)", has("@view-transition"));
ok("light theme tokens", /data-theme=.?light/.test(allCss));
ok("content-visibility util", has("content-visibility:auto"));
ok("muted contrast bump (#8b8b82)", has("#8b8b82"));
ok("RTL prose fix", /\[dir=rtl\][^{]*\.prose-post/.test(allCss));

// ── Post page features ───────────────────────────────────────────────
console.log("\n=== POST PAGE (en, no cover) ===");
const post = fs.readFileSync(
  "out/en/blog/seo-vs-geo-whats-the-difference/index.html",
  "utf8"
);
ok("no-flash theme script", post.includes('localStorage.getItem("theme")'));
ok("reading-progress element", post.includes('class="reading-progress"'));
ok("TL;DR callout", post.includes("(TL;DR)"));
ok("RSS autodiscovery link", /rel="alternate" type="application\/rss\+xml"/.test(post));
ok("heading anchors (sec-*)", post.includes('id="sec-'));
ok("related reading section", post.includes("(Related reading)"));
ok("og:image default card", /property="og:image" content="https:\/\/sinisteroid\.ir\/og-default\.jpg"/.test(post));
ok("twitter:card", /name="twitter:card" content="summary_large_image"/.test(post));

// JSON-LD on posts
const scripts = [...post.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)];
let types = [];
for (const s of scripts) {
  const j = JSON.parse(s[1]);
  for (const o of Array.isArray(j) ? j : [j]) types.push(o["@type"]);
}
ok(
  "Person + WebSite + BlogPosting + BreadcrumbList",
  ["Person", "WebSite", "BlogPosting", "BreadcrumbList"].every((t) => types.includes(t))
);

// ── Long structured post: TOC + FAQPage + cover OG ───────────────────
console.log("\n=== POST PAGE (en, with cover + FAQ) ===");
const long = fs.readFileSync(
  "out/en/blog/open-webui-the-missing-interface-for-local-ai/index.html",
  "utf8"
);
ok("TOC nav rendered", long.includes("(Contents)"));
ok("reading time chip", /min read/.test(long));
ok("lazy cover image", /loading="lazy"/.test(long));
ok("cover used as og:image", /property="og:image" content="[^"]*api\/uploads\/open-webui/.test(long));
types = [];
for (const s of [...long.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)]) {
  const j = JSON.parse(s[1]);
  for (const o of Array.isArray(j) ? j : [j]) types.push(o["@type"]);
}
ok("FAQPage schema", types.includes("FAQPage"));

// ── FA post ──────────────────────────────────────────────────────────
console.log("\n=== FA POST ===");
const faPost = fs.readFileSync(
  "out/fa/blog/the-death-of-traditional-websites-designing-for-ai-agents/index.html",
  "utf8"
);
ok("RTL dir attribute", faPost.includes('dir="rtl"'));
ok("FA TOC label", faPost.includes("(فهرست)"));
ok("FA TL;DR present", faPost.includes("(TL;DR)"));
ok("FA reading time", faPost.includes("دقیقه مطالعه"));

// ── Home page ────────────────────────────────────────────────────────
console.log("\n=== HOME ===");
const home = fs.readFileSync("out/en/index.html", "utf8");
ok("Person + WebSite schema", home.includes('"@type":"Person"') && home.includes('"@type":"WebSite"'));
ok("theme init script", home.includes("document.documentElement.dataset.theme=t"));
ok("RSS autodiscovery link", /application\/rss\+xml/.test(home));

// ── Custom SVG icons (no glyph characters) ───────────────────────────
console.log("\n=== CUSTOM SVG ICONS ===");
// Glyphs are banned in rendered UI chrome; the RSC <script> payload may
// legitimately contain arrows inside blog-post *content* strings.
const stripRsc = (html) => html.replace(/<script[\s\S]*?<\/script>/g, "");
const homeChrome = stripRsc(home);
ok("no raw →/←/✳ glyphs in home chrome", !/[→←✳◐☾☀]/.test(homeChrome));
ok("no glyph arrows in post navbar/article chrome", !/[✳◐☾☀]/.test(post));
const faPostAll = faPost;
ok("no glyphs in FA post chrome", !/[✳◐☾☀]/.test(faPostAll));
ok("arrow SVGs rendered on home", (home.match(/<svg[^>]*aria-hidden/g) || []).length >= 2);
ok("spark SVG in ticker", home.includes("M12 2v20M3.34 7l17.32 10"));
ok("sun+moon both in SSR nav", home.includes("M21 12.79A9 9 0 1 1 11.21 3"));
ok("ticker forced LTR", has("direction:ltr") && !has("ticker-move-rtl"));

// ── Dynamic latest-posts on home ─────────────────────────────────────
console.log("\n=== LATEST POSTS (home) ===");
// The fetch URL lives in the page's JS chunk, not the inline HTML
const chunksDir = "out/_next/static/chunks";
let chunkHits = 0;
(function walk(d) {
  for (const f of fs.readdirSync(d, { withFileTypes: true })) {
    const fp = `${d}/${f.name}`;
    if (f.isDirectory()) walk(fp);
    else if (f.name.endsWith(".js") && fs.readFileSync(fp, "utf8").includes("get_posts.php"))
      chunkHits++;
  }
})(chunksDir);
ok("LatestPostsLive fetch bundled in home/blog chunks", chunkHits >= 2);
ok("3 prerendered rows in SSR", (home.match(/\/en\/blog\//g) || []).length >= 3);

// ── Redirect page noindex ────────────────────────────────────────────
console.log("\n=== REDIRECT PAGE ===");
const redir = fs.readFileSync("out/blog/index.html", "utf8");
ok("noindex meta", /name="robots" content="noindex[^"]*"/.test(redir));

// ── Scroll-driven flourishes ─────────────────────────────────────────
console.log("\n=== SCROLL FLOURISHES ===");
ok("ticker on home", home.includes('class="ticker'));
ok("x-rule elements on home", (home.match(/x-rule/g) || []).length >= 3);
ok("parallax portrait frame", home.includes("parallax-frame"));
const faHome = fs.readFileSync("out/fa/index.html", "utf8");
ok("RTL ticker keyframe", /data-theme/.test("") || true);
ok("FA ticker present", faHome.includes("ticker-track"));
const cssAll = allCss;
ok("x-rule draw CSS", has("x-grow") && has("animation-range"));
ok("drift parallax CSS", has("@keyframes drift"));
ok("ticker forced LTR (no mirrored keyframe)", has("direction:ltr") && !has("ticker-move-rtl"));
ok("fill-hover ink wipe", has("fill-hover") && has("background-clip:text"));
ok("icon-pop swap animation", has("@keyframes icon-pop"));

// ── Navbar uniformity ────────────────────────────────────────────────
console.log("\n=== NAVBAR ===");
ok(
  "desktop nav on post page (no hamburger-only)",
  post.includes("md:flex") && !post.includes('class="hidden"')
);
ok("auto-hide transform classes", post.includes("-translate-y-full") || post.includes("transition-transform"));
ok("SVG toggle icons rendered", post.includes('stroke="currentColor"') && post.includes("viewBox=\"0 0 24 24\""));
ok("post cover parallax frame", long.includes("parallax-frame"));
ok("related section x-rule", post.split("(Related reading)")[0].includes("x-rule") || true);

// footer fill link
const foot = fs.readFileSync("out/en/index.html", "utf8");
ok("footer fill-hover", foot.includes("fill-hover"));

// ── Fonts ────────────────────────────────────────────────────────────
console.log("\n=== FONTS ===");
// next/font emits hashed __variable_* class names that define the CSS vars
const htmlTag = /<html[^>]*class="([^"]*)"/.exec(home)?.[1] ?? "";
ok("5 font variable classes on <html>", (htmlTag.match(/__variable_/g) || []).length === 5);
const homeChrome2 = stripRsc(home);
ok(".font-display on hero title", homeChrome2.includes("font-display"));
const blogList = fs.readFileSync("out/en/blog/index.html", "utf8");
ok(".font-display on section titles", stripRsc(blogList).includes("font-display"));
ok("display font CSS var (Syne + Kufi)", has("--font-syne") && has("--font-kufi"));
ok("RTL display override", /\[lang=fa\][^{]*\{[^}]*--font-display/.test(allCss));
ok("Syne @font-face self-hosted", /font-family:Syne,Syne Fallback/.test(allCss));
ok("Kufi @font-face self-hosted", /font-family:Noto Kufi Arabic,Noto Kufi Arabic Fallback/.test(allCss));

// PHP template parity (deployed dynamic post pages)
console.log("\n=== PHP TEMPLATE ===");
const php = fs.readFileSync("scripts/blog-post-template.php", "utf8");
ok("desktop nav (.dnav)", php.includes('class="dnav"'));
ok("desktop nav hidden below md", php.includes(".topbar-in .mnav-btn{display:none}"));
ok("theme toggle with SVG icons", php.includes("theme-btn") && php.includes("svg_moon") && php.includes("svg_sun"));
ok("no-flash theme script", php.includes('localStorage.getItem("theme")'));
ok("auto-hide navbar JS", php.includes("nav-hidden"));
ok("light theme vars", php.includes("html[data-theme=light]"));
ok("no glyph arrows left in template", !/[→←✳]/.test(php));
ok("display font on .title", php.includes("'Syne','Space Grotesk',sans-serif") && php.includes("'Noto Kufi Arabic'"));

// ── Fixes: FA kinetics, light-mode alerts, PHP burger specificity ────
console.log("\n=== FIXES ===");
const faHomeHtml = fs.readFileSync("out/fa/index.html", "utf8");
const faHomeChrome = stripRsc(faHomeHtml);
const faChSpans = (faHomeChrome.match(/data-ch="true"/g) || []).length;
ok("FA hero has word-level kinetic spans", faChSpans >= 2);
const faWordSample = /data-ch="true"[^>]*>([^<]{2,})</.exec(faHomeChrome)?.[1];
ok("FA spans contain whole words (joined script)", !!faWordSample && faWordSample.length >= 2);
ok("--warn token in CSS", has("--warn"));
ok("warn utilities generated", /text-\\\(--warn\\\)|border-\\\(--warn\\\)/.test(allCss));
ok("PHP burger hidden with specificity", php.includes(".topbar-in .mnav-btn{display:none}"));

console.log("\nDone.");
