/**
 * LAPTOP DECK — generated keyframes + `<style>` payload for the infinite
 * neon command loop. Pure string generation from the timing engine; the
 * component just injects STYLE once.
 *
 * Performance rules baked in here:
 *   - keycaps animate `transform` only (one multi-step keyframe per key,
 *     never per-press node duplicates)
 *   - neon strobes are overlay rects animating `opacity` only, with a
 *     STATIC drop-shadow filter — filters are never animated
 *   - all keyframes are monotonic + clamped to the loop window (CSS drops
 *     out-of-order / >100% keyframe selectors)
 */
import { COMMANDS, CYCLE, CW, PRESSED, pct } from "./timing";

const kf: string[] = [];

/* Monotonic, cycle-clamped keyframe builder. Steps at/after the loop seam
   are dropped; the 0%/100% base forces the resting state so overflowing
   windows self-terminate. Near-simultaneous steps are nudged apart — CSS
   silently drops keyframes whose percentages are not strictly increasing. */
const buildKF = (name: string, base: string, steps: [number, string][]) => {
  const limit = CYCLE - 0.05;
  const valid = steps.filter(([t]) => t < limit).sort((a, b) => a[0] - b[0]);
  let last = -1;
  let body = "";
  for (const [t, decl] of valid) {
    const tc = Math.max(t, last + 0.02);
    if (tc >= limit) break;
    last = tc;
    body += `${pct(tc)}{${decl}}`;
  }
  kf.push(`@keyframes ${name}{${base}${body}}`);
};

/* keycap press (transform only) + tri-color neon strobe overlays
   (opacity only, staggered acid -> magenta -> cyan like the old fill swap) */
for (const [id, times] of Object.entries(PRESSED)) {
  buildKF(
    `lp-k${id}`,
    "0%,100%{transform:translateY(0)}",
    times.flatMap((t): [number, string][] => [
      [t, "transform:translateY(2.6px)"],
      [t + 0.09, "transform:translateY(0)"],
    ])
  );
  const glow = (on: number, off: number, phase: string) =>
    buildKF(
      `lp-g${phase}${id}`,
      "0%,100%{opacity:0}",
      times.flatMap((t): [number, string][] => [
        [t + on, "opacity:1"],
        [t + off, "opacity:0"],
      ])
    );
  glow(0, 0.45, "a");
  glow(0.5, 0.9, "m");
  glow(0.95, 1.4, "c");
}

/* screen characters per command: type in, hold, then delete one by one */
COMMANDS.forEach((cmd, ci) => {
  cmd.chars.forEach((ch, i) => {
    if (ch === " ") return;
    const delT = cmd.bsT[cmd.chars.length - 1 - i]; // end characters delete first
    buildKF(`lp-c${ci}-${i}`, "", [
      [0, "opacity:0;transform:scale(1)"],
      [cmd.charT[i], "opacity:1;transform:scale(1)"],
      [delT - 0.02, "opacity:1;transform:scale(1)"],
      [delT, "opacity:1;transform:scale(1.2)"],
      [delT + 0.03, "opacity:0;transform:scale(0.5)"],
      [CYCLE - 0.04, "opacity:0;transform:scale(1)"],
    ]);
  });
});

/* cursor: blinks, steps along the line as characters land, steps back during
   each command's backspace, then returns home for the next command */
kf.push("@keyframes lp-cur{0%,100%{opacity:1}50%{opacity:0}}");
{
  const steps: [number, string][] = [[0, "transform:translateX(0)"]];
  COMMANDS.forEach((cmd) => {
    cmd.chars.forEach((_, i) => {
      steps.push([cmd.charT[i], `transform:translateX(${((i + 1) * CW).toFixed(1)}px)`]);
    });
    for (let i = cmd.chars.length - 1; i >= 0; i--) {
      steps.push([
        cmd.bsT[cmd.chars.length - 1 - i] + 0.04,
        `transform:translateX(${(i * CW).toFixed(1)}px)`,
      ]);
    }
  });
  steps.push([CYCLE - 0.04, "transform:translateX(0)"]);
  buildKF("lp-curstep", "", steps);
}

