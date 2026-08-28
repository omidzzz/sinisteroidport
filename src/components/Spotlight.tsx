"use client";

import { useRef, type ReactNode } from "react";

/**
 * Cursor spotlight — paints a soft radial glow that tracks the pointer across
 * a bounded section. Just writes two CSS variables from a single mousemove
 * listener and reads them with the `.spot-glow` overlay in globals.css
 * (transform-only paint, no layout). Fine pointers only; reduced-motion users
 * get a static centered glow, touch users get nothing.
 */
export default function Spotlight({
  children,
  className = "",
  ...rest
}: {
  children?: ReactNode;
  className?: string;
  [key: string]: unknown;
}) {
  const ref = useRef<HTMLDivElement>(null);

  const onMove = (e: React.MouseEvent) => {
    if (!window.matchMedia("(pointer: fine)").matches) return;
    const el = ref.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    el.style.setProperty("--sx", `${e.clientX - r.left}px`);
    el.style.setProperty("--sy", `${e.clientY - r.top}px`);
  };

  return (
    <div
      ref={ref}
      onMouseMove={onMove}
      className={`spot-wrap ${className}`}
      style={{ ["--sx" as string]: "50%", ["--sy" as string]: "50%" }}
      {...rest}
    >
      <span aria-hidden className="spot-glow" />
      {children}
    </div>
  );
}