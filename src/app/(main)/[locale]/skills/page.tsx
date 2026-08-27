import type { Metadata } from "next";
import Reveal from "@/components/Reveal";
import ScrambleText from "@/components/ScrambleText";
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

/**
 * Rating ticks (out of 5) — values are the exact ones from the
 * reference build.
 */
function Ticks({ level }: { level: number }) {
  return (
    <span className="flex items-center gap-1" aria-label={`${level} out of 5`} dir="ltr">
      {Array.from({ length: 5 }, (_, i) => (
        <span
          key={i}
          className={`h-[3px] w-5 ${i < level ? "bg-accent" : "bg-line"}`}
        />
      ))}
      <span className="ml-2 font-mono text-[0.65rem] text-muted">
        {String(level).padStart(2, "0")}
      </span>
    </span>
  );
}


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

  return (
    <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
      <Reveal>
        <p className="label mb-3">{t.skills.kicker}</p>
        <h1 className="font-display text-[clamp(2.5rem,8vw,6rem)] font-bold uppercase leading-none tracking-tight">
          <ScrambleText text={t.skills.title} />
          <span className="text-accent">.</span>
        </h1>
        <p className="mt-4 max-w-lg text-muted">{t.skills.intro}</p>
      </Reveal>

      <div className="mt-16 space-y-20">
        {skillsData.map((group) => (
          <section key={group.category}>
            <Reveal>
              <div className="mb-4 flex items-baseline justify-between border-b border-line pb-3">
                <h2 className="font-mono text-sm uppercase tracking-[0.18em] text-accent">
                  / {locale === "fa" ? CATEGORY_FA[group.category] ?? group.category : group.category}
                </h2>
                <span className="label">
                  {group.skills.length} {t.skills.skillsCount}
                </span>
              </div>
            </Reveal>
            <ul>
              {group.skills.map((skill) => (
                <Reveal key={skill.name}>
                  <li className="group flex items-baseline justify-between gap-6 border-b border-line/60 py-3.5 transition-colors hover:bg-panel/40">
                    <span className="text-base tracking-tight transition-transform duration-300 group-hover:translate-x-2 rtl:group-hover:-translate-x-2 sm:text-lg">
                      {skill.name}
                    </span>
                    <Ticks level={skill.level} />
                  </li>
                </Reveal>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </div>
  );
}
