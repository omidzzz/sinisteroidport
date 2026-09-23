import Link from "next/link";
import CopyEmailButton from "@/components/contact/CopyEmailButton";
import { Rail } from "@/components/ui/Section";
import SysRule from "./SysRule";
import { ArrowIcon } from "@/components/ui/icons";
import { getDict, loc, type Locale } from "@/lib/i18n";
import { SITE } from "@/lib/site";

/**
 * HOME — CHANNELS (the close).
 *
 * Replaces the printed edition's manifesto act: the working philosophy as a
 * STATIC terminal quote (no word-splitting, no scroll scrub — the scrub was
 * the desktop CLS offender), then the direct channels as console rows with
 * copy-to-clipboard on the email, and the way out to the full contact board.
 */
export default function ChannelsSection({ locale }: { locale: Locale }) {
  const t = getDict(locale);
  const fa = locale === "fa";

  const rows = [
    {
      key: "email",
      value: SITE.email,
      href: `mailto:${SITE.email}`,
    },
    {
      key: "github",
      value: SITE.github.replace(/^https:\/\/(?:www\.)?/, ""),
      href: SITE.github,
    },
    {
      key: "telegram",
      value: SITE.telegram.replace(/^https:\/\/t\.me\//, "@"),
      href: SITE.telegram,
    },
  ];

  return (
    <>
      <section className="shell-grid relative mx-auto mt-6 max-w-[86rem] px-5 sm:px-8">
        <Rail label={fa ? "کانال‌ها · تماس" : "Channels · contact"} />
        <div className="sys-close relative min-w-0">
          {/* the philosophy, as a static quote — content the AI crawlers and
              the FAQ schema already reference, now without the scroll scrub */}
          <figure className="sys-quote">
            <blockquote>{t.quote}</blockquote>
            <figcaption>
              <span>{t.quoteLabel}</span>
              <span dir="ltr" className="sys-quote-ok">
                CHANNELS.OK ▸ OPEN
              </span>
            </figcaption>
          </figure>

          <ul className="sys-channels">
            {rows.map((row) => (
              <li key={row.key} className="sys-channel">
                <span className="sys-channel-key" dir="ltr">
                  {row.key}
                </span>
                {row.key === "email" ? (
                  <>
                    <a href={row.href} className="sys-channel-val" dir="ltr">
                      {row.value}
                    </a>
                    <CopyEmailButton
                      email={SITE.email}
                      copyLabel={fa ? "کپی" : "Copy"}
                      copiedLabel={fa ? "کپی شد ✓" : "Copied ✓"}
                    />
                  </>
                ) : (
                  <a
                    href={row.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="sys-channel-val sys-channel-go"
                    dir="ltr"
                  >
                    {row.value}
                    <ArrowIcon className="size-3.5 shrink-0 rtl:-scale-x-100" />
                  </a>
                )}
              </li>
            ))}
          </ul>

          <div className="sys-more">
            <Link
              href={loc(locale, "/contact")}
              prefetch={false}
              className="group brk font-mono text-xs text-muted transition-colors hover:text-acid"
            >
              {fa ? "همه‌ی کانال‌ها · صفحه تماس" : "The full contact board"}
              <ArrowIcon className="ms-2 inline align-[-2px] transition-transform duration-300 group-hover:translate-x-1 rtl:-scale-x-100 rtl:group-hover:-translate-x-1" />
            </Link>
          </div>
        </div>
      </section>
      <SysRule num="06" label={fa ? "پایان خط" : "End of line"} />
    </>
  );
}
