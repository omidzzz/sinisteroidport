"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { Post } from "@/lib/posts";
import ContentRenderer from "./ContentRenderer";
import {
  getChosenTranslation,
  isFallbackTranslation,
  postTitle,
  postExcerpt,
  formatPostDate,
} from "@/lib/post-helpers";
import { getDict, loc, type Locale } from "@/lib/i18n";
import FaqAccordion from "./FaqAccordion";

type Status = "loading" | "ready" | "missing" | "error";

/**
 * Extract the post slug from the current URL (/en/blog/<slug>/ or
 * /fa/blog/<slug>/). Used by the dynamic shell, which is served for
 * slugs that only exist in MySQL (published via /api/admin.php after
 * the last static export).
 */
function slugFromPathname(locale: Locale): string | null {
  if (typeof window === "undefined") return null;
  const marker = `/${locale}/blog/`;
  const i = window.location.pathname.indexOf(marker);
  if (i === -1) return null;
  const rest = window.location.pathname.slice(i + marker.length);
  const slug = decodeURIComponent(rest.replace(/\/+$/, "").split("/")[0]);
  return slug || null;
}

/**
 * Client-side shell for database-only posts. Fetches the article from
 * /api/get_post.php and renders it exactly like BlogPostLive does for
 * prerendered posts, so visitors never notice the difference.
 */
export default function BlogPostDynamic({ locale }: { locale: Locale }) {
  const [status, setStatus] = useState<Status>("loading");
  const [post, setPost] = useState<Post | null>(null);
  const t = getDict(locale);

  useEffect(() => {
    let cancelled = false;
    const slug = slugFromPathname(locale);
    if (!slug) {
      setStatus("missing");
      return;
    }
    fetch(`/api/get_post.php?slug=${encodeURIComponent(slug)}`)
      .then((r) =>
        r.ok ? r.json() : Promise.reject(new Error(String(r.status)))
      )
      .then((data: Post) => {
        if (cancelled) return;
        if (!data?.translations) {
          setStatus("missing");
          return;
        }
        // Hide drafts fetched straight from the DB
        if ((data.status ?? "published") === "draft") {
          setStatus("missing");
          return;
        }
        setPost(data);
        setStatus("ready");
      })
      .catch(() => {
        if (!cancelled) setStatus("error");
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Give DB-only posts a real <title> once loaded
  useEffect(() => {
    if (post) document.title = `${postTitle(post, locale)} — Sinisteroid`;
  }, [post, locale]);

  if (!post || status !== "ready") return <ShellNotice locale={locale} status={status} />;

  const translation = getChosenTranslation(post, locale)!;
  const title = postTitle(post, locale);
  const excerpt = postExcerpt(post, locale);
  const fallback = isFallbackTranslation(post, locale);
  const tags = Array.isArray(post.tags) ? post.tags : [];
  const cover =
    post.featuredImage?.src && post.featuredImage.src.trim()
      ? post.featuredImage.src
      : null;

  return (
    <ArticleShell locale={locale}>
      <time
        className="mt-8 block font-mono text-xs tracking-[0.2em] text-accent"
        dir="ltr"
      >
        {formatPostDate(post.date)}
      </time>
      <h1 className="mt-2 text-3xl font-bold leading-tight text-ink sm:text-4xl">
        {title}
      </h1>
      <p className="mt-4 text-lg leading-relaxed text-muted">{excerpt}</p>

      {fallback && (
        <p className="label mt-4 inline-block border border-line px-3 py-1">
          {t.fallbackNote}
        </p>
      )}

      {tags.length > 0 && (
        <div className="mt-5 flex flex-wrap gap-2">
          {tags.map((tag) => (
            <span
              key={tag}
              className="bg-panel px-3 py-0.5 font-mono text-xs text-muted"
            >
              #{tag}
            </span>
          ))}
        </div>
      )}

      {cover && (
        /* eslint-disable-next-line @next/next/no-img-element */
        <img
          src={cover}
          alt=""
          className="mt-8 aspect-video w-full border border-line object-cover"
        />
      )}

      <div className="mt-10">
        <ContentRenderer blocks={translation.content ?? []} />
      </div>

      {translation.faq && translation.faq.length > 0 && (
        <section className="mt-16 border-t border-line pt-10">
          <h2 className="label mb-8">
            {locale === "fa"
              ? "(سؤالات متداول)"
              : "(Frequently asked questions)"}
          </h2>
          <FaqAccordion items={translation.faq} />
        </section>
      )}
    </ArticleShell>
  );
}

/** Shared wrapper providing the back link + article layout. */
function ArticleShell({
  locale,
  children,
}: {
  locale: Locale;
  children: React.ReactNode;
}) {
  return (
    <article className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
      <Link
        href={loc(locale, "/blog")}
        className="font-mono text-xs uppercase tracking-widest text-muted transition-colors hover:text-accent"
      >
        {locale === "fa" ? "← بازگشت به نوشته‌ها" : "← Back to writing"}
      </Link>
      {children}
    </article>
  );
}

/** Loading / not-found / error states for the dynamic shell. */
function ShellNotice({
  locale,
  status,
}: {
  locale: Locale;
  status: Status;
}) {
  if (status === "loading") {
    return (
      <ArticleShell locale={locale}>
        <p className="mt-10 animate-pulse font-mono text-xs uppercase tracking-[0.2em] text-muted">
          {locale === "fa" ? "در حال بارگذاری…" : "loading…"}
        </p>
      </ArticleShell>
    );
  }
  return (
    <ArticleShell locale={locale}>
      <h1 className="mt-8 text-3xl font-bold leading-tight text-ink sm:text-4xl">
        {status === "missing"
          ? locale === "fa"
            ? "نوشته پیدا نشد"
            : "Post not found"
          : locale === "fa"
            ? "خطا در بارگذاری نوشته"
            : "Could not load this post"}
      </h1>
      <p className="mt-4 text-lg leading-relaxed text-muted">
        {status === "missing"
          ? locale === "fa"
            ? "این نوشته وجود ندارد یا حذف شده است."
            : "This post doesn't exist or has been removed."
          : locale === "fa"
            ? "دوباره تلاش کنید یا بعداً بازگردید."
            : "Please try again or come back later."}
      </p>
    </ArticleShell>
  );
}

