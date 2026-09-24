"use client";

import type { CSSProperties, PointerEvent as ReactPointerEvent } from "react";
import type { Dictionary } from "@/lib/i18n";
import { routeFilePath } from "@/lib/nav/commands";
import { CONSOLE_IDS } from "@/lib/nav/constants";
import type { ConsoleItem } from "@/lib/nav/types";
import { useRef } from "react";

/** A touch/pen gesture armed by pointerdown. Only a real tap commits. */
type PendingTap = {
  item: ConsoleItem;
  pointerId: number;
  startX: number;
  startY: number;
  moved: boolean;
};

/** Movement (px) after which a touch is a scroll/drag and must not commit. */
const TAP_SLOP = 10;

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
  const pendingTap = useRef<PendingTap | null>(null);

  const cancelPending = (pointerId?: number) => {
    const pending = pendingTap.current;
    if (pending && (pointerId === undefined || pending.pointerId === pointerId)) {
      pendingTap.current = null;
    }
  };

  const onPointerMove = (event: ReactPointerEvent<HTMLUListElement>) => {
    const pending = pendingTap.current;
    if (!pending || pending.pointerId !== event.pointerId) return;
    const distance = Math.hypot(
      event.clientX - pending.startX,
      event.clientY - pending.startY
    );
    if (distance > TAP_SLOP) {
      pending.moved = true;
      pendingTap.current = null;
    }
  };

  const onPointerUp = (event: ReactPointerEvent<HTMLUListElement>) => {
    const pending = pendingTap.current;
    if (!pending || pending.pointerId !== event.pointerId) return;
    pendingTap.current = null;
    if (pending.moved) return;
    onCommit(pending.item);
  };

  const onPointerCancel = (event: ReactPointerEvent<HTMLUListElement>) => {
    cancelPending(event.pointerId);
  };

  // The listbox NEVER unmounts. The field and the disclosure button both
  // aria-controls its id, and axe fails (aria-valid-attr-value) the moment
  // that reference resolves to nothing — which is exactly what happened when
  // an emptied filter replaced the whole <ul>. Keep the popup's shape: one
  // disabled option carrying the stderr line.
  if (items.length === 0) {
    return (
      <ul
        id={CONSOLE_IDS.list}
        className="craft-tree"
        role="listbox"
        aria-label={dict.console.label}
      >
        <li
          className="craft-tree-empty"
          role="option"
          aria-selected={false}
          aria-disabled="true"
        >
          <span aria-hidden>stderr: </span>
          {dict.console.empty}
        </li>
      </ul>
    );
  }

  return (
    <ul
      id={CONSOLE_IDS.list}
      className="craft-tree"
      role="listbox"
      aria-label={dict.console.label}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerCancel}
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
            onPointerEnter={(event) => {
              // Touch pointers: a vertical drag is a scroll, never a hover.
              // Hover routing is for mouse cursors only.
              if (event.pointerType !== "mouse") return;
              onHover(index);
            }}
            onPointerDown={(event) => {
              // A touch/finger touch may be the start of a scroll gesture.
              // Committing on pointerdown would navigate the instant the
              // finger touches the list — making it impossible to scroll
              // the overlay menu on mobile. Instead: remember where the
              // finger landed, wait for the real tap (pointerup). If a
              // drag/scroll happens in between, cancel the pending commit.
              if (event.pointerType === "mouse") {
                // Mouse clicks: commit on press — no click-through, no focus theft.
                event.preventDefault();
                onCommit(item);
                return;
              }
              // Touch/pen: arm a pending tap. The container listens for
              // pointerup/pointercancel and only commits when it is a real tap.
              pendingTap.current = {
                item,
                pointerId: event.pointerId,
                startX: event.clientX,
                startY: event.clientY,
                moved: false,
              };
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