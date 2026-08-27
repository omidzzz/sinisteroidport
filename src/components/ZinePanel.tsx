"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

/**
 * ZinePanel — a brutalist "paper inversion" section.
 *
 * Slides in and flips between the site's ink surface and a contrasting
 * paper/charcoal register (see .zine-panel in globals.css). Because the
 * panel rescopes the stock --color-* tokens, normal Tailwind utilities
 * (text-muted, text-accent, border-line, hover:bg-panel/40 …) adapt to
 * the inverted palette automatically.
 *
 * Optional: pass a kicker + index rendered as the editorial rule header.
 */
export default function ZinePanel({
  children,
  className = "",
  kicker,
  index,
}: {
  children: ReactNode;
  className?: string;
  kicker?: string;
  index?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true);
          observer.disconnect();
        }
      },
      { threshold: 0.12, rootMargin: "0px 0px -40px 0px" }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <section
      ref={ref}
      className={`zine-panel ${inView ? "is-in" : ""} ${className}`}
    >
      <span aria-hidden className="zine-top" />
      {(kicker || index) && (
        <div className="mb-10 flex items-baseline justify-between border-b border-line pb-3">
          {kicker && <h1 className="label">{kicker}</h1>}
          {index && <span className="label text-accent">{index}</span>}
        </div>
      )}
      {children}
    </section>
  );
}