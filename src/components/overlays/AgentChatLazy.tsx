"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useRef, useState } from "react";
import type { Locale } from "@/lib/i18n";
import { trackEvent } from "@/lib/analytics";
import { SparkIcon } from "@/components/ui/icons";
import SelectionAsk from "./SelectionAsk";

// The chat panel pulls in the AI SDK runtime — never load it until the
// visitor actually opens the widget. ssr:false keeps it out of the static
// export entirely; it is a pure client interaction.
const AgentChat = dynamic(() => import("./AgentChat"), { ssr: false });

const LABELS = {
  en: {
    open: "Open the assistant chat",
    hint: "the menace is in — ask it something.",
  },
  fa: {
    open: "باز کردن گفتگو با دستیار",
    hint: "سینیستر اومده — یه چیزی ازش بپرس.",
  },
} as const;

const HINT_KEY = "sin-chat-hint-seen";

/**
 * Floating assistant toggle. The button itself is dependency-free (a few
 * hundred bytes in the shared layout chunk); the entire chat experience —
 * AI SDK, streaming transport, message log — is downloaded on first open.
 *
 * Once opened, the panel stays mounted and toggles visibility instead of
 * unmounting, so in-flight responses finish in the background and a
 * completed-while-hidden response lights up the FAB's attention dot.
 */
export default function AgentChatLazy({ locale }: { locale: Locale }) {
  // Deep-link boot: an ?ask=… query param opens the panel with the question
  // pre-loaded on first render (lazy initializer — this wrapper only mounts
  // client-side, so reading the URL here is hydration-safe).
  const [boot] = useState(() => {
    let question: string | null = null;
    try {
      const q = new URLSearchParams(window.location.search).get("ask");
      if (q && q.trim()) question = q.trim();
    } catch {
      /* malformed URL — ignore */
    }
    return { started: question !== null, visible: question !== null, question };
  });
  const [started, setStarted] = useState(boot.started);
  const [visible, setVisible] = useState(boot.visible);
  const [ask, setAsk] = useState<string | null>(boot.question);
  const [unread, setUnread] = useState(false);
  const fabRef = useRef<HTMLButtonElement>(null);

  // First-visit hint — a small nudge near the FAB, shown once and never
  // again (dismissed on open or after a few seconds).
  // MUST resolve post-mount: reading localStorage during the SSR render
  // returns a DIFFERENT answer than the client's first pass (server hits
  // the catch block → false; a fresh client → true), which makes the
  // server HTML mismatch the client's render — a React hydration error on
  // literally every first-time visitor. So the first render is always
  // hint=false on both sides; the real value is read once, after mount.
  const [hint, setHint] = useState(false);
  const mounted = useRef(false);
  useEffect(() => {
    if (mounted.current) return;
    mounted.current = true;
    let seen = true;
    try {
      seen = localStorage.getItem(HINT_KEY) === "1";
    } catch {
      /* storage blocked — treat as seen so we don't nag */
    }
    setHint(!seen);
  }, []);
  useEffect(() => {
    if (!hint) return;
    const id = window.setTimeout(() => setHint(false), 12_000);
    return () => window.clearTimeout(id);
  }, [hint]);

  const dismissHint = useCallback(() => {
    setHint(false);
    try {
      localStorage.setItem(HINT_KEY, "1");
    } catch {
      /* storage blocked — the hint may re-appear next visit */
    }
  }, []);

  const open = useCallback(
    (question?: string) => {
      dismissHint();
      setStarted(true);
      setVisible(true);
      setUnread(false);
      if (question) setAsk(question);
      trackEvent(
        "chat_open",
        question ? { locale, source: "deep_link" } : { locale },
      );
    },
    [locale, dismissHint],
  );

  const close = useCallback(() => {
    setVisible(false);
    fabRef.current?.focus();
  }, []);

  // Press/flare state for the FAB face — set directly on the element (no
  // re-render). Pointer events fire identically on touch and mouse, so the
  // menace expression behaves the same on every device; :active and
  // :focus-visible mirror it for keyboard and other input paths.
  const setPressed = useCallback((pressed: boolean) => {
    const el = fabRef.current;
    if (!el) return;
    if (pressed) el.setAttribute("data-pressed", "");
    else el.removeAttribute("data-pressed");
  }, []);

  // Keyboard summon: Ctrl+Shift+A toggles the panel (guarded against typing
  // in an input so browser select-all still works inside fields).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!(e.ctrlKey || e.metaKey) || !e.shiftKey) return;
      if (e.key.toLowerCase() !== "a") return;
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.isContentEditable)
      ) {
        return;
      }
      e.preventDefault();
      if (visible) close();
      else open();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, close, visible]);

  // Analytics for the boot-time deep link (state itself was set lazily).
  useEffect(() => {
    if (boot.question) {
      trackEvent("chat_open", { locale, source: "deep_link" });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- boot once
  }, []);

  // sinister:ask custom events, dispatched from anywhere on the site
  // (blog "ask about this post" buttons, the command palette's Ask SINISTER
  // action, page-level buttons). An empty detail just opens the panel.
  useEffect(() => {
    const onAsk = (e: Event) => {
      const q = (e as CustomEvent<string>).detail;
      open(q && q.trim() ? q.trim() : undefined);
    };
    window.addEventListener("sinister:ask", onAsk);
    return () => window.removeEventListener("sinister:ask", onAsk);
  }, [open]);

  // Strip ?ask= from the URL so a refresh doesn't re-fire the question.
  useEffect(() => {
    if (!ask) return;
    try {
      const url = new URL(window.location.href);
      if (url.searchParams.has("ask")) {
        url.searchParams.delete("ask");
        window.history.replaceState(null, "", url.toString());
      }
    } catch {
      /* noop */
    }
  }, [ask]);

  return (
    <>
      {hint && !started && (
        <div className="sin-chat-fab-hint" role="status">
          <SparkIcon />
          <span>{LABELS[locale].hint}</span>
        </div>
      )}
      <button
        type="button"
        className="sin-chat-fab"
        ref={fabRef}
        aria-label={LABELS[locale].open}
        aria-expanded={visible}
        data-open={visible || undefined}
        data-attention={unread || undefined}
        onPointerDown={() => setPressed(true)}
        onPointerUp={() => setPressed(false)}
        onPointerCancel={() => setPressed(false)}
        onPointerLeave={() => setPressed(false)}
        onClick={() => (visible ? close() : open())}
      >
        {/* A plain chat glyph, drawn the way every other icon on the site is
            drawn: one 1.5px currentColor stroke on a 24×24 grid, round caps
            and joins, no filter, no fill. It inherits the button's `color`
            (the acid token in the neon registers, --color-ink on paper).
            The previous art — an elongated alien skull with an ink outline,
            a glow filter, slanted void eyes and a fanged jaw that cracked
            open on press — was ~145 lines of SVG plus ~190 lines of .al-*
            animation rules, and it was the loudest object in an edition
            built entirely from hairlines and rules. The print register draws
            its marks as rules; so does this. Press/tap is a plain scale on
            the glyph (agent-chat.css), not a change of face. */}
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={1.5}
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden
        >
          <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5Z" />
        </svg>
        {/* unread-response dot — lit while the panel is hidden and SINISTER
            has finished scheming */}
        <span className="sin-chat-fab-dot" aria-hidden />
      </button>
      {started && (
        <AgentChat
          locale={locale}
          visible={visible}
          initialAsk={ask}
          onClose={close}
          onUnread={setUnread}
        />
      )}
      <SelectionAsk locale={locale} />
    </>
  );
}
