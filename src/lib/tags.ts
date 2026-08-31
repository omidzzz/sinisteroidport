import tagData from "@/data/tags.json";
import type { Locale } from "./i18n";

/**
 * Canonical tag taxonomy — shared by tag archive pages, JSON-LD keywords,
 * the sitemap and the tag normalization script (scripts/normalize-tags.mjs
 * reads the same JSON directly, since scripts can't import TS).
 */

export interface TagDef {
  slug: string;
  en: string;
  fa: string;
}

const canonicalBySlug = new Map<string, TagDef>(
  tagData.canonical.map((t) => [t.slug, t])
);
const aliasMap = tagData.map as Record<string, string>;

/** Map raw (legacy/junk) tag strings onto canonical tag slugs. */
export function normalizeTags(tags: string[] | undefined): string[] {
  if (!Array.isArray(tags)) return [];
  const out: string[] = [];
  for (const raw of tags) {
    const slug = aliasMap[raw] ?? (canonicalBySlug.has(raw) ? raw : null);
    if (slug && !out.includes(slug)) out.push(slug);
  }
  return out.slice(0, 6);
}

/** Display label for a canonical tag slug, in the given locale. */
export function tagLabel(slug: string, locale: Locale): string {
  return canonicalBySlug.get(slug)?.[locale] ?? slug;
}

/** Every canonical tag actually used by at least one post, alphabetical. */
export function usedTags(posts: { tags?: string[] }[]): TagDef[] {
  const used = new Set<string>();
  for (const p of posts) for (const t of normalizeTags(p.tags)) used.add(t);
  return tagData.canonical.filter((t) => used.has(t.slug));
}
