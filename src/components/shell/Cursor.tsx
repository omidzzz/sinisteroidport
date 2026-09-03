"use client";

import { useEffect, useRef } from "react";

/**
 * Custom cursor: an instant neon dot + a lerped glass ring that ignites over
 * interactive elements. Mounts only on fine-pointer devices without
 * reduced-motion (which keeps the native cursor). Adds a click-squish and
 * hides both while the pointer leaves the window.
 */
export default function Cursor() {
  const dotRef = useRef<HTMLDivElement>(null);
  const ringRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!window.matchMedia("(pointer: fine)").matches) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const dot = dotRef.current;
    const ring = ringRef.current;
    if (!dot || !ring) return;

    let mx = window.innerWidth / 2;
    let my = window.innerHeight / 2;
    let rx = mx;
    let ry = my;
    let scale = 1;
    let targetScale = 1;
    let shown = false;
    let raf = 0;
    let running = false;

    const set = (interactive: boolean) => {
      targetScale = interactive ? 1.55 : 1;
      ring.classList.toggle("cursor-hot", !!interactive);
};

    const onMove = (e: MouseEvent) => {
      mx = e.clientX;
      my = e.clientY;
      const t = e.target as HTMLElement | null;
      set(!!t?.closest("a, button, [data-cursor]"));
      if (!shown) {
        shown = true;
        dot.style.opacity = "1";
        ring.style.opacity = "1";
      }
      wake();
    };

    const onDown = () => ring.classList.add("cursor-click");
    const onUp = () => ring.classList.remove("cursor-click");
    const onLeave = () => {
      shown = false;
      dot.style.opacity = "0";
      ring.style.opacity = "0";
    };

    const write = () => {
      dot.style.transform = `translate3d(${mx}px, ${my}px, 0) translate(-50%, -50%)`;
      ring.style.transform = `translate3d(${rx}px, ${ry}px, 0) translate(-50%, -50%) scale(${scale})`;
    };

    /* Sleep when settled — once the lerp converges we snap to the target and
       stop the rAF loop entirely; a pointer event wakes it again. Keeps an
       idle page at zero rAF work instead of a per-frame no-op loop. */
    const tick = () => {
      const dx = mx - rx;
      const dy = my - ry;
      const ds = targetScale - scale;
      if (Math.abs(dx) < 0.1 && Math.abs(dy) < 0.1 && Math.abs(ds) < 0.001) {
        rx = mx;
        ry = my;
        scale = targetScale;
        write();
        running = false;
        return;
      }
      rx += dx * 0.16;
      ry += dy * 0.16;
      scale += ds * 0.18;
      write();
      raf = requestAnimationFrame(tick);
    };

    const wake = () => {
      if (!running) {
        running = true;
        raf = requestAnimationFrame(tick);
      }
    };

    window.addEventListener("mousemove", onMove, { passive: true });
    window.addEventListener("mousedown", onDown);
    window.addEventListener("mouseup", onUp);
    document.documentElement.addEventListener("mouseleave", onLeave);
    wake();
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mousedown", onDown);
      window.removeEventListener("mouseup", onUp);
      document.documentElement.removeEventListener("mouseleave", onLeave);
      cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <>
      <div ref={dotRef} aria-hidden className="cursor-dot" style={{ opacity: 0 }} />
      <div ref={ringRef} aria-hidden className="cursor-ring" style={{ opacity: 0 }} />
    </>
  );
}