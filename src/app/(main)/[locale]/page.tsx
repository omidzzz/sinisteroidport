import { JsonLd } from "@/components/ui/JsonLd";
import { faqJsonLd } from "@/lib/schema";
import HeroSection from "@/components/home/HeroSection";
import TelemetrySection from "@/components/home/TelemetrySection";
import ConsoleBay from "@/components/home/ConsoleBay";
import ModuleBay from "@/components/home/ModuleBay";
import SignalsSection from "@/components/home/SignalsSection";
import ManifestoSection from "@/components/home/ManifestoSection";
import PropFloatLayer from "@/components/home/prop-float/PropFloatLayer";
import { homeFaq } from "@/components/home/faq";
import { getAllPosts } from "@/lib/blog/repository";
import { isLocale, type Locale } from "@/lib/i18n";
import skillsData from "@/data/skills.json";

export function generateStaticParams() {
  return [{ locale: "en" }, { locale: "fa" }];
}

/**
 * HOME — PSIONIC ORBIT // ACID RAVE (v6)
 * Asymmetric acts: overlap hero (kinetic name × portrait plate),
 * skewed seams, sticky rails w/ section icons, scrub outline words,
 * scattered telemetry, mirrored bento modules, zigzag transmissions,
 * spotlight manifesto. No coordinates, no star chart.
 *
 * The acts live in components/home/*; this page is a pure composition.
 * Change a section's markup there — order the sections here.
 */
export default async function HomePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale: raw } = await params;
  const locale = (isLocale(raw) ? raw : "en") as Locale;
  const fa = locale === "fa";
  const latest = getAllPosts().slice(0, 3);
  const skillTotal = skillsData.reduce((n, g) => n + g.skills.length, 0);

  return (
    <div className="overflow-x-clip">
      {/* GEO/SEO: machine-readable FAQ (also great for AI crawlers + rich results) */}
      <JsonLd data={faqJsonLd(homeFaq(fa))} />

      <HeroSection locale={locale} />
      <TelemetrySection locale={locale} skillTotal={skillTotal} />
      <ConsoleBay />
      <ModuleBay locale={locale} />
      <SignalsSection locale={locale} initial={latest} />
      <ManifestoSection locale={locale} />
      <PropFloatLayer />
    </div>
  );
}