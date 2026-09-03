import type { Metadata } from "next";
import { notFound } from "next/navigation";
import BlogPostDynamic from "@/components/BlogPostDynamic";
import { isLocale, type Locale } from "@/lib/i18n";

interface Props {
  params: Promise<{ locale: string }>;
}

/**
 * Dynamic-shell route for blog posts that exist ONLY in MySQL (published
 * through /api/admin.php after the last static export).
 *
 * The .htaccess rewrite sends any /{locale}/blog/<slug>/ that has no
 * pre-rendered folder here; the shell then loads the article client-side
 * from /api/get_post.php. This keeps host-published posts clickable
 * without rebuilding and redeploying the static site.
 *
 * NOTE: `live` acts as a reserved slug — although an actual post with
 * that slug would still win, because the rewrite only fires when no
 * static folder exists.
 */

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale: raw } = await params;
  const locale: Locale = isLocale(raw) ? raw : "en";
  return {
    title: locale === "fa" ? "نوشته‌ها — سینیسترویید" : "Writing — Sinisteroid",
    description:
      locale === "fa"
        ? "نوشته‌ای از وبلاگ سینیسترویید."
        : "An article from the Sinisteroid blog.",
    /* Placeholder exists ONLY so the prerendered shell carries a
       <meta name="keywords"> element. blog-post-template.php swaps its
       content per DB post (the hydration contract forbids ADDING head
       nodes, so the element must already exist). Direct visits to the
       reserved /blog/live/ route show this placeholder; every real
       DB-published post gets its authored keywords swapped in. */
    keywords: "Sinisteroid",
  };
}

export default async function DynamicBlogPostPage({ params }: Props) {
  const { locale: raw } = await params;
  if (!isLocale(raw)) notFound();
  return <BlogPostDynamic locale={raw} />;
}
