/**
 * NEON PLANT — isometric potted bioluminescent flora (`BIO // 303`).
 * Pure geometry + data, no React.
 *
 * A dark plinth + hexagonal-frustum pot holds alien flora: an S-curved stalk
 * with veined luminous leaves, a magenta bloom, a curling tendril and
 * drifting spores. A holo scan ring + vertical scan line read the specimen.
 */
import { CX, CY } from "../iso";

export const ORX = 0;
export const ORY = 26;
const r1 = (n: number) => Math.round(n * 10) / 10;
export const W = (x: number, y: number, z = 0): [number, number] => [
  r1(CX * (x - y) + ORX),
  r1(CY * (x + y) + ORY - z),
];

/* ---------- pot: hexagonal frustum (world units) ---------- */
export const R_BOT = 24;
export const R_TOP = 32;
export const POT_H = 30;
const ANG = [0, 60, 120, 180, 240, 300];
const rad = (d: number) => (d * Math.PI) / 180;
export const POT_BOT = ANG.map((a) => W(R_BOT * Math.cos(rad(a)), R_BOT * Math.sin(rad(a)), 0));
export const POT_TOP = ANG.map((a) => W(R_TOP * Math.cos(rad(a)), R_TOP * Math.sin(rad(a)), POT_H));

export type FaceQ = { q: [number, number][]; mid: number; face: number };
export const POT_SIDES: FaceQ[] = ANG.map((_, i) => {
  const j = (i + 1) % 6;
  const q = [POT_BOT[i], POT_BOT[j], POT_TOP[j], POT_TOP[i]];
  const mid = (q[0][1] + q[1][1] + q[2][1] + q[3][1]) / 4;
  return { q, mid, face: i };
});
export const POT_FRONT = POT_SIDES
  .map((s, idx) => ({ ...s, idx }))
  .sort((a, b) => b.mid - a.mid)
  .slice(0, 3);
export const BACK = POT_SIDES.filter((s) => !POT_FRONT.some((f) => f.face === s.face));

/* horizontal neon band between heights z1..z2 on a face (frustum interpolate) */
const lerp = (a: [number, number], b: [number, number], t: number): [number, number] => [
  r1(a[0] + (b[0] - a[0]) * t),
  r1(a[1] + (b[1] - a[1]) * t),
];
export const band = (z1: number, z2: number) => (face: number): [number, number][] => {
  const i = face, j = (face + 1) % 6;
  const t2 = z2 / POT_H, t1 = z1 / POT_H;
  const a1 = lerp(POT_BOT[i], POT_TOP[i], t1), b1 = lerp(POT_BOT[j], POT_TOP[j], t1);
  const a2 = lerp(POT_BOT[i], POT_TOP[i], t2), b2 = lerp(POT_BOT[j], POT_TOP[j], t2);
  return [a1, b1, b2, a2];
};

export const P = (arr: [number, number][]) => arr.map((p) => `${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(" ");

/* soil + plinth (world circles -> iso ellipses) */
export const SOIL = {
  cx: W(0, 0, POT_H)[0],
  cy: W(0, 0, POT_H)[1],
  rx: CX * (R_TOP * 0.8),
  ry: CY * (R_TOP * 0.8),
};
export const PLINTH = {
  cx: W(0, 0, 0)[0],
  cy: W(0, 0, 0)[1],
  rx: CX * 47,
  ry: CY * 47,
};

/* ---------- flora (screen space, soil-top at ~(0,-4)) ---------- */
export const STEM_PATH =
  "M 0,-4 C -2,-14 -6,-26 -6,-34 C -1,-46 7,-62 4,-64 C 1,-78 -7,-94 -2,-96 C 3,-106 7,-118 2,-122";

export const LEAVES = [
  { bx: -5.5, by: -46, w: 26, h: 9, rot: -36, c: "acid", dl: 0, vx: 13, vy: -30 },
  { bx: 2.5, by: -72, w: 30, h: 10, rot: 26, c: "cyan", dl: 0.7, vx: 16, vy: -34 },
  { bx: -1.5, by: -98, w: 24, h: 8, rot: -24, c: "acid", dl: 1.2, vx: 12, vy: -28 },
  { bx: -3, by: -24, w: 20, h: 7, rot: 34, c: "mag", dl: 1.6, vx: 10, vy: -22 },
] as const;

export const BLOOM = { x: -2, y: -126, r: 16 };
export const SPROUT = { bx: -16, by: -10, c: "mag", dl: 0.9 };
export const TENDRIL_PATH = "M 0,-4 C 10,-12 15,-22 9,-34 C 13,-46 5,-58 9,-70 C 4,-84 -2,-96 -1,-108";

export const RINGS = [
  { cx: 0, cy: W(0, 0, 40)[1], rx: CX * 40, ry: CY * 40, dl: 0 },
  { cx: 0, cy: W(0, 0, 90)[1], rx: CX * 34, ry: CY * 34, dl: -1.1 },
] as const;

export const SCAN = { x1: -48, x2: 48, y0: -14, y1: -116 };

export const SPORES = [
  { x: -30, y: -4, r: 1.6, c: "acid", d: 0, du: 5.2 },
  { x: 22, y: -16, r: 1.4, c: "cyan", d: 0.9, du: 4.6 },
  { x: -16, y: -28, r: 1.3, c: "mag", d: 1.7, du: 5.6 },
  { x: 30, y: -40, r: 1.5, c: "acid", d: 2.4, du: 4.2 },
  { x: -24, y: -52, r: 1.4, c: "cyan", d: 3.1, du: 5.0 },
  { x: 14, y: -70, r: 1.3, c: "mag", d: 3.8, du: 4.4 },
  { x: -8, y: -84, r: 1.2, c: "acid", d: 4.4, du: 5.4 },
  { x: 26, y: -96, r: 1.4, c: "cyan", d: 5.0, du: 4.8 },
] as const;

export const SPECK = [
  { x: -8, y: -7, r: 1.4 },
  { x: 6, y: -9, r: 1.1 },
  { x: -3, y: -4, r: 1.2 },
  { x: 10, y: -5, r: 1.0 },
  { x: -11, y: -3, r: 1.0 },
] as const;

/* plaque sits on the front-most face band */
const pband = band(18, POT_H)(POT_FRONT[0].face);
export const PLAQUE = {
  x: (pband[0][0] + pband[1][0] + pband[2][0] + pband[3][0]) / 4,
  y: (pband[0][1] + pband[1][1] + pband[2][1] + pband[3][1]) / 4,
};