"use client";

import dynamic from "next/dynamic";
import { useState } from "react";
import type { Locale } from "@/lib/i18n";

// The chat panel pulls in the AI SDK runtime — never load it until the
// visitor actually opens the widget. ssr:false keeps it out of the static
// export entirely; it is a pure client interaction.
const AgentChat = dynamic(() => import("./AgentChat"), { ssr: false });

const LABELS = {
  en: { open: "Open the assistant chat" },
  fa: { open: "باز کردن گفتگو با دستیار" },
} as const;

/**
 * Floating assistant toggle. The button itself is dependency-free (a few
 * hundred bytes in the shared layout chunk); the entire chat experience —
 * AI SDK, streaming transport, message log — is downloaded on first open.
 */
export default function AgentChatLazy({ locale }: { locale: Locale }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        className="sin-chat-fab"
        aria-label={LABELS[locale].open}
        aria-expanded={open}
        data-open={open || undefined}
        onClick={() => setOpen(true)}
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
      </button>
      {open && <AgentChat locale={locale} onClose={() => setOpen(false)} />}
    </>
  );
}
