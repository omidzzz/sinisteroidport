"use client";

import { useEffect, useRef, type ReactNode } from "react";

/** Skewed divider band between home-page acts. One-shot `.is-lit` flash when
 *  it first enters the viewport — transform/opacity only, then the observer
 *  disconnects so idle pages pay zero JS. */
export function Seam({
  flip,
  cyan,
  children,
  tag,
}: {
  flip?: boolean;
  cyan?: boolean;
  children?: ReactNode;
  tag?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    if (typeof IntersectionObserver === "undefined") {
      el.classList.add("is-lit");
      return;
    }
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        el.classList.add("is-lit");
        obs.disconnect();
      },
      { threshold: 0.35 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      aria-hidden
      className={`seam ${flip ? "flip" : ""} ${cyan ? "cyan" : ""}`}
    >
      {tag ? (
        <span dir="ltr" className="seam-tag">
          {tag}
        </span>
      ) : null}
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