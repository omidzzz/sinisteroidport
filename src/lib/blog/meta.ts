import type { Post } from "./types";
import type { Locale } from "../i18n";

/** Resolve the title/excerpt for a post in a given locale, falling back to English. */
export function getPostMeta(
  post: Post,
  locale: Locale = "en"
): { title: string; excerpt: string; date: string; isFallback: boolean } {
  const chosen = post.translations?.[locale] ?? post.translations?.en;
  return {
    title: chosen?.title ?? post.title,
    excerpt: chosen?.excerpt ?? post.excerpt ?? "",
    date: post.date,
    isFallback: !post.translations?.[locale] && locale !== "en",
  };
}

/** Resolve the authored SEO keyword list for a post in a given locale
 * (locale first, EN fallback — same rule as getPostMeta). The focus
 * keyword leads, then the authored keyword string split on ASCII and
 * Persian commas, trimmed and deduplicated. Empty when a post has no
 * authored SEO payload, so callers can omit the tags entirely. */
export function getPostKeywords(post: Post, locale: Locale = "en"): string[] {
  const chosen = post.translations?.[locale] ?? post.translations?.en;
  const seo = chosen?.seo;
  const focus = seo?.focusKeyword?.trim();
  const rest = (seo?.keywords ?? "")
    .split(/[,،]/)
    .map((k) => k.trim())
    .filter(Boolean);
  const all = [focus, ...rest].filter((k): k is string => Boolean(k));
  return [...new Set(all)];
}