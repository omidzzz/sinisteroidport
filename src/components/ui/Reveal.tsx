"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

/**
 * Lightweight scroll-reveal wrapper using a single IntersectionObserver.
 * Animation itself is CSS (.reveal / .is-visible in globals.css).
 */
export default function Reveal({
  children,
  delay = 0,
  className = "",
  variant,
}: {
  children: ReactNode;
  /** stagger delay in ms */
  delay?: number;
  className?: string;
  /** entrance flavour — up (default), left, right, scale */
  variant?: "up" | "left" | "right" | "scale";
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    /* No IntersectionObserver (very old engines) — show immediately.
       The opacity-zero trap must never outlive its own trigger; see the
       @media (scripting: none) net in fx-modern.css for the no-JS case.
       Deferred a microtask so the effect body stays setState-free. */
    if (typeof IntersectionObserver === "undefined") {
      queueMicrotask(() => setVisible(true));
      return;
    }
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.12, rootMargin: "0px 0px -40px 0px" }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className={`reveal ${visible ? "is-visible" : ""} ${className}`}
      style={delay ? { transitionDelay: `${delay}ms` } : undefined}
      {...(variant ? { "data-rv": variant } : {})}
    >
      {children}
    </div>
  );
}
