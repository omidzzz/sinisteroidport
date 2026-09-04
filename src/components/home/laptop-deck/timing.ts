/**
 * LAPTOP DECK — typing-loop timing engine.
 * The terminal runs a SEQUENCE of commands, each with the same rhythm:
 * type -> Enter -> run output holds -> backspace delete -> next command.
 * The whole sequence loops forever. Keys press + neon-strobe in sync with
 * the per-character typing on screen.
 * Pure constants — no React, trivially testable (npm run verify-laptop).
 */

export const STEP_T = 0.12;
export const PAUSE_T: Record<string, number> = { " ": 0.15 };
export const TYPE_DELAY = 0.4; /* idle before the first character */
export const ENTER_DELAY = 0.4; /* Enter lands after the last character */
export const RUN_DELAY = 0.8; /* output appears after Enter */
export const HOLD_T = 1.6; /* output hold per command */
export const BS_DELAY = 0.3; /* backspace starts after the hold */
export const BS_STEP = 0.07; /* time between deletions */
export const CMD_GAP = 0.35; /* pause between commands */

export type Command = {
  line: string;
  chars: string[];
  charT: number[]; /* global type timestamps */
  enterT: number;
  runT: number;
  holdEnd: number;
  bsStart: number;
  bsT: number[]; /* global deletion timestamps, first deletion first */
  end: number;
};

const buildCommand = (clock: number, line: string): Command => {
  const chars = [...line];
  const charT: number[] = [];
  let t = clock + TYPE_DELAY;
  for (const ch of chars) {
    charT.push(t);
    t += STEP_T + (PAUSE_T[ch] ?? 0);
  }
  const enterT = charT[charT.length - 1] + ENTER_DELAY;
  const runT = enterT + RUN_DELAY;
  const holdEnd = runT + HOLD_T;
  const bsStart = holdEnd + BS_DELAY;
  const bsT = chars.map((_, i) => bsStart + i * BS_STEP);
  const end = bsT[bsT.length - 1] + 0.12;
  return { line, chars, charT, enterT, runT, holdEnd, bsStart, bsT, end };
};

export const COMMAND_LINES = ["npm run dev", "npm test", "git push origin main"];

export const COMMANDS: Command[] = (() => {
  const out: Command[] = [];
  let clock = 0;
  for (const line of COMMAND_LINES) {
    const cmd = buildCommand(clock, line);
    out.push(cmd);
    clock = cmd.end + CMD_GAP;
  }
  return out;
})();

export const CYCLE = COMMANDS[COMMANDS.length - 1].end + CMD_GAP + 0.15;
export const CYCLES = `${CYCLE.toFixed(2)}s linear infinite`;
export const pct = (t: number) => `${((t / CYCLE) * 100).toFixed(2)}%`;

export const CW = 5.8; /* forced per-character advance on screen (via textLength) */
export const CH_X0 = 30; /* x of the first typed character */

/* key -> press timestamps across the whole command sequence ("n" and the
   space bar are pressed multiple times, Enter ends each line, Backspace
   deletes every character of every command) */
export const PRESSED: Record<string, number[]> = (() => {
  const map: Record<string, number[]> = {};
  const push = (id: string, t: number) => (map[id] ??= []).push(t);
  for (const cmd of COMMANDS) {
    cmd.chars.forEach((ch, i) => push(ch === " " ? "Space" : ch.toUpperCase(), cmd.charT[i]));
    push("ENTER", cmd.enterT);
    cmd.bsT.forEach((t) => push("BACKSPACE", t));
  }
  return map;
})();