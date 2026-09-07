"use client";

import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { useEffect, useMemo, useRef } from "react";
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

  // A fresh transport per mount keeps every panel opening a clean,
  // stateless conversation on the guest endpoint.
  const transport = useMemo(
    () => new DefaultChatTransport({ api: SINISTER_API }),
    [],
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

