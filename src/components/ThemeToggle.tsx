"use client";

import type { Locale } from "@/lib/i18n";

/** Monoline sun — matches the hairline/editorial stroke language */
function SunIcon() {
  return (
    <svg
      width="15"
      height="15"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      aria-hidden
    >
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2m0 16v2M4.93 4.93l1.41 1.41m11.32 11.32 1.41 1.41M2 12h2m16 0h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
    </svg>
  );
}

/** Monoline crescent */
function MoonIcon() {
  return (
    <svg
      width="15"
      height="15"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M21 12.79A9 9 0 1 1 11.21 3a7 7 0 0 0 9.79 9.79Z" />
    </svg>
  );
}

/**
 * Light/dark toggle. Writes data-theme on <html> (the tokens in globals.css
 * do the rest), persists to localStorage and broadcasts a "themechange"
 * event so canvas-based components (GLBackground) repaint without a reload.
 *
 * Both icons are rendered into the SSR HTML; pure CSS shows the one for the
 * active theme (sun while dark = switch to light, moon while light). The
 * incoming icon spin-pops via a CSS animation that starts whenever it
 * begins matching the [data-theme] selector — zero React state.
 */
export default function ThemeToggle({ locale }: { locale: Locale }) {
  const toggle = () => {
    const next =
      document.documentElement.dataset.theme === "light" ? "dark" : "light";
    document.documentElement.dataset.theme = next;
    try {
      localStorage.setItem("theme", next);
    } catch {
      /* private mode — session-only theme */
    }
    window.dispatchEvent(new Event("themechange"));
  };

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={
        locale === "fa" ? "تغییر حالت روشن/تیره" : "Toggle light/dark mode"
      }
      className="icon-toggle inline-flex min-h-[44px] min-w-[44px] items-center justify-center text-muted transition-colors hover:text-accent"
    >
      <span aria-hidden className="icon-sun">
        <SunIcon />
      </span>
      <span aria-hidden className="icon-moon">
        <MoonIcon />
      </span>
    </button>
  );
}
