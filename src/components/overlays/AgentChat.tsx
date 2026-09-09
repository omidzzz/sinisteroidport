"use client";

import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, type UIMessage } from "ai";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
} from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { Components } from "react-markdown";
import type { Locale } from "@/lib/i18n";
import { trackEvent } from "@/lib/analytics";

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

/* ── "Unhinged mode" (terminal easter egg) ──────────────────────────
 * Flipped by the `unhinged` command in the site's terminal overlay
 * (EasterEgg). The flag lives in localStorage so it survives reloads and
 * rides to the guest backend as `persona: "unhinged"`, where it appends a
 * max-volatility addendum to the system prompt. */
const UNHINGED_KEY = "sin-chat-unhinged";

/* ── Web Speech API (voice in/out) ──────────────────────────────────
 * Browser-native speech recognition + synthesis — no external services,
 * nothing new to deploy. Both controls are progressively enhanced: they
 * hide themselves when the browser doesn't expose the API. */
interface SpeechRecognitionAlternativeLike {
  readonly transcript: string;
}
interface SpeechRecognitionResultLike {
  readonly 0: SpeechRecognitionAlternativeLike;
}
interface SpeechRecognitionEventLike {
  readonly results: ArrayLike<ArrayLike<SpeechRecognitionAlternativeLike>>;
}
interface SpeechRecognitionLike {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onresult: ((e: SpeechRecognitionEventLike) => void) | null;
  onend: (() => void) | null;
  onerror: (() => void) | null;
  start(): void;
  stop(): void;
}
type SpeechRecognitionCtor = new () => SpeechRecognitionLike;

function getSpeechRecognition(): SpeechRecognitionCtor | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as {
    SpeechRecognition?: SpeechRecognitionCtor;
    webkitSpeechRecognition?: SpeechRecognitionCtor;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

/* ── Mood classifier (mirrors the sinister repo's console) ──────────
 * Surfaces the persona's volatility as a small colored tag above each bot
 * message. The brand brackets stay latin in both locales. */
type Mood = "neutral" | "hyperfixation" | "deadpan" | "competence" | "snark";

const MOOD_LABEL: Record<Mood, string> = {
  neutral: "",
  hyperfixation: "〔HYPERFIXATION〕",
  deadpan: "〔DEADPAN〕",
  competence: "〔SNARK OFF〕",
  snark: "〔SNARK〕",
};

const MOOD_CLASS: Record<Mood, string> = {
  neutral: "",
  hyperfixation: "sin-chat-mood--hyper",
  deadpan: "sin-chat-mood--deadpan",
  competence: "sin-chat-mood--competence",
  snark: "sin-chat-mood--snark",
};

function detectMood(text: string): Mood {
  if (/〔\s*hyperfixation\s*〕/i.test(text)) return "hyperfixation";
  if (/〔\s*deadpan\s*〕/i.test(text)) return "deadpan";
  if (/〔\s*snark\s*off\s*〕/i.test(text) || /〔\s*competence\s*〕/i.test(text))
    return "competence";
  if (/〔\s*snark\s*〕/i.test(text)) return "snark";

  // Heuristic fallback: sustained shouting reads as hyperfixation.
  const allCaps = text.replace(/[^A-Z]/g, "").length;
  const alphaCount = text.replace(/[^A-Za-z]/g, "").length;
  const capsRatio = alphaCount > 0 ? allCaps / alphaCount : 0;
  if (capsRatio > 0.35 && text.length > 40) return "hyperfixation";
  return "neutral";
}

/* ── Copy-to-clipboard helper ───────────────────────────────────────
 * A small button that copies text to clipboard and briefly shows a
 * "copied" state. Uses the modern Clipboard API with a graceful
 * fallback to the legacy execCommand approach. */
function useCopy(): [
  boolean,
  (text: string) => Promise<void>,
] {
  const [copied, setCopied] = useState(false);
  const copy = useCallback(async (text: string) => {
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
      } else {
        // Fallback for older browsers / insecure contexts
        const ta = document.createElement("textarea");
        ta.value = text;
        ta.style.position = "fixed";
        ta.style.opacity = "0";
        document.body.appendChild(ta);
        ta.select();
        document.execCommand("copy");
        document.body.removeChild(ta);
      }
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard blocked — fail silently */
    }
  }, []);
  return [copied, copy];
}

function CopyButton({
  text,
  label,
  title,
  className = "",
}: {
  text: string;
  label: string;
  title?: string;
  className?: string;
}) {
  const [copied, copy] = useCopy();
  return (
    <button
      type="button"
      className={`sin-chat-copy${copied ? " sin-chat-copy--done" : ""} ${className}`}
      title={title ?? label}
      onClick={() => void copy(text)}
    >
      {copied ? "✓" : "⧉"}{" "}
      <span>{copied ? "Copied" : label}</span>
    </button>
  );
}

