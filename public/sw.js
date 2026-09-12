/* Sinisteroid service worker — repeat-visit cache for the static export.
 *
 * The site is a pure file drop (out/), so every page is a full document
 * load. This worker makes repeat visits feel instant and adds a last-page
 * offline fallback:
 *
 *   /_next/static/*        → CACHE-FIRST   (content-hashed, immutable per build)
 *   images / fonts / feeds → STALE-WHILE-REVALIDATE (serve cache, refresh bg)
 *   same-origin navigation → NETWORK-FIRST (fresh HTML, cached offline fallback)
 *   everything else        → untouched (POST, /api/*, cross-origin)
 *
 * Updates are conservative: a new worker activates on the next launch (no
 * skipWaiting) and then purges caches left behind by older versions, so an
 * in-flight session never has its hashed chunks evicted mid-navigation.
 */
const VERSION = "1.0.3";
const CACHES = {
  static: `sinisteroid-static-${VERSION}`,
  media: `sinisteroid-media-${VERSION}`,
  nav: `sinisteroid-nav-${VERSION}`,
};

const STATIC_PREFIX = "/_next/static/";
const MEDIA_RE = /^\/(?:images|uploads|og|fa)\//;
const STATIC_EXT_RE = /\.(?:webp|png|ico|jpe?g|svg|woff2?|xml|json|txt|webmanifest)$/;

/** Document-shaped URL? Trailing slash routes (/en/, /en/blog/, /en/blog/slug),
 *  explicit *.html, or an extensionless final segment — but NOT /api/* (live
 *  DB JSON) and not hashed build assets (handled by the _next/static rule). */
function isHtmlPath(pathname) {
  if (pathname.startsWith("/api/")) return false;
  const last = pathname.split("/").filter(Boolean).pop() ?? "";
  if (!last) return true; // "/" or trailing slash
  if (/\.html?$/.test(last)) return true;
  // Extensionless final segment = document route (e.g. /en, /en/work).
  return !/\.[a-z0-9]{2,}$/i.test(last);
}

self.addEventListener("activate", (event) => {
  const keep = new Set(Object.values(CACHES));
  event.waitUntil(
    (async () => {
      const names = await caches.keys();
      await Promise.all(
        names
          .filter((n) => n.startsWith("sinisteroid-") && !keep.has(n))
          .map((n) => caches.delete(n))
      );
      // Claim happens only after activation, which (no skipWaiting) means any
      // previously-open old session has already closed — safe to take over.
      await self.clients.claim();
    })()
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  // Any document-like request — real navigations (mode: "navigate") AND the
  // client-side idle prefetch of top-level pages (ordinary same-origin GETs
  // with no file extension) — goes network-first, so the nav cache can warm
  // ahead of later visits and hold pages for offline fallback. API calls
  // (/api/*.php) are excluded — they're live DB data, never nav-cacheable.
  if (request.mode === "navigate" || isHtmlPath(url.pathname)) {
    event.respondWith(networkFirst(request));
    return;
  }
  if (url.pathname.startsWith(STATIC_PREFIX)) {
    event.respondWith(cacheFirst(request, CACHES.static));
    return;
  }
  if (MEDIA_RE.test(url.pathname) || STATIC_EXT_RE.test(url.pathname)) {
    event.respondWith(staleWhileRevalidate(request, CACHES.media));
  }
});

async function networkFirst(request) {
  const cache = await caches.open(CACHES.nav);
  try {
    const response = await fetch(request);
    if (response.ok) cache.put(request, response.clone());
    return response;
  } catch {
    const cached = await cache.match(request);
    return cached || Response.error();
  }
}

async function cacheFirst(request, cacheName) {
  const cached = await caches.match(request);
  if (cached) return cached;
  const response = await fetch(request);
  if (response.ok) {
    const cache = await caches.open(cacheName);
    cache.put(request, response.clone());
  }
  return response;
}

async function staleWhileRevalidate(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);
  const update = fetch(request)
    .then((response) => {
      if (response.ok) cache.put(request, response.clone());
      return response;
    })
    .catch(() => cached);
  return cached || update;
}