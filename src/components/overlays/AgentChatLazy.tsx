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
        {/* Sly smirking robot — dot eye, half-lidded eye, lopsided smirk */}
        <svg viewBox="0 0 24 24" width="23" height="23" aria-hidden>
          <circle cx="12" cy="2.3" r="1.1" fill="currentColor" />
          <path
            d="M12 3.4v1.6"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
          />
          <rect
            x="4"
            y="5"
            width="16"
            height="13"
            rx="3.2"
            stroke="currentColor"
            strokeWidth="1.7"
            fill="none"
          />
          <path
            d="M2.7 10.3v2.4M21.3 10.3v2.4"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
          />
          <circle cx="9.1" cy="10.1" r="1.15" fill="currentColor" />
          <path
            d="M14.1 10.1h2.9"
            stroke="currentColor"
            strokeWidth="1.7"
            strokeLinecap="round"
          />
          <path
            d="M9.2 13.9c1.9 1.5 4.3 1.1 5.7-.9"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
            fill="none"
          />
        </svg>
      </button>
      {open && <AgentChat locale={locale} onClose={() => setOpen(false)} />}
    </>
  );
}
