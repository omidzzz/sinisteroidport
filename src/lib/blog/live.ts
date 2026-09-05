import type { Post } from "./types";

/**
 * Single-flight client cache for the live post API (/api/get_post.php).
 *
 * BlogPostDynamic (DB-only posts served through the PHP shell) and
 * BlogPostLive (the shared article renderer, which also refreshes
 * prerendered posts from the DB) both need the exact same payload for the
 * current slug. Routing every request through here:
 *   • lets the fetch start at bundle-parse time via preloadLivePost(), so
 *     the round-trip overlaps React hydration instead of starting after it
 *     (this was the visible "blog post loads slowly" delay on mobile), and
 *   • guarantees the API is hit at most once per slug per page view, even
 *     when both components mount for the same article.
 */
const inFlight = new Map<string, Promise<Post | null>>();
let inFlightAll: Promise<Post[] | null> | null = null;

export function getLivePost(slug: string): Promise<Post | null> {
  let req = inFlight.get(slug);
  if (!req) {
    req = fetch(`/api/get_post.php?slug=${encodeURIComponent(slug)}`)
      .then((r) => (r.ok ? r.json() : null))
      .catch(() => null);
    inFlight.set(slug, req);
  }
  return req;
}

/** Full live list (published only, from /api/get_posts.php) — single-flight
 *  like getLivePost, so BlogPostDynamic can rank related posts for DB-only
 *  articles without spamming the API. Resolves to null on any failure. */
export function getAllLivePosts(): Promise<Post[] | null> {
  if (!inFlightAll) {
    inFlightAll = fetch("/api/get_posts.php")
      .then((r) => (r.ok ? r.json() : null))
      .catch(() => null)
      .then((rows) => (Array.isArray(rows) ? rows : null));
  }
  return inFlightAll;
}

/** Locale-agnostic slug extraction — matches /en/blog/<slug>/ and
 * /fa/blog/<slug>/, or the ?p= fallback the PHP shell uses. */
function slugFromLocation(): string | null {
  if (typeof window === "undefined") return null;
  const q = new URLSearchParams(window.location.search).get("p");
  if (q) return q;
  const m = window.location.pathname.match(/\/(?:en|fa)\/blog\/([^/]+)/);
  if (!m) return null;
  const slug = decodeURIComponent(m[1].replace(/\/+$/, ""));
  return slug || null;
}

/** Fire-and-forget warm-up, called once at module evaluation of the blog
 * renderer so the request races ahead of hydration. Server-side safe. */
export function preloadLivePost(): void {
  const slug = slugFromLocation();
  if (slug) void getLivePost(slug);
}