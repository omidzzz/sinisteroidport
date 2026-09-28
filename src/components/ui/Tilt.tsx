"use client";

import { useRef, type ReactNode } from "react";

/* Cached once per bundle — matchMedia inside mousemove costs a style
   recalc per pointer event. */
const FINE_POINTER =
  typeof window !== "undefined" &&
  window.matchMedia("(pointer: fine)").matches;

/**
 * Mouse-tilt card — rotates toward the pointer on a 3D perspective (transform
 * only, one transition on leave). Capped angles keep it tasteful. Fine pointers
 * only; inert on touch so it never fights scrolling.
 */
export default function Tilt({
  children,
  className = "",
  maxTilt = 8,
}: {
  children: ReactNode;
  className?: string;
  maxTilt?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);

  const onMove = (e: React.MouseEvent) => {
    if (!FINE_POINTER) return;
    const el = ref.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const px = (e.clientX - r.left) / r.width - 0.5;
    const py = (e.clientY - r.top) / r.height - 0.5;
    el.style.transform = `perspective(900px) rotateX(${(-py * maxTilt).toFixed(2)}deg) rotateY(${(px * maxTilt).toFixed(2)}deg) translateY(-4px)`;
  };

  const onLeave = () => {
    const el = ref.current;
    if (el) el.style.transform = "perspective(900px) rotateX(0) rotateY(0)";
  };

  return (
    /* No will-change in the class. It would promote a permanent compositor
       layer on every device, including the touch visitors for whom onMove
       returns on line 28 and the card never tilts at all. The transform is
       written imperatively in the handler, and the browser promotes for the
       duration of the interaction on its own. */
    <div
      ref={ref}
      onMouseMove={onMove}
      onMouseLeave={onLeave}
      className={className}
      style={{ transition: "transform 0.16s ease-out" }}
    >
      {children}
    </div>
  );
}