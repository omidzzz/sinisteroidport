import type { Metadata } from "next";
import PageHero from "@/components/PageHero";
import Reveal from "@/components/Reveal";
import BlogListLive from "@/components/BlogListLive";
import { getAllPosts } from "@/lib/posts";
import { getDict, isLocale, type Locale } from "@/lib/i18n";
import { seoAlternates } from "@/lib/seo";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  return {
    title: isLocale(locale) && locale === "fa" ? "نوشته‌ها" : "Writing",
    description:
      "Explore blog posts on visual communication, branding, UX design, and performance-driven storytelling.",
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
  const t = getDict(locale);
  const posts = getAllPosts();

  return (
    <div className="mx-auto max-w-6xl px-5 pt-28 sm:px-8">
      <Reveal>
        <PageHero
          index={locale === "fa" ? "۰۶" : "06"}
          kicker={t.blog.kicker}
          title={t.blog.title}
          intro={t.blog.intro}
          stats={[
            { n: String(posts.length), label: locale === "fa" ? "نوشته" : "issues" },
          ]}
        />
      </Reveal>
      {/* Prerendered list refreshes from MySQL via /api/get_posts.php */}
      <BlogListLive locale={locale} initial={posts} />
    </div>
  );
}