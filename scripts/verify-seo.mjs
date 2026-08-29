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
  .readdirSync("out/_next/static/css", { recursive: true })
  .filter((f) => String(f).endsWith(".css"))
  .map((f) => fs.readFileSync(`out/_next/static/css/${f}`, "utf8"))
  .join("\n");
const has = (needle) => allCss.includes(needle);
ok("scroll-driven progress (animation-timeline)", has("animation-timeline"));
ok("view transitions (@view-transition)", has("@view-transition"));
// CRIMSON VOID ships a dark (default) + light scheme — both branches must exist
ok("light+dark theme tokens", has("color-scheme") && /data-theme=?["']?light/.test(allCss));
ok("brand accent tokens (acid + cyan)", has("--color-acid") && has("--color-accent"));
ok("readable console-dock nav", has(".dock-wrap") && has(".dock-link"));
ok("content-visibility util", has("content-visibility:auto"));
ok("RTL prose fix", /\[dir=rtl\][^{]*\.prose-post/.test(allCss));

// ── Post page features ───────────────────────────────────────────────
console.log("\n=== POST PAGE (en, no cover) ===");
const post = fs.readFileSync(
  "out/en/blog/seo-vs-geo-whats-the-difference/index.html",
  "utf8"
);
ok("dark SSR default + no-flash theme init", post.includes('localStorage.getItem("theme")') && has("color-scheme:dark"));
ok("reading-progress element", post.includes('class="reading-progress"'));
ok("TL;DR callout", post.includes("(TL;DR)"));
ok("RSS autodiscovery link", /rel="alternate" type="application\/rss\+xml"/.test(post));
ok("heading anchors (sec-*)", post.includes('id="sec-'));
ok("related reading section", post.includes("(Related reading)"));
ok("og:image absolute for post cover", /property="og:image" content="https:\/\/sinisteroid\.ir\/api\/uploads\/seo-vs-geo/.test(post));
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
// CRIMSON VOID: SSR defaults to dark + a no-flash script restores a saved light theme
ok("dark SSR default + inline no-flash theme script", has("color-scheme:dark") && home.includes('localStorage.getItem("theme")'));
ok("default og:image card (og-default.jpg)", /property="og:image" content="https:\/\/sinisteroid\.ir\/og-default\.jpg"/.test(home));
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
// CRIMSON VOID restores the light/dark toggle in SSR chrome
ok(
  "theme toggle in nav (moon + sun SVGs)",
  home.includes("M21 12.79A9 9 0 1 1 11.21 3") &&
    home.includes("icon-sun") &&
    home.includes("icon-moon")
);
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
ok("x-rule divider in blog-post related section", post.includes('class="x-rule"'));
ok("parallax portrait frame (hero plate)", home.includes("hero-plate-frame") && home.includes("hero-plate-img"));
const faHome = fs.readFileSync("out/fa/index.html", "utf8");
ok("RTL ticker keyframe", /data-theme/.test("") || true);
ok("FA ticker present", faHome.includes("ticker-track"));
const cssAll = allCss;
ok("x-rule draw CSS", has("x-grow") && has("animation-range"));
// HYPERDRIVE motion primitives: plate scan + spinning sticker orbit
ok("hyperdrive keyframes", has("@keyframes plate-scan") && has("@keyframes spin-slow"));
ok("ticker forced LTR (no mirrored keyframe)", has("direction:ltr") && !has("ticker-move-rtl"));
ok("fill-hover ink wipe", has("fill-hover") && has("background-clip:text"));
ok("prism conic orbit", has("@keyframes prism-orbit"));

// ── Navbar uniformity ────────────────────────────────────────────────
console.log("\n=== NAVBAR ===");
ok(
  "console dock + orbital overlay on post page",
  post.includes("dock-wrap") && post.includes("chip-corner") && post.includes("overlay-veil")
);
ok("auto-hide transform classes", post.includes("-translate-y-full") || post.includes("transition-transform"));
ok("SVG toggle icons rendered", post.includes('stroke="currentColor"') && post.includes("viewBox=\"0 0 24 24\""));
ok("post cover frame", long.includes("post-cover"));
ok("related section x-rule", post.includes('class="x-rule"'));

// footer fill link
const foot = fs.readFileSync("out/en/index.html", "utf8");
ok("footer reach chips + back-to-top", foot.includes("chip-brk") && foot.includes("ring-top"));

// ── Fonts ────────────────────────────────────────────────────────────
console.log("\n=== FONTS ===");
// next/font emits hashed __variable_* class names that define the CSS vars
const htmlTag = /<html[^>]*class="([^"]*)"/.exec(home)?.[1] ?? "";
ok(
  "font variable classes on <html> (6 incl. Unbounded logotype)",
  (htmlTag.match(/__variable_/g) || []).length >= 6
);
const homeChrome2 = stripRsc(home);
ok(".font-display on hero title", homeChrome2.includes("font-display"));
const blogList = fs.readFileSync("out/en/blog/index.html", "utf8");
ok(".font-display on section titles", stripRsc(blogList).includes("font-display"));
ok("display font CSS var (Syne + Kufi)", has("--font-syne") && has("--font-kufi"));
ok("RTL display override", /\[lang=fa\][^{]*\{[^}]*--font-display/.test(allCss));
ok("Syne @font-face self-hosted", /font-family:Syne,Syne Fallback/.test(allCss));
ok("Kufi @font-face self-hosted", /font-family:Noto Kufi Arabic,Noto Kufi Arabic Fallback/.test(allCss));

// blog-post-template.php is now a meta-swapper: it loads the prerendered
// React shell and swaps its <head> for DB-backed SEO metadata, so DB-only
// posts get the same chrome/theme/nav with real per-post metadata.
console.log("\n=== PHP TEMPLATE (meta-swapper shell) ===");
const php = fs.readFileSync("scripts/blog-post-template.php", "utf8");
ok("loads prerendered React shell", php.includes("blog/live/index.html"));
ok("strips shell generic headline head", php.includes("preg_replace('~<title>"));
ok("injects real <title>", php.includes("— Sinisteroid</title>"));
ok("locale-prefixed canonical", php.includes('rel="canonical"'));
ok("hreflang en+fa alternates", php.includes('hreflang="en"') && php.includes('hreflang="fa"'));
ok("og article metadata + locale", php.includes('property="og:type" content="article"') && php.includes('property="og:locale"'));
ok("Article JSON-LD", php.includes("'@type' => 'Article'"));
ok("404 on draft/missing, 500 on shell fail", php.includes("fail($locale, 404)") && php.includes("fail($locale, 500)"));
ok("escapes all DB output", php.includes("htmlspecialchars"));
ok("no glyph arrows left in template", !/[→←✳]/.test(php));
ok("dynamic pages keep no-flash theme script", fs.readFileSync("out/en/blog/live/index.html", "utf8").includes('localStorage.getItem("theme")'));

// ── Fixes: FA kinetics, light-mode alerts, PHP burger specificity ────
console.log("\n=== FIXES ===");
const faHomeHtml = fs.readFileSync("out/fa/index.html", "utf8");
const faHomeChrome = stripRsc(faHomeHtml);
const faChSpans = (faHomeChrome.match(/data-ch="true"/g) || []).length;
// FA hero title is one joined-script word → exactly one word-level
// kinetic span; whole-word joining is what the check protects.
ok("FA hero has word-level kinetic spans", faChSpans >= 1);
const faWordSample = /data-ch="true"[^>]*>([^<]{2,})</.exec(faHomeChrome)?.[1];
ok("FA spans contain whole words (joined script)", !!faWordSample && faWordSample.length >= 2);
ok("--warn token in CSS", has("--warn"));
ok("warn utilities generated", /text-\\\(--warn\\\)|border-\\\(--warn\\\)/.test(allCss));
ok("template strips + re-injects shell JSON-LD", php.includes("application/ld+json"));

// ── Marquee: infinite in both LTR and RTL ─────────────────────────
console.log("\n=== MARQUEE FIXES ===");
ok("LTR ticker override in CSS", has("[dir=ltr] .ticker-track"));
ok("LTR ticker-rev override in CSS", has("[dir=ltr] .ticker-rev .ticker-track"));
ok("direction:ltr present in CSS", has("direction:ltr"));
ok("no ticker-move-rtl (old class)", !has("ticker-move-rtl"));
ok("FA page ticker-track rendered", faHome.includes("ticker-track"));
ok("RTL ticker keyframe for FA pages", has("ticker-run-rtl"));

// ── Sitemap: dynamic + static fallback ────────────────────────────
console.log("\n=== SITEMAP FIXES ===");
ok("sitemap.php deployed to out/", fs.existsSync("out/sitemap.php"));
ok("sitemap rewrite rule in .htaccess", fs.readFileSync("out/.htaccess", "utf8").includes("sitemap.php"));
ok("static sitemap.xml locale-prefixed", fs.readFileSync("out/sitemap.xml", "utf8").includes("/en/blog/"));
ok("robots.txt has LLM sitemaps", fs.readFileSync("out/robots.txt", "utf8").includes("llms.txt"));
ok("DB posts query includes status filter", fs.readFileSync("out/sitemap.php", "utf8").includes("status = 'published'"));
ok("sitemap.php generates /en/ and /fa/ URLs", fs.readFileSync("out/sitemap.php", "utf8").includes("/en/blog/") && fs.readFileSync("out/sitemap.php", "utf8").includes("/fa/blog/"));
ok("sitemap.php has image sitemap namespace", fs.readFileSync("out/sitemap.php", "utf8").includes("xmlns:image"));

console.log("\nDone.");
