/**
 * refresh-shots.mjs — re-capture the visual reference set in .shots/.
 *
 * WHY THIS EXISTS
 * The .shots/ PNGs are gitignored, which means nothing ever regenerated them.
 * They drifted for a long time and were still showing a hero that had been
 * deleted (the two-line OMID/SINISTEROID lockup with a SYSTEM STATUS card),
 * which makes visual review worse than useless: you argue about a layout
 * nobody is shipping any more. A reference set that silently expires is a
 * trap, so the capture is a script you re-run rather than a folder you hope
 * is current.
 *
 * WHAT IT DOES
 * Serves out/ over HTTP (the same static export that ships), then captures
 * each route at desktop AND mobile, full-page, in BOTH themes — so a change
 * that only breaks one edition or one breakpoint is visible in the diff of
 * the folder rather than in production.
 *
 * Usage:  npm run shots
 *         npm run shots -- /en/,/fa/contact/     (subset)
 *
 * Requires a build first (npm run build && npm run prepare-cpanel) — it
 * shoots the export, not the source.
 */
import fs from "node:fs";
import path from "node:path";
import http from "node:http";
import { fileURLToPath } from "node:url";
import puppeteer from "puppeteer-core";
import { Launcher } from "chrome-launcher";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const outDir = path.join(root, "out");
const shotsDir = path.join(root, ".shots");

if (!fs.existsSync(path.join(outDir, "en", "index.html"))) {
  console.error(
    "✗ out/ has no export to shoot.\n  Run `npm run build && npm run prepare-cpanel` first."
  );
  process.exit(1);
}

const DEFAULT_ROUTES = [
  "/en/",
  "/fa/",
  "/en/blog/",
  "/en/showcase/",
  "/en/skills/",
  "/en/contact/",
  "/en/lab/",
];
const routes = (process.argv[2] ? process.argv[2].split(",") : DEFAULT_ROUTES).map((r) =>
  r.trim()
).filter(Boolean);

/* viewports keyed by preset; fullPage so a fold-only crop can't hide a
   regression that starts below the fold. */
const VIEWPORTS = {
  desktop: { width: 1440, height: 900, deviceScaleFactor: 1 },
  mobile: { width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true },
};

const TYPES = {
  ".html": "text/html",
  ".css": "text/css",
  ".js": "text/javascript",
  ".json": "application/json",
  ".xml": "application/xml",
  ".txt": "text/plain",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".svg": "image/svg+xml",
  ".woff2": "font/woff2",
};

const server = http.createServer((req, res) => {
  const url = decodeURIComponent((req.url ?? "/").split("?")[0]);
  let file = path.join(outDir, url);
  if (fs.existsSync(file) && fs.statSync(file).isDirectory()) {
    file = path.join(file, "index.html");
  }
  // Contain to out/ — a crafted path must not escape the export root.
  if (!file.startsWith(outDir) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) {
    res.writeHead(404);
    res.end("not found");
    return;
  }
  res.writeHead(200, { "content-type": TYPES[path.extname(file)] ?? "application/octet-stream" });
  fs.createReadStream(file).pipe(res);
});

await new Promise((r) => server.listen(0, "127.0.0.1", r));
const base = `http://127.0.0.1:${server.address().port}`;
fs.mkdirSync(shotsDir, { recursive: true });

const executablePath = Launcher.getInstallations()[0];

/* Ad-hoc single-element capture, for inspecting one component without
   eyeballing a 6000px full-page shot. Handled BEFORE the route loop, because
   argv[2] here is a flag rather than a route:
     node scripts/tools/refresh-shots.mjs --el /en/ ".post-strip" strip.png
   Its browser is launched and closed INSIDE this branch — a browser opened
   at module scope would outlive the branch and hang the process. */
if (process.argv[2] === "--el") {
  const [, , , route, selector, outName] = process.argv;
  const b = await puppeteer.launch({ executablePath, args: ["--no-sandbox", "--hide-scrollbars"] });
  const p = await b.newPage();
  await p.setViewport(VIEWPORTS.desktop);
  await p.goto(`${base}${route}`, { waitUntil: "networkidle0" });
  await p.mouse.move(VIEWPORTS.desktop.width / 2, VIEWPORTS.desktop.height / 2);
  await p.mouse.wheel({ deltaY: 1 });
  await p.evaluate(() => document.fonts.ready);
  const el = await p.$(selector);
  if (!el) {
    console.error(`✗ no element matches ${selector} on ${route}`);
    process.exitCode = 1;
  } else {
    await el.screenshot({ path: path.join(shotsDir, outName) });
    console.log(`  + ${outName} (${selector})`);
  }
  await b.close();
  server.close();
} else {
const browser = await puppeteer.launch({
  executablePath,
  args: ["--no-sandbox", "--force-color-profile=srgb", "--hide-scrollbars"],
});

let shots = 0;
try {
  for (const [label, viewport] of Object.entries(VIEWPORTS)) {
    const page = await browser.newPage();
    await page.setViewport(viewport);
    for (const route of routes) {
      for (const theme of ["dark", "light"]) {
        await page.emulateMediaFeatures([
          { name: "prefers-color-scheme", value: theme },
          { name: "prefers-reduced-motion", value: "no-preference" },
        ]);
        // The theme flip is persisted in localStorage and restored by the
        // inline THEME_INIT script, so set it before any navigation.
        await page.goto(`${base}${route}`, { waitUntil: "networkidle0" });
        await page.evaluate((t) => localStorage.setItem("theme", t), theme);
        await page.goto(`${base}${route}`, { waitUntil: "networkidle0" });
        /* Wake the deferred shells before capturing, or the shot is full of
           holes. LazyMount(mode="interaction") listens for pointerdown /
           keydown / wheel / touchstart, and ScrollLazy loads on
           IntersectionObserver — so a purely passive capture renders a page
           with entire decorative sections missing (the skill constellation
           and module deck just blank out, leaving a tall black void). Drive a
           real wheel event, walk the page so observers fire, then return to
           the top: the reveal wrappers latch once shown, so the full-page
           shot below is complete. */
        await page.mouse.move(viewport.width / 2, viewport.height / 2);
        await page.mouse.wheel({ deltaY: 1 });
        await page.evaluate(async () => {
          const step = Math.max(200, window.innerHeight * 0.8);
          for (let y = 0; y < document.body.scrollHeight; y += step) {
            window.scrollTo(0, y);
            await new Promise((r) => setTimeout(r, 90));
          }
          window.scrollTo(0, 0);
        });
        // Fonts are base64 data URIs with display:block, plus preloaded Cairo
        // on /fa/ — wait for the document to be fully rendered before capture,
        // or Persian pages shoot with fallback glyphs.
        await page.evaluate(() => document.fonts.ready);
        await new Promise((r) => setTimeout(r, 700));
        const slug = route.replace(/^\/|\/$/g, "").replace(/[^\w-]+/g, "-") || "home";
        const file = path.join(shotsDir, `${slug}-${label}-${theme}.png`);
        await page.screenshot({ path: file, fullPage: true });
        shots += 1;
        console.log(`  + ${path.basename(file)}`);
      }
    }
    await page.close();
  }
} finally {
  await browser.close();
  server.close();
}

console.log(`✓ ${shots} screenshots → .shots/ (${routes.length} routes × 2 viewports × 2 themes)`);
}