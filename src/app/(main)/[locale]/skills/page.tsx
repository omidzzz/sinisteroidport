import type { Metadata } from "next";
import PageHero from "@/components/ui/PageHero";
import Reveal from "@/components/ui/Reveal";
import { getDict, isLocale, type Locale } from "@/lib/i18n";
import skillsData from "@/data/skills.json";
import { seoAlternates } from "@/lib/seo";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  return {
    title: "Skills & Competencies",
    description:
      "Explore the technical skills and competencies of Omid, including frameworks, tools, and technologies.",
    ...(isLocale(locale)
      ? { alternates: seoAlternates("skills", locale) }
      : {}),
  };
}

const CATEGORY_FA: Record<string, string> = {
  "Frontend Development": "توسعه فرانت‌اند",
  "Backend Development": "توسعه بک‌اند",
  Styling: "استایل‌دهی",
  CMS: "سیستم‌های مدیریت محتوا",
  "Database Expertise": "پایگاه داده",
  "Tools & Workflow": "ابزارها و گردش کار",
  "AI Prompting": "مهندسی پرامپت هوش مصنوعی",
  "Media Editing": "ویرایش رسانه",
  "Social Skills": "مهارت‌های اجتماعی",
};

export function generateStaticParams() {
  return [{ locale: "en" }, { locale: "fa" }];
}

export default async function SkillsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale: raw } = await params;
  const locale = (isLocale(raw) ? raw : "en") as Locale;
  const t = getDict(locale);
  const total = skillsData.reduce((n, g) => n + g.skills.length, 0);

  return (
    <div className="mx-auto max-w-6xl px-5 pt-28 sm:px-8">
      <Reveal>
        <PageHero
          index={locale === "fa" ? "۰۳" : "03"}
          kicker={t.skills.kicker}
          title={t.skills.title}
          intro={t.skills.intro}
          stats={[
            { n: String(total), label: t.skills.skillsCount },
            { n: String(skillsData.length), label: locale === "fa" ? "دسته" : "groups" },
          ]}
        />
      </Reveal>

      <div className="mt-4">
        {skillsData.map((group, gi) => (
          <section key={group.category} className="skill-cat">
            <Reveal>
              <div className="skill-cat-head">
                <h2 className="skill-cat-name">
                  {locale === "fa" ? CATEGORY_FA[group.category] ?? group.category : group.category}
                </h2>
                <span className="skill-cat-count">
                  {group.skills.length} {t.skills.skillsCount}
                </span>
              </div>
            </Reveal>
            <div className="skill-grid">
              {group.skills.map((skill, si) => (
                <Reveal key={skill.name} delay={(si % 6) * 40}>
                  <div className="skill-cell">
                    <span className="skill-cell-name">{skill.name}</span>
                    <span className="skill-orbit" aria-label={`${skill.level} out of 5`} dir="ltr">
                      {Array.from({ length: 5 }, (_, i) => (
                        <i key={i} className={i < skill.level ? "on" : ""} />
                      ))}
                    </span>
                  </div>
                </Reveal>
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}