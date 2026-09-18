/**
 * Route registry — the console tree's single source of truth.
 *
 * lib/nav.ts owns the canonical ordered paths; the locale dictionary owns
 * the labels. This module joins them into the NavRoute rows the machine
 * filters, so adding a route means editing exactly those two arrays.
 */
import { NAV_PATHS } from "@/lib/nav";
import type { Dictionary } from "@/lib/i18n";
import type { NavRoute } from "./types";

/** Locale-independent ids derive from the path itself ("work", "blog"). */
export const routeId = (path: string): string =>
  path.replace(/^\//, "") || "home";

/** Join the canonical paths with the localized labels, in dock order. */
export function buildRoutes(dict: Dictionary): readonly NavRoute[] {
  return NAV_PATHS.map((path, i) => ({
    id: routeId(path),
    path,
    index: dict.nav[i]?.index ?? String(i + 1).padStart(2, "0"),
    label: dict.nav[i]?.label ?? routeId(path),
  }));
}
