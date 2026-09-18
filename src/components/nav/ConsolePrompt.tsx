"use client";

import type { KeyboardEvent, RefObject } from "react";
import type { Dictionary } from "@/lib/i18n";
import { CONSOLE_IDS, PROMPT_HOST } from "@/lib/nav/constants";

/**
 * The prompt line — the console's resting face and its only input.
 *
 * Implements the input half of the ARIA combobox pattern: the field is
 * role="combobox", it owns the popup via aria-controls, and it reports the
 * keyboard cursor with aria-activedescendant. That keeps focus in ONE place
 * (the field) while the tree below appears to be navigated — which is how
 * a real command line behaves, and what makes arrow-key browsing possible
 * without a focus trap.
 *
 * Presenter only: value, count and handlers come from the container.
 */
export default function ConsolePrompt({
  dict,
  buffer,
  open,
  itemCount,
  activeId,
  inputRef,
  onValue,
  onKeyDown,
  onActivate,
}: {
  dict: Dictionary;
  buffer: string;
  open: boolean;
  itemCount: number;
  activeId?: string;
  inputRef: RefObject<HTMLInputElement | null>;
  onValue: (value: string) => void;
  onKeyDown: (event: KeyboardEvent<HTMLInputElement>) => void;
  /** Tap/click anywhere on the pill opens the console and focuses the field. */
  onActivate: () => void;
}) {
  return (
    <div
      className="craft-prompt"
      data-open={open || undefined}
      onPointerDown={(event) => {
        // Let clicks that land on the field behave normally.
        if (event.target !== inputRef.current) onActivate();
      }}
    >
      <span className="craft-prompt-host" dir="ltr" aria-hidden>
        {PROMPT_HOST}
      </span>
      <span className="craft-prompt-caret" aria-hidden>
        ▸
      </span>

      <input
        id={CONSOLE_IDS.prompt}
        ref={inputRef}
        className="craft-prompt-input"
        type="text"
        role="combobox"
        value={buffer}
        placeholder={open ? dict.console.placeholder : ""}
        aria-label={dict.console.label}
        aria-expanded={open}
        aria-controls={CONSOLE_IDS.list}
        aria-activedescendant={open ? activeId : undefined}
        aria-autocomplete="list"
        autoComplete="off"
        autoCorrect="off"
        spellCheck={false}
        enterKeyHint="go"
        onChange={(event) => onValue(event.target.value)}
        onKeyDown={onKeyDown}
        onFocus={onActivate}
      />

      <span className="craft-prompt-meta" aria-hidden>
        {open ? (
          <span className="craft-prompt-count">{String(itemCount).padStart(2, "0")}</span>
        ) : (
          <span className="craft-kbd">{dict.console.hint}</span>
        )}
      </span>
    </div>
  );
}