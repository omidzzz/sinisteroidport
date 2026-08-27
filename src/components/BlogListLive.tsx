"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Reveal from "./Reveal";
import { ArrowIcon } from "./icons";
import type { Post } from "@/lib/posts";
import {
  isFallbackTranslation,
  postExcerpt,
  postTitle,
  formatPostDate,
} from "@/lib/post-helpers";
import { getDict, loc, type Locale } from "@/lib/i18n";

/** Shape returned by /api/get_posts.php (subset of our Post). */
type ApiRow = {
  slug: string;
  title?: string;
  date?: string;
  tags?: string[];
  translations?: Post["translations"];
};

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
    fetch("/api/get_posts.php")
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error("not ok"))))
      .then((rows: ApiRow[]) => {
        if (cancelled || !Array.isArray(rows) || !rows.length) return;
        if (
          // only take over when the API actually returned usable rows
          rows[0] &&
          (rows[0].translations || rows[0].slug)
        ) {
          setItems(rows as unknown as Post[]);
        }
      })
      .catch(() => {
        /* keep prerendered/fallback data */
      })
      .finally(() => {
        if (!cancelled) {
          // nothing else needed
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="mt-16">
      {items.map((post, i) => {
        const title = postTitle(post, locale);
        const excerpt = postExcerpt(post, locale);
        const date = formatPostDate(post.date);
        const fallback = isFallbackTranslation(post, locale);
        const tags = Array.isArray(post.tags) ? post.tags : [];
        return (
          <Reveal key={post.slug} delay={(i % 4) * 50}>
            <Link
              href={loc(locale, `/blog/${post.slug}`)}
              className="group grid grid-cols-[auto_1fr_auto] items-baseline gap-x-6 border-t border-line py-7 transition-colors duration-300 last:border-b hover:bg-panel/40"
            >
              <span className="font-mono text-xs text-muted transition-colors group-hover:text-accent">
                {String(i + 1).padStart(2, "0")}
              </span>
              <span>
                <span
                  className="block font-mono text-[0.65rem] uppercase tracking-widest text-muted"
                  dir="ltr"
                >
                  {fallback && (
                    <span className="me-2 text-accent">{t.fallbackNote}</span>
                  )}
                  {date}
                </span>
                <span className="mt-1 block text-xl font-medium leading-snug tracking-tight transition-colors duration-300 group-hover:text-accent sm:text-2xl">
                  {title}
                </span>
                <span className="mt-2 hidden max-w-2xl text-sm leading-relaxed text-muted md:block">
                  {excerpt.length > 160
                    ? `${excerpt.slice(0, 160)}…`
                    : excerpt}
                </span>
              </span>
              <span
                aria-hidden
                className="font-mono text-muted transition-all duration-300 group-hover:text-accent group-hover:translate-x-1 group-hover:-translate-y-1 rtl:group-hover:-translate-x-1"
              >
                <ArrowIcon className="-rotate-45 rtl:-scale-x-100" />
              </span>
            </Link>
          </Reveal>
        );
      })}
    </div>
  );
}