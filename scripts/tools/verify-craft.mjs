/**
 * verify-craft.mjs
 *
 * The CODE & CRAFT contract check — run after `npm run build` (and after
 * `npm run prepare-cpanel` for the .htaccess-dependent checks).
 *
 * Replaces the two stale verify scripts, which asserted markers from
 * registers this rebuild retired (Orbitron/Kufi @font-face, the ticker
 * marquee, .dock-wrap) and one of which imported a module that no longer
 * exists. Everything here asserts something the CURRENT build must be true
 * of, and names the file it read when it is not.
 *
 *   node scripts/tools/verify-craft.mjs
 */
import fs from "node:fs";

let passed = 0;
const failures = [];

function check(name, condition, detail) {
  if (condition) {
    passed += 1;
    console.log(`  ok   ${name}`);
  } else {
    failures.push(detail ? `${name} — ${detail}` : name);
    console.log(`  FAIL ${name}${detail ? ` — ${detail}` : ""}`);
  }
}

const read = (p) => (fs.existsSync(p) ? fs.readFileSync(p, "utf8") : null);
const missing = (p) => `missing ${p}`;

/* ── CSS: one shipped stylesheet ────────────────────────────────────── */

const cssDir = "out/_next/static/css";
const css = fs.existsSync(cssDir)
  ? fs
      .readdirSync(cssDir, { recursive: true })
      .filter((f) => String(f).endsWith(".css"))
      .map((f) => fs.readFileSync(`${cssDir}/${f}`, "utf8"))
      .join("\n")
  : "";

