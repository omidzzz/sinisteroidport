/**
 * Console domain types — the vocabulary of the CRAFT CONSOLE nav.
 *
 * The console is ONE navigation surface for the whole site: a floating
 * terminal prompt that expands into a live file-tree of the routes and
 * understands a handful of command verbs. Everything here is pure data —
 * the reducer (machine.ts) must stay DOM-free so it can be unit-tested
 * by scripts/tools/verify-nav-machine.mjs without a DOM.
 */

/** Dock visibility. Two states only — the "prompt" is simply the open
 *  state with an empty buffer. */
export type ConsoleStatus = "collapsed" | "open";

/** One navigable route in the console tree. Built from the site's
 *  canonical route registry (lib/nav.ts + the locale dictionary). */
export interface NavRoute {
  /** Stable key — the path without slashes ("work"). */
  id: string;
  /** Locale-independent path ("/work") — loc() prefixes it. */
  path: string;
  /** Two-digit ordinal from the dictionary ("02"), kept for the tree. */
  index: string;
  /** Localized label — also the accessible name of the link. */
  label: string;
}

/** Command verbs the console understands beyond plain navigation. */
export type ConsoleVerb = "ask" | "mail" | "lang" | "rss" | "donate" | "sudo";

/** Everything the console can act on. The component maps COMMIT results
 *  to side effects (navigation, events) — never the reducer. */
export type ConsoleAction =
  | { type: "open" }
  | { type: "close" }
  | { type: "toggle" }
  | { type: "type"; char: string }
  | { type: "replace"; value: string }
  | { type: "backspace" }
  | { type: "clear" }
  | { type: "move"; delta: number }
  | { type: "highlight"; index: number }
  | { type: "routes"; routes: readonly NavRoute[] }
  | { type: "commands"; commands: readonly ConsoleItem[] }
  | { type: "history-up" }
  | { type: "history-down" };

export interface ConsoleState {
  status: ConsoleStatus;
  /** Canonical route list (locale-aware, order = tree order). */
  routes: readonly NavRoute[];
  /** Command rows (locale labels), appended after the routes. */
  commands: readonly ConsoleItem[];
  /** The typed filter — also what the prompt renders. */
  buffer: string;
  /** Index into the FILTERED item list (see selectItems). */
  activeIndex: number;
  /** Direction of the last open/close, for the panel's animation. */
  lastTransition: "open" | "close" | null;
  /** Command history — most recent first. */
  history: string[];
  /** Position in history during recall (-1 = not recalling). */
  historyIndex: number;
  /** The last executed command, for the collapsed-state echo. */
  lastCommand: string;
}

/** One row in the console tree: either a route link or a command verb. */
export interface ConsoleItem {
  kind: "route" | "command";
  /** Accessible label of the row. */
  label: string;
  /** Secondary text — the path for routes, the verb for commands. */
  sub: string;
  /** The route path (kind "route") or the verb (kind "command"). */
  value: string;
  /** Two-digit ordinal shown in the gutter (routes only). */
  index?: string;
}
