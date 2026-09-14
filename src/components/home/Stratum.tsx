import type { ReactNode } from "react";

export type Mineral = "copper" | "probe" | "phosphor";

/**
 * STRATUM — full-bleed specimen drawer with a ruled catalog frame edge
 * and a drawer tint. The `data-mineral` attribute re-maps the hot
 * --color-acid/--color-accent tokens for the whole subtree: the same
 * components visibly re-tint per tray as the reader moves through the
 * cabinet. `data-wiring` prints the copper PCB substrate under the
 * tray, with a scroll-scrubbed current on the bus line.
 * Server-safe; zero hooks. The seam tags live inside their act.
 */
export default function Stratum({
  mineral,
  children,
}: {
  mineral: Mineral;
  children: ReactNode;
}) {
  return (
    <div className="stratum" data-mineral={mineral} data-wiring="on">
      <span className="stratum-bus" aria-hidden="true" />
      {children}
    </div>
  );
}