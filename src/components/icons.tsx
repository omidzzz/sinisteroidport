/**
 * Custom monoline icons, drawn to match the site's hairline/editorial
 * stroke language (1.5px, round caps, currentColor). No icon fonts and no
 * glyph characters are used anywhere in the UI.
 *
 * Directional icons default to LTR; apply `rtl:-scale-x-100` (or
 * `rotate-180 rtl:rotate-0`) at the call site so they mirror in Persian.
 */

export function ArrowIcon({ className }: { className?: string }) {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      className={className}
    >
      <path d="M4 12h15m0 0-6-6m6 6-6 6" />
    </svg>
  );
}

/** Six-ray spark used as the ticker separator */
export function SparkIcon({ className }: { className?: string }) {
  return (
    <svg
      width="10"
      height="10"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      aria-hidden
      className={className}
    >
      <path d="M12 2v20M3.34 7l17.32 10M20.66 7 3.34 17" />
    </svg>
  );
}
