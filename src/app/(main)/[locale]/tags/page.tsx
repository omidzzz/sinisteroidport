import type { Metadata } from "next";
import Link from "next/link";
import PageHero from "@/components/PageHero";
import Reveal from "@/components/Reveal";
import { getAllPosts } from "@/lib/posts";
import { isLocale, loc, type Locale } from "@/lib/i18n";
import { seoAlternates, SITE } from "@/lib/seo";
import { tagLabel, usedTags } from "@/lib/tags";
import { JsonLd, breadcrumbJsonLd } from "@/lib/schema";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  return {
    title: locale === "fa" ? "موضوع‌ها" : "Topics",
    description:
      locale === "fa"
        ? "مرور نوشته‌ها بر اساس موضوع — هوش مصنوعی محلی، عامل‌های کدنویسی، سئو و GEO، فرانت‌اند و طراحی."
        : "Browse the writing by topic — local AI, AI coding agents, SEO & GEO, frontend and design.",
    alternates: seoAlternates("tags", locale),
  };
}

export function generateStaticParams() {
  return [{ locale: "en" }, { locale: "fa" }];
}

export default async function TagsIndexPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale: raw } = await params;
  if (!isLocale(raw)) return null;
  const locale = raw as Locale;
  const tags = usedTags(getAllPosts());

  return (
    <div className="mx-auto max-w-6xl px-5 pt-28 sm:px-8">
      <JsonLd
        data={breadcrumbJsonLd([
          { name: locale === "fa" ? "خانه" : "Home", url: `${SITE}/${locale}/` },
          {
            name: locale === "fa" ? "موضوع‌ها" : "Topics",
            url: `${SITE}/${locale}/tags/`,
          },
        ])}
      />
      <Reveal>
        <PageHero
          index={locale === "fa" ? "۰۷" : "07"}
          kicker={
            locale === "fa" ? "(۰۷) فهرست موضوعی" : "(07) Topic index"
          }
          title={locale === "fa" ? "موضوع‌ها" : "TOPICS"}
          intro={
            locale === "fa"
              ? "نوشته‌ها بر اساس موضوع مرتب شده‌اند."
              : "Every post, grouped by the topics it belongs to."
          }
        />
      </Reveal>
      <section className="cv-auto mt-14 pb-24">
        {tags.map((tag) => (
          <Link
            key={tag.slug}
            href={loc(locale, `/tags/${tag.slug}`)}
            className="group flex items-baseline justify-between gap-6 border-t border-line py-5 transition-colors last:border-b hover:bg-panel/40"
          >
            <span className="text-lg font-medium tracking-tight transition-colors duration-300 group-hover:text-accent sm:text-xl">
              {tagLabel(tag.slug, locale)}
            </span>
            <span className="font-mono text-xs text-muted" dir="ltr">
              /{tag.slug}/
            </span>
          </Link>
        ))}
      </section>
    </div>
  );
}
