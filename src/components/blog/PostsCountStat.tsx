"use client";

import { useEffect, useState } from "react";

/**
 * Live post counter for the writings hero.
 *
 * Prerenders with the build-time snapshot count, then updates when
 * BlogListLive finishes syncing the list from MySQL (it broadcasts the
 * refreshed count on the `posts-synced` window event) — so the number
 * always matches the live database, not the last export.
 */
export default function PostsCountStat({ initial }: { initial: number }) {
  const [count, setCount] = useState(initial);

  useEffect(() => {
    const onSync = (e: Event) => {
      const n = (e as CustomEvent<number>).detail;
      if (typeof n === "number" && n > 0) setCount(n);
    };
    window.addEventListener("posts-synced", onSync);
    return () => window.removeEventListener("posts-synced", onSync);
  }, []);

  return <>{count}</>;
}