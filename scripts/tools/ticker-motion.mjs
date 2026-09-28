/**
 * ticker-motion.mjs — prove the hero ticker actually MOVES.
 *
 * Reads the composited transform of .craft-ticker-track twice, ~1.1s apart,
 * and fails if the matrix is identical (i.e. the marquee is parked). Also
 * asserts the off-screen pause lands, and that reduced-motion stops the
 * ticker (the hero's live dot and signal bars went with the status panel).
 *
 * This is the regression guard for the "ticker only moves on hover" bug:
 * a static stylesheet assertion cannot catch it, because the animation
 * property is still declared — only its play-state and the coarse-pointer
 * override were wrong. Only a real compositor reading the matrix can.
 *
 * Usage:
 *   node scripts/tools/serve-out.mjs --port 4173 --root out
 *   npm run verify:ticker -- http://127.0.0.1:4173
 */
import puppeteer from "puppeteer-core";
import { Launcher } from "chrome-launcher";

const base = process.argv[2] ?? "http://127.0.0.1:4173";
let pass = 0;
let fail = 0;

function check(name, ok, detail = "") {
  console.log(`  ${ok ? "ok  " : "FAIL"} ${name}${detail ? "  " + detail : ""}`);
  ok ? pass++ : fail++;
}

const executablePath = Launcher.getInstallations()[0];
const browser = await puppeteer.launch({
  executablePath,
  args: ["--no-sandbox"],
  defaultViewport: { width: 1280, height: 900 },
});

try {
  for (const route of ["/en/", "/fa/"]) {
    const page = await browser.newPage();
    await page.goto(`${base}${route}`, { waitUntil: "networkidle2", timeout: 45000 });
    await new Promise((r) => setTimeout(r, 600));

    const read = () =>
      page.$eval(".craft-ticker-track", (el) => {
        const cs = getComputedStyle(el);
        return {
          transform: cs.transform,
          playState: cs.animationPlayState,
          name: cs.animationName,
        };
      });

    const a = await read();
    await new Promise((r) => setTimeout(r, 1100));
    const b = await read();

    console.log(`\n=== ${route} ===`);
    check(`${route} animation is named`, a.name !== "none", a.name);
    check(`${route} play-state is running`, a.playState === "running", a.playState);
    check(
      `${route} transform ADVANCES (moves with NO hover)`,
      a.transform !== b.transform,
      `${a.transform} -> ${b.transform}`
    );

    // Scrolled to the very bottom: the ticker must have parked.
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await new Promise((r) => setTimeout(r, 900));
    const off = await read();
    check(
      `${route} pauses when scrolled out of view`,
      off.playState === "paused",
      off.playState
    );
    await page.close();
  }

  // Reduced motion must not animate at all.
  const rm = await browser.newPage();
  await rm.emulateMediaFeatures([
    { name: "prefers-reduced-motion", value: "reduce" },
  ]);
  await rm.goto(`${base}/en/`, { waitUntil: "networkidle2", timeout: 45000 });
  const r1 = await rm.$eval(".craft-ticker-track", (el) => {
    const cs = getComputedStyle(el);
    return { name: cs.animationName, t: cs.transform };
  });
  await new Promise((r) => setTimeout(r, 900));
  const r2 = await rm.$eval(".craft-ticker-track", (el) => getComputedStyle(el).transform);
  console.log("\n=== reduced motion ===");
  check(
    "reduced-motion stops the ticker",
    r1.name === "none" || r1.t === r2,
    `${r1.name} ${r1.t} -> ${r2}`
  );

  await rm.close();
} finally {
  await browser.close();
}

console.log(`\n${pass}/ ticker assertions passed.`);
process.exit(fail === 0 ? 0 : 1);
