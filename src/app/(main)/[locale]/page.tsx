import Link from "next/link";
import type { ReactNode } from "react";
import Reveal from "@/components/Reveal";
import Magnetic from "@/components/Magnetic";
import Tilt from "@/components/Tilt";
import Spotlight from "@/components/Spotlight";
import CountUp from "@/components/CountUp";
import KineticTitle from "@/components/KineticTitle";
import HeroPlate from "@/components/HeroPlate";
import LaptopDeck from "@/components/LaptopDeck";
import LatestPostsLive from "@/components/LatestPostsLive";
import RainStrip from "@/components/RainStrip";
import { ArrowIcon, SparkIcon, GaugeIcon, OrbitIcon, SignalIcon } from "@/components/icons";
import { getAllPosts, type FaqItem } from "@/lib/posts";
import { getDict, loc, isLocale, type Locale } from "@/lib/i18n";
import { JsonLd, faqJsonLd } from "@/lib/schema";
import skillsData from "@/data/skills.json";

export function generateStaticParams() {
  return [{ locale: "en" }, { locale: "fa" }];
}

/* ── shared bits ── */
const Seam = ({ flip, cyan, children }: { flip?: boolean; cyan?: boolean; children?: ReactNode }) => (
  <div aria-hidden className={`seam ${flip ? "flip" : ""} ${cyan ? "cyan" : ""}`}>
    {children}
  </div>
);
const Rail = ({ label, icon }: { label: string; icon?: ReactNode }) => (
  <div className="sec-label">
    <span className="sec-ico" aria-hidden>{icon}</span>
    <span className="vert">{label}</span>
  </div>
);

/**
 * HOME — PSIONIC ORBIT // ACID RAVE (v6)
 * Asymmetric acts: overlap hero (kinetic name × portrait plate),
 * skewed seams, sticky rails w/ section icons, scrub outline words,
 * scattered telemetry, mirrored bento modules, zigzag transmissions,
 * spotlight manifesto. No coordinates, no star chart.
 */
