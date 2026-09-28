"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import Magnetic from "@/components/ui/Magnetic";
import { ArrowIcon } from "@/components/ui/icons";
import { getDict, loc, type Locale } from "@/lib/i18n";

/** ONE shared observer for every ticker, reused across mounts. */
let tickerObserver: IntersectionObserver | null = null;
const tickerFns = new WeakMap<Element, (visible: boolean) => void>();

/**
 * Watch `el` and report as it crosses the viewport. The marquee is pure CSS;
 * this only tells it to park once it is scrolled past the fold, so a long
 * read does not pay for an animation nobody can see.
 */
function observeTicker(el: Element, onChange: (visible: boolean) => void) {
  if (typeof IntersectionObserver === "undefined") return;
  if (!tickerObserver) {
    tickerObserver = new IntersectionObserver((entries) => {
      for (const e of entries) tickerFns.get(e.target)?.(e.isIntersecting);
    });
  }
  tickerFns.set(el, onChange);
  tickerObserver.observe(el);
  return () => {
    tickerObserver?.unobserve(el);
    tickerFns.delete(el);
  };
}

/**
 * HOME ACT I — CRAFT CONSOLE HERO
 *
 * The wordmark is the HANDLE, not the legal name: SINISTEROID is what the
 * site, the posts and the resident agent all answer to, and the two sentences
 * under it are where the person is introduced. Everything else the old hero
 * carried — a live clock, an equaliser, the status card around them — was
 * furniture that spent a frame budget on information four words of mono hold.
 *
 * Performance is part of the design here, so the omissions are deliberate:
 *
 *   - No Reveal wrappers above the fold. .reveal starts at opacity:0 until
 *     React hydrates AND an IntersectionObserver fires, so the old hero could
 *     not paint its <h1> — the likely LCP element on a phone — until the JS
 *     arrived. This hero is static server HTML: it paints with the document,
 *     and the reveals begin at the next section.
 *   - No client state beyond the ticker's own on/off flag. The clock was a
 *     setState every second for the whole session on every device, visible or
 *     not; the signal bars were five infinite animations. Both are gone, and
 *     with them the pulsing dot that lit them.
 *   - One interaction survives: the primary CTA's magnetic pull, which mounts
 *     nothing on touch devices or under reduced motion (see Magnetic).
 *
 * The service ticker still lives outside the hero so nothing clips it.
 */

export default function HeroSection({ locale }: { locale: Locale }) {
  const t = getDict(locale);
  const fa = locale === "fa";
  const tickerRef = useRef<HTMLDivElement>(null);
  const [tickerOnscreen, setTickerOnscreen] = useState(true);

  /* Park the marquee once it is scrolled past the fold. .tf-paused is the
     CSS hook in refinement.css; the animation itself is untouched CSS. */
  useEffect(() => {
    const el = tickerRef.current;
    if (!el) return;
    return observeTicker(el, setTickerOnscreen);
  }, []);

  // The old status panel, compressed to one static row: the same four facts
  // (base / focus / stack / languages) with no clock, no equaliser, and no
  // card around them.
  const facts = fa
    ? [t.city, "رابط وب، سیستم و عامل هوش مصنوعی", "React · Next.js · WordPress", "EN / FA"]
    : [t.city, "Web interfaces, systems & AI agents", "React · Next.js · WordPress", "EN / FA"];

  return (
    <>
      <section className="craft-hero">
        <div className="craft-hero-copy">
          <p className="craft-hero-kicker">
            <span className="craft-label">{t.heroKicker}</span>
          </p>

          {/* dir="ltr": the wordmark is a Latin brand name, so it must not
              inherit the RTL paragraph direction on /fa/. */}
          <h1 className="craft-hero-name" dir="ltr">
            {t.heroTitle}
          </h1>

          <p className="craft-hero-desc">{t.heroIntro}</p>

          <div className="craft-hero-ctas">
            <Magnetic strength={0.22} maxShift={7}>
              {/* prefetch={false}: with output:"export" Next still emits an RSC
                  payload per route, and the /blog one is 91 KB. Two links in
                  view were pulling it on load, competing with LCP for
                  bandwidth. The CTA pair is the least likely click on a phone
                  (the rail and nav already carry every route), so paying 91 KB
                  up front for it is the worst trade on the page. */}
              <Link
                href={loc(locale, "/work")}
                prefetch={false}
                className="craft-cta-primary"
              >
                {t.ctaWork}
                <ArrowIcon className="craft-cta-arrow" />
              </Link>
            </Magnetic>
            <Link
              href={loc(locale, "/blog")}
              prefetch={false}
              className="craft-cta-ghost"
            >
              {t.ctaWriting}
              <ArrowIcon className="craft-cta-arrow" />
            </Link>
          </div>

          <p className="craft-hero-meta">
            {facts.map((fact, index) => (
              <span className="craft-meta-item" key={fact}>
                {index > 0 && (
                  <span className="craft-meta-sep" aria-hidden="true">
                    ·
                  </span>
                )}
                <span>{fact}</span>
              </span>
            ))}
          </p>
        </div>
      </section>

      {/* hazard ticker lives OUTSIDE the hero so nothing clips it */}
      <div
        ref={tickerRef}
        aria-hidden="true"
        className={`craft-ticker-bleed${tickerOnscreen ? "" : " tf-paused"}`}
      >
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

