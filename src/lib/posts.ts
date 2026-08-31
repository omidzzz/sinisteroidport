import fs from "fs";
import path from "path";

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


const postsDirectory = path.join(process.cwd(), "content", "posts");

export function getAllPosts(): Post[] {
  if (!fs.existsSync(postsDirectory)) return [];
  const files = fs.readdirSync(postsDirectory).filter((f) => f.endsWith(".json"));
  const posts = files.map((file) => {
    const raw = fs.readFileSync(path.join(postsDirectory, file), "utf8");
    return JSON.parse(raw) as Post;
  });
  // Hide drafts, newest first
  return posts
    .filter((p) => (p.status ?? "published") !== "draft")
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}

export function getPostSlugs(): string[] {
  if (!fs.existsSync(postsDirectory)) return [];
  return fs
    .readdirSync(postsDirectory)
    .filter((f) => f.endsWith(".json"))
    .map((f) => f.replace(/\.json$/, ""));
}

export function getPostBySlug(slug: string): Post | undefined {
  const filePath = path.join(postsDirectory, `${slug}.json`);
  if (!fs.existsSync(filePath)) return undefined;
  const raw = fs.readFileSync(filePath, "utf8");
  return JSON.parse(raw) as Post;
}

import type { Locale } from "@/lib/i18n";

/** Resolve the title/excerpt for a post in a given locale, falling back to English. */
export function getPostMeta(
  post: Post,
  locale: Locale = "en"
): { title: string; excerpt: string; date: string; isFallback: boolean } {
  const chosen = post.translations?.[locale] ?? post.translations?.en;
  return {
    title: chosen?.title ?? post.title,
    excerpt: chosen?.excerpt ?? post.excerpt ?? "",
    date: post.date,
    isFallback: !post.translations?.[locale] && locale !== "en",
  };
}

/** Check whether a public asset referenced by a post actually exists on disk. */
export function publicAssetExists(src: string | undefined): boolean {
  if (!src) return false;
  const clean = src.split("?")[0].replace(/^\//, "");
  return fs.existsSync(path.join(process.cwd(), "public", clean));
}

/** Path of the generated 1200x630 social card for a post, if the OG-card
 * build step (scripts/generate-og-cards.mjs) produced one. Always JPG —
 * webp covers render unreliably in WhatsApp/LinkedIn link previews. */
export function ogCardSrc(slug: string): string | null {
  const p = path.join(process.cwd(), "public", "og", `${slug}.jpg`);
  return fs.existsSync(p) ? `/og/${slug}.jpg` : null;
}

/** Approximate word count over paragraphs, lists and code blocks — used for
 * BlogPosting JSON-LD (wordCount / timeRequired) and reading-time chips. */
export function postWordCount(
  post: Post,
  locale: Locale = "en"
): number {
  const translation = post.translations?.[locale] ?? post.translations?.en;
  return (translation?.content ?? []).reduce((n, b) => {
    let w = typeof b.text === "string" ? b.text.split(/\s+/).length : 0;
    if (Array.isArray(b.items))
      for (const it of b.items)
        if (typeof it === "string") w += it.split(/\s+/).length;
    if (typeof b.code === "string") w += b.code.split(/\s+/).length / 2;
    return n + w;
  }, 0);
}

/** Reading time in whole minutes, mirroring the client-side chip in
 * BlogPostLive so JSON-LD never disagrees with what users see. */
export function postReadMinutes(post: Post, locale: Locale = "en"): number {
  return Math.max(2, Math.round(postWordCount(post, locale) / 210));
}
