/**
 * indexnow.mjs — submit the site's URLs to IndexNow (Bing / Yandex / Seznam /
 * DuckDuckGo-backed engines) after a deploy.
 *
 * Usage:  npm run indexnow            (submits every URL in out/sitemap.xml)
 *         npm run indexnow /en/blog/… /fa/…   (submit specific paths)
 *
 * The shared key file (public/<key>.txt) must be reachable at
 * https://sinisteroid.ir/<key>.txt — it ships with the static export.
 * Run AFTER `npm run deploy` has uploaded the new build.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const SITE = "https://sinisteroid.ir";

const keyFile = fs
  .readdirSync(path.join(root, "public"))
  .find((f) => /^[0-9a-f]{32}\.txt$/.test(f));
if (!keyFile) {
  console.error("✗ No IndexNow key file (public/<32-hex>.txt) found.");
  process.exit(1);
}
const key = keyFile.replace(/\.txt$/, "");

const sitemapPath = path.join(root, "out", "sitemap.xml");
if (!fs.existsSync(sitemapPath)) {
  console.error("✗ out/sitemap.xml not found — run `npm run build` first.");
  process.exit(1);
}
const sitemap = fs.readFileSync(sitemapPath, "utf8");
const sitemapUrls = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map(
  (m) => m[1]
);

// CLI args may be absolute URLs or site-relative paths
const extra = process.argv
  .slice(2)
  .map((a) => (a.startsWith("http") ? a : `${SITE}/${a.replace(/^\/+/, "")}`));

const urlList = [...new Set([...extra, ...sitemapUrls])];
console.log(`IndexNow: submitting ${urlList.length} URLs with key ${key}…`);

const res = await fetch("https://api.indexnow.org/IndexNow", {
  method: "POST",
  headers: { "Content-Type": "application/json; charset=utf-8" },
  body: JSON.stringify({
    host: "sinisteroid.ir",
    key,
    keyLocation: `${SITE}/${keyFile}`,
    urlList,
  }),
  signal: AbortSignal.timeout(30000),
});

if (res.ok || res.status === 202) {
  console.log(`✓ IndexNow accepted the submission (HTTP ${res.status}).`);
} else if (res.status === 400 || res.status === 403) {
  console.error(
    `✗ IndexNow rejected the submission (HTTP ${res.status}). Verify the key file is live at ${SITE}/${keyFile}`
  );
  process.exit(1);
} else {
  console.error(`✗ IndexNow responded HTTP ${res.status} — retry later.`);
  process.exit(1);
}
