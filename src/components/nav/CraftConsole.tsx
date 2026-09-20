"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type KeyboardEvent,
} from "react";
import { usePathname, useRouter } from "next/navigation";
import { getDict, loc, type Locale } from "@/lib/i18n";
import { buildCommands } from "@/lib/nav/commands";
import { CONSOLE_EVENTS, CONSOLE_IDS } from "@/lib/nav/constants";
import { buildRoutes } from "@/lib/nav/routes";
import type { ConsoleItem, ConsoleVerb } from "@/lib/nav/types";
import { useConsole } from "@/lib/nav/use-console";
import { usePointerRing } from "@/lib/nav/use-pointer-ring";
import { SITE } from "@/lib/site";
import ConsolePrompt from "./ConsolePrompt";
import ConsoleRail from "./ConsoleRail";
import ConsoleRing from "./ConsoleRing";
import ConsoleTree from "./ConsoleTree";
import NavMenuButton from "./NavMenuButton";

/** How long a verb's feedback line stays on screen. */
const NOTICE_MS = 3200;

/**
 * CRAFT CONSOLE — the site's entire navigation system.
 *
 * Not a navbar with an unusual skin: the primary interface is a prompt. The
 * visitor types (or taps, or presses the menu button) and the site answers
 * as a file tree — eight routes as the pages that render them, then the
 * verbs that do things the pages cannot (ask the agent, copy the address,
 * switch language, open the feed, donate, and one command that refuses).
 *
 * Deliberately NOT: a top bar, a sidebar, a hamburger, a drawer, or a
 * full-screen overlay. One surface, one focus owner, one keyboard cursor,
 * sitting at the end of the document where a terminal prompt belongs.
 *
 * Registries are INIT-ONLY (useState initializers, not effects). Syncing
 * props into reducer state would cost a second render on mount and could
 * briefly filter the previous locale's labels; the layout keys this
 * component by locale instead, so switching language remounts it with the
 * right words. Simpler, and strictly correct.
 */
