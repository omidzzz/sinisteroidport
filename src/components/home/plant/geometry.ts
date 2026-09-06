/**
 * NEON PLANT — isometric potted bioluminescent flora (`BIO // 303`).
 * Pure geometry + data, no React.
 *
 * A dark plinth + hexagonal-frustum pot holds alien flora: an S-curved stalk
 * with veined luminous leaves, a magenta bloom, a curling tendril and
 * drifting spores. A holo scan ring + vertical scan line read the specimen.
 */
/* isometric projection constants (inlined: no host ../iso module) */
export const CX = 0.866;
export const CY = 0.5;

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

export const lerp = (a: [number, number], b: [number, number], t: number): [number, number] => [
  r1(a[0] + (b[0] - a[0]) * t),
  r1(a[1] + (b[1] - a[1]) * t),
];
/* horizontal neon band between heights z1..z2 on a face (frustum interpolate) */
export const band = (z1: number, z2: number) => (face: number): [number, number][] => {
  const i = face, j = (face + 1) % 6;
  const t2 = z2 / POT_H, t1 = z1 / POT_H;
  const a1 = lerp(POT_BOT[i], POT_TOP[i], t1), b1 = lerp(POT_BOT[j], POT_TOP[j], t1);
  const a2 = lerp(POT_BOT[i], POT_TOP[i], t2), b2 = lerp(POT_BOT[j], POT_TOP[j], t2);
  return [a1, b1, b2, a2];
};

