/**
 * Console reducer — the CRAFT CONSOLE's entire behaviour as a pure
 * (state, action) → state function.
 *
 * DOM-free by design: no window, no document, no timers, no imports. Every
 * state transition the console can make is expressed here and exercised by
 * scripts/tools/verify-nav-machine.mjs (which loads this file directly with
 * Node's type stripping — hence zero imports and erasable syntax only).
 * Components never invent state: they dispatch actions and read selectors.
 */

/** The buffer is a filter, not an editor — keep it tight. Owned here so the
 *  invariant and its enforcement live in the same file. */

import type {
  ConsoleAction,
  ConsoleItem,
  ConsoleState,
  NavRoute,
} from "./types";
export const MAX_BUFFER = 32;

/** Initial state — collapsed, empty buffer, no rows until the layout
 *  dispatches them (server-rendered data crosses on mount). */
export function createConsoleState(
  routes: readonly NavRoute[] = [],
  commands: readonly ConsoleItem[] = []
): ConsoleState {
  return {
    status: "collapsed",
    routes,
    commands,
    buffer: "",
    activeIndex: 0,
    lastTransition: null,
  };
}

/** Case-insensitive substring match over the row's searchable text. */
function matches(item: ConsoleItem, buffer: string): boolean {
  if (!buffer) return true;
  const needle = buffer.toLowerCase();
  return (
    item.label.toLowerCase().includes(needle) ||
    item.sub.toLowerCase().includes(needle) ||
    (item.index?.startsWith(needle) ?? false)
  );
}

/** The full item list in tree order: routes first, then command verbs. */
export function allItems(state: {
  routes: readonly NavRoute[];
  commands: readonly ConsoleItem[];
}): ConsoleItem[] {
  return [
    ...state.routes.map((r) => ({
      kind: "route" as const,
      label: r.label,
      sub: r.path,
      value: r.path,
      index: r.index,
    })),
    ...state.commands,
  ];
}

/** The filtered, ordered item list the tree renders. */
export function selectItems(state: ConsoleState): ConsoleItem[] {
  return allItems(state).filter((i) => matches(i, state.buffer));
}

/** Clamp helper — the active row can never escape the list. */
function clamp(index: number, length: number): number {
  if (length <= 0) return 0;
  return Math.min(Math.max(index, 0), length - 1);
}

/** The number of rows the tree currently shows — the cursor's valid range.
 *  Clamping against the UNFILTERED count let the cursor escape past the end
 *  of a filtered list, which made `active` null and Enter commit nothing
 *  (five failing browser assertions traced back to this one bug). */
function filteredCount(state: ConsoleState): number {
  return allItems(state).filter((i) => matches(i, state.buffer)).length;
}

export function consoleReducer(
  state: ConsoleState,
  action: ConsoleAction
): ConsoleState {
  switch (action.type) {
    case "open": {
      if (state.status === "open") return state;
      // Re-opening starts a fresh filter — the buffer is ephemeral.
      return {
        ...state,
        status: "open",
        buffer: "",
        activeIndex: 0,
        lastTransition: "open",
      };
    }

    case "close": {
      if (state.status === "collapsed") return state;
      return {
        ...state,
        status: "collapsed",
        buffer: "",
        activeIndex: 0,
        lastTransition: "close",
      };
    }

    case "toggle":
      return consoleReducer(state, {
        type: state.status === "open" ? "close" : "open",
      });

    case "type": {
      const char = action.char;
      // Control characters and multi-char pastes never ride "type".
      if (!char || char.length !== 1) return state;
      if (state.status !== "open") {
        // Typing while collapsed opens first — the console IS the menu.
        // ORDER MATTERS: `open` clears the buffer by design, so the typed
        // character must land AFTER it. Seeding the buffer before the open
        // dispatch silently swallowed the first key (caught by the machine
        // test in scripts/tools/verify-nav-machine.mjs).
        return {
          ...consoleReducer(state, { type: "open" }),
          buffer: char.slice(0, MAX_BUFFER),
        };
      }
      if (state.buffer.length >= MAX_BUFFER) return state;
      return { ...state, buffer: state.buffer + char, activeIndex: 0 };
    }

    case "replace": {
      // The prompt is a real <input>, so paste and IME composition arrive as
      // a whole new value rather than keystrokes.
      const value = action.value.slice(0, MAX_BUFFER);
      if (value === state.buffer) return state;
      if (state.status !== "open") {
        return {
          ...consoleReducer(state, { type: "open" }),
          buffer: value,
        };
      }
      return { ...state, buffer: value, activeIndex: 0 };
    }

    case "backspace": {
      if (!state.buffer) return state;
      return { ...state, buffer: state.buffer.slice(0, -1), activeIndex: 0 };
    }

    case "clear": {
      if (!state.buffer) return state;
      return { ...state, buffer: "", activeIndex: 0 };
    }

    case "move": {
      if (!Number.isFinite(action.delta) || action.delta === 0) return state;
      return {
        ...state,
        activeIndex: clamp(state.activeIndex + action.delta, filteredCount(state)),
      };
    }

    case "highlight": {
      if (!Number.isInteger(action.index) || action.index < 0) return state;
      const index = clamp(action.index, filteredCount(state));
      return index === state.activeIndex ? state : { ...state, activeIndex: index };
    }

    case "routes": {
      // Locale switch or first mount: swap the registry, keep the status.
      if (state.routes === action.routes) return state;
      return { ...state, routes: action.routes, activeIndex: 0 };
    }

    case "commands": {
      if (state.commands === action.commands) return state;
      return { ...state, commands: action.commands, activeIndex: 0 };
    }

    default: {
      // Exhaustiveness guard — a new action variant must be handled above.
      const exhaustive: never = action;
      return exhaustive;
    }
  }
}
