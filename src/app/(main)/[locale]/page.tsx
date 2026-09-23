import { JsonLd } from "@/components/ui/JsonLd";
import { faqJsonLd } from "@/lib/schema";
import HeroSection from "@/components/home/HeroSection";
import TelemetrySection from "@/components/home/TelemetrySection";
import SkillNetwork from "@/components/home/SkillNetwork";
import ModuleBay from "@/components/home/ModuleBay";
import SignalsSection from "@/components/home/SignalsSection";
import ChannelsSection from "@/components/home/ChannelsSection";
import { homeFaq } from "@/components/home/faq";
import { getAllPosts } from "@/lib/blog/repository";
import { isLocale, type Locale } from "@/lib/i18n";
import skillsData from "@/data/skills.json";

export function generateStaticParams() {
  return [{ locale: "en" }, { locale: "fa" }];
}

/**
 * HOME — SYSTEM (v10).
 *
 * One console, read top to bottom: the terminal hero and its hazard ticker,
 * telemetry gauges, the SYNAPSE skill constellation, the module deck, the
 * incoming signals (the writing), and the channels close. Sections are
 * separated by the SysRule line — `[NN] LABEL ─────` — and every prop plate
 * (frog / plant / laptop / ufo) now lives ONLY on the graphics lab route,
 * where each plate can be inspected, downloaded and copied as SVG.
 *
 * The printed edition's chrome is gone on purpose: no Quire acts, no prop
 * plates, no scroll-scrubbed outline words (the scrub was the desktop CLS
 * offender), no manifesto word-splitting.
 */
export default async function HomePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale: raw } = await params;
  const locale = (isLocale(raw) ? raw : "en") as Locale;
  const fa = locale === "fa";
  // PERF: the strip renders title + date + cover only. Passing the FULL posts
  // serialized every post's content blocks (~84 KiB of JSON for three posts)
  // into the RSC flight payload embedded in the HTML - paid on transfer AND
  // parse AND hydration at the 4x-throttled mobile CPU. Slim to what the strip
  // reads (empty `content` is a valid PostTranslation - zero behavior change).
  const latest = getAllPosts().slice(0, 3).map((p) => ({
    slug: p.slug,
    title: p.title,
    date: p.date,
    tags: p.tags,
    featuredImage: p.featuredImage ? { src: p.featuredImage.src } : undefined,
    translations: {
      en: {
        title: p.translations?.en?.title ?? p.title,
        excerpt: "",
        content: [],
      },
      ...(p.translations?.fa
        ? {
            fa: {
              title: p.translations.fa.title,
              excerpt: "",
              content: [],
            },
          }
        : {}),
    },
  }));
  const skillTotal = skillsData.reduce((n, g) => n + g.skills.length, 0);

  return (
    <div className="home-acts">
      {/* GEO/SEO: machine-readable FAQ (also great for AI crawlers + rich results) */}
      <JsonLd data={faqJsonLd(homeFaq(fa))} />

      <HeroSection locale={locale} />
      <TelemetrySection locale={locale} skillTotal={skillTotal} />

        <SkillNetwork locale={locale} />
        <ModuleBay locale={locale} />

        <SignalsSection locale={locale} initial={latest} />
        <ChannelsSection locale={locale} />
      </div>
  );
}