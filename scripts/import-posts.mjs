/**
 * Imports a phpMyAdmin JSON export of the `posts` table (from sinisteroid.ir)
 * into content/posts/*.json for the Next.js site.
 *
 * Usage:
 *   node scripts/import-posts.mjs <path-to-export.json>
 *
 * Handles:
 *  - phpMyAdmin export envelope ({type:"table", name:"posts", data:[...]})
 *  - escaped slashes and embedded JSON strings (content_json, featured_image)
 *  - nested/duplicated arrays inside content_json.content (flattens recursively)
 *  - per-locale faq + seo payloads
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const outDir = path.join(root, "content", "posts");

const inputPath = process.argv[2];
if (!inputPath) {
  console.error("Usage: node scripts/import-posts.mjs <path-to-export.json>");
  process.exit(1);
}

const rawExport = fs.readFileSync(path.resolve(inputPath), "utf8");
const parsed = JSON.parse(rawExport);

// Locate the posts table rows inside the phpMyAdmin envelope
let rows = null;
if (Array.isArray(parsed)) {
  const tableEntry = parsed.find(
    (e) => e?.type === "table" && e?.name === "posts" && Array.isArray(e.data)
  );
  if (tableEntry) rows = tableEntry.data;
} else if (Array.isArray(parsed?.data)) {
  rows = parsed.data;
}
if (!rows) {
  console.error("Could not find a posts table with data in the export.");
  process.exit(1);
}

/** Recursively flatten nested arrays of blocks (export contains [[...],[...]]) */
function flattenBlocks(arr) {
  const out = [];
  for (const item of arr ?? []) {
    if (Array.isArray(item)) out.push(...flattenBlocks(item));
    else if (item && typeof item === "object") out.push(item);
  }
  return out;
}

function safeParse(jsonString) {
  try {
    return JSON.parse(jsonString);
  } catch {
    return null;
  }
}

function normalizeDate(value) {
  if (!value) return new Date().toISOString().slice(0, 19).replace("T", " ");
  // "2026-06-02 04:47:11" → keep as-is; ensure ISO-ish for Date parsing on the site
  return value.replace("T", " ").slice(0, 19);
}

fs.mkdirSync(outDir, { recursive: true });

let imported = 0;
let failed = 0;

for (const row of rows) {
  const slug = String(row.slug ?? "").trim();
  if (!slug) {
    console.warn(`⚠ skipping row without slug (id ${row.id})`);
    continue;
  }

  const translationsRaw = safeParse(row.content_json ?? "");
  if (!translationsRaw) {
    console.error(`✗ ${slug}: could not parse content_json — skipped`);
    failed++;
    continue;
  }

  const featuredImage = safeParse(row.featured_image ?? "") ?? undefined;

  const translations = {};
  for (const locale of ["en", "fa"]) {
    const t = translationsRaw[locale];
    if (!t || typeof t !== "object") continue;
    const entry = {
      title: t.title ?? "",
      excerpt: t.excerpt ?? "",
      content: flattenBlocks(t.content),
    };
    if (Array.isArray(t.faq) && t.faq.length) entry.faq = t.faq;
    if (t.seo && typeof t.seo === "object") entry.seo = t.seo;
    translations[locale] = entry;
  }

  if (!translations.en?.content?.length && !translations.fa?.content?.length) {
    console.warn(`⚠ ${slug}: no usable content — skipped`);
    continue;
  }

  const post = {
    slug,
    title: translations.en?.title ?? translations.fa?.title ?? slug,
    date: normalizeDate(row.date_published),
    updated: row.date_updated ? normalizeDate(row.date_updated) : undefined,
    status: row.status ?? "published",
    tags: row.tags
      ? String(row.tags)
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean)
      : [],
    ...(featuredImage?.src ? { featuredImage } : {}),
    translations,
  };

  fs.writeFileSync(
    path.join(outDir, `${slug}.json`),
    JSON.stringify(post, null, 2)
  );
  imported++;
  const locales = Object.keys(translations).join("+");
  console.log(
    `✓ ${slug} [${locales}] (${translations.en?.content?.length ?? 0} en blocks)`
  );
}

console.log(`\nDone. Imported ${imported}, failed ${failed}, into ${outDir}`);