/* ── Code block with copy ───────────────────────────────────────────
 * Renders a fenced code block with a header showing the language and
 * a copy button. Used via react-markdown's components override. */
function CodeBlock({
  language,
  children,
}: {
  language: string;
  children: string;
}) {
  const code = children.trimEnd();
  return (
    <div className="sin-chat-code-block">
      <div className="sin-chat-code-head">
        <span>{language || "code"}</span>
        <CopyButton text={code} label="Copy" />
      </div>
      <pre>
        <code>{code}</code>
      </pre>
    </div>
  );
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
    errorBusy:
      "I'm swamped — too many asks per minute. Breathe, then try again.",
    stop: "Stop generating",
    clear: "Clear conversation",
    jump: "Jump to latest",
    chipsLabel: "Try one:",
    listen: "Voice input",
    listening: "Listening…",
    readAloud: "Read aloud",
    stopAloud: "Stop reading",
    unhinged: "UNHINGED",
    chipsHome: [
      "What can Omid actually do?",
      "What makes this site fast?",
      "Roast modern web dev",
    ],
    chipsBlog: [
      "Which post should I read first?",
      "Summarize your latest post",
      "What do you write about?",
    ],
    chipsWork: [
      "Walk me through the laptop deck scene",
      "How were the 3D scenes built?",
      "What's the stack behind this site?",
    ],
    chipsSkills: [
      "React or Vue in 2026 — argue.",
      "What's the strongest stack here?",
      "Tailwind: genius or trap?",
    ],
    chipsEdu: [
      "What's Omid's academic background?",
      "Does a CS degree still matter?",
    ],
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
    errorBusy:
      "الان شلوغه — سقف پیام دقیقه‌ای پر شده. یه نفس بکش و دوباره امتحان کن.",
    stop: "توقف",
    clear: "پاک کردن گفتگو",
    jump: "برو به آخر",
    chipsLabel: "یکی رو امتحان کن:",
    listen: "ورودی صوتی",
    listening: "در حال شنیدن…",
    readAloud: "بخون",
    stopAloud: "قطع صدا",
    unhinged: "UNHINGED",
    chipsHome: [
      "امید دقیقاً چه‌کارهایی بلده؟",
      "چرا این سایت این‌قدر سریعه؟",
      "از توسعه‌دهی وب مدرن انتقاد کن",
    ],
    chipsBlog: [
      "کدوم نوشته رو اول بخونم؟",
      "جدیدترین نوشته‌ات را خلاصه کن",
      "درباره چی می‌نویسی؟",
    ],
    chipsWork: [
      "سکانس لپ‌تاپ را توضیح بده",
      "صحنه‌های سه‌بعدی چطور ساخته شدن؟",
      "استک این سایت چیه؟",
    ],
    chipsSkills: [
      "ری‌اکت یا ویو در ۲۰۲۶؟ بحث کن",
      "قوی‌ترین استک امید چیه؟",
      "تیلویند: نبوغ یا تله؟",
    ],
    chipsEdu: [
      "امید چه تحصیلاتی داشته؟",
      "مدرک دانشگاهی هنوز ارزش داره؟",
    ],
  },
} as const;

/**
 * Custom react-markdown components — handles internal vs external links and
 * fenced code blocks with a copy button. Internal links (relative or on the
 * same domain) render plainly; external links get a subtle ↗ indicator.
 */
const markdownComponents: Components = {
  a({ href, children }) {
    if (!href) return <>{children}</>;
    const isExternal =
      href.startsWith("http://") ||
      href.startsWith("https://") ||
      href.startsWith("//");
    // Treat same-domain links as internal (no external indicator)
    const reallyExternal =
      isExternal &&
      !href.includes("sinisteroid.ir") &&
      !href.includes("localhost");
    const className = reallyExternal ? "sin-chat-link-external" : undefined;
    const reallyExternalBool = Boolean(reallyExternal);
    return (
      <a
        href={href}
        className={className}
        target={reallyExternalBool ? "_blank" : undefined}
        rel={reallyExternalBool ? "noopener noreferrer" : undefined}
      >
        {children}
      </a>
    );
  },
  code({ className, children, ...props }) {
    const match = /language-(\w+)/.exec(className || "");
    const code = String(children).trimEnd();
    if (match) {
      return <CodeBlock language={match[1]}>{code}</CodeBlock>;
    }
    // Inline code
    return <code className={className}>{children}</code>;
  },
};

