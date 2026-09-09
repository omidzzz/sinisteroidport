"use client";

import { useCallback } from "react";
import type { Locale } from "@/lib/i18n";
import { trackEvent } from "@/lib/analytics";

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
 * "Ask SINISTER about this post" — hands the post title to the resident
 * agent. Dispatches the `sinister:ask` custom event, which AgentChatLazy
 * listens for: it opens the panel and auto-sends the question. Fire-and-
 * forget from this component's perspective.
 */
export default function AskSinisterButton({
  locale,
  postTitle,
}: {
  locale: Locale;
  postTitle: string;
}) {
  const ask = useCallback(() => {
    const t = COPY[locale];
    trackEvent("chat_open", { locale, source: "blog" });
    window.dispatchEvent(
      new CustomEvent<string>("sinister:ask", { detail: t.prompt(postTitle) }),
    );
  }, [locale, postTitle]);

  return (
    <button type="button" className="sin-ask-btn" onClick={ask}>
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
      <span>{COPY[locale].label}</span>
    </button>
  );
}