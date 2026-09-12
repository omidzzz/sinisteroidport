import type { Metadata } from "next";
import Link from "next/link";
import PageHero from "@/components/ui/PageHero";
import Reveal from "@/components/ui/Reveal";
import BlogListLive from "@/components/blog/BlogListLive";
import PostsCountStat from "@/components/blog/PostsCountStat";
import { getAllPosts } from "@/lib/blog/repository";
import { getDict, isLocale, loc, type Locale } from "@/lib/i18n";
import { seoAlternates } from "@/lib/seo";
import { normalizeTags, tagLabel, usedTags } from "@/lib/tags";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const fa = isLocale(locale) && locale === "fa";
  return {
    title: fa ? "نوشته‌ها" : "Writing",
    // Editorial line MUST match the actual content — the post archive is
    // AI coding agents, local AI tooling, SEO/GEO and content strategy,
    // not branding/visual-communication topics. Misaligned SERP copy
    // signals "wrong page" and kills click-through on the index.
    description: fa
      ? "مقاله‌ها درباره عامل‌های کدنویسی هوش مصنوعی، هوش مصنوعی محلی، سئو و GEO، استراتژی محتوا و طراحی فرانت‌اند — یادداشت‌های عملی برای توسعه‌دهنده‌ها در دنیای جست‌وجو و هوش مصنوعی."
      : "Essays on AI coding agents, local AI tooling, SEO & GEO, content strategy, and frontend design — practical notes for developers navigating the shifting landscape of search and AI.",
    ...(isLocale(locale)
      ? { alternates: seoAlternates("blog", locale) }
      : {}),
  };
}

export function generateStaticParams() {
  return [{ locale: "en" }, { locale: "fa" }];
}

export default async function BlogPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale: raw } = await params;
  const locale = (isLocale(raw) ? raw : "en") as Locale;
  const fa = locale === "fa";
  const t = getDict(locale);
  const posts = getAllPosts();
  const topics = usedTags(posts).map((tag) => ({
    slug: tag.slug,
    label: tagLabel(tag.slug, locale),
    count: posts.filter((p) => normalizeTags(p.tags).includes(tag.slug)).length,
  }));

  return (
    <div className="mx-auto max-w-6xl px-5 pt-28 sm:px-8">
      <Reveal>
        <PageHero
          index={locale === "fa" ? "۰۶" : "06"}
          kicker={t.blog.kicker}
          title={t.blog.title}
          intro={t.blog.intro}
          stats={[
            {
              n: <PostsCountStat initial={posts.length} />,
              label: locale === "fa" ? "نوشته" : "issues",
            },
          ]}
        />
      </Reveal>
      {topics.length > 0 && (
        /* Topic filter — every tag hub is one click from the index, which
            deepens the crawl path and routes readers straight into a cluster. */
        <nav
          aria-label={fa ? "مرور بر اساس موضوع" : "Browse by topic"}
          className="mt-10 flex flex-wrap items-center gap-2 border-y border-line py-3"
        >
          <span className="label">
            {fa ? "(موضوع‌ها)" : "(Topics)"}
          </span>
          <span className="h-px w-8 bg-line" aria-hidden />
          {topics.map((topic) => (
            <Link
              key={topic.slug}
              href={loc(locale, `/tags/${topic.slug}`)}
              className="bento-tag transition-colors duration-300 hover:text-accent"
            >
              <span dir="ltr" className="me-1 font-mono text-[0.56rem]">
                {String(topic.count).padStart(2, "0")}
              </span>
              {topic.label}
            </Link>
          ))}
        </nav>
      )}
      {/* Prerendered list refreshes from MySQL via /api/get_posts.php */}
      <BlogListLive locale={locale} initial={posts} />
    </div>
  );
}