/* per-command output groups: appear on Enter, re-flash on run, fade on backspace */
COMMANDS.forEach((cmd, ci) => {
  kf.push(
    `@keyframes lp-run${ci}{0%,${pct(cmd.enterT - 0.01)}{opacity:0}${pct(cmd.enterT)}{opacity:1}` +
      `${pct(cmd.runT - 0.01)}{opacity:0}${pct(cmd.runT)}{opacity:1}${pct(cmd.holdEnd)}{opacity:1}` +
      `${pct(cmd.bsStart + 0.15)}{opacity:0}to{opacity:0}}`
  );
});

/* equalizer bars dance during every run window, rest in between */
for (let i = 0; i < 5; i++) {
  const steps: [number, string][] = [[0, "transform:scaleY(0.15)"]];
  COMMANDS.forEach((cmd) => {
    const ta = cmd.runT + 0.25 + ((i * 0.37) % 1.2);
    steps.push([ta, "transform:scaleY(0.95)"]);
    steps.push([Math.min(ta + 0.3, cmd.holdEnd - 0.1), "transform:scaleY(0.3)"]);
    steps.push([Math.min(ta + 0.6, cmd.holdEnd), "transform:scaleY(0.85)"]);
    steps.push([cmd.bsStart, "transform:scaleY(0.45)"]);
    steps.push([cmd.bsStart + 0.3, "transform:scaleY(0.15)"]);
  });
  steps.push([CYCLE - 0.04, "transform:scaleY(0.15)"]);
  buildKF(`lp-eq${i}`, "", steps);
}

/* eq/output-group visibility: shown only during run windows */
{
  const steps: [number, string][] = [[0, "opacity:0"]];
  COMMANDS.forEach((cmd) => {
    steps.push(
      [cmd.runT - 0.01, "opacity:0"],
      [cmd.runT, "opacity:1"],
      [cmd.bsStart + 0.15, "opacity:0"]
    );
  });
  steps.push([CYCLE - 0.04, "opacity:0"]);
  buildKF("lp-eqshow", "", steps);
}

/* screen-wide flash on Enter + brighter light spill on the deck while the
   dev server "runs" (B2) */
{
  const flash: [number, string][] = [[0, "opacity:0"]];
  const spill: [number, string][] = [[0, "opacity:0"]];
  COMMANDS.forEach((cmd) => {
    flash.push(
      [cmd.enterT - 0.01, "opacity:0"],
      [cmd.enterT, "opacity:0.22"],
      [cmd.enterT + 0.35, "opacity:0"]
    );
    spill.push(
      [cmd.runT - 0.01, "opacity:0"],
      [cmd.runT, "opacity:1"],
      [cmd.bsStart, "opacity:1"],
      [cmd.bsStart + 0.3, "opacity:0"]
    );
  });
  flash.push([CYCLE - 0.04, "opacity:0"]);
  spill.push([CYCLE - 0.04, "opacity:0"]);
  buildKF("lp-flash", "", flash);
  buildKF("lp-spill", "", spill);
}

/* subtle deck shake on every backspace press (B5) */
{
  const steps: [number, string][] = [[0, "transform:translateY(0)"]];
  PRESSED.BACKSPACE.forEach((t) => {
    steps.push([t, "transform:translateY(0.45px)"], [t + 0.04, "transform:translateY(0)"]);
  });
  steps.push([CYCLE - 0.04, "transform:translateY(0)"]);
  buildKF("lp-shake", "", steps);
}

/* ambient rave pulses — smooth sine-like easing */
kf.push("@keyframes lp-pulse{0%,100%{opacity:.3;transform:scale(1)}50%{opacity:1;transform:scale(1.1)}}");
kf.push("@keyframes lp-strip{0%,100%{opacity:.15;transform:scaleX(.95)}50%{opacity:.8;transform:scaleX(1.05)}}");
kf.push("@keyframes lp-drift{0%{transform:translateY(8px) scale(.8);opacity:0}18%{opacity:.9;transform:translateY(0) scale(1)}78%{opacity:.45}100%{transform:translateY(-30px) scale(.6);opacity:0}}");
kf.push("@keyframes lp-haze{0%,100%{opacity:.45;transform:scale(1)}50%{opacity:.9;transform:scale(1.1)}}");
kf.push("@keyframes lp-flicker{0%{opacity:0.02}50%{opacity:0.05}100%{opacity:0.02}}");
/* long, slow idle breathing dim over the whole scene (C3) */
kf.push("@keyframes lp-dim{0%,52%{opacity:0}68%{opacity:.08}84%,100%{opacity:0}}");

