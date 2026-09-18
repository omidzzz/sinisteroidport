/**
 * verify-nav-machine.mjs
 *
 * Unit tests for the CRAFT CONSOLE reducer (src/lib/nav/machine.ts) — the
 * pure state machine behind the experimental navigation. No test framework
 * is installed (and none is being added), so this follows the same
 * hand-rolled assert-and-report idiom as the other scripts/tools/verify-*
 * checks.
 *
 * The reducer is deliberately DOM-free and import-free (its only import is
 * `import type`, which Node's type stripping erases), so this script can
 * load the .ts file directly — no transpiler, no build step.
 */
import assert from "node:assert/strict";

import {
  MAX_BUFFER,
  allItems,
  consoleReducer,
  createConsoleState,
  selectItems,
} from "../../src/lib/nav/machine.ts";

let passed = 0;
const failures = [];

/** Run one named case; collect failures instead of dying on the first. */
function test(name, fn) {
  try {
    fn();
    passed += 1;
    console.log(`  ok  ${name}`);
  } catch (error) {
    failures.push({ name, error });
    console.log(`  FAIL ${name}\n       ${error.message.split("\n")[0]}`);
  }
}

/* ── Fixtures ───────────────────────────────────────────────────────── */

const ROUTES = [
  { id: "home", path: "/", index: "01", label: "Index" },
  { id: "work", path: "/work", index: "02", label: "Work" },
  { id: "lab", path: "/lab", index: "06", label: "Lab" },
];

const COMMANDS = [
  { kind: "command", label: "Ask the agent", sub: "ask", value: "ask" },
  { kind: "command", label: "Copy email", sub: "mail", value: "mail" },
];

const base = () => createConsoleState(ROUTES, COMMANDS);

/* ── Initial state ───────────────────────────────────────────────────── */

console.log("\n=== INITIAL STATE ===");
test("starts collapsed with an empty buffer", () => {
  const s = base();
  assert.equal(s.status, "collapsed");
  assert.equal(s.buffer, "");
  assert.equal(s.activeIndex, 0);
  assert.equal(s.lastTransition, null);
});
test("total items = routes + commands", () => {
  assert.equal(allItems(base()).length, ROUTES.length + COMMANDS.length);
});
test("an empty buffer filters nothing out", () => {
  assert.equal(selectItems(base()).length, ROUTES.length + COMMANDS.length);
});

/* ── Open / close ────────────────────────────────────────────────────── */

console.log("\n=== OPEN / CLOSE ===");
test("open sets status and transition", () => {
  const s = consoleReducer(base(), { type: "open" });
  assert.equal(s.status, "open");
  assert.equal(s.lastTransition, "open");
});
test("open is a no-op when already open (same reference)", () => {
  const open = consoleReducer(base(), { type: "open" });
  assert.equal(consoleReducer(open, { type: "open" }), open);
});
test("close clears the buffer and resets the cursor", () => {
  let s = consoleReducer(base(), { type: "open" });
  s = consoleReducer(s, { type: "type", char: "w" });
  s = consoleReducer(s, { type: "close" });
  assert.equal(s.status, "collapsed");
  assert.equal(s.buffer, "");
  assert.equal(s.activeIndex, 0);
  assert.equal(s.lastTransition, "close");
});
test("close is a no-op when already collapsed", () => {
  const s = base();
  assert.equal(consoleReducer(s, { type: "close" }), s);
});
test("toggle flips both ways", () => {
  const open = consoleReducer(base(), { type: "toggle" });
  assert.equal(open.status, "open");
  assert.equal(consoleReducer(open, { type: "toggle" }).status, "collapsed");
});

/* ── Typing ─────────────────────────────────────────────────────────── */

console.log("\n=== BUFFER ===");
test("typing while collapsed opens AND keeps the character", () => {
  const s = consoleReducer(base(), { type: "type", char: "l" });
  assert.equal(s.status, "open");
  assert.equal(s.buffer, "l");
});
test("typing appends and resets the cursor to the top row", () => {
  let s = consoleReducer(base(), { type: "open" });
  s = consoleReducer(s, { type: "move", delta: 2 });
  s = consoleReducer(s, { type: "type", char: "a" });
  s = consoleReducer(s, { type: "type", char: "b" });
  assert.equal(s.buffer, "ab");
  assert.equal(s.activeIndex, 0);
});
test(`buffer is capped at MAX_BUFFER (${MAX_BUFFER})`, () => {
  let s = consoleReducer(base(), { type: "open" });
  for (let i = 0; i < MAX_BUFFER + 10; i += 1) {
    s = consoleReducer(s, { type: "type", char: "x" });
  }
  assert.equal(s.buffer.length, MAX_BUFFER);
});
test("empty and multi-character input never ride 'type'", () => {
  const open = consoleReducer(base(), { type: "open" });
  assert.equal(consoleReducer(open, { type: "type", char: "" }), open);
  assert.equal(consoleReducer(open, { type: "type", char: "paste" }), open);
});
test("backspace removes one character; empty is a no-op", () => {
  let s = consoleReducer(base(), { type: "open" });
  s = consoleReducer(s, { type: "type", char: "a" });
  s = consoleReducer(s, { type: "type", char: "b" });
  assert.equal(consoleReducer(s, { type: "backspace" }).buffer, "a");
  const open = consoleReducer(base(), { type: "open" });
  assert.equal(consoleReducer(open, { type: "backspace" }), open);
});
test("clear empties the buffer; empty clear is a no-op", () => {
  let s = consoleReducer(base(), { type: "open" });
  s = consoleReducer(s, { type: "type", char: "q" });
  assert.equal(consoleReducer(s, { type: "clear" }).buffer, "");
  const open = consoleReducer(base(), { type: "open" });
  assert.equal(consoleReducer(open, { type: "clear" }), open);
});

