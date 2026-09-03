"use client";

import { useEffect, useRef } from "react";

/**
 * Kinetic typography — each letter's variable-font weight bends toward the
 * pointer based on distance. Uses Space Grotesk's `wght` axis via
 * font-variation-settings; runs a single rAF loop while mounted.
 * Inert on touch devices and for reduced-motion users.
 */
export default function KineticTitle({
  text,
  className = "",
}: {
  text: string;
  className?: string;
}) {
  const rootRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    if (!window.matchMedia("(pointer: fine)").matches) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const letters = Array.from(root.querySelectorAll<HTMLElement>("[data-ch]"));
    let mx = -9999;
    let my = -9999;
    let raf = 0;
    // Only run a pass when the pointer actually moved — the effect is a pure
    // function of pointer position, so a resting cursor needs zero per-frame
    // layout reads (each frame previously cost letters.length forced reflows).
    let dirty = true;

    const loop = () => {
      raf = requestAnimationFrame(loop);
      if (!dirty) return;
      dirty = false;

      // READ phase: collect every rect before touching styles. Interleaving
      // getBoundingClientRect() with style writes forces a synchronous
      // reflow per letter (layout thrashing — the "Forced reflow" audit).
      const rects: (DOMRect | null)[] = new Array(letters.length);
      for (let i = 0; i < letters.length; i++) {
        const r = letters[i].getBoundingClientRect();
        rects[i] =
          r.bottom < -80 || r.top > window.innerHeight + 80 ? null : r;
      }

      // WRITE phase: batch all style mutations after the reads.
      for (let i = 0; i < letters.length; i++) {
        const r = rects[i];
        if (!r) continue;
        const dx = mx - (r.left + r.width / 2);
        const dy = my - (r.top + r.height / 2);
        const dist = Math.hypot(dx, dy);
        const influence = Math.max(0, 1 - dist / 200);
        const weight = 300 + influence * 600; // 300 → 900
        const el = letters[i];
        el.style.fontVariationSettings = `"wght" ${weight.toFixed(0)}`;
        el.style.transform = `translateY(${(-influence * 6).toFixed(2)}px)`;
      }
    };

    const onMove = (e: MouseEvent) => {
      mx = e.clientX;
      my = e.clientY;
      dirty = true;
    };
    const onLeave = () => {
      mx = -9999;
      my = -9999;
      dirty = true;
    };

    window.addEventListener("mousemove", onMove, { passive: true });
    document.documentElement.addEventListener("mouseleave", onLeave);
    raf = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("mousemove", onMove);
      document.documentElement.removeEventListener("mouseleave", onLeave);
    };
  }, [text]);

  // Preserve word wrapping: split into words, then letters.
  // Arabic/Persian script is cursive — splitting into letters breaks letter
  // joining, so RTL titles get WORD-level kinetics instead: each word bends
  // as a unit (joining stays intact inside the word).
  const isArabicScript = /[\u0600-\u06FF]/.test(text);
  let key = 0;
  if (isArabicScript) {
    const words = text.split(" ").filter(Boolean);
    return (
      <h1 ref={rootRef} className={className} aria-label={text}>
        {words.map((word, wi) => (
          <span key={wi}>
            <span
              data-ch
              className="inline-block whitespace-nowrap will-change-[font-variation-settings]"
              style={{ fontVariationSettings: '"wght" 300' }}
            >
              {word}
            </span>
            {wi < words.length - 1 ? " " : null}
          </span>
        ))}
      </h1>
    );
  }
  return (
    <h1 ref={rootRef} className={className} aria-label={text}>
      {text.split(" ").map((word, wi) => (
        <span key={wi} className="inline-block whitespace-nowrap">
          {word.split("").map((ch) => (
            <span
              key={key++}
              data-ch
              className="inline-block will-change-[font-variation-settings]"
              style={{ fontVariationSettings: '"wght" 300' }}
            >
              {ch}
            </span>
          ))}
          {/* real space between words */}
          <span className="inline-block">&nbsp;</span>
        </span>
      ))}
    </h1>
  );
}
