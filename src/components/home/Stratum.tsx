import type { ReactNode } from "react";

export type Mineral = "amber" | "rose" | "violet";

/**
 * REAM — full-bleed printed sheet with a perforation tear edge,
 * crop marks, a halftone field and a scroll-scrubbed printhead
 * pass. The `data-mineral` attribute re-maps the hot
 * --color-acid/--color-accent tokens for the whole subtree: the
 * same components visibly re-ink per sheet as the reader pages
 * through. Server-safe; zero hooks. The printhead/halftone
 * elements are decorative only (aria-hidden), so they also drop
 * out cleanly under reduced-motion and print.
 */
export default function Stratum({
  mineral,
  children,
}: {
  mineral: Mineral;
  children: ReactNode;
}) {
  return (
    <div className="stratum" data-mineral={mineral}>
      <span data-halftone aria-hidden="true" />
      <span data-printhead aria-hidden="true" />
      {children}
    </div>
  );
}