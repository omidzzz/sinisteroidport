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
        {/* Sly alien — same face that peeks out of the UFO's dome
            (components/home/drone): inverted-egg head with a pointy chin,
            big vertical-almond eyes with white glints, cartoon-ink strokes.
            Idle: left eye squints (the sly look) over a raised brow, smirk.
            On hover the expression FLIPS — the squinting eye snaps wide, the
            wide eye narrows, the brow lifts, glints travel and the smirk
            blooms into an open neon grin (see .al-* rules in agent-chat.css).
            Theme-aware: the head is the UFO alien green in both themes while
            the neon accents inherit the FAB's `color` (acid token). */}
        <svg viewBox="0 0 128 128" width="52" height="52" aria-hidden>
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

          {/* rotating neon orbit ring — the alien's "abduction halo" */}
          <ellipse
            className="al-orbit"
            cx="64" cy="60" rx="50" ry="52"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeDasharray="6 9"
            opacity="0.35"
            transform="rotate(-14 64 60)"
            style={{ filter: "url(#sin-fab-glow)" }}
          />

          <g className="al-head">
            {/* head — the UFO alien's inverted egg with the pointy chin */}
            <path
              d="M 28,62 C 28,34 48,18 64,18 C 80,18 100,34 100,62 C 100,86 82,101 64,109 C 46,101 28,86 28,62 Z"
              fill="url(#sin-fab-head)"
              style={{ stroke: "var(--fab-edge)" }}
              strokeWidth="3.6"
            />
            {/* dome glare — the same gloss streak as the UFO's glass dome */}
            <path
              d="M 25,35 Q 43,24 60,28 Q 40,35 30,52 Z"
              fill="#ffffff"
              opacity="0.3"
            />

            {/* eyes — the UFO alien's big vertical almonds. The LEFT eye is
                squinted shut-by-default (CSS scaleY) for the sly look; hover
                opens it wide while the right one narrows. */}
            <g className="al-eyes">
              <g className="al-eye al-eye-l">
                <ellipse cx="49" cy="60" rx="10" ry="15" fill="var(--fab-visor)" transform="rotate(-6 49 60)" />
                <circle className="al-glint" cx="46" cy="53" r="2.6" fill="var(--fab-glint)" />
              </g>
              <g className="al-eye al-eye-r">
                <ellipse cx="79" cy="60" rx="10" ry="15" fill="var(--fab-visor)" transform="rotate(6 79 60)" />
                {/* neon acid ring around the wide (open) eye */}
                <ellipse cx="79" cy="60" rx="10" ry="15" fill="none" stroke="currentColor" strokeWidth="1.6" opacity="0.85" transform="rotate(6 79 60)" style={{ filter: "url(#sin-fab-glow)" }} />
                <circle className="al-glint" cx="76" cy="53" r="2.6" fill="var(--fab-glint)" />
              </g>
            </g>

            {/* smug raised brow over the squinting eye */}
            <path
              className="al-brow"
              d="M 30,46 Q 45,38 60,42"
              fill="none"
              style={{ stroke: "var(--fab-edge)" }}
              strokeWidth="3.6"
              strokeLinecap="round"
            />

            {/* mouth — idle smirk; crossfades to an open neon grin on hover */}
            <path
              className="al-smirk"
              d="M 40,88 Q 54,96 66,91 Q 80,86 94,78"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.8"
              strokeLinecap="round"
              style={{ filter: "url(#sin-fab-glow)" }}
            />
            <g className="al-grin">
              <path
                d="M 38,86 Q 64,84 92,78 Q 88,102 62,104 Q 48,100 38,86 Z"
                fill="var(--fab-visor)"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinejoin="round"
                style={{ filter: "url(#sin-fab-glow)" }}
              />
              <ellipse cx="64" cy="98" rx="10" ry="4.5" fill="currentColor" opacity="0.4" />
            </g>
          </g>
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
