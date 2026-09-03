import { notFound } from "next/navigation";
import type { Metadata } from "next";
import Link from "next/link";
import BlogPostLive from "@/components/blog/BlogPostLive";
import {
  getAllPosts,
  getPostBySlug,
  getPostKeywords,
  getPostMeta,
  postReadMinutes,
  postWordCount,
  ogCardSrc,
  publicAssetExists,
  type Post,
} from "@/lib/posts";
import { isLocale, loc, type Locale } from "@/lib/i18n";
import { formatPostDate } from "@/lib/post-helpers";
import { seoAlternates, SITE } from "@/lib/seo";
import {
  normalizeTags,
  tagLabel,
} from "@/lib/tags";
import { JsonLd } from "@/components/ui/JsonLd";
import {
  blogPostingJsonLd,
  breadcrumbJsonLd,
  faqJsonLd,
} from "@/lib/schema";

interface Props {
  params: Promise<{ locale: string; slug: string }>;
}

export function generateStaticParams() {
  const slugs = getAllPosts().map((post) => post.slug);
  return ["en", "fa"].flatMap((locale) =>
    slugs.map((slug) => ({ locale, slug }))
  );
}

/** Best available absolute cover URL for social cards / schema.
 * `/api/uploads/*` assets live behind the PHP API on the server (they're
 * referenced by the sitemap), everything else must exist in /public. */
function coverUrl(post: Post): string {
  const src = post.featuredImage?.src;
  if (!src) return `${SITE}/og-default.jpg`;
  if (src.startsWith("/api/uploads/") || publicAssetExists(src)) {
    return `${SITE}${src}`;
  }
  return `${SITE}/og-default.jpg`;
}

/** Schema.org expects ISO 8601 dates; legacy data may carry "YYYY-MM-DD HH:mm:ss".
 * Those strings have no timezone — converting them via new Date()/toISOString()
 * shifts the wall-clock instant and can roll the published date to the previous
 * day (schema then disagrees with the visible date). Keep naive timestamps as
 * timezone-less ISO local time instead. */
function isoDate(value: string): string {
  const m = value.match(/^(\d{4}-\d{2}-\d{2})[ T](\d{2}:\d{2}(?::\d{2})?)$/);
  if (m) return `${m[1]}T${m[2]}${m[2].length === 5 ? ":00" : ""}`;
  const t = new Date(value);
  return Number.isNaN(t.getTime()) ? value : t.toISOString();
}

/** Tag-overlap score for simple cluster-style related-post ranking. */
function relatedScore(a: Post, b: Post): number {
  const setB = new Set(b.tags ?? []);
  return (a.tags ?? []).reduce((n, t) => n + (setB.has(t) ? 1 : 0), 0);
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale: raw, slug } = await params;
  const locale: Locale = isLocale(raw) ? raw : "en";
  const post = getPostBySlug(slug);
  if (!post) return {};
  const meta = getPostMeta(post, locale);
  // Authored SEO keywords (focus keyword first) — emitted as
  // <meta name="keywords"> and merged into the BlogPosting JSON-LD.
  const keywords = getPostKeywords(post, locale);
  // Prefer the generated 1200x630 JPG card (branded, readable in every
  // share surface); fall back to the raw cover, then the default card.
  const card = ogCardSrc(slug);
  const image = card ? `${SITE}${card}` : coverUrl(post);
  // Canonical scheme is always the locale-prefixed URL — never bare URLs
  // or ?lang= variants. The per-post seo.canonical field in the JSON points
  // at legacy bare URLs and is intentionally not used here.
  return {
    title: meta.title,
    description: meta.excerpt,
    ...(keywords.length > 0 ? { keywords } : {}),
    alternates: seoAlternates(`blog/${slug}`, locale),
    openGraph: {
      title: meta.title,
      description: meta.excerpt,
      url: `https://sinisteroid.ir/${locale}/blog/${slug}/`,
      type: "article",
      publishedTime: meta.date,
      modifiedTime: isoDate(post.updated ?? meta.date),
      locale: locale === "fa" ? "fa_IR" : "en_US",
      alternateLocale: locale === "fa" ? "en_US" : "fa_IR",
      // The generated card is exactly 1200x630; raw covers vary.
      images: [
        card
          ? { url: image, width: 1200, height: 630, alt: meta.title }
          : image === `${SITE}/og-default.jpg`
            ? { url: image, width: 1200, height: 630 }
            : { url: image },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: meta.title,
      description: meta.excerpt,
      images: [image],
    },
  };
}

