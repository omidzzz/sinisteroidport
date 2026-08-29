import fs from "node:fs";
import path from "node:path";

const results = [];
const check = (name, cond) =>
  results.push(`${cond ? "PASS" : "FAIL"}  ${name}`);

// 1. llms.txt contains proper markdown links (Agentic Browsing fix)
const llms = fs.readFileSync("out/llms.txt", "utf8");
check("llms.txt has H1", /^# /.test(llms));
check("llms.txt has markdown links", /\[[^\]]+\]\(https?:\/\/[^)]+\)/.test(llms));

// 2. Home page: service module titles are h2 (heading-order fix)
const home = fs.readFileSync("out/en/index.html", "utf8");
const modTitle = home.match(/mod-title text-\[clamp\(1\.05rem,2vw,1\.45rem\)\]/g);
check("home uses mod-title headings", !!modTitle && modTitle.length >= 4);
// SSR HTML renders tags directly (<h2 class="mod-title…">)
const h2 = home.match(/<h2[^>]*class="mod-title[^\n]{0,60}/g);
const h3 = home.match(/<h3[^>]*class="mod-title[^\n]{0,60}/g);
check("module titles render as <h2>", !!h2 && h2.length >= 4);
check("module titles are no longer <h3>", !h3);

// 3. Footer has solid bg (contrast fix)
check(
  "footer gets solid bg-bg",
  home.includes('overflow-hidden border-t border-line bg-bg"')
);

// 4. Chip corner now uses solid var(--color-bg)
const cssGlob = fs
  .readdirSync("out/_next/static/css", { withFileTypes: true })
  .filter((d) => d.isFile())
  .map((d) => fs.readFileSync(path.join("out/_next/static/css", d.name), "utf8"))
  .join("\n");
const chipIdx = cssGlob.indexOf(".chip-corner{");
check("chip-corner rule present", chipIdx >= 0);
if (chipIdx >= 0) {
  const frag = cssGlob.slice(chipIdx, chipIdx + 300);
  check("chip-corner uses solid dark bg (var(--color-bg))", frag.includes("background:var(--color-bg)"));
}

// 5. GLBackground perf changes shipped (DPR cap + fps cap + static-on-touch)
function walk(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((d) =>
    d.isDirectory()
      ? walk(path.join(dir, d.name))
      : d.name.endsWith(".js")
        ? [path.join(dir, d.name)]
        : []
  );
}
const allJs = walk("out/_next/static/chunks")
  .map((p) => fs.readFileSync(p, "utf8"))
  .join("\n");
check("GLBackground shader present", allJs.includes("aPos"));
check("GL DPR cap lowered to 1.0", /devicePixelRatio\|\|1,\s?1\)/.test(allJs));
check(
  "GL static frame on touch (coarse pointer)",
  allJs.includes("(pointer: fine)") &&
    allJs.includes("prefers-reduced-motion: reduce")
);

// 6. Light-theme AA contrast fixes shipped in CSS
check(
  "light theme defines --color-acid-ink",
  /--color-acid-ink:#3f5b00/.test(cssGlob)
);
check(
  "light theme defines --color-accent-ink",
  /--color-accent-ink:#00596b/.test(cssGlob)
);
check(
  "light .sig-badge uses acid-ink",
  /\[data-theme=light\] \.sig-badge\{color:var\(--color-acid-ink\)\}/.test(cssGlob)
);
check(
  "light .logo-id uses accent-ink",
  /\[data-theme=light\] \.logo-id\{color:var\(--color-accent-ink\)\}/.test(cssGlob)
);
check(
  "footer rail indices use .foot-idx (AA-safe)",
  /\.foot-idx\{color:var\(--color-acid\)\}/.test(cssGlob) &&
    /\.foot-idx\{color:var\(--color-acid-ink\)\}/.test(cssGlob)
);

// 7. Footer markup uses foot-idx (no more raw text-acid/80)
check(
  "footer index span uses foot-idx class",
  home.includes('class="foot-idx font-mono text-[0.58rem]')
);

// 8. DB-only posts render as plain <a> (no RSC prefetch → no 404).
//    The home page prerenders static slugs as <Link>; the live DB list can
//    add posts that only exist in MySQL. Those must not be prefetched.
//    Inspect the client chunk for the isStatic gate.
function walkAll(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((d) =>
    d.isDirectory()
      ? walkAll(path.join(dir, d.name))
      : d.name.endsWith(".js")
        ? [path.join(dir, d.name)]
        : []
  );
}
const allChunks = walkAll("out/_next/static/chunks")
  .map((p) => fs.readFileSync(p, "utf8"))
  .join("\n");
check(
  "DB-only posts use plain anchor (isStatic gate in chunk)",
  allChunks.includes("isStatic") &&
    (allChunks.includes('"post-card group"') ||
      allChunks.includes('"issue-card group"'))
);
check(
  "light accent darkened for AA (--color-accent:#005f73)",
  /--color-accent:#005f73/.test(cssGlob)
);
check(
  "light theme accent-ink now #00596b (logo-id ≥6:1)",
  /--color-accent-ink:#00596b/.test(cssGlob)
);

// 9. Timezone-independent post dates (React #418 hydration fix).
//     "2026-08-15 01:39:34" parsed as local time rolled to 2026-08-14 on the
//     +03:30 build machine but stayed 2026-08-15 in UTC-07:00 browsers —
//     prerendered HTML then mismatched hydration. The visible date must be
//     the authored wall-clock date, and the JSON-LD must agree with it.
const hydrationPost = "out/en/blog/claude-code-vs-cline-which-ai-coding-agent-should-developers-use-in-2026/index.html";
if (fs.existsSync(hydrationPost)) {
  const hp = fs.readFileSync(hydrationPost, "utf8");
  check("post shows authored date 2026-08-15", hp.includes("2026-08-15"));
  check("no rolled-back 2026-08-14 anywhere in post HTML", !hp.includes("2026-08-14"));
  check("JSON-LD keeps naive time (no Z shift)", hp.includes("2026-08-15T01:39:34"));
  // formatPostDate/postDateKey must never construct a Date from the raw string
  const helpersAfterKey =
    fs.readFileSync("src/lib/post-helpers.ts", "utf8").split("postDateKey")[1] ?? "";
  check(
    "post helpers avoid timezone-dependent Date parsing",
    !helpersAfterKey.includes("new Date(")
  );
}

// 10. Performance round: root internal rewrite (no client redirect)
const htaccessOut = fs.readFileSync("out/.htaccess", "utf8");
check(
  "root serves locale homepage internally (no 301 roundtrip)",
  htaccessOut.includes("RewriteRule ^$ fa/index.html [L]") &&
    htaccessOut.includes("RewriteRule ^$ en/index.html [L]") &&
    !htaccessOut.includes("RewriteRule ^$ en/ [R=301,L]")
);

// 11. LCP discovery: hero image preloaded with fetchpriority=high, not lazy
check(
  "hero image preload carries fetchpriority=high",
  /<link[^>]*rel="preload"[^>]*hero-image\.webp[^>]*>/.test(home) &&
    /<link[^>]*hero-image\.webp[^>]*>/.test(home) &&
    /fetchpriority/i.test(home)
);
check(
  "hero <img> is eager (no lazy on the LCP image)",
  !/loading="lazy"[^>]*hero-image|hero-image[^>]*loading="lazy"/.test(home)
);

// 12. Ctrl+K affordance shipped
check(
  "palette opens via open-command-palette event",
  allChunks.includes("open-command-palette")
);
check(
  "dock chip .kbd-hint styled (both themes AA-safe)",
  /\.kbd-hint\{/.test(cssGlob) &&
    /\.kbd-hint \.kbd-key\{/.test(cssGlob)
);
check("dock chip present in nav markup", home.includes("kbd-hint"));

// 13. Critical CSS inlined (Critters) — render-blocking stylesheets reduced
check(
  "critical CSS inlined into HTML (optimizeCss)",
  home.includes("<style")
);

// 14. Self-hosted webfonts are preloaded (removes the font-swap reflow that
//     caused CLS 0.225); injected by prepare-cpanel.mjs into every HTML head.
check(
  "fonts preloaded in every HTML head",
  home.includes('rel="preload" as="font"')
);
check(
  "hero image preload precedes font preloads",
  home.indexOf('rel="preload" as="image"') <
    home.indexOf('rel="preload" as="font"')
);

console.log(results.join("\n"));
const failed = results.filter((r) => r.startsWith("FAIL")).length;
process.exitCode = failed ? 1 : 0;