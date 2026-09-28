import type { Locale } from "@/lib/i18n";
import type { ConsoleItem } from "./types";

/**
 * LIVE POST SEARCH — the content half of the console's filter.
 *
 * The console could already narrow eight routes and six verbs, but it could
 * not find a single ARTICLE. This module backs the filter with the same
 * published-only index the assistant already reads
 * (/api/get_posts_index.php — ~200 bytes a post, both locales in one row), so
 * search stays current with the DATABASE rather than with whatever content
 * happened to be prerendered at build time. A post published to MySQL and
 * never rebuilt is findable here immediately.
 *
 * Three deliberate properties:
 *
 * 1. SINGLE-FLIGHT, module-level. The index is immutable for a page view, so
 *    every consumer shares one request. Same idiom as lib/blog/live.ts, which
 *    already owns the "one fetch per slug per page view" contract.
 *
 * 2. IT DEGRADES, IT NEVER BREAKS. The PHP endpoint does not exist in local
 *    static preview and can be down in production. Search falls back to the
 *    prerendered JSON feed, and if that also fails it resolves to an empty
 *    list — the console still filters routes and verbs, because a missing
 *    content index must never take navigation down with it.
 *
 * 3. IT FETCHES ON IDLE, NOT DURING RENDER. Nothing here runs while React is
 *    rendering; the console kicks it off from an idle callback, so a visitor
 *    who never searches never waits on it and LCP is untouched.
 */

/** One searchable article, resolved for the active locale. */
export interface PostRow {
  slug: string;
  /** Locale title, falling back to the other language when untranslated. */
  title: string;
  /** Locale excerpt (may be empty — the API only guarantees a title). */
  excerpt: string;
  tags: string[];
  /** YYYY-MM-DD, for the row's gutter. */
  date: string;
  /**
   * True when the post has no translation in the active locale and the row is
   * showing the other language's title. The tree marks these, because
   * silently serving an English title on a Persian page reads as a bug.
   */
  fallback: boolean;
}

/** The API's row shape. Every field is optional on purpose: this is a public
 *  endpoint whose schema has drifted before, and a missing key must degrade to
 *  "no search results", never to a thrown render. */
interface ApiRow {
  slug?: unknown;
  date?: unknown;
  tags?: unknown;
  title?: unknown;
  enTitle?: unknown;
  faTitle?: unknown;
  enExcerpt?: unknown;
  faExcerpt?: unknown;
}

const str = (v: unknown): string => (typeof v === "string" ? v : "");

/** Cap on how much excerpt text we index per post. The console matches
 *  substrings, and a full article body would multiply index size and per-
 *  keystroke scan cost for matches nobody scrolls to. */
const EXCERPT_LIMIT = 180;

const toISODate = (v: unknown): string => str(v).slice(0, 10);

function tagList(v: unknown): string[] {
  if (!Array.isArray(v)) return [];
  return v.filter((t): t is string => typeof t === "string" && t.length > 0);
}

/** Normalise one API row, or null when it has no usable slug. */
function fromApiRow(row: ApiRow, locale: Locale): PostRow | null {
  const slug = str(row.slug).trim();
  if (!slug) return null;

  const en = str(row.enTitle).trim();
  const fa = str(row.faTitle).trim();
  // A post may be published in one language only. Prefer the active locale,
  // fall back to whichever exists, and record that we fell back.
  const preferred = locale === "fa" ? fa : en;
  const other = locale === "fa" ? en : fa;
  const title = preferred || other || str(row.title).trim();
  if (!title) return null;

  const excerpt = str(locale === "fa" ? row.faExcerpt : row.enExcerpt)
    .trim()
    .slice(0, EXCERPT_LIMIT);

  return {
    slug,
    title,
    excerpt,
    tags: tagList(row.tags),
    date: toISODate(row.date),
    fallback: !preferred && Boolean(other),
  };
}


/** The JSON feed's item shape (the fallback source). */
interface FeedItem {
  id?: unknown;
  url?: unknown;
  title?: unknown;
  summary?: unknown;
  content_text?: unknown;
  date_published?: unknown;
  tags?: unknown;
}

/** Pull the slug off a feed entry: its ids and urls are ABSOLUTE post URLs. */
function slugFromFeedUrl(v: unknown): string {
  const raw = str(v).trim();
  if (!raw) return "";
  return raw.split(/[/?#]/).filter(Boolean).pop() ?? "";
}

function fromFeedItem(item: FeedItem): PostRow | null {
  const slug = slugFromFeedUrl(item.id) || slugFromFeedUrl(item.url);
  if (!slug) return null;
  const title = str(item.title).trim();
  if (!title) return null;
  return {
    slug,
    title,
    excerpt: (str(item.summary) || str(item.content_text))
      .trim()
      .slice(0, EXCERPT_LIMIT),
    tags: tagList(item.tags),
    date: toISODate(item.date_published),
    // The per-locale feeds are already translated; nothing to flag.
    fallback: false,
  };
}

/* ── Single-flight caches ──────────────────────────────────────────────
   Module scope, so they survive every remount for the life of the page. */

let apiPromise: Promise<PostRow[] | null> | null = null;
const feedPromises = new Map<Locale, Promise<PostRow[]>>();

function fetchApiIndex(locale: Locale): Promise<PostRow[] | null> {
  if (!apiPromise) {
    apiPromise = fetch("/api/get_posts_index.php")
      .then((r) => (r.ok ? r.json() : null))
      .catch(() => null)
      .then((rows) => {
        if (!Array.isArray(rows)) return null;
        return rows
          .map((row) => fromApiRow(row as ApiRow, locale))
          .filter((row): row is PostRow => row !== null);
      });
  }
  return apiPromise;
}

function fetchFeedIndex(locale: Locale): Promise<PostRow[]> {
  let req = feedPromises.get(locale);
  if (!req) {
    const feed = locale === "fa" ? "/fa/feed.json" : "/feed.json";
    req = fetch(feed)
      .then((r) => (r.ok ? r.json() : []))
      .catch(() => [])
      .then((json: unknown) => {
        const items =
          json && typeof json === "object" && "items" in json
            ? (json as { items?: unknown }).items
            : null;
        if (!Array.isArray(items)) return [];
        return items
          .map((item) => fromFeedItem(item as FeedItem))
          .filter((row): row is PostRow => row !== null);
      });
    feedPromises.set(locale, req);
  }
  return req;
}

/**
 * The live post index for a locale, newest first. Never rejects: an
 * unavailable index is an empty array, not an exception, because the caller
 * has no useful way to recover and the console must keep working.
 */
export async function loadPostRows(locale: Locale): Promise<PostRow[]> {
  const fromApi = await fetchApiIndex(locale);
  if (fromApi && fromApi.length > 0) {
    return fromApi.sort((a, b) => b.date.localeCompare(a.date));
  }
  const fromFeed = await fetchFeedIndex(locale);
  return fromFeed.sort((a, b) => b.date.localeCompare(a.date));
}

/**
 * Project rows into console items.
 *
 * `haystack` is the machine's extra match target (title + slug + excerpt +
 * tags), so a post is findable by any of them while the row itself stays
 * short. It is lowercased ONCE here rather than on every keystroke.
 */
export function buildPostItems(rows: readonly PostRow[]): ConsoleItem[] {
  return rows.map((row) => ({
    kind: "post" as const,
    label: row.title,
    sub: row.date,
    value: row.slug,
    haystack: [row.title, row.slug, row.excerpt, ...row.tags]
      .join(" ")
      .toLowerCase(),
  }));
}
