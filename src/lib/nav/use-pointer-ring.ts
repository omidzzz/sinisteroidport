"use client";

import { useEffect, type RefObject } from "react";
import { RING_IDLE_MS, RING_LERP } from "./constants";

/**
 * The magnetic node ring's pointer maths — one rAF loop, no React state.
 *
 * Writes three custom properties on the container so the ring can be pure
 * CSS (transform + opacity only, compositor-friendly):
 *
 *   --ring-x / --ring-y   pointer offset from the container's centre, px
 *   --ring-a              activation 0..1 (0 = pointer resting/idle)
 *
 * Why a ref-driven loop instead of state: a pointermove fires up to 1000×/s
 * on a trackpad; putting that through setState would re-render the whole
 * console tree on every event. The loop self-sleeps when the pointer has
 * been still for RING_IDLE_MS and the ring has caught up, so an idle page
 * costs zero frames.
 *
 * Conservative by construction: fine pointers only (no touch hijacking) and
 * disabled entirely under prefers-reduced-motion. `enabled` additionally
 * lets the caller keep it off while the console is collapsed.
 */
export function usePointerRing<T extends HTMLElement>(
  ref: RefObject<T | null>,
  enabled: boolean
): void {
  useEffect(() => {
    const host = ref.current;
    if (!host || !enabled) return;

    const fine = window.matchMedia("(pointer: fine)").matches;
    const still = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!fine || still) return;

    let raf = 0;
    let targetX = 0;
    let targetY = 0;
    let currentX = 0;
    let currentY = 0;
    let litUntil = 0;
    let lit = 0;

    const step = (now: number) => {
      raf = 0;
      currentX += (targetX - currentX) * RING_LERP;
      currentY += (targetY - currentY) * RING_LERP;

      host.style.setProperty("--ring-x", `${currentX.toFixed(1)}px`);
      host.style.setProperty("--ring-y", `${currentY.toFixed(1)}px`);

      const want = now < litUntil ? 1 : 0;
      if (want !== lit) {
        lit = want;
        host.style.setProperty("--ring-a", String(lit));
      }

      const settled =
        Math.abs(targetX - currentX) < 0.5 && Math.abs(targetY - currentY) < 0.5;
      if (!settled || now < litUntil) raf = requestAnimationFrame(step);
    };

    const onPointerMove = (event: PointerEvent) => {
      const rect = host.getBoundingClientRect();
      targetX = event.clientX - rect.left - rect.width / 2;
      targetY = event.clientY - rect.top - rect.height / 2;
      litUntil = performance.now() + RING_IDLE_MS;
      if (!raf) raf = requestAnimationFrame(step);
    };

    window.addEventListener("pointermove", onPointerMove, { passive: true });
    return () => {
      window.removeEventListener("pointermove", onPointerMove);
      if (raf) cancelAnimationFrame(raf);
      host.style.removeProperty("--ring-x");
      host.style.removeProperty("--ring-y");
      host.style.removeProperty("--ring-a");
    };
  }, [ref, enabled]);
}