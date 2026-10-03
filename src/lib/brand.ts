/**
 * BRAND — the single source of truth for every identity this site speaks.
 *
 * THE VALUES LIVE IN ./brand.json (not here): plain JSON is readable by the
 * TypeScript app AND by the Node build scripts (generate-rss, generate-sitemap,
 * generate-llms, generate-og-cards, indexnow, manifest) with no transpile step,
 * so one file owns the identity for both halves of the build.
 *
 * Option A, locked 2026-10-02:
 *   • Omid            — the person (legal name, author, bylines, citations)
 *   • Sinisteroid     — the website/handle (site name, og:site_name, feeds)
 *   • SINISTER[OID]   — the logotype (compact = console chrome, full = footer/egg)
 *
 * Nothing else in the codebase may re-declare these. Metadata, JSON-LD,
 * feeds, llms.txt, manifest, nav copy and components all read from here,
 * so one edit propagates to every surface and no surface can drift.
 * The verification suites (seo-guard, verify-craft) assert the built
 * artifacts agree with this file, so a surface that forgets to read it
 * fails the build check rather than shipping a different name.
 *
 * Persian rule: the person is امید in prose, the website/handle stay
 * Latin (Sinisteroid / sinisteroid.ir — never transliterated) in BOTH
 * locales, and the logotype is pure ASCII — always pinned LTR, never
 * reshaped. There is deliberately NO `siteFa` field: the site name has
 * one spelling, and a field implying a Persian variant is a trap for
 * exactly the transliteration this rule forbids.
 */
import brand from "./brand.json";

export const BRAND = brand;
export type Brand = typeof BRAND;

/** Canonical origin, for sites/feeds/schemas that want the bare string. */
export const SITE_URL = BRAND.domain;

/**
 * The person's stable knowledge-graph node id — one @id shared by the
 * Person node, every BlogPosting author/publisher, the WebSite publisher
 * and the ContactPage mainEntity.
 *
 * Built from `personSlug`, NOT `person.toLowerCase()`. That difference is
 * the whole point of the field: lowercasing is not identity-preserving for
 * every name ("İbrahim" → "i̇brahim" is a different string), so a
 * name that ever needs a non-ASCII slug gets an explicit, reviewable value
 * here instead of a silent transliteration at each call site.
 */
export const PERSON_ID = `${SITE_URL}/#${BRAND.personSlug}`;
