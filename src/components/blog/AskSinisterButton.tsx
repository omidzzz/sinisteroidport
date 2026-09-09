"use client";

import { useCallback } from "react";
import type { Locale } from "@/lib/i18n";
import { trackEvent } from "@/lib/analytics";

/**
 * Hand a question to the resident agent: opens the chat panel (via the
 * `sinister:ask` event that AgentChatLazy listens for) and auto-sends.
 * Fire-and-forget from the caller's perspective.
 */
export function askSinister(
  locale: Locale,
  prompt: string,
  source?: string,
): void {
  trackEvent("chat_open", {
    locale,
    source: source ?? "deep_link",
  });
  window.dispatchEvent(
    new CustomEvent<string>("sinister:ask", { detail: prompt }),
  );
}

const COPY = {
  en: {
    label: "Ask SINISTER about this post",
    prompt: (title: string) =>
      `Summarize this post and give me your honest take: "${title}"`,
  },
  fa: {
    label: "از سینیستر درباره‌ی این نوشته بپرس",
    prompt: (title: string) =>
      `خلاصه‌ی این نوشته رو بگو و نظرت رو بی‌تعارف بگو: «${title}»`,
  },
} as const;

/**
 * "Ask SINISTER" button. On blog posts the default (no props beyond
 * locale + postTitle) asks about the post; other pages pass an explicit
 * `label` + `prompt` (e.g. the work and skills pages, the footer).
 */
export default function AskSinisterButton({
  locale,
  postTitle,
  prompt,
  label,
  className = "sin-ask-btn",
}: {
  locale: Locale;
  /** Blog-post mode: builds the prompt from the post's title. */
  postTitle?: string;
  /** Free-form mode: the exact question to send. */
  prompt?: string;
  /** Free-form mode: the button label. */
  label?: string;
  className?: string;
}) {
  const ask = useCallback(() => {
    const q =
      prompt ??
      (postTitle ? COPY[locale].prompt(postTitle) : COPY[locale].prompt(""));
    askSinister(locale, q, postTitle ? "blog" : "custom");
  }, [locale, postTitle, prompt]);

  return (
    <button type="button" className={className} onClick={ask}>
      <svg viewBox="0 0 24 24" width="14" height="14" aria-hidden>
        <path
          d="M12 3a7 7 0 0 1 7 7c0 2.4-1.2 4.4-3 5.7V19a2 2 0 0 1-2 2h-4a2 2 0 0 1-2-2v-3.3C6.2 14.4 5 12.4 5 10a7 7 0 0 1 7-7zM9 21h6"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
      </svg>
      <span>{label ?? COPY[locale].label}</span>
    </button>
  );
}