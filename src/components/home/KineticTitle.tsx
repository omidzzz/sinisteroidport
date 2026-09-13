"use client";

import { useEffect, useRef } from "react";
import KineticTitleFrame from "./KineticTitleFrame";

/**
 * KINETIC TITLE — client wrapper that mounts the pointer-tracking rAF loop.
 *
 * The static letter spans are rendered by KineticTitleFrame (a server
 * component) so the title text is in the initial HTML — the browser paints
 * it on first render (letters at their resting wght 300) and search
 * engines see the plain text. This client wrapper only adds the
 * mousemove listener + rAF loop after hydration.
 *
 * The letters look identical before and after hydration (both at wght:300),
 * so there's zero visual shift. The kinetic effect is decorative — it only
 * activates on (pointer: fine) + (prefers-reduced-motion: no-preference).
 */
export default function KineticTitle({
  text,
  className = "",
}: {
  text: string;
  className?: string;
}) {
  const internalRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    const root = internalRef.current;
    if (!root) return;
    if (!window.matchMedia("(pointer: fine)").matches) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const letters = Array.from(root.querySelectorAll<HTMLElement>("[data-ch]"));
    let mx = -9999;
    let my = -9999;
    let raf = 0;
    let dirty = true;

    const loop = () => {
      raf = 0;
      if (!dirty) return;
      dirty = false;

      const rects: (DOMRect | null)[] = new Array(letters.length);
      for (let i = 0; i < letters.length; i++) {
        const r = letters[i].getBoundingClientRect();
        rects[i] =
          r.bottom < -80 || r.top > window.innerHeight + 80 ? null : r;
      }

      for (let i = 0; i < letters.length; i++) {
        const r = rects[i];
        if (!r) continue;
        const dx = mx - (r.left + r.width / 2);
        const dy = my - (r.top + r.height / 2);
        const dist = Math.hypot(dx, dy);
        const influence = Math.max(0, 1 - dist / 200);
        const weight = 300 + influence * 600;
        const el = letters[i];
        el.style.fontVariationSettings = `"wght" ${weight.toFixed(0)}`;
        el.style.transform = `translateY(${(-influence * 6).toFixed(2)}px)`;
      }
    };

    const wake = () => {
      if (raf) return;
      raf = requestAnimationFrame(loop);
    };

    const onMove = (e: MouseEvent) => {
      mx = e.clientX;
      my = e.clientY;
      dirty = true;
      wake();
    };
    const onLeave = () => {
      mx = -9999;
      my = -9999;
      dirty = true;
      wake();
    };

    window.addEventListener("mousemove", onMove, { passive: true });
    document.documentElement.addEventListener("mouseleave", onLeave);
    dirty = true;
    wake();
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("mousemove", onMove);
      document.documentElement.removeEventListener("mouseleave", onLeave);
    };
  }, [text]);

  return (
    <div ref={internalRef} style={{ display: 'contents' }}>
      <KineticTitleFrame
        text={text}
        className={className}
      />
    </div>
  );
}

