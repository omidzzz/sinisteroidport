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
<body style="background:#0a0a0b;color:#edece6;font-family:sans-serif;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0">
<p>Redirecting to <a href="/en/" style="color:#d9ff3f">English</a> or <a href="/fa/" style="color:#d9ff3f">فارسی</a></p>
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

  # ── Root: language-aware permanent redirect ───────────────────────
  RewriteCond %{HTTP:Accept-Language} ^fa [NC]
  RewriteRule ^$ fa/ [R=301,L]
  RewriteRule ^$ en/ [R=301,L]

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

  # ── Protect sensitive files ──────────────────────────────────────
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

Options -Indexes

ErrorDocument 404 /404.html`;
fs.writeFileSync(htaccess, htaccessContent);
console.log("✓ wrote .htaccess (static export rules)");

// 2b. Generate out/404.html (Next can't with multi-root layouts)
const notFoundHtml = `<!DOCTYPE html>
<html lang="en" dir="ltr">
<head><meta charset="utf-8"><title>404 — Not Found</title>
<style>body{background:#0a0a0b;color:#edece6;font-family:'Space Grotesk',sans-serif;display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:100vh;margin:0;text-align:center}
h1{font-size:clamp(6rem,20vw,16rem);font-weight:900;line-height:1;color:transparent;-webkit-text-stroke:2px rgba(237,236,230,.35);margin:0}
p{color:#7d7d74;font-size:1rem;max-width:24rem;margin:1rem 0 2rem}
a{display:inline-block;background:#d9ff3f;color:#0a0a0b;padding:.75rem 1.75rem;border-radius:99px;font-family:monospace;font-size:.75rem;text-transform:uppercase;letter-spacing:.15em;text-decoration:none;font-weight:700}
a:hover{opacity:.85}</style></head>
<body><p style="font-family:monospace;font-size:.68rem;letter-spacing:.18em;text-transform:uppercase;color:#7d7d74">(Error) — route not resolved</p>
<h1>404</h1><p>The page you're looking for doesn't exist or has been moved.</p>
<a href="/en/">← Return to index</a></body></html>`;
fs.writeFileSync(path.join(out, "404.html"), notFoundHtml);
console.log("✓ wrote 404.html");

// 3. Copy _redirects/_headers for Netlify-style hosts (harmless on Apache)
for (const f of ["_redirects", "_headers", "robots.txt", "sitemap.xml", "llms.txt", "llms-full.txt"]) {
  const src = path.join(build, f);
  if (fs.existsSync(src)) {
    fs.copyFileSync(src, path.join(out, f));
    console.log(`✓ copied ${f}`);
  }
}

// 4. Copy uploads referenced by the DB (api/uploads from the reference build)
const uploadsSrc = path.join(build, "api", "uploads");
const uploadsOut = path.join(out, "api", "uploads");
if (fs.existsSync(uploadsSrc)) {
  fs.cpSync(uploadsSrc, uploadsOut, { recursive: true });
  console.log("✓ copied api/uploads/");
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

console.log("\nReady! Upload the contents of /out to public_html.");
