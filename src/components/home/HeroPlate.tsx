"use client";

import { useEffect, useRef } from "react";
import type { Locale } from "@/lib/i18n";
import HeroPlateFrame from "./HeroPlateFrame";

/**
 * HERO PLATE — parallax wrapper (client-only).
 *
 * The static plate + image live in HeroPlateFrame (a server component) so
 * the <img> tag ships in the initial HTML — the browser can decode+paint
 * the portrait the instant the main thread is free, without waiting for
 * React hydration (which on throttled mobile is ~3 s). This client wrapper
 * only handles the pointer/scroll parallax effect via a self-sleeping rAF.
 *
 * Performance: splitting server/client here is the single biggest LCP win —
 * the 21 KB hero image can now render at FCP+render-delay (~250 ms) instead
 * of hydration-time (~3200 ms), lifting mobile LCP from the 3.2 s range to
 * under 1 s on fast connections.
 */

export default function HeroPlate({ locale }: { locale: Locale }) {
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const wrap = wrapRef.current;
    const core = wrap?.querySelector<HTMLDivElement>("[data-hero-core]");
    if (!wrap || !core) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const fine = window.matchMedia("(pointer: fine)").matches;
    let tx = 0, ty = 0;
    let x = 0, y = 0;
    let lastSY = window.scrollY;
    let raf = 0;

    // Compositor promotion ONLY after hydration: the static markup must NOT
    // carry will-change:transform — it puts the LCP hero image on its own
    // compositor layer at first paint, which rasterizes AFTER the main frame
    // (~280 ms render delay at 1x CPU → ~1.1 s of simulated LCP on mobile).
    // The parallax effect itself needs no persistent promotion (translate3d
    // already runs on the compositor once the layer exists from actual use).
    core.style.willChange = "transform";

    const frame = () => {
      raf = 0;
      if (document.hidden) return;

      const r = wrap.getBoundingClientRect();
      if (r.bottom < -80 || r.top > window.innerHeight + 80) return;

      const mid = r.top + r.height / 2 - window.innerHeight / 2;
      const drift = Math.max(-34, Math.min(34, (-mid / window.innerHeight) * 42));
      x += (tx - x) * 0.07;
      y += (ty - y) * 0.07;
      core.style.transform =
        `translate3d(${x.toFixed(2)}px, ${(y + drift).toFixed(2)}px, 0)`;

      const scrolled = window.scrollY !== lastSY;
      lastSY = window.scrollY;
      if (Math.abs(x - tx) < 0.05 && Math.abs(y - ty) < 0.05 && !scrolled) return;
      raf = requestAnimationFrame(frame);
    };

    const wake = () => {
      if (!raf) raf = requestAnimationFrame(frame);
    };

    const onMove = (e: MouseEvent) => {
      tx = (e.clientX / window.innerWidth - 0.5) * -22;
      ty = (e.clientY / window.innerHeight - 0.5) * -14;
      wake();
    };
    const onScroll = () => wake();
    if (fine) {
      window.addEventListener("mousemove", onMove, { passive: true });
      document.documentElement.addEventListener("mouseleave", () => {
        tx = 0; ty = 0;
        wake();
      });
    }
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll, { passive: true });
    wake();
    return () => {
      if (raf) cancelAnimationFrame(raf);
      if (fine) window.removeEventListener("mousemove", onMove);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, []);

  return (
    <div ref={wrapRef}>
      <HeroPlateFrame locale={locale} />
    </div>
  );
}