import type { Metadata } from "next";
import PageHero from "@/components/ui/PageHero";
import Tilt from "@/components/ui/Tilt";
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
    { years: "2010 — 2014", degree: "BA — Translation Studies", institution: "Shahid Chamran University of Ahvaz", detail: "English ↔ Persian" },
    { years: "2015 — 2017", degree: "MA — Translation Studies", institution: "Allameh Tabatabaei University", detail: "3 semesters completed" },
    { years: "ONGOING", degree: "Online Courses & Self-Study", institution: "Udemy · Dr. Chuck Severance", detail: "Python, Web Development, self-taught frontend" },
  ],
  fa: [
    { years: "۲۰۱۰ — ۲۰۱۴", degree: "کارشناسی — مطالعات ترجمه", institution: "دانشگاه شهید چمران اهواز", detail: "انگلیسی ↔ فارسی" },
    { years: "۲۰۱۵ — ۲۰۱۷", degree: "کارشناسی ارشد — مطالعات ترجمه", institution: "دانشگاه علامه طباطبایی", detail: "۳ نیم‌سال گذرانده شده" },
    { years: "در جریان", degree: "دوره‌های آنلاین و خودآموزی", institution: "یودمی · دکتر چاک سِورنس", detail: "پایتون، توسعه وب، فرانت‌اند خودآموخته" },
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
    <div className="mx-auto max-w-6xl px-5 pt-28 sm:px-8">
      <Reveal>
        <PageHero
          index={locale === "fa" ? "۰۴" : "04"}
          kicker={t.education.kicker}
          title={t.education.title}
          intro={t.education.intro}
          stats={[
            { n: String(items.length), label: locale === "fa" ? "دوره" : "records" },
            { n: "2", label: locale === "fa" ? "دانشگاه" : "universities" },
          ]}
        />
      </Reveal>

      <div className="edu-deck">
        {items.map((item, i) => (
          <Reveal key={item.degree} delay={i * 90}>
            <Tilt maxTilt={6} className="h-full">
              <article className="edu-card">
                <span className="edu-year">{item.years}</span>
                <h2 className="edu-degree">{item.degree}</h2>
                <p className="edu-detail">{item.detail}</p>
                <p className="edu-inst">{item.institution}</p>
              </article>
            </Tilt>
          </Reveal>
        ))}
      </div>
    </div>
  );
}