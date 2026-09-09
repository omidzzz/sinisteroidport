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
  const [hint, setHint] = useState<boolean>(() => {
    try {
      return localStorage.getItem(HINT_KEY) !== "1";
    } catch {
      return false;
    }
  });
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
        onClick={() => (visible ? close() : open())}
      >
        {/* Sly smirking robot — adapted from the 128px design: squint eye +
            smug brow + wide glinting eye + smirk. Theme-aware: the head pops
            to a light surface in light mode while the accent (eyes/mouth)
            inherits the FAB's `color`, which tracks the acid token. */}
        <svg viewBox="0 0 128 128" width="44" height="44" aria-hidden>
          <defs>
            <linearGradient id="sin-fab-head" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" style={{ stopColor: "var(--fab-head)" }} />
              <stop offset="100%" style={{ stopColor: "var(--fab-head2)" }} />
            </linearGradient>
            <filter id="sin-fab-glow" x="-80%" y="-80%" width="260%" height="260%">
              <feGaussianBlur in="SourceGraphic" stdDeviation="2.2" result="b" />
              <feMerge>
                <feMergeNode in="b" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {/* antenna */}
          <path
            d="M 88,24 Q 94,10 92,4"
            fill="none"
            style={{ stroke: "var(--fab-edge)" }}
            strokeWidth="3.4"
            strokeLinecap="round"
          />
          <circle cx="92" cy="4" r="5" fill="currentColor" style={{ filter: "url(#sin-fab-glow)" }} />

          {/* ear pods */}
          <rect x="9" y="50" width="13" height="26" rx="6" fill="url(#sin-fab-head)" style={{ stroke: "var(--fab-edge)" }} strokeWidth="2.4" />
          <rect x="106" y="50" width="13" height="26" rx="6" fill="url(#sin-fab-head)" style={{ stroke: "var(--fab-edge)" }} strokeWidth="2.4" />

          {/* head */}
          <rect x="20" y="22" width="88" height="86" rx="20" fill="url(#sin-fab-head)" style={{ stroke: "var(--fab-edge)" }} strokeWidth="3.2" />

          {/* visor */}
          <rect x="31" y="46" width="66" height="46" rx="14" fill="var(--fab-visor)" style={{ stroke: "currentColor" }} strokeWidth="1.4" opacity="0.9" />

          {/* smug raised brow over the squinting eye */}
          <rect x="41" y="56" width="18" height="4" rx="2" fill="var(--fab-edge)" transform="rotate(-16 50 58)" />

          {/* squinting eye (sly) */}
          <rect x="40" y="68" width="20" height="5" rx="2.5" fill="currentColor" style={{ filter: "url(#sin-fab-glow)" }} />

          {/* normal eye, wide with a mischievous glint */}
          <circle cx="80" cy="68" r="9" fill="var(--fab-visor)" style={{ stroke: "currentColor" }} strokeWidth="1.6" />
          <circle cx="80" cy="68" r="5.4" fill="currentColor" style={{ filter: "url(#sin-fab-glow)" }} />
          <circle cx="77.5" cy="65" r="1.6" fill="var(--fab-glint)" />

          {/* smirking mouth */}
          <path
            d="M 42,84 Q 60,90 68,83 Q 76,78 88,80"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.6"
            strokeLinecap="round"
            style={{ filter: "url(#sin-fab-glow)" }}
          />
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