/* embellishments: HUD corner brackets, ambient chassis halo, floor scan sweep,
   trackpad sticker pulse — all opacity/scale, no attribute-transform conflicts */
kf.push("@keyframes lp-hudpulse{0%,100%{opacity:.3}50%{opacity:.85}}");
kf.push("@keyframes lp-halo{0%,100%{opacity:.22;transform:scale(1)}50%{opacity:.42;transform:scale(1.035)}}");
kf.push("@keyframes lp-sweep{0%{transform:translate(-70px,-70px);opacity:0}8%{opacity:.55}50%{opacity:.75}92%{opacity:.55}100%{transform:translate(70px,70px);opacity:0}}");
kf.push("@keyframes lp-stickerpulse{0%,100%{opacity:.75}50%{opacity:1}}");

export const STYLE = [
  "/* LaptopDeck — GPU-accelerated neon animations */",
  /* neon hues ride the site theme tokens (B4); magenta is deck-local */
  ".lp-root{--lp-acid:var(--color-acid,#b8ff00);--lp-cyan:var(--color-accent,#00e5ff);--lp-mag:#ff2bd6;transition:transform .25s cubic-bezier(.2,.8,.2,1)}",
  ".lp-ch{opacity:0;transform-box:fill-box;transform-origin:50% 50%}",
  ".lp-eq{transform-box:fill-box;transform-origin:50% 100%;will-change:transform}",
  ".lp-kglow{opacity:0;pointer-events:none}",
  ".lp-pt{animation:lp-drift 4.2s cubic-bezier(.4,0,.2,1) infinite;transform-box:fill-box;transform-origin:center;will-change:transform,opacity}",
  ".lp-st1{animation:lp-strip 2.4s cubic-bezier(.4,0,.2,1) infinite;transform-box:fill-box;transform-origin:center}",
  ".lp-st2{animation:lp-strip 2.4s cubic-bezier(.4,0,.2,1) infinite;animation-delay:-1.2s;transform-box:fill-box;transform-origin:center}",
  ".lp-led{animation:lp-pulse 1.6s cubic-bezier(.4,0,.2,1) infinite;transform-box:fill-box;transform-origin:center}",
  ".lp-hz{animation:lp-haze 7s cubic-bezier(.4,0,.2,1) infinite;transform-box:fill-box;transform-origin:center}",
  ".lp-screen-flicker{animation:lp-flicker 0.15s steps(2) infinite}",
  ".lp-dim{pointer-events:none}",
  ".lp-hud{animation:lp-hudpulse 3.4s cubic-bezier(.4,0,.2,1) infinite}",
  ".lp-halo{animation:lp-halo 5.2s cubic-bezier(.4,0,.2,1) infinite;transform-box:fill-box;transform-origin:center}",
  ".lp-sweep{animation:lp-sweep 6.4s cubic-bezier(.4,0,.2,1) infinite}",
  ".lp-sticker{animation:lp-stickerpulse 2.8s cubic-bezier(.4,0,.2,1) infinite}",
  /* pause every animation while the deck is scrolled out of view (A3) */
  ".lp-paused *{animation-play-state:paused!important}",
  /* .lp-svg filter lives in src/styles/console-bay.css (theme-aware);
     avoid duplicating it here. */
  "@media (prefers-reduced-motion: reduce){" +
    ".lp-ch{opacity:1;animation:none!important}" +
    ".lp-eq{animation:none!important;transform:scaleY(.35)}" +
    ".lp-eqshow{animation:none!important;opacity:1}" +
    ".lp-cur-el{animation:none!important;opacity:1}" +
    ".lp-kglow{animation:none!important;opacity:0!important}" +
    ".lp-pt,.lp-st1,.lp-st2,.lp-led,.lp-hz,.lp-screen-flicker,.lp-dim,.lp-hud,.lp-halo,.lp-sweep,.lp-sticker{animation:none!important}" +
    "}",
  ...kf,
].join("");