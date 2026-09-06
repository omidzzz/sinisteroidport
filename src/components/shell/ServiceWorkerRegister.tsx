"use client";

import { useEffect } from "react";

/**
 * Registers the service worker (public/sw.js) in production only.
 *
 * The static export is a pure file drop — every navigation is a full document
 * load — so the SW only makes repeat visits faster (cache-first /_next/static,
 * stale-while-revalidate for images/fonts) and adds an offline fallback for
 * already-visited pages. It is deliberately skipped in `next dev` / `next
 * start` so the live-reload and preview contracts stay untouched.
 *
 * Registration failures are silent: this is a progressive enhancement, never
 * worth an error in the console.
 */
export default function ServiceWorkerRegister() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production") return;
    if (!("serviceWorker" in navigator)) return;
    // The SW spec requires a secure context; localhost is exempt during local
    // prod-ish testing (`next start`).
    if (window.location.protocol !== "https:" && window.location.hostname !== "localhost") return;
    navigator.serviceWorker.register("/sw.js").catch(() => {
      /* decorative enhancement — ignore registration failures */
    });
  }, []);

  return null;
}