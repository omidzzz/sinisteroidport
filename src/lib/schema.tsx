import type { Locale } from "./i18n";
import type { FaqItem, Post } from "./posts";
import { SITE } from "./seo";

/**
 * JSON-LD structured data builders (SEO + GEO).
 * Rendered into the SSR HTML via <JsonLd> so search engines and AI
 * crawlers see them without executing JavaScript.
 */

const AUTHOR = {
  "@type": "Person",
  name: "Omid",
  url: SITE,
} as const;

/** Schema.org expects ISO 8601; legacy data may carry "YYYY-MM-DD HH:mm:ss". */
function isoDate(value: string): string {
  const t = new Date(value);
  return Number.isNaN(t.getTime()) ? value : t.toISOString();
}

/** Render any schema.org payload(s) as an inline JSON-LD script tag. */
export function JsonLd({ data }: { data: object | object[] }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{
        // Escape "<" so embedded content can never break out of the script tag
        __html: JSON.stringify(data).replace(/</g, "\\u003c"),
      }}
    />
  );
}

/** Site owner entity — emitted once per locale on every page via the layout. */
export function personJsonLd(locale: Locale) {
  return {
    "@context": "https://schema.org",
    "@type": "Person",
    name: "Omid",
    ...(locale === "fa" ? { alternateName: "امید" } : {}),
    url: SITE,
    jobTitle: "Frontend Developer",
    address: {
      "@type": "PostalAddress",
      addressLocality: "Tehran",
      addressCountry: "IR",
    },
    knowsLanguage: ["en", "fa"],
    knowsAbout: [
      "React.js",
      "JavaScript",
      "HTML5",
      "CSS3",
      "Tailwind CSS",
      "WordPress",
      "Elementor",
      "Content Strategy",
      "English-Persian Translation",
    ],
    sameAs: [
      "https://github.com/omidzzz",
      "https://t.me/simplyeffedup",
    ],
  };
}

export function websiteJsonLd(locale: Locale) {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "Sinisteroid",
    url: `${SITE}/${locale}/`,
    inLanguage: locale,
    publisher: AUTHOR,
  };
}

/** ItemList of selected projects (CreativeWork) — helps LLMs enumerate work. */
export function itemListJsonLd(
  items: { name: string; description: string; url?: string; tags?: string[] }[],
  locale: Locale
) {
  return {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: locale === "fa" ? "نمونه‌کارهای منتخب" : "Selected projects",
    inLanguage: locale,
    itemListElement: items.map((item, i) => ({
      "@type": "ListItem",
      position: i + 1,
      item: {
        "@type": "CreativeWork",
        name: item.name,
        description: item.description,
        ...(item.url ? { url: item.url } : {}),
        ...(Array.isArray(item.tags) && item.tags.length
          ? { keywords: item.tags.join(", ") }
          : {}),
        inLanguage: locale,
      },
    })),
  };
}

export interface BlogPostingMeta {
  title: string;
  excerpt: string;
  /** Absolute URL of the best available cover image */
  imageUrl?: string;
}

export function blogPostingJsonLd(
  post: Post,
  locale: Locale,
  meta: BlogPostingMeta
) {
  const url = `${SITE}/${locale}/blog/${post.slug}/`;
  return {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: meta.title,
    description: meta.excerpt,
    url,
    mainEntityOfPage: { "@type": "WebPage", "@id": url },
    datePublished: isoDate(post.date),
    dateModified: isoDate(post.updated ?? post.date),
    author: AUTHOR,
    publisher: AUTHOR,
    inLanguage: locale,
    ...(Array.isArray(post.tags) && post.tags.length > 0
      ? { keywords: post.tags.join(", ") }
      : {}),
    ...(meta.imageUrl ? { image: meta.imageUrl } : {}),
  };
}

export function faqJsonLd(items: FaqItem[]) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: items.map((item) => ({
      "@type": "Question",
      name: item.question,
      acceptedAnswer: { "@type": "Answer", text: item.answer },
    })),
  };
}

export function breadcrumbJsonLd(
  items: { name: string; url: string }[]
) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: item.name,
      item: item.url,
    })),
  };
}
