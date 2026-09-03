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