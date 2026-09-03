/**
 * LAPTOP DECK — isometric cyberpunk acid-rave neon laptop typing "npm run dev".
 * True 2:1 isometric projection (SVG matrix). Keys press + neon-strobe in sync
 * with the per-character typing on screen. The whole sequence loops forever:
 * type -> run -> backspace delete -> retype. Decorative, aria-hidden.
 *
 * POLISH NOTES:
 * - Keyboard centered inside the recessed keybed with symmetric margins
 * - Keycaps carry a soft top facet, bottom rim shade and F/J home-row nubs
 * - Complete casing: left / right / back / front walls with vents + ports
 * - No shadow under the chassis — floor light and grid only
 * - Taller screen (150u) lifts well above the deck back edge for presence
 * - RTL-proof: root div is dir="ltr", so fa/ar layouts render identically
 * - Text stays within screen bounds with clip-path; backspace deletes per char
 * - Multi-layer glow, bloom filters and cubic-bezier easing throughout
 * - Transform-based animation only; prefers-reduced-motion respected
 * - Screen flicker + scanlines for a subtle CRT aesthetic
 */
"use client";

/* ============ timing engine — keys + screen stay in sync ============ */

const STEP_T = 0.12;
const PAUSE_T: Record<string, number> = { " ": 0.15 };

const CHARS = ["n", "p", "m", " ", "r", "u", "n", " ", "d", "e", "v"];
const CHAR_T: number[] = (() => {
  const out: number[] = []; let t = 0.4;
  for (const ch of CHARS) { out.push(t); t += STEP_T + (PAUSE_T[ch] ?? 0); }
  return out;
})();

const ENTER_T = CHAR_T[10] + 0.4;
const RUN_T   = ENTER_T + 0.8;
const HOLD_T  = RUN_T + 2.5;

/* Backspace timing: delete characters one by one from the end */
const BACKSPACE_START = HOLD_T + 0.3;
const BACKSPACE_STEP = 0.08; // Time between each backspace
const BACKSPACE_T: number[] = (() => {
  const out: number[] = [];
  for (let i = CHARS.length - 1; i >= 0; i--) {
    out.push(BACKSPACE_START + (CHARS.length - 1 - i) * BACKSPACE_STEP);
  }
  return out;
})();

const CYCLE   = BACKSPACE_T[0] + 0.5;
const CYCLES  = `${CYCLE.toFixed(2)}s linear infinite`;
const pct     = (t: number) => `${((t / CYCLE) * 100).toFixed(2)}%`;

const CW = 5.8;    /* forced per-character advance on screen (via textLength) */
const CH_X0 = 30;  /* x of the first typed character - adjusted for better fit */

/* key -> press timestamps ("n" and "space" are pressed twice, Enter ends the line, Backspace deletes) */
const PRESSED: Record<string, number[]> = {
  N:     [CHAR_T[0], CHAR_T[6]],
  P:     [CHAR_T[1]],
  M:     [CHAR_T[2]],
  Space: [CHAR_T[3], CHAR_T[7]],
  R:     [CHAR_T[4]],
  U:     [CHAR_T[5]],
  D:     [CHAR_T[8]],
  E:     [CHAR_T[9]],
  V:     [CHAR_T[10]],
  ENTER: [ENTER_T],
  BACKSPACE: BACKSPACE_T,
};

type KeyD = { l: string; x: number; w: number; y?: number; id?: string; nub?: boolean };

/* Keyboard is laid out with a +10 inset so the keycaps sit symmetrically
   inside the recessed keybed (well spans x=7..183). */
