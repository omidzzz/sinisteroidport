import Link from "next/link";
import Reveal from "@/components/ui/Reveal";
import Magnetic from "@/components/ui/Magnetic";
import KineticTitle from "./KineticTitle";
import HeroPlate from "./HeroPlate";
import { Seam } from "@/components/ui/Section";
import { ArrowIcon, SparkIcon } from "@/components/ui/icons";
import { getDict, loc, type Locale } from "@/lib/i18n";

/**
 * HOME ACT I — TRANSMISSION HERO + hazard ticker.
 * Kinetic name × portrait plate, role chips, manifesto CTAs, then the
 * scrolling services ticker (outside the hero so nothing clips it).
 */
export default function HeroSection({ locale }: { locale: Locale }) {
  const t = getDict(locale);

  return (
    <>
      <section className="tx-hero !pb-0">
        <span className="scanlines" aria-hidden />
        <div className="relative z-10 mx-auto grid max-w-[84rem] items-center gap-12 px-6 pt-10 sm:px-10 lg:grid-cols-[minmax(0,1fr)_minmax(15rem,21rem)]">
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
                className="font-display anaglyph-strong select-none text-[clamp(3.4rem,12.5vw,10.5rem)] font-black uppercase leading-[0.84] tracking-tight text-ink"
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
                  <Link href={loc(locale, "/showcase")} className="btn-neon group">
                    {t.ctaWork}
                    <ArrowIcon className="transition-transform duration-300 group-hover:translate-x-1 rtl:-scale-x-100 rtl:group-hover:-translate-x-1" />
                  </Link>
                </Magnetic>
                <Magnetic strength={0.1} maxShift={6}>
                  <Link href={loc(locale, "/blog")} className="btn-ghost group">
                    {t.ctaWriting}
                    <ArrowIcon className="transition-transform duration-300 group-hover:translate-x-1 rtl:-scale-x-100 rtl:group-hover:-translate-x-1" />
                  </Link>
                </Magnetic>
              </div>
            </Reveal>
          </div>
          <div className="justify-self-center lg:justify-self-end">
            <HeroPlate locale={locale} />
          </div>
        </div>
      </section>

      {/* hazard ticker lives OUTSIDE the hero so nothing clips it */}
      <div aria-hidden className="relative z-30 -mt-8 select-none pb-6">
        <div className="hazard-band">
          <div className="hazard-tape absolute inset-x-0 -top-[9px] h-[9px]" />
          <div className="ticker ticker-band">
            <div className="ticker-track">
              {[0, 1].map((copy) => (
                <div key={copy} className="flex">
                  {t.services.map((s) => (
                    <span
                      key={`${copy}-${s.title}`}
                      className="flex items-center gap-6 whitespace-nowrap px-6 py-3.5 font-display text-sm font-bold uppercase tracking-[0.18em]"
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
      <Seam cyan />
    </>
  );
}