// Verify the Cache-Control rules inside the htaccessContent template literal
// in scripts/build/prepare-cpanel.mjs. Guards the path-scoped caching fix:
// sw.js must never be immutable, _next/static must be, and API/HTML/media get
// their own tiers.
import fs from "node:fs";
import path from "node:path";

const file = path.resolve("scripts/build/prepare-cpanel.mjs");
const src = fs.readFileSync(file, "utf8");

const ok = (label, cond) => console.log(`  ${cond ? "✓" : "✗ FAIL"} ${label}`);
let fails = 0;
const check = (label, cond) => {
  ok(label, cond);
  if (!cond) fails += 1;
};

// Find the template literal boundaries
const marker = "const htaccessContent = `";
const startIdx = src.indexOf(marker);
if (startIdx === -1) {
  console.log("ERROR: htaccessContent template literal not found");
  process.exit(1);
}

const litStart = startIdx + marker.length; // position after the opening backtick
// The template literal contains escaped "\\`" sequences in comments, so a bare
// indexOf("`") would truncate at the first one. Anchor on the known closing
// sentinel instead: "...ErrorDocument 404 /404.html`;".
const SENTINEL = "ErrorDocument 404 /404.html";
const endIdx = src.indexOf(SENTINEL);
if (endIdx === -1) {
  console.log("ERROR: template literal closing sentinel not found");
  process.exit(1);
}
const litEnd = endIdx + SENTINEL.length;

// Extract the raw template literal content (as text in the source file)
const rawContent = src.substring(litStart, litEnd);

// The template literal uses \n escapes AND real multi-line literals; unescape
// them so we test the actual .htaccess output. CRITICAL: collapsing "\\" (two
// literal backslashes in the source) requires a regex pattern of FOUR
// backslashes — a single-char pattern is an identity replace.
const backslash = String.fromCharCode(92);
const actualContent = rawContent
  .replace(new RegExp(backslash + "n", "g"), "\n")
  .replace(new RegExp(backslash + "t", "g"), "\t")
  .replace(new RegExp(backslash.repeat(4), "g"), backslash);

console.log("=== Cache-Control rules (evaluated .htaccess) ===");

// 1. Old extension-based immutable FilesMatch is GONE (the bug it caused:
//    sw.js and non-hashed media frozen immutable for a year). Asserts the
//    exact removed shape — a <FilesMatch> tag immediately followed by an
//    immutable Cache-Control header — so unrelated FilesMatch blocks
//    (protecting .env/.log etc.) don't false-flag.
check(
  "no extension-based immutable FilesMatch",
  !/<FilesMatch[^>]*>\s*Header set Cache-Control[^>]*immutable/.test(actualContent),
);

// 2. _next/static/* stays immutable (content-hashed per build).
check(
  "_next/static → immutable",
  /Cache-Control "public, max-age=31536000, immutable" "expr=%\{REQUEST_URI\} =~ m#\^\/_next\/static\/#"/.test(
    actualContent,
  ),
);

// 3. sw.js explicitly no-cache (never immutable / never long-lived).
check(
  "sw.js → no-cache, must-revalidate",
  /Cache-Control "no-cache, must-revalidate" "expr=%\{REQUEST_URI\} =~ m#\^\/sw\\\.js\$#"/.test(
    actualContent,
  ),
);

// 4. Media outside _next gets a week-long revalidate tier.
check(
  "media → max-age=604800 with revalidation",
  /Cache-Control "public, max-age=604800, must-revalidate"/.test(actualContent),
);

// 5. API responses are no-store (live DB data).
check(
  "/api/ → no-store",
  /Cache-Control "no-store" "expr=%\{REQUEST_URI\} =~ m#\^\/api\/#"/.test(
    actualContent,
  ),
);

// 6. HTML documents always revalidate.
check(
  "html → max-age=0, must-revalidate",
  /Cache-Control "public, max-age=0, must-revalidate"/.test(actualContent),
);

// 7. Security headers (pre-existing) survive untouched.
check(
  "security headers intact",
  actualContent.includes("Strict-Transport-Security") &&
    actualContent.includes("Content-Security-Policy") &&
    actualContent.includes("Referrer-Policy"),
);

console.log(fails === 0 ? "\n✓ all Cache-Control checks passed" : `\n✗ ${fails} check(s) failed`);

if (fails > 0) process.exit(1);