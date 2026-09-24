import type { Post, PostTranslation } from "./types";
import type { Locale } from "../i18n";

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

/**
 * Locale-correct href for a post.
 *
 * A post with no translation in `locale` is served from the English URL: its
 * /fa/ counterpart is the English article wearing a Persian URL, and that URL
 * is noindexed (see the blog route). Linking the readable, indexable URL keeps
 * the crawl out of noindexed pages and never drops a reader into a copy.
 *
 * Lives here (client-safe, no fs) so the issue grid, related reading, prev/next
 * and the command palette all resolve post links the same way.
 */
export function postHref(post: Post, locale: Locale): string {
  return isFallbackTranslation(post, locale)
    ? `/en/blog/${post.slug}`
    : `/${locale}/blog/${post.slug}`;
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

/** Timezone-independent "YYYY-MM-DD" key for a post date.
 * Post dates are authored as wall-clock strings ("YYYY-MM-DD" or
 * "YYYY-MM-DD HH:mm:ss") with NO timezone. Parsing them via new Date()
 * interprets the time as *local*, so a machine in UTC+03:30 and a browser
 * in UTC-07:00 can disagree by a full day — which made the prerendered
 * HTML differ from the hydrated output and crashed with React error #418.
 * The stored date already IS the intended display date, so we slice it
 * and never construct a Date from it. */
export function postDateKey(date: string | undefined | null): string {
  const m =
    typeof date === "string" ? date.match(/^\d{4}-\d{2}-\d{2}/) : null;
  return m ? m[0] : "";
}

export function formatPostDate(date: string): string {
  return postDateKey(date) || (date ?? "").slice(0, 10);
}