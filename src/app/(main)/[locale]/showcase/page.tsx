import type { Metadata } from "next";
import Reveal from "@/components/Reveal";
import ScrambleText from "@/components/ScrambleText";
import ProjectIndex from "@/components/ProjectIndex";
import { getDict, isLocale, type Locale } from "@/lib/i18n";
import { seoAlternates } from "@/lib/seo";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  return {
    title: "Showcase – Projects & Clients",
    description:
      "A selection of live projects, client work and blog content created by Omid, demonstrating professional web development and content strategy.",
    ...(isLocale(locale)
      ? { alternates: seoAlternates("showcase", locale) }
      : {}),
  };
}

// Images are the originals from the reference build (build/static/media)
const PROJECTS = [
  {
    name: "My Portfolio",
    image: "/images/projects/sin.webp",
    description:
      "Sinisteroid — personal portfolio with a dynamic blog system, bilingual EN/FA.",
    descriptionFa:
      "سینستروئید — نمونه‌کار شخصی با سیستم وبلاگ پویا، دوزبانه (فارسی/انگلیسی).",
    tags: ["React", "Framer Motion", "Tailwind CSS"],
  },
  {
    name: "Moblshuyi",
    image: "/images/projects/mobl.webp",
    description:
      "Premium upholstery & carpet cleaning — complete WordPress design and content strategy.",
    descriptionFa:
      "خدمات مبلمان و فرش — طراحی کامل وردپرس و استراتژی محتوا.",
    tags: ["WordPress", "Elementor", "Content Strategy"],
  },
  {
    name: "CarpetDey",
    image: "/images/projects/carpet.webp",
    description: "Professional carpet cleaning services — web design and SEO content.",
    descriptionFa: "خدمات حرفه‌ای قالیشویی — طراحی وب و محتوای سئو شده.",
    tags: ["Web Design", "SEO Content"],
  },
  {
    name: "Tamir Center",
    image: "/images/projects/tamir.webp",
    description: "Fridge & freezer repairs — appliance repair site with a local SEO focus.",
    descriptionFa: "تعمیر یخچال و فریزر — سایت تعمیرات با تمرکز سئوی محلی.",
    tags: ["Web Design", "Local SEO"],
  },
  {
    name: "Tahamtan Shop",
    image: "/images/projects/tahamtan.webp",
    description: "Educational blog content for industrial products.",
    descriptionFa: "محتوای بلاگ آموزشی برای محصولات صنعتی.",
    tags: ["Content Writing", "SEO"],
  },
  {
    name: "Moj Company",
    image: "/images/projects/moj.webp",
    description: "Data-driven blog content for LC financing topics.",
    descriptionFa: "محتوای بلاگ داده‌محور برای موضوعات افتتاح اعتبار اسنادی.",
    tags: ["Content Strategy", "Technical Writing", "SEO"],
  },
  {
    name: "Abzarhz",
    image: "/images/projects/abzarhz.webp",
    description: "SEO-optimized posts for tool buyers — keyword targeting.",
    descriptionFa: "مقالات سئو شده برای خریداران ابزار — هدف‌گذاری کلمات کلیدی.",
    tags: ["Content Creation", "Keyword Targeting"],
  },
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
    <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
      <Reveal>
        <p className="label mb-3">{t.showcase.kicker}</p>
        <h1 className="font-display text-[clamp(2.5rem,8vw,6rem)] font-bold uppercase leading-none tracking-tight">
          <ScrambleText text={t.showcase.title} />
          <span className="text-accent">.</span>
        </h1>
      </Reveal>
      <ProjectIndex projects={localized} />
    </div>
  );
}
