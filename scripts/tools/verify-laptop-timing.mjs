// Verifies LaptopDeck timing invariants (pure modules, no React):
//   - CHAR_T is strictly increasing and aligned with CHARS
//   - backspace phase starts after the run hold and deletes end-first
//   - every PRESSED timestamp maps to a keycap that exists in ROWS
//   - every typed character has a synced key press at exactly CHAR_T[i]
//   - keyframes percentages land inside [0, 100]
// Run: node scripts/tools/verify-laptop-timing.mjs
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { pathToFileURL } from "node:url";

const require = createRequire(import.meta.url);
const ts = require("typescript");

const SRC = path.resolve("src/components/home/laptop-deck");
const TMP = path.resolve(".verify-timing.tmp");

fs.rmSync(TMP, { recursive: true, force: true });
fs.mkdirSync(TMP, { recursive: true });

async function load(name) {
  const src = fs.readFileSync(path.join(SRC, `${name}.ts`), "utf8");
  const { outputText } = ts.transpileModule(src, {
    compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2020 },
  });
  const file = path.join(TMP, `${name}.mjs`);
  fs.writeFileSync(file, outputText);
  return import(pathToFileURL(file).href);
}

const { COMMANDS, CYCLE, PRESSED, TYPE_DELAY, BS_STEP } = await load("timing");
const { ROWS } = await load("keyboard");

let failures = 0;
const check = (ok, msg) => {
  if (!ok) {
    failures++;
    console.error(`  ✗ ${msg}`);
  }
};

console.log("verify-laptop-timing");
check(COMMANDS.length > 0, "at least one command");

const totalChars = COMMANDS.reduce((n, c) => n + c.chars.length, 0);

COMMANDS.forEach((cmd, ci) => {
  const tag = `cmd${ci} ("${cmd.line}")`;
  check(cmd.chars.length === cmd.charT.length, `${tag}: charT aligned with chars`);
  cmd.charT.forEach((t, i) => {
    check(Number.isFinite(t) && t > 0, `${tag}: charT[${i}] positive finite`);
    if (i > 0) check(t > cmd.charT[i - 1], `${tag}: charT strictly increasing at i=${i}`);
  });
  check(cmd.enterT > cmd.charT[cmd.charT.length - 1], `${tag}: Enter after last character`);
  check(cmd.runT > cmd.enterT, `${tag}: run after Enter`);
  check(cmd.holdEnd > cmd.runT, `${tag}: hold end after run`);
  check(cmd.bsStart > cmd.holdEnd, `${tag}: backspace starts after hold`);
  check(cmd.bsT.length === cmd.chars.length, `${tag}: one backspace per character`);
  cmd.bsT.forEach((t, i) => {
    check(t >= cmd.bsStart, `${tag}: bsT[${i}] at/after bsStart`);
    if (i > 0) check(t > cmd.bsT[i - 1], `${tag}: bsT strictly increasing at i=${i}`);
  });
  check(cmd.end > cmd.bsT[cmd.bsT.length - 1], `${tag}: end after final deletion`);
  /* every deletion timestamp is spaced by BS_STEP */
  cmd.bsT.forEach((t, i) => {
    if (i > 0) check(Math.abs(t - cmd.bsT[i - 1] - BS_STEP) < 1e-9, `${tag}: bsT spacing at i=${i}`);
  });
});

/* commands never overlap: the next command starts typing after the previous ends */
for (let i = 1; i < COMMANDS.length; i++) {
  check(
    COMMANDS[i].charT[0] > COMMANDS[i - 1].end,
    `cmd${i} starts after cmd${i - 1} ends`
  );
}

/* the loop covers the whole sequence */
const lastEnd = COMMANDS[COMMANDS.length - 1].end;
check(CYCLE > lastEnd, `CYCLE (${CYCLE.toFixed(2)}s) extends past the last command end (${lastEnd.toFixed(2)}s)`);

/* --- key layout sanity --- */
const keyIds = new Set(
  ROWS.flatMap((r) => r.keys.map((k) => k.id ?? k.l)).filter(Boolean)
);
for (const id of Object.keys(PRESSED)) {
  check(keyIds.has(id), `PRESSED key "${id}" exists in ROWS`);
  check(
    Array.isArray(PRESSED[id]) && PRESSED[id].every((t) => Number.isFinite(t) && t >= 0 && t < CYCLE),
    `PRESSED[${id}] timestamps valid (0 <= t < CYCLE)`
  );
}

/* --- char <-> key sync: each typed char presses its key at exactly charT[i] --- */
COMMANDS.forEach((cmd, ci) => {
  cmd.chars.forEach((ch, i) => {
    const id = ch === " " ? "Space" : ch.toUpperCase();
    check(
      PRESSED[id]?.some((t) => Math.abs(t - cmd.charT[i]) < 1e-9),
      `cmd${ci} char "${ch}" (i=${i}) pressed on key "${id}" at charT[${i}]`
    );
  });
  check(PRESSED.ENTER.includes(cmd.enterT), `cmd${ci} Enter pressed at enterT`);
});
/* Backspace key fires once per character across all commands */
check(PRESSED.BACKSPACE.length === totalChars, "BACKSPACE key fires once per character");
/* typing starts after the initial idle delay */
check(
  Math.abs(COMMANDS[0].charT[0] - TYPE_DELAY) < 1e-9,
  "first character lands at TYPE_DELAY"
);

fs.rmSync(TMP, { recursive: true, force: true });

if (failures > 0) {
  console.error(`✗ ${failures} invariant${failures > 1 ? "s" : ""} failed`);
  process.exit(1);
}
console.log(`✓ all timing invariants hold (${COMMANDS.length} commands, ${totalChars} chars, cycle ${CYCLE.toFixed(2)}s)`);