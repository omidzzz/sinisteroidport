import Link from "next/link";
import Image from "next/image";
import KineticTitle from "@/components/KineticTitle";
import Magnetic from "@/components/Magnetic";
import Reveal from "@/components/Reveal";
import ZinePanel from "@/components/ZinePanel";
import LatestPostsLive from "@/components/LatestPostsLive";
import { ArrowIcon, SparkIcon } from "@/components/icons";
import { getAllPosts } from "@/lib/posts";
import { getDict, loc, isLocale, type Locale } from "@/lib/i18n";


export function generateStaticParams() {
  return [{ locale: "en" }, { locale: "fa" }];
}

export default async function HomePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale: raw } = await params;
  const locale = (isLocale(raw) ? raw : "en") as Locale;
  const t = getDict(locale);
  const latest = getAllPosts().slice(0, 3);

  return (
    <div className="mx-auto max-w-6xl px-4 sm:px-6">
      {/* ——— Hero: kinetic type + offset "print-plate" portrait ——— */}
      <section className="relative flex min-h-[88vh] flex-col justify-end pb-12 pt-28">
        <div className={`absolute top-6 hidden text-right sm:block ${locale === "fa" ? "left-0 text-left" : "right-0"}`}>
          <p className="label">{t.coords}</p>
          <p className="label mt-1">{t.city}</p>
        </div>

        <div className="grid grid-cols-1 items-end gap-x-10 gap-y-10 lg:grid-cols-[minmax(0,1.35fr)_minmax(0,0.65fr)] lg:items-end">
          <div>
            <Reveal>
              <p className="label mb-4">{t.heroKicker}</p>
            </Reveal>
            <KineticTitle
              text={t.heroName}
              className="font-display select-none text-[clamp(2.6rem,10.5vw,8.5rem)] font-bold uppercase leading-[0.88] tracking-tight text-ink"
            />
            <Reveal delay={150}>
              <div className="mt-8 flex flex-col gap-8 md:flex-row md:items-end md:justify-between">
                <p className="max-w-md leading-relaxed text-muted">{t.heroDesc}</p>
                <div className="flex flex-wrap items-center gap-5">
                  <Magnetic>
                    <Link
                      href={loc(locale, "/showcase")}
                      className="group inline-flex items-center gap-3 bg-accent px-7 py-3 font-mono text-xs font-bold uppercase tracking-[0.15em] text-bg transition-opacity hover:opacity-85"
                    >
                      {t.ctaWork}
                      <ArrowIcon className="transition-transform duration-300 group-hover:translate-x-1 rtl:-scale-x-100 rtl:group-hover:-translate-x-1" />
                    </Link>
                  </Magnetic>
                  <Magnetic>
                    <Link
                      href={loc(locale, "/blog")}
                      className="font-mono text-xs uppercase tracking-[0.15em] text-muted underline-offset-8 transition-colors hover:text-accent hover:underline"
                    >
                      {t.ctaWriting}
                    </Link>
                  </Magnetic>
                </div>
              </div>
            </Reveal>
          </div>

          {/* Offset print-plate portrait — desktop, beside the type */}
          <Reveal delay={220} className="hidden lg:block">
            <figure className="hero-plate">
              <div className="hero-plate-frame">
                <img
                  src="/hero-image.webp"
                  alt="Omid — portrait"
                  className="hero-plate-img"
                />
                <span aria-hidden className="hero-plate-scan" />
              </div>
            </figure>
          </Reveal>
        </div>

        {/* Offset print-plate portrait — mobile/tablet, below the type */}
        <Reveal delay={260} className="mt-10 lg:hidden">
          <figure className="hero-plate">
            <div className="hero-plate-frame">
              <img
                src="/hero-image.webp"
                alt="Omid — portrait"
                className="hero-plate-img"
              />
              <span aria-hidden className="hero-plate-scan" />
            </div>
          </figure>
        </Reveal>
      </section>

      {/* ——— Ticker: infinite editorial strip ——— */}
      <div aria-hidden className="ticker mt-24 select-none">
        <div className="ticker-track">
          {[0, 1].map((half) => (
            <div key={half} className="flex shrink-0 items-center">
              {[...t.services.map((s) => s.title), "Sinisteroid"].map(
                (word, i) => (
                  <span
                    key={i}
                    className="flex items-center gap-8 pe-8 font-mono text-xs uppercase tracking-[0.25em] text-muted"
                  >
                    {word}
                    <SparkIcon className="shrink-0 text-accent" />
                  </span>
                )
              )}
            </div>
          ))}
        </div>
      </div>

      {/* ——— Services: inverted zine "edition" ——— */}
      <ZinePanel className="mt-24 px-5 py-12 sm:px-8" kicker={t.servicesLabel}>
        {t.services.map((service, i) => (
          <div
            key={service.title}
            className="zine-row group grid grid-cols-[auto_1fr] items-baseline gap-x-5 gap-y-1 border-t border-line py-7 sm:grid-cols-[4rem_auto_1fr] sm:gap-x-8"
          >
            <span className="font-mono text-xs text-accent">0{i + 1}</span>
            <h3 className="text-2xl font-semibold tracking-tight transition-transform duration-300 group-hover:translate-x-2 rtl:group-hover:-translate-x-2 sm:text-3xl">
              {service.title}
            </h3>
            <p className="col-span-2 max-w-md text-sm leading-relaxed text-muted sm:col-span-1 sm:justify-self-end sm:text-right">
              {service.description}
            </p>
          </div>
        ))}
      </ZinePanel>

      {/* ——— Latest writing ——— */}
      <section className="relative mt-24 pt-10">
        <span aria-hidden className="x-rule" />
        <Reveal>
          <div className="mb-8 flex items-baseline justify-between">
            <h2 className="label">{t.latestLabel}</h2>
            <Link
              href={loc(locale, "/blog")}
              className="font-mono text-xs text-muted transition-colors hover:text-accent"
            >
              {t.allPosts}
              <ArrowIcon className="ms-2 inline align-[-2px] transition-transform duration-300 hover:translate-x-1 rtl:-scale-x-100" />
            </Link>
          </div>
        </Reveal>
        {/* Prerendered rows refresh from MySQL via /api/get_posts.php */}
        <LatestPostsLive locale={locale} initial={latest} />
      </section>

      {/* ——— Philosophy strip, now a paper-inverted zine ——— */}
      <ZinePanel className="mt-24 px-5 py-12 sm:px-10" kicker={t.quoteLabel}>
        <div className="grid grid-cols-1 items-center gap-10 sm:grid-cols-[auto_1fr]">
          <div className="parallax-frame">
            <Image
              src="/homePic.webp"
              alt="Omid"
              width={220}
              height={220}
              className="grayscale transition duration-500 hover:grayscale-0"
            />
          </div>
          <blockquote className="max-w-xl text-xl font-light leading-relaxed text-muted sm:text-2xl">
            {t.quote}
          </blockquote>
        </div>
      </ZinePanel>
    </div>
  );
}
