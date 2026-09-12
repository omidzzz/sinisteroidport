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

/**
 * Build a click-optimized <title> (without the site suffix — the layout
 * template appends " – Omid"). Priority:
 *   1. The author's curated SEO title (`seo.title`) when present — it's
 *      already keyword-led and written to be clicked from a SERP.
 *   2. The display/H1 title.
 * Both are capped so the final "… – Omid" stays inside Google's ~600px
 * SERP title budget; over the cap the focus keyword leads (unless the
 * title already starts with it) and the tail is trimmed at a word
 * boundary with an ellipsis so the cut reads like a headline, not a chop.
 */
export function buildSeoTitle(post: Post, locale: Locale = "en"): string {
  const meta = getPostMeta(post, locale);
  const chosen = post.translations?.[locale] ?? post.translations?.en;
  const title = (chosen?.seo?.title?.trim() || meta.title || "").trim();
  const LIMIT = 56; // leaves ~7 chars for " – Omid"
  if (title.length <= LIMIT) return title;

  const focus = getPostKeywords(post, locale)[0];
  const prefix =
    focus && !title.toLowerCase().startsWith(focus.toLowerCase())
      ? `${focus}: `
      : "";
  const budget = LIMIT - prefix.length;
  if (budget < 40) return title.slice(0, LIMIT).trim();

  let out = `${prefix}${title}`.slice(0, LIMIT);
  // Drop any partial trailing word so the cut looks editorial, not chopped.
  const cut = out.replace(/\s+[^\s]*$/, "");
  out = cut.length > 0 ? cut : out;
  return `${out}…`;
}