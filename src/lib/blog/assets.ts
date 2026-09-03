import fs from "fs";
import path from "path";

/** Server-only asset helpers (import fs — keep out of client bundles). */

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