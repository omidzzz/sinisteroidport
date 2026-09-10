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
import {
  PlusIcon,
  InfoIcon,
  StackIcon,
  RefreshIcon,
  RateUpIcon,
  RateDownIcon,
  ClearIcon,
  XIcon,
} from "@/components/ui/icons";

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

function readHistory(threadId: string | null): UIMessage[] | undefined {
  if (typeof window === "undefined") return undefined;
  try {
    const raw = localStorage.getItem(`${HISTORY_PREFIX}-${threadId ?? "default"}`);
    if (!raw) return undefined;
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? arr : undefined;
  } catch {
    return undefined;
  }
}

function writeHistory(threadId: string | null, messages: UIMessage[]): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(
      `${HISTORY_PREFIX}-${threadId ?? "default"}`,
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

/* ── Visitor-selectable persona ───────────────────────────────────
 * The visitor can flip personality at any moment — via the inspector
 * picker or the terminal easter egg's `unhinged` command (which sets the
 * same key). "standard" needs no backend directive (the base guest prompt
 * already is feral snark); the others map to GUEST_PERSONA_DIRECTIVES. */
const PERSONA_KEY = "sin-chat-persona";
type PersonaId =
  | "standard"
  | "deadpan"
  | "hyperfixation"
  | "professional"
  | "unhinged";
const PERSONAS: readonly PersonaId[] = [
  "standard",
  "deadpan",
  "hyperfixation",
  "professional",
  "unhinged",
];

/* ── Conversation threads + visitor profile (all local, no accounts) ──
 * Each thread keeps its own history key and acts as its own anonymous
 * research session id. The profile nickname rides along with every
 * message so the backend persona can use the visitor's chosen name. */
const THREADS_KEY = "sin-chat-threads";
const THREAD_ACTIVE_KEY = "sin-chat-thread-active";
const PROFILE_KEY = "sin-chat-profile";
const MAX_THREADS = 20;

type Thread = {
  id: string;
  title: string; // "" until the first exchange names it
  createdAt: number;
};

function newThreadId(): string {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `s-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

/** Compact relative timestamp for the thread list (locale-aware). */
function relTime(ts: number, locale: Locale): string {
  const mins = Math.max(0, Math.round((Date.now() - ts) / 60_000));
  if (mins < 1) return locale === "fa" ? "همین حالا" : "just now";
  if (mins < 60) return locale === "fa" ? `${mins} دقیقه` : `${mins}m`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return locale === "fa" ? `${hours} ساعت` : `${hours}h`;
  const days = Math.floor(hours / 24);
  return locale === "fa" ? `${days} روز` : `${days}d`;
}

/** Render the whole thread as paste-ready Markdown for export/copy. */
function formatThread(messages: UIMessage[]): string {
  const lines: string[] = ["# SINISTER — conversation"];
  for (const m of messages) {
    const text = m.parts
      .filter((p) => p.type === "text")
      .map((p) => (p as { text: string }).text)
      .join("")
      .trim();
    if (!text) continue;
    lines.push("");
    lines.push(m.role === "user" ? "**You:**" : "**SINISTER:**");
    lines.push(text);
  }
  return `${lines.join("\n").trim()}\n`;
}

/* ── Tiny syntax highlighter for fenced code blocks ─────────────────
 * A single-pass regex tokenizer (comments / strings / keywords / numbers)
 * — ~40 lines instead of a highlighter dependency, and it renders React
 * spans rather than injecting HTML. Covers what the persona actually
 * writes: ts/js, json, bash, css, py, and friends. */
type Token = { t: string; c?: string };

const KEYWORDS =
  "const|let|var|function|return|if|else|for|while|do|switch|case|default|break|continue|new|class|extends|super|import|export|from|as|async|await|try|catch|finally|throw|typeof|instanceof|delete|in|of|this|yield|static|interface|enum|implements|public|private|protected|readonly|true|false|null|undefined|void|any|unknown|never|echo|cd|git|npm|npx|sudo|apt|curl|mkdir|ls|cat|source|then|fi|done|esac|def|lambda|print|self|fn|pub|impl|struct|match|use";

const TOKEN_RE_STD = new RegExp(
  "(\\/\\*[\\s\\S]*?\\*\\/|\\/\\/[^\\n]*)"
    + "|(\"(?:\\\\.|[^\"\\\\\\n])*\"|'(?:\\\\.|[^'\\\\\\n])*'|`(?:\\\\.|[^`\\\\])*`)"
    + "|(\\b(?:" + KEYWORDS + ")\\b)"
    + "|(\\b0x[0-9a-fA-F]+\\b|\\b\\d[\\d_]*(?:\\.\\d+)?(?:e[+-]?\\d+)?\\b)",
  "g",
);
const TOKEN_RE_HASH = new RegExp(
  "(\\/\\*[\\s\\S]*?\\*\\/|\\/\\/[^\\n]*|#[^\\n]*)"
    + "|(\"(?:\\\\.|[^\"\\\\\\n])*\"|'(?:\\\\.|[^'\\\\\\n])*'|`(?:\\\\.|[^`\\\\])*`)"
    + "|(\\b(?:" + KEYWORDS + ")\\b)"
    + "|(\\b0x[0-9a-fA-F]+\\b|\\b\\d[\\d_]*(?:\\.\\d+)?(?:e[+-]?\\d+)?\\b)",
  "g",
);

function tokenizeCode(code: string, language: string): Token[] {
  const hashLang = /^(bash|sh|shell|zsh|console|terminal|yaml|yml|python|py|ruby|rb)$/i.test(
    language,
  );
  const re = hashLang ? TOKEN_RE_HASH : TOKEN_RE_STD;
  re.lastIndex = 0;
  const tokens: Token[] = [];
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(code)) !== null) {
    if (m[0].length === 0) {
      re.lastIndex += 1;
      continue;
    }
    if (m.index > last) tokens.push({ t: code.slice(last, m.index) });
    const cls = m[1]
      ? "sin-tok-c"
      : m[2]
        ? "sin-tok-s"
        : m[3]
          ? "sin-tok-k"
          : m[4]
            ? "sin-tok-n"
            : undefined;
    tokens.push({ t: m[0], c: cls });
    last = m.index + m[0].length;
    if (tokens.length > 4000) break; // safety valve for pathological blocks
  }
  if (last < code.length) tokens.push({ t: code.slice(last) });
  return tokens;
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
  const tokens = tokenizeCode(code, language);
  return (
    <div className="sin-chat-code-block">
      <div className="sin-chat-code-head">
        <span>{language || "code"}</span>
        <CopyButton text={code} label="Copy" />
      </div>
      <pre>
        <code>
          {tokens.map((tok, i) => (
            <span key={i} className={tok.c}>
              {tok.t}
            </span>
          ))}
        </code>
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
    unhinged: "UNHINGED",
    regenerate: "Regenerate reply",
    rateLabel: "useful?",
    rateUp: "Useful",
    rateDown: "Not useful",
    inspect: "What SINISTER knows",
    factMode: "persona",
    modeStandard: "standard",
    // Persona picker labels (the selectable moods the visitor can flip to).
    personaStandard: "standard",
    personaDeadpan: "deadpan",
    personaHyper: "hyperfixation",
    personaPro: "professional",
    personaUnhinged: "unhinged",
    factPosts: "live post index",
    factPostsUnit: "posts",
    factPostsBase: "dossier baseline",
    factMessages: "messages in thread",
    factEndpoint: "endpoint",
    threadsTitle: "conversations",
    threadsUntitled: "new conversation",
    threadsLegacy: "earlier conversation",
    newChat: "New conversation",
    exportThread: "Copy conversation",
    exported: "copied",
    nameLabel: "call me:",
    namePlaceholder: "a name it will remember",
    retry: "Try again",
    threadDelete: "Delete conversation",
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
      "سلام. سینیستر اینجاست — یه ایجنت وحشی که توی این پورتفولیو لانه کرده و قرار هم نیست خیلی مؤدب باشه. از کد و تکنولوژی بگیر تا تاریخ و بحث‌های داغ، هر چی بپرسی نظره داره؛ این سایت رو هم تا آخرین شیدرش بلده. فقط یه خواهش: سؤال خسته‌کننده نپرس.",
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
    unhinged: "UNHINGED",
    regenerate: "دوباره بساز",
    rateLabel: "به‌دردبخور بود؟",
    rateUp: "آره",
    rateDown: "نه",
    inspect: "سینیستر چه می‌دونه",
    factMode: "شخصیت",
    modeStandard: "استاندارد",
    personaStandard: "استاندارد",
    personaDeadpan: "بی‌احساس",
    personaHyper: "هیپرفیکس",
    personaPro: "حرفه‌ای",
    personaUnhinged: "UNHINGED",
    factPosts: "ایندکس زنده‌ی نوشته‌ها",
    factPostsUnit: "نوشته",
    factPostsBase: "نسخه‌ی پایه (دوجیلی)",
    factMessages: "پیام در این گفتگو",
    factEndpoint: "سرور",
    threadsTitle: "گفتگوها",
    threadsUntitled: "گفتگوی جدید",
    threadsLegacy: "گفتگوی قبلی",
    newChat: "گفتگوی جدید",
    exportThread: "کپی گفتگو",
    exported: "کپی شد",
    nameLabel: "صدا کنم:",
    namePlaceholder: "یه اسم که یادش بمونه",
    retry: "دوباره امتحان کن",
    threadDelete: "حذف گفتگو",
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
  // Track the start time and user text for research logging.
  const startedAtRef = useRef<number>(0);
  const userTextRef = useRef<string>("");
  const lastAssistantTextRef = useRef<string>("");

  /* ── Conversation threads ──────────────────────────────────────
   * Lazy boot: load the thread list, migrating the legacy single-session
   * history into the first thread when found. Safe on first render —
   * this panel never SSRs (next/dynamic ssr:false in AgentChatLazy). */
  const [boot] = useState(() => {
    let threads: Thread[] = [];
    try {
      const raw = localStorage.getItem(THREADS_KEY);
      if (raw) {
        const arr = JSON.parse(raw) as unknown;
        if (Array.isArray(arr) && arr.length > 0) threads = arr as Thread[];
      }
    } catch {
      threads = [];
    }
    if (threads.length === 0) {
      // Legacy migration: the pre-threads widget kept one session id plus
      // its history. Adopt them as the first thread; otherwise start fresh.
      let legacyId: string | null = null;
      try {
        legacyId = localStorage.getItem("sin-chat-session");
      } catch {
        legacyId = null;
      }
      threads = [
        {
          id: legacyId ?? newThreadId(),
          title: "",
          createdAt: Date.now(),
        },
      ];
      try {
        localStorage.setItem(THREADS_KEY, JSON.stringify(threads));
      } catch {
        /* storage blocked — threads just won't survive reload */
      }
    }
    let activeId = threads[0]!.id;
    try {
      const stored = localStorage.getItem(THREAD_ACTIVE_KEY);
      if (stored && threads.some((t) => t.id === stored)) activeId = stored;
    } catch {
      /* fall back to the newest thread */
    }
    return { threads, activeId };
  });
  const [threads, setThreads] = useState<Thread[]>(boot.threads);
  const [activeId, setActiveId] = useState<string>(boot.activeId);
  // Which thread the in-memory `messages` currently belongs to. Guards the
  // history-persist effect against writing old messages into a new thread
  // during a switch.
  const messagesThreadRef = useRef<string>(boot.activeId);
  const [inspectOpen, setInspectOpen] = useState(false);
  const [threadsOpen, setThreadsOpen] = useState(false);

  // Active thread id doubles as the anonymous research session id, so all
  // downstream logging / history code keeps one name.
  const sessionId: string | null = activeId;

  // Visitor profile — a self-chosen nickname remembered across visits.
  const [profile, setProfile] = useState<string>(() => {
    try {
      return localStorage.getItem(PROFILE_KEY) ?? "";
    } catch {
      return "";
    }
  });

  // Message ratings (👍/👎 as circle glyphs) — session-local UI state; the
  // signal itself is persisted server-side via the /api/log rating path.
  const [ratings, setRatings] = useState<Record<string, 1 | -1>>({});
  // "Exported" feedback for the copy-this-thread action.
  const [exported, setExported] = useState(false);

  // Persona — the visitor can flip personality at any moment (inspector
  // picker, or the terminal easter egg's `unhinged` command which writes
  // the same key and dispatches `sinister:persona` to sync live). Lazy
  // initializer is safe: this panel only mounts client-side.
  const [persona, setPersona] = useState<PersonaId>(() => {
    try {
      const stored = localStorage.getItem(PERSONA_KEY);
      if (stored && (PERSONAS as readonly string[]).includes(stored)) {
        return stored as PersonaId;
      }
      // Legacy migration: the old unhinged flag becomes the persona.
      return localStorage.getItem(UNHINGED_KEY) === "1"
        ? "unhinged"
        : "standard";
    } catch {
      return "standard";
    }
  });
  const choosePersona = useCallback(
    (next: PersonaId) => {
      setPersona(next);
      try {
        localStorage.setItem(PERSONA_KEY, next);
      } catch {
        /* storage blocked — live for this session only */
      }
      trackEvent("chat_persona", { locale, persona: next });
    },
    [locale],
  );
  useEffect(() => {
    const syncPersona = () => {
      try {
        const stored = localStorage.getItem(PERSONA_KEY);
        setPersona(
          stored && (PERSONAS as readonly string[]).includes(stored)
            ? (stored as PersonaId)
            : localStorage.getItem(UNHINGED_KEY) === "1"
              ? "unhinged"
              : "standard",
        );
      } catch {
        /* keep current */
      }
    };
    window.addEventListener("sinister:persona", syncPersona);
    return () => window.removeEventListener("sinister:persona", syncPersona);
  }, []);

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
      slug?: string;
      faTitle?: string;
      enTitle?: string;
      enExcerpt?: string;
      faExcerpt?: string;
    }>) => {
      if (cancelled) return null;
      const index = rows
        .slice(0, 40)
        .map((it) => {
          const date = (it.date ?? "").slice(0, 10);
          const title =
            (locale === "fa" ? (it.faTitle ?? "") : (it.enTitle ?? "")) ||
            it.title ||
            "";
          const excerpt = (locale === "fa" ? (it.faExcerpt ?? "") : (it.enExcerpt ?? ""))
            .trim()
            .slice(0, 140);
          // The endpoint returns each post's real slug — passing it through
          // stops the agent from fabricating slugs from titles.
          const slug = (it.slug ?? "").trim();
          const path = slug ? `/${locale}/blog/${slug}` : "";
          return `- ${date} | ${(title || "").trim()} | ${path} | ${excerpt}`;
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
            id?: string;
            url?: string;
            title?: string;
            summary?: string;
            content_text?: string;
            date_published?: string;
          }>;
        }) => {
          if (cancelled || !Array.isArray(feed.items) || feed.items.length === 0)
            return;
          const index = feed.items
            .slice(0, 40)
            .map((it) => {
              const date = it.date_published?.slice(0, 10) ?? "";
              const title = (it.title ?? "").trim();
              const excerpt = (it.summary ?? it.content_text ?? "")
                .trim()
                .slice(0, 140);
              // JSON-feed ids/urls are absolute post URLs — pull the slug off
              // the end so the agent links real posts even on this fallback.
              const rawId = (it.id ?? it.url ?? "").trim();
              const slug = rawId
                .split(/[/?#]/)
                .filter(Boolean)
                .pop() ?? "";
              const path = slug ? `/${locale}/blog/${slug}` : "";
              return `- ${date} | ${title} | ${path} | ${excerpt}`;
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
          ...(persona !== "standard" ? { persona } : {}),
          ...(profile.trim() ? { profile: profile.trim().slice(0, 40) } : {}),
          locale,
          path: window.location.pathname,
          screen: `${window.screen.width}x${window.screen.height}`,
        }),
      }),
    [liveContext, sessionId, locale, persona, profile],
  );

  const {
    messages,
    sendMessage,
    stop,
    setMessages,
    regenerate,
    status,
    error,
  } = useChat({
    transport,
    // Restore the persisted conversation, if any, so it survives refresh /
    // panel close. The SDK resends these with the next message, which gives
    // the model continuous context across visits.
    messages: readHistory(boot.activeId) ?? [],
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

  /* ── Thread actions ─────────────────────────────────────────── */

  // Switch the active thread: swap the in-memory messages for that thread's
  // persisted history. The ref is set before the state setters so the
  // persist effect below never writes one thread's messages into another.
  const switchThread = useCallback(
    (id: string) => {
      if (id === activeId) return;
      // Flush the outgoing thread's in-memory messages to localStorage first
      // so switching never loses the conversation you're leaving behind.
      if (activeId && messages.length > 0 && messagesThreadRef.current === activeId) {
        try {
          writeHistory(activeId, messages);
        } catch {
          /* storage blocked — switch anyway */
        }
      }
      messagesThreadRef.current = id;
      stop();
      setMessages(readHistory(id) ?? []);
      setActiveId(id);
      setInspectOpen(false);
      try {
        localStorage.setItem(THREAD_ACTIVE_KEY, id);
      } catch {
        /* storage blocked — switching just won't survive reload */
      }
      trackEvent("chat_thread", { locale, action: "switch" });
    },
    [activeId, messages, stop, setMessages, locale],
  );

  const startNewThread = useCallback(() => {
    // Never mutate the threads array in place: cap immutably so React state
    // stays consistent (a direct .pop() on state is what made old threads
    // disappear from the list after adding a new one).
    const capped = threads.length >= MAX_THREADS
      ? threads.slice(0, MAX_THREADS - 1)
      : threads;
    const id = newThreadId();
    const thread: Thread = { id, title: "", createdAt: Date.now() };
    const next = [thread, ...capped];
    try {
      localStorage.setItem(THREADS_KEY, JSON.stringify(next));
      localStorage.setItem(THREAD_ACTIVE_KEY, id);
    } catch {
      /* storage blocked */
    }
    setThreads(next);
    messagesThreadRef.current = id;
    stop();
    setMessages([]);
    setActiveId(id);
    setInspectOpen(false);
    setThreadsOpen(false);
    trackEvent("chat_thread", { locale, action: "new" });
  }, [threads, stop, setMessages, locale]);

  // Delete a thread: remove its history, drop it from the list, and — if
  // it was the active thread — pivot to the newest remaining (or a fresh
  // thread when the last one goes).
  const deleteThread = useCallback(
    (id: string) => {
      let next = threads.filter((t) => t.id !== id);
      try {
        localStorage.removeItem(`${HISTORY_PREFIX}-${id}`);
      } catch {
        /* storage blocked */
      }
      if (next.length === 0) {
        const fresh: Thread = { id: newThreadId(), title: "", createdAt: Date.now() };
        next = [fresh];
      }
      try {
        localStorage.setItem(THREADS_KEY, JSON.stringify(next));
        if (id === activeId) {
          localStorage.setItem(THREAD_ACTIVE_KEY, next[0]!.id);
        }
      } catch {
        /* storage blocked */
      }
      if (id === activeId) {
        stop();
        setMessages(readHistory(next[0]!.id) ?? []);
        setActiveId(next[0]!.id);
        messagesThreadRef.current = next[0]!.id;
      }
      setThreads(next);
      setThreadsOpen(false);
      trackEvent("chat_thread", { locale, action: "delete" });
    },
    [threads, activeId, stop, setMessages, locale],
  );

  // Thread-aware persistence: only write when the in-memory messages belong
  // to the active thread (guards against a mid-switch stale frame).
  useEffect(() => {
    if (messagesThreadRef.current !== activeId) return;
    if (status === "submitted" || status === "streaming") return;
    if (!sessionId || messages.length === 0) return;
    writeHistory(messagesThreadRef.current, messages);
  }, [messages, status, activeId, sessionId]);

  // Recent-activity sorting: whenever the active thread gains a new
  // exchange, float it to the top of the list (the array order is the
  // display order; a no-op once it's already first). The state write is
  // deferred out of the effect body (react-hooks rule) — the stored
  // localStorage order updates immediately.
  useEffect(() => {
    if (messagesThreadRef.current !== activeId) return;
    if (status === "submitted" || status === "streaming") return;
    if (threads.length < 2) return;
    const idx = threads.findIndex((t) => t.id === activeId);
    if (idx <= 0) return;
    const next = [
      threads[idx],
      ...threads.filter((t, i) => i !== idx),
    ];
    try {
      localStorage.setItem(THREADS_KEY, JSON.stringify(next));
    } catch {
      /* storage blocked — order just won't survive reload */
    }
    window.setTimeout(() => {
      setThreads(next);
    }, 0);
  }, [messages, status, threads, activeId]);

  // Thread titles are derived lazily (never stored): the first user message
  // of the thread's history — in-memory for the active one, persisted for
  // the rest — names the thread. No state writes, no sync setState.
  const threadTitle = useCallback(
    (id: string, untitled: string, legacy: string): string => {
      const th = threads.find((x) => x.id === id);
      if (th?.title) return th.title;
      const hist =
        id === activeId ? messages : (readHistory(id) ?? []);
      const firstUser = hist.find(
        (m) =>
          m.role === "user" &&
          m.parts.some(
            (p) => p.type === "text" && typeof (p as { text?: string }).text === "string",
          ),
      );
      if (!firstUser) return th ? untitled : legacy;
      const text = firstUser.parts
        .filter((p) => p.type === "text")
        .map((p) => (p as { text: string }).text)
        .join(" ")
        .trim()
        .replace(/\s+/g, " ")
        .slice(0, 40);
      return text || untitled;
    },
    [threads, messages, activeId],
  );

  /* ── Visitor profile ("call me…") ───────────────────────────── */
  const saveProfile = useCallback(
    (name: string) => {
      const clean = name.trim().slice(0, 40);
      setProfile(clean);
      try {
        if (clean) localStorage.setItem(PROFILE_KEY, clean);
        else localStorage.removeItem(PROFILE_KEY);
      } catch {
        /* storage blocked — profile live for this session only */
      }
      trackEvent("chat_profile", { locale, set: clean !== "" });
    },
    [locale],
  );

  /* ── Message ratings ────────────────────────────────────────── */
  // Toggle a quality signal on the latest assistant reply; persisted
  // server-side via the /api/log rating path (best-effort).
  const toggleRating = useCallback(
    (messageId: string, value: 1 | -1) => {
      const current = ratings[messageId];
      const nextValue = current === value ? 0 : value;
      const next = { ...ratings };
      if (nextValue === 0) delete next[messageId];
      else next[messageId] = value;
      setRatings(next);
      if (sessionId && nextValue !== 0) {
        void fetch(SINISTER_LOG_API, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sessionId, rating: value }),
        }).catch(() => {
          /* best-effort — never surface */
        });
      }
      trackEvent("chat_rating", { locale, value });
    },
    [ratings, sessionId, locale],
  );

  // Copy the whole active thread as clean Markdown — the "keep it / share it"
  // primitive for a conversation worth keeping.
  const exportThread = useCallback(() => {
    const md = formatThread(messages);
    if (!md) return;
    void navigator.clipboard
      ?.writeText(md)
      .then(() => {
        setExported(true);
        setTimeout(() => setExported(false), 1600);
        trackEvent("chat_export", { locale, messages: messages.length });
      })
      .catch(() => {
        /* clipboard blocked — fail silently */
      });
  }, [messages, locale]);

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

  // Escape closes an open popover first, then the panel — matches the
  // site's overlay conventions.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      if (inspectOpen) {
        setInspectOpen(false);
        return;
      }
      if (threadsOpen) {
        setThreadsOpen(false);
        return;
      }
      onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose, inspectOpen, threadsOpen]);

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
          {persona === "unhinged" && <span className="sin-chat-unhinged">{t.unhinged}</span>}
        </div>
        <div className="sin-chat-head-actions">
          <button
            type="button"
            className="sin-chat-x"
            onClick={() => setInspectOpen((v) => !v)}
            aria-label={t.inspect}
            title={t.inspect}
            aria-pressed={inspectOpen}
          >
            <InfoIcon />
          </button>
          <button
            type="button"
            className="sin-chat-x"
            onClick={() => setThreadsOpen((v) => !v)}
            aria-label={t.threadsTitle}
            title={t.threadsTitle}
            aria-pressed={threadsOpen}
          >
            <StackIcon />
          </button>
          <button
            type="button"
            className="sin-chat-x"
            onClick={clearConversation}
            aria-label={t.clear}
            title={t.clear}
          >
            <ClearIcon />
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

      {/* ── Threads popover ─────────────────────────────────────── */}
      {threadsOpen && (
        <div className="sin-chat-pop" aria-label={t.threadsTitle}>
          <button
            type="button"
            className="sin-chat-pop-item sin-chat-pop-new"
            onClick={() => {
              setThreadsOpen(false);
              startNewThread();
            }}
          >
            <PlusIcon />
            <span>{t.newChat}</span>
          </button>
          <button
            type="button"
            className="sin-chat-pop-item sin-chat-pop-export"
            onClick={() => {
              exportThread();
              setThreadsOpen(false);
            }}
            disabled={messages.length === 0}
          >
            <span>{exported ? `✓ ${t.exported}` : t.exportThread}</span>
          </button>
          {threads.map((th) => (
            <div
              key={th.id}
              className={`sin-chat-pop-row${th.id === activeId ? " is-current" : ""}`}
            >
              <button
                type="button"
                className="sin-chat-pop-item"
                aria-current={th.id === activeId ? "true" : undefined}
                onClick={() => {
                  setThreadsOpen(false);
                  switchThread(th.id);
                }}
              >
                <span className="sin-chat-pop-item-label">
                  {threadTitle(th.id, t.threadsUntitled, t.threadsLegacy)}
                </span>
                <span className="sin-chat-pop-item-sub">{relTime(th.createdAt, locale)}</span>
              </button>
              <button
                type="button"
                className="sin-chat-thread-del"
                aria-label={t.threadDelete}
                title={t.threadDelete}
                onClick={() => deleteThread(th.id)}
              >
                <XIcon />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* ── Inspector: facts + "call me…" ───────────────────────── */}
      {inspectOpen && (
        <div className="sin-chat-pop sin-chat-inspect" aria-label={t.inspect}>
          <p className="sin-chat-inspect-label">{t.factMode}</p>
          <div className="sin-chat-persona-picker" role="group" aria-label={t.factMode}>
            {[
              { id: "standard" as const, label: t.personaStandard },
              { id: "deadpan" as const, label: t.personaDeadpan },
              { id: "hyperfixation" as const, label: t.personaHyper },
              { id: "professional" as const, label: t.personaPro },
              { id: "unhinged" as const, label: t.personaUnhinged },
            ].map(({ id, label }) => (
              <button
                key={id}
                type="button"
                className={`sin-chat-persona-btn${persona === id ? " is-on" : ""}`}
                aria-pressed={persona === id}
                aria-label={label}
                title={label}
                onClick={() => {
                  choosePersona(id);
                  setInspectOpen(false);
                }}
              >
                {label}
              </button>
            ))}
          </div>
          <p className="sin-chat-inspect-row">
            <span className="sin-chat-pop-item-label">
              {persona.toUpperCase()}
            </span>
            <span className="sin-chat-inspect-badge">
              {persona === "unhinged" ? t.unhinged : persona}
            </span>
          </p>
          <p className="sin-chat-inspect-label">{t.factPosts}</p>
          <p className="sin-chat-inspect-row">
            <span className="sin-chat-pop-item-label">
              {liveContext ? `${liveContext.split("\n").length} ${t.factPostsUnit}` : t.factPostsBase}
            </span>
          </p>
          <p className="sin-chat-inspect-label">{t.factMessages}</p>
          <p className="sin-chat-inspect-row">
            <span className="sin-chat-pop-item-label">{messages.length}</span>
          </p>
          <p className="sin-chat-inspect-label">{t.factEndpoint}</p>
          <p className="sin-chat-inspect-row">
            <span className="sin-chat-pop-item-label sin-chat-inspect-mono">
              {SINISTER_API.replace(/^https?:\/\//, "").slice(0, 34)}
            </span>
          </p>
          <label className="sin-chat-inspect-name">
            <span className="sin-chat-inspect-label">{t.nameLabel}</span>
            <input
              type="text"
              className="sin-chat-inspect-input"
              value={profile}
              placeholder={t.namePlaceholder}
              maxLength={40}
              onChange={(e) => saveProfile(e.target.value)}
            />
          </label>
        </div>
      )}

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

          // Bot message — mood tag + markdown with copy, read-aloud,
          // ratings and (on the latest) regenerate
          const mood = detectMood(text);
          const moodLabel = MOOD_LABEL[mood];
          const isLatest =
            message.id === messages[messages.length - 1]?.id;
          const followups = message.parts
            .filter((p) => p.type === "data-followups")
            .flatMap(
              (p) =>
                (p as { data?: { items?: string[] } }).data?.items ?? [],
            )
            .filter((q) => typeof q === "string" && q.trim())
            .slice(0, 3);
          const rating = ratings[message.id];
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
                {isLatest && !isStreaming && (
                  <span className="sin-chat-actions">
                    <button
                      type="button"
                      className={`sin-chat-act-rate${rating === 1 ? " is-on" : ""}`}
                      onClick={() => toggleRating(message.id, 1)}
                      aria-label={t.rateUp}
                      aria-pressed={rating === 1}
                      title={`${t.rateUp}?`}
                    >
                      <RateUpIcon />
                    </button>
                    <button
                      type="button"
                      className={`sin-chat-act-rate${rating === -1 ? " is-on" : ""}`}
                      onClick={() => toggleRating(message.id, -1)}
                      aria-label={t.rateDown}
                      aria-pressed={rating === -1}
                      title={`${t.rateDown}?`}
                    >
                      <RateDownIcon />
                    </button>
                    <button
                      type="button"
                      className="sin-chat-act-regen"
                      onClick={() => regenerate()}
                      aria-label={t.regenerate}
                      title={t.regenerate}
                    >
                      <RefreshIcon />
                    </button>
                  </span>
                )}
              </div>
              {followups.length > 0 && (
                <div className="sin-chat-followups" aria-label={t.chipsLabel}>
                  {followups.map((q) => (
                    <button
                      key={q}
                      type="button"
                      className="sin-chat-chip"
                      onClick={() => {
                        startedAtRef.current = Date.now();
                        userTextRef.current = q;
                        sendMessage({ text: q });
                        trackEvent("chat_message", { locale, source: "followup" });
                      }}
                    >
                      {q}
                    </button>
                  ))}
                </div>
              )}
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
              {!isStreaming && messages.some((m) => m.role === "user") && (
                <button
                  type="button"
                  className="sin-chat-retry"
                  onClick={() => regenerate()}
                >
                  <RefreshIcon />
                  <span>{t.retry}</span>
                </button>
              )}
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