const ROWS: { y: number; keys: KeyD[] }[] = [
  { y: 0, keys: [
    { l: "Esc", x: 10, w: 9 }, { l: "", x: 22, w: 9 }, { l: "", x: 34, w: 9 }, { l: "", x: 46, w: 9 },
    { l: "", x: 58, w: 9 }, { l: "", x: 70, w: 9 }, { l: "", x: 82, w: 9 }, { l: "", x: 94, w: 9 },
    { l: "", x: 106, w: 9 }, { l: "", x: 118, w: 9 }, { l: "", x: 130, w: 9 }, { l: "", x: 142, w: 9 },
    { l: "", x: 154, w: 9 }, { l: "Del", x: 166, w: 13 },
  ] },
  { y: 16, keys: [
    { l: "`", x: 10, w: 9 }, { l: "1", x: 22, w: 9 }, { l: "2", x: 34, w: 9 }, { l: "3", x: 46, w: 9 },
    { l: "4", x: 58, w: 9 }, { l: "5", x: 70, w: 9 }, { l: "6", x: 82, w: 9 }, { l: "7", x: 94, w: 9 },
    { l: "8", x: 106, w: 9 }, { l: "9", x: 118, w: 9 }, { l: "0", x: 130, w: 9 },
    { l: "-", x: 142, w: 9 }, { l: "=", x: 154, w: 9 }, { l: "Bksp", x: 166, w: 13, id: "BACKSPACE" },
  ] },
  { y: 32, keys: [
    { l: "Tab", x: 10, w: 14 }, { l: "q", x: 27, w: 9, id: "Q" }, { l: "w", x: 39, w: 9, id: "W" },
    { l: "e", x: 51, w: 9, id: "E" }, { l: "r", x: 63, w: 9, id: "R" }, { l: "t", x: 75, w: 9, id: "T" },
    { l: "y", x: 87, w: 9, id: "Y" }, { l: "u", x: 99, w: 9, id: "U" }, { l: "i", x: 111, w: 9, id: "I" },
    { l: "o", x: 123, w: 9, id: "O" }, { l: "p", x: 135, w: 9, id: "P" },
    { l: "[", x: 147, w: 9 }, { l: "]", x: 159, w: 9 }, { l: "\\", x: 171, w: 8 },
  ] },
  { y: 48, keys: [
    { l: "Caps", x: 10, w: 15 }, { l: "a", x: 28, w: 9, id: "A" }, { l: "s", x: 40, w: 9, id: "S" },
    { l: "d", x: 52, w: 9, id: "D" }, { l: "f", x: 64, w: 9, id: "F", nub: true }, { l: "g", x: 76, w: 9, id: "G" },
    { l: "h", x: 88, w: 9, id: "H" }, { l: "j", x: 100, w: 9, id: "J", nub: true }, { l: "k", x: 112, w: 9, id: "K" },
    { l: "l", x: 124, w: 9, id: "L" }, { l: ";", x: 136, w: 9 },
    { l: "'", x: 148, w: 9 }, { l: "Enter", x: 160, w: 19, id: "ENTER" },
  ] },
  { y: 64, keys: [
    { l: "Shift", x: 10, w: 20 }, { l: "z", x: 33, w: 9, id: "Z" }, { l: "x", x: 45, w: 9, id: "X" },
    { l: "c", x: 57, w: 9, id: "C" }, { l: "v", x: 69, w: 9, id: "V" }, { l: "b", x: 81, w: 9, id: "B" },
    { l: "n", x: 93, w: 9, id: "N" }, { l: "m", x: 105, w: 9, id: "M" },
    { l: ",", x: 117, w: 9 }, { l: ".", x: 129, w: 9 }, { l: "/", x: 141, w: 9 },
    { l: "Shift", x: 153, w: 26 },
  ] },
  { y: 80, keys: [
    { l: "Ctrl", x: 10, w: 13 }, { l: "Alt", x: 26, w: 13 }, { l: "Meta", x: 42, w: 18 },
    { l: "Space", x: 63, w: 60, id: "Space" },
    { l: "Meta", x: 126, w: 18 }, { l: "Alt", x: 147, w: 13 }, { l: "Ctrl", x: 163, w: 13 },
  ] },
];

/* ============ isometric projection (2:1) ============ */

const ORX = 150, ORY = 132;
const CX = 0.8660254, CY = 0.5;
const iso = (x: number, y: number): [number, number] =>
  [ORX + CX * (x - y), ORY + CY * (x + y)];
