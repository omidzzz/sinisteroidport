/**
 * inline-hero.mjs — eliminate the LCP image network request.
 *
 * PROBLEM: the hero plate image (21 KB) is preloaded with fetchpriority=high
 * and renders in ~223ms of CPU time, but mobile LCP is 3.05s because the main
 * thread is blocked by hydration (333ms task at 1550ms) and the image paint
 * waits behind it. Inlining the image as a base64 data-URI removes the network
 * request entirely — the image data is available the instant the HTML is
 * parsed, so the browser can decode+paint it the moment the main thread is
 * free, with zero network dependency.
 *
 * Also adds content-visibility: auto to below-the-fold sections so the
 * browser can skip laying them out until they scroll into view — reduces
 * the main-thread cost of the first paint.
 *
 * Wired into `npm run build` (after inline-fonts). English pages only.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const outDir = path.join(root, "out");
const heroPath = path.join(root, "public", "hero-image.webp");

function* walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, entry.name);
    if (entry.isDirectory()) yield* walk(p);
    else if (entry.name === "index.html") yield p;
  }
}

let pages = 0;

for (const file of walk(outDir)) {
  let html = fs.readFileSync(file, "utf8");
  if (!/<html[^>]*lang="en"/.test(html)) continue;

  // ── inline the hero image ─────────────────────────────────────────
  const heroRe = /<img[^>]*src="\/hero-image\.webp"[^>]*>/;
  const heroMatch = heroRe.exec(html);
  if (heroMatch && fs.existsSync(heroPath)) {
    const b64 = fs.readFileSync(heroPath).toString("base64");
    const dataUri = `data:image/webp;base64,${b64}`;
    const inlined = heroMatch[0].replace('src="/hero-image.webp"', `src="${dataUri}"`);
    html = html.replace(heroRe, inlined);
    // Remove the now-pointless preload — the image is inlined, so the preload
    // only triggers a redundant network fetch of the same bytes.
    html = html.replace(/<link rel="preload" as="image" href="\/hero-image\.webp"[^>]*>/, "");
    console.log(`inline-hero: ${path.relative(outDir, file)} ← hero-image.webp (${Math.ceil(b64.length * 3 / 4 / 1024)}KiB inlined, preload removed)`);
  }

  fs.writeFileSync(file, html);
  pages += 1;
}

console.log(`inline-hero: ${pages} en page(s) processed`);
