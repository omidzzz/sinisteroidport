import { locales, type Locale } from "./i18n";

const SITE = "https://sinisteroid.ir";

export { SITE };

/**
 * Build canonical + hreflang alternates for a locale-prefixed path.
 *
 * Canonical scheme: every page lives at exactly two URLs —
 *   https://sinisteroid.ir/en/<path>/  and  https://sinisteroid.ir/fa/<path>/
 * Bare URLs (/blog/...) and ?lang= query variants 301-redirect to these
 * (see scripts/prepare-cpanel.mjs), and these tags tell Google which is which.
 *
 * `available` lists the locales the path GENUINELY exists in. It defaults to
 * both, but a post with no Persian translation passes ["en"]: its /fa/ URL
 * serves the English article (and is noindexed — see the blog route), and an
 * hreflang alternate must never point at a page written in another language.
 */
export function seoAlternates(
  pathWithoutLocale: string,
  locale: Locale,
  available: readonly Locale[] = locales
) {
  const clean = pathWithoutLocale.replace(/^\/+|\/+$/g, "");
  // An empty path is the locale root. The trailing slash is appended exactly
  // once, so the roots can never advertise /en// or /fa// — the malformed
  // forms both roots used to canonicalise themselves to (and which Apache
  // answers with 200, handing Google two URLs for one document).
  const pathFor = (l: Locale) => (clean ? `/${l}/${clean}/` : `/${l}/`);

  const languages: Record<string, string> = {};
  for (const l of available) languages[l] = `${SITE}${pathFor(l)}`;
  // x-default must name a locale that is actually in the set.
  const xDefault = available.includes("en") ? "en" : available[0];
  if (xDefault) languages["x-default"] = `${SITE}${pathFor(xDefault)}`;

  return {
    canonical: `${SITE}${pathFor(locale)}`,
    // A page outside the advertised set (an untranslated fallback) declares no
    // alternates: a set it does not belong to would contradict its own
    // canonical, which is the only truth such a page holds.
    ...(available.includes(locale) ? { languages } : {}),
    // RSS + JSON Feed autodiscovery travels with every page that sets
    // alternates (child pages replace the layout's alternates wholesale).
    types: {
      "application/rss+xml": `${SITE}/feed.xml`,
      "application/feed+json": `${SITE}/feed.json`,
    },
  };
}
