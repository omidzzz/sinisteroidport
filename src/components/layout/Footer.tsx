import VTLink from "@/components/shell/ViewTransition";
import ThemeToggle from "./ThemeToggle";
import LogoType from "./LogoType";
import { ArrowIcon } from "../ui/icons";
import AskSinisterButton from "../blog/AskSinisterButton";
import { getDict, loc, type Locale } from "@/lib/i18n";
import { NAV_PATHS } from "@/lib/nav";

/**
 * FOOTER — COLOPHON (Code & Craft).
 *
 * One measure of prose whose words ARE the sitemap; reach routes, feeds,
 * the assistant, the language swap and the theme toggle ride as marginalia
 * beneath it. The yellow end-mark returns to the top — zero-JS smooth
 * anchor. Styled by craft/footer.css, scoped to this register.
 */
export default function Footer({ locale }: { locale: Locale }) {
  const t = getDict(locale);
  const fa = locale === "fa";
  const year = new Date().getFullYear();

  /* Reach routes — same contacts as before, resolved as footnote marks. */
  const reach: Array<[string, string]> = [
    ["Email", "mailto:ghadamgahi.omid@gmail.com"],
    ["GitHub", "https://github.com/omidzzz"],
    ["Telegram", "https://t.me/simplyeffedup"],
    ["Tel · +98 936 747 1992", "tel:+989367471992"],
  ];
  const foot = (i: number) => ["¹", "²", "³", "⁴"][i] ?? "";

  return (
    /* NO content-visibility here, deliberately: a skipped footer renders as a
       blank band at the page end and then paints abruptly, and the document
       jumps by the placeholder's error (the real colophon measures ~514px,
       the `auto 720px` guess reserved 720px). The 30 KiB Arabic face the
       "فا" pill pulls on /en/ is by far the cheaper cost. */
    <footer className="relative mt-32 overflow-hidden">
      <div className="colophon-rule">
        <div className="mx-auto max-w-[86rem] px-5 pb-14 pt-10">
          {/* ── the sentence: the sitemap, set as prose ── */}
          <p className="colophon-body">
            {fa ? (
              <>
                این سایت یک <b>کنسول کاری</b> است — هر جا تایپ کنید
                تا حرکت کنید، یا از میان‌برهای نوار وضعیت استفاده کنید. بخش‌هایش:{" "}
                {t.nav.map((item, i) => (
                  <span key={NAV_PATHS[i]}>
                    <VTLink
                      href={loc(locale, NAV_PATHS[i])}
                      className="transition-colors"
                    >
                      {item.label}
                    </VTLink>
                    {i < t.nav.length - 1 ? " · " : ""}
                  </span>
                ))}
                . سفارش و اصلاح از راه{" "}
                <a href={reach[0][1]}>رایانامه</a> می‌رسد؛ اصل متن روی{" "}
                <a href={reach[1][1]} target="_blank" rel="noopener noreferrer">
                  گیت‌هاب
                </a>{" "}
                باز است؛ پیام از{" "}
                <a href={reach[2][1]} target="_blank" rel="noopener noreferrer">
                  تلگرام
                </a>{" "}
                یا{" "}
                <a href={reach[3][1]} dir="ltr">
                  تلفن
                </a>{" "}
                می‌گذرد؛ و{" "}
                <a
                  href="https://donatr.ee/sinisteroid/"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  حمایت
                </a>{" "}
                با روشن ماندنش همراهی می‌کند.
              </>
            ) : (
              <>
                This site is <b>a working console</b> — start typing
                anywhere to navigate, or take the shortcuts in the status
                rail. Its sections are{" "}
                {t.nav.map((item, i) => (
                  <span key={NAV_PATHS[i]}>
                    <VTLink
                      href={loc(locale, NAV_PATHS[i])}
                      className="transition-colors"
                    >
                      {item.label}
                    </VTLink>
                    {i < t.nav.length - 1 ? ", " : ""}
                  </span>
                ))}
                . Corrections and commissions reach{" "}
                <a href={reach[0][1]}>Email{foot(0)}</a>; the source stays open
                on{" "}
                <a href={reach[1][1]} target="_blank" rel="noopener noreferrer">
                  GitHub{foot(1)}
                </a>
                ; word travels over{" "}
                <a href={reach[2][1]} target="_blank" rel="noopener noreferrer">
                  Telegram{foot(2)}
                </a>{" "}
                or{" "}
                <a href={reach[3][1]}>telephone{foot(3)}</a>; and{" "}
                <a
                  href="https://donatr.ee/sinisteroid/"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  the presses
                </a>
                keep running on support.
              </>
            )}
          </p>

          {/* ── marginalia: feeds, assistant, language, edition ── */}
          <div className="colophon-marginalia mt-9">
            <span className="label">{t.follow}</span>
            <a
              href={fa ? "/fa/feed.xml" : "/feed.xml"}
              aria-label={`${t.rss} ${fa ? "خوراک" : "feed"}`}
              className="colophon-note transition-colors hover:text-acid"
            >
              {t.rss}
            </a>
            <a
              href={fa ? "/fa/feed.json" : "/feed.json"}
              aria-label={t.jsonFeed}
              className="colophon-note transition-colors hover:text-acid"
            >
              {t.jsonFeed}
            </a>
            <AskSinisterButton
              locale={locale}
              className="colophon-note transition-colors hover:text-acid"
              label={fa ? "سینستر" : "SINISTER"}
              prompt={
                fa
                  ? "خودت رو معرفی کن — این‌جا چه‌کارهایی ازت برمیاد؟"
                  : "Introduce yourself — what can you do around here?"
              }
            />
            <span aria-hidden className="h-px w-8 bg-line" />
            <span className="colophon-note">
              {fa ? (
                <VTLink href="/en" className="transition-colors hover:text-acid">
                  EN
                </VTLink>
              ) : (
                <VTLink href="/fa" className="lang-switch-fa transition-colors hover:text-acid">
                  فا
                </VTLink>
              )}
            </span>
            <ThemeToggle locale={locale} />
          </div>

          {/* ── technical line + end-mark ── */}
          <div className="colophon-marginalia mt-4">
            <p className="colophon-note" suppressHydrationWarning>
              © {year} {t.rights}
            </p>
            <p aria-hidden dir="ltr" className="colophon-note">
              SET IN SPACE GROTESK · INTER · JETBRAINS MONO · CAIRO
            </p>
            <p aria-hidden dir="ltr" className="colophon-note">
              NEXT.JS × REACT
            </p>
            <p aria-hidden dir="ltr" className="colophon-note">
              {t.city} · {year} · SINISTEROID.IR
            </p>
            {/* easter egg lives here too — the lockup accepts 7 secret clicks */}
            <LogoType variant="full" activate className="text-base" />
            <a
              href="#top"
              aria-label={fa ? "بازگشت به بالای صفحه" : "Back to top"}
              className="end-mark ms-auto"
            >
              <ArrowIcon className="size-4 -rotate-90" />
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
