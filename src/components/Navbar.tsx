"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import LogoType from "./LogoType";
import ThemeToggle from "./ThemeToggle";
import { HeartIcon } from "./icons";
import { getDict, loc, type Locale } from "@/lib/i18n";

const NAV_PATHS = ["/", "/work", "/skills", "/education", "/showcase", "/blog"];

/**
 * CONSOLE DOCK NAV — readable navigation, unconventional placement.
 *
 *  • Desktop (md+): a floating capsule dock pinned to the BOTTOM center.
 *    Indexed uppercase mono links stay fully legible over any background;
 *    the active route carries an acid underline beam. Brand lives in its
 *    own corner chip (top start); telemetry + language + theme sit in the
 *    dock's tail section.
 *
 *  • Mobile: brand chip up top, a bottom-center SIGNAL pill opens ORBITAL
 *    — the fullscreen staggered display-link overlay (reused voice).
 */
export default function Navbar({ locale }: { locale: Locale }) {
  const t = getDict(locale);
  const fa = locale === "fa";
  const [open, setOpen] = useState(false);

  const pathname = usePathname() ?? loc(locale, "/");
  // strip locale prefix so route matching is locale independent
  const clean = pathname.replace(/^\/(en|fa)(?=\/|$)/, "") || "/";

  /* Lock page scroll + Escape closes while the orbital overlay is open */
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
      <a href={`/fa${clean}`} className="font-bold text-acid">
        فا
      </a>
    ) : (
      <a href={`/en${clean}`} className="font-bold text-acid">
        EN
      </a>
    );

  return (
    <>
      {/* ══ BRAND CORNER CHIP (always visible) ══ */}
      <div className="chip-corner chip-start">
        <Link
          href={loc(locale, "/")}
          aria-label="Omid — home"
          onClick={() => setOpen(false)}
          className="flex shrink-0 items-center gap-2.5 transition-colors hover:text-acid"
        >
          <span className="relative grid place-items-center" aria-hidden>
            <span className="orbit-pip" />
            <span className="nav-dot" />
          </span>
          <LogoType variant="compact" className="align-middle text-[0.92rem]" />
        </Link>
      </div>

      {/* ══ DESKTOP FLOATING DOCK ══════════════════════════ */}
      <div className="dock-wrap">
        <nav className="dock" aria-label="Primary">
          {t.nav.map((item, i) => {
            const active =
              NAV_PATHS[i] === "/"
                ? clean === "/"
                : clean.startsWith(NAV_PATHS[i]);
            return (
              <Link
                key={NAV_PATHS[i]}
                href={loc(locale, NAV_PATHS[i])}
                className={`dock-link ${active ? "is-active" : ""}`}
              >
                <span className="dock-index">{item.index}</span>
                {item.label}
              </Link>
            );
          })}

          <span className="dock-sep" aria-hidden />

          <ThemeToggle locale={locale} />
          <span className="ps-3 pe-1 font-mono text-[0.72rem] uppercase tracking-[0.12em]">
            {langSwap}
          </span>
        </nav>
      </div>

      {/* ══ MOBILE MENU BUTTON (easy to find, labeled "Menu") ══ */}
      <div className="mob-dock md:hidden">
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

      {/* ══ MOBILE ORBITAL OVERLAY ═════════════════════════ */}
      <div
        id="orbital-nav"
        className={`overlay-veil md:hidden ${open ? "is-open" : ""}`}
        role="dialog"
        aria-modal="true"
        aria-label="Menu"
      >
        <div
          className="orbit-ring start-[-30%] top-[-35%] h-[130vw] w-[130vw]"
          aria-hidden
        />
        <div className="overlay-menu">
          <p className="label mb-6">{t.site}</p>
          {t.nav.map((item, i) => (
            <Link
              key={NAV_PATHS[i]}
              href={loc(locale, NAV_PATHS[i])}
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
            </Link>
          ))}
          <div className="mt-8 flex items-center gap-4 font-mono text-xs uppercase tracking-widest text-muted">
            {langSwap}
            <span className="h-px w-8 bg-line" aria-hidden />
            <ThemeToggle locale={locale} />
            <span className="h-px w-8 bg-line" aria-hidden />
            <a
              href="https://donatr.ee/sinisteroid/"
              target="_blank"
              rel="noopener noreferrer"
              className="donate-inline gap-1.5 text-acid transition-colors hover:text-ink"
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