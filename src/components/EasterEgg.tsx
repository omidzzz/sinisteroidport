"use client";

import { useEffect, useRef, useState } from "react";
import LogoType from "./LogoType";

/**
 * Easter egg — the konami sequence (↑↑↓↓←→←→BA) or 7 clicks on any
 * element tagged `data-logo-activate` (the footer masthead) opens a
 * mono terminal overlay: a SINISTER[OID] boot banner, a fake init log,
 * and a live prompt with a few real commands. Theme-independent (opaque).
 */
const SEQ = [
  "ArrowUp",
  "ArrowUp",
  "ArrowDown",
  "ArrowDown",
  "ArrowLeft",
  "ArrowRight",
  "ArrowLeft",
  "ArrowRight",
  "b",
  "a",
];

const BOOT = [
  "sinisteroid kernel 1.0.0 — init",
  "> locating glyphs … ok",
  "> loading typefaces [ syne / jetbrains-mono / unbounded ] … ok",
  "> bridging en ⇄ fa … ok",
  "> mounting interface as argument … ok",
  "> boot complete. welcome in.",
];

const HELP: Record<string, string | undefined> = {
  help: "commands: whoami · who · ls · date · clear · exit",
  whoami: "Omid — frontend developer / translator.",
  who: "one human, two registers: SINISTER code, OID refine.",
  ls: "index · work · skills · education · showcase · writing",
  date: undefined,
};

export default function EasterEgg({ locale }: { locale: "en" | "fa" }) {
  const [open, setOpen] = useState(false);
  const [revealed, setRevealed] = useState(0);
  const [log, setLog] = useState<{ t: string; eol?: boolean }[]>([]);
  const [input, setInput] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const clicks = useRef(0);

  // keyboard trigger: konami sequence + Esc to close
  useEffect(() => {
    let pos = 0;
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const typing =
        target?.tagName === "INPUT" || target?.tagName === "TEXTAREA";
      if (e.key === "Escape") {
        setOpen(false);
        return;
      }
      if (typing) return;
      if (e.key === SEQ[pos]) {
        pos += 1;
        if (pos === SEQ.length) {
          pos = 0;
          setOpen(true);
        }
      } else {
        pos = e.key === SEQ[0] ? 1 : 0;
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // 7 clicks on the footer brand open it too
  useEffect(() => {
    const onDocClick = (e: MouseEvent) => {
      const t = e.target as HTMLElement | null;
      if (t?.closest?.("[data-logo-activate]")) {
        clicks.current += 1;
        if (clicks.current >= 7) {
          clicks.current = 0;
          setOpen(true);
        }
      }
    };
    document.addEventListener("click", onDocClick);
    return () => document.removeEventListener("click", onDocClick);
  }, []);

  // reveal boot lines progressively
  useEffect(() => {
    if (!open) {
      setRevealed(0);
      setLog([]);
      setInput("");
      return;
    }
    const id = setInterval(() => {
      setRevealed((r) => {
        if (r >= BOOT.length) {
          clearInterval(id);
          return r;
        }
        return r + 1;
      });
    }, 130);
    return () => clearInterval(id);
  }, [open]);

  const run = (raw: string) => {
    const cmd = raw.trim().toLowerCase();
    if (!cmd) return;
    const next: { t: string }[] = [...log, { t: `$ ${raw.trim()}` }];
    if (cmd === "clear") {
      setLog([]);
      return;
    }
    if (cmd === "exit") {
      setOpen(false);
      return;
    }
    const out = HELP[cmd] ?? (cmd === "date" ? new Date().toString() : undefined);
    setLog(
      out ? [...next, { t: out }] : [...next, { t: `command not found: ${cmd}` }]
    );
  };

  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-[90] flex flex-col overflow-hidden bg-[#07081c] text-[#ff2b55]"
      role="dialog"
      aria-modal="true"
      aria-label="SINISTEROID terminal"
      dir="ltr"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) {
          // click outside the frame closes it
          setOpen(false);
        }
      }}
    >
      <span className="term-scan" aria-hidden />

      {/* close */}
      <div className="flex items-center justify-between border-b border-[#ff2b55]/25 px-5 py-3 font-mono text-[0.65rem] uppercase tracking-[0.25em] text-[#ff2b55]/80">
        <span className="term-blink">● REC</span>
        <button
          type="button"
          onClick={() => setOpen(false)}
          aria-label="close terminal"
          className="transition-colors hover:text-[#fff]"
        >
          [ esc / exit ]
        </button>
      </div>

      {/* body */}
      <div
        className="relative flex-1 overflow-y-auto px-5 py-6 sm:px-10"
        onMouseDown={(e) => e.stopPropagation()}
      >
        {/* boot banner */}
        <div className="mb-6 inline-block">
          <LogoType
            variant="full"
            className={`text-[clamp(2rem,7vw,5.5rem)] term-flicker ${
              revealed === 0 ? "opacity-0" : ""
            }`}
          />
          <p className="mt-3 font-mono text-[0.65rem] uppercase tracking-[0.25em] text-[#ff2b55]/60">
            system console — type `help` for commands
          </p>
        </div>

        {/* init log */}
        <div className="font-mono text-sm leading-relaxed">
          {BOOT.slice(0, revealed).map((line, i) => (
            <p key={i} className="text-[#ff2b55]/85">
              {line}
            </p>
          ))}
        </div>

        {/* session log */}
        <div className="mt-3 font-mono text-sm leading-relaxed">
          {log.map((l, i) => (
            <p key={i} className="text-[#ff2b55]">
              {l.t}
            </p>
          ))}
        </div>

        {/* prompt */}
        <form
          className="term-prompt mt-4 font-mono text-sm"
          onSubmit={(e) => {
            e.preventDefault();
            run(input);
            setInput("");
            inputRef.current?.focus();
          }}
        >
          <input
            ref={inputRef}
            autoFocus
            value={input}
            onChange={(ev) => setInput(ev.target.value)}
            aria-label="terminal command input"
            className="w-full bg-transparent font-mono text-sm text-[#ff2b55] caret-[#ff2b55] focus:outline-none"
            placeholder="type a command…"
          />
        </form>
      </div>

      {/* footer status */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-[#ff2b55]/25 px-5 py-3 font-mono text-[0.62rem] uppercase tracking-[0.22em] text-[#ff2b55]/60">
        <span>SINISTER[OID] // {locale === "fa" ? "فارسی" : "en"}</span>
        <span>↑↑↓↓←→←→BA</span>
      </div>
    </div>
  );
}