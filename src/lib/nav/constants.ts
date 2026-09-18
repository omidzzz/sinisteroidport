/**
 * Console tuning constants — no magic numbers in the components.
 */

/** The buffer cap is owned by the machine (its invariant); re-exported here
 *  so the rest of the app has one import path for console constants. */
export { MAX_BUFFER } from "./machine";

/** The prompt's host line — decorative, but it is the console's whole
 *  identity, so it lives here rather than inline in the component. */
export const PROMPT_HOST = "omid@sinisteroid";

/** DOM ids the combobox pattern wires together (input ↔ listbox). */
export const CONSOLE_IDS = {
  list: "craft-console-list",
  prompt: "craft-console-prompt",
  row: (value: string) => `craft-console-row-${value.replace(/[^a-z0-9]/gi, "-")}`,
} as const;

/** Milliseconds the node ring keeps animating after the pointer rests. */
export const RING_IDLE_MS = 1400;

/** Pointer → ring-position smoothing factor (one rAF step). */
export const RING_LERP = 0.16;

/** Event names — every bridge between DOM and the console goes through
 *  these, so unrelated components (agent FAB, easter egg, footer) can
 *  open/steer the console without importing it. */
export const CONSOLE_EVENTS = {
  open: "craft:console-open",
  ask: "sinister:ask", // pre-existing contract — the agent FAB listens
} as const;

/** The verbs, in tree order. Actual labels come from the dictionary; this
 *  table defines ORDER and value. */
export const VERB_ORDER = [
  "ask",
  "mail",
  "lang",
  "rss",
  "donate",
  "sudo",
] as const;

/** Keys the console claims globally while open. */
export const NAVIGATE_KEYS = new Set([
  "ArrowUp",
  "ArrowDown",
  "ArrowLeft",
  "ArrowRight",
  "Enter",
  "Escape",
  "Tab",
  "Backspace",
]);

