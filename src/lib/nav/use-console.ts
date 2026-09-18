"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useReducer,
  useRef,
} from "react";
import { CONSOLE_EVENTS } from "./constants";
import { consoleReducer, createConsoleState, selectItems } from "./machine";
import type { ConsoleAction, ConsoleItem, ConsoleState, NavRoute } from "./types";

export interface ConsoleController {
  state: ConsoleState;
  /** The filtered rows the tree renders, in order. */
  items: ConsoleItem[];
  /** The row under the cursor (Enter commits this one). */
  active: ConsoleItem | null;
  /**
   * Whether the NEXT open should move DOM focus into the field. Set by the
   * paths that are inherently about typing (a keypress, tapping the prompt)
   * and left false by the "browse the menu" paths (the disclosure button),
   * so touch and screen-reader users are never handed a keyboard unasked.
   *
   * Deliberately a structural `{ current }` type rather than React's
   * MutableRefObject, which moved between React 18 and 19 typings.
   */
  focusRef: { current: boolean };
  dispatch: (action: ConsoleAction) => void;
  open: () => void;
  close: () => void;
  toggle: () => void;
}

/**
 * The console's React binding: state machine + keyboard wiring, no markup.
 *
 * Two deliberate design decisions:
 *
 * 1. Registries are INIT-ONLY. Rather than syncing props into reducer state
 *    with an effect (extra render, and a class of bug where a locale switch
 *    briefly filters the old labels), the layout keys <CraftConsole> by
 *    locale: switching language remounts the console with fresh labels.
 *
 * 2. The keyboard has exactly one owner at a time. While COLLAPSED a global
 *    listener turns the first printable key or "/" into "open + seed the
 *    filter" (the console IS the menu — there is no other way in). While
 *    OPEN the visible <input> owns every key, so nothing double-handles a
 *    keystroke or fights the browser's own editing behaviour.
 */
export function useConsole(
  routes: readonly NavRoute[],
  commands: readonly ConsoleItem[]
): ConsoleController {
  const [state, dispatch] = useReducer(consoleReducer, undefined, () =>
    createConsoleState(routes, commands)
  );

  const focusRef = useRef(false);

  const items = useMemo(() => selectItems(state), [state]);
  const active = items[state.activeIndex] ?? null;

  const open = useCallback(() => dispatch({ type: "open" }), []);
  const close = useCallback(() => dispatch({ type: "close" }), []);
  const toggle = useCallback(() => dispatch({ type: "toggle" }), []);

  /* ── Summoned from anywhere (a11y button, footer, palette) ────────── */
  useEffect(() => {
    const onOpen = () => dispatch({ type: "open" });
    window.addEventListener(CONSOLE_EVENTS.open, onOpen);
    return () => window.removeEventListener(CONSOLE_EVENTS.open, onOpen);
  }, []);

  /* ── Type-to-open, only while collapsed ───────────────────────────── */
  useEffect(() => {
    if (state.status === "open") return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.defaultPrevented) return;

      // Ctrl/⌘+K also opens; other modifier combos belong to the browser.
      if (event.ctrlKey || event.metaKey) {
        if (event.key.toLowerCase() === "k") {
          event.preventDefault();
          dispatch({ type: "open" });
        }
        return;
      }
      if (event.altKey) return;

      // Never hijack typing aimed at a real field on the page.
      const target = event.target as HTMLElement | null;
      if (
        target?.isContentEditable ||
        target?.tagName === "INPUT" ||
        target?.tagName === "TEXTAREA" ||
        target?.tagName === "SELECT"
      ) {
        return;
      }
      if (event.key !== "/" && (event.key.length !== 1 || /\s/.test(event.key))) {
        return;
      }

      event.preventDefault();
      // A keypress is a typing intent: the field must take focus.
      focusRef.current = true;
      // "replace" (not "type") because the value is already whole here.
      dispatch({ type: "replace", value: event.key });
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [state.status]);

  return { state, items, active, focusRef, dispatch, open, close, toggle };
}