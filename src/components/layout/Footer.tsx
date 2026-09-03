import Link from "next/link";
import Magnetic from "../ui/Magnetic";
import LogoType from "./LogoType";
import { ArrowIcon, SparkIcon, HeartIcon } from "../ui/icons";
import { getDict, loc, type Locale } from "@/lib/i18n";
import { NAV_PATHS } from "@/lib/nav";

/* Brand-voice meta strip — ASCII/pinned-LTR like the logotype so it reads
   identically inside the Persian layout. */
const META = [
  "UPLINK STABLE",
  "ACID RAVE",
  "SIGNAL DOMAIN",
  "EST.2012",
  "NEXT.JS × REACT",
  "PURE CSS ORNAMENT",
];

/**
 * FOOTER — SIGNAL TOWER (v6).
 *
 * Three misaligned columns under two crossed marquee bands:
 *   rail     vertical act index (sitemap)
 *   channel  giant magnetic LET'S TALK + bracket reach-chips
 *   tower    glowing status panel (LEDs, city, uplink, mini holo-core)
 * Floor bar carries © , build tag and a dashed-ring BACK-TO-TOP (#top,
 * zero-JS smooth anchor since <html> scrolls smoothly).
 */
export default function Footer({ locale }: { locale: Locale }) {
  const t = getDict(locale);
  const fa = locale === "fa";
  const year = new Date().getFullYear();

  const reach: Array<[string, string, boolean]> = [
    ["Email", "mailto:ghadamgahi.omid@gmail.com", false],
    ["GitHub", "https://github.com/omidzzz", true],
    ["Telegram", "https://t.me/simplyeffedup", true],
    ["Tel · +98 936 747 1992", "tel:+989367471992", false],
  ];

  return (
    <footer className="relative mt-32 overflow-hidden border-t border-line bg-bg">
      {/* crossed meta bands */}
      <div aria-hidden className="cross-strip my-10 select-none">
        {[false, true].map((rev) => (
          <div
            key={String(rev)}
            dir="ltr"
            className={`ticker ticker-band ${rev ? "ticker-rev row-b" : "row-a"}`}
          >
            <div className="ticker-track">
              {[0, 1].map((copy) => (
                <div key={copy} className="flex">
                  {META.map((w) => (
                    <span
                      key={`${copy}-${w}`}
                      className="flex items-center gap-5 whitespace-nowrap px-6 py-3.5 font-mono text-[0.6rem] uppercase tracking-[0.3em]"
                    >
                      <SparkIcon className="shrink-0 opacity-70" />
                      {w}
                    </span>
                  ))}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="mx-auto max-w-[86rem] px-5 pb-14 pt-10 sm:px-8">
        <div className="grid items-start gap-14 lg:grid-cols-[auto_minmax(0,1fr)_minmax(15rem,17rem)] lg:gap-12">
          {/* ── sitemap rail ── */}
          <nav aria-label={fa ? "پیوندها" : "Footer navigation"} className="min-w-max">
            <p className="label mb-7">{fa ? "فهرست" : "Index"}</p>
            <ul className="space-y-4">
              {t.nav.map((item, i) => (
                <li key={NAV_PATHS[i]}>
                  <Link
                    href={loc(locale, NAV_PATHS[i])}
                    className="group inline-flex items-baseline gap-3 font-display text-base font-bold uppercase tracking-wide text-ink transition-colors hover:text-acid"
                  >
                    <span className="foot-idx font-mono text-[0.58rem] tracking-[0.2em]">
                      {item.index}
                    </span>
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          {/* ── open channel ── */}
          <div className="min-w-0">
            <p className="mb-8 flex flex-wrap items-center gap-3">
              <span className="live-dot" aria-hidden />
              <span className="label">{t.contactLabel}</span>
            </p>

            <Magnetic strength={0.13} maxShift={9}>
              <a
                href="mailto:ghadamgahi.omid@gmail.com"
                className="glitchy stroke-line block w-fit font-display font-black uppercase leading-[0.92] tracking-tight text-[clamp(2.3rem,6.6vw,5.4rem)]"
              >
                {t.letsTalk}
              </a>
            </Magnetic>
<div className="mt-8">
              <Magnetic strength={0.18} maxShift={10}>
                <a
                  href="https://donatr.ee/sinisteroid/"
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={fa ? "حمایت مالی" : "Donate"}
                  className="donate-cta group"
                >
                  <span className="donate-ring" aria-hidden />
                  <HeartIcon className="donate-heart" />
                  <span>{t.donate}</span>
                  <ArrowIcon className="size-3.5 -rotate-45 rtl:rotate-45 transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                </a>
              </Magnetic>
              <p
                aria-hidden
                dir="ltr"
                className="mt-3 select-none font-mono text-[0.6rem] uppercase tracking-[0.24em] text-muted"
              >
                BEEP_BOOP <span className="text-acid">♥</span> DONATR.EE/SINISTEROID
              </p>
            </div>
            <p
              aria-hidden
              dir="ltr"
              className="mt-4 select-none font-mono text-[0.64rem] uppercase tracking-[0.3em] text-muted"
            >
              OPEN CHANNEL ▸ UPLINK<span className="tx-cursor ms-1">▌</span>
            </p>

            {/* easter egg lives here too — logo accepts 7 secret clicks */}
            <div className="mt-10">
              <LogoType variant="full" activate className="text-lg" />
            </div>

            <ul className="mt-10 flex flex-wrap gap-3">
              {reach.map(([label, href, ext]) => (
                <li key={href}>
                  <a
                    href={href}
                    {...(ext ? { target: "_blank", rel: "noopener noreferrer" } : {})}
                    className="chip-brk inline-flex items-center gap-2.5 border border-line font-mono text-[0.66rem] uppercase tracking-[0.16em] text-muted transition-all duration-300 hover:border-acid/60 hover:text-acid"
                  >
                    {label}
                    <ArrowIcon
                      className={`size-3.5 transition-transform duration-300 ${ext ? (fa ? "rotate-45" : "-rotate-45") : ""}`}
                    />
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* ── status tower ── */}
          <aside className="status-panel p-6 lg:p-7">
            <p className="stat-row">
              <span>Status</span>
              <b className="inline-flex items-center gap-2">
                <span className="live-dot" />
                Live
              </b>
            </p>
            <div className="mt-6 space-y-3.5">
              <p className="stat-row"><span>{fa ? "شهر" : "City"}</span><b>{t.city}</b></p>
              <p className="stat-row"><span>{fa ? "سال" : "Year"}</span><b suppressHydrationWarning>{year}</b></p>
              <p className="stat-row"><span dir="ltr">Domain</span><b dir="ltr">sinisteroid.ir</b></p>
              <p className="stat-row"><span>{fa ? "حالت" : "Mode"}</span><b>RAVE / VOID</b></p>
            </div>
            <div className="my-7 border-t border-line" />
            <div className="holo-core mx-auto !w-24 scale-90">
              <span className="holo-ring r1" aria-hidden />
              <span className="holo-sq" aria-hidden />
              <span className="holo-sigil !text-sm">OM</span>
            </div>
            <p aria-hidden dir="ltr" className="mt-5 text-center font-mono text-[0.6rem] uppercase tracking-[0.24em] text-muted">
              CORE STABLE
            </p>
          </aside>
        </div>

        {/* ── floor bar ── */}
        <div className="mt-16 flex flex-col items-start justify-between gap-5 border-t border-line pt-6 font-mono text-[0.62rem] uppercase tracking-[0.18em] text-muted sm:flex-row sm:items-center">
          <p suppressHydrationWarning>
            © {year} {t.rights}
          </p>
          <span aria-hidden className="hidden tracking-[0.3em] md:inline">
            ✦ BUILT ON THE VOID ✦
          </span>
          <a
            href="#top"
            aria-label={fa ? "بازگشت به بالای صفحه" : "Back to top"}
            className="ring-top grid h-11 w-11 place-items-center rounded-full border border-line text-acid transition-colors hover:border-acid/70"
          >
            <i aria-hidden />
            <ArrowIcon className="size-4 -rotate-90" />
          </a>
        </div>
      </div>
    </footer>
  );
}
