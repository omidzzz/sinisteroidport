import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import PageHero from "@/components/ui/PageHero";
import Reveal from "@/components/ui/Reveal";
import { getAllPosts } from "@/lib/blog/repository";
import { getPostMeta } from "@/lib/blog/meta";
import {
  formatPostDate,
  postDateKey,
} from "@/lib/blog/format";
import { isLocale, loc, type Locale } from "@/lib/i18n";
import { seoAlternates, SITE } from "@/lib/seo";
import {
  normalizeTags,
  tagLabel,
  tagLead,
  usedTags,
} from "@/lib/tags";
import { ArrowIcon } from "@/components/ui/icons";
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
  const lead = tagLead(tag, locale);
  const posts = getAllPosts().filter((p) =>
    normalizeTags(p.tags).includes(tag)
  );
  // Reading order = oldest first, so the hub reads like a course: start at
  // the foundation and climb to the newest takes on the topic.
  const reading = [...posts].sort((a, b) =>
    postDateKey(a.date).localeCompare(postDateKey(b.date))
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
              ? `${posts.length} نوشته در موضوع «${label}».
${lead}`
              : `${posts.length} ${posts.length === 1 ? "post" : "posts"} on ${label}.
${lead}`
          }
        />
      </Reveal>
      <Reveal>
        <nav
          aria-label={locale === "fa" ? "ترتیب خواندن" : "Reading order"}
          className="mt-10 flex flex-wrap items-center gap-2 border-y border-line py-3"
        >
          <span className="label">
            {locale === "fa" ? "(ترتیب خواندن)" : "(Reading order)"}
          </span>
          <span className="h-px w-8 bg-line" aria-hidden />
          <span className="font-mono text-[0.62rem] text-muted" dir="ltr">
            {posts.length > 1
              ? (locale === "fa" ? "از پایه → تازه" : "foundation → latest")
              : (locale === "fa" ? "تکی" : "solo")}
          </span>
        </nav>
      </Reveal>
      <section className="cv-auto mt-6 pb-24">
        {reading.map((p, i) => {
          const m = getPostMeta(p, locale);
          return (
            <Link
              key={p.slug}
              href={loc(locale, `/blog/${p.slug}`)}
              className="group flex flex-col gap-1.5 border-t border-line py-5 transition-colors last:border-b hover:bg-panel/40 sm:flex-row sm:items-center sm:gap-8"
            >
              <span
                className="w-14 shrink-0 font-mono text-lg text-muted"
                dir="ltr"
              >
                {String(i + 1).padStart(2, "0")}
              </span>
              <span
                className="w-28 shrink-0 font-mono text-xs text-muted"
                dir="ltr"
              >
                {formatPostDate(m.date)}
              </span>
              <span className="min-w-0 flex-1">
                <span className="flex flex-wrap items-baseline gap-2 text-lg font-medium tracking-tight transition-colors duration-300 group-hover:text-accent sm:text-xl">
                  {i === 0 && posts.length > 1 && (
                    <span className="label me-1 shrink-0 text-acid">
                      {locale === "fa" ? "از اینجا شروع کنید" : "Start here"}
                    </span>
                  )}
                  {m.title}
                  {m.isFallback && (
                    <span className="label ms-1 text-muted">
                      {locale === "fa" ? "— به انگلیسی" : "— in English"}
                    </span>
                  )}
                </span>
                {m.excerpt && (
                  <span className="mt-1 line-clamp-2 block text-sm leading-relaxed text-muted">
                    {m.excerpt}
                  </span>
                )}
              </span>
              <ArrowIcon className="size-4 shrink-0 text-muted transition-all duration-300 group-hover:translate-x-1 group-hover:text-acid rtl:-scale-x-100 rtl:group-hover:-translate-x-1" />
            </Link>
          );
        })}
      </section>
    </div>
  );
}
