import type { Metadata } from "next";
import PageHero from "@/components/ui/PageHero";
import Tilt from "@/components/ui/Tilt";
import Spotlight from "@/components/ui/Spotlight";
import Reveal from "@/components/ui/Reveal";
import { getDict, isLocale, type Locale } from "@/lib/i18n";
import { seoAlternates } from "@/lib/seo";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  return {
    title:
      isLocale(locale) && locale === "fa"
        ? "سوابق کاری"
        : "Work Experience",
    description:
      "Discover the professional background and roles held by Omid, including translation, customer support, and service leadership.",
    ...(isLocale(locale)
      ? { alternates: seoAlternates("work", locale) }
      : {}),
  };
}

const JOBS = {
  en: [
    { period: "2024 — NOW", company: "Arshita Web", role: "Customer Support Specialist", points: ["Customer-facing support", "Product troubleshooting", "Technical communication"] },
    { period: "2022 — 2024", company: "Self-Employed", role: "Freelance Translator & Developer", points: ["Frontend development", "EN ↔ FA translation", "Content strategy & SEO"] },
    { period: "2017 — 2022", company: "Hich Cafe", role: "Barista & Shift Supervisor", points: ["Daily operations", "Team coordination", "Customer service"] },
    { period: "2012 — 2017", company: "Self-Employed", role: "Freelance Translator", points: ["English ↔ Persian translation", "Language services foundation"] },
  ],
  fa: [
    { period: "۲۰۲۴ — اکنون", company: "آریشتا وب", role: "کارشناس پشتیبانی مشتریان", points: ["پشتیبانی مشتری‌محور", "عیب‌یابی محصول", "ارتباط فنی"] },
    { period: "۲۰۲۲ — ۲۰۲۴", company: "آزاد", role: "مترجم و توسعه‌دهنده فریلنسر", points: ["توسعه فرانت‌اند", "ترجمه ان↔فا", "استراتژی محتوا و سئو"] },
    { period: "۲۰۱۷ — ۲۰۲۲", company: "کافه هیچ", role: "باریستا و سرشیفت", points: ["مدیریت عملیات روزانه", "هماهنگی تیم", "خدمات مشتریان"] },
    { period: "۲۰۱۲ — ۲۰۱۷", company: "آزاد", role: "مترجم فریلنسر", points: ["ترجمه انگلیسی ↔ فارسی", "پایه‌گذاری خدمات زبان"] },
  ],
} as const;

export function generateStaticParams() {
  return [{ locale: "en" }, { locale: "fa" }];
}

export default async function WorkPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale: raw } = await params;
  const locale = (isLocale(raw) ? raw : "en") as Locale;
  const t = getDict(locale);
  const jobs = JOBS[locale];

  return (
    <div className="mx-auto max-w-6xl px-5 pt-28 sm:px-8">
      <Reveal>
        <PageHero
          index={locale === "fa" ? "۰۲" : "02"}
          kicker={t.work.kicker}
          title={t.work.title}
          intro={t.work.intro}
          stats={[
            { n: String(jobs.length), label: locale === "fa" ? "نقش" : "roles" },
            { n: "12+", label: locale === "fa" ? "سال" : "years" },
          ]}
        />
      </Reveal>

      <Spotlight className="mt-2">
        <div className="timeline">
          {jobs.map((job, i) => (
            <Reveal key={`${job.company}-${job.period}`} delay={i * 70}>
              <div className="tl-item">
                <span aria-hidden className="tl-node" />
                <Tilt maxTilt={4}>
                  <article className="tl-card">
                    <span className="tl-period">{job.period}</span>
                    <h2 className="tl-role">{job.role}</h2>
                    <p className="tl-company">{job.company}</p>
                    <ul className="tl-points">
                      {job.points.map((point) => (
                        <li key={point} className="tl-point">
                          {point}
                        </li>
                      ))}
                    </ul>
                  </article>
                </Tilt>
              </div>
            </Reveal>
          ))}
        </div>
      </Spotlight>
    </div>
  );
}