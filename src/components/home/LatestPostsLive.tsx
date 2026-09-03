"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import ScrambleText from "../ui/ScrambleText";
import type { Post } from "@/lib/posts";
import {
  isFallbackTranslation,
  postTitle,
  postDateKey,
} from "@/lib/post-helpers";
import { loc, type Locale } from "@/lib/i18n";
import { ArrowIcon } from "../ui/icons";

/** Shape returned by /api/get_posts.php (subset of our Post). */
type ApiRow = {
  slug: string;
  date?: string;
  featuredImage?: Post["featuredImage"];
  translations?: Post["translations"];
};

/**
 * Home-page "Latest writings" — a horizontal, snap-scrolling strip of cards.
 * Prerendered from the content snapshot for SEO, then refreshed from MySQL via
 * /api/get_posts.php so newly published posts appear without rebuilding.
 */
export default function LatestPostsLive({
  locale,
  initial,
}: {
  locale: Locale;
  initial: Post[];
}) {
  const [items, setItems] = useState<Post[]>(initial);

  useEffect(() => {
    let cancelled = false;
    const start = () => {
      if (cancelled) return;
      fetch("/api/get_posts.php")
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error("not ok"))))
      .then((rows: ApiRow[]) => {
        if (cancelled || !Array.isArray(rows)) return;
        const usable = rows.filter((r) => r && r.slug);
        if (!usable.length) return;
        const latest = [...usable]
          .sort(
            (a, b) =>
              // String compare of "YYYY-MM-DD" keys — matches the build-side
              // ordering and is timezone-independent (no Date parsing).
              postDateKey(b.date).localeCompare(postDateKey(a.date))
          )
          .slice(0, 3)
          .map((r) => ({
            ...r,
            // API rows may omit the cover — keep the prerendered one by slug
            featuredImage: r.featuredImage ??
              initial.find((p) => p.slug === r.slug)?.featuredImage,
          }));
        setItems(latest as unknown as Post[]);
        // Broadcast the live published-count so hero stats stay in sync
        window.dispatchEvent(
          new CustomEvent("posts-synced", { detail: usable.length })
        );
      })
      .catch(() => {
        /* keep prerendered/fallback data */
      });
    };
    // The prerendered strip is already on screen — defer the live sync off
    // the hydration/LCP path until the main thread is idle (2.5s hard cap
    // so busy CPUs still sync eventually).
    if (typeof window.requestIdleCallback === "function") {
      const id = window.requestIdleCallback(start, { timeout: 2500 });
      return () => {
        cancelled = true;
        window.cancelIdleCallback(id);
      };
    }
    const t = window.setTimeout(start, 1200);
    return () => {
      cancelled = true;
      window.clearTimeout(t);
    };
  }, []);

  const staticSlugs = new Set(initial.map((p) => p.slug));

  return (
    <div className="post-strip" dir="auto">
      {items.map((post, i) => {
        const title = postTitle(post, locale);
        const cover = post.featuredImage?.src || "";
        const fallback = isFallbackTranslation(post, locale);
        const date = postDateKey(post.date);
        const href = loc(locale, `/blog/${post.slug}`);
        const isStatic = staticSlugs.has(post.slug);
        const cls = "post-card group";
        const card = (
          <>
            {cover && (
              <div className="bento-frame post-thumb">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={cover}
                  alt=""
                  width={424}
                  height={240}
                  decoding="async"
                  loading="lazy"
                  onError={(e) =>
                    (e.currentTarget.closest(".post-thumb") as HTMLElement | null)?.classList.add(
                      "no-cover"
                    )
                  }
                />
                <span aria-hidden className="bento-scan" />
              </div>
            )}
            <span className="post-card-date">
              <span dir="ltr">{date || `00${i + 1}`}</span>
              <ArrowIcon className="transition-transform duration-300 group-hover:translate-x-1 rtl:-scale-x-100 rtl:group-hover:-translate-x-1" />
            </span>
            {fallback && (
              <span className="label">
                {locale === "fa"
                  ? "— به انگلیسی منتشر شده"
                  : "— published in English"}
              </span>
            )}
            <span className="post-card-title">
              <ScrambleText text={title} />
            </span>
          </>
        );
        // DB-only posts (not in the static export) have no RSC payload to
        // prefetch — a plain anchor does a full load straight to the
        // server-rendered page (api/post.php) and skips the 404 prefetch.
        if (isStatic) {
          return (
            <Link key={post.slug} href={href} className={cls} prefetch>
              {card}
            </Link>
          );
        }
        return (
          <a key={post.slug} href={href} className={cls}>
            {card}
          </a>
        );
      })}
    </div>
  );
}