/**
 * Shared 2:1 isometric projection — pure, origin-free.
 * Every console-bay asset (LaptopDeck, Terrarium, Drone) composes its own
 * world origin on top so the whole scene sits on the same grid.
 */
export const CX = 0.8660254;
export const CY = 0.5;

/** Map a world (x, y) pair (z implied) to screen coords.
 *  Screen y grows downward; a positive world-z lifts an element *up* the
 *  screen (subtract z in the consumer). */
export const iso = (x: number, y: number): [number, number] => [
  CX * (x - y),
  CY * (x + y),
];

/** Format a polygon's points for an SVG `points` attribute. */
export const P = (arr: [number, number][]) =>
  arr.map((p) => `${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(" ");