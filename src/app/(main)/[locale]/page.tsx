import { JsonLd } from "@/components/ui/JsonLd";
import { faqJsonLd } from "@/lib/schema";
import HeroSection from "@/components/home/HeroSection";
import TelemetrySection from "@/components/home/TelemetrySection";
import SkillNetwork from "@/components/home/SkillNetwork";
import ConsoleBay from "@/components/home/ConsoleBay";
import ModuleBay from "@/components/home/ModuleBay";
import SignalsSection from "@/components/home/SignalsSection";
import ManifestoSection from "@/components/home/ManifestoSection";
import Stratum from "@/components/home/Stratum";
import PropFloatLayer from "@/components/home/prop-float/PropFloatLayer";
import { homeFaq } from "@/components/home/faq";
import { getAllPosts } from "@/lib/blog/repository";
import { isLocale, type Locale } from "@/lib/i18n";
import skillsData from "@/data/skills.json";

export function generateStaticParams() {
  return [{ locale: "en" }, { locale: "fa" }];
}

/**
 * HOME — STRATUM · MANTLE (v7)
 * Tectonic cross-section: full-bleed strata bands with interlocking
 * fault edges, mineral shelves (amber → rose → violet) that re-map
 * the hot tokens per act, the core-sample rail, crossed marquee
 * crust strips, an embedded core-portrait plate, a scrubbed CORE
 * network, mirror-shelf modules, zigzag transmissions and a
 * spotlight manifesto. No coordinates, no star chart.
 *
 * The acts live in components/home/*; each is wrapped in a Stratum
 * by this page — change a section's markup there, order strata here.
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
  // into the RSC flight payload embedded in the HTML — paid on transfer AND
  // parse AND hydration at the 4x-throttled mobile CPU. Slim to what the strip
  // reads (empty `content` is a valid PostTranslation — zero behavior change).
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
    <div className="home-acts overflow-x-clip">
      {/* GEO/SEO: machine-readable FAQ (also great for AI crawlers + rich results) */}
      <JsonLd data={faqJsonLd(homeFaq(fa))} />

      {/* STRATUM · MANTLE — the home page is a tectonic cross-section.
          Each act is a mineral shelf (amber → rose → violet) that re-tints
          the same components via scoped tokens; fault edges interlock. */}
      <Stratum mineral="amber">
        <HeroSection locale={locale} />
      </Stratum>
      <Stratum mineral="rose">
        <TelemetrySection locale={locale} skillTotal={skillTotal} />
      </Stratum>
      <Stratum mineral="violet">
        <SkillNetwork locale={locale} />
      </Stratum>
      <Stratum mineral="amber">
        <ConsoleBay />
      </Stratum>
      <Stratum mineral="rose">
        <ModuleBay locale={locale} />
      </Stratum>
      <Stratum mineral="violet">
        <SignalsSection locale={locale} initial={latest} />
      </Stratum>
      <Stratum mineral="amber">
        <ManifestoSection locale={locale} />
      </Stratum>
      <PropFloatLayer />
    </div>
  );
}