import type { Metadata } from "next";
import Reveal from "@/components/Reveal";
import ScrambleText from "@/components/ScrambleText";
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
    <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
      <Reveal>
        <p className="label mb-3">{t.blog.kicker}</p>
        <h1 className="font-display text-[clamp(2.5rem,8vw,6rem)] font-bold uppercase leading-none tracking-tight">
          <ScrambleText text={t.blog.title} />
          <span className="text-accent">.</span>
        </h1>
        <p className="mt-4 max-w-lg text-muted">{t.blog.intro}</p>
      </Reveal>

      {/* Prerendered list refreshes from MySQL via /api/get_posts.php */}
      <BlogListLive locale={locale} initial={posts} />
    </div>
  );
}
