/**
 * prepare-cpanel.mjs
 *
 * After `next build` has produced the static export in `out/`, this script
 * assembles the cPanel-deployable folder exactly like the reference build:
 *   out/
 *     index.html, en/, fa/, blog/, static/...   <- Next.js static export
 *     api/        <- PHP + MySQL endpoints (get_posts, get_post, admin, db)
 *     uploads/    <- original uploads from the reference build
 *     .htaccess   <- rewrite rules (root -> en/, clean /blog/<slug>)
 *
 * Usage:  npm run prepare-cpanel
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const out = path.join(root, "out");
const build = path.join(root, "build");

if (!fs.existsSync(path.join(out, "en", "index.html"))) {
  console.error("out/en/index.html not found. Run `npm run build` (static export) first.");
  process.exit(1);
}

// 0a. Root redirect: / -> /en/ (Apache will serve this for domain root)
const rootRedirect = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>Redirecting…</title>
<script>
// Detect Farsi browser preference
var langs = (navigator.languages || [navigator.language || "en"]).join(",");
document.documentElement.lang = /(^|,)\\s*fa/.test(langs) ? "fa" : "en";
location.replace(/(^|,)\\s*fa/.test(langs) ? "/fa/" : "/en/");
</script>
<meta http-equiv="refresh" content="1;url=/en/">
</head>
<body style="background:#05050f;color:#edece6;font-family:sans-serif;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0">
<p>Redirecting to <a href="/en/" style="color:#ff2b55">English</a> or <a href="/fa/" style="color:#ff2b55">فارسی</a></p>
</body>
</html>`;
fs.writeFileSync(path.join(out, "index.html"), rootRedirect);
console.log("✓ wrote root index.html (locale redirect)");

// 1. Copy PHP API from the reference build
const apiSrc = path.join(build, "api");
const apiOut = path.join(out, "api");
fs.cpSync(apiSrc, apiOut, { recursive: true });
console.log("✓ copied api/ (PHP endpoints)");

// 1b. Clean up non-PHP files that were copied from the reference build's api/
const keepPhp = new Set(["db.php", "get_posts.php", "get_post.php", "admin.php", "config.sample.php", "uploads"]);
for (const f of fs.readdirSync(apiOut)) {
  if (!keepPhp.has(f)) {
    fs.rmSync(path.join(apiOut, f), { recursive: true, force: true });
    console.log(`  cleaned out/api/${f}`);
  }
}
console.log("✓ cleaned api/ (PHP only)");

// 1c. Dynamic blog-post renderer: full server-side HTML from MySQL for
// slugs that have no pre-rendered page yet (.htaccess routes to it).
const postTplSrc = path.join(root, "scripts", "blog-post-template.php");
fs.copyFileSync(postTplSrc, path.join(out, "api", "post.php"));
console.log("✓ wrote api/post.php (dynamic blog renderer)");

// 2. Write a proper .htaccess for the static multi-page export
const htaccess = path.join(out, ".htaccess");
const htaccessContent = `<IfModule mod_rewrite.c>
  RewriteEngine On
  RewriteBase /

  # ── RSC payloads (index.txt) — if present, serve them untouched ──────
  # Next.js prefetches these files for instant client-side navigation.
  # This short-circuit guarantees a real payload is never swallowed by an
  # older blog/DB rewrite rule, even on hosts with a stale .htaccess.
  RewriteCond %{REQUEST_FILENAME} -f
  RewriteRule \.txt$ - [L]

  # ── Canonicalization: legacy ?lang= parameter ─────────────────────
  # Old URLs like /blog/post?lang=fa or /education?lang=en are 301'd to
  # the locale-prefixed canonical (/fa/blog/post/, /en/education/).
  RewriteCond %{REQUEST_URI} !^/(en|fa)(/|$) [NC]
  RewriteCond %{QUERY_STRING} ^lang=(fa|en) [NC]
  RewriteRule ^$ /%2/ [R=301,L]
  RewriteCond %{REQUEST_URI} !^/(en|fa)(/|$) [NC]
  RewriteCond %{QUERY_STRING} ^lang=(fa|en) [NC]
  RewriteRule ^(.+)$ /%2/$1 [R=301,L]

  # ── Canonicalization: any other query string on page URLs ─────────
  RewriteCond %{REQUEST_URI} !^/api/ [NC]
  RewriteCond %{QUERY_STRING} !^$
  RewriteRule ^(.*)$ /$1? [R=301,L]

  # ── Bare URLs → canonical locale-prefixed 301s ────────────────────
  # /blog, /showcase… and /blog/<slug> are NOT canonical anymore; they
  # permanently redirect so Google consolidates them into /en/…
  # (Persian reaches users via hreflang + the root language notice.)
  RewriteRule ^(blog|work|skills|education|showcase)/?$ en/$1/ [R=301,L]
  RewriteRule ^blog/([^/]+)/?$ en/blog/$1/ [R=301,L]

  # ── Root: language-aware INTERNAL rewrite (no client roundtrip) ───
  # The old external 301 added a full document roundtrip to every cold
  # visit (Lighthouse: "Document request latency"). Serving the locale
  # homepage AT the root URL with 200 removes it entirely — no duplicate-
  # content risk either, because the served file already carries its own
  # <link rel="canonical"> to /en/ or /fa/.
  RewriteCond %{HTTP:Accept-Language} ^fa [NC]
  RewriteRule ^$ fa/index.html [L]
  RewriteRule ^$ en/index.html [L]

  # ── Prefixed paths without trailing slash → with trailing slash ───
  RewriteCond %{REQUEST_FILENAME} !-f
  RewriteRule ^(en|fa)/(blog|work|skills|education|showcase)$ $1/$2/ [R=301,L]
  RewriteCond %{REQUEST_FILENAME} !-f
  RewriteRule ^(en|fa)/blog/([^./]+)$ $1/blog/$2/ [R=301,L]

  # ── Locale-prefixed without trailing slash → serve index.html ──
  RewriteRule ^en/blog/([^/]+)$ en/blog/$1/index.html [L]
  RewriteRule ^fa/blog/([^/]+)$ fa/blog/$1/index.html [L]
  RewriteRule ^en/blog$ en/blog/index.html [L]
  RewriteRule ^fa/blog$ fa/blog/index.html [L]
  RewriteRule ^en/work$ en/work/index.html [L]
  RewriteRule ^fa/work$ fa/work/index.html [L]
  RewriteRule ^en/skills$ en/skills/index.html [L]
  RewriteRule ^fa/skills$ fa/skills/index.html [L]
  RewriteRule ^en/education$ en/education/index.html [L]
  RewriteRule ^fa/education$ fa/education/index.html [L]
  RewriteRule ^en/showcase$ en/showcase/index.html [L]
  RewriteRule ^fa/showcase$ fa/showcase/index.html [L]

  # ── DB-only posts → server-side PHP rendering ────────────────────
  # Posts published via /api/admin.php exist only in MySQL until the
  # next static export. When no pre-rendered folder exists for a slug,
  # api/post.php renders the FULL article (HTML head, meta tags, JSON-LD,
  # all content blocks) straight from the database — no rebuild needed.
  # Existing folders are untouched (!-d guard).
  RewriteCond %{REQUEST_FILENAME} !-d
  RewriteCond %{REQUEST_FILENAME} !-f
  RewriteRule ^(en|fa)/blog/([^/.]+)/?$ api/post.php?slug=$2&locale=$1 [QSA,L]

  # ── Dynamic sitemap: all DB posts get indexed via sitemap.php ──────\n  # sitemap.xml is rewritten to sitemap.php which reads ALL published\n  # posts from MySQL, so new admin-published posts appear in the sitemap\n  # immediately and Google can discover/index them without a rebuild.\n  RewriteRule ^sitemap\\.xml$ sitemap.php [L,QSA]\n  \n  # ── Protect sensitive files ──────────────────────────────────────
  <FilesMatch "\\.(env|sql|log|md)$">
    Deny from all
  </FilesMatch>
  <Files "config.php.example">
    Deny from all
  </Files>

  # ── API requests pass through to PHP (no rewrite needed) ────────
  RewriteCond %{REQUEST_URI} ^/api/
  RewriteRule ^ - [L]

  # ── Existing files and directories are served directly ──────────
  RewriteCond %{REQUEST_FILENAME} -f [OR]
  RewriteCond %{REQUEST_FILENAME} -d
  RewriteRule ^ - [L]
</IfModule>

<IfModule mod_headers.c>
  Header set X-Content-Type-Options "nosniff"
  Header set X-Frame-Options "SAMEORIGIN"
  Header set Referrer-Policy "strict-origin-when-cross-origin"
  Header set X-XSS-Protection "1; mode=block"
  Header set Strict-Transport-Security "max-age=31536000; includeSubDomains; preload"
  Header set Permissions-Policy "geolocation=(), microphone=(), camera=()"
  <FilesMatch "\\.(css|js|webp|png|jpg|svg|woff2)$">
    Header set Cache-Control "public, max-age=31536000, immutable"
  </FilesMatch>
  <FilesMatch "\\.html$">
    Header set Cache-Control "public, max-age=0, must-revalidate"
  </FilesMatch>
</IfModule>

# ── Compression: smaller HTML/CSS/JS/JSON over the wire ──────────
# PSI's throttled transfer directly reflects this: the inlined CSS makes
# each HTML doc sizable, and get_posts.php JSON payloads compress ~80%.
<IfModule mod_brotli.c>
  AddOutputFilterByType BROTLI_COMPRESS text/html text/plain text/css text/javascript application/javascript application/json image/svg+xml application/xml application/rss+xml
</IfModule>
<IfModule mod_deflate.c>
  AddOutputFilterByType DEFLATE text/html text/plain text/css text/javascript application/javascript application/json image/svg+xml application/xml application/rss+xml
</IfModule>

Options -Indexes

ErrorDocument 404 /404.html`;
fs.writeFileSync(htaccess, htaccessContent);
console.log("✓ wrote .htaccess (static export rules)");

// 2b. Generate out/404.html (Next can't with multi-root layouts)
const notFoundHtml = `<!DOCTYPE html>
<html lang="en" dir="ltr">
<head><meta charset="utf-8"><title>404 — Not Found</title>
<style>body{background:#05050f;color:#edece6;font-family:'Space Grotesk',sans-serif;display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:100vh;margin:0;text-align:center}
h1{font-size:clamp(6rem,20vw,16rem);font-weight:900;line-height:1;color:transparent;-webkit-text-stroke:2px rgba(237,236,230,.35);margin:0}
p{color:#7d7d74;font-size:1rem;max-width:24rem;margin:1rem 0 2rem}
a{display:inline-block;background:#ff2b55;color:#04121a;padding:.75rem 1.75rem;border-radius:99px;font-family:monospace;font-size:.75rem;text-transform:uppercase;letter-spacing:.15em;text-decoration:none;font-weight:700}
a:hover{opacity:.85}</style></head>
<body><p style="font-family:monospace;font-size:.68rem;letter-spacing:.18em;text-transform:uppercase;color:#7d7d74">(Error) — route not resolved</p>
<h1>404</h1><p>The page you're looking for doesn't exist or has been moved.</p>
<a href="/en/">← Return to index</a></body></html>`;
fs.writeFileSync(path.join(out, "404.html"), notFoundHtml);
console.log("✓ wrote 404.html");

// 3. Copy _redirects/_headers/llms.* for Netlify-style hosts (harmless on Apache).
//    Source of truth for the LLM profile files is public/ (this repo); the
//    reference build/ copies are stale — never let them overwrite ours.
for (const f of ["_redirects", "_headers", "llms.txt", "llms-full.txt"]) {
  const fromPublic = path.join(root, "public", f);
  const src = fs.existsSync(fromPublic)
    ? fromPublic
    : path.join(build, f);
  if (fs.existsSync(src)) {
    fs.copyFileSync(src, path.join(out, f));
    console.log(`✓ copied ${f} (${src.includes("public") ? "public/" : "build/"})`);
  }
}
// Deploy dynamic sitemap that reads ALL posts from MySQL (includes DB-only posts).
// The .htaccess rewrites sitemap.xml → sitemap.php so Google always sees a
// fresh sitemap with every published post, even ones added after the last build.
fs.copyFileSync(path.join(build, "sitemap.php"), path.join(out, "sitemap.php"));
console.log("✓ deployed sitemap.php (dynamic, reads from MySQL)");
// Copy static sitemap.xml from public/ as fallback (locale-prefixed URLs).
// The .htaccess rewrite serves sitemap.php when PHP is available; this static
// file is served only if PHP is not configured.
const publicSitemap = path.join(root, "public", "sitemap.xml");
if (fs.existsSync(publicSitemap)) {
  fs.copyFileSync(publicSitemap, path.join(out, "sitemap.xml"));
  console.log("✓ copied sitemap.xml (from public/, locale-prefixed fallback)");
}
// Ensure robots.txt from public/ is used (has LLM sitemap references).
// The Next.js build should have already placed it in out/, but re-copy to be safe.
const publicRobots = path.join(root, "public", "robots.txt");
if (fs.existsSync(publicRobots)) {
  fs.copyFileSync(publicRobots, path.join(out, "robots.txt"));
  console.log("✓ copied robots.txt (from public/, with LLM sitemaps)");
}

// 4. Copy uploads referenced by the DB (api/uploads from the reference build
// AND any cover checked into public/uploads), so list thumbnails resolve.
const uploadsOut = path.join(out, "api", "uploads");
fs.mkdirSync(uploadsOut, { recursive: true });
const uploadsSrc = path.join(build, "api", "uploads");
if (fs.existsSync(uploadsSrc)) {
  fs.cpSync(uploadsSrc, uploadsOut, { recursive: true });
  console.log("✓ copied api/uploads/");
}
const publicUploads = path.join(root, "public", "uploads");
if (fs.existsSync(publicUploads)) {
  for (const f of fs.readdirSync(publicUploads)) {
    const src = path.join(publicUploads, f);
    const dst = path.join(uploadsOut, f);
    if (!fs.existsSync(dst)) {
      fs.copyFileSync(src, dst);
      console.log(`  merged public/uploads/${f} → api/uploads/`);
    }
  }
}

// 5. Config samples so the user knows what to fill in
const configOut = path.join(out, "api", "config.php.example");
if (fs.existsSync(path.join(out, "api", "config.sample.php"))) {
  if (!fs.existsSync(configOut)) {
    fs.copyFileSync(path.join(out, "api", "config.sample.php"), configOut);
  }
  console.log("✓ wrote api/config.php.example (fill in + rename to config.php)");
}

// 6. Write a DEPLOY.txt with step-by-step cPanel instructions
const deployDoc = `═══════════════════════════════════════════════════════════════
 SINISTEROID — cPanel DEPLOYMENT
═══════════════════════════════════════════════════════════════

1) Fill in your database settings:
   - Open  api/config.php.example
   - Put your real cPanel MySQL host/db/user/pass + admin creds
   - Rename it to  api/config.php
   (Keep config.php OUT of version control.)

2) Import your posts table into MySQL if not present:
   - cPanel → phpMyAdmin → your DB → Import
   - Use the JSON export from your host (posts table).
   - Table name: posts  (columns: slug, status, title, date_published,
     tags, featured_image, content_json, date_updated)

3) Upload the CONTENTS of this folder to public_html:
   - Everything here goes directly into public_html
   - .htaccess must be uploaded (enable "show hidden files" in cPanel)
   - ⚠ ⚠ CRITICAL — upload EVERYTHING, including the *.txt RSC payloads:
       Next.js prefetches the per-route index.txt payloads (e.g.
       en/blog/index.txt, en/blog/<slug>/index.txt) for instant client-side
       navigation. If the browser does not find them it logs
       "GET /en/blog/index.txt 404" in the console and navigation falls
       back to a full page load.
   - ⚠ If you previously uploaded with your FTP client set to "skip
       existing files", the OLD en/blog and fa/blog folders on the server
       will keep 404ing their payloads. Fix: delete the stale
       public_html/en/blog and public_html/fa/blog folders on the server
       BEFORE uploading this package (they contain only static export
       files — no admin uploads live there), then upload fresh.
   - ⚠ IMPORTANT: do NOT delete or overwrite the folder
     public_html/api/uploads on the server — it contains the post
     cover images (uploaded via the admin) and this package only
     carries a small subset. Use plain "overwrite/merge" mode in
     your FTP client, not "mirror/sync" (which can delete extra
     server files).

4) The blog now reads from MySQL live via /api/get_posts.php and
   /api/get_post.php?slug=...
   - Admin: /api/admin.php  (Basic Auth using config.php creds)
   - The prerendered pages still load instantly for SEO, then hydrate
     with the latest DB content.

Done. Visit https://yourdomain.com
═══════════════════════════════════════════════════════════════
`;
fs.writeFileSync(path.join(out, "DEPLOY.txt"), deployDoc);
console.log("✓ wrote DEPLOY.txt");

// 6b. Sanity check — the static export MUST ship the RSC payload files the
//     client prefetches. Missing payloads = console 404s.
const rscChecks = [
  "index.txt",
  "en/index.txt",
  "fa/index.txt",
  "en/blog/index.txt",
  "fa/blog/index.txt",
  "en/blog/live/index.txt",
  "fa/blog/live/index.txt",
];
const missing = rscChecks.filter((rel) => !fs.existsSync(path.join(out, rel)));
if (missing.length) {
  console.error(
    `⚠ Missing RSC payloads — clients will log 404s:\n    ${missing.join("\n    ")}\n  Re-run next build before deploying.`
  );
} else {
  console.log("✓ RSC payloads present (index.txt per route)");
}

// 6c. Preload the self-hosted webfonts in every HTML file.
//     next/font (with inlineCss) inlines the @font-face rules into each
//     page's <style>, so fonts are only discovered *after* the HTML/CSS
//     download — on mobile they swap in after first paint and reflow the
//     giant display name (the root cause of the 0.22 CLS). Injecting
//     <link rel="preload" as="font"> right after <head> starts the font
//     fetch in parallel with the document and removes the swap.
function preloadFontsInHtml(html) {
  // Idempotency: skip files that already carry font preloads (re-running
  // prepare-cpanel on the same /out must never duplicate links).
  if (html.includes('rel="preload" as="font"')) return html;
  // Only preload the faces that paint the initial viewport: the display name
  // (Orbitron), body text (Space Grotesk / Vazirmatn) and the mono readouts
  // (JetBrains Mono). next/font (with inlineCss) inlines the @font-face rules
  // into each page's <style>, so fonts are only discovered *after* the
  // HTML/CSS download — on mobile they swap in after first paint and reflow
  // the giant display name (the root cause of the 0.22 CLS). Injecting
  // <link rel="preload" as="font"> right after <head> starts the font fetch
  // in parallel with the document and removes the swap.
  // Preloading ALL subsets (~25 files) is counter-productive: on a throttled
  // mobile connection the flood of high-priority font requests starves the
  // LCP image and delays the swap-paint to ~5.5s (which Lighthouse then
  // records as the LCP).
  const ALLOWED = ["Orbitron", "Space Grotesk", "Vazirmatn", "JetBrains Mono"];
  const urls = new Set();
  const styleRe = /<style[^>]*>([\s\S]*?)<\/style>/gi;
  let m;
  while ((m = styleRe.exec(html))) {
    const ffRe = /@font-face\s*\{([^}]*)\}/g;
    let ff;
    while ((ff = ffRe.exec(m[1]))) {
      const block = ff[1];
      const fam = block.match(/font-family:\s*"?([^";]+)"?\s*;/);
      if (!fam || !ALLOWED.some((a) => fam[1].trim().startsWith(a))) continue;
      // Only the file next/font itself marks preload-worthy (`-s.p.woff2`,
      // the primary subset per family) — full subset coverage would fetch
      // 13 files, while the first paint needs just these 4.
      const re = /url\(([^)]+-s\.p\.woff2)\)/g;
      let f;
      while ((f = re.exec(block))) urls.add(f[1]);
    }
  }
  if (urls.size === 0) return html;
  const links = [...urls]
    .map(
      (u) =>
        `<link rel="preload" as="font" type="font/woff2" href="${u}" crossOrigin="anonymous"/>`
    )
    .join("");
  if (html.indexOf("</head>") === -1) return html;
  // Insert before `</head>` so any Next.js preloads already in the head
  // (hero LCP image with fetchpriority=high) keep their earlier position.
  return html.replace(/<\/head>/i, `${links}</head>`);
}
let preloadCount = 0;
function walkHtml(dir) {
  for (const d of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, d.name);
    if (d.isDirectory()) walkHtml(p);
    else if (d.name.endsWith(".html")) {
      const before = fs.readFileSync(p, "utf8");
      const after = preloadFontsInHtml(before);
      if (after !== before) {
        fs.writeFileSync(p, after);
        preloadCount++;
      }
    }
  }
}
walkHtml(out);
console.log(`✓ font preloads injected into ${preloadCount} HTML files`);

console.log("\nReady! Upload the contents of /out to public_html.");
