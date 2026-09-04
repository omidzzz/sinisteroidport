/**
 * HOVER DRONE — isometric sci-fi saucer, fully dressed.
 * Pure geometry + data, no React.
 *
 * Tiered hull (skirt/hull/deck), clipped panel seams + rivets, rim LED strip,
 * translucent canopy over a sensor core, a crown rotor assembly (blades +
 * motion-blur disc), thruster nacelles, folded landing struts, an antenna
 * beacon, a sensor gimbal, a radar sweep + scan rings on a floor pad, and
 * drifting energy motes. Neon hues ride deck-local CSS vars (--drn-*).
 */
import { CX, CY } from "../iso";

export const ORX = 0;
export const ORY = 30;
const r1 = (n: number) => Math.round(n * 10) / 10;

/* ---------- floor / landing pad (screen space) ---------- */
export const FLOOR_CY = 46;
export const PAD_R = 46;
export const PAD_RX = CX * PAD_R;
export const PAD_RY = CY * PAD_R * Math.sqrt(2);
export const PAD_RING2 = { rx: CX * 30, ry: CY * 30 * Math.sqrt(2) };

/* ---------- saucer tiers (screen space, centered x=0) ---------- */
export const SKIRT = { y: 17, rx: 33, ry: 11 };
export const HULL = { y: 4, rx: 47, ry: 19 };
export const DECK = { y: -9, rx: 29, ry: 11 };
export const DOME_OUTER = { y: -24, rx: 25, ry: 12 };
export const DOME_INNER = { y: -29, rx: 14, ry: 8 };
export const CORE = { x: 0, y: -25, r: 5.5 };

/* rotor assembly on the crown */
export const MAST = { y0: -30, y1: -56 };
export const ROTOR = { y: -58, r: 24, hubY: -61 };
export const BLUR = { y: -57, rx: 25, ry: 12 };

/* small antenna boom off the deck rear + trailing beacon */
export const ANT = { x0: 18, y0: -9, x1: 27, y1: -30 };

/* thruster nacelles on the hull flanks */
export const NACELLES = [-1, 1].map((s) => ({
  x: s * 41, y: 6, rx: 12, ry: 6.6, side: s,
}));

/* folded landing struts: attach -> pad */
export const LEGS = [
  { a: [-14, 15], p: [-21, 37] },
  { a: [14, 15], p: [21, 37] },
  { a: [0, 18], p: [0, 39] },
] as const;

/* sensor gimbal hanging under the hull */
export const GIMBAL = { y0: 18, y1: 27, r: 3.4 };

/* clipped panel seams + specular on the main hull */
export const SEAMS = [
  "M -44,2 Q 0,-13 44,2",
  "M -40,12 Q 0,4 40,12",
  "M -44,10 L 30,-2",
];
export const SPEC = "M -30,-9 Q 0,-17 30,-9";

/* rivets around the deck */
export const RIVETS = Array.from({ length: 9 }, (_, i) => {
  const th = -2 + (i * (4 / 8));
  return { x: r1(DECK.rx * 0.9 * Math.cos(th)), y: r1(DECK.y + DECK.ry * 0.9 * Math.sin(th)) };
});

/* rim LED strip along the hull's front arc */
export const RIM_LEDS = Array.from({ length: 15 }, (_, i) => {
  const th = Math.PI * (0.07 + (i / 14) * 0.86);
  return {
    x: r1(HULL.rx * Math.cos(th)),
    y: r1(HULL.y + HULL.ry * Math.sin(th) * 0.9),
    c: (["cyan", "mag", "acid"] as const)[i % 3],
    delay: `${(0.11 * i).toFixed(2)}s`,
  };
});

/* drifting energy motes around the saucer */
export const MOTES = [
  { x: -52, y: 8, r: 1.3, c: "cyan", d: "0s", du: "4.2s" },
  { x: 56, y: 2, r: 1.1, c: "mag", d: ".8s", du: "4.8s" },
  { x: -46, y: -20, r: 1.2, c: "acid", d: "1.6s", du: "3.9s" },
  { x: 60, y: -14, r: 1.4, c: "cyan", d: "2.4s", du: "4.5s" },
  { x: -68, y: -6, r: 1.1, c: "mag", d: "3.1s", du: "5.1s" },
  { x: 70, y: 22, r: 1.2, c: "acid", d: "1.1s", du: "4.3s" },
  { x: 38, y: -30, r: 1.0, c: "cyan", d: "2.9s", du: "3.7s" },
  { x: -36, y: -32, r: 1.0, c: "mag", d: "3.7s", du: "4.0s" },
] as const;