/**
 * LAPTOP DECK — typing-loop timing engine.
 * Keys press + neon-strobe in sync with the per-character typing on screen.
 * The whole sequence loops forever: type -> run -> backspace delete -> retype.
 * Pure constants — no React, trivially testable.
 */

export const STEP_T = 0.12;
export const PAUSE_T: Record<string, number> = { " ": 0.15 };

export const CHARS = ["n", "p", "m", " ", "r", "u", "n", " ", "d", "e", "v"];
export const CHAR_T: number[] = (() => {
  const out: number[] = [];
  let t = 0.4;
  for (const ch of CHARS) {
    out.push(t);
    t += STEP_T + (PAUSE_T[ch] ?? 0);
  }
  return out;
})();

export const ENTER_T = CHAR_T[10] + 0.4;
export const RUN_T = ENTER_T + 0.8;
export const HOLD_T = RUN_T + 2.5;

/* Backspace timing: delete characters one by one from the end */
export const BACKSPACE_START = HOLD_T + 0.3;
export const BACKSPACE_STEP = 0.08; // Time between each backspace
export const BACKSPACE_T: number[] = (() => {
  const out: number[] = [];
  for (let i = CHARS.length - 1; i >= 0; i--) {
    out.push(BACKSPACE_START + (CHARS.length - 1 - i) * BACKSPACE_STEP);
  }
  return out;
})();

export const CYCLE = BACKSPACE_T[0] + 0.5;
export const CYCLES = `${CYCLE.toFixed(2)}s linear infinite`;
export const pct = (t: number) => `${((t / CYCLE) * 100).toFixed(2)}%`;

export const CW = 5.8; /* forced per-character advance on screen (via textLength) */
export const CH_X0 = 30; /* x of the first typed character - adjusted for better fit */

/* key -> press timestamps ("n" and "space" are pressed twice, Enter ends the
   line, Backspace deletes) */
export const PRESSED: Record<string, number[]> = {
  N: [CHAR_T[0], CHAR_T[6]],
  P: [CHAR_T[1]],
  M: [CHAR_T[2]],
  Space: [CHAR_T[3], CHAR_T[7]],
  R: [CHAR_T[4]],
  U: [CHAR_T[5]],
  D: [CHAR_T[8]],
  E: [CHAR_T[9]],
  V: [CHAR_T[10]],
  ENTER: [ENTER_T],
  BACKSPACE: BACKSPACE_T,
};