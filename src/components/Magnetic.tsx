"use client";

import { useRef, type ReactNode } from "react";

/* Cached once per bundle — matchMedia allocates and queries style on every
   call, so running it inside mousemove was a per-event style recalc. */
const FINE_POINTER =
  typeof window !== "undefined" &&
  window.matchMedia("(pointer: fine)").matches;

/**
 * Magnetic wrapper — the child gravitates toward the pointer while it is
 * nearby, then springs back. Pure transform; disabled on touch devices.
 */
export default function Magnetic({
  children,
  strength = 0.35,
  maxShift = 14,
}: {
  children: ReactNode;
  strength?: number;
  maxShift?: number;
}) {
  const ref = useRef<HTMLSpanElement>(null);

  const onMove = (e: React.MouseEvent) => {
    if (!FINE_POINTER) return;
    const el = ref.current;
    if (!el) return;
    el.style.transition = "transform 0.1s linear";
    const r = el.getBoundingClientRect();
    const dx = e.clientX - (r.left + r.width / 2);
    const dy = e.clientY - (r.top + r.height / 2);
    const x = Math.max(-maxShift, Math.min(maxShift, dx * strength));
    const y = Math.max(-maxShift, Math.min(maxShift, dy * strength));
    el.style.transform = `translate(${x}px, ${y}px)`;
  };

  const onLeave = () => {
    const el = ref.current;
    if (!el) return;
    el.style.transition = "transform 0.5s cubic-bezier(0.22, 1, 0.36, 1)";
    el.style.transform = "translate(0px, 0px)";
  };

  return (
    <span
      ref={ref}
      onMouseMove={onMove}
      onMouseLeave={onLeave}
      className="inline-block will-change-transform"
    >
      {children}
    </span>
  );
}
