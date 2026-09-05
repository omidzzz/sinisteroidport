"use client";

import { useEffect, useState } from "react";
import Reveal from "../ui/Reveal";
import { ArrowIcon } from "../ui/icons";
import type { Post } from "@/lib/blog/types";
import {
  isFallbackTranslation,
  postExcerpt,
  postTitle,
  formatPostDate,
} from "@/lib/blog/format";
import { getDict, loc, type Locale } from "@/lib/i18n";

/** Shape returned by /api/get_posts.php (subset of our Post). */
type ApiRow = {
  slug: string;
  title?: string;
  date?: string;
  tags?: string[];
  featuredImage?: Post["featuredImage"];
  translations?: Post["translations"];
};

/**
 * Blog list — an editorial "issue grid" (2-col cards with big outline index,
 * tags, excerpt). Prerendered for SEO, refreshed from the live API.
 */
export default function BlogListLive({
  locale,
  initial,
}: {
  locale: Locale;
  initial: Post[];
}) {
  const [items, setItems] = useState<Post[]>(initial);
  const t = getDict(locale);

  useEffect(() => {
    let cancelled = false;
    const start = () => {
      if (cancelled) return;
      fetch("/api/get_posts.php")
        .then((r) => (r.ok ? r.json() : Promise.reject(new Error("not ok"))))
        .then((rows: ApiRow[]) => {
          if (cancelled || !Array.isArray(rows) || !rows.length) return;
          if (rows[0] && (rows[0].translations || rows[0].slug)) {
            const synced = (rows as unknown as Post[]).map((r) => ({
              ...r,
              // API rows may omit the cover — keep the prerendered one by slug
              featuredImage:
                r.featuredImage ??
                initial.find((p) => p.slug === r.slug)?.featuredImage,
            }));
            setItems(synced);
            // Broadcast the live published-count so hero stats stay in sync
            window.dispatchEvent(
              new CustomEvent("posts-synced", { detail: synced.length })
            );
          }
        })
        .catch(() => {});
    };
    // The prerendered grid is already on screen — defer the live sync off
    // the hydration/LCP path until the main thread is idle (2.5s hard cap).
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

  return (
    // NOTE: no cv-auto here on purpose — the issue cards lift -5px on
    // hover and carry exterior glow; content-visibility's paint
    // containment would clip the top row (the "cards clipped from
    // top" bug). The grid is small enough to render eagerly.
    <div className="issue-grid">
      {items.map((post, i) => {
        const title = postTitle(post, locale);
        const excerpt = postExcerpt(post, locale);
        const date = formatPostDate(post.date);
        const fallback = isFallbackTranslation(post, locale);
        const tags = Array.isArray(post.tags) ? post.tags : [];
        const cover = post.featuredImage?.src || "";
        const href = loc(locale, `/blog/${post.slug}`);
        const cls = "issue-card group";
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
            <span className="issue-number" aria-hidden>
              {String(i + 1).padStart(2, "0")}
            </span>
            <ArrowIcon className="issue-arrow" />
            <div className="issue-meta">
              <span dir="ltr">{date}</span>
              {fallback && <span className="text-accent">{t.fallbackNote}</span>}
            </div>
            <h2 className="issue-title">{title}</h2>
            {excerpt && (
              <p className="issue-excerpt">
                {excerpt.length > 150 ? `${excerpt.slice(0, 150)}…` : excerpt}
              </p>
            )}
            {tags.length > 0 && (
              <div className="issue-tags">
                {tags.slice(0, 3).map((tag) => (
                  <i key={tag}>{tag}</i>
                ))}
              </div>
            )}
          </>
        );
        // Plain anchors — not next/link. The static-export client router has
        // been caught swallowing navigations on the issue grid (click does
        // nothing while new-tab always works); every pretty URL is served by
        // either a static index.html (internal rewrite) or api/post.php, so a
        // real navigation is always correct and matches "open in new tab".
        return (
          <Reveal key={post.slug} delay={(i % 4) * 50}>
            <a href={href} className={cls}>
              {card}
            </a>
          </Reveal>
        );
      })}
    </div>
  );
}