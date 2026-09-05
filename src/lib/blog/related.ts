import type { Post } from "./types";

/**
 * Related-post ranking — shared by the prerendered blog pages (server, from
 * the content snapshot) and the dynamic shell for DB-only posts (client, from
 * /api/get_posts.php). Keeping the logic in one client-safe module guarantees
 * both surfaces build the exact same "Related reading / Next transmission"
 * block for a given post.
 */

/** Tag-overlap score for simple cluster-style related-post ranking. */
export function relatedScore(a: Post, b: Post): number {
  const setB = new Set(b.tags ?? []);
  return (a.tags ?? []).reduce((n, t) => n + (setB.has(t) ? 1 : 0), 0);
}

/** Pick up to `limit` related posts — most tag overlap wins, newest breaks ties. */
export function getRelatedPosts(
  current: Post,
  all: Post[],
  limit = 3
): Post[] {
  return all
    .filter((p) => p.slug !== current.slug)
    .sort(
      (a, b) =>
        relatedScore(current, b) - relatedScore(current, a) ||
        new Date(b.date).getTime() - new Date(a.date).getTime()
    )
    .slice(0, limit);
}