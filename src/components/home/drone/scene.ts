/**
 * PSYCHEDELIC ALIEN UFO — cute flat-cartoon saucer, acid-rave palette.
 * Pure geometry + data, no React/JSX.
 */

export const r1 = (n: number) => Math.round(n * 10) / 10;

/* rainbow palette (6-way rotation) used for portholes, rim ring, stars */
export const HUES = ["#ffe600", "#ff2bd6", "#00e5ff", "#8cff2b", "#ff8c00", "#9b30ff"] as const;
export const hue = (i: number) => HUES[((i % HUES.length) + HUES.length) % HUES.length];

export const INK = "#1a1330"; /* near-black cartoon outline, stays crisp under hue-rotate */

/* ---------- saucer body ---------- */
export const RIM = { cy: 58, rx: 98, ry: 27 };
export const RIM_RING = { cy: 58, rx: 88, ry: 21 };
export const BAND = { cy: 42, rx: 82, ry: 22 };
export const DOME = { cy: -28, rx: 58, ry: 52 };

export const FEET = [
  { x: -58, y: 80 },
  { x: -19, y: 84 },
  { x: 20, y: 84 },
  { x: 58, y: 80 },
];

export const PORTHOLES = [
  { x: -62, y: 46 },
  { x: -31, y: 49 },
  { x: 0, y: 50 },
  { x: 31, y: 49 },
  { x: 62, y: 46 },
].map((p, i) => ({ ...p, c: hue(i), delay: `${(i * 0.18).toFixed(2)}s` }));

/* ---------- alien ---------- */
export const SHOULDERS_PATH = "M -26,4 Q -26,26 0,30 Q 26,26 26,4 L 22,-6 L -22,-6 Z";
export const HEAD_PATH =
  "M -30,-38 C -30,-64 -14,-79 0,-79 C 14,-79 30,-64 30,-38 " +
  "C 30,-16 17,-1 0,7 C -17,-1 -30,-16 -30,-38 Z";
export const EYES = [
  { cx: -12.5, cy: -40, rx: 9.5, ry: 15, rot: -6, gx: -15.5, gy: -47 },
  { cx: 12.5, cy: -40, rx: 9.5, ry: 15, rot: 6, gx: 9.5, gy: -47 },
];
export const GLARE_PATH = "M -38,-60 Q -20,-72 -4,-68 Q -24,-62 -34,-42 Z";

/* ---------- tractor beam ---------- */
export const BEAM_POINTS = "-34,84 34,84 95,150 -95,150";
export const BEAM_STREAKS = [
  { x: -22, delay: "0s", dur: "2.6s" },
  { x: 2, delay: "0.9s", dur: "2.9s" },
  { x: 24, delay: "1.8s", dur: "2.4s" },
];

/* ---------- background sparkle field ---------- */
export const STARS = [
  { x: -130, y: -130, r: 3, star: false, d: "0s", du: "2.6s" },
  { x: 120, y: -95, r: 4, star: true, d: "0.6s", du: "3.1s" },
  { x: -118, y: 68, r: 2.6, star: false, d: "1.2s", du: "2.8s" },
  { x: 130, y: 100, r: 3.4, star: true, d: "1.7s", du: "3.4s" },
  { x: -42, y: -142, r: 2.2, star: false, d: "0.3s", du: "2.5s" },
  { x: 96, y: -140, r: 3, star: true, d: "2.1s", du: "3.0s" },
  { x: -100, y: -30, r: 2, star: false, d: "1.5s", du: "2.7s" },
  { x: 108, y: 20, r: 2.4, star: false, d: "0.9s", du: "3.2s" },
  { x: -70, y: 120, r: 2.8, star: true, d: "2.4s", du: "2.9s" },
  { x: 60, y: 138, r: 2.2, star: false, d: "0.2s", du: "2.6s" },
  { x: -140, y: -4, r: 2.6, star: true, d: "1.1s", du: "3.3s" },
  { x: 20, y: -148, r: 2, star: false, d: "1.9s", du: "2.5s" },
].map((s, i) => ({ ...s, c: hue(i) }));

/* small 4-point sparkle/star path centered at 0,0 */
export function starPath(r: number) {
  const o = r * 0.28;
  return `M0,${-r} L${o},${-o} L${r},0 L${o},${o} L0,${r} L${-o},${o} L${-r},0 L${-o},${-o} Z`;
}
