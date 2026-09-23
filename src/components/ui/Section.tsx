"use client";

import type { ReactNode } from "react";

/** Sticky vertical section-label rail (icon + rotated caption). */
export function Rail({ label, icon }: { label: string; icon?: ReactNode }) {
  return (
    <div className="sec-label">
      <span className="sec-ico" aria-hidden>{icon}</span>
      <span className="vert">{label}</span>
    </div>
  );
}