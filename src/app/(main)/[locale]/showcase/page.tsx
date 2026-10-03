import type { Metadata } from "next";
import PageHero from "@/components/ui/PageHero";
import Reveal from "@/components/ui/Reveal";
import ProjectIndex from "@/components/ui/ProjectIndex";
import { JsonLd } from "@/components/ui/JsonLd";
import { itemListJsonLd, breadcrumbJsonLd } from "@/lib/schema";
import { getDict, isLocale, type Locale } from "@/lib/i18n";
import { seoAlternates, SITE } from "@/lib/seo";
import { BRAND } from "@/lib/brand";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const fa = isLocale(locale) && locale === "fa";
  return {
    // Bare title, no person: the locale layout appends " – <person>" from the
    // brand (BRAND.person / personFa). Spelling it here too rendered
    // "… – امید – امید" in the SERP.
    title: fa ? "نمونه‌کارها و پروژه‌ها" : "Showcase – Web development & content projects",
    description: fa
      ? `پروژه‌های وب و محتوایی ${BRAND.personFa} — توسعه فرانت‌اند، وردپرس، طراحی و استراتژی محتوا.`
      : `A selection of live web projects, client sites and content work by ${BRAND.person} — frontend development, WordPress, design and content strategy.`,
    ...(isLocale(locale)
      ? { alternates: seoAlternates("showcase", locale) }
      : {}),
  };
}

const PROJECTS = [
  // The Persian row keeps the handle LATIN (Option A: the site name is never
  // transliterated), so the two locales describe one project under one name.
  { name: "My Portfolio", image: "/images/projects/sin.webp", description: `${BRAND.site} — personal portfolio with a dynamic blog system, bilingual EN/FA.`, descriptionFa: `${BRAND.site} — نمونه‌کار شخصی با سیستم وبلاگ پویا، دوزبانه (فارسی/انگلیسی).`, tags: ["React", "Framer Motion", "Tailwind CSS"] },
  { name: "Moblshuyi", image: "/images/projects/mobl.webp", description: "Premium upholstery & carpet cleaning — complete WordPress design and content strategy.", descriptionFa: "خدمات مبلمان و فرش — طراحی کامل وردپرس و استراتژی محتوا.", tags: ["WordPress", "Elementor", "Content Strategy"] },
  { name: "CarpetDey", image: "/images/projects/carpet.webp", description: "Professional carpet cleaning services — web design and SEO content.", descriptionFa: "خدمات حرفه‌ای قالیشویی — طراحی وب و محتوای سئو شده.", tags: ["Web Design", "SEO Content"] },
  { name: "Tamir Center", image: "/images/projects/tamir.webp", description: "Fridge & freezer repairs — appliance repair site with a local SEO focus.", descriptionFa: "تعمیر یخچال و فریزر — سایت تعمیرات با تمرکز سئوی محلی.", tags: ["Web Design", "Local SEO"] },
  { name: "Tahamtan Shop", image: "/images/projects/tahamtan.webp", description: "Educational blog content for industrial products.", descriptionFa: "محتوای بلاگ آموزشی برای محصولات صنعتی.", tags: ["Content Writing", "SEO"] },
  { name: "Moj Company", image: "/images/projects/moj.webp", description: "Data-driven blog content for LC financing topics.", descriptionFa: "محتوای بلاگ داده‌محور برای موضوعات افتتاح اعتبار اسنادی.", tags: ["Content Strategy", "Technical Writing", "SEO"] },
  { name: "Abzarhz", image: "/images/projects/abzarhz.webp", description: "SEO-optimized posts for tool buyers — keyword targeting.", descriptionFa: "مقالات سئو شده برای خریداران ابزار — هدف‌گذاری کلمات کلیدی.", tags: ["Content Creation", "Keyword Targeting"] },
];

export function generateStaticParams() {
  return [{ locale: "en" }, { locale: "fa" }];
}

export default async function ShowcasePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale: raw } = await params;
  const locale = (isLocale(raw) ? raw : "en") as Locale;
  const t = getDict(locale);

  const localized = PROJECTS.map((p) => ({
    ...p,
    description: locale === "fa" ? p.descriptionFa : p.description,
  }));

  return (
    <div className="mx-auto max-w-6xl px-5 sm:px-8" data-accent="warm">
      <JsonLd
        data={[
          itemListJsonLd(
            localized.map((p) => ({ name: p.name, description: p.description, tags: p.tags })),
            locale
          ),
          breadcrumbJsonLd([
            { name: locale === "fa" ? "خانه" : "Home", url: `${SITE}/${locale}/` },
            { name: locale === "fa" ? "نمونه‌کارها" : "Showcase", url: `${SITE}/${locale}/showcase/` },
          ]),
        ]}
      />
      <Reveal>
        <PageHero
          index={locale === "fa" ? "۰۵" : "05"}
          kicker={t.showcase.kicker}
          title={t.showcase.title}
          stats={[
            { n: String(PROJECTS.length), label: locale === "fa" ? "پروژه" : "projects" },
          ]}
        />
      </Reveal>
      <ProjectIndex projects={localized} />
    </div>
  );
}