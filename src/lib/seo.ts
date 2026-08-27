import type { Locale } from "./i18n";

const SITE = "https://sinisteroid.ir";

export { SITE };

/**
 * Build canonical + hreflang alternates for a locale-prefixed path.
 *
 * Canonical scheme: every page lives at exactly two URLs —
 *   https://sinisteroid.ir/en/<path>/  and  https://sinisteroid.ir/fa/<path>/
 * Bare URLs (/blog/...) and ?lang= query variants 301-redirect to these
 * (see scripts/prepare-cpanel.mjs), and these tags tell Google which is which.
 */
export function seoAlternates(pathWithoutLocale: string, locale: Locale) {
  const clean = `/${pathWithoutLocale.replace(/^\/+|\/+$/g, "")}`;
  const enPath = `/en${clean}/`;
  const faPath = `/fa${clean}/`;
  return {
    canonical: `${SITE}${locale === "fa" ? faPath : enPath}`,
    languages: {
      en: `${SITE}${enPath}`,
      fa: `${SITE}${faPath}`,
      "x-default": `${SITE}${enPath}`,
    },
    // RSS autodiscovery travels with every page that sets alternates
    // (child pages replace the layout's alternates wholesale).
    types: {
      "application/rss+xml": `${SITE}/feed.xml`,
    },
  };
}