export const P = (arr: [number, number][]) => arr.map((p) => `${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(" ");

/* rivets down each front face's leading edge — cheap panel-line greeble */
export const RIVETS = POT_FRONT.flatMap((s) =>
  [0.22, 0.52, 0.82].map((t) => lerp(POT_BOT[s.face], POT_TOP[s.face], t))
);

/* status-LED strip across the front-most face, chase-lit */
const stripPoints = (face: number, z: number, n: number): [number, number][] => {
  const j = (face + 1) % 6;
  const t = z / POT_H;
  const a = lerp(POT_BOT[face], POT_TOP[face], t);
  const b = lerp(POT_BOT[j], POT_TOP[j], t);
  return Array.from({ length: n }, (_, k) => lerp(a, b, (k + 0.5) / n));
};
export const LED_STRIP = stripPoints(POT_FRONT[0].face, 12, 5).map((p, i) => ({
  x: p[0],
  y: p[1],
  c: i % 2 === 0 ? "acid" : "cyan",
  delay: `${(i * 0.15).toFixed(2)}s`,
}));

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

/* denser bioluminescent root network, visible through the hydroponic soil */
export const ROOTS = [
  { d: "M -14,-8 q 5,-5 10,-9", c: "acid", w: 0.5, o: 0.35 },
  { d: "M 8,-9 q -7,-4 -16,-7", c: "cyan", w: 0.4, o: 0.3 },
  { d: "M -2,-6 q 3,-6 -3,-11 q -3,-3 -9,-4", c: "acid", w: 0.4, o: 0.28 },
  { d: "M 4,-7 q 6,-3 5,-9 q 0,-4 5,-7", c: "cyan", w: 0.35, o: 0.25 },
  { d: "M -6,-5 q -2,-7 4,-10", c: "mag", w: 0.35, o: 0.22 },
] as const;
export const ROOT_TIPS = [
  { x: -18, y: -17, c: "acid" }, { x: -20, y: -16, c: "cyan" },
  { x: -8, y: -21, c: "acid" }, { x: 12, y: -17, c: "cyan" },
  { x: -4, y: -16, c: "mag" },
] as const;

/* ---------- flora (screen space, soil-top at ~(0,-4)) ---------- */
export const STEM_PATH =
  "M 0,-4 C -2,-14 -6,-26 -6,-34 C -1,-46 7,-62 4,-64 C 1,-78 -7,-94 -2,-96 C 3,-106 7,-118 2,-122";

export const LEAVES = [
  { bx: -3, by: -24, w: 20, h: 7, rot: 34, c: "mag", dl: 1.6 },
  { bx: -5.5, by: -46, w: 26, h: 9, rot: -36, c: "acid", dl: 0 },
  { bx: -2, by: -58, w: 18, h: 6.5, rot: 22, c: "mag", dl: 2.1 },
  { bx: 2.5, by: -72, w: 30, h: 10, rot: 26, c: "cyan", dl: 0.7 },
  { bx: -1.5, by: -98, w: 24, h: 8, rot: -24, c: "acid", dl: 1.2 },
  { bx: 3, by: -110, w: 17, h: 6, rot: -18, c: "cyan", dl: 2.6 },
] as const;

export const BLOOM = { x: -2, y: -126, r: 16 };
export const BUDS = [
  { bx: 6, by: -56, r: 5.4, c: "cyan", dl: 0.4 },
  { bx: -9, by: -90, r: 4.6, c: "acid", dl: 1.1 },
] as const;
export const SPROUT = { bx: -16, by: -10, c: "mag", dl: 0.9 };

/* double-helix tendril (replaces the single curl) with cross-rungs and
   traveling data beads — same acid/cyan palette, just more intricate */
function helixPts(phase: number, turns = 2.1, amp = 8.5, y0 = -4, y1 = -108, steps = 15): [number, number][] {
  const pts: [number, number][] = [];
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const y = y0 + (y1 - y0) * t;
    const x = Math.sin(t * Math.PI * 2 * turns + phase) * amp * (1 - t * 0.35);
    pts.push([r1(x), r1(y)]);
  }
  return pts;
}
const toPath = (pts: [number, number][]) =>
  pts.reduce((d, [x, y], i) => d + (i === 0 ? `M ${x},${y}` : ` L ${x},${y}`), "");
const HELIX_A_PTS = helixPts(0);
const HELIX_B_PTS = helixPts(Math.PI);
export const HELIX_A = toPath(HELIX_A_PTS);
export const HELIX_B = toPath(HELIX_B_PTS);
export const HELIX_RUNGS = HELIX_A_PTS.filter((_, i) => i % 3 === 0).map((p, k) => {
  const q = HELIX_B_PTS[k * 3];
  return { x1: p[0], y1: p[1], x2: q[0], y2: q[1] };
});

/* z=55/98 (not 30/pot-rim or 126/bloom) so the holo rings read as a distinct
   scanning effect instead of tracing the pot rim or clipping the flower */
export const RINGS = [
  { cx: 0, cy: W(0, 0, 55)[1], rx: CX * 40, ry: CY * 40, dl: 0 },
  { cx: 0, cy: W(0, 0, 98)[1], rx: CX * 34, ry: CY * 34, dl: -1.1 },
] as const;

export const SCAN = { x1: -48, x2: 48, y0: -14, y1: -116 };
/* CSS var for the scan-line's travel distance, derived from SCAN itself so
   the animations.ts keyframe never drifts out of sync with the geometry */
export const SCAN_DIST = `${r1(SCAN.y1 - SCAN.y0)}px`;

/* corner reticle brackets framing the specimen (classic scan/target-lock HUD) */
export const RETICLE = [
  { x: -58, y: -150, sx: 1, sy: 1 },
  { x: 58, y: -150, sx: -1, sy: 1 },
  { x: -58, y: 4, sx: 1, sy: -1 },
  { x: 58, y: 4, sx: -1, sy: -1 },
] as const;

/* annotation callouts: marker on the specimen -> leader line -> HUD label */
export const CALLOUTS = [
  { mx: 13, my: -128, lx: 46, ly: -134, label: "BLOOM", anchor: "start" as const, c: "mag" },
  { mx: -13, my: -8, lx: -70, ly: -22, label: "ROOT SYS", anchor: "end" as const, c: "acid" },
  { mx: 6, my: -64, lx: 54, ly: -58, label: "\u0394+2.3%", anchor: "start" as const, c: "cyan" },
] as const;

/* micro-scanner probe orbiting the whole specimen */
export const PROBE = { rx: 62, ry: 35, cy: -68, dur: "9s" };
export const PROBE_PATH =
  `M ${-PROBE.rx},${PROBE.cy} A ${PROBE.rx} ${PROBE.ry} 0 1 0 ${PROBE.rx},${PROBE.cy} ` +
  `A ${PROBE.rx} ${PROBE.ry} 0 1 0 ${-PROBE.rx},${PROBE.cy}`;

/* ruler ticks running alongside the scan line's vertical track */
export const TICKS = Array.from({ length: 7 }, (_, i) => {
  const t = i / 6;
  return { y: r1(SCAN.y1 + (SCAN.y0 - SCAN.y1) * t), major: i % 2 === 0 };
});

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