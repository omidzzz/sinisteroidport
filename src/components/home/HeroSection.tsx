"use client";

import Link from "next/link";
import Reveal from "@/components/ui/Reveal";
import { ArrowIcon } from "@/components/ui/icons";
import { getDict, loc, type Locale } from "@/lib/i18n";

/**
  * HOME ACT I — CRAFT CONSOLE HERO
 *
 * A terminal-first hero that speaks the site's navigation language:
 * a prompt line, a kinetic name, role chips, and the two primary CTAs.
 * The hazard ticker lives outside the hero so nothing clips it.
 */
export default function HeroSection({ locale }: { locale: Locale }) {
  const t = getDict(locale);

  return (
    <>
      <section className="craft-hero">
        <Reveal>
          <p className="craft-hero-kicker">
            <span className="craft-live-dot" aria-hidden="true" />
            <span className="craft-label">{t.heroKicker}</span>
          </p>
        </Reveal>

        <div className="craft-hero-identity">
          <h1 className="craft-hero-name">{t.heroName}</h1>
          <span className="craft-hero-subtitle">SINISTEROID</span>
        </div>
        <Reveal delay={120} variant="right">
          <p className="craft-hero-roles">
            {t.services.map((s) => (
              <span key={s.title} className="craft-role-chip">
                {s.title}
              </span>
            ))}
            <span className="craft-cursor" aria-hidden="true">
              ▌
            </span>
          </p>
        </Reveal>

        <Reveal delay={200} variant="right">
          <p className="craft-hero-desc">{t.heroDesc}</p>
        </Reveal>
        <Reveal delay={300} variant="right">
          <div className="craft-hero-ctas">
            <Link href={loc(locale, "/work")} className="craft-cta-primary">
              {t.ctaWork}
              <ArrowIcon className="craft-cta-arrow" />
            </Link>
            <Link href={loc(locale, "/blog")} className="craft-cta-ghost">
              {t.ctaWriting}
              <ArrowIcon className="craft-cta-arrow" />
            </Link>
          </div>
        </Reveal>

        <Reveal delay={400}>
          <p className="craft-hero-meta">
            <span className="craft-meta-item">
              <span className="craft-live-dot" aria-hidden="true" />
              <span dir="ltr">OPEN FOR WORK — 2026</span>
            </span>
            <span className="craft-meta-sep" aria-hidden="true" />
            <span dir="ltr">{locale === "fa" ? "FA / EN" : "EN / FA"}</span>
          </p>
        </Reveal>
      </section>

      {/* hazard ticker lives OUTSIDE the hero so nothing clips it */}
      <div aria-hidden="true" className="craft-ticker-bleed">
        <div className="craft-ticker-band">
          <div className="craft-ticker-track" dir="ltr">
            {Array.from({ length: 2 }, (_, copy) => (
              <div key={copy} className="craft-ticker-row" dir="ltr">
                {t.services.map((s) => (
                  <span
                    key={`${copy}-${s.title}`}
                    className={`craft-ticker-item ${
                      locale === "fa" ? "craft-ticker-item-fa" : ""
                    }`}
                  >
                    {s.title}
                  </span>
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}

