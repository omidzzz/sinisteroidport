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
        {/* The menace — same brand DNA as the UFO drone alien (alien-green
            head, ink outline, acid neon) but redrawn hostile: an elongated
            skull with cranial ridges, a deep V scowl, slanted void eyes with
            glowing acid slit pupils, nostril slits and a fanged sneer.
            Idle: the hostile stare + targeting halo; the life signs are a
            slow pupil pulse and one hostile blink every few seconds.
            Press/tap: the pupils flare, the brows slam down, the head
            lunges and the sneer cracks open into a fanged jaw. The flare is
            driven by [data-pressed] (pointerdown/up — identical on touch and
            mouse) with :active/:focus-visible fallbacks; desktop-only
            :hover lives behind a (hover: hover) media query so phones never
            latch a stuck hover state (see the .al-* rules in agent-chat.css).
            Theme-aware: the head is the alien green in both themes while the
            neon accents inherit the FAB's `color` (acid token). */}
        <svg viewBox="0 0 128 128" aria-hidden>
          <defs>
            <linearGradient id="sin-fab-head" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" style={{ stopColor: "var(--fab-head)" }} />
              <stop offset="40%" style={{ stopColor: "var(--fab-head)" }} />
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

          {/* targeting halo — a slow lock-on ring around the skull */}
          <ellipse
            className="al-orbit"
            cx="64" cy="62" rx="50" ry="52"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeDasharray="3 9"
            opacity="0.3"
            transform="rotate(-18 64 62)"
            style={{ filter: "url(#sin-fab-glow)" }}
          />

          <g className="al-head">
            {/* skull — elongated cranium tapering to an angular chin */}
            <path
              d="M 27,58 C 27,30 43,12 64,12 C 85,12 101,30 101,58 C 101,80 93,93 82,102 C 75,107 69,110 64,112 C 59,110 53,107 46,102 C 35,93 27,80 27,58 Z"
              fill="url(#sin-fab-head)"
              style={{ stroke: "var(--fab-edge)" }}
              strokeWidth="3.6"
            />
            {/* cranial ridges — sutures across the dome */}
            <path
              d="M 36,40 C 44,24 54,18 64,18 C 74,18 84,24 92,40"
              fill="none"
              style={{ stroke: "var(--fab-edge)" }}
              strokeWidth="1.6"
              opacity="0.3"
            />
            <path
              d="M 33,52 C 41,32 51,25 64,25 C 77,25 87,32 95,52"
              fill="none"
              style={{ stroke: "var(--fab-edge)" }}
              strokeWidth="1.4"
              opacity="0.2"
            />
            {/* dome glare */}
            <path d="M 32,34 Q 48,22 62,25 Q 44,31 36,48 Z" style={{ fill: "var(--color-ink)" }} opacity="0.22" />
            {/* cheek hatching — gaunt detail */}
            <path d="M 33,72 Q 38,78 44,81" fill="none" style={{ stroke: "var(--fab-edge)" }} strokeWidth="1.4" opacity="0.3" />
            <path d="M 95,72 Q 90,78 84,81" fill="none" style={{ stroke: "var(--fab-edge)" }} strokeWidth="1.4" opacity="0.3" />

            {/* eyes — slanted voids, each carrying a glowing acid slit pupil
                (the press-flare target) and a rim that ignites on press.
                The slant lives on a static group so CSS transforms on the
                pupil/rim can't clobber the rotation. */}
            <g className="al-eyes">
              <g className="al-eye">
                <g transform="rotate(-14 47 57)">
                  <ellipse cx="47" cy="57" rx="11" ry="11.5" fill="var(--fab-visor)" />
                  <ellipse className="al-rim" cx="47" cy="57" rx="11" ry="11.5" fill="none" stroke="currentColor" strokeWidth="1.5" opacity="0.35" />
                  <ellipse className="al-pupil" cx="47" cy="57" rx="2.6" ry="6.5" fill="currentColor" opacity="0.85" style={{ filter: "url(#sin-fab-glow)" }} />
                  <circle className="al-glint" cx="43.5" cy="51.5" r="2.2" fill="var(--fab-glint)" />
                </g>
              </g>
              <g className="al-eye">
                <g transform="rotate(14 81 57)">
                  <ellipse cx="81" cy="57" rx="11" ry="11.5" fill="var(--fab-visor)" />
                  <ellipse className="al-rim" cx="81" cy="57" rx="11" ry="11.5" fill="none" stroke="currentColor" strokeWidth="1.5" opacity="0.35" />
                  <ellipse className="al-pupil" cx="81" cy="57" rx="2.6" ry="6.5" fill="currentColor" opacity="0.85" style={{ filter: "url(#sin-fab-glow)" }} />
                  <circle className="al-glint" cx="84.5" cy="51.5" r="2.2" fill="var(--fab-glint)" />
                </g>
              </g>
            </g>

            {/* deep V scowl plates — hugging the eye tops */}
            <path className="al-brow" d="M 32,42 L 56,36 L 59,46 L 35,50 Z" fill="var(--fab-edge)" />
            <path className="al-brow" d="M 96,42 L 72,36 L 69,46 L 93,50 Z" fill="var(--fab-edge)" />

            {/* nostril slits */}
            <ellipse cx="59" cy="76" rx="1.8" ry="3.6" fill="var(--fab-edge)" opacity="0.5" transform="rotate(-10 59 76)" />
            <ellipse cx="69" cy="76" rx="1.8" ry="3.6" fill="var(--fab-edge)" opacity="0.5" transform="rotate(10 69 76)" />

            {/* mouth — idle fanged sneer (ink shadow line above, acid lip +
                fangs below); crossfades to a cracked-open jaw on press */}
            <g className="al-grimace">
              <path
                d="M 40,86.5 Q 64,91.5 88,86.5"
                fill="none"
                style={{ stroke: "var(--fab-edge)" }}
                strokeWidth="2"
                opacity="0.45"
                strokeLinecap="round"
              />
              <path
                d="M 37,89 Q 64,95 91,89"
                fill="none"
                stroke="currentColor"
                strokeWidth="3"
                strokeLinecap="round"
                style={{ filter: "url(#sin-fab-glow)" }}
              />
              <path
                d="M 45,91 L 47.5,98.5 M 64,94.3 L 64,101 M 83,91 L 80.5,98.5"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.4"
                strokeLinecap="round"
                style={{ filter: "url(#sin-fab-glow)" }}
              />
            </g>
            <g className="al-jaw">
              <path
                d="M 36,86 Q 64,82 92,86 Q 91,102 64,108 Q 37,102 36,86 Z"
                fill="var(--fab-visor)"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinejoin="round"
                style={{ filter: "url(#sin-fab-glow)" }}
              />
              <path
                d="M 46,87 L 48,94 M 58,85.5 L 58,94 M 70,85.5 L 70,94 M 82,87 L 80,94"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              />
              <path
                d="M 52,103.5 L 52,99 M 76,103.5 L 76,99"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                opacity="0.7"
              />
              <ellipse cx="64" cy="99" rx="8" ry="3.5" fill="currentColor" opacity="0.35" />
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
