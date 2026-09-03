"use client";

import Image from "next/image";
import { useEffect, useRef } from "react";
import type { Locale } from "@/lib/i18n";

/**
 * HERO PLATE — the signal portrait.
 *
 * /hero-image.webp wrapped in ghost RGB frames + a slowly orbiting dashed
 * ring + a corner sig-badge. Two parallax layers driven by ONE rAF:
 *   • pointer: the plate leans away from the cursor (~16px field)
 *   • scroll:  a gentle counter-drift as the plate crosses the viewport
 * Compositor-only transforms; fully inert for touch and reduced motion.
 */
export default function HeroPlate({ locale }: { locale: Locale }) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const coreRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const wrap = wrapRef.current;
    const core = coreRef.current;
    if (!wrap || !core) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const fine = window.matchMedia("(pointer: fine)").matches;
    let tx = 0, ty = 0;      // pointer targets
    let x = 0, y = 0;        // lerped pointer
    let raf = 0;

    const frame = () => {
      raf = requestAnimationFrame(frame);
      if (document.hidden) return;
      x += (tx - x) * 0.07;
      y += (ty - y) * 0.07;

      const r = wrap.getBoundingClientRect();
      if (r.bottom < -80 || r.top > window.innerHeight + 80) return; // offscreen

      const mid = r.top + r.height / 2 - window.innerHeight / 2;
      const drift = Math.max(-34, Math.min(34, (-mid / window.innerHeight) * 42));
      core.style.transform =
        `translate3d(${x.toFixed(2)}px, ${(y + drift).toFixed(2)}px, 0)`;
    };

    const onMove = (e: MouseEvent) => {
      tx = (e.clientX / window.innerWidth - 0.5) * -22;
      ty = (e.clientY / window.innerHeight - 0.5) * -14;
    };
    if (fine) {
      window.addEventListener("mousemove", onMove, { passive: true });
      document.documentElement.addEventListener("mouseleave", () => {
        tx = 0; ty = 0;
      });
    }
    raf = requestAnimationFrame(frame);
    return () => {
      cancelAnimationFrame(raf);
      if (fine) window.removeEventListener("mousemove", onMove);
    };
  }, []);

  return (
    <div ref={wrapRef} className="hero-plate relative mx-auto w-full max-w-[17rem] sm:max-w-[19rem] lg:max-w-none">
      <span className="plate-orbit" aria-hidden />
      <div ref={coreRef} style={{ willChange: "transform" }}>
        <div className="hero-plate-frame relative aspect-[4/5] overflow-hidden">
          <Image
            src="/hero-image.webp"
            alt={locale === "fa" ? "امید — توسعه‌دهنده فرانت‌اند" : "Omid — frontend developer"}
            width={720}
            height={900}
            priority
            fetchPriority="high"
            sizes="(max-width: 1024px) 80vw, 22rem"
            className="hero-plate-img h-full w-full object-cover"
          />
          <span className="hero-plate-scan" aria-hidden />
        </div>
      </div>
      <span className="sig-badge">{locale === "fa" ? "سیگنال · ۰۱" : "SIG · 01"}</span>
    </div>
  );
}