export default function CraftConsole({ locale }: { locale: Locale }) {
  const dict = getDict(locale);
  const router = useRouter();
  const pathname = usePathname() ?? loc(locale, "/");

  const [routes] = useState(() => buildRoutes(dict));
  const [commands] = useState(() => buildCommands(dict));

  const { state, items, active, focusRef, dispatch, close, toggle } = useConsole(
    routes,
    commands
  );
  const open = state.status === "open";

  const shellRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const menuRef = useRef<HTMLButtonElement>(null);
  const noticeTimer = useRef<number | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  // The ring leans toward the pointer — only while open, so a collapsed
  // page never runs a rAF loop.
  usePointerRing(shellRef, open);

  /* ─ Focus discipline ──────────────────────────────────────────────
     Opening for typing moves focus into the field; opening for browsing
     does not. Closing hands focus back to the disclosure button if the
     field still owned it, so keyboard users are never left in limbo. */
  useEffect(() => {
    if (open) {
      if (!focusRef.current) return;
      focusRef.current = false;
      const id = requestAnimationFrame(() => inputRef.current?.focus());
      return () => cancelAnimationFrame(id);
    }
    if (document.activeElement === inputRef.current) menuRef.current?.focus();
  }, [open, focusRef]);

  useEffect(
    () => () => {
      if (noticeTimer.current) window.clearTimeout(noticeTimer.current);
    },
    []
  );

  const announce = useCallback((text: string) => {
    setNotice(text);
    if (noticeTimer.current) window.clearTimeout(noticeTimer.current);
    noticeTimer.current = window.setTimeout(() => setNotice(null), NOTICE_MS);
  }, []);
    /* ── Verbs ───────────────────────────────────────────────────────────
     The reducer never performs side effects; the container does. `ask`
     hands the typed remainder to the resident agent through the same
     `sinister:ask` event the rest of the site already dispatches. */
  const runVerb = useCallback(
    (verb: ConsoleVerb) => {
      switch (verb) {
        case "ask": {
          const question = state.buffer.trim();
          window.dispatchEvent(
            new CustomEvent<string | undefined>(CONSOLE_EVENTS.ask, {
              detail: question || undefined,
            })
          );
          close();
          break;
        }
        case "mail": {
          void navigator.clipboard?.writeText(SITE.email).catch(() => {
            /* clipboard blocked — the address stays visible on /contact */
          });
          announce(dict.console.copied);
          break;
        }
        case "lang": {
          const cleanPath = pathname.replace(/^\/(en|fa)(?=\/|$)/, "") || "/";
          close();
          router.push(loc(locale === "en" ? "fa" : "en", cleanPath));
          break;
        }
        case "rss": {
          window.open(
            locale === "fa" ? "/fa/feed.xml" : "/feed.xml",
            "_blank",
            "noopener"
          );
          close();
          break;
        }
        case "donate": {
          window.open(SITE.donate, "_blank", "noopener");
          close();
          break;
        }
        case "sudo":
          // The one command that exists purely to be refused.
          announce(dict.console.verbs.sudo);
          dispatch({ type: "clear" });
          break;
      }
    },
    [announce, close, dict, dispatch, locale, pathname, router, state.buffer]
  );
  const commit = useCallback(
    (item: ConsoleItem | null) => {
      if (!item) return;
      if (item.kind === "route") {
        close();
        router.push(loc(locale, item.value));
        return;
      }
      runVerb(item.value as ConsoleVerb);
    },
    [close, locale, router, runVerb]
  );

  /* ─ Keyboard ownership while OPEN ───────────────────────────────────
     Focusing the prompt is the common case, but not the only one: the
     disclosure button deliberately opens the console for BROWSING without
     moving focus, and Escape pressed there used to do nothing at all — a
     real a11y bug, caught by scripts/tools/verify-mobile-chrome.mjs. While
     open, the console therefore owns Escape, the arrow keys, Enter and any
     printable key wherever focus happens to be, focusing the field when a
     keystroke belongs in the filter.

     When the prompt DOES have focus its own handler runs first and calls
     preventDefault, so this listener defers to it and nothing is handled
     twice. */
  useEffect(() => {
    if (!open) return;

    const onKeyDown = (event: globalThis.KeyboardEvent) => {
      if (event.defaultPrevented) return;

      if (event.key === "Escape") {
        event.preventDefault();
        close();
        return;
      }
      if (event.ctrlKey || event.metaKey || event.altKey) return;

      const target = event.target as HTMLElement | null;
      if (target === inputRef.current) return; // the prompt owns it
      if (
        target?.isContentEditable ||
        target?.tagName === "INPUT" ||
        target?.tagName === "TEXTAREA"
      ) {
        return;
      }

      if (event.key === "ArrowDown" || event.key === "ArrowUp") {
        event.preventDefault();
        dispatch({ type: "move", delta: event.key === "ArrowDown" ? 1 : -1 });
        return;
      }
      if (event.key === "Enter") {
        event.preventDefault();
        commit(active);
        return;
      }
      if (event.key.length === 1) {
        event.preventDefault();
        inputRef.current?.focus();
        dispatch({ type: "type", char: event.key });
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, active, close, commit, dispatch]);

  const onKeyDown = useCallback(
    (event: KeyboardEvent<HTMLInputElement>) => {
      switch (event.key) {
        case "ArrowDown":
          event.preventDefault();
          dispatch({ type: "move", delta: 1 });
          break;
        case "ArrowUp":
          event.preventDefault();
          dispatch({ type: "move", delta: -1 });
          break;
        case "Enter":
          event.preventDefault();
          commit(active);
          break;
        case "Escape":
          event.preventDefault();
          close();
          break;
        case "Tab":
          // Never trap focus: closing returns the page to its normal order.
          close();
          break;
        default:
          break;
      }
    },
    [active, close, commit, dispatch]
  );

  /* ── Derived labels ────────────────────────────────────────────────── */
  const cleanPath = pathname.replace(/^\/(en|fa)(?=\/|$)/, "") || "/";
  const currentRoute = routes.find((route) =>
    route.path === "/" ? cleanPath === "/" : cleanPath.startsWith(route.path)
  );
  const hotId =
    active?.kind === "route"
      ? routes.find((route) => route.path === active.value)?.id
      : undefined;
  const activeId = open && active ? CONSOLE_IDS.row(active.value) : undefined;

  return (
    <div className="craft-console" ref={shellRef} data-open={open || undefined}>
      <NavMenuButton
        dict={dict}
        current={currentRoute?.label ?? ""}
        open={open}
        controls={CONSOLE_IDS.list}
        buttonRef={menuRef}
        onToggle={toggle}
      />

      <div className="craft-dock">
        <ConsoleRing routes={routes} hotId={hotId} />

        <div className="craft-panel" hidden={!open}>
          <ConsoleTree
            dict={dict}
            items={items}
            activeIndex={state.activeIndex}
            onHover={(index) => dispatch({ type: "highlight", index })}
            onCommit={commit}
          />
        </div>

        <ConsoleRail
          routes={routes}
          locale={locale}
          railLabel={dict.console.rail}
          activePath={cleanPath}
        />

        <ConsolePrompt
          dict={dict}
          buffer={state.buffer}
          open={open}
          itemCount={items.length}
          activeId={activeId}
          inputRef={inputRef}
          onValue={(value) => dispatch({ type: "replace", value })}
          onKeyDown={onKeyDown}
          onActivate={() => {
            focusRef.current = true;
            dispatch({ type: "open" });
          }}
        />

        <p className="craft-notice" role="status" aria-live="polite">
          {notice}
        </p>
      </div>
    </div>
  );
}

