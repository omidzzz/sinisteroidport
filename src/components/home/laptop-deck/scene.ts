/**
 * LAPTOP DECK — isometric scene geometry (2:1 projection).
 * Pure math + data — no React.
 */

export const ORX = 150;
export const ORY = 132;
export const CX = 0.8660254;
export const CY = 0.5;
export const iso = (x: number, y: number): [number, number] => [
  ORX + CX * (x - y),
  ORY + CY * (x + y),
];
export const P = (arr: [number, number][]) =>
  arr.map((p) => `${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(" ");

/* deck plane -> world; screen plane -> world */
export const MAT_DECK = "matrix(0.8660254 0.5 -0.8660254 0.5 150 132)";
/* The screen's bottom edge is pinned to the deck's back edge (world y = 132),
   so raising the height simply lifts the lid higher off the deck. */
export const SCREEN_H = 150;
export const MAT_SCREEN = `matrix(0.8660254 0.5 0 1 150 ${132 - SCREEN_H})`;

/* deck corner points (world space) */
export const A = iso(0, 0); // back-left
export const B = iso(190, 0); // back-right
export const C = iso(0, 140); // front-left
export const Dp = iso(190, 140); // front-right
export const TH_ = 11; // chassis thickness

/* floor grid segments (clamped to the scene box) */
export const GRID_Y: [number, number][][] = [
  -50, -25, 0, 25, 50, 75, 100, 125, 150, 175,
].map((gy) => [iso(Math.max(-40, gy - 215), gy), iso(Math.min(195, gy + 215), gy)]);
export const GRID_X: [number, number][][] = [
  -40, -15, 10, 35, 60, 85, 110, 135, 160, 185,
].map((gx) => [iso(gx, Math.max(-50, gx - 215)), iso(gx, Math.min(185, gx + 215))]);

/* floating rave particles */
export const PARTICLES: { x: number; y: number; r: number; c: string; d: string }[] = [
  { x: 62, y: 100, r: 1.8, c: "#b8ff00", d: "0s" },
  { x: 252, y: 64, r: 2.2, c: "#ff2bd6", d: ".6s" },
  { x: 336, y: 128, r: 1.5, c: "#00e5ff", d: "1.2s" },
  { x: 44, y: 176, r: 2.0, c: "#00e5ff", d: ".3s" },
  { x: 96, y: 236, r: 1.6, c: "#b8ff00", d: "1.8s" },
  { x: 120, y: 52, r: 1.4, c: "#ff2bd6", d: "2.1s" },
  { x: 352, y: 214, r: 1.8, c: "#b8ff00", d: ".9s" },
  { x: 22, y: 118, r: 1.5, c: "#b8ff00", d: "1.5s" },
  { x: 300, y: 40, r: 1.6, c: "#00e5ff", d: "2.6s" },
];
export const DIAMONDS: { x: number; y: number; c: string; d: string }[] = [
  { x: 90, y: 66, c: "#ff2bd6", d: ".4s" },
  { x: 270, y: 96, c: "#b8ff00", d: "1.1s" },
  { x: 46, y: 232, c: "#00e5ff", d: "1.8s" },
];

/* screen chrome — neon hues via deck-local CSS vars set on .lp-root
   (attributes can't take var(), consumers must apply these via style) */
export const CHAR_COLORS = ["var(--lp-acid)", "var(--lp-cyan)", "var(--lp-mag)"];
export const EQ_FILL = [
  "var(--lp-acid)",
  "var(--lp-mag)",
  "var(--lp-cyan)",
  "var(--lp-acid)",
  "var(--lp-mag)",
];