export default async function BlogPostPage({ params }: Props) {
  const { locale: raw, slug } = await params;
  if (!isLocale(raw)) notFound();
  const locale = raw as Locale;

  const post = getPostBySlug(slug);
  if (!post) notFound();
  // ensure the prerendered file exists
  publicAssetExists(post.featuredImage?.src);
  // Prefer the generated JPG card for schema too (same image as og:image)
  const card = ogCardSrc(slug);

  const meta = getPostMeta(post, locale);
  // Same resolution rule as generateMetadata: locale first, EN fallback.
  const keywords = getPostKeywords(post, locale);
  // Same resolution rule as BlogPostLive/getPostMeta: locale first, EN fallback
  const translation = post.translations?.[locale] ?? post.translations?.en;
  const faq = translation?.faq ?? [];

  // Cluster-style internal linking: most tag overlap wins, newest breaks ties
  const related = getAllPosts()
    .filter((p) => p.slug !== slug)
    .sort(
      (a, b) =>
        relatedScore(post, b) - relatedScore(post, a) ||
        new Date(b.date).getTime() - new Date(a.date).getTime()
    )
    .slice(0, 3);

  const jsonLd = [
    blogPostingJsonLd(post, locale, {
      title: meta.title,
      excerpt: meta.excerpt,
      imageUrl: card ? `${SITE}${card}` : coverUrl(post),
      wordCount: postWordCount(post, locale),
      readMinutes: postReadMinutes(post, locale),
      sections: normalizeTags(post.tags),
      extraKeywords: keywords,
    }),
    breadcrumbJsonLd([
      { name: locale === "fa" ? "خانه" : "Home", url: `${SITE}/${locale}/` },
      {
        name: locale === "fa" ? "نوشته‌ها" : "Writing",
        url: `${SITE}/${locale}/blog/`,
      },
      { name: meta.title, url: `${SITE}/${locale}/blog/${slug}/` },
    ]),
    ...(faq.length > 0 ? [faqJsonLd(faq)] : []),
  ];

  // Prerendered for SEO, then hydrates from MySQL via /api/get_post.php
  return (
    <>
      <JsonLd data={jsonLd} />
      <BlogPostLive locale={locale} post={post} />

      {/* Chronological prev/next — deepens the crawl path and keeps readers
          moving; newest-first list, so idx-1 is newer, idx+1 is older */}
      {(() => {
        const all = getAllPosts();
        const idx = all.findIndex((p) => p.slug === slug);
        const newer = idx > 0 ? all[idx - 1] : undefined;
        const older =
          idx >= 0 && idx < all.length - 1 ? all[idx + 1] : undefined;
        if (!newer && !older) return null;
        const label = (dir: "newer" | "older") =>
          locale === "fa"
            ? dir === "newer"
              ? "← جدیدتر"
              : "قدیمی‌تر →"
            : dir === "newer"
              ? "← Newer post"
              : "Older post →";
        return (
          <nav
            aria-label={locale === "fa" ? "سایر نوشته‌ها" : "More posts"}
            className="cv-auto mx-auto max-w-3xl px-4 pt-16 sm:px-6"
          >
            <div className="grid gap-3 sm:grid-cols-2">
              {[
                { dir: "newer" as const, p: newer },
                { dir: "older" as const, p: older },
              ].map(({ dir, p }) =>
                p ? (
                  <Link
                    key={dir}
                    href={loc(locale, `/blog/${p.slug}`)}
                    className="group border border-line p-5 transition-colors hover:border-accent/60"
                  >
                    <span className="label block">{label(dir)}</span>
                    <span className="mt-2 block text-base font-medium tracking-tight transition-colors duration-300 group-hover:text-accent sm:text-lg">
                      {getPostMeta(p, locale).title}
                    </span>
                  </Link>
                ) : (
                  <span key={dir} aria-hidden className="hidden sm:block" />
                )
              )}
            </div>
          </nav>
        );
      })()}

      {/* Server-rendered related reading — descriptive anchors over a
          topical cluster, kept outside the client-hydrated component */}
      <section className="cv-auto relative mx-auto max-w-3xl px-4 py-16 sm:px-6">
        <span aria-hidden className="x-rule" />
        <h2 className="label mb-8">
          {locale === "fa" ? "(مطالب مرتبط)" : "(Related reading)"}
        </h2>
        {related.map((p) => {
          const rm = getPostMeta(p, locale);
          return (
            <Link
              key={p.slug}
              href={loc(locale, `/blog/${p.slug}`)}
              className="group flex flex-col gap-1 border-t border-line py-5 transition-colors hover:bg-panel/40 sm:flex-row sm:items-baseline sm:justify-between sm:gap-8"
            >
              <span
                className="w-28 shrink-0 font-mono text-xs text-muted"
                dir="ltr"
              >
                {formatPostDate(rm.date)}
              </span>
              <span className="flex-1 text-lg font-medium tracking-tight transition-colors duration-300 group-hover:text-accent sm:text-xl">
                {rm.isFallback && (
                  <span className="label me-2 align-middle">
                    {locale === "fa" ? "— به انگلیسی منتشر شده" : "— published in English"}
                  </span>
                )}
                {rm.title}
              </span>
            </Link>
          );
        })}
      </section>
    </>
  );
}

