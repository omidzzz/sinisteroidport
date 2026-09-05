"use client";

import { useEffect, useState } from "react";
import type { Post } from "@/lib/blog/types";
import BlogPostLive from "./BlogPostLive";
import { postTitle } from "@/lib/blog/format";
import { getAllLivePosts, getLivePost } from "@/lib/blog/live";
import { getRelatedPosts } from "@/lib/blog/related";
import { blogPostingJsonLd } from "@/lib/schema";
import { SITE } from "@/lib/seo";
import type { Locale } from "@/lib/i18n";

type Status = "loading" | "ready" | "missing" | "error";

/**
 * Extract the post slug from the current URL (/en/blog/<slug>/ or
 * /fa/blog/<slug>/). Used by the dynamic shell, which is served by
 * api/post.php (which internally serves the prerendered /blog/live/
 * React shell at the ORIGINAL pretty URL — so the pathname still
 * carries the real slug). Falls back to the ?p= query parameter.
 */
function slugFromPathname(locale: Locale): string | null {
  if (typeof window === "undefined") return null;
  const q = new URLSearchParams(window.location.search).get("p");
  if (q) return q;
  const marker = `/${locale}/blog/`;
  const i = window.location.pathname.indexOf(marker);
  if (i === -1) return null;
  const rest = window.location.pathname.slice(i + marker.length);
  const slug = decodeURIComponent(rest.replace(/\/+$/, "").split("/")[0]);
  return slug || null;
}

/**
 * Client-side loader for database-only posts. Fetches the article from
 * /api/get_post.php and hands it to BlogPostLive — the SAME renderer
 * every prerendered post uses — so all blogposts share one style, one
 * TOC, one reading-progress bar, one cursor, one navbar. There is a
 * single source of truth for the article UI.
 */
export default function BlogPostDynamic({ locale }: { locale: Locale }) {
  const [status, setStatus] = useState<Status>("loading");
  const [post, setPost] = useState<Post | null>(null);
  // Full published list from /api/get_posts.php — used to rank the
  // "Related reading / Next transmission" block for DB-only posts with the
  // exact same logic the prerendered pages use (lib/blog/related).
  const [allPosts, setAllPosts] = useState<Post[]>([]);

  useEffect(() => {
    let cancelled = false;
    const slug = slugFromPathname(locale);
    if (!slug) {
      setStatus("missing");
      return;
    }
    // getLivePost dedupes with the parse-time preload (see live-post.ts),
    // so the article is fetched exactly once even though BlogPostLive also
    // refreshes the same slug after mounting.
    getLivePost(slug).then((data) => {
      if (cancelled) return;
      if (!data) {
        setStatus("error");
        return;
      }
      if (!data.translations) {
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
    });
    // Related posts are ranked from the live list so DB-only articles get
    // the same "Related reading / Next transmission" block as static ones.
    getAllLivePosts().then((rows) => {
      if (cancelled || !rows) return;
      setAllPosts(rows);
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

  /* DB-only posts get no server-rendered BlogPosting JSON-LD: the shell is
     prerendered before the post exists, and blog-post-template.php must
     never ADD head nodes (hydration contract). Injecting here — after
     hydration, once the article is fetched — is safe and gives search
     engines (which render JS) the same structured data prerendered posts
     ship, including authored SEO keywords ahead of the tag taxonomy. */
  useEffect(() => {
    if (!post) return;
    const translation = post.translations?.[locale] ?? post.translations?.en;
    const seo = translation?.seo;
    const focus = seo?.focusKeyword?.trim();
    const authored = (seo?.keywords ?? "")
      .split(/[,،]/)
      .map((k) => k.trim())
      .filter(Boolean);
    const extraKeywords = [
      ...(focus ? [focus] : []),
      ...authored,
    ].filter((k, i, arr) => arr.indexOf(k) === i);
    const src = post.featuredImage?.src;
    const imageUrl = src
      ? /^https?:\/\//i.test(src)
        ? src
        : `${SITE}${src.startsWith("/") ? "" : "/"}${src}`
      : undefined;
    const payload = blogPostingJsonLd(post, locale, {
      title: postTitle(post, locale),
      excerpt: translation?.excerpt ?? "",
      imageUrl,
      extraKeywords,
    });
    const script = document.createElement("script");
    script.type = "application/ld+json";
    script.dataset.dynamicPost = "true";
    // Same "<" escaping convention as the <JsonLd> SSR component.
    script.textContent = JSON.stringify(payload).replace(/</g, "\\u003c");
    document.head.appendChild(script);
    return () => {
      script.remove();
    };
  }, [post, locale]);

  if (status === "ready" && post) {
    // The single article renderer — identical to prerendered posts. DB-only
    // articles get their "Related reading / Next transmission" block ranked
    // from the live published list (same helper the SSR pages use).
    const related = getRelatedPosts(post, allPosts, 3);
    return <BlogPostLive locale={locale} post={post} related={related} />;
  }
  return <ShellNotice locale={locale} status={status} />;
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
      <article className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
        <p className="mt-10 animate-pulse font-mono text-xs uppercase tracking-[0.2em] text-muted">
          {locale === "fa" ? "در حال بارگذاری…" : "loading…"}
        </p>
      </article>
    );
  }
  return (
    <article className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
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
    </article>
  );
}