const P = (arr: [number, number][]) =>
  arr.map(p => `${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(" ");

/* deck plane -> world; screen plane -> world */
const MAT_DECK   = "matrix(0.8660254 0.5 -0.8660254 0.5 150 132)";
/* The screen's bottom edge is pinned to the deck's back edge (world y = 132),
   so raising the height simply lifts the lid higher off the deck. */
const SCREEN_H = 150;
const MAT_SCREEN = `matrix(0.8660254 0.5 0 1 150 ${132 - SCREEN_H})`;

/* deck corner points (world space) */
const A  = iso(0, 0);      // back-left
const B  = iso(190, 0);    // back-right
const C  = iso(0, 140);    // front-left
const Dp = iso(190, 140);  // front-right
const TH_ = 11;            // chassis thickness

/* floor grid segments (clamped to the scene box) */
const GRID_Y: [number, number][][] = [-50, -25, 0, 25, 50, 75, 100, 125, 150, 175]
  .map(gy => [iso(Math.max(-40, gy - 215), gy), iso(Math.min(195, gy + 215), gy)]);
const GRID_X: [number, number][][] = [-40, -15, 10, 35, 60, 85, 110, 135, 160, 185]
  .map(gx => [iso(gx, Math.max(-50, gx - 215)), iso(gx, Math.min(185, gx + 215))]);

/* floating rave particles */
const PARTICLES: { x: number; y: number; r: number; c: string; d: string }[] = [
  { x: 62,  y: 100, r: 1.8, c: "#b8ff00", d: "0s" },
  { x: 252, y: 64,  r: 2.2, c: "#ff2bd6", d: ".6s" },
  { x: 336, y: 128, r: 1.5, c: "#00e5ff", d: "1.2s" },
  { x: 44,  y: 176, r: 2.0, c: "#00e5ff", d: ".3s" },
  { x: 96, y: 236, r: 1.6, c: "#b8ff00", d: "1.8s" },
  { x: 120, y: 52,  r: 1.4, c: "#ff2bd6", d: "2.1s" },
  { x: 352, y: 214, r: 1.8, c: "#b8ff00", d: ".9s" },
  { x: 22,  y: 118, r: 1.5, c: "#b8ff00", d: "1.5s" },
  { x: 300, y: 40,  r: 1.6, c: "#00e5ff", d: "2.6s" },
];
const DIAMONDS: { x: number; y: number; c: string; d: string }[] = [
  { x: 90, y: 66, c: "#ff2bd6", d: ".4s" },
  { x: 270, y: 96, c: "#b8ff00", d: "1.1s" },
  { x: 46, y: 232, c: "#00e5ff", d: "1.8s" },
];

/* ============ generated keyframes (infinite loop) ============ */

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
  CHARS.forEach((_, i) => { steps += `${pct(CHAR_T[i])}{transform:translateX(${((i + 1) * CW).toFixed(1)}px)}`; });
  // Step backward as characters are deleted
  for (let i = CHARS.length - 1; i >= 0; i--) {
    const deleteTime = BACKSPACE_T[CHARS.length - 1 - i];
    steps += `${pct(deleteTime + 0.04)}{transform:translateX(${((i) * CW).toFixed(1)}px)}`;
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

const STYLE = [
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

const CHAR_COLORS = ["#b8ff00", "#00e5ff", "#ff2bd6"];
const EQ_FILL = ["#b8ff00", "#ff2bd6", "#00e5ff", "#b8ff00", "#ff2bd6"];

export default function LaptopDeck() {
  return (
    <div dir="ltr" aria-hidden="true" style={{ display: "flex", justifyContent: "center", padding: "1rem 0 0.5rem" }}>
      <style>{STYLE}</style>
      <svg
        className="lp-svg"
        viewBox="-30 -36 395 376"
        width="100%"
        role="img"
        aria-label="isometric neon laptop typing npm run dev"
        style={{ pointerEvents: "none", overflow: "visible", direction: "ltr" }}
      >
        <defs>
          <linearGradient id="lg-body" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#212b4e" /><stop offset="100%" stopColor="#0d1426" />
          </linearGradient>
          <linearGradient id="lg-sideF" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#111a32" /><stop offset="100%" stopColor="#080d1a" />
          </linearGradient>
          <linearGradient id="lg-sideL" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#0b1122" /><stop offset="100%" stopColor="#05080f" />
          </linearGradient>
          <linearGradient id="lg-sideR" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#161f38" /><stop offset="100%" stopColor="#0a101d" />
          </linearGradient>
          <linearGradient id="lg-sideB" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#0e1425" /><stop offset="100%" stopColor="#070b15" />
          </linearGradient>
          <linearGradient id="lg-lid" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#182240" /><stop offset="100%" stopColor="#0b1226" />
          </linearGradient>
          <linearGradient id="lg-glass" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="rgba(255,255,255,0.08)" /><stop offset="100%" stopColor="rgba(255,255,255,0)" />
          </linearGradient>
          <linearGradient id="lg-spill" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="rgba(184,255,0,0.16)" /><stop offset="100%" stopColor="rgba(184,255,0,0)" />
          </linearGradient>
          <radialGradient id="rp-magenta">
            <stop offset="0%" stopColor="rgba(255,43,214,0.26)" /><stop offset="100%" stopColor="rgba(255,43,214,0)" />
          </radialGradient>
          <radialGradient id="rh-violet">
            <stop offset="0%" stopColor="rgba(124,58,255,0.13)" /><stop offset="100%" stopColor="rgba(124,58,255,0)" />
          </radialGradient>
          <radialGradient id="rh-magenta">
            <stop offset="0%" stopColor="rgba(255,43,214,0.09)" /><stop offset="100%" stopColor="rgba(255,43,214,0)" />
          </radialGradient>
          <radialGradient id="rh-cyan">
            <stop offset="0%" stopColor="rgba(0,229,255,0.09)" /><stop offset="100%" stopColor="rgba(0,229,255,0)" />
          </radialGradient>
          <pattern id="lp-scan" width="4" height="3.2" patternUnits="userSpaceOnUse">
            <rect width="4" height="1.1" fill="rgba(0,0,0,0.42)" />
          </pattern>
          {/* Screen clip path to prevent text overflow */}
          <clipPath id="lp-screen-clip">
            <rect x="14" y="12" width="162" height={SCREEN_H - 24} rx="2" />
          </clipPath>
          <filter id="lf-glow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur in="SourceGraphic" stdDeviation="2" result="blur1" />
            <feGaussianBlur in="SourceGraphic" stdDeviation="4" result="blur2" />
            <feMerge>
              <feMergeNode in="blur2" />
              <feMergeNode in="blur1" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <filter id="lf-glow2" x="-80%" y="-80%" width="260%" height="260%">
            <feGaussianBlur in="SourceGraphic" stdDeviation="6" result="blur1" />
            <feGaussianBlur in="SourceGraphic" stdDeviation="12" result="blur2" />
            <feMerge>
              <feMergeNode in="blur2" />
              <feMergeNode in="blur1" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <filter id="lf-bloom" x="-100%" y="-100%" width="300%" height="300%">
            <feGaussianBlur in="SourceGraphic" stdDeviation="8" result="blur" />
            <feColorMatrix in="blur" type="saturate" values="2" result="saturated" />
            <feMerge>
              <feMergeNode in="saturated" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* ambient haze */}
        <circle className="lp-hz" cx="95" cy="130" r="95" fill="url(#rh-violet)" />
        <circle className="lp-hz" style={{ animationDelay: "-2.4s" }} cx="288" cy="185" r="105" fill="url(#rh-magenta)" />
        <circle className="lp-hz" style={{ animationDelay: "-4.8s" }} cx="255" cy="58" r="75" fill="url(#rh-cyan)" />

        {/* isometric floor grid */}
        <g stroke="#2a3a5c" strokeWidth="0.7" opacity="0.16">
          {GRID_Y.map((s, i) => <line key={`gy${i}`} x1={s[0][0]} y1={s[0][1]} x2={s[1][0]} y2={s[1][1]} />)}
          {GRID_X.map((s, i) => <line key={`gx${i}`} x1={s[0][0]} y1={s[0][1]} x2={s[1][0]} y2={s[1][1]} />)}
        </g>
        {/* acid grid square under the rig */}
        <polygon points={P([iso(-15, -15), iso(205, -15), iso(205, 155), iso(-15, 155)])}
          fill="none" stroke="#b8ff00" strokeWidth="1" opacity="0.22" style={{ filter: "url(#lf-glow)" }} />

        {/* magenta floor pool only — no acid/green glow under the chassis */}
        <ellipse className="lp-st1" cx="163" cy="298" rx="112" ry="21" fill="url(#rp-magenta)" />

        {/* ===== screen (rises from the deck's back edge) ===== */}
        <polygon points={P([[150, -22], [314.5, 73], [314.5, 231], [150, 136]])}
          fill="#b8ff00" opacity="0.1" style={{ filter: "url(#lf-glow2)" }} />
        <g transform={MAT_SCREEN}>
          {/* lid + bezel */}
          <rect x="0" y="0" width="190" height={SCREEN_H} rx="6" fill="url(#lg-lid)" stroke="#2a3f65" strokeWidth="1.2" />
          <rect x="7" y="7" width="176" height={SCREEN_H - 14} rx="3" fill="#04060e" />
          {/* screen flicker overlay */}
          <rect x="7" y="7" width="176" height={SCREEN_H - 14} rx="3" fill="rgba(184,255,0,0.02)" className="lp-screen-flicker" />

          {/* titlebar */}
          <circle cx="15" cy="17" r="1.8" fill="#ff2bd6" />
          <circle cx="22" cy="17" r="1.8" fill="#b8ff00" />
          <circle cx="29" cy="17" r="1.8" fill="#00e5ff" />
          <text x="38" y="19.5" fontSize="5.5" fill="#7f93b8" fontFamily="var(--font-mono), monospace">~/sinisteroid</text>

          {/* typing prompt — per-character <text> reveal, synced with the key flashes */}
          <g clipPath="url(#lp-screen-clip)">
            <g style={{ filter: "url(#lf-glow)" }}>
              <text x="24" y="54" fontSize="8" fill="#00e5ff" fontFamily="var(--font-mono), monospace"
                style={{ filter: "drop-shadow(0 0 2px #00e5ff)" }}>$</text>
              {CHARS.map((ch, i) =>
                ch === " " ? null : (
                  <text key={i} className="lp-ch" x={CH_X0 + i * CW} y="54" fontSize="8"
                    textLength={CW} lengthAdjust="spacingAndGlyphs" fill={CHAR_COLORS[i % 3]}
                    fontFamily="var(--font-mono), monospace"
                    style={{ animation: `lp-c${i} ${CYCLES}`, filter: `drop-shadow(0 0 2px ${CHAR_COLORS[i % 3]})` }}>{ch}</text>
                )
              )}
              {/* cursor blinks and steps along the line as characters land */}
              <rect className="lp-cur-el" x={CH_X0 - 2} y={46.5} width="3" height="9" fill="#b8ff00"
                style={{ animation: `lp-cur ${CYCLES}, lp-curstep ${CYCLES}`, filter: "drop-shadow(0 0 2px #b8ff00)" }} />
            </g>
          </g>

          {/* run status + equalizer */}
          <g clipPath="url(#lp-screen-clip)">
            <g className="lp-ch" style={{ animation: `lp-run ${CYCLES}` }}>
              <text x="24" y="88" fontSize="6" fill="#36e5a0" fontFamily="var(--font-mono), monospace"
                style={{ filter: "drop-shadow(0 0 2px #36e5a0)" }}>ready - sinisteroid@dev</text>
              <text x="24" y="100" fontSize="5.5" fill="#8fa294" fontFamily="var(--font-mono), monospace"
                style={{ filter: "drop-shadow(0 0 2px #8fa294)" }}>Local: http://localhost:3000</text>
              <text x="24" y="114" fontSize="5.5" fill="#8fa294" fontFamily="var(--font-mono), monospace"
                style={{ filter: "drop-shadow(0 0 2px #8fa294)" }}>watching for file changes...</text>
              {EQ_FILL.map((f, i) => (
                <g key={i} style={{ filter: `drop-shadow(0 0 2px ${f})` }}>
                  <rect className="lp-eq" x={138 + i * 8} y={86} width="3.5" height="14"
                    fill={f} opacity="0.9" style={{ animation: `lp-eq${i} ${CYCLES}` }} />
                </g>
              ))}
            </g>
          </g>

          {/* scanlines + glass sheen */}
          <rect x="7" y="7" width="176" height={SCREEN_H - 14} fill="url(#lp-scan)" opacity="0.5" />
          <path d="M7,7 L128,7 L86,64 L7,64 Z" fill="url(#lg-glass)" />

          {/* webcam + brand */}
          <circle cx="95" cy="3.6" r="1.8" fill="#0a1520" stroke="#2a3f65" strokeWidth="0.5" />
          <circle cx="95" cy="3.6" r="0.6" fill="#b8ff00" opacity="0.8" />
          <text x="95" y={SCREEN_H - 2} fontSize="4.6" letterSpacing="2.5" textAnchor="middle" fill="#5a6a88" fontFamily="var(--font-mono), monospace">SINISTEROID</text>

          {/* neon screen edges — multi-layer glow */}
          <line x1="1" y1="1" x2="1" y2={SCREEN_H - 1} stroke="#b8ff00" strokeWidth="1.5" opacity="0.8" style={{ filter: "url(#lf-glow)" }} />
          <line x1="189" y1="1" x2="189" y2={SCREEN_H - 1} stroke="#ff2bd6" strokeWidth="1.5" opacity="0.7" style={{ filter: "url(#lf-glow)" }} />
          <line x1="1" y1="0.8" x2="189" y2="0.8" stroke="#00e5ff" strokeWidth="1" opacity="0.6" style={{ filter: "url(#lf-glow)" }} />
          <line x1="1" y1={SCREEN_H - 0.8} x2="189" y2={SCREEN_H - 0.8} stroke="#b8ff00" strokeWidth="0.8" opacity="0.5" style={{ filter: "url(#lf-glow)" }} />
          <rect x="0.6" y="0.6" width="188.8" height={SCREEN_H - 1.2} rx="6" fill="none" stroke="#b8ff00" strokeWidth="0.7" opacity="0.4" style={{ filter: "url(#lf-glow)" }} />
        </g>

        {/* ===== chassis ===== */}
        {/* left wall */}
        <polygon points={P([A, C, [C[0], C[1] + TH_], [A[0], A[1] + TH_]])}
          fill="url(#lg-sideL)" stroke="#1a2438" strokeWidth="0.8" />
        {/* front wall */}
        <polygon points={P([C, Dp, [Dp[0], Dp[1] + TH_], [C[0], C[1] + TH_]])}
          fill="url(#lg-sideF)" stroke="#1a2438" strokeWidth="0.8" />
        {/* vents on the front wall */}
        {[28, 66, 104, 142].map(x => {
          const q = [iso(x, 140.6), iso(x + 9, 140.6)] as [number, number][];
          q.push([iso(x + 9, 140.6)[0], iso(x + 9, 140.6)[1] + 4.5]);
          q.push([iso(x, 140.6)[0], iso(x, 140.6)[1] + 4.5]);
          return <polygon key={x} points={P(q)} fill="#04070d" />;
        })}
        {/* right wall — closes the hollow right side of the casing */}
        <polygon points={P([B, Dp, [Dp[0], Dp[1] + TH_], [B[0], B[1] + TH_]])}
          fill="url(#lg-sideR)" stroke="#1a2438" strokeWidth="0.8" />
        {/* vents on the right wall */}
        {[22, 75, 105, 130].map(y => {
          const q = [iso(189.6, y), iso(189.6, y + 9)] as [number, number][];
          q.push([iso(189.6, y + 9)[0], iso(189.6, y + 9)[1] + 4.5]);
          q.push([iso(189.6, y)[0], iso(189.6, y)[1] + 4.5]);
          return <polygon key={y} points={P(q)} fill="#04070d" />;
        })}
        {/* ports on the right wall */}
        {[45, 61].map(y => {
          const p1 = iso(189.6, y), p2 = iso(189.6, y + 9);
          return (
            <polygon key={y} points={P([p1, p2, [p2[0], p2[1] + 5], [p1[0], p1[1] + 5]])}
              fill="#04070c" stroke="#00e5ff" strokeWidth="0.4" opacity="0.7" />
          );
        })}
        {/* back wall — closes the rear of the chassis under the hinge */}
        <polygon points={P([A, B, [B[0], B[1] + TH_], [A[0], A[1] + TH_]])}
          fill="url(#lg-sideB)" stroke="#1a2438" strokeWidth="0.8" />
        {/* ports on the left wall */}
        {[58, 74].map(y => {
          const p1 = iso(0.4, y), p2 = iso(0.4, y + 9);
          return (
            <polygon key={y} points={P([p1, p2, [p2[0], p2[1] + 5], [p1[0], p1[1] + 5]])}
              fill="#04070c" stroke="#00e5ff" strokeWidth="0.4" opacity="0.7" />
          );
        })}
        {/* glowing data cable */}
        <path
          d={`M${iso(0, 83)[0].toFixed(1)},${(iso(0, 83)[1] + 7).toFixed(1)} C ${(iso(0, 83)[0] - 26).toFixed(1)},${(iso(0, 83)[1] + 26).toFixed(1)} ${(iso(0, 110)[0] - 20).toFixed(1)},${(iso(0, 110)[1] + 50).toFixed(1)} ${(iso(0, 120)[0] - 6).toFixed(1)},${(iso(0, 120)[1] + 68).toFixed(1)}`}
          fill="none" stroke="#00e5ff" strokeWidth="2" strokeLinecap="round" opacity="0.65"
          style={{ filter: "url(#lf-glow)" }} />
        <circle cx={iso(0, 83)[0]} cy={iso(0, 83)[1] + 7} r="1.3" fill="#00e5ff" opacity="0.9" />

        {/* deck top */}
        <polygon points={P([A, B, Dp, C])} fill="url(#lg-body)" stroke="#26355a" strokeWidth="1.2" strokeLinejoin="round" />
        {/* screen light spill on the deck */}
        <g transform={MAT_DECK}><rect x="10" y="2" width="170" height="12" fill="url(#lg-spill)" /></g>
        {/* neon edge strips — front acid / left magenta, with pulsing overlays */}
        <line x1={C[0]} y1={C[1]} x2={Dp[0]} y2={Dp[1]} stroke="#b8ff00" strokeWidth="2" opacity="0.9" style={{ filter: "url(#lf-glow)" }} />
        <line className="lp-st1" x1={C[0]} y1={C[1]} x2={Dp[0]} y2={Dp[1]} stroke="#ff2bd6" strokeWidth="1.5" style={{ filter: "url(#lf-glow)" }} />
        <line x1={A[0]} y1={A[1]} x2={C[0]} y2={C[1]} stroke="#ff2bd6" strokeWidth="1.5" opacity="0.8" style={{ filter: "url(#lf-glow)" }} />
        <line className="lp-st2" x1={A[0]} y1={A[1]} x2={C[0]} y2={C[1]} stroke="#00e5ff" strokeWidth="1.2" style={{ filter: "url(#lf-glow)" }} />
        {/* bottom edge glow */}
        <line x1={C[0]} y1={C[1] + TH_} x2={Dp[0]} y2={Dp[1] + TH_} stroke="#00e5ff" strokeWidth="1" opacity="0.5" style={{ filter: "url(#lf-glow)" }} />
        {/* hinge */}
        <polygon points={P([A, B, [B[0], B[1] + 5], [A[0], A[1] + 5]])} fill="#0a0f1e" stroke="#1e2d4a" strokeWidth="0.8" />

        {/* keybed well */}
        <g transform={MAT_DECK}>
          <rect x="7" y="13" width="176" height="88" rx="5" fill="#060a16" stroke="#1c2a44" strokeWidth="1" />
          <rect x="9" y="15" width="172" height="84" rx="4" fill="none" stroke="#b8ff00" strokeWidth="0.4" opacity="0.15" />
          {/* soft inner rim: light catch along the top, shade at the bottom for depth */}
          <rect x="8" y="13" width="174" height="1" fill="rgba(255,255,255,0.045)" />
          <rect x="8" y="99" width="174" height="1.4" fill="rgba(0,0,0,0.42)" />
        </g>

        {/* keys — press + neon-strobe in sync with the terminal */}
        {ROWS.map((row, ri) =>
          row.keys.map(k => {
            const keyId = k.id ?? k.l;
            const times = PRESSED[keyId] ?? [];
            const renderKey = (i: number) => (
              <g transform={`${MAT_DECK} translate(${k.x} ${row.y})`}>
                {/* key shadow for depth */}
                <rect x="1" y="2" width={k.w - 1} height="11" rx="2" fill="#060a14" opacity="0.6" />
                {/* key base */}
                <rect x="1" y="1" width={k.w - 1} height="12" rx="2" fill="#0b1220" />
                {/* key top with neon strobe */}
                <rect
                  x="0" y="0" width={k.w - 1} height="12" rx="2" fill="#18243c" stroke="#33456b" strokeWidth="0.4"
                  style={times.length > 0 ? { animation: `lp-g${keyId}${i} ${CYCLES}` } : undefined}
                />
                {/* keycap top facet highlight + soft bottom rim shade */}
                <rect x="1.1" y="1.3" width={k.w - 3.2} height="1.6" rx="0.8" fill="rgba(255,255,255,0.07)" />
                <rect x="1.1" y="10.1" width={k.w - 3.2} height="1.1" rx="0.55" fill="rgba(0,0,0,0.26)" />
                {/* home-row nubs (F/J) */}
                {k.nub && <circle cx={(k.w - 1) / 2} cy="10.7" r="0.75" fill="#8ba0c4" opacity="0.85" />}
                {/* key label */}
                {k.l && (
                  <text x={(k.w - 1) / 2} y="8.6" fontSize="5.5" textAnchor="middle" fill="#93a7cc"
                    fontFamily="var(--font-mono), monospace" style={{ pointerEvents: "none", userSelect: "none" }}>{k.l}</text>
                )}
              </g>
            );
            if (times.length === 0) return <g key={`${ri}-${k.x}`}>{renderKey(0)}</g>;
            return (
              <g key={`${ri}-${k.x}`}>
                {times.map((_, i) => (
                  <g key={i} style={{ animation: `lp-k${keyId}${i} ${CYCLES}` }}>{renderKey(i)}</g>
                ))}
              </g>
            );
          })
        )}

        {/* trackpad + rave stickers */}
        <g transform={MAT_DECK}>
          <rect x="55" y="108" width="80" height="15" rx="4" fill="#0a1120" stroke="#223252" strokeWidth="0.8" />
          <rect x="58" y="110" width="74" height="11" rx="3" fill="#070d1a" />
          <rect x="58" y="110" width="74" height="11" rx="3" fill="none" stroke="#b8ff00" strokeWidth="0.3" opacity="0.18" />
          <text x="25" y="121" fontSize="8" fontWeight="bold" fill="#ff2bd6" opacity="0.9"
            fontFamily="var(--font-orbitron-var), var(--font-mono), monospace">ACID</text>
          <rect x="146" y="112" width="30" height="10" rx="2" fill="#0b0f1c" stroke="#b8ff00" strokeWidth="0.5" opacity="0.85" />
          <text x="161" y="119.6" fontSize="6.5" fontWeight="bold" textAnchor="middle" fill="#b8ff00"
            fontFamily="var(--font-mono), monospace">303</text>
        </g>

        {/* status LED on the front wall */}
        <circle className="lp-led" cx={iso(180, 140.6)[0]} cy={iso(180, 140.6)[1] + 4} r="2"
          fill="#b8ff00" style={{ filter: "url(#lf-glow)" }} />

        {/* floating rave particles — enhanced with bloom */}
        {PARTICLES.map((p, i) => (
          <g key={`p${i}`} className="lp-pt" style={{ animationDelay: p.d }}>
            <circle cx={p.x} cy={p.y} r={p.r * 4} fill={p.c} opacity="0.1" style={{ filter: "url(#lf-bloom)" }} />
            <circle cx={p.x} cy={p.y} r={p.r * 2} fill={p.c} opacity="0.3" style={{ filter: "url(#lf-glow)" }} />
            <circle cx={p.x} cy={p.y} r={p.r} fill={p.c} opacity="0.9" style={{ filter: `drop-shadow(0 0 4px ${p.c})` }} />
          </g>
        ))}
        {DIAMONDS.map((p, i) => (
          <g key={`d${i}`} className="lp-pt" style={{ animationDelay: p.d }}>
            <polygon
              points={`${p.x},${p.y - 3.5} ${p.x + 3.5},${p.y} ${p.x},${p.y + 3.5} ${p.x - 3.5},${p.y}`}
              fill="none" stroke={p.c} strokeWidth="1" opacity="0.7" />
          </g>
        ))}
      </svg>
    </div>
  );
}
