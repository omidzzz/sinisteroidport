"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Reveal from "./Reveal";
import ScrambleText from "./ScrambleText";
import type { Post } from "@/lib/posts";
import {
  isFallbackTranslation,
  postTitle,
} from "@/lib/post-helpers";
import { loc, type Locale } from "@/lib/i18n";

/** Shape returned by /api/get_posts.php (subset of our Post). */
type ApiRow = {
  slug: string;
  date?: string;
  translations?: Post["translations"];
};

/**
 * Home-page "Latest writings" rows. Prerendered from the content snapshot
 * for SEO, then refreshed from MySQL via /api/get_posts.php so newly
 * published posts appear without rebuilding. Keeps the exact same
 * editorial-row look as before.
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
        // Only take over when the API actually returned usable rows,
        // newest first, capped at three — same rule as the static build.
        const usable = rows.filter((r) => r && r.slug);
        if (!usable.length) return;
        const latest = [...usable]
          .sort(
            (a, b) =>
              new Date(b.date ?? 0).getTime() - new Date(a.date ?? 0).getTime()
          )
          .slice(0, 3);
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
    <>
      {items.map((post, i) => {
        const title = postTitle(post, locale);
        const fallback = isFallbackTranslation(post, locale);
        const date = post.date
          ? new Date(post.date).toISOString().slice(0, 10)
          : "";
        return (
          <Reveal key={post.slug} delay={i * 70}>
            <Link
              href={loc(locale, `/blog/${post.slug}`)}
              className="group flex flex-col gap-1 border-t border-line py-6 transition-colors hover:bg-panel/40 sm:flex-row sm:items-baseline sm:justify-between sm:gap-8"
            >
              <span
                className="w-28 shrink-0 font-mono text-xs text-muted"
                dir="ltr"
              >
                {date}
              </span>
              <span className="flex-1 text-xl font-medium tracking-tight transition-all duration-300 group-hover:text-accent sm:text-2xl">
                {fallback && (
                  <span className="label me-2 align-middle">
                    {locale === "fa"
                      ? "— به انگلیسی منتشر شده"
                      : "— published in English"}
                  </span>
                )}
                <ScrambleText text={title} />
              </span>
            </Link>
          </Reveal>
        );
      })}
    </>
  );
}
