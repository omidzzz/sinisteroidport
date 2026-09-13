"use client";

import { useEffect, useState } from "react";
import ScrambleText from "../ui/ScrambleText";
import type { Post } from "@/lib/blog/types";
import {
  isFallbackTranslation,
  postTitle,
  postDateKey,
} from "@/lib/blog/format";
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
      // ?limit=3 — the strip only renders three cards; the unbounded payload
      // (full content_json for every post, ~475 KiB) used to land mid-load
      // and compete with the LCP image for bandwidth.
      fetch("/api/get_posts.php?limit=3")
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
    // The prerendered strip is already on screen — the live sync must never
    // compete with the LCP image for bandwidth inside the measurement window.
    // requestIdleCallback is the wrong tool: on an otherwise-fast page the
    // main thread goes idle ~2 s in (inside the PSI trace), which is exactly
    // how the multi-hundred-KiB payload used to land mid-load. Trigger on the
    // first user interaction instead (scroll / tap / key — always long before
    // anyone reaches this strip), with a 12 s wall-clock fallback so
    // read-only sessions still refresh eventually.
    const events = ["pointerdown", "keydown", "touchstart", "scroll"] as const;
    let done = false;
    const timer = window.setTimeout(() => run(), 12000);
    const run = () => {
      if (done) return;
      done = true;
      window.clearTimeout(timer);
      events.forEach((ev) => window.removeEventListener(ev, run, true));
      start();
    };
    events.forEach((ev) =>
      window.addEventListener(ev, run, { capture: true, passive: true })
    );
    return () => {
      cancelled = true;
      done = true;
      window.clearTimeout(timer);
      events.forEach((ev) => window.removeEventListener(ev, run, true));
    };
  }, []);

  return (
    <div className="post-strip" dir="auto">
      {items.map((post, i) => {
        const title = postTitle(post, locale);
        const cover = post.featuredImage?.src || "";
        const fallback = isFallbackTranslation(post, locale);
        const date = postDateKey(post.date);
        const href = loc(locale, `/blog/${post.slug}`);
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
        // Plain anchors — same reasoning as the blog issue grid: next/link's
        // client router can swallow navigations in this static export, and a
        // plain anchor navigates to the same pretty URL (static file or
        // api/post.php fallback) reliably, including new-tab.
        return (
          <a key={post.slug} href={href} className={cls}>
            {card}
          </a>
        );
      })}
    </div>
  );
}