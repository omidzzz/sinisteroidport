"use client";

import { useState } from "react";
import { SITE } from "@/lib/seo";
import type { Locale } from "@/lib/i18n";

/**
 * SharePost — share bar for article pages. Renders a row of plain share
 * links (Telegram, WhatsApp, X, LinkedIn, copy-link) built from the
 * canonical URL so the shared card resolves to the og:image 1200x630
 * social card. Links are data-track'd so AnalyticsEvents measures each
 * share surface as a click funnel (`share_click` / `copy_link_click`).
 */
export default function SharePost({
  slug,
  title,
  locale,
}: {
  slug: string;
  title: string;
  locale: Locale;
}) {
  const [copied, setCopied] = useState(false);
  const url = `${SITE}/${locale}/blog/${slug}/`;
  const enc = encodeURIComponent(url);
  const text = encodeURIComponent(title);

  const channels: { label: string; href: string }[] = [
    {
      label: locale === "fa" ? "تلگرام" : "Telegram",
      href: `https://t.me/share/url?url=${enc}&text=${text}`,
    },
    {
      label: "WhatsApp",
      href: `https://wa.me/?text=${text}%20${enc}`,
    },
    {
      label: "X",
      href: `https://twitter.com/intent/tweet?url=${enc}&text=${text}`,
    },
    {
      label: "LinkedIn",
      href: `https://www.linkedin.com/sharing/share-offsite/?url=${enc}`,
    },
  ];

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      /* clipboard denied — the address bar still has the URL */
    }
  };

  return (
    <div className="mt-6 flex flex-wrap items-center gap-2 border-t border-line pt-4">
      <span className="label">
        {locale === "fa" ? "(انتشار سیگنال)" : "(Share the signal)"}
      </span>
      <span className="h-px w-8 bg-line" aria-hidden />
      {channels.map((c) => (
        <a
          key={c.label}
          href={c.href}
          target="_blank"
          rel="noopener noreferrer"
          data-track="share_click"
          aria-label={`${locale === "fa" ? "به‌اشتراک در" : "Share on"} ${c.label}`}
          className="inline-flex items-center gap-1.5 border border-line px-3 py-1.5 font-mono text-[0.66rem] uppercase tracking-[0.14em] text-muted transition-colors hover:border-acid/60 hover:text-acid"
        >
          {c.label}
        </a>
      ))}
      <button
        type="button"
        onClick={copy}
        data-track="copy_link_click"
        className={`inline-flex items-center gap-1.5 border px-3 py-1.5 font-mono text-[0.66rem] uppercase tracking-[0.14em] transition-colors ${
          copied
            ? "border-acid/70 text-acid"
            : "border-line text-muted hover:border-acid/60 hover:text-acid"
        }`}
      >
        {copied
          ? (locale === "fa" ? "کپی شد ✓" : "Copied ✓")
          : (locale === "fa" ? "کپی لینک" : "Copy link")}
      </button>
    </div>
  );
}