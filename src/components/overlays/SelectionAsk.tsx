"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Locale } from "@/lib/i18n";
import { SparkIcon } from "@/components/ui/icons";
import { askSinister } from "@/components/blog/AskSinisterButton";

const COPY = {
  en: { label: "Ask SINISTER about this" },
  fa: { label: "بپرس از سینیستر" },
} as const;

/**
 * Selection → Ask SINISTER. When the visitor selects text on any page, a
 * small floating button appears below the selection; one tap hands the
 * selection to the resident agent. Selections made inside the chat panel,
 * the FAB, the command palette, or any input/textarea/contenteditable are
 * ignored (the agent is not going to ask itself about itself).
 */
export default function SelectionAsk({ locale }: { locale: Locale }) {
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null);
  const textRef = useRef("");
  const pendingRef = useRef<number | null>(null);

  const clearPending = useCallback(() => {
    if (pendingRef.current) {
      window.clearTimeout(pendingRef.current);
      pendingRef.current = null;
    }
  }, []);

  const hide = useCallback(() => {
    clearPending();
    setPos(null);
  }, [clearPending]);

  const onMouseUp = useCallback(() => {
    clearPending();
    // Defer so the button's own click handler wins the race; if that click
    // never lands (plain selection), the button appears after the delay.
    pendingRef.current = window.setTimeout(
      () => {
        pendingRef.current = null;
        try {
          const sel = window.getSelection();
          const text = (sel?.toString() ?? "").trim().replace(/\s+/g, " ");
          if (!text) return;
          if (
            sel?.anchorNode?.parentElement?.closest?.(
              ".sin-chat-panel, .sin-chat-fab, .sin-selection-ask, .palette-pop",
            )
          ) {
            return;
          }
          const ae = document.activeElement;
          if (
            ae &&
            ((ae as HTMLElement).tagName === "INPUT" ||
              (ae as HTMLElement).tagName === "TEXTAREA" ||
              (ae as HTMLElement).isContentEditable)
          ) {
            return;
          }
          const range = sel?.getRangeAt(0);
          const rect = range?.getBoundingClientRect();
          if (!range || !rect || rect.width < 4 || rect.height < 4) return;
          textRef.current = text.slice(0, 600);
          const x = Math.min(
            Math.max(rect.right - 24, 8),
            window.innerWidth - 150,
          );
          const y = Math.min(rect.bottom + 8, window.innerHeight - 48);
          setPos({ x, y });
        } catch {
          /* collapsed or cross-root selection — ignore */
        }
      },
      120,
    );
  }, [clearPending]);

  useEffect(() => {
    document.addEventListener("mouseup", onMouseUp);
    document.addEventListener("scroll", hide, true);
    window.addEventListener("resize", hide);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") hide();
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mouseup", onMouseUp);
      document.removeEventListener("scroll", hide, true);
      window.removeEventListener("resize", hide);
      document.removeEventListener("keydown", onKey);
      clearPending();
    };
  }, [onMouseUp, hide, clearPending]);

  if (!pos) return null;

  return (
    <button
      type="button"
      className="sin-selection-ask"
      style={{ left: pos.x, top: pos.y }}
      onClick={() => {
        const text = textRef.current;
        const q =
          locale === "fa"
            ? `یه بخش از سایت رو انتخاب کردم: «${text}» — نظرت چیه؟`
            : `I selected this bit of the site: "${text}" — what do you make of it?`;
        hide();
        askSinister(locale, q, "selection");
      }}
    >
      <SparkIcon />
      <span>{COPY[locale].label}</span>
    </button>
  );
}