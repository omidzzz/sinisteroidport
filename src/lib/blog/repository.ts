import fs from "fs";
import path from "path";
import type { Post } from "./types";

/**
 * Post repository — reads the JSON post files from /content/posts.
 * Server-only (imports fs); never import this module from a client bundle.
 */
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