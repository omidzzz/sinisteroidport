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

    // Idle prefetch: after the SW is active, warm this session's locale's
    // top-level pages into the nav cache so repeat/offline visits are instant
    // for the whole chrome, not just the last page. Runs once per SW version
    // (the key is version-pinned — a deploy that bumps VERSION re-warms) and
    // only on an idle main thread so it never competes with first paint.
    const WARM_KEY = "sin-sw-warm-v1.0.3";
    const warmTopLevel = () => {
      const locale = window.location.pathname.startsWith("/fa") ? "fa" : "en";
      const alt = locale === "fa" ? "en" : "fa";
      const sections = ["", "/work", "/skills", "/education", "/showcase", "/blog"];
      const paths = [
        `/${locale}/`,
        `/${locale}/index.html`,
        ...sections.slice(1).map((s) => `/${locale}${s}/`),
        `/${alt}/`,
      ];
      // Low-priority, failure-silent, no network cache reuse — the SW is what
      // stores the responses into its nav Cache, so the browser HTTP cache is
      // irrelevant here.
      Promise.all(
        paths.map((p) => fetch(p, { cache: "no-store", priority: "low" }).catch(() => null)),
      )
        .then(() => {
          try {
            localStorage.setItem(WARM_KEY, "1");
          } catch {
            /* storage blocked — may re-warm next visit; harmless */
          }
        })
        .catch(() => {});
    };

    navigator.serviceWorker
      .register("/sw.js")
      .then(() => navigator.serviceWorker.ready)
      .then(() => {
        try {
          if (localStorage.getItem(WARM_KEY) === "1") return;
        } catch {
          /* storage blocked — warm anyway */
        }
        if (typeof window.requestIdleCallback === "function") {
          window.requestIdleCallback(warmTopLevel, { timeout: 12000 });
        } else {
          window.setTimeout(warmTopLevel, 4000);
        }
      })
      .catch(() => {
        /* decorative enhancement — ignore registration failures */
      });
  }, []);

  return null;
}