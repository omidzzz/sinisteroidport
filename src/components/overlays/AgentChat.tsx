"use client";

import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { useEffect, useMemo, useRef, useState } from "react";
import type { Locale } from "@/lib/i18n";

/**
 * Public guest endpoint — the Vercel deployment of the `sinister` agent runs
 * with AGENT_MODE=public: no filesystem/terminal tools, client-facing persona.
 * Override per-environment with NEXT_PUBLIC_SINISTER_API (e.g. to point at a
 * Cloudflare Tunnel URL for local admin mode).
 */
const SINISTER_API =
  process.env.NEXT_PUBLIC_SINISTER_API ??
  "https://sinister-mu.vercel.app/api/chat";

const COPY = {
  en: {
    title: "SINISTER",
    subtitle: "resident menace",
    intro:
      "Oh good, a visitor. I'm Sinister — a feral general-purpose AI squatting in this portfolio. Ask me anything: code, tech, history, arguments, weird hypotheticals. I also happen to know this site down to the last shader. Try to be interesting.",
    placeholder: "Impress me…",
    send: "Send",
    close: "Close chat",
    status: "scheming…",
    error: "I'm unreachable right now. Tragic. Try again in a moment.",
  },
  fa: {
    title: "سینیستر",
    subtitle: "دستیار وب‌سایت",
    intro:
      "سلام! من سینیستر هستم؛ یک ایجنت عمومی با شخصیت وحشی که توی این سایت لانه کرده. هر چیزی بپرس: کد، تکنولوژی، تاریخ، بحث‌های داغ. ضمناً این سایت و کارهای امید را هم مو‌به‌مو بلدم. سؤال خسته‌کننده نپرس.",
    placeholder: "سؤالی داری؟…",
    send: "ارسال",
    close: "بستن گفتگو",
    status: "در حال نقشه‌کشی…",
    error: "الان در دسترس نیستم. تراژدی است. چند لحظه بعد امتحان کن.",
  },
} as const;

/**
 * The floating assistant panel. Code-split (loaded via next/dynamic from
 * AgentChatLazy on first open) because it pulls in the AI SDK runtime, which
 * must never sit in the initial bundle of the static export.
 */
export default function AgentChat({
  locale,
  onClose,
}: {
  locale: Locale;
  onClose: () => void;
}) {
  const t = COPY[locale];
  const rtl = locale === "fa";

  const scrollRef = useRef<HTMLDivElement>(null);
  // Live post index (built from the site's JSON feed when the panel opens).
  const [liveContext, setLiveContext] = useState<string | null>(null);

  // Fresh post knowledge without any DB exposure: the static export ships a
  // JSON Feed (public/feed.json, regenerated on every build). Fetch it once
  // per panel open and inject a compact post index into each chat request as
  // `context`; the guest backend merges it into the system prompt. Silent
  // failure = the dossier's evergreen list is simply used as-is.
  useEffect(() => {
    let cancelled = false;
    const feedUrl = locale === "fa" ? "/fa/feed.json" : "/feed.json";
    fetch(feedUrl)
      .then((r) => (r.ok ? r.json() : Promise.reject(r.status)))
      .then((feed: {
        items?: Array<{
          title?: string;
          summary?: string;
          content_text?: string;
          date_published?: string;
        }>;
      }) => {
        if (cancelled || !Array.isArray(feed.items) || feed.items.length === 0)
          return;
        const index = feed.items
          .slice(0, 15)
          .map((it) => {
            const date = it.date_published?.slice(0, 10) ?? "";
            const title = (it.title ?? "").trim();
            const excerpt = (it.summary ?? it.content_text ?? "")
              .trim()
              .slice(0, 160);
            return `- ${date} | ${title}${excerpt ? ` | ${excerpt}` : ""}`;
          })
          .join("\n");
        setLiveContext(index);
      })
      .catch(() => {
        /* offline or missing feed — dossier baseline still covers the rest */
      });
    return () => {
      cancelled = true;
    };
  }, [locale]);

  // A fresh transport per mount keeps every panel opening a clean,
  // stateless conversation on the guest endpoint. `body` is a resolver so
  // the latest live post index rides along with every message sent.
  const transport = useMemo(
    () =>
      new DefaultChatTransport({
        api: SINISTER_API,
        body: () => (liveContext ? { context: liveContext } : {}),
      }),
    [liveContext],
  );

  const { messages, sendMessage, status, error } = useChat({ transport });

  // Keep the newest message in view while streaming.
  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages, status]);

  // Escape closes the panel — matches the site's overlay conventions.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const isStreaming = status === "submitted" || status === "streaming";

  return (
    <div
      className="sin-chat-panel"
      dir={rtl ? "rtl" : "ltr"}
      role="dialog"
      aria-label={t.title}
    >

      <header className="sin-chat-head">
        <div className="sin-chat-id">
          <span className="sin-chat-dot" aria-hidden />
          <div>
            <strong className="sin-chat-title">{t.title}</strong>
            <span className="sin-chat-sub">{t.subtitle}</span>
          </div>
        </div>
        <button
          type="button"
          className="sin-chat-x"
          onClick={onClose}
          aria-label={t.close}
        >
          <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden>
            <path
              d="M6 6l12 12M18 6L6 18"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              fill="none"
            />
          </svg>
        </button>
      </header>

      <div className="sin-chat-log" ref={scrollRef}>
        <div className="sin-chat-row sin-chat-row--bot">
          <div className="sin-chat-bubble sin-chat-bubble--bot">{t.intro}</div>
        </div>
        {messages.map((message) =>
          message.parts
            .filter((p) => p.type === "text")
            .map((p, i) => (
              <div
                key={`${message.id}-${i}`}
                className={`sin-chat-row ${
                  message.role === "user"
                    ? "sin-chat-row--user"
                    : "sin-chat-row--bot"
                }`}
              >
                <div
                  className={`sin-chat-bubble ${
                    message.role === "user"
                      ? "sin-chat-bubble--user"
                      : "sin-chat-bubble--bot"
                  }`}
                >
                  {(p as { text: string }).text}
                </div>
              </div>
            )))}

        {isStreaming && (
          <div className="sin-chat-row sin-chat-row--bot">
            <div className="sin-chat-bubble sin-chat-bubble--bot sin-chat-typing">
              {t.status}
            </div>
          </div>
        )}
        {error && (
          <div className="sin-chat-row sin-chat-row--bot">
            <div className="sin-chat-bubble sin-chat-bubble--error">
              {t.error}
            </div>
          </div>
        )}
      </div>

      <form
        className="sin-chat-form"
        onSubmit={(e) => {
          e.preventDefault();
          const form = e.currentTarget;
          const input = form.elements.namedItem("text") as HTMLTextAreaElement;
          const text = input.value.trim();
          if (!text || isStreaming) return;
          sendMessage({ text });
          form.reset();
          input.style.height = "auto";
        }}
      >
        <textarea
          name="text"
          className="sin-chat-input"
          rows={1}
          placeholder={t.placeholder}
          disabled={isStreaming}
          onChange={(e) => {
            e.target.style.height = "auto";
            e.target.style.height = `${Math.min(e.target.scrollHeight, 120)}px`;
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              e.currentTarget.form?.requestSubmit();
            }
          }}
        />
        <button
          type="submit"
          className="sin-chat-send"
          disabled={isStreaming}
          aria-label={t.send}
        >
          <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden>
            <path
              d="M3 12l18-8-6 18-3.5-7L3 12z"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinejoin="round"
              fill="none"
            />
          </svg>
        </button>
      </form>
    </div>
  );
}

