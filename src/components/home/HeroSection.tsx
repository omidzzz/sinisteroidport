"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import Reveal from "@/components/ui/Reveal";
import Magnetic from "@/components/ui/Magnetic";
import KineticTitle from "./KineticTitle";
import HeroPlate from "./HeroPlate";
import { Act } from "./Quire";
import { ArrowIcon, SparkIcon } from "@/components/ui/icons";
import { getDict, loc, type Locale } from "@/lib/i18n";

/**
 * HOME ACT I — TRANSMISSION HERO + hazard ticker.
 * Kinetic name × portrait plate, role chips, manifesto CTAs, then the
 * scrolling services ticker (outside the hero so nothing clips it).
 *
 * Scroll-velocity ticker: a self-sleeping rAF reads scroll speed and writes
 * --tick-v on the band — the CSS divides the 34s base duration by it, so the
 * band sprints on flings and eases back. Fine pointers + no-preference only.
 */
export default function HeroSection({ locale }: { locale: Locale }) {
  const t = getDict(locale);
  const bandRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const band = bandRef.current;
    if (!band) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    if (!window.matchMedia("(pointer: fine)").matches) return;
    let raf = 0;
    let lastY = window.scrollY;
    let v = 1;
    let lastT = performance.now();
    const tick = (now: number) => {
      raf = 0;
      if (document.hidden) return;
      const y = window.scrollY;
      const dt = Math.max(now - lastT, 16);
      lastT = now;
      const speed = Math.abs(y - lastY) / dt;
      lastY = y;
      const target = Math.min(1 + speed * 2.4, 2.2);
      v += (target - v) * 0.12;
      if (v < 1.02) v = 1;
      band.style.setProperty("--tick-v", v.toFixed(2));
      if (v > 1.02 || target > 1.02) raf = requestAnimationFrame(tick);
    };
    const wake = () => {
      lastT = performance.now();
      if (!raf) raf = requestAnimationFrame(tick);
    };
    window.addEventListener("scroll", wake, { passive: true });
    return () => {
      window.removeEventListener("scroll", wake);
      if (raf) cancelAnimationFrame(raf);
      band.style.removeProperty("--tick-v");
    };
  }, []);

  return (
    <>
      <section className="tx-hero !pb-0">
        <span className="scanlines" aria-hidden />
        <div className="tx-collapse relative z-10 mx-auto grid max-w-[84rem] items-center gap-12 px-6 pt-10 sm:px-10 lg:grid-cols-[minmax(0,1fr)_minmax(15rem,21rem)]">
          <div>
            <Reveal>
              <p className="mb-5 flex items-center gap-3">
                <span className="live-dot" aria-hidden />
                <span className="label">{t.heroKicker}</span>
              </p>
            </Reveal>
            <div className="tx-name">
              <KineticTitle
                text={t.heroName}
                /* font-light (300) matches the letters' inline
                   font-variation-settings — the swap fallback then renders the
                   same weight as the real Orbitron instead of snapping 900→300. */
                className="font-display anaglyph-strong select-none text-[clamp(3.4rem,12.5vw,10.5rem)] font-light uppercase leading-[0.84] tracking-tight text-ink"
              />
              <span
                dir="ltr"
                className="tx-line-2 glitchy font-display mt-2 block select-none text-[clamp(1.25rem,4vw,2.9rem)] font-extrabold uppercase leading-none tracking-[0.08em]"
              >
                SINISTEROID
              </span>
            </div>
            <Reveal delay={120} variant="right">
              <p className="tx-roles mt-6 flex flex-wrap items-center gap-x-3 gap-y-2 text-[0.72rem]">
                {t.services.map((s, i) => (
                  <span key={s.title} className="flex items-center gap-3">
                    {i > 0 && <SparkIcon className="text-acid opacity-80" />}
                    {s.title}
                  </span>
                ))}
                <span className="tx-cursor">▌</span>
              </p>
            </Reveal>
            <Reveal delay={180}>
              <p className="mt-5 max-w-xl text-sm leading-relaxed text-muted">
                {t.heroDesc.split(".")[0]}.
              </p>
            </Reveal>
            <Reveal delay={240}>
              <div className="mt-9 flex flex-wrap items-center gap-5">
                <Magnetic>
                  <Link href={loc(locale, "/showcase")} prefetch={false} className="btn-neon beam group">
                    {t.ctaWork}
                    <ArrowIcon className="transition-transform duration-300 group-hover:translate-x-1 rtl:-scale-x-100 rtl:group-hover:-translate-x-1" />
                  </Link>
                </Magnetic>
                <Magnetic strength={0.1} maxShift={6}>
                  <Link href={loc(locale, "/blog")} prefetch={false} className="btn-ghost group">
                    {t.ctaWriting}
                    <ArrowIcon className="transition-transform duration-300 group-hover:translate-x-1 rtl:-scale-x-100 rtl:group-hover:-translate-x-1" />
                  </Link>
                </Magnetic>
              </div>
            </Reveal>
            {/* Studio meta strip — availability + locale. Static paint,
                tabular numerals, ASCII/LTR pinned like the logotype so it reads
                identically inside the Persian layout. */}
            <Reveal delay={300}>
              <p className="tx-meta mt-8 flex flex-wrap items-center gap-x-4 gap-y-2">
                <span className="inline-flex items-center gap-2">
                  <span className="live-dot" aria-hidden />
                  <span dir="ltr">OPEN FOR WORK — 2026</span>
                </span>
                <span aria-hidden className="tx-meta-sep" />
                <span dir="ltr"></span>
                <span aria-hidden className="tx-meta-sep" />
                <span dir="ltr">{locale === "fa" ? "FA / EN" : "EN / FA"}</span>
              </p>
            </Reveal>
          </div>
          {/* No justify-self: let the grid item STRETCH to fill its definite
              track (minmax(15rem,21rem)). justify-self-center/end would
              shrink-to-fit the item, making the plate's percentage widths
              resolve against a content-dependent parent — the plate box then
              collapses to a ~3px speck until the portrait's intrinsic size
              lands, re-centering the items-center grid (a ~0.09-0.26 shift).
              The plate wrapper's mx-auto centers it within the stretched item. */}
          <div className="w-full">
            <HeroPlate locale={locale} />
          </div>
        </div>
      </section>

      {/* hazard ticker lives OUTSIDE the hero so nothing clips it */}
      <div aria-hidden className="tx-ticker-bleed relative z-30 -mt-8 select-none pb-6">
        <div className="hazard-band" ref={bandRef}>
          <div className="hazard-tape absolute inset-x-0 -top-[9px] h-[9px]" />
          <div className="ticker ticker-band">
            <div className="ticker-track">
              {Array.from({ length: 2 }, (_, copy) => (
                <div key={copy} className="flex">
                  {t.services.map((s) => (
                    <span
                      key={`${copy}-${s.title}`}
                      className={`flex items-center gap-6 whitespace-nowrap px-6 py-3.5 text-sm font-bold ${
                        locale === "fa" ? "" : "font-display uppercase tracking-[0.18em]"
                      }`}
                      style={
                        locale === "fa"
                          ? {
                              fontFamily:
                                "var(--font-vazirmatn), var(--font-kufi), Tahoma, sans-serif",
                              letterSpacing: "0",
                              textTransform: "none",
                            }
                          : undefined
                      }
                    >
                      <SparkIcon className="shrink-0 opacity-70" />
                      {s.title}
                    </span>
                  ))}
                </div>
              ))}
            </div>
          </div>
          <div className="hazard-tape absolute inset-x-0 -bottom-[9px] h-[9px]" />
        </div>
      </div>
      <Act num="01" title={locale === "fa" ? "صفحه‌ی آغاز" : "Frontispiece"} />
    </>
  );
}