console.log("\n=== TOKENS ===");
check("stylesheet shipped", css.length > 0, missing(cssDir));
for (const hex of ["#272727", "#eff1f3", "#fed766", "#009fb7", "#696773"]) {
  check(`ink ${hex} present`, css.toLowerCase().includes(hex));
}
check("dark is the base (color-scheme:dark)", /color-scheme:\s*dark/i.test(css));
check(
  "light edition re-maps tokens",
  /\[data-theme=[\"]?light/.test(css) || /data-theme=.?light/.test(css)
);
check("role tokens shipped", /--color-accent-fill/.test(css) && /--color-accent-on/.test(css));
check("AA-safe ink roles shipped", /--color-accent-ink/.test(css) && /--color-accent-2-ink/.test(css));
check("muted kept out of the text path", /--color-ink-dim/.test(css));

console.log("\n=== TYPE ===");
check("Space Grotesk face shipped", /font-family:\s*[\"']?Space Grotesk/i.test(css));
check("Inter face shipped", /font-family:\s*[\"']?Inter[\"']?\s*;/.test(css) || /font-family:Inter/.test(css));
check("JetBrains Mono face shipped", /JetBrains Mono/.test(css));
check("Cairo face shipped (fa)", /font-family:\s*[\"']?Cairo/i.test(css));
for (const dead of ["Fraunces", "Archivo", "IBM Plex Mono", "Vazirmatn", "Noto Kufi Arabic"]) {
  check(`retired face gone: ${dead}`, !css.includes(dead));
}
check("font-display:block (no optional race)", !/font-display:\s*optional/.test(css));
check("critical faces inlined as data URIs", /src:url\(data:font\/woff2;base64,/.test(css));
// The Persian face is deliberately network-served (unicode-range gated, so
// /en/ never fetches it) and preloaded into /fa/ documents instead.
check("Persian face not inlined (saves ~40K per EN page)", !/font-family:Cairo[^}]*base64/.test(css));
check("Persian face served as a file", /media\/[\w-]+\.woff2/.test(css));
check("reduced-motion net shipped", /prefers-reduced-motion:\s*reduce/.test(css));

console.log("\n=== CONSOLE (nav) ===");
check("console prompt styled", css.includes(".craft-prompt"));
check("tree + rows styled", css.includes(".craft-tree") && css.includes(".craft-row"));
check("node ring styled", css.includes(".craft-ring"));
check("status rail styled", css.includes(".craft-rail"));
check("mobile/coarse fallbacks", /pointer:\s*coarse/.test(css));

/* ── HTML: the shell on every prerendered page ──────────────────────── */

const HOME = "out/en/index.html";
const FA_HOME = "out/fa/index.html";
const home = read(HOME);
const faHome = read(FA_HOME);

console.log("\n=== SHELL (EN) ===");
check("home prerendered", home !== null, missing(HOME));
if (home) {
  check('register is code-craft', home.includes('data-register="code-craft"'));
  check("theme init defaults to dark", home.includes('"dark"'));
  check("skip link present", home.includes("skip-link"));
  check("console prompt rendered", home.includes("craft-prompt"));
  check("combobox role wired", /role="combobox"/.test(home));
  check("aria-controls points at the list", home.includes("craft-console-list"));
  check("disclosure button rendered", home.includes("craft-menu-btn") && home.includes("aria-expanded"));
  const railLinks = (home.match(/craft-rail-link/g) || []).length;
  check(`status rail carries 8 route links (found ${railLinks})`, railLinks === 8);
  check("active route marked", /aria-current="page"/.test(home));
  check("no legacy printed-edition copy", !home.includes("printed, not built"));
  check("colophon speaks the console register", home.includes("working console"));
  check("legacy dock chrome gone", !home.includes("dock-wrap") && !home.includes("mob-dock"));
  // Fonts are inlined into the STYLESHEET (the config no longer inlines CSS
  // into the HTML), so the data-URI assertion lives in the CSS section above.
  check("no render-blocking font preload", !/<link[^>]+as="font"/.test(home));
}

console.log("\n=== SHELL (FA / RTL) ===");
check("fa home prerendered", faHome !== null, missing(FA_HOME));
if (faHome) {
  check("RTL direction set", /dir="rtl"/.test(faHome));
  check("console rendered in fa", faHome.includes("craft-rail") && faHome.includes("craft-prompt"));
  check("fa theme init defaults to dark", faHome.includes('"dark"'));
  // The network-served Persian face must be preloaded here, or
  // font-display:block would hold Persian text invisible on first paint.
  // Attribute order is not guaranteed, so look ahead rather than in sequence.
  check(
    "fa preloads the Persian face",
    /<link(?=[^>]*as="font")(?=[^>]*\.woff2)[^>]*>/.test(faHome)
  );
}
if (home) {
  check("en does NOT preload the Persian face", !/\.woff2/.test(home.slice(0, home.indexOf("</head>"))));
}

/* ── Route 06: the graphics lab ─────────────────────────────────────── */

console.log("\n=== GRAPHICS LAB ===");
const labEn = read("out/en/lab/index.html");
const labFa = read("out/fa/lab/index.html");
check("en lab prerendered", labEn !== null, missing("out/en/lab/index.html"));
check("fa lab prerendered", labFa !== null, missing("out/fa/lab/index.html"));
if (labEn) {
  const plates = (labEn.match(/lab-plate/g) || []).length;
  check(`lab ships its plates (found ${plates})`, plates >= 4, "expected >= 4");
  // NB: the RSC flight payload duplicates the rendered tree, so a class
  // appears roughly twice per element in the document — assert >= for any
  // count taken from raw HTML.
  const swatches = (labEn.match(/lab-swatch-chip/g) || []).length;
  check(`palette shows 5 inks (found ${swatches})`, swatches >= 5, "expected >= 5");
  check("lab hero uses the shared voice", labEn.includes("page-hero-title"));
  check("lab carries a route hero ordinal", labEn.includes("06"));
}
if (labFa) {
  check("fa lab hero rendered", labFa.includes("page-hero-title"));
}

/* ── Sitemap / hreflang ─────────────────────────────────────────────── */

console.log("\n=== SITEMAP & HREFLANG ===");
const sitemap = read("out/sitemap.xml");
check("sitemap written", sitemap !== null, missing("out/sitemap.xml"));
if (sitemap) {
  check("sitemap lists /en/lab/", sitemap.includes("/en/lab/"));
  check("sitemap lists /fa/lab/", sitemap.includes("/fa/lab/"));
  check("sitemap cross-links hreflang", sitemap.includes('hreflang="fa"') && sitemap.includes('hreflang="en"'));
}
if (labEn) {
  // Next serializes these as hrefLang="…" (camelCase). HTML attribute names
  // are case-insensitive and crawlers read them as hreflang, so match on a
  // case-insensitive pattern rather than the lowercase spelling.
  const hasAlternates =
    /hreflang="en"/i.test(labEn) && /hreflang="fa"/i.test(labEn);
  check("lab page declares en+fa alternates", hasAlternates);
  check("lab page declares a canonical", /rel="canonical"/.test(labEn));
  check("canonical points at the locale-prefixed lab url", labEn.includes("/en/lab/"));
}

/* ── GEO / feeds ────────────────────────────────────────────────────── */

console.log("\n=== GEO ===");
// llms.txt is AUTHORED in public/ and copied into out/ by the build, so the
// authored source is the thing that must be correct (out/ is a snapshot).
const llms = read("public/llms.txt") ?? read("out/llms.txt");
check("llms.txt present", llms !== null, missing("public/llms.txt"));
if (llms) {
  check("llms.txt lists the lab route", llms.includes("/en/lab/"));
  check("llms.txt lists contact", llms.includes("/en/contact/"));
  check("llms.txt explains the locale scheme", llms.includes("hreflang"));
}
const robots = read("out/robots.txt");
check("robots.txt present", robots !== null, missing("out/robots.txt"));
if (robots) {
  check("robots keeps everything crawlable", /Allow:\s*\//.test(robots));
  check("robots references llms.txt", robots.includes("llms.txt"));
}
check("en feed written", read("out/feed.xml") !== null, missing("out/feed.xml"));
check("fa feed written", read("out/fa/feed.xml") !== null, missing("out/fa/feed.xml"));
check("llms-full present", (read("public/llms-full.txt") ?? "").length > 0);

/* ── PWA manifest ───────────────────────────────────────────────────── */

console.log("\n=== MANIFEST ===");
const manifest = read("out/manifest.json");
check("manifest written", manifest !== null, missing("out/manifest.json"));
if (manifest) {
  check("manifest theme is charcoal", manifest.includes("#272727"));
  check("no paper theme left", !manifest.includes("#f3efe7"));
}

/* ── Census ─────────────────────────────────────────────────────────── */

console.log("\n=== ROUTE CENSUS ===");
for (const route of ["", "work", "skills", "education", "showcase", "lab", "blog", "contact"]) {
  const p = route ? `out/en/${route}/index.html` : "out/en/index.html";
  check(`prerendered /en/${route || ""}`, fs.existsSync(p), missing(p));
}

/* ── Report ─────────────────────────────────────────────────────────── */

const total = passed + failures.length;
console.log(`\n${passed}/${total} craft assertions passed.`);
if (failures.length > 0) {
  console.error(`\n${failures.length} FAILED:`);
  for (const f of failures) console.error(`  - ${f}`);
  process.exit(1);
}
console.log("Code & Craft contract OK.");

