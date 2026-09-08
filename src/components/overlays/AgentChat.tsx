"use client";

import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, type UIMessage } from "ai";
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
const SINISTER_LOG_API =
  process.env.NEXT_PUBLIC_SINISTER_LOG_API ??
  "https://sinister-mu.vercel.app/api/log";

/* ── History persistence ─────────────────────────────────────────────
 * The whole conversation is stored per anonymous browser session so it
 * survives refresh / panel close, and is re-sent to the model with the next
 * message so the agent has the full context across visits ("remembers" the
 * user). localStorage holds only the most recent exchanges to stay light.
 */
const HISTORY_PREFIX = "sin-chat-history";
const HISTORY_LIMIT = 60;

function readHistory(sessionId: string | null): UIMessage[] | undefined {
  if (!sessionId) return undefined;
  try {
    const raw = localStorage.getItem(`${HISTORY_PREFIX}-${sessionId}`);
    if (!raw) return undefined;
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? arr : undefined;
  } catch {
    return undefined;
  }
}

function writeHistory(sessionId: string | null, messages: UIMessage[]): void {
  if (!sessionId) return;
  try {
    localStorage.setItem(
      `${HISTORY_PREFIX}-${sessionId}`,
      JSON.stringify(messages.slice(-HISTORY_LIMIT)),
    );
  } catch {
    /* quota / blocked storage — history just won't survive this session */
  }
}

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
  // Anonymous per-browser session id — lets research group exchanges into
  // conversations without any cookies, IPs, or accounts. Computed lazily on
  // first render (this panel never SSR's, so localStorage is safe here).
  // Track the start time and user text for research logging.
  const startedAtRef = useRef<number>(0);
  const userTextRef = useRef<string>("");
  const lastAssistantTextRef = useRef<string>("");
  const [sessionId] = useState<string | null>(() => {
    try {
      let sid = localStorage.getItem("sin-chat-session");
      if (!sid) {
        sid =
          typeof crypto !== "undefined" && "randomUUID" in crypto
            ? crypto.randomUUID()
            : `s-${Date.now()}-${Math.random().toString(36).slice(2)}`;
        localStorage.setItem("sin-chat-session", sid);
      }
      return sid;
    } catch {
      /* storage blocked — exchanges just log without a session id */
      return null;
    }
  });

  // Fresh post knowledge: the live MySQL `posts` table is the source of
  // truth (it includes CMS-published posts that never appear in the
  // build-time feed). Fetch the compact index endpoint first (few KB,
  // service-worker-bypassed), and only fall back to the build-time JSON
  // feed when the API is unreachable (e.g. local dev). Inject the newest
  // posts into each chat request as `context`; the guest backend merges it
  // into the system prompt as a LIVE POST INDEX.
  useEffect(() => {
    let cancelled = false;

    const buildIndex = (rows: Array<{
      date?: string;
      title?: string;
      faTitle?: string;
      enTitle?: string;
      enExcerpt?: string;
      faExcerpt?: string;
    }>) => {
      if (cancelled) return null;
      const index = rows
        .slice(0, 15)
        .map((it) => {
          const date = (it.date ?? "").slice(0, 10);
          const title =
            (locale === "fa" ? (it.faTitle ?? "") : (it.enTitle ?? "")) ||
            it.title ||
            "";
          const excerpt = (locale === "fa" ? (it.faExcerpt ?? "") : (it.enExcerpt ?? ""))
            .trim()
            .slice(0, 140);
          return `- ${date} | ${(title || "").trim()} | ${excerpt}`;
        })
        .join("\n");
      return index;
    };

    const loadFromFeed = () => {
      const feedUrl = locale === "fa" ? "/fa/feed.json" : "/feed.json";
      // Cache-buster: the service worker serves .json stale-while-revalidate,
      // so a unique query forces a fresh fetch each panel open.
      fetch(`${feedUrl}?v=${Date.now()}`)
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
                .slice(0, 140);
              return `- ${date} | ${title} | ${excerpt}`;
            })
            .join("\n");
          setLiveContext(index);
        })
        .catch(() => {
          /* no feed — dossier baseline still covers the rest */
        });
    };

    fetch("/api/get_posts_index.php")
      .then((r) => (r.ok ? r.json() : Promise.reject(r.status)))
      .then((rows: unknown) => {
        if (cancelled) return;
        if (!Array.isArray(rows) || rows.length === 0)
          throw new Error("empty index");
        const index = buildIndex(rows);
        if (index) setLiveContext(index);
      })
      .catch(loadFromFeed);

    return () => {
      cancelled = true;
    };
  }, [locale]);

  // A fresh transport per mount keeps every panel opening a clean,
  // stateless conversation on the guest endpoint. `body` is a resolver so
  // the latest live post index, session id, locale and a few anonymous
  // context fields (page path, screen size) ride along with every message.
  const transport = useMemo(
    () =>
      new DefaultChatTransport({
        api: SINISTER_API,
        body: () => ({
          ...(liveContext ? { context: liveContext } : {}),
          ...(sessionId ? { sessionId } : {}),
          locale,
          path: window.location.pathname,
          screen: `${window.screen.width}x${window.screen.height}`,
        }),
      }),
    [liveContext, sessionId, locale],
  );

  const { messages, sendMessage, status, error } = useChat({
    transport,
    // Restore the persisted conversation, if any, so it survives refresh /
    // panel close. The SDK resends these with the next message, which gives
    // the model continuous context across visits.
    messages: sessionId ? (readHistory(sessionId) ?? []) : [],
  });

  // Persist after each completed exchange (never mid-stream, to avoid a
  // write storm on every streamed delta). A mid-stream close keeps the last
  // saved frame, which is fine.
  useEffect(() => {
    if (status === "submitted" || status === "streaming") return;
    if (!sessionId || messages.length === 0) return;
    writeHistory(sessionId, messages);
  }, [messages, status, sessionId]);

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

  // Research logging — fire-and-forget call to /api/log after each exchange
  // completes. Uses the explicit endpoint instead of streamText's onFinish,
  // which is unreliable in serverless (the function instance can freeze before
  // the callback runs). Only logs when we have a session and a completed turn.
  const wasStreamingRef = useRef(false);
  useEffect(() => {
    if (isStreaming) {
      wasStreamingRef.current = true;
      return;
    }
    if (!wasStreamingRef.current) return;
    wasStreamingRef.current = false;

    if (!sessionId || !userTextRef.current) return;
    const lastMsg = messages[messages.length - 1];
    const assistantText =
      lastMsg?.role === "assistant"
        ? lastMsg.parts
            .filter((p) => p.type === "text")
            .map((p) => (p as { text: string }).text)
            .join("")
        : "";
    if (!assistantText) return;

    void fetch(SINISTER_LOG_API, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sessionId,
        mode: "public",
        locale,
        userText: userTextRef.current,
        assistantText,
        latencyMs: Date.now() - startedAtRef.current,
        path: window.location.pathname,
        screen: `${window.screen.width}x${window.screen.height}`,
      }),
    }).catch(() => {
      /* logging is best-effort — never surface to the user */
    });
  }, [isStreaming, sessionId, messages, locale]);

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
        {messages.length === 0 && (
          <div className="sin-chat-row sin-chat-row--bot">
            <div className="sin-chat-bubble sin-chat-bubble--bot">{t.intro}</div>
          </div>
        )}
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
          startedAtRef.current = Date.now();
          userTextRef.current = text;
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

