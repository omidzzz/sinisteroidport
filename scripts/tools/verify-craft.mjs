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

// ── Dark-edition WCAG AA guard ──────────────────────────────────────
// The dark edition lifts the two grey roles that carry small text on
// charcoal (see craft/themes.css). The ratios are computed here from the
// SHIPPED values — not eyeballed — so a future token tweak that drops either
// role under 4.5:1 fails this check instead of silently shipping, the same
// way the colour-contrast audit found it the first time.
{
  let darkBody = "";
  for (const m of css.matchAll(/\[data-theme=["']?dark["']?\]\{([^}]*)\}/g)) {
    if (m[1].includes("--color-muted")) darkBody = m[1];
  }
  const pick = (name) => {
    const m = darkBody.match(new RegExp(`${name}:\\s*(#[0-9a-fA-F]{6})`));
    return m ? m[1].toLowerCase() : null;
  };
  const muted = pick("--color-muted");
  const inkDim = pick("--color-ink-dim");
  const lum = (hex) => {
    const channels = [0, 2, 4].map((i) => parseInt(hex.slice(1 + i, 3 + i), 16) / 255);
    const lin = channels.map((c) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
    return 0.2126 * lin[0] + 0.7152 * lin[1] + 0.0722 * lin[2];
  };
  const ratio = (a, b) => {
    const [hi, lo] = [lum(a), lum(b)].sort((x, y) => y - x);
    return (hi + 0.05) / (lo + 0.05);
  };
  const assertRatio = (name, value, surface) =>
    check(
      `${name} ${value ?? "?"} >= 4.5:1 on dark ${surface}`,
      Boolean(value) && ratio(value, surface) >= 4.5,
      value ? `measured ${ratio(value, surface).toFixed(2)}:1` : "token not found in [data-theme=dark]"
    );
  check(
    "dark edition lifts --color-muted",
    Boolean(muted),
    "no [data-theme=dark] block carrying --color-muted in the shipped CSS"
  );
  check("dark edition lifts --color-ink-dim", Boolean(inkDim));
  for (const surface of ["#272727", "#2f2f31"]) {
    assertRatio("dark muted contrast", muted, surface);
    assertRatio("dark ink-dim contrast", inkDim, surface);
  }
}

console.log("\n=== TYPE ===");
check("Space Grotesk face shipped", /font-family:\s*[\"']?Space Grotesk/i.test(css));
check("Inter face shipped", /font-family:\s*[\"']?Inter[\"']?\s*;/.test(css) || /font-family:Inter/.test(css));
check("JetBrains Mono face shipped", /JetBrains Mono/.test(css));
check("Cairo face shipped (fa)", /font-family:\s*[\"']?Cairo/i.test(css));
// The retired rave palette must not survive anywhere in the shipped CSS —
// the agent chat's mood tags and syntax tokens now ride craft role tokens.
for (const rave of ["#9dff57", "#53e0ff", "#ffb03f", "#a63e50", "#0f7a3d", "#0b6ec2"]) {
  check(`no rave literal in the bundle: ${rave}`, !css.toLowerCase().includes(rave));
}
check("agent chat rides role tokens", css.includes("--color-accent-on"));
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

console.log("\n=== PROGRESSIVE / TIER-1 PASS ===");
// Spring physics is an UPGRADE, never a dependency: the linear() curves must
// sit behind @supports so engines without the syntax keep the beziers (and
// every ring in the system reads the same focus tokens).
check("spring easings shipped", /--ease-spring:/.test(css) && /--ease-spring-snap:/.test(css));
check(
  "spring linear() upgrade is @supports-gated",
  /@supports\s*\(transition-timing-function:\s*linear\(/.test(css)
);
check("reduced-transparency honoured (blur off)", /prefers-reduced-transparency/.test(css));
check("reduced-data honoured (decorative payloads off)", /prefers-reduced-data/.test(css));
check(
  "standard scrollbar props shipped for Firefox",
  /scrollbar-color:/.test(css) && /scrollbar-width:/.test(css)
);
check("accent scopes shipped ([data-accent])", /\[data-accent=/.test(css));
check(
  "focus ring tokens shipped",
  /--focus-ring:/.test(css) && /--focus-ring-double:/.test(css)
);
// Footer-redesign pass: the mobile act labels fold flat (the rotated strip
// was ~1,050px of dead space on phones) and the dock carries the switches.
check("act labels fold flat on mobile", /writing-mode:\s*horizontal-tb/.test(css));
check(
  "dock bar carries the switches",
  css.includes(".craft-dock-bar") && css.includes(".craft-tool-lang")
);
check("new footer shell styled", css.includes(".craft-footer-index"));

console.log("\n=== TIER-2 POLISH ===");
// Dynamic-shell skeleton: geometry placeholders with a transform-only sheen
// (a background-position sweep would repaint the whole block each frame).
check(
  "post skeleton shipped",
  css.includes(".post-skeleton") && /sk-sheen/.test(css)
);
check(
  "skeleton sheen animates transform only",
  !/sk-sheen[\s\S]{0,200}background-position/.test(css)
);
check(
  "skeleton reserves the code block",
  /class="sk-block"|sk-block/.test(css)
);
// Wide-viewport editorial breakout (one-sided: the TOC rail owns the end side).
check(
  "prose breakout shipped",
  /\.prose-post blockquote/.test(css) &&
    /margin-inline-start:\s*-6rem/.test(css)
);
// One view timeline per skill cell instead of one per tick.
check(
  "skill meter shares one timeline per cell",
  /view-timeline:\s*--cell/.test(css) && /animation-timeline:\s*--cell/.test(css)
);
// initial-letter is an UPGRADE behind @supports (the float stays the base).
check(
  "initial-letter upgrade is @supports-gated",
  /@supports\s*\(initial-letter/.test(css)
);

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
  // The safe-area pairing. The corner chrome is position:fixed against the
  // screen edge (assistant, menu disclosure, switch stack), so the insets are
  // load-bearing on notched phones — and env() resolves at all ONLY when the
  // viewport opts into viewport-fit=cover. Either half alone is a regression,
  // so both are gated here instead of left to code review.
  check(
    "viewport opts into the safe area (viewport-fit=cover)",
    /<meta name="viewport"[^>]*viewport-fit=cover/.test(home),
    "no viewport-fit=cover: every env(safe-area-inset-*) is 0 and the fixed corner column sits in the home-indicator strip"
  );
  check(
    "viewport does not block pinch-zoom (WCAG 1.4.4)",
    !/maximum-scale|user-scalable/i.test(home)
  );
  check("theme-color meta shipped", /<meta name="theme-color"/.test(home));
  check(
    "first paint re-points theme-color for the saved edition",
    /#eff1f3/.test(home)
  );
  check(
    "safe-area tokens defined",
    /--safe-b:\s*env\(/.test(css) && /--safe-i:\s*max\(env\(/.test(css)
  );
  check(
    "the assistant's corner offsets read the safe-area token",
    /\.sin-chat-fab\{[^}]*var\(--safe-b\)/.test(css) &&
      /\.sin-chat-panel\{[^}]*var\(--safe-b\)/.test(css)
  );
  check(
    "the dock's bottom padding reads the safe-area token",
    /\.craft-console\{[^}]*var\(--safe-b\)/.test(css)
  );
  check(
    "the menu disclosure and switch stack clear the indicator too",
    /\.craft-console \.craft-menu-btn\{[^}]*var\(--safe-b\)/.test(css) &&
      /\.craft-tools\{[^}]*var\(--safe-b\)/.test(css)
  );
  check("theme init defaults to dark", home.includes('"dark"'));
  check("skip link present", home.includes("skip-link"));
  check("console prompt rendered", home.includes("craft-prompt"));
  check("combobox role wired", /role="combobox"/.test(home));
  check("aria-controls points at the list", home.includes("craft-console-list"));
  check("disclosure button rendered", home.includes("craft-menu-btn") && home.includes("aria-expanded"));
  const railLinks = (home.match(/craft-rail-link/g) || []).length;
  check(`status rail carries 8 route links (found ${railLinks})`, railLinks === 8);
  check("active route marked", /aria-current="page"/.test(home));
  // One landmark for the whole surface: the shell renders as <nav>, and the
  // disclosure announces the listbox popup it reveals.
  check(
    "console is a single nav landmark",
    /<nav[^>]*class="craft-console"/.test(home)
  );
  check("disclosure names its popup", home.includes('aria-haspopup="listbox"'));
  check("no legacy printed-edition copy", !home.includes("printed, not built"));
  check("colophon speaks the console register", home.includes("working console"));
  check("legacy dock chrome gone", !home.includes("dock-wrap") && !home.includes("mob-dock"));
  // Footer redesign: a structured index replaces the prose sitemap, and the
  // chrome switches live in the dock instead of being repeated in the footer.
  check("footer ships the 3-column index", home.includes("craft-footer-index"));
  check(
    `footer index lists every route (${(home.match(/craft-footer-link/g) || []).length} links found)`,
    (home.match(/craft-footer-link/g) || []).length >= 8
  );
  check("footer no longer duplicates the chrome switches", !home.includes("colophon-marginalia"));
  check(
    "nav carries the theme + language switches",
    home.includes("craft-tools") && home.includes("craft-tool-lang")
  );
  // Fonts are inlined into the STYLESHEET (the config no longer inlines CSS
  // into the HTML), so the data-URI assertion lives in the CSS section above.
  check("no render-blocking font preload", !/<link[^>]+as="font"/.test(home));
  // The colophon renders EAGERLY: it has no content-visibility placeholder,
  // because a skipped footer showed as a blank band at the page end and then
  // painted abruptly. (Its real height measures ~514px, the old `auto 720px`
  // guess reserved 720px, so the document also jumped by the difference.)
  check("footer renders eagerly (no cv-auto)", !/<footer[^>]*cv-auto/.test(home));
}

console.log("\n=== SHELL (FA / RTL) ===");
check("fa home prerendered", faHome !== null, missing(FA_HOME));
if (faHome) {
  check("RTL direction set", /dir="rtl"/.test(faHome));
  check("console rendered in fa", faHome.includes("craft-rail") && faHome.includes("craft-prompt"));
  check("fa theme init defaults to dark", faHome.includes('"dark"'));
  // The network-served Persian faces must be preloaded here, or
  // font-display:block would hold Persian text invisible on first paint.
  // TWO faces are required, not one: the Arabic face carries the Persian
  // text, the basic-Latin face carries every Latin string AND the
  // u+2000-206f punctuation block (measured — see
  // scripts/tools/scan-codepoints.mjs). Attribute order is not guaranteed,
  // so look ahead rather than in sequence.
  const faPreloads = faHome.match(/<link(?=[^>]*as="font")(?=[^>]*\.woff2)[^>]*>/g) ?? [];
  check(`fa preloads both Persian faces (found ${faPreloads.length})`, faPreloads.length === 2);
  // Font fetches are always CORS-mode; a preload without crossorigin is
  // double-fetched rather than reused.
  check(
    "fa preloads are CORS-mode (crossorigin)",
    faPreloads.length > 0 && faPreloads.every((tag) => /crossorigin/.test(tag))
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
  check("lab hero uses the shared voice", labEn.includes("craft-title"));
  check("lab carries a route hero ordinal", labEn.includes("06"));
}
if (labFa) {
  check("fa lab hero rendered", labFa.includes("craft-title"));
}

/* ── Sitemap / hreflang ─────────────────────────────────────────────── */

console.log("\n=== SITEMAP & HREFLANG ===");
const sitemap = read("out/sitemap.xml");
const dynamicSitemap = read("out/sitemap.php");
check("sitemap written", sitemap !== null, missing("out/sitemap.xml"));
check("dynamic sitemap packaged", dynamicSitemap !== null, missing("out/sitemap.php"));
if (sitemap) {
  check("sitemap lists /en/lab/", sitemap.includes("/en/lab/"));
  check("sitemap lists /fa/lab/", sitemap.includes("/fa/lab/"));
  check("sitemap cross-links hreflang", sitemap.includes('hreflang="fa"') && sitemap.includes('hreflang="en"'));
  check("sitemap root URLs have no double slash", !sitemap.includes("/en//") && !sitemap.includes("/fa//"));
}
if (dynamicSitemap) {
  check("dynamic sitemap uses production date_updated column", dynamicSitemap.includes("date_updated AS updated"));
  check("dynamic sitemap falls back to static XML", dynamicSitemap.includes("readfile($staticSitemap)") && dynamicSitemap.includes("http_response_code(200)"));
  check(
    "dynamic sitemap normalizes locale path separators",
    dynamicSitemap.includes("$normalizedPath = '/' . ltrim($path, '/')") &&
      dynamicSitemap.includes("rtrim($hostname . '/en' . $normalizedPath, '/')") &&
      dynamicSitemap.includes("rtrim($hostname . '/fa' . $normalizedPath, '/')"),
  );
}
const htaccess = read("out/.htaccess");
check("sitemap.xml routes through the dynamic handler", (htaccess ?? "").includes("RewriteRule ^sitemap\\.xml$ sitemap.php"));
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

/* ── CSS hygiene: every var() must resolve ──────────────────────────── */

console.log("\n=== CSS HYGIENE ===");

// A var() pointing at a custom property that nothing defines resolves to
// nothing, so the declaration is silently dropped — a mistyped token name
// looks exactly like a styling bug in the browser. This walks BOTH style
// dirs (legacy sheets still shipping + craft sheets) and reports any usage
// with no definition anywhere.
const definedProps = new Set();
const usedProps = new Map(); // prop -> Set(sheet basenames)
for (const dir of ["src/styles", "src/styles/craft"]) {
  if (!fs.existsSync(dir)) continue;
  for (const file of fs.readdirSync(dir).filter((f) => f.endsWith(".css"))) {
    const sheet = fs.readFileSync(`${dir}/${file}`, "utf8");
    for (const m of sheet.matchAll(/(--[a-z0-9-]+)\s*:/gi)) definedProps.add(m[1]);
    for (const m of sheet.matchAll(/var\(\s*(--[a-z0-9-]+)(\s*,[^()]*)?\)/gi)) {
      // var(--x, 0) resolves to its fallback when nothing defines --x, so an
      // intentional optional property is not an unresolved one.
      if (m[2]) continue;
      if (!usedProps.has(m[1])) usedProps.set(m[1], new Set());
      usedProps.get(m[1]).add(file);
    }
  }
}

// Components set some properties at runtime — inline style keys such as
// { ["--v" as string]: "80%" }, el.style.setProperty("--x", …), or the
// `variable:` option next/font uses to publish a face as a custom property.
// Those are legitimately absent from CSS, so scan the source for them rather
// than keeping a hand-maintained allowlist that would rot.
const runtimeProps = new Set();
(function walk(dir) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = `${dir}/${e.name}`;
    if (e.isDirectory()) walk(p);
    else if (/\.(tsx|ts)$/.test(e.name)) {
      const s = fs.readFileSync(p, "utf8");
      // The window between the key and its colon must not cross a quote:
      // in { "--i": index, "--n": total } a greedy window would consume the
      // second key and its colon as part of the first match, hiding --n.
      for (const m of s.matchAll(/["'](--[a-z0-9-]+)["'][^"'\n]{0,24}:/gi)) runtimeProps.add(m[1]);
      for (const m of s.matchAll(/setProperty\(\s*["'](--[a-z0-9-]+)/gi)) runtimeProps.add(m[1]);
      for (const m of s.matchAll(/variable:\s*["'](--[a-z0-9-]+)["']/gi)) runtimeProps.add(m[1]);
    }
  }
})("src");

const unresolved = [...usedProps].filter(
  ([prop]) => !definedProps.has(prop) && !runtimeProps.has(prop)
);
check(
  `every var() resolves (${definedProps.size} defined · ${runtimeProps.size} runtime-set)`,
  unresolved.length === 0,
  unresolved.map(([p, sheets]) => `${p} (used in ${[...sheets].join(", ")})`).join(" | ")
);

// A stylesheet whose closing brace goes missing doesn't fail loudly: CSS
// nesting makes everything after the accidental opening read as *nested*
// rules, so the rest of the sheet silently changes meaning (craft/home.css
// shipped ~160 lines of status-line, ticker, RTL and print rules scoped
// inside a :focus-visible rule exactly this way). The build surfaces a
// missing brace only when the sheet ends unbalanced, so check the invariant
// directly: a selector rule must never directly contain another selector
// rule.
const nestViolations = [];
for (const dir of ["src/styles", "src/styles/craft"]) {
  if (!fs.existsSync(dir)) continue;
  for (const file of fs.readdirSync(dir).filter((f) => f.endsWith(".css"))) {
    // Strip comments and quoted strings first — braces inside either are not
    // structural, and this codebase has content: "…" declarations everywhere.
    const text = fs
      .readFileSync(`${dir}/${file}`, "utf8")
      .replace(/\/\*[\s\S]*?\*\//g, "")
      .replace(/"[^"\n]*"|'[^'\n]*'/g, "");
    const stack = [];
    let buf = "";
    let line = 1;
    for (const ch of text) {
      if (ch === "\n") line += 1;
      else if (ch === "{") {
        const prelude = buf.trim();
        const isAtRule = prelude.startsWith("@");
        const parent = stack[stack.length - 1];
        if (!isAtRule && parent && !parent.isAtRule) {
          nestViolations.push(`${file}:${line} — "${prelude}" nested inside "${parent.prelude}"`);
        }
        stack.push({ isAtRule, prelude });
        buf = "";
      } else if (ch === "}") {
        stack.pop();
        buf = "";
      } else if (ch !== "\r") buf += ch;
    }
    if (stack.length !== 0) nestViolations.push(`${file} — ${stack.length} unclosed block(s)`);
  }
}
check(
  "no rule swallows the rest of its sheet",
  nestViolations.length === 0,
  nestViolations.slice(0, 4).join(" | ")
);

/* ── Route bodies ───────────────────────────────────────────────────── */

console.log("\n=== ROUTE BODIES ===");
const workEn = read("out/en/work/index.html");
const skillsEn = read("out/en/skills/index.html");
check("work route prerendered", workEn !== null, missing("out/en/work/index.html"));
check("skills route prerendered", skillsEn !== null, missing("out/en/skills/index.html"));
if (workEn) check("work renders the timeline cards", workEn.includes("tl-card"));
if (skillsEn) check("skills renders the matrix", skillsEn.includes("skill-orbit"));
const educationEn = read("out/en/education/index.html");
const showcaseEn = read("out/en/showcase/index.html");
if (educationEn) check("education renders the record deck", educationEn.includes("edu-card"));
if (showcaseEn) check("showcase renders the bento wall", showcaseEn.includes("bento-frame"));
// Tier‑1 accent scoping: a route root may declare its act accent; the scope
// sheet must stay wired for the attribute to mean anything.
if (workEn) check('work declares data-accent="teal"', workEn.includes('data-accent="teal"'));
if (showcaseEn) check('showcase declares data-accent="warm"', showcaseEn.includes('data-accent="warm"'));
const contactEn = read("out/en/contact/index.html");
const blogEn = read("out/en/blog/index.html");
if (contactEn) check("contact renders the channel board", contactEn.includes("contact-value"));
if (blogEn) check("blog renders the issue grid", blogEn.includes("issue-card"));
// Card → article morph: the per-slug names must be in the markup on BOTH
// ends, and the shared group styling in the CSS.
if (blogEn) check("blog cards carry the morph names", /post-cover-/.test(blogEn));
const postSlug = fs
  .readdirSync("out/en/blog", { withFileTypes: true })
  .find((d) => d.isDirectory() && fs.existsSync(`out/en/blog/${d.name}/index.html`))?.name;
const postEn = postSlug ? read(`out/en/blog/${postSlug}/index.html`) : null;
if (postEn && postSlug)
  check(
    `article hero carries the matching morph name (${postSlug.slice(0, 24)}…)`,
    postEn.includes(`post-cover-${postSlug}`)
  );
// An article is the one route family with no PageHero, so the ambient wash
// rides on the article box itself (craft/pages.css). If a template edit drops
// the class, the top of every post goes flat again with nothing else failing.
if (postEn) check("article shell carries the ambient wash", postEn.includes("craft-article"));

/* ---- Act numbering: the ghost numeral and the kicker are the same fact ----
   Every route hero states its act number TWICE — the giant ghost numeral and
   the "(NN)" in the eyebrow — and the console's route list states it a third
   time. They are written by hand in three places, and the blog hero drifted:
   it said 06 while its own kicker said "(07) Notes & essays" and the console
   said 07, which is also why 06 appeared twice (lab and writing) and 09 never
   appeared at all. Nothing failed, because each copy was internally valid.

   So the assertion is the CROSS-CHECK, not a hardcoded list: on every act
   page, the ghost numeral must equal the number in its own kicker. Persian
   digits are translated by value (۰۷ -> 7) so one rule covers both locales. */
console.log("\n=== ACT NUMBERING ===");
const ACT_DIGITS = { "۰": 0, "۱": 1, "۲": 2, "۳": 3, "۴": 4, "۵": 5, "۶": 6, "۷": 7, "۸": 8, "۹": 9 };
/** "۰۷" / "07" -> 7, so a Persian and a Latin numeral compare equal. */
const toLatin = (s) =>
  [...s].reduce((n, ch) => (ch in ACT_DIGITS ? n * 10 + ACT_DIGITS[ch] : n), 0) ||
  Number(s);
for (const route of [
  "work",
  "skills",
  "education",
  "showcase",
  "lab",
  "blog",
  "tags",
  "contact",
]) {
  for (const locale of ["en", "fa"]) {
    const html = read(`out/${locale}/${route}/index.html`);
    if (!html) continue;
    const ghost = (html.match(/craft-page-index[^>]*>([^<]*)</) || [])[1];
    const kicker = (html.match(/craft-eyebrow[^>]*>\s*\(?([۰-۹0-9]{2})\)?/) || [])[1];
    check(
      `${route} (${locale}): hero numeral matches its kicker`,
      ghost && kicker && toLatin(ghost.trim()) === toLatin(kicker),
      `ghost ${JSON.stringify(ghost?.trim())} vs kicker ${JSON.stringify(kicker)}`
    );
  }
}
// The ambient wash must reach every viewport and both reading directions. Two
// silent failure modes are guarded here, both of which look fine in a
// screenshot of the English/dark edition:
//   1. the wash box must be viewport-sized (100vw x 100dvh), or a short hero
//      leaves the lower screen flat;
//   2. `data-theme` and `dir` are both attributes of <html>, so a DESCENDANT
//      selector between them matches nothing — the light edition under RTL
//      then falls back to the dark recipe and paints with the dark-olive ink.
check(
  "ambient wash fills the viewport (100vw x 100dvh)",
  /width:\s*100vw/.test(css) && /height:\s*100dvh/.test(css)
);
check(
  "light+RTL wash re-ink compounds on <html>",
  /\[data-theme=["']?light["']?\]\[dir=["']?rtl["']?\]/.test(css) &&
    !/\[data-theme=["']?light["']?\]\s+\[dir=/.test(css)
);
for (const cls of [".craft-page-hero", ".craft-article", ".craft-title", ".timeline", ".tl-card", ".tl-period", ".skill-grid", ".skill-cell", ".skill-orbit i", ".edu-card", ".edu-degree", ".bento", ".bento-frame", ".bento-name", ".bento-tags", ".bento-up", ".contact-hero", ".contact-value", ".contact-copy", ".contact-console", ".live-dot", ".issue-grid", ".issue-card", ".issue-title", ".issue-tags"]) {
  check(`body rule shipped ${cls}`, css.includes(cls));
}

/* ── Legacy sheets: live rules must survive a prune ─────────────────── */

// The prune pass (scripts/tools/prune-dead-css.mjs) removes legacy rules whose
// every class token is unreachable, keeping the sheets honest without a
// rewrite. These selectors style markup that ships, so their rules must still
// be present afterwards — this is the guard that says "the prune was lossless".
console.log("\n=== LEGACY LIVE RULES ===");
for (const sel of [
  ".timeline",
  ".tl-card",
  ".tl-node",
  ".skill-cell",
  ".skill-orbit i",
  ".edu-card",
  ".bento-frame",
  ".bento-tag",
  ".issue-card",
  ".post-toc",
  ".reading-progress",
  ".prose-post",
  ".sin-chat-panel",
  ".sin-tok-c",
  ".contact-value",
  ".ch-strip",
  ".logo-sinister",
  ".prop-float",
  ".ticker-track",
  ".post-strip",
  ".sig-wave",
  ".module-card",
  ".net-legend",
  ".lab-plate",
  ".craft-prompt",
]) {
  check(`live legacy rule shipped ${sel}`, css.includes(sel));
}

// Chrome retired by the rebuild (old navbar/dock, the rave-era hero props) must
// not come back: these tokens have no markup and no sheet should reintroduce them.
for (const gone of [".mob-burger", ".mob-pill", ".planet-ring", ".sun-core", ".foot-giant"]) {
  check(`retired chrome gone ${gone}`, !css.includes(gone));
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

