"use client";

import { useEffect, useState } from "react";
import VTLink from "@/components/shell/ViewTransition";
import { usePathname } from "next/navigation";
import LogoType from "./LogoType";
import BrandMark from "./BrandMark";
import ThemeToggle from "./ThemeToggle";
import { HeartIcon } from "../ui/icons";
import { getDict, loc, type Locale } from "@/lib/i18n";
import { NAV_PATHS } from "@/lib/nav";

/**
 * MARGIN INDEX NAV (QUIRE, v9) - readable navigation, unconventional placement.
 *
 * - Running head (always visible): brand at the inline-start, utilities
 *   (palette / theme / language / donate) at the inline-end, one hairline
 *   under the whole bar.
 * - Desktop (>=1200px): the dock becomes a MARGIN INDEX - hairline route
 *   numerals pinned to the inline gutter; the active route carries the
 *   vermilion seal. Labels stay as accessible names.
 * - Mobile (<1200px): running head stays; a bottom bar carries the palette
 *   button and a seal pill that opens the full-screen CONTENTS overlay.
 */
export default function Navbar({ locale }: { locale: Locale }) {
  const t = getDict(locale);
  const fa = locale === "fa";
  const [open, setOpen] = useState(false);

  const pathname = usePathname() ?? loc(locale, "/");
  // strip locale prefix so route matching is locale independent
  const clean = pathname.replace(/^\/(en|fa)(?=\/|$)/, "") || "/";

  /* Lock page scroll + Escape closes while the contents overlay is open */
  useEffect(() => {
    document.documentElement.style.overflow = open ? "hidden" : "";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.documentElement.style.overflow = "";
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const langSwap =
    locale === "en" ? (
      <a
        href={`/fa${clean}`}
        className="lang-switch-fa inline-flex min-h-[28px] min-w-[28px] items-center justify-center px-1 font-bold text-acid"
      >
        فا
      </a>
    ) : (
      <a
        href={`/en${clean}`}
        className="inline-flex min-h-[28px] min-w-[28px] items-center justify-center px-1 font-bold text-acid"
      >
        EN
      </a>
    );

  return (
    <>
      {/* == RUNNING HEAD (always visible) ==
          Brand at the start, utilities at the end. The chip-corner /
          chip-start class contract is kept for view-transitions. */}
      <div className="chip-corner chip-start">
        <VTLink
          href={loc(locale, "/")}
          aria-label="Omid — home"
          onClick={() => setOpen(false)}
          className="flex shrink-0 items-center gap-2.5 transition-colors hover:text-acid"
        >
          <BrandMark className="h-[26px] w-[26px]" />
          <LogoType variant="compact" className="align-middle text-[0.92rem]" />
        </VTLink>

        <div className="head-tools">
          {/* Command-palette affordance — keyboard-first (Ctrl+K / /), but a
              real button keeps it discoverable for pointer users. */}
          <button
            type="button"
            onClick={() =>
              window.dispatchEvent(new CustomEvent("open-command-palette"))
            }
            aria-haspopup="dialog"
            aria-label={
              fa ? "باز کردن پالت فرمان (Ctrl+K)" : "Open command palette (Ctrl+K)"
            }
            className="kbd-hint cursor-pointer"
          >
            <span aria-hidden>ctrl</span>
            <span aria-hidden className="kbd-key">
              K
            </span>
          </button>

          <ThemeToggle locale={locale} />

          <span className="font-mono text-[0.72rem] uppercase tracking-[0.12em]">
            {langSwap}
          </span>

          {/* The one commercial link in the chrome. */}
          <a
            href="https://donatr.ee/sinisteroid/"
            target="_blank"
            rel="noopener noreferrer"
            aria-label={fa ? "حمایت مالی" : "Support the work — donate"}
            className="donate-pill"
          >
            <HeartIcon className="donate-heart" />
            {fa ? "حمایت" : "donate"}
          </a>
        </div>
      </div>

      {/* == MARGIN INDEX (desktop) ==
          Hairline route numerals pinned to the inline gutter. The label is
          revealed as a margin note on hover/focus and stays visible on the
          active row (see quire.css §2); it remains the accessible name at
          rest. The active route carries the seal. .dock-wrap/.dock contract
          preserved for view-transitions. */}
      <div className="dock-wrap">
        <nav className="dock" aria-label="Primary">
          {t.nav.map((item, i) => {
            const active =
              NAV_PATHS[i] === "/"
                ? clean === "/"
                : clean.startsWith(NAV_PATHS[i]);
            return (
              <VTLink
                key={NAV_PATHS[i]}
                href={loc(locale, NAV_PATHS[i])}
                aria-current={active ? "page" : undefined}
                className={`dock-link ${active ? "is-active" : ""}`}
              >
                <span className="dock-index">{item.index}</span>
                <span className="dock-label">{item.label}</span>
              </VTLink>
            );
          })}
        </nav>
      </div>

      {/* == MOBILE BAR: palette + contents (seal menu) == */}
      <div className="mob-dock gap-2">
        <button
          type="button"
          onClick={() =>
            window.dispatchEvent(new CustomEvent("open-command-palette"))
          }
          aria-haspopup="dialog"
          aria-label={
            locale === "fa" ? "جستجو (پالت فرمان)" : "Search (command palette)"
          }
          className="mob-pill cursor-pointer"
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            aria-hidden
          >
            <circle cx="11" cy="11" r="7" />
            <path d="m21 21-4.35-4.35" />
          </svg>
        </button>
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          aria-controls="orbital-nav"
          aria-haspopup="dialog"
          className="mob-pill cursor-pointer"
        >
          <span className="mob-burger" aria-hidden>
            <i />
            <i />
            <i />
          </span>
          <span>{locale === "fa" ? (open ? "بستن" : "منو") : open ? "Close" : "Menu"}</span>
        </button>
      </div>

      {/* == CONTENTS OVERLAY (mobile) ==
          The fullscreen contents page (#orbital-nav contract preserved:
          Escape close, scroll lock, palette + language + theme + donate
          access inside). Restyled to paper by quire.css §3. */}
      <div
        id="orbital-nav"
        className={`overlay-veil nav-mobile-only ${open ? "is-open" : ""}`}
        role="dialog"
        aria-modal="true"
        aria-label="Menu"
      >
        <div className="overlay-menu">
          <p className="label mb-6">{t.site}</p>
          {t.nav.map((item, i) => (
            <VTLink
              key={NAV_PATHS[i]}
              href={loc(locale, NAV_PATHS[i])}
              aria-current={
                NAV_PATHS[i] === "/"
                  ? clean === "/"
                    ? "page"
                    : undefined
                  : clean.startsWith(NAV_PATHS[i])
                    ? "page"
                    : undefined
              }
              data-off={i}
              className={`overlay-link text-[clamp(1.9rem,9vw,3.4rem)] ${
                (NAV_PATHS[i] === "/" ? clean === "/" : clean.startsWith(NAV_PATHS[i]))
                  ? "is-active"
                  : ""
              }`}
              onClick={() => setOpen(false)}
            >
              <span className="overlay-index me-3 align-middle">{item.index}</span>
              {item.label}
            </VTLink>
          ))}
          <div className="mt-8 flex flex-wrap items-center gap-4 font-mono text-xs uppercase tracking-widest text-muted">
            {langSwap}
            <span className="h-px w-8 bg-line" aria-hidden />
            <ThemeToggle locale={locale} />
            <span className="h-px w-8 bg-line" aria-hidden />
            {/* Palette affordance — labeled access for touch users who never
                see the desktop ctrl+K hint. Opens the palette above this
                overlay, so the overlay must close (scroll re-locks there). */}
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                window.dispatchEvent(new CustomEvent("open-command-palette"));
              }}
              aria-haspopup="dialog"
              className="inline-flex min-h-[44px] cursor-pointer items-center gap-1.5 text-acid transition-colors hover:text-ink"
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                aria-hidden
              >
                <circle cx="11" cy="11" r="7" />
                <path d="m21 21-4.35-4.35" />
              </svg>
              {locale === "fa" ? "جستجو" : "search"}
            </button>
            <span className="h-px w-8 bg-line" aria-hidden />
            <a
              href="https://donatr.ee/sinisteroid/"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex min-h-[44px] items-center gap-1.5 text-acid transition-colors hover:text-ink"
            >
              <HeartIcon className="donate-heart" />
              {fa ? "حمایت" : "donate"}
            </a>
            <span>{t.city}</span>
          </div>
        </div>
      </div>
    </>
  );
}
