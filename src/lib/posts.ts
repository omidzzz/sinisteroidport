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
