"use client";

import { useEffect, useState } from "react";
import type { Post } from "@/lib/posts";
import BlogPostLive from "./BlogPostLive";
import { postTitle } from "@/lib/post-helpers";
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

  if (status === "ready" && post) {
    // The single article renderer — identical to prerendered posts.
    return <BlogPostLive locale={locale} post={post} />;
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