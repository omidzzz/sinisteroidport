import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import PageHero from "@/components/ui/PageHero";
import Reveal from "@/components/ui/Reveal";
import { getAllPosts } from "@/lib/blog/repository";
import { getPostMeta } from "@/lib/blog/meta";
import { formatPostDate } from "@/lib/blog/format";
import { isLocale, loc, type Locale } from "@/lib/i18n";
import { seoAlternates, SITE } from "@/lib/seo";
import { normalizeTags, tagLabel, usedTags } from "@/lib/tags";
import { JsonLd } from "@/components/ui/JsonLd";
import {
  breadcrumbJsonLd,
  itemListJsonLd,
} from "@/lib/schema";

interface Props {
  params: Promise<{ locale: string; tag: string }>;
}

export function generateStaticParams() {
  const tags = usedTags(getAllPosts()).map((t) => t.slug);
  return ["en", "fa"].flatMap((locale) =>
    tags.map((tag) => ({ locale, tag }))
  );
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale: raw, tag } = await params;
  if (!isLocale(raw)) return {};
  const locale = raw as Locale;
  if (!usedTags(getAllPosts()).some((t) => t.slug === tag)) return {};
  const label = tagLabel(tag, locale);
  return {
    title: locale === "fa" ? `نوشته‌های «${label}»` : `Posts tagged “${label}”`,
    description:
      locale === "fa"
        ? `همهٔ نوشته‌های موضوع «${label}» در وب‌لاگ امید — توسعه فرانت‌اند، هوش مصنوعی محلی و آینده جست‌وجو.`
        : `Every post on “${label}” in Omid's writing — frontend development, local AI, and the shifting landscape of search.`,
    alternates: seoAlternates(`tags/${tag}`, locale),
  };
}

export default async function TagPage({ params }: Props) {
  const { locale: raw, tag } = await params;
  if (!isLocale(raw)) notFound();
  const locale = raw as Locale;
  if (!usedTags(getAllPosts()).some((t) => t.slug === tag)) notFound();

  const label = tagLabel(tag, locale);
  const posts = getAllPosts().filter((p) =>
    normalizeTags(p.tags).includes(tag)
  );

  return (
    <div className="mx-auto max-w-6xl px-5 pt-28 sm:px-8">
      <JsonLd
        data={[
          breadcrumbJsonLd([
            {
              name: locale === "fa" ? "خانه" : "Home",
              url: `${SITE}/${locale}/`,
            },
            {
              name: locale === "fa" ? "موضوع‌ها" : "Topics",
              url: `${SITE}/${locale}/tags/`,
            },
            { name: label, url: `${SITE}/${locale}/tags/${tag}/` },
          ]),
          itemListJsonLd(
            posts.map((p) => ({
              name: getPostMeta(p, locale).title,
              description: getPostMeta(p, locale).excerpt,
              url: `${SITE}/${locale}/blog/${p.slug}/`,
            })),
            locale
          ),
        ]}
      />
      <Reveal>
        <PageHero
          index={locale === "fa" ? "۰۷" : "07"}
          kicker={
            locale === "fa" ? "(۰۷) موضوع" : "(07) Topic"
          }
          title={label}
          intro={
            locale === "fa"
              ? `${posts.length} نوشته در موضوع «${label}».`
              : `${posts.length} ${posts.length === 1 ? "post" : "posts"} on ${label}.`
          }
        />
      </Reveal>
      <section className="cv-auto mt-14 pb-24">
        {posts.map((p) => {
          const m = getPostMeta(p, locale);
          return (
            <Link
              key={p.slug}
              href={loc(locale, `/blog/${p.slug}`)}
              className="group flex flex-col gap-1 border-t border-line py-5 transition-colors last:border-b hover:bg-panel/40 sm:flex-row sm:items-baseline sm:justify-between sm:gap-8"
            >
              <span
                className="w-28 shrink-0 font-mono text-xs text-muted"
                dir="ltr"
              >
                {formatPostDate(m.date)}
              </span>
              <span className="flex-1 text-lg font-medium tracking-tight transition-colors duration-300 group-hover:text-accent sm:text-xl">
                {m.isFallback && (
                  <span className="label me-2 align-middle">
                    {locale === "fa"
                      ? "— به انگلیسی منتشر شده"
                      : "— published in English"}
                  </span>
                )}
                {m.title}
              </span>
            </Link>
          );
        })}
      </section>
    </div>
  );
}