/* ── Filtering ───────────────────────────────────────────────────────── */

console.log("\n=== FILTER ===");
test("matches labels case-insensitively", () => {
  let s = consoleReducer(base(), { type: "open" });
  s = consoleReducer(s, { type: "type", char: "W" });
  const items = selectItems(s);
  assert.equal(items.length, 1);
  assert.equal(items[0].value, "/work");
});
test("matches paths", () => {
  let s = consoleReducer(base(), { type: "open" });
  s = consoleReducer(s, { type: "type", char: "/" });
  s = consoleReducer(s, { type: "type", char: "l" });
  assert.deepEqual(
    selectItems(s).map((i) => i.value),
    ["/lab"]
  );
});
test("matches the two-digit gutter index", () => {
  let s = consoleReducer(base(), { type: "open" });
  s = consoleReducer(s, { type: "type", char: "0" });
  s = consoleReducer(s, { type: "type", char: "6" });
  assert.deepEqual(
    selectItems(s).map((i) => i.value),
    ["/lab"]
  );
});
test("matches command verbs", () => {
  let s = consoleReducer(base(), { type: "open" });
  for (const c of "mai") s = consoleReducer(s, { type: "type", char: c });
  assert.deepEqual(
    selectItems(s).map((i) => i.value),
    ["mail"]
  );
});
test("no match yields an empty list", () => {
  let s = consoleReducer(base(), { type: "open" });
  for (const c of "zz") s = consoleReducer(s, { type: "type", char: c });
  assert.equal(selectItems(s).length, 0);
});
test("replace sets a whole pasted value and resets the cursor", () => {
  let s = consoleReducer(base(), { type: "open" });
  s = consoleReducer(s, { type: "move", delta: 2 });
  s = consoleReducer(s, { type: "replace", value: "lab" });
  assert.equal(s.buffer, "lab");
  assert.equal(s.activeIndex, 0);
  assert.deepEqual(
    selectItems(s).map((i) => i.value),
    ["/lab"]
  );
});
test("replace truncates to MAX_BUFFER and no-ops on an equal value", () => {
  const open = consoleReducer(base(), { type: "open" });
  const long = "x".repeat(MAX_BUFFER + 20);
  assert.equal(
    consoleReducer(open, { type: "replace", value: long }).buffer.length,
    MAX_BUFFER
  );
  assert.equal(consoleReducer(open, { type: "replace", value: "" }), open);
});
test("replace while collapsed opens with the value intact", () => {
  const s = consoleReducer(base(), { type: "replace", value: "wo" });
  assert.equal(s.status, "open");
  assert.equal(s.buffer, "wo");
});

/* ── Cursor ──────────────────────────────────────────────────────────── */

console.log("\n=== CURSOR ===");
test("move clamps at the last row", () => {
  let s = consoleReducer(base(), { type: "open" });
  s = consoleReducer(s, { type: "move", delta: 99 });
  assert.equal(s.activeIndex, allItems(base()).length - 1);
});
test("move clamps at the first row", () => {
  let s = consoleReducer(base(), { type: "open" });
  s = consoleReducer(s, { type: "move", delta: -99 });
  assert.equal(s.activeIndex, 0);
});
test("move 0 and NaN are no-ops", () => {
  const open = consoleReducer(base(), { type: "open" });
  assert.equal(consoleReducer(open, { type: "move", delta: 0 }), open);
  assert.equal(consoleReducer(open, { type: "move", delta: NaN }), open);
});
test("highlight clamps and ignores negatives", () => {
  const s = consoleReducer(base(), { type: "open" });
  assert.equal(
    consoleReducer(s, { type: "highlight", index: 99 }).activeIndex,
    allItems(base()).length - 1
  );
  assert.equal(consoleReducer(s, { type: "highlight", index: -1 }), s);
});
test("the cursor reaches command rows too (the regression this guards)", () => {
  let s = consoleReducer(base(), { type: "open" });
  s = consoleReducer(s, { type: "move", delta: ROUTES.length });
  assert.equal(s.activeIndex, ROUTES.length, "should land on the first verb");
});

/* ── Registry ───────────────────────────────────────────────────────── */

console.log("\n=== REGISTRY ===");
test("a new route registry resets the cursor", () => {
  let s = consoleReducer(base(), { type: "open" });
  s = consoleReducer(s, { type: "move", delta: 3 });
  const next = [{ id: "home", path: "/", index: "01", label: "Shuru" }];
  s = consoleReducer(s, { type: "routes", routes: next });
  assert.equal(s.activeIndex, 0);
  assert.equal(s.routes, next);
});
test("the same registry reference is a no-op", () => {
  const s = consoleReducer(base(), { type: "open" });
  assert.equal(consoleReducer(s, { type: "routes", routes: s.routes }), s);
});
test("a new verb list is applied and resets the cursor", () => {
  let s = consoleReducer(base(), { type: "open" });
  s = consoleReducer(s, { type: "move", delta: 2 });
  const verbs = [{ kind: "command", label: "RSS", sub: "rss", value: "rss" }];
  s = consoleReducer(s, { type: "commands", commands: verbs });
  assert.equal(s.activeIndex, 0);
  assert.equal(allItems(s).length, ROUTES.length + 1);
});

/* ── Report ──────────────────────────────────────────────────────────── */

const total = passed + failures.length;
console.log(`\n${passed}/${total} console-machine assertions passed.`);
if (failures.length > 0) {
  console.error(`\n${failures.length} FAILED:`);
  for (const f of failures) console.error(`  FAIL ${f.name}\n${f.error.stack}\n`);
  process.exit(1);
}
console.log("Console machine OK.");