/**
 * The floating assistant panel. Code-split (loaded via next/dynamic from
 * AgentChatLazy on first open) because it pulls in the AI SDK runtime, which
 * must never sit in the initial bundle of the static export.
 */
export default function AgentChat({
  locale,
  visible,
  initialAsk = null,
  onClose,
  onUnread,
}: {
  locale: Locale;
  /** Whether the panel is shown. The panel stays mounted while hidden so
   * in-flight streams finish in the background (see AgentChatLazy). */
  visible: boolean;
  /** Question injected by a deep link (?ask=… / sinister:ask event). */
  initialAsk?: string | null;
  onClose: () => void;
  /** Fired when a response completes while the panel is hidden. */
  onUnread?: (unread: boolean) => void;
}) {
  const t = COPY[locale];
  const rtl = locale === "fa";

  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  // Mirror of `visible` for callbacks that must not re-run on toggle.
  const visibleRef = useRef(visible);
  useEffect(() => {
    visibleRef.current = visible;
  }, [visible]);
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

  // "Unhinged mode" — synced from the terminal easter egg via localStorage
  // plus the sinister:unhinged event (see EasterEgg.tsx). Lazy initializer is
  // safe: this panel only ever mounts client-side (next/dynamic ssr:false).
  const [unhinged, setUnhinged] = useState<boolean>(() => {
    try {
      return localStorage.getItem(UNHINGED_KEY) === "1";
    } catch {
      return false;
    }
  });
  useEffect(() => {
    const syncUnhinged = () => {
      try {
        setUnhinged(localStorage.getItem(UNHINGED_KEY) === "1");
      } catch {
        setUnhinged((u) => !u);
      }
    };
    window.addEventListener("sinister:unhinged", syncUnhinged);
    return () => window.removeEventListener("sinister:unhinged", syncUnhinged);
  }, []);

  // Voice in/out — progressively enhanced; controls hide when unsupported.
  const [hasVoice] = useState<boolean>(() => getSpeechRecognition() !== null);
  const [listening, setListening] = useState(false);
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const [speakingId, setSpeakingId] = useState<string | null>(null);
  const speechLang = locale === "fa" ? "fa-IR" : "en-US";

  useEffect(() => {
    return () => {
      // No speech left running when the panel unmounts.
      try {
        window.speechSynthesis?.cancel();
      } catch {
        /* noop */
      }
      recognitionRef.current?.stop();
    };
  }, []);

  const toggleRecognition = useCallback(() => {
    if (listening) {
      recognitionRef.current?.stop();
      setListening(false);
      return;
    }
    const Ctor = getSpeechRecognition();
    if (!Ctor) return;
    const rec = new Ctor();
    rec.lang = speechLang;
    rec.continuous = false;
    rec.interimResults = false;
    rec.onresult = (e) => {
      const transcript = Array.from({ length: e.results.length }, (_, i) => {
        const alt = e.results[i]?.[0];
        return alt?.transcript ?? "";
      })
        .join(" ")
        .trim();
      const el = inputRef.current;
      if (!transcript || !el) return;
      el.value = el.value ? `${el.value} ${transcript}` : transcript;
      el.focus();
    };
    rec.onend = () => setListening(false);
    rec.onerror = () => setListening(false);
    recognitionRef.current = rec;
    setListening(true);
    trackEvent("chat_voice", { locale });
    rec.start();
  }, [listening, speechLang, locale]);

  const toggleSpeech = useCallback(
    (id: string, text: string) => {
      const synth = window.speechSynthesis;
      if (!synth) return;
      if (speakingId === id) {
        synth.cancel();
        setSpeakingId(null);
        return;
      }
      synth.cancel();
      const utter = new SpeechSynthesisUtterance(text);
      utter.lang = speechLang;
      utter.onend = () => setSpeakingId(null);
      utter.onerror = () => setSpeakingId(null);
      setSpeakingId(id);
      synth.speak(utter);
      trackEvent("chat_tts", { locale });
    },
    [speakingId, speechLang, locale],
  );

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
          ...(unhinged ? { persona: "unhinged" } : {}),
          locale,
          path: window.location.pathname,
          screen: `${window.screen.width}x${window.screen.height}`,
        }),
      }),
    [liveContext, sessionId, locale, unhinged],
  );

  const {
    messages,
    sendMessage,
    stop,
    setMessages,
    status,
    error,
  } = useChat({
    transport,
    // Restore the persisted conversation, if any, so it survives refresh /
    // panel close. The SDK resends these with the next message, which gives
    // the model continuous context across visits.
    messages: sessionId ? (readHistory(sessionId) ?? []) : [],
  });

  // Deep-link auto-send: when the panel was opened with a question
  // (?ask=… / sinister:ask), send it once the chat is idle.
  const lastAskRef = useRef<string | null>(null);
  useEffect(() => {
    if (!initialAsk || status !== "ready") return;
    if (lastAskRef.current === initialAsk) return;
    lastAskRef.current = initialAsk;
    startedAtRef.current = Date.now();
    userTextRef.current = initialAsk;
    sendMessage({ text: initialAsk });
    trackEvent("chat_message", { locale, source: "deep_link" });
  }, [initialAsk, status, sendMessage, locale]);

  // Wipe the local conversation (header button). Also clears the persisted
  // history so "what does it remember about me?" is answerable in one tap.
  const clearConversation = useCallback(() => {
    stop();
    setMessages([]);
    if (sessionId) {
      try {
        localStorage.removeItem(`${HISTORY_PREFIX}-${sessionId}`);
      } catch {
        /* storage blocked — nothing to clear */
      }
    }
    trackEvent("chat_clear", { locale });
  }, [stop, setMessages, sessionId, locale]);

  // Persist after each completed exchange (never mid-stream, to avoid a
  // write storm on every streamed delta). A mid-stream close keeps the last
  // saved frame, which is fine.
  useEffect(() => {
    if (status === "submitted" || status === "streaming") return;
    if (!sessionId || messages.length === 0) return;
    writeHistory(sessionId, messages);
  }, [messages, status, sessionId]);

  // Smart autoscroll: follow the stream only while the visitor is already
  // at the bottom; otherwise leave their scroll position alone and offer a
  // "jump to latest" pill instead.
  const nearBottomRef = useRef(true);
  const [showJump, setShowJump] = useState(false);

  const handleScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    const near = el.scrollTop + el.clientHeight >= el.scrollHeight - 80;
    nearBottomRef.current = near;
    if (near) setShowJump(false);
  }, []);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    if (nearBottomRef.current) {
      el.scrollTop = el.scrollHeight;
    } else {
      setShowJump(true);
    }
  }, [messages, status]);

  const jumpToLatest = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
    nearBottomRef.current = true;
    setShowJump(false);
  }, []);

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

    // Finished while the panel is hidden → light up the FAB's dot.
    if (!visibleRef.current) onUnread?.(true);

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
  }, [isStreaming, sessionId, messages, locale, onUnread]);

  // Rate-limit vs. generic failure — different failure, different persona.
  const errorBusy = /429|too many requests|rate limit/i.test(
    error?.message ?? "",
  );

  // Page-aware starter chips (hidden once a conversation is underway).
  const chips = useMemo(() => {
    const path = window.location.pathname;
    if (path.includes("/blog/")) return t.chipsBlog;
    if (path.includes("/work")) return t.chipsWork;
    if (path.includes("/skills")) return t.chipsSkills;
    if (path.includes("/education")) return t.chipsEdu;
    return t.chipsHome;
  }, [t]);

  // Minimal focus trap: cycle Tab within the dialog while it is visible.
  const trapTab = (e: ReactKeyboardEvent<HTMLDivElement>) => {
    if (e.key !== "Tab" || !visible) return;
    const panel = panelRef.current;
    if (!panel) return;
    const focusables = panel.querySelectorAll<HTMLElement>(
      'button:not([disabled]), [href], textarea:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])',
    );
    if (focusables.length === 0) return;
    const first = focusables[0];
    const last = focusables[focusables.length - 1];
    const active = document.activeElement;
    if (e.shiftKey && (active === first || active === panel)) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && active === last) {
      e.preventDefault();
      first.focus();
    }
  };

  // Focus the composer whenever the panel becomes visible.
  useEffect(() => {
    if (visible) inputRef.current?.focus();
  }, [visible]);

  return (
    <div
      ref={panelRef}
      className={`sin-chat-panel${visible ? "" : " sin-chat-panel--hidden"}`}
      dir={rtl ? "rtl" : "ltr"}
      role="dialog"
      aria-label={t.title}
      aria-hidden={!visible || undefined}
      onKeyDown={trapTab}
    >
      <header className="sin-chat-head">
        <div className="sin-chat-id">
          <span className="sin-chat-dot" aria-hidden />
          <div>
            <strong className="sin-chat-title">{t.title}</strong>
            <span className="sin-chat-sub">{t.subtitle}</span>
          </div>
          {unhinged && <span className="sin-chat-unhinged">{t.unhinged}</span>}
        </div>
        <div className="sin-chat-head-actions">
          <button
            type="button"
            className="sin-chat-x"
            onClick={clearConversation}
            aria-label={t.clear}
            title={t.clear}
          >
            <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden>
              <path
                d="M4 7h16M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2m-9 0 1 13h8l1-13"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinecap="round"
                strokeLinejoin="round"
                fill="none"
              />
            </svg>
          </button>
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
        </div>
      </header>

      <div className="sin-chat-log-wrap">
        <div
          className="sin-chat-log"
          ref={scrollRef}
          onScroll={handleScroll}
          aria-live="polite"
        >
        {messages.length === 0 && (
          <div className="sin-chat-row sin-chat-row--bot">
            <div className="sin-chat-bubble sin-chat-bubble--bot">{t.intro}</div>
          </div>
        )}
        {messages.map((message) => {
          const text = message.parts
            .filter((p) => p.type === "text")
            .map((p) => (p as { text: string }).text)
            .join("");
          if (!text) return null;

          if (message.role === "user") {
            return (
              <div
                key={message.id}
                className="sin-chat-row sin-chat-row--user"
              >
                <div className="sin-chat-bubble sin-chat-bubble--user">
                  {text}
                </div>
              </div>
            );
          }

          // Bot message — mood tag + markdown with copy & read-aloud
          const mood = detectMood(text);
          const moodLabel = MOOD_LABEL[mood];
          return (
            <div
              key={message.id}
              className="sin-chat-row sin-chat-row--bot"
            >
              <div className="sin-chat-bubble sin-chat-bubble--bot">
                <CopyButton
                  text={text}
                  label="Copy"
                  title="Copy message"
                  className="sin-chat-msg-copy"
                />
                <button
                  type="button"
                  className={`sin-chat-tts${speakingId === message.id ? " sin-chat-tts--on" : ""}`}
                  onClick={() => toggleSpeech(message.id, text)}
                  aria-label={
                    speakingId === message.id ? t.stopAloud : t.readAloud
                  }
                  title={speakingId === message.id ? t.stopAloud : t.readAloud}
                >
                  {speakingId === message.id ? "■" : "🔊"}
                </button>
                {moodLabel && (
                  <span className={`sin-chat-mood ${MOOD_CLASS[mood]}`}>
                    {moodLabel}
                  </span>
                )}
                <div className="sin-chat-md">
                  <ReactMarkdown
                    remarkPlugins={[remarkGfm]}
                    components={markdownComponents}
                  >
                    {text}
                  </ReactMarkdown>
                </div>
              </div>
            </div>
          );
        })}

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
              {errorBusy ? t.errorBusy : t.error}
            </div>
          </div>
        )}
        </div>
        {showJump && (
          <button
            type="button"
            className="sin-chat-jump"
            onClick={jumpToLatest}
            aria-label={t.jump}
          >
            ↓
          </button>
        )}
      </div>

      {!isStreaming && messages.length < 4 && (
        <div className="sin-chat-chips" aria-label={t.chipsLabel}>
          {chips.map((chip) => (
            <button
              key={chip}
              type="button"
              className="sin-chat-chip"
              onClick={() => {
                startedAtRef.current = Date.now();
                userTextRef.current = chip;
                sendMessage({ text: chip });
                trackEvent("chat_message", { locale, source: "chip" });
              }}
            >
              {chip}
            </button>
          ))}
        </div>
      )}
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
          trackEvent("chat_message", { locale });
          form.reset();
          input.style.height = "auto";
        }}
      >
        <textarea
          ref={inputRef}
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
        {hasVoice && (
          <button
            type="button"
            className={`sin-chat-mic${listening ? " sin-chat-mic--on" : ""}`}
            onClick={toggleRecognition}
            disabled={isStreaming}
            aria-label={listening ? t.listening : t.listen}
            title={listening ? t.listening : t.listen}
          >
            <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden>
              <path
                d="M12 3a3 3 0 0 1 3 3v5a3 3 0 0 1-6 0V6a3 3 0 0 1 3-3zM5 11a7 7 0 0 0 14 0M12 18v3"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinecap="round"
                strokeLinejoin="round"
                fill="none"
              />
            </svg>
          </button>
        )}
        {isStreaming ? (
          <button
            type="button"
            className="sin-chat-send sin-chat-send--stop"
            onClick={() => stop()}
            aria-label={t.stop}
            title={t.stop}
          >
            <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden>
              <rect
                x="6"
                y="6"
                width="12"
                height="12"
                rx="2"
                fill="currentColor"
              />
            </svg>
          </button>
        ) : (
          <button
            type="submit"
            className="sin-chat-send"
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
        )}
      </form>
    </div>
  );
}

