// Structured-data builders only. The <JsonLd> JSX renderer lives in
// components/ui/JsonLd.tsx — this module stays a pure-data barrel so it can
// never drag JSX (or server-only code) into a client bundle.
export {
  personJsonLd,
  websiteJsonLd,
  itemListJsonLd,
  blogPostingJsonLd,
  faqJsonLd,
  breadcrumbJsonLd,
  type BlogPostingMeta,
} from "./builders";