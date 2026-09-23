"use client";

import type { RefObject } from "react";
import type { Dictionary } from "@/lib/i18n";

/**
 * The accessible way in.
 *
 * The console's headline affordance is "just start typing", which is
 * delightful and completely invisible to assistive tech, touch users who
 * would rather not summon a keyboard, and anyone who does not guess. This
 * button is therefore always on screen: a real 44px control that opens the
 * console WITHOUT focusing the field (browse mode), reports state with
 * aria-expanded, names the popup it reveals (aria-haspopup), and carries the
 * current route so the chrome always answers "where am I?" even when the
 * tree is collapsed — at every viewport, including the phones that clip the
 * route line out of the visual layout (see nav.css ≤30rem).
 */
export default function NavMenuButton({
  dict,
  current,
  open,
  controls,
  buttonRef,
  onToggle,
}: {
  dict: Dictionary;
  /** Localized label of the active route. */
  current: string;
  open: boolean;
  /** id of the panel this button discloses. */
  controls: string;
  /** Exposed so the container can return focus here when the console closes. */
  buttonRef: RefObject<HTMLButtonElement | null>;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      ref={buttonRef}
      className="craft-menu-btn"
      aria-haspopup="listbox"
      aria-expanded={open}
      aria-controls={controls}
      onClick={onToggle}
    >
      <span className="craft-menu-glyph" aria-hidden>
        {open ? "×" : "▸"}
      </span>
      <span className="craft-menu-text">
        <span className="craft-menu-label">{dict.console.openMenu}</span>
        <span className="craft-menu-current">{current}</span>
      </span>
    </button>
  );
}