"use client";

import { useEffect } from "react";
import { trackEvent } from "@/lib/analytics";

/**
 * Zero-point event wiring for the static export — a single delegated click
 * listener (rather than per-link handlers spread across components) maps
 * anchors to GA4 events:
 *
 *   mailto:          → contact_click / method: email
 *   tel:             → contact_click / method: phone
 *   donatr.ee links  → donate_click            (footer donate CTA + mobile menu)
 *   other external   → outbound_click          (GitHub, Telegram, …)
 *
 * Same-origin (internal) links are skipped. Renders nothing; mounted once
 * in the root layout. Events queue straight into window.dataLayer, so they
 * fire even before gtag.js finishes loading. For a static site there is no
 * router-level page_view distinction to wire — the config sends each
 * request's location as page_view automatically.
 */
export function AnalyticsEvents() {
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement | null;
      const anchor = target?.closest?.("a");
      if (!anchor) return;
      const href = anchor.href;
      if (!href) return;
      const text = (anchor.textContent ?? "").trim().slice(0, 80);

      try {
        if (href.startsWith("mailto:")) {
          trackEvent("contact_click", { method: "email", text });
        } else if (href.startsWith("tel:")) {
          trackEvent("contact_click", { method: "phone", text });
        } else if (href.includes("donatr.ee")) {
          trackEvent("donate_click", { url: href, text });
        } else if (/^https?:/.test(href)) {
          // Skip internal navigation (next/link resolves to our own origin).
          if (new URL(href).origin === window.location.origin) return;
          trackEvent("outbound_click", { url: href, text });
        }
      } catch {
        /* malformed href — ignore, never break clicks */
      }
    };

    document.addEventListener("click", onClick);
    return () => document.removeEventListener("click", onClick);
  }, []);

  return null;
}