"use client";

import { useEffect, useRef, type ReactNode } from "react";

/** pointer/scroll personality of a floater */
type ReactMode = "drift" | "chase" | "sway" | "flee" | "heavy";

type PropFloatProps = {
  /** homepage quarter (0–3) that summons this prop while scrolled into it */
  index: number;
  /** viewport edge the prop docks to / slides in from */
  side: "left" | "right";
  /** vertical viewport anchor (any CSS length / %) */
  top?: string;
  /** base pointer-parallax strength in px */
  depth?: number;
  /** motion personality (defaults to a soft drift) */
  react?: ReactMode;
  /** extra class for per-prop sizing */
  className?: string;
  children: ReactNode;
};

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

/* per-personality tuning: pointer lerp, scroll-lag, scroll-bank */
const TUNE: Record<ReactMode, { lerp: number; lag: number; bank: number }> = {
  drift: { lerp: 0.06, lag: 0.34, bank: 0.0 },
  chase: { lerp: 0.085, lag: 0.52, bank: 0.05 }, // light + eager, banks hard
  sway:  { lerp: 0.055, lag: 0.42, bank: 0.02 }, // elastic, gentle
  flee:  { lerp: 0.1,  lag: 0.55, bank: 0.015 }, // jumpy, darts away
  heavy: { lerp: 0.03, lag: 0.22, bank: 0.014 }, // massive lag, slow bank
};

/**
 * FLOATING PROP STAGE — mounts a console prop as a fixed viewport resident
 * that springs on/off screen with scroll (visible while its homepage quarter
 * — scroll progress 0–25 / 25–50 / 50–75 / 75–100% — is active) and performs
 * its `react` personality: pointer parallax with
 * distinct physics per prop, plus an inertial float that lags behind fast
 * scrolling and settles when it stops. One rAF loop, transform-only writes.
 * Decorative: pointer-events none + aria-hidden. The props keep their own
 * scroll-pause + reduced-motion machinery; this layer fades only (no slide,
 * no drift) under prefers-reduced-motion and skips drift on coarse pointers.
 */
export default function PropFloat({
  index,
  side,
  top = "30%",
  depth = 22,
  react = "drift",
  className,
  children,
}: PropFloatProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    const inner = el?.firstElementChild as HTMLElement | null;
    if (!el || !inner) return;

    /* viewport-space center of the stage (for the frog's proximity sense) */
    const center = { x: 0, y: 0, live: false };
    const measure = () => {
      const r = el.getBoundingClientRect();
      center.x = r.left + r.width / 2;
      center.y = r.top + r.height / 2;
      center.live = true;
    };

    /* scroll-bound visibility — one asset per quarter of the page: scroll
       progress 0–25% summons prop 0, 25–50% prop 1, 50–75% prop 2 and
       75–100% prop 3, so no two props are ever on screen together. */
    const applyZone = () => {
      const doc = document.documentElement;
      const span = Math.max(1, doc.scrollHeight - window.innerHeight);
      const q = Math.min(3, Math.floor((window.scrollY / span) * 4));
      const was = el.classList.contains("pf-on");
      el.classList.toggle("pf-on", q === index);
      if (q === index && !was) measure();
    };
    applyZone();
    window.addEventListener("scroll", applyZone, { passive: true });
    window.addEventListener("resize", applyZone, { passive: true });

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const fine = window.matchMedia("(pointer: fine)").matches;
    const tune = TUNE[react];

    let raf = 0;
    let mx = 0, my = 0;          /* pointer target, -1..1 */
    let cx = 0, cy = 0;          /* lerped pointer state */
    let sv = 0;                  /* smoothed scroll velocity (px/frame) */
    let lastY = window.scrollY;
    let shiver = 0;              /* frog: 0..1 cursor proximity panic */

    const onMove = (e: MouseEvent) => {
      mx = (e.clientX / window.innerWidth) * 2 - 1;
      my = (e.clientY / window.innerHeight) * 2 - 1;
      if (react === "flee" && center.live) {
        const d = Math.hypot(e.clientX - center.x, e.clientY - center.y);
        shiver = clamp(1 - d / 240, 0, 1);
      }
    };

    if (!reduced && fine) {
      window.addEventListener("mousemove", onMove, { passive: true });
      window.addEventListener("resize", measure, { passive: true });
      const loop = (t: number) => {
        /* scroll inertia: props trail fast scrolls, then settle */
        sv += (window.scrollY - lastY - sv) * 0.12;
        lastY = window.scrollY;
        cx += (mx - cx) * tune.lerp;
        cy += (my - cy) * tune.lerp;
        const drag = clamp(sv * tune.lag, -38, 38);
        const bank = clamp(sv * tune.bank, -6, 6);

        let tx: number, ty: number, rot: number, sc = 1;
        switch (react) {
          case "chase": /* drone — chases the cursor, banks into the scroll */
            tx = cx * depth * 1.5;
            ty = cy * depth + drag;
            rot = bank + cx * 3;
            sc = 1 + clamp(Math.abs(sv), 0, 60) * 0.0006;
            break;
          case "sway": /* plant — sways elastically against the pointer */
            tx = cx * depth * 0.55;
            ty = cy * depth * 0.4 + drag;
            rot = -cx * 9 + bank;
            break;
          case "flee": /* frog — leans away, trembles when the cursor nears */
            tx = -cx * depth * 1.15;
            ty = -cy * depth * 0.7 + drag;
            rot = -cx * 4;
            if (shiver > 0) {
              const a = shiver * shiver * 2.6;
              tx += Math.sin(t * 0.055) * a;
              ty += Math.cos(t * 0.061) * a * 0.6;
              rot += Math.sin(t * 0.048) * a * 0.9;
            }
            break;
          case "heavy": /* laptop — lags like real mass, sinks on fast scroll */
            tx = cx * depth * 0.7;
            ty = cy * depth * 0.5 + drag;
            rot = bank + cx * 1.2;
            sc = 1 - clamp(Math.abs(sv), 0, 80) * 0.0009;
            break;
          default: /* drift — soft parallax */
            tx = cx * depth;
            ty = cy * depth * 0.7 + drag;
            rot = cx * depth * 0.08;
        }
        inner.style.transform =
          `translate3d(${tx.toFixed(2)}px, ${ty.toFixed(2)}px, 0)` +
          ` rotate(${rot.toFixed(3)}deg) scale(${sc.toFixed(4)})`;
        raf = requestAnimationFrame(loop);
      };
      raf = requestAnimationFrame(loop);
    }

    return () => {
      window.removeEventListener("scroll", applyZone);
      window.removeEventListener("resize", applyZone);
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("resize", measure);
      cancelAnimationFrame(raf);
      el.classList.remove("pf-on");
      inner.style.transform = "";
    };
  }, [index, depth, react]);

  return (
    <div
      ref={ref}
      aria-hidden="true"
      data-pf-host=""
      className={`prop-float pf-${side}${className ? ` ${className}` : ""}`}
      style={{ ["--pf-top" as string]: top }}
    >
      <div className="pf-parallax">{children}</div>
    </div>
  );
}
