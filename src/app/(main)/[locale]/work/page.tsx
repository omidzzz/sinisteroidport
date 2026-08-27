import type { Metadata } from "next";
import Reveal from "@/components/Reveal";
import ScrambleText from "@/components/ScrambleText";
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
    {
      period: "2024 — NOW",
      company: "Arshita Web",
      role: "Customer Support Specialist",
      points: ["Customer-facing support", "Product troubleshooting", "Technical communication"],
    },
    {
      period: "2022 — 2024",
      company: "Self-Employed",
      role: "Freelance Translator & Developer",
      points: ["Frontend development", "EN ↔ FA translation", "Content strategy & SEO writing"],
    },
    {
      period: "2017 — 2022",
      company: "Hich Cafe",
      role: "Barista & Shift Supervisor",
      points: ["Daily operations management", "Team coordination", "Customer service"],
    },
    {
      period: "2012 — 2017",
      company: "Self-Employed",
      role: "Freelance Translator",
      points: ["English ↔ Persian translation", "Language services foundation"],
    },
  ],
  fa: [
    {
      period: "۲۰۲۴ — اکنون",
      company: "آریشتا وب",
      role: "کارشناس پشتیبانی مشتریان",
      points: ["پشتیبانی مشتری‌محور", "عیب‌یابی محصول", "ارتباط فنی"],
    },
    {
      period: "۲۰۲۲ — ۲۰۲۴",
      company: "آزاد",
      role: "مترجم و توسعه‌دهنده فرریلنسر",
      points: ["توسعه فرانت‌اند", "ترجمه ان↔فا", "استراتژی محتوا و نگارش سئو"],
    },
    {
      period: "۲۰۱۷ — ۲۰۲۲",
      company: "کافه هیچ",
      role: "باریستا و سرشیفت",
      points: ["مدیریت عملیات روزانه", "هماهنگی تیم", "خدمات مشتریان"],
    },
    {
      period: "۲۰۱۲ — ۲۰۱۷",
      company: "آزاد",
      role: "مترجم فرریلنسر",
      points: ["ترجمه انگلیسی ↔ فارسی", "پایه‌گذاری خدمات زبان"],
    },
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
    <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
      <Reveal>
        <p className="label mb-3">{t.work.kicker}</p>
        <h1 className="font-display text-[clamp(2.5rem,8vw,6rem)] font-bold uppercase leading-none tracking-tight">
          <ScrambleText text={t.work.title} />
          <span className="text-accent">.</span>
        </h1>
        <p className="mt-4 max-w-lg text-muted">{t.work.intro}</p>
      </Reveal>

      <div className="mt-16">
        {jobs.map((job, i) => (
          <Reveal key={`${job.company}-${job.period}`} delay={i * 60}>
            <article className="group grid grid-cols-1 gap-x-10 gap-y-2 border-t border-line py-9 transition-colors duration-300 last:border-b hover:bg-panel/40 md:grid-cols-[10rem_1fr_1fr]">
              <span className="font-mono text-xs leading-relaxed text-muted transition-colors group-hover:text-accent">
                {job.period}
              </span>
              <div>
                <h2 className="text-2xl font-semibold tracking-tight transition-transform duration-300 group-hover:translate-x-2 rtl:group-hover:-translate-x-2 sm:text-4xl">
                  {job.company}
                </h2>
                <p className="mt-1 text-muted">{job.role}</p>
              </div>
              <ul className="space-y-1 self-center font-mono text-xs uppercase tracking-wider text-muted">
                {job.points.map((point) => (
                  <li key={point} className="before:mx-2 before:text-accent before:content-['→']">
                    {point}
                  </li>
                ))}
              </ul>
            </article>
          </Reveal>
        ))}
      </div>
    </div>
  );
}
