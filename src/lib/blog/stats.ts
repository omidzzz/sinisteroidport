import type { Post } from "./types";
import type { Locale } from "../i18n";

/** Approximate word count over paragraphs, lists and code blocks — used for
 * BlogPosting JSON-LD (wordCount / timeRequired) and reading-time chips. */
export function postWordCount(
  post: Post,
  locale: Locale = "en"
): number {
  const translation = post.translations?.[locale] ?? post.translations?.en;
  return (translation?.content ?? []).reduce((n, b) => {
    let w = typeof b.text === "string" ? b.text.split(/\s+/).length : 0;
    if (Array.isArray(b.items))
      for (const it of b.items)
        if (typeof it === "string") w += it.split(/\s+/).length;
    if (typeof b.code === "string") w += b.code.split(/\s+/).length / 2;
    return n + w;
  }, 0);
}

/** Reading time in whole minutes, mirroring the client-side chip in
 * BlogPostLive so JSON-LD never disagrees with what users see. */
export function postReadMinutes(post: Post, locale: Locale = "en"): number {
  return Math.max(2, Math.round(postWordCount(post, locale) / 210));
}