/**
 * Canonical site sections, in dock order.
 * Single source of truth for the console nav, footer, command palette index
 * and the sitemap builder — keep this list in sync with lib/i18n.ts nav
 * labels (same length, same order).
 */
export const NAV_PATHS = [
  "/",
  "/work",
  "/skills",
  "/education",
  "/showcase",
  "/lab",
  "/blog",
  "/contact",
] as const;