"use client";

import { useEffect, useRef, useState } from "react";

const GLYPHS = "!<>-_\\/[]{}=+*^?#________";

/**
 * Text scramble/decode effect — characters cycle through random glyphs
 * and resolve left-to-right once the element scrolls into view.
 * Skipped for reduced-motion users (renders plain text).
 */
export default function ScrambleText({
  text,
  className = "",
  duration = 900,
}: {
  text: string;
  className?: string;
  duration?: number;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const [output, setOutput] = useState(text);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    // Cursive scripts (Persian/Arabic) must not be scrambled — joining breaks
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches ||
        /[\u0600-\u06FF]/.test(text)) {
      setOutput(text);
      return;
    }
    setOutput("");

    let raf = 0;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        observer.disconnect();
        const start = performance.now();
        const tick = (now: number) => {
          const t = Math.min(1, (now - start) / duration);
          let out = "";
          for (let i = 0; i < text.length; i++) {
            // each character resolves at a staggered threshold
            const resolveAt = (i / Math.max(1, text.length)) * 0.75 + 0.1;
            if (t >= resolveAt || text[i] === " ") {
              out += text[i];
            } else {
              out += GLYPHS[Math.floor(Math.random() * GLYPHS.length)];
            }
          }
          setOutput(out);
          if (t < 1) {
            raf = requestAnimationFrame(tick);
          } else {
            setOutput(text);
          }
        };
        raf = requestAnimationFrame(tick);
      },
      { threshold: 0.4 }
    );
    observer.observe(el);
    return () => {
      observer.disconnect();
      cancelAnimationFrame(raf);
    };
  }, [text, duration]);

  return (
    <span ref={ref} className={className} aria-label={text}>
      {output}
    </span>
  );
}
