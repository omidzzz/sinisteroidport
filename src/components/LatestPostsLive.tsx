"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import ScrambleText from "./ScrambleText";
import type { Post } from "@/lib/posts";
import {
  isFallbackTranslation,
  postTitle,
} from "@/lib/post-helpers";
import { loc, type Locale } from "@/lib/i18n";
import { ArrowIcon } from "./icons";

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
    fetch("/api/get_posts.php")
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error("not ok"))))
      .then((rows: ApiRow[]) => {
        if (cancelled || !Array.isArray(rows)) return;
        const usable = rows.filter((r) => r && r.slug);
        if (!usable.length) return;
        const latest = [...usable]
          .sort(
            (a, b) =>
              new Date(b.date ?? 0).getTime() - new Date(a.date ?? 0).getTime()
          )
          .slice(0, 3)
          .map((r) => ({
            ...r,
            // API rows may omit the cover — keep the prerendered one by slug
            featuredImage: r.featuredImage ??
              initial.find((p) => p.slug === r.slug)?.featuredImage,
          }));
        setItems(latest as unknown as Post[]);
      })
      .catch(() => {
        /* keep prerendered/fallback data */
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="post-strip" dir="auto">
      {items.map((post, i) => {
        const title = postTitle(post, locale);
        const cover = post.featuredImage?.src || "";
        const fallback = isFallbackTranslation(post, locale);
        const date = post.date
          ? new Date(post.date).toISOString().slice(0, 10)
          : "";
        return (
          <Link
            key={post.slug}
            href={loc(locale, `/blog/${post.slug}`)}
            className="post-card group"
          >
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
          </Link>
        );
      })}
    </div>
  );
}