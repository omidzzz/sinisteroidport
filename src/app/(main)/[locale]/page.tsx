import { JsonLd } from "@/components/ui/JsonLd";
import { faqJsonLd } from "@/lib/schema";
import HeroSection from "@/components/home/HeroSection";
import TelemetrySection from "@/components/home/TelemetrySection";
import SkillNetwork from "@/components/home/SkillNetwork";
import ConsoleBay from "@/components/home/ConsoleBay";
import ModuleBay from "@/components/home/ModuleBay";
import SignalsSection from "@/components/home/SignalsSection";
import ManifestoSection from "@/components/home/ManifestoSection";
import Quire from "@/components/home/Quire";
import FigPlate from "@/components/home/figure/FigPlate";
import { homeFaq } from "@/components/home/faq";
import { getAllPosts } from "@/lib/blog/repository";
import { isLocale, type Locale } from "@/lib/i18n";
import skillsData from "@/data/skills.json";

export function generateStaticParams() {
  return [{ locale: "en" }, { locale: "fa" }];
}

/**
 * HOME - QUIRE (v9)
 * The printed edition: one continuous measure of type on paper, read
 * top to bottom like a book. Acts are separated by marginal rules
 * (numeral + title), the chrome lives in the margin (margin index,
 * running head, colophon), and the prop floaters return as monochrome
 * FIG. plates mounted in the flow. Content, data and i18n are
 * unchanged from the TERRANOMY acts - only the voice is printed.
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

      <Quire locale={locale}>
        <HeroSection locale={locale} />

        {/* FIG. 01 - the frog, printed as a plate after the frontispiece */}
        <FigPlate
          no="01"
          caption={fa ? "قورباغه · جانب‌دار" : "The frog · it darts away"}
          prop="frog"
          className="quire-plate"
        />

        <TelemetrySection locale={locale} skillTotal={skillTotal} />

        {/* FIG. 02 - the plant, printed opposite the ledger */}
        <FigPlate
          no="02"
          caption={fa ? "گیاه · تاب می‌خورد" : "The plant · it sways"}
          prop="plant"
          className="quire-plate"
        />

        <SkillNetwork locale={locale} />
        <ConsoleBay locale={locale} />
        <ModuleBay locale={locale} />

        {/* FIG. 04 - the drone, saved for last */}
        <FigPlate
          no="04"
          caption={fa ? "پرنده · فاصله را نگه می‌دارد" : "The drone · it keeps its distance"}
          prop="drone"
          className="quire-plate"
        />

        <SignalsSection locale={locale} initial={latest} />
        <ManifestoSection locale={locale} />
      </Quire>
    </div>
  );
}