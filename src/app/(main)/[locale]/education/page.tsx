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
    title: "Education & Certifications",
    description:
      "Education background and online learning achievements of Omid, including university degrees and programming courses.",
    ...(isLocale(locale)
      ? { alternates: seoAlternates("education", locale) }
      : {}),
  };
}

const EDUCATION = {
  en: [
    {
      years: "2010 — 2014",
      degree: "BA — Translation Studies",
      institution: "Shahid Chamran University of Ahvaz",
      detail: "English ↔ Persian",
    },
    {
      years: "2015 — 2017",
      degree: "MA — Translation Studies",
      institution: "Allameh Tabatabaei University",
      detail: "3 semesters completed",
    },
    {
      years: "ONGOING",
      degree: "Online Courses & Self-Study",
      institution: "Udemy · Dr. Chuck Severance",
      detail: "Python, Web Development, self-taught frontend",
    },
  ],
  fa: [
    {
      years: "۲۰۱۰ — ۲۰۱۴",
      degree: "کارشناسی — مطالعات ترجمه",
      institution: "دانشگاه شهید چمران اهواز",
      detail: "انگلیسی ↔ فارسی",
    },
    {
      years: "۲۰۱۵ — ۲۰۱۷",
      degree: "کارشناسی ارشد — مطالعات ترجمه",
      institution: "دانشگاه علامه طباطبایی",
      detail: "۳ نیم‌سال گذرانده شده",
    },
    {
      years: "در جریان",
      degree: "دوره‌های آنلاین و خودآموزی",
      institution: "یودمی · دکتر چاک سِورنس",
      detail: "پایتون، توسعه وب، فرانت‌اند خودآموخته",
    },
  ],
} as const;


export function generateStaticParams() {
  return [{ locale: "en" }, { locale: "fa" }];
}

export default async function EducationPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale: raw } = await params;
  const locale = (isLocale(raw) ? raw : "en") as Locale;
  const t = getDict(locale);
  const items = EDUCATION[locale];

  return (
    <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
      <Reveal>
        <p className="label mb-3">{t.education.kicker}</p>
        <h1 className="font-display text-[clamp(2.5rem,8vw,6rem)] font-bold uppercase leading-none tracking-tight">
          <ScrambleText text={t.education.title} />
          <span className="text-accent">.</span>
        </h1>
        <p className="mt-4 max-w-lg text-muted">{t.education.intro}</p>
      </Reveal>

      <div className="mt-16">
        {items.map((item, i) => (
          <Reveal key={item.degree} delay={i * 70}>
            <article className="group grid grid-cols-1 gap-x-10 gap-y-2 border-t border-line py-9 transition-colors duration-300 last:border-b hover:bg-panel/40 md:grid-cols-[10rem_1fr_1fr]">
              <span className="font-mono text-xs leading-relaxed text-muted transition-colors group-hover:text-accent">
                {item.years}
              </span>
              <div>
                <h2 className="text-2xl font-semibold tracking-tight transition-transform duration-300 group-hover:translate-x-2 rtl:group-hover:-translate-x-2 sm:text-3xl">
                  {item.degree}
                </h2>
                <p className="mt-1 text-sm text-muted">{item.institution}</p>
              </div>
              <p className="self-center font-mono text-xs uppercase tracking-wider text-muted">
                {item.detail}
              </p>
            </article>
          </Reveal>
        ))}
      </div>
    </div>
  );
}
