import type { ReactNode } from "react";

export type Mineral = "amber" | "rose" | "violet";

/**
 * STRATUM — full-bleed tectonic band with an interlocking fault edge
 * and a mineral shelf. The `data-mineral` attribute re-maps the hot
 * --color-acid/--color-accent tokens for the whole subtree: the same
 * components visibly re-tint per act as the reader descends.
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
    <div className="stratum" data-mineral={mineral}>
      {children}
    </div>
  );
}