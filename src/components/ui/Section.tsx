import type { ReactNode } from "react";

/** Skewed divider band between home-page acts. */
export function Seam({
  flip,
  cyan,
  children,
}: {
  flip?: boolean;
  cyan?: boolean;
  children?: ReactNode;
}) {
  return (
    <div aria-hidden className={`seam ${flip ? "flip" : ""} ${cyan ? "cyan" : ""}`}>
      {children}
    </div>
  );
}

/** Sticky vertical section-label rail (icon + rotated caption). */
export function Rail({ label, icon }: { label: string; icon?: ReactNode }) {
  return (
    <div className="sec-label">
      <span className="sec-ico" aria-hidden>{icon}</span>
      <span className="vert">{label}</span>
    </div>
  );
}