export default async function HomePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale: raw } = await params;
  const locale = (isLocale(raw) ? raw : "en") as Locale;
  const t = getDict(locale);
  const latest = getAllPosts().slice(0, 3);
  const skillTotal = skillsData.reduce((n, g) => n + g.skills.length, 0);
  const fa = locale === "fa";

  const STATS = (
    fa
      ? [
          { n: 12, label: "سال تجربه" },
          { n: 7, label: "پروژه منتخب" },
          { n: 2, label: "زبان" },
          { n: skillTotal, label: "توانمندی" },
        ]
      : [
          { n: 12, label: "Years of craft" },
          { n: 7, label: "Selected projects" },
          { n: 2, label: "Languages" },
          { n: skillTotal, label: "Capabilities" },
        ]
  ).map((s) => ({ ...s, v: Math.round((s.n / Math.max(skillTotal, s.n)) * 100) }));

  const K = {
    tel: fa ? "تلمتری · وضعیت پرواز" : "Telemetry · flight status",
    bay: fa ? "ماهواره‌ها · مهارت‌ها" : "Modules · capability deck",
    sig: fa ? "فرکانس ورودی · نوشته‌ها" : "Incoming frequency · writing",
    man: fa ? "مانیفست · حوزه سیگنال" : "Manifesto · signal domain",
  };

  const w = t.quote.split(" ");
  const mid = Math.ceil(w.length / 2);
  const qHead = w.slice(0, mid).join(" ");
  const qTail = w.slice(mid).join(" ");

  // GEO/SEO: machine-readable FAQ (also great for AI crawlers + rich results)
  const faq: FaqItem[] = fa
    ? [
        {
          question: "امید کیست و چه می‌سازد؟",
          answer:
            "امید توسعه‌دهنده فرانت‌اندی است که از سال ۲۰۱۲ در ری‌اکت، جاوااسکریپت، وردپرس و استراتژی محتوا کار می‌کند و از سابقه ترجمه برای تولید وب‌سایت‌های دقیق و کاربرپسند بهره می‌برد.",
        },
        {
          question: "چه خدماتی ارائه می‌شود؟",
          answer:
            "توسعه فرانت‌اند (ری‌اکت/جاوااسکریپت)، توسعه وردپرس، استراتژی محتوا و ترجمه تخصصی انگلیسی–فارسی.",
        },
        {
          question: "آیا همکاری دورکار ممکن است؟",
          answer:
            "بله، امید برای همکاری دورکاری در سراسر جهان در دسترس است.",
        },
      ]
    : [
        {
          question: "Who is Omid and what does Omid build?",
          answer:
            "Omid is an adaptive frontend developer working since 2012 in React, JavaScript, WordPress and content strategy, applying a translation-studies background to build precise, user-friendly websites.",
        },
        {
          question: "What services does Omid offer?",
          answer:
            "Frontend development (React/JavaScript), WordPress development, content strategy, and professional English–Persian translation.",
        },
        {
          question: "Is remote collaboration available?",
          answer:
            "Yes — Omid is available for remote work worldwide.",
        },
      ];

  return (
    <div className="overflow-x-clip">
      <JsonLd data={faqJsonLd(faq)} />
      {/* ══ ACT I · TRANSMISSION HERO ══════════════════════ */}
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

      {/* ══ ACT II · TELEMETRY ═══════════════════════════ */}
      {/* NOTE: no .cv-auto here — its paint containment clips the absolutely
          placed TTY console that hangs off the section's lower edge. */}
      <section className="shell-grid relative mx-auto mt-6 max-w-[86rem] px-5 sm:px-8">
        <Rail label={K.tel} icon={<GaugeIcon />} />
        <div className="relative">
          <span aria-hidden dir="ltr" className="scrub-word rev-dir top-[-0.45em]">
            TELEMETRY
          </span>
          <div className="scatter mt-2 grid grid-cols-2 gap-4 lg:grid-cols-4">
            {STATS.map((s, i) => (
              <Reveal key={s.label} delay={i * 80} variant={i % 2 ? "left" : "scale"}>
                <div className="gauge-cell">
                  <span className="gauge-num block text-[clamp(1.9rem,3.2vw,2.7rem)] leading-none">
                    <CountUp to={s.n} suffix="+" />
                  </span>
                  <p className="mt-2 font-mono text-[0.62rem] uppercase tracking-[0.16em] text-muted">
                    {s.label}
                  </p>
                  <span className="gauge-meter">
                    <span className="gauge-fill" style={{ ["--v" as string]: `${s.v}%` }} />
                  </span>
                </div>
              </Reveal>
            ))}
          </div>

        </div>
      </section>

      <Seam flip />

      {/* ══ CONSOLE BAY ═══════════════════════════════════ */}
      {/* A dedicated in-flow strip for the acid laptop — never overlaps
          content, rides the scroll with a scrubbed 3D reveal. */}
      <section className="console-bay" aria-hidden="true">
        <div className="console-bay-inner">
          <div className="console-bay-deck">
            <LaptopDeck />
          </div>
        </div>
      </section>

      {/* ══ ACT III · MODULE BAY ═════════════════════════ */}
      <section className="cv-auto shell-grid rev relative mx-auto mt-6 max-w-[86rem] px-5 sm:px-8">
        <Spotlight className="min-w-0">
          <div className="bay-grid relative">
            {t.services.map((service, i) => (
              <Tilt key={service.title} maxTilt={7}>
                <article
                  className={`module-card ${i % 2 ? "rotate-1 md:-translate-y-6" : "-rotate-1"}`}
                  data-hue={i % 2 ? "cyan" : "acid"}
                >
                  <span aria-hidden className="mod-halo" />
                  <div className="flex items-center justify-between">
                    <span className="mod-idx">M.{String(i + 1).padStart(2, "0")}</span>
                    <ArrowIcon className="size-5 text-muted transition-all duration-300 group-hover:text-acid" />
                  </div>
                  <h2 className="mod-title text-[clamp(1.05rem,2vw,1.45rem)]">{service.title}</h2>
                  <p className="mod-desc">{service.description}</p>
                </article>
              </Tilt>
            ))}
          </div>
        </Spotlight>
        <Rail label={K.bay} icon={<OrbitIcon />} />
      </section>

      <Seam cyan flip />

      {/* ══ ACT IV · INCOMING TRANSMISSIONS ══════════════ */}
      <section className="cv-auto shell-grid relative mx-auto mt-6 max-w-[86rem] px-5 sm:px-8">
        <Rail label={K.sig} icon={<SignalIcon />} />
        <div className="sig-zone relative min-w-0">
          <div className="rain-bay">
            <RainStrip />
          </div>
          <span aria-hidden dir="ltr" className="scrub-word bottom-0">
            SIGNALS
          </span>
          <div className="mb-6 flex justify-end">
            <Link
              href={loc(locale, "/blog")}
              className="group brk font-mono text-xs text-muted transition-colors hover:text-acid"
            >
              {t.allPosts}
              <ArrowIcon className="ms-2 inline align-[-2px] transition-transform duration-300 group-hover:translate-x-1 rtl:-scale-x-100 rtl:group-hover:-translate-x-1" />
            </Link>
          </div>
          <LatestPostsLive locale={locale} initial={latest} />
        </div>
      </section>

      <Seam />

      {/* ══ ACT V · MANIFESTO ════════════════════════════ */}
      <section className="cv-auto shell-grid relative mx-auto my-20 max-w-[86rem] px-5 sm:px-8">
        <Rail label={K.man} />
        <Spotlight className="relative min-w-0 py-6">
          <span aria-hidden dir="ltr" className="scrub-word top-[-0.35em]">
            PHILOSOPHY
          </span>
          <Reveal delay={100} variant="left">
            <p className="mani-block anaglyph-strong relative">{qHead}</p>
          </Reveal>
          <Reveal delay={220} variant="right">
            <p
              className={`mani-block anaglyph-strong relative mt-6 ${
                fa ? "mani-offset-end text-start" : "mani-offset-end text-end"
              }`}
            >
              {qTail}
            </p>
          </Reveal>
          <Reveal delay={320}>
            <div className="mt-14 flex flex-wrap items-center justify-between gap-4 border-t border-line pt-5 font-mono text-[0.62rem] uppercase tracking-[0.2em] text-muted">
              <span>{t.quoteLabel}</span>
              <span dir="ltr" className="text-acid">SIG.OK ▸ VOID-FREE</span>
            </div>
          </Reveal>
        </Spotlight>
      </section>
    </div>
  );
}