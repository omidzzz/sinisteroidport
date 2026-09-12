import tagData from "@/data/tags.json";
import type { Locale } from "./i18n";

/**
 * Canonical tag taxonomy — shared by tag archive pages, JSON-LD keywords,
 * the sitemap and the tag normalization script (scripts/normalize-tags.mjs
 * reads the same JSON directly, since scripts can't import TS).
 */

export interface TagDef {
  slug: string;
  en: string;
  fa: string;
}

const canonicalBySlug = new Map<string, TagDef>(
  tagData.canonical.map((t) => [t.slug, t])
);
const aliasMap = tagData.map as Record<string, string>;

/** Map raw (legacy/junk) tag strings onto canonical tag slugs. */
export function normalizeTags(tags: string[] | undefined): string[] {
  if (!Array.isArray(tags)) return [];
  const out: string[] = [];
  for (const raw of tags) {
    const slug = aliasMap[raw] ?? (canonicalBySlug.has(raw) ? raw : null);
    if (slug && !out.includes(slug)) out.push(slug);
  }
  return out.slice(0, 6);
}

/** Display label for a canonical tag slug, in the given locale. */
export function tagLabel(slug: string, locale: Locale): string {
  return canonicalBySlug.get(slug)?.[locale] ?? slug;
}

/**
 * Editorial lead paragraph for each topic hub — the "why read this
 * cluster" hook shown under the tag-page header. Sells the cluster as a
 * reading path (topical authority) instead of a bare link dump, which is
 * what makes /tags/<slug>/ pages worth ranking AND worth clicking.
 */
const TAG_LEADS: Record<string, { en: string; fa: string }> = {
  "ai-coding-agents": {
    en: "Hands-on comparison and evaluation of AI coding agents — Claude Code, Cline and friends — written from the daily-driver perspective of a frontend developer, not a vendor.",
    fa: "مقایسه و ارزیابی عملی عامل‌های کدنویسی هوش مصنوعی — کلود کد، کلاین و دیگران — از نگاه توسعه‌دهنده‌ای که هر روز با آن‌ها کار می‌کند، نه از نگاه فروشنده.",
  },
  "local-ai": {
    en: "Self-hosted AI you actually run: Ollama, Open WebUI and the tooling that keeps your prompts and data on your own hardware.",
    fa: "هوش مصنوعی محلی که واقعاً اجرا می‌کنید: اولاما، اوپن وبیو و ابزارهایی که پرامپت و داده‌هایتان را روی سخت‌افزار خودتان نگه می‌دارند.",
  },
  "ai-tools": {
    en: "Practical notes on the AI tools around the ecosystem — what they solve, what they cost, and where the hype outruns the value.",
    fa: "یادداشت‌های عملی درباره ابزارهای هوش مصنوعی اکوسیستم — چه مسئله‌ای را حل می‌کنند، چه هزینه‌ای دارند و هیجان کجا از ارزش واقعی جلو می‌افتد.",
  },
  "ai-privacy": {
    en: "The data-safety side of AI: what your tools silently send home, and the settings, self-hosting paths and habits that fix it.",
    fa: "جنبه امنیت داده در هوش مصنوعی: ابزارهایتان بی‌صدا چه می‌فرستند و چه تنظیمات، مسیرهای خودمیزبانی و عاداتی آن را حل می‌کند.",
  },
  "open-source-ai": {
    en: "Open-weight models and open-source AI infrastructure — why open matters for control, cost and auditing your own stack.",
    fa: "مدل‌های متن‌باز و زیرساخت متن‌باز هوش مصنوعی — چرا بازبودن برای کنترل، هزینه و حسابرسی استک شما مهم است.",
  },
  "seo-geo": {
    en: "The shift from blue links to AI-generated answers: SEO and GEO tactics, zero-click search, content clusters and the future of being found.",
    fa: "تغییر از پیوندهای آبی به پاسخ‌های تولیدشده توسط هوش مصنوعی: تکنیک‌های سئو و GEO، جست‌وجوی بی‌کلیک، خوشه‌های محتوا و آینده دیده‌شدن.",
  },
  "content-strategy": {
    en: "Why content strategy had to die and be reborn for conversational interfaces — clusters, topical authority and answers instead of articles.",
    fa: "چرا استراتژی محتوا باید از بین برود و برای رابط‌های گفتگویی دوباره متولد شود — خوشه‌ها، اقتدار موضوعی و پاسخ‌ها به‌جای مقالات.",
  },
  "frontend-design": {
    en: "Design that communicates and code that performs: modern frontend techniques and the craft between markup and meaning.",
    fa: "طراحی که ارتباط برقرار می‌کند و کدی که عملکرد می‌دهد: تکنیک‌های مدرن فرانت‌اند و کاردستی میان نشانه‌گذاری و معنا.",
  },
  "web-architecture": {
    en: "Blueprint thinking for the web — how pages are built, served and indexed when agents, not just browsers, are your visitors.",
    fa: "اندیشه معماری برای وب — صفحه‌ها چگونه ساخته، سرو و ایندکس می‌شوند وقتی عامل‌ها، نه فقط مرورگرها، بازدیدکننده‌هایتان هستند.",
  },
};

/** Editorial lead for a tag hub; empty string when the tag has none. */
export function tagLead(slug: string, locale: Locale): string {
  return TAG_LEADS[slug]?.[locale] ?? "";
}

/** Every canonical tag actually used by at least one post, alphabetical. */
export function usedTags(posts: { tags?: string[] }[]): TagDef[] {
  const used = new Set<string>();
  for (const p of posts) for (const t of normalizeTags(p.tags)) used.add(t);
  return tagData.canonical.filter((t) => used.has(t.slug));
}
