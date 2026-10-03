import VTLink from "@/components/shell/ViewTransition";
import LogoType from "./LogoType";
import { ArrowIcon } from "../ui/icons";
import AskSinisterButton from "../blog/AskSinisterButton";
import { getDict, loc, type Locale } from "@/lib/i18n";
import { NAV_PATHS } from "@/lib/nav";
import { BRAND } from "@/lib/brand";

/**
 * FOOTER — COLOPHON (Code & Craft) · END OF TRANSMISSION
 *
 * Redesign v2. The prose sentence that used to BE the sitemap became a
 * scannable index — Index (the eight routes), Reach (the four contact
 * marks) and Elsewhere (feeds, the agent, support) — under a one-line lede.
 * A mono metadata rail closes the page, and the edition/language switches
 * moved OUT of here into the dock tools, so every control has exactly one
 * home instead of two.
 *
 * Kept on purpose: the transparent ground (no seam — diag-footer.mjs), the
 * --console-h tail reserve that keeps the end-mark tappable under the fixed
 * dock (verify-mobile-chrome.mjs), the eager render — no content-visibility
 * (verify-craft.mjs) — and the 5.6rem inline-end clearance that parks the
 * seal clear of the assistant FAB at every width. The EN lede must keep the
 * words "a working console": verify-craft asserts the console register.
 */
export default function Footer({ locale }: { locale: Locale }) {
  const t = getDict(locale);
  const fa = locale === "fa";
  const year = new Date().getFullYear();

  /* Reach — the same four contact marks the prose carried as footnotes. */
  const reach: Array<{
    label: string;
    href: string;
    external?: boolean;
    ltr?: boolean;
  }> = [
    { label: fa ? "رایانامه" : "Email", href: `mailto:${BRAND.contact.email}` },
    { label: fa ? "گیت‌هاب" : "GitHub", href: BRAND.contact.github, external: true },
    { label: fa ? "تلگرام" : "Telegram", href: BRAND.contact.telegram, external: true },
    { label: fa ? "تلفن" : "Telephone", href: `tel:${BRAND.contact.phone}`, ltr: true },
  ];

  const tech = [
    "SET IN SPACE GROTESK · INTER · JETBRAINS MONO · CAIRO",
    "NEXT.JS × REACT",
    `${t.city} · ${year} · ${BRAND.host.toUpperCase()}`,
  ];

  return (
    <footer className="craft-footer">
      <div className="craft-footer-signal" aria-hidden />
      <div className="craft-footer-inner">
        {/* ── lede: the console signs off ── */}
        <header className="craft-footer-lede">
          <p className="craft-footer-eyebrow">
            <span dir="ltr" aria-hidden>
              [eof]
            </span>
            {fa ? "پایان انتقال" : "End of transmission"}
          </p>
          <p className="craft-footer-line">
            {fa ? (
              <>
                این سایت یک <b>کنسول کاری</b> است — هر جا تایپ کنید تا حرکت
                کنید، یا از میان‌برهای نوار وضعیت استفاده کنید.
              </>
            ) : (
              <>
                This site is <b>a working console</b> — start typing anywhere to
                navigate, or take the shortcuts in the status rail.
              </>
            )}
          </p>
        </header>

        {/* ── the index: every destination, one hop away ── */}
        <nav
          className="craft-footer-index"
          aria-label={fa ? "نقشه سایت" : "Sitemap"}
        >
          <section className="craft-footer-col">
            <h2 className="craft-footer-head">{fa ? "(فهرست)" : "(Index)"}</h2>
            <ul className="craft-footer-list">
              {t.nav.map((item, i) => (
                <li key={NAV_PATHS[i]}>
                  <VTLink
                    href={loc(locale, NAV_PATHS[i])}
                    className="craft-footer-link"
                  >
                    {item.label}
                  </VTLink>
                </li>
              ))}
            </ul>
          </section>
          <section className="craft-footer-col">
            <h2 className="craft-footer-head">{fa ? "(تماس)" : "(Reach)"}</h2>
            <ul className="craft-footer-list">
              {reach.map((item) => (
                <li key={item.href}>
                  <a
                    href={item.href}
                    className="craft-footer-link"
                    dir={item.ltr ? "ltr" : undefined}
                    {...(item.external
                      ? { target: "_blank", rel: "noopener noreferrer" }
                      : {})}
                  >
                    {item.label}
                  </a>
                </li>
              ))}
            </ul>
          </section>

          <section className="craft-footer-col">
            <h2 className="craft-footer-head">
              {fa ? "(بیشتر)" : "(Elsewhere)"}
            </h2>
            <ul className="craft-footer-list">
              <li>
                <a
                  href={fa ? "/fa/feed.xml" : "/feed.xml"}
                  className="craft-footer-link"
                  aria-label={`${t.rss} ${fa ? "خوراک" : "feed"}`}
                >
                  {t.rss}
                </a>
              </li>
              <li>
                <a
                  href={fa ? "/fa/feed.json" : "/feed.json"}
                  className="craft-footer-link"
                  aria-label={t.jsonFeed}
                >
                  {t.jsonFeed}
                </a>
              </li>
              <li>
                <AskSinisterButton
                  locale={locale}
                  className="craft-footer-link"
                  label={fa ? "سینستر" : "SINISTER"}
                  prompt={
                    fa
                      ? "خودت رو معرفی کن — این‌جا چه‌کارهایی ازت برمیاد؟"
                      : "Introduce yourself — what can you do around here?"
                  }
                />
              </li>
              <li>
                <a
                  href={BRAND.contact.donate}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="craft-footer-link"
                >
                  {fa ? "حمایت" : "Support"}
                </a>
              </li>
            </ul>
          </section>
        </nav>

        {/* ── the rail: legal + tech on the start, lockup + seal on the end ── */}
        <div className="craft-footer-meta">
          <div className="craft-footer-legal">
            <p className="craft-footer-note" suppressHydrationWarning>
              © {year} {t.rights}
            </p>
            {tech.map((line) => (
              <p key={line} dir="ltr" className="craft-footer-note" aria-hidden>
                {line}
              </p>
            ))}
          </div>
          <div className="craft-footer-sign">
            <LogoType variant="full" activate className="craft-footer-lockup" />
            <a
              href="#top"
              aria-label={fa ? "بازگشت به بالای صفحه" : "Back to top"}
              className="end-mark"
            >
              <ArrowIcon className="size-4 -rotate-90" />
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
