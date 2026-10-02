"use client";

import { useEffect, useRef, type ReactNode } from "react";

/* Cached once per bundle — matchMedia allocates and queries style on every
   call, so running it inside mousemove was a per-event style recalc. */
const FINE_POINTER =
  typeof window !== "undefined" &&
  window.matchMedia("(pointer: fine)").matches;

/* The lean is motion: reduced-motion visitors get the button, not the
   pull. Evaluated once at module load — nobody flips this mid-session
   without a reload anyway. */
const MOTION_OK =
  typeof window === "undefined" ||
  !window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/**
 * Magnetic wrapper — the child gravitates toward the pointer while it is
 * nearby, then springs back. Pure transform; disabled on touch devices
 * and for reduced-motion visitors (the child stays perfectly still).
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

  /* The pull is driven from the span's own centre, which needs a layout read.
     Calling getBoundingClientRect() per mousemove forced a synchronous reflow
     on every pointer event over the button. The rect only moves when the page
     scrolls or the viewport resizes, so it is cached here and invalidated by
     those two events instead — a pointer sweep now costs zero layout reads. */
  const rectRef = useRef<DOMRect | null>(null);
  const centre = () => {
    if (!rectRef.current) {
      const el = ref.current;
      if (!el) return null;
      rectRef.current = el.getBoundingClientRect();
    }
    return rectRef.current;
  };
  const invalidate = () => {
    rectRef.current = null;
  };

  const onMove = (e: React.MouseEvent) => {
    if (!FINE_POINTER || !MOTION_OK) return;
    const r = centre();
    const node = ref.current;
    if (!r || !node) return;
    node.style.transition = "transform 0.1s linear";
    const dx = e.clientX - (r.left + r.width / 2);
    const dy = e.clientY - (r.top + r.height / 2);
    const x = Math.max(-maxShift, Math.min(maxShift, dx * strength));
    const y = Math.max(-maxShift, Math.min(maxShift, dy * strength));
    node.style.transform = `translate(${x}px, ${y}px)`;
  };

  const onLeave = () => {
    const el = ref.current;
    if (!el) return;
    el.style.transition = "transform 0.5s cubic-bezier(0.22, 1, 0.36, 1)";
    el.style.transform = "translate(0px, 0px)";
  };

  /* Only mounted listeners on devices that can actually run the effect. */
  useEffect(() => {
    if (!FINE_POINTER || !MOTION_OK) return;
    window.addEventListener("scroll", invalidate, { passive: true });
    window.addEventListener("resize", invalidate);
    return () => {
      window.removeEventListener("scroll", invalidate);
      window.removeEventListener("resize", invalidate);
    };
  }, []);

  return (
    /* No will-change here. The pull only runs on (pointer: fine) with motion
       enabled, but this span is in the static markup on EVERY device — so a
       permanent class would promote a compositor layer for the touch and
       reduced-motion visitors who never move it. */
    <span ref={ref} onMouseMove={onMove} onMouseLeave={onLeave} className="inline-block">
      {children}
    </span>
  );
}
