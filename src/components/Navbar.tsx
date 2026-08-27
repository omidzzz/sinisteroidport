"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import ThemeToggle from "./ThemeToggle";
import LogoType from "./LogoType";
import { getDict, loc, type Locale } from "@/lib/i18n";

const NAV_PATHS = ["/", "/work", "/skills", "/education", "/showcase", "/blog"];

export default function Navbar({ locale }: { locale: Locale }) {
  const t = getDict(locale);
  const [open, setOpen] = useState(false);
  // Auto-hide: tuck the bar away scrolling down, bring it back scrolling up.
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    let lastY = window.scrollY;
    let raf = 0;
    const onScroll = () => {
      if (raf) return;
      raf = requestAnimationFrame(() => {
        raf = 0;
        const y = window.scrollY;
        setHidden(y > lastY && y > 140 && !open);
        lastY = y;
      });
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      if (raf) cancelAnimationFrame(raf);
    };
  }, [open]);

  return (
    <header
      className={`sticky top-0 z-50 border-b border-line bg-bg/75 backdrop-blur-md transition-transform duration-300 ${
        hidden ? "-translate-y-full" : "translate-y-0"
      }`}
    >
      <nav className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 sm:px-6">
        <Link
          href={loc(locale, "/")}
          className="group -mx-1 rounded-sm px-1 py-0.5"
          aria-label="Omid — home"
          onClick={() => setOpen(false)}
        >
          <LogoType
            variant="compact"
            className="align-middle text-[0.95rem] sm:text-[1.05rem]"
          />
          <span className="label ml-2 hidden select-none sm:inline">
            {t.site}
          </span>
        </Link>

        {/* ── Desktop: full inline nav (identical on every page) ──────── */}
        <ul className="hidden items-center gap-x-6 font-mono text-[0.68rem] uppercase tracking-[0.15em] text-muted md:flex">
          {t.nav.map((item, i) => (
            <li key={NAV_PATHS[i]}>
              <Link
                href={loc(locale, NAV_PATHS[i])}
                className="group transition-colors hover:text-accent"
              >
                <span className="mr-1 text-muted transition-colors group-hover:text-accent">
                  {item.index}
                </span>
                {item.label}
              </Link>
            </li>
          ))}
          {/* Language switcher */}
          <li className="ms-2 border-s border-line ps-4">
            {locale === "en" ? (
              <a href="/fa" className="font-bold text-accent">
                فا
              </a>
            ) : (
              <a href="/en" className="font-bold text-accent">
                EN
              </a>
            )}
          </li>
          {/* Light/dark toggle */}
          <li className="ms-1">
            <ThemeToggle locale={locale} />
          </li>
        </ul>

        {/* ── Mobile: hamburger toggle ───────────────────────────────── */}
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          aria-controls="mobile-nav"
          className="flex min-h-[44px] min-w-[44px] items-center justify-center gap-x-2 font-mono text-[0.68rem] uppercase tracking-[0.15em] text-muted transition-colors hover:text-accent md:hidden"
        >
          <span className="relative flex h-3 w-4 flex-col justify-center">
            <span
              className={`absolute inset-x-0 top-0 h-px bg-current transition-transform duration-300 ${
                open ? "translate-y-[5.5px] rotate-45" : ""
              }`}
            />
            <span
              className={`absolute inset-x-0 bottom-0 h-px bg-current transition-transform duration-300 ${
                open ? "-translate-y-[6.5px] -rotate-45" : ""
              }`}
            />
            <span
              className={`absolute inset-x-0 top-1/2 h-px -translate-y-1/2 bg-current transition-opacity duration-200 ${
                open ? "opacity-0" : "opacity-100"
              }`}
            />
          </span>
          {locale === "fa" ? (open ? "بستن" : "منو") : open ? "Close" : "Menu"}
        </button>
      </nav>

      {/* ── Mobile dropdown panel ───────────────────────────────────── */}
      <div
        id="mobile-nav"
        className={`overflow-hidden border-t border-line transition-[max-height,opacity] duration-300 ease-out md:hidden ${
          open ? "max-h-[60vh] opacity-100" : "max-h-0 border-t-0 opacity-0"
        }`}
      >
        <ul className="flex flex-col px-4 py-3 font-mono text-[0.72rem] uppercase tracking-[0.15em] text-muted">
          {t.nav.map((item, i) => (
            <li key={NAV_PATHS[i]}>
              <Link
                href={loc(locale, NAV_PATHS[i])}
                className="flex items-baseline gap-3 border-b border-line/50 py-3 transition-colors hover:text-accent"
                onClick={() => setOpen(false)}
              >
                <span className="text-muted">{item.index}</span>
                {item.label}
              </Link>
            </li>
          ))}
          <li className="flex items-center justify-between gap-4 pt-3">
            {locale === "en" ? (
              <a href="/fa" className="font-bold text-accent">
                نسخه فارسی
              </a>
            ) : (
              <a href="/en" className="font-bold text-accent">
                English version
              </a>
            )}
            <ThemeToggle locale={locale} />
          </li>
        </ul>
      </div>
    </header>
  );
}



