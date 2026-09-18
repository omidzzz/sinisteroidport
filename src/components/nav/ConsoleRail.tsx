"use client";

import VTLink from "@/components/shell/ViewTransition";
import { loc, type Locale } from "@/lib/i18n";
import type { NavRoute } from "@/lib/nav/types";

/**
 * The status rail — the always-visible way in.
 *
 * The console's headline affordance is "just start typing", which is exactly
 * right for a terminal and completely invisible to anyone who does not
 * guess. The rail answers that: a tmux-style status line above the prompt
 * carrying every route as a REAL link.
 *
 * Why real anchors matter here and not in the tree: the rail is permanent,
 * so these eight links are what assistive tech, middle-click, "open in new
 * tab" and search crawlers all see — navigation exists in the DOM even when
 * the console has never been opened. The tree remains the keyboard/search
 * surface; the rail is the discovery surface.
 */
export default function ConsoleRail({
  routes,
  locale,
  railLabel,
  activePath,
}: {
  routes: readonly NavRoute[];
  locale: Locale;
  railLabel: string;
  /** Locale-stripped pathname ("", "/work", …). */
  activePath: string;
}) {
  return (
    <nav className="craft-rail" aria-label={railLabel}>
      <ul className="craft-rail-list">
        {routes.map((route) => {
          const active =
            route.path === "/"
              ? activePath === "/" || activePath === ""
              : activePath.startsWith(route.path);
          return (
            <li key={route.id} className="craft-rail-item">
              <VTLink
                href={loc(locale, route.path)}
                className="craft-rail-link"
                data-active={active || undefined}
                aria-current={active ? "page" : undefined}
              >
                <span className="craft-rail-idx" dir="ltr" aria-hidden>
                  {route.index}
                </span>
                <span className="craft-rail-label">{route.label}</span>
              </VTLink>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}