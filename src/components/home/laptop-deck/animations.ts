/**
 * LAPTOP DECK — generated keyframes + `<style>` payload for the infinite
 * neon typing loop. Pure string generation from the timing engine; the
 * component just injects STYLE once.
 */
import {
  BACKSPACE_START,
  BACKSPACE_T,
  CHAR_T,
  CHARS,
  CW,
  ENTER_T,
  HOLD_T,
  PRESSED,
  RUN_T,
  pct,
} from "./timing";

const kf: string[] = [];

/* key press + neon strobe (acid -> magenta -> cyan) with enhanced glow */
for (const id of Object.keys(PRESSED)) {
  (PRESSED[id] as number[]).forEach((t, i) => {
    kf.push(
      `@keyframes lp-k${id}${i}{0%,100%{transform:translateY(0)}${pct(t)}{transform:translateY(2.6px)}${pct(t + 0.09)}{transform:translateY(0)}}`
    );
    kf.push(
      `@keyframes lp-g${id}${i}{0%,100%{fill:#18243c}` +
        `${pct(t)}{fill:#eaffb0;filter:drop-shadow(0 0 3px #b8ff00)}` +
        `${pct(t + 0.15)}{fill:#b8ff00;filter:drop-shadow(0 0 6px #b8ff00)}` +
        `${pct(t + 0.5)}{fill:#ff2bd6;filter:drop-shadow(0 0 6px #ff2bd6)}` +
        `${pct(t + 0.9)}{fill:#00e5ff;filter:drop-shadow(0 0 4px #00e5ff)}` +
        `${pct(t + 1.4)}{fill:#18243c;filter:none}}`
    );
  });
}

/* screen characters: type in, hold, then delete one by one with backspace */
/* Characters at the end delete first (v, e, d, space, n, u, r, space, m, p, n) */
for (let i = 0; i < CHARS.length; i++) {
  const deleteTime = BACKSPACE_T[CHARS.length - 1 - i]; // Delete from end to start
  kf.push(
    `@keyframes lp-c${i}{` +
      `0%{opacity:0;transform:scale(1)}` +
      `${pct(CHAR_T[i])}{opacity:1;transform:scale(1)}` +
      `${pct(deleteTime - 0.02)}{opacity:1;transform:scale(1)}` +
      `${pct(deleteTime)}{opacity:1;transform:scale(1.2)}` +
      `${pct(deleteTime + 0.03)}{opacity:0;transform:scale(0.5)}` +
      `to{opacity:0;transform:scale(1)}}`
  );
}

/* cursor: blinks, steps along the line as characters land, then steps back during backspace */
kf.push("@keyframes lp-cur{0%,100%{opacity:1}50%{opacity:0}}");
{
  let steps = "0%{transform:translateX(0)}";
  // Step forward as characters are typed
  CHARS.forEach((_, i) => {
    steps += `${pct(CHAR_T[i])}{transform:translateX(${((i + 1) * CW).toFixed(1)}px)}`;
  });
  // Step backward as characters are deleted
  for (let i = CHARS.length - 1; i >= 0; i--) {
    const deleteTime = BACKSPACE_T[CHARS.length - 1 - i];
    steps += `${pct(deleteTime + 0.04)}{transform:translateX(${(i * CW).toFixed(1)}px)}`;
  }
  steps += `to{transform:translateX(0)}`;
  kf.push(`@keyframes lp-curstep{${steps}}`);
}

/* "ready" status: flash on enter, re-fire on run, fade when backspace starts */
kf.push(
  `@keyframes lp-run{0%,${pct(ENTER_T - 0.01)}{opacity:0}${pct(ENTER_T)}{opacity:1}${pct(RUN_T - 0.01)}{opacity:0}` +
    `${pct(RUN_T)}{opacity:1}${pct(BACKSPACE_START - 0.15)}{opacity:1}${pct(BACKSPACE_START + 0.15)}{opacity:0}to{opacity:0}}`
);

/* equalizer bars dance while the dev-server "runs", then rest until backspace */
for (let i = 0; i < 5; i++) {
  const ta = RUN_T + 0.25 + ((i * 0.37) % 1.6);
  kf.push(
    `@keyframes lp-eq${i}{0%,${pct(RUN_T - 0.3)}{transform:scaleY(0.15)}` +
      `${pct(ta)}{transform:scaleY(0.95)}${pct(ta + 0.3)}{transform:scaleY(0.3)}` +
      `${pct(Math.min(ta + 0.6, HOLD_T - 0.15))}{transform:scaleY(0.85)}` +
      `${pct(HOLD_T + 0.1)}{transform:scaleY(0.35)}${pct(BACKSPACE_START)}{transform:scaleY(0.45)}` +
      `${pct(BACKSPACE_START + 0.3)}{transform:scaleY(0.15)}to{transform:scaleY(0.15)}}`
  );
}

/* ambient rave pulses — smooth sine-like easing */
kf.push("@keyframes lp-pulse{0%,100%{opacity:.3;transform:scale(1)}50%{opacity:1;transform:scale(1.1)}}");
kf.push("@keyframes lp-strip{0%,100%{opacity:.15;transform:scaleX(.95)}50%{opacity:.8;transform:scaleX(1.05)}}");
kf.push("@keyframes lp-drift{0%{transform:translateY(8px) scale(.8);opacity:0}18%{opacity:.9;transform:translateY(0) scale(1)}78%{opacity:.45}100%{transform:translateY(-30px) scale(.6);opacity:0}}");
kf.push("@keyframes lp-haze{0%,100%{opacity:.45;transform:scale(1)}50%{opacity:.9;transform:scale(1.1)}}");
kf.push("@keyframes lp-flicker{0%{opacity:0.02}50%{opacity:0.05}100%{opacity:0.02}}");

export const STYLE = [
  "/* LaptopDeck — GPU-accelerated neon animations */",
  ".lp-ch{opacity:0;will-change:opacity,transform;transform-box:fill-box;transform-origin:50% 50%}",
  ".lp-eq{transform-box:fill-box;transform-origin:50% 100%;will-change:transform}",
  ".lp-pt{animation:lp-drift 4.2s cubic-bezier(.4,0,.2,1) infinite;transform-box:fill-box;transform-origin:center;will-change:transform,opacity}",
  ".lp-st1{animation:lp-strip 2.4s cubic-bezier(.4,0,.2,1) infinite}",
  ".lp-st2{animation:lp-strip 2.4s cubic-bezier(.4,0,.2,1) infinite;animation-delay:-1.2s}",
  ".lp-led{animation:lp-pulse 1.6s cubic-bezier(.4,0,.2,1) infinite}",
  ".lp-hz{animation:lp-haze 7s cubic-bezier(.4,0,.2,1) infinite}",
  ".lp-screen-flicker{animation:lp-flicker 0.15s steps(2) infinite}",
  ".lp-svg{filter:drop-shadow(0 0 20px rgba(184,255,0,.15)) drop-shadow(0 0 40px rgba(255,43,214,.1))}",
  "@media (prefers-reduced-motion: reduce){.lp-ch{opacity:1}.lp-pt,.lp-st1,.lp-st2,.lp-led,.lp-hz,.lp-screen-flicker{animation:none}}",
  ...kf,
].join("");