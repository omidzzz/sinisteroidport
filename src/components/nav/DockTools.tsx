"use client";

import VTLink from "@/components/shell/ViewTransition";
import ThemeToggle from "@/components/layout/ThemeToggle";
import type { Locale } from "@/lib/i18n";

/**
 * DOCK TOOLS — the two chrome switches, in the nav where they belong.
 *
 * Minimal by design: the edition toggle (reused ThemeToggle — the tokens flip
 * from <html data-theme>, zero React state) and one language pill that keeps
 * the visitor on the SAME page across the flip (/en/work/ ↔ /fa/work/).
 * No panel, no menu, no JS: a language swap is a document load, so it rides
 * the cross-document View Transition like every other full-page hop.
 *
 * Rendered as the dock's last child: on desktop it reads as a status line
 * under the prompt, and in the ≤48rem collapsed dock (column-reverse) it
 * stacks directly above the menu button — so both switches stay one tap away
 * on phones, where the rail and prompt are hidden.
 */
export default function DockTools({
  locale,
  pathname,
}: {
  locale: Locale;
  pathname: string;
}) {
  const fa = locale === "fa";
  const other: Locale = fa ? "en" : "fa";

  // Strip the active locale prefix, then re-prefix with the target one and
  // restore the trailing slash the static routes canonicalise to.
  const clean = pathname.replace(/^\/(en|fa)(?=\/|$)/, "").replace(/\/+$/, "");
  const href = clean === "" ? `/${other}/` : `/${other}${clean}/`;

  return (
    <div className="craft-tools">
      <ThemeToggle locale={locale} className="craft-tool" />
      <VTLink
        href={href}
        hrefLang={other}
        lang={other}
        className={fa ? "craft-tool craft-tool-lang" : "craft-tool craft-tool-lang lang-switch-fa"}
        aria-label={fa ? "Read this page in English" : "این صفحه را به فارسی بخوانید"}
      >
        {fa ? "EN" : "فا"}
      </VTLink>
    </div>
  );
}
