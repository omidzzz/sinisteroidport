/**
 * Canonical site sections, in dock order.
 * Single source of truth for the navbar, footer and command-palette index —
 * keep this list in sync with lib/i18n.ts nav labels.
 */
export const NAV_PATHS = [
  "/",
  "/work",
  "/skills",
  "/education",
  "/showcase",
  "/blog",
] as const;