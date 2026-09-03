/** Post content model — shared by the static export and the live PHP API. */

export interface PostImage {
  src: string;
  alt?: string | { en?: string; fa?: string };
}

export interface ContentBlock {
  type:
    | "heading"
    | "paragraph"
    | "list"
    | "highlight"
    | "quote"
    | "image"
    | "cta"
    | "stats"
    | "alert"
    | "code"
    | "table";
  level?: number;
  style?: string;
  text?: string;
  label?: string;
  items?: (string | { value: string; label: string })[];
  author?: string;
  src?: string;
  altText?: string | { en?: string; fa?: string };
  caption?: string;
  title?: string;
  buttonText?: string;
  buttonUrl?: string;
  /** alert */
  alertStyle?: string;
  /** code */
  code?: string;
  /** table */
  headers?: string[];
  rows?: string[][];
}

export interface FaqItem {
  question: string;
  answer: string;
}

export interface PostTranslation {
  title: string;
  excerpt: string;
  content: ContentBlock[];
  /** Optional FAQ section (from the original MySQL content_json) */
  faq?: FaqItem[];
  /** Optional raw SEO payload (title/metaDescription/openGraph/twitter/...) */
  seo?: {
    title?: string;
    metaDescription?: string;
    canonical?: string;
    openGraph?: Record<string, unknown>;
    twitter?: Record<string, unknown>;
    keywords?: string;
    focusKeyword?: string;
  };
}

export interface Post {
  slug: string;
  title: string;
  date: string;
  status?: string;
  updated?: string;
  tags: string[];
  featuredImage?: PostImage;
  excerpt?: string;
  translations: {
    en: PostTranslation;
    fa?: PostTranslation;
  };
}