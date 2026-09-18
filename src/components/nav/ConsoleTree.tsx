"use client";

import type { CSSProperties } from "react";
import type { Dictionary } from "@/lib/i18n";
import { routeFilePath } from "@/lib/nav/commands";
import { CONSOLE_IDS } from "@/lib/nav/constants";
import type { ConsoleItem } from "@/lib/nav/types";

/** Custom properties have no place in React's CSSProperties type. */
const vars = (entries: Record<string, string | number>): CSSProperties =>
  entries as CSSProperties;

/**
 * The tree — the console expanded into a live file listing.
 *
 * Rows are the pages (presented as the files that render them) followed by
 * the command verbs. This is the popup half of the combobox pattern:
 * role="listbox" with role="option" rows, id'd so the field's
 * aria-activedescendant can point at the cursor. Rows are not anchors on
 * purpose — focus never leaves the prompt (that is the whole point of a
 * terminal), and every route also exists as a real link in the footer.
 *
 * Presenter only: no state, no side effects beyond the callbacks.
 */
export default function ConsoleTree({
  dict,
  items,
  activeIndex,
  onHover,
  onCommit,
}: {
  dict: Dictionary;
  items: readonly ConsoleItem[];
  activeIndex: number;
  onHover: (index: number) => void;
  onCommit: (item: ConsoleItem) => void;
}) {
  if (items.length === 0) {
    return (
      <p className="craft-tree-empty" role="presentation">
        <span aria-hidden>stderr: </span>
        {dict.console.empty}
      </p>
    );
  }

  return (
    <ul
      id={CONSOLE_IDS.list}
      className="craft-tree"
      role="listbox"
      aria-label={dict.console.label}
    >
      {items.map((item, index) => {
        const active = index === activeIndex;
        return (
          <li
            key={`${item.kind}-${item.value}`}
            id={CONSOLE_IDS.row(item.value)}
            role="option"
            aria-selected={active}
            className="craft-row"
            data-kind={item.kind}
            data-active={active || undefined}
            style={vars({ "--row-i": index })}
            onPointerEnter={() => onHover(index)}
            onPointerDown={(event) => {
              // Commit on press: no click-through, no focus theft.
              event.preventDefault();
              onCommit(item);
            }}
          >
            <span className="craft-row-idx" aria-hidden>
              {item.index ?? "··"}
            </span>
            <span className="craft-row-label">{item.label}</span>
            <span className="craft-row-sub" dir="ltr" aria-hidden>
              {item.kind === "route"
                ? routeFilePath(item.value)
                : `$ ${item.sub}`}
            </span>
            <span className="craft-row-mark" aria-hidden>
              {item.kind === "route" ? "↵" : "⏎"}
            </span>
          </li>
        );
      })}
    </ul>
  );
}