"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import type { Post } from "@/lib/posts";
import ContentRenderer from "./ContentRenderer";
import {
  getChosenTranslation,
  isFallbackTranslation,
  postTitle,
  postExcerpt,
  formatPostDate,
  postDateKey,
} from "@/lib/post-helpers";
import { normalizeTags, tagLabel } from "@/lib/tags";
import { getDict, loc, type Locale } from "@/lib/i18n";
import FaqAccordion from "./FaqAccordion";
import { ArrowIcon } from "./icons";
import { getLivePost, preloadLivePost } from "@/lib/live-post";

// Kick the DB refresh off at bundle-parse time — BEFORE React hydrates — so
// the API round-trip overlaps hydration instead of starting after it. No-op
// wherever the URL carries no post slug (blog index, non-post pages).
preloadLivePost();

export default function BlogPostLive({
  locale,
  post,
}: {
  locale: Locale;
  post: Post;
}) {
  const [live, setLive] = useState<Post | null>(null);
  const barRef = useRef<HTMLDivElement>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  const t = getDict(locale);
  const effective = live ?? post;
  const translation = getChosenTranslation(effective, locale);
  const title = postTitle(effective, locale);
  const excerpt = postExcerpt(effective, locale);
  const fallback = isFallbackTranslation(effective, locale);
  const tags = normalizeTags(
    Array.isArray(effective.tags) ? effective.tags : []
  );
  const cover = effective.featuredImage?.src || null;
  // Freshness signal — only shown when an update actually moved the date
  const updatedKey = postDateKey(effective.updated);
  const showUpdated =
    !!updatedKey && updatedKey !== postDateKey(effective.date);

  // Mini TOC — only real headings, mirroring the deterministic sec-<i> ids
  // that ContentRenderer gives to H2/H3 elements (never body content).
  // The id must keep the ORIGINAL block index (i) because ContentRenderer
  // keys headings as `sec-${blockIndexInContent}`.
  const toc = useMemo(
    () =>
      (translation?.content ?? [])
        .map((b, i) => ({ b, i }))
        .filter(({ b }) => b.type === "heading" && (b.level ?? 2) >= 2 && (b.level ?? 2) <= 3)
        .map(({ b, i }) => ({
          id: `sec-${i}`,
          text: (b.text ?? "").trim(),
          level: b.level ?? 2,
        })),
    [translation]
  );

  // Reading time — word count over paragraphs, lists and code blocks
  const readMinutes = useMemo(() => {
    const words = (translation?.content ?? []).reduce((n, b) => {
      let w = typeof b.text === "string" ? b.text.split(/\s+/).length : 0;
      if (Array.isArray(b.items))
        for (const it of b.items)
          if (typeof it === "string") w += it.split(/\s+/).length;
      if (typeof b.code === "string") w += b.code.split(/\s+/).length / 2;
      return n + w;
    }, 0);
    return Math.max(2, Math.round(words / 210));
  }, [translation]);

  // Progress-bar fallback for browsers without CSS scroll-driven animations.
  // Where animation-timeline: scroll() is supported, zero JS runs on scroll.
  useEffect(() => {
    const bar = barRef.current;
    if (!bar) return;
    if (CSS.supports?.("animation-timeline: scroll()")) return;
    let raf = 0;
    const update = () => {
      raf = 0;
      const max = document.documentElement.scrollHeight - window.innerHeight;
      bar.style.setProperty(
        "--progress",
        max > 0 ? String(Math.min(window.scrollY / max, 1)) : "0"
      );
    };
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(update);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll, { passive: true });
    update();
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (raf) cancelAnimationFrame(raf);
    };
  }, []);

  // Active-section highlight for the TOC
  useEffect(() => {
    if (toc.length < 3) return;
    const els = toc
      .map((h) => document.getElementById(h.id))
      .filter((el): el is HTMLElement => el !== null);
    if (!els.length) return;
    const obs = new IntersectionObserver(
      (entries) => {
        for (const e of entries) if (e.isIntersecting) setActiveId(e.target.id);
      },
      { rootMargin: "-90px 0px -70% 0px" }
    );
    els.forEach((el) => obs.observe(el));
    return () => obs.disconnect();
  }, [toc]);


  useEffect(() => {
    let cancelled = false;
    // Single-flight fetch shared with BlogPostDynamic: preloadLivePost()
    // already started this request at bundle-parse time, so this reuses the
    // in-flight promise instead of hitting the API a second time.
    getLivePost(post.slug).then((data) => {
      if (cancelled || !data?.translations) return;
      setLive(data);
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [post.slug]);

  if (!translation) return null;

  return (
    <>
      {/* Reading progress — pure CSS scroll timeline where supported */}
      <div ref={barRef} aria-hidden className="reading-progress" />

      {/* Sticky mini table of contents — wide viewports only, sits in the
          page margin so the article measure stays untouched */}
      {toc.length >= 3 && (
        <nav
          aria-label={locale === "fa" ? "فهرست مطالب" : "Table of contents"}
          className="fixed top-28 z-20 hidden w-56 xl:block"
          style={{ insetInlineStart: "calc((100vw - 48rem) / 2 - 15rem)" }}
        >
          <p className="label mb-3">
            {locale === "fa" ? "(فهرست)" : "(Contents)"}
          </p>
          <ul className="space-y-1.5 border-s border-line ps-4">
            {toc.map((h) => (
              <li key={h.id}>
                <a
                  href={`#${h.id}`}
                  className={`block font-mono text-[0.66rem] leading-snug transition-all duration-200 ${
                    activeId === h.id
                      ? "text-accent rtl:-translate-x-1 translate-x-1"
                      : "text-muted hover:text-ink"
                  } ${h.level === 3 ? "ps-3" : ""}`}
                >
                  {h.text}
                </a>
              </li>
            ))}
          </ul>
        </nav>
      )}

      <article className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
        <Link
          href={loc(locale, "/blog")}
          className="post-back group"
        >
          <ArrowIcon className="rotate-180 transition-transform duration-300 group-hover:-translate-x-1 rtl:rotate-0 rtl:group-hover:translate-x-1" />
          {locale === "fa" ? "بازگشت به نوشته‌ها" : "Back to writing"}
        </Link>

        {/* transmission kicker */}
        <div className="mt-10 flex flex-wrap items-center gap-3">
          <span className="live-dot" aria-hidden />
          <span className="label">{locale === "fa" ? "(فرستنده)" : "(Transmission)"}</span>
          <span className="h-px w-8 bg-line" aria-hidden />
          <time
            className="font-mono text-xs tracking-[0.2em] text-acid"
            dir="ltr"
          >
            {formatPostDate(effective.date)}
          </time>
          <span className="label">
            ·{" "}
            {locale === "fa"
              ? `${readMinutes} دقیقه مطالعه`
              : `${readMinutes} min read`}
          </span>
          {showUpdated && (
            <span className="label text-acid">
              ·{" "}
              {locale === "fa"
                ? `به‌روزشده ${formatPostDate(effective.updated ?? "")}`
                : `Updated ${formatPostDate(effective.updated ?? "")}`}
            </span>
          )}
        </div>

        <h1 className="font-display anaglyph-strong mt-3 text-[clamp(1.9rem,5vw,3.1rem)] font-extrabold leading-[1.08] tracking-tight text-ink">
          {title}
        </h1>

      {/* TL;DR callout — answer-first summary, citable by AI engines */}
      <aside className="post-tldr mt-6">
        <span className="label mb-2 block">(TL;DR)</span>
        {excerpt}
      </aside>

      {fallback && (
        <p className="label mt-4 inline-block border border-line px-3 py-1">
          {t.fallbackNote}
        </p>
      )}

      {tags.length > 0 && (
        <div className="mt-5 flex flex-wrap gap-2">
          {tags.map((tag) => (
            <Link
              key={tag}
              href={loc(locale, `/tags/${tag}`)}
              className="bento-tag transition-colors duration-300 hover:text-accent"
            >
              #{tagLabel(tag, locale)}
            </Link>
          ))}
        </div>
      )}

      {cover && (
        <div className="post-cover mt-9">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={cover}
            alt=""
            loading="lazy"
            decoding="async"
            width={1024}
            height={576}
            className="post-cover-img"
          />
          <span aria-hidden className="post-cover-scan" />
        </div>
      )}

      <div className="cv-auto mt-12">
        <ContentRenderer blocks={translation.content} />
      </div>

      {translation.faq && translation.faq.length > 0 && (
        <section className="cv-auto mt-16 border-t border-line pt-10">
          <div className="mb-8 flex items-center gap-3">
            <span className="sig-wave" aria-hidden>
              <i /><i /><i /><i /><i />
            </span>
            <h2 className="label">
              {locale === "fa"
                ? "(سؤالات متداول)"
                : "(Frequently asked questions)"}
            </h2>
          </div>
          <FaqAccordion items={translation.faq} />
        </section>
      )}
      </article>
    </>
  );
}