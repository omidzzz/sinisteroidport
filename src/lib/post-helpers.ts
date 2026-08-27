import type { Post, PostTranslation } from "./posts";
import type { Locale } from "./i18n";

/** Pure, client-safe helpers for reading a post's locale content. */

export function getChosenTranslation(
  post: Post,
  locale: Locale
): PostTranslation | undefined {
  return post.translations?.[locale] ?? post.translations?.en;
}

export function isFallbackTranslation(post: Post, locale: Locale): boolean {
  return !post.translations?.[locale] && locale !== "en";
}

export function postTitle(post: Post, locale: Locale): string {
  return getChosenTranslation(post, locale)?.title ?? post.title;
}

export function postExcerpt(post: Post, locale: Locale): string {
  return (
    getChosenTranslation(post, locale)?.excerpt ??
    post.excerpt ??
    ""
  );
}

export function formatPostDate(date: string): string {
  const d = new Date(date);
  if (Number.isNaN(d.getTime())) return date.slice(0, 10);
  return d.toISOString().slice(0, 10);
}