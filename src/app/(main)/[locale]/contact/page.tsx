import type { Metadata } from "next";
import PageHero from "@/components/ui/PageHero";
import Reveal from "@/components/ui/Reveal";
import Tilt from "@/components/ui/Tilt";
import ChannelIcon, { type ChannelKind } from "@/components/contact/ChannelIcon";
import CopyEmailButton from "@/components/contact/CopyEmailButton";
import AskSinisterButton from "@/components/blog/AskSinisterButton";
import { ArrowIcon, SparkIcon } from "@/components/ui/icons";
import { getDict, isLocale, type Locale } from "@/lib/i18n";
import { seoAlternates } from "@/lib/seo";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  return {
    title: "Contact & Availability",
    description:
      "Reach Omid directly — email, GitHub, Telegram or phone. Available for remote frontend work worldwide, usually replying within 24 hours.",
    ...(isLocale(locale)
      ? { alternates: seoAlternates("contact", locale) }
      : {}),
  };
}

type Channel = {
  kind: ChannelKind;
  name: string;
  value: string;
  href: string;
  note: string;
  /** external → target=_blank; the arrow rotates to signal leaving the site */
  ext: boolean;
  /** technical values (addresses, handles) are pinned LTR in both locales */
  ltr: boolean;
  /** the email card carries a copy-to-clipboard chip instead of being a link */
  email?: boolean;
};

const EMAIL = "ghadamgahi.omid@gmail.com";

const CHANNELS: Record<Locale, Channel[]> = {
  en: [
    {
      kind: "email",
      name: "Email",
      value: EMAIL,
      href: `mailto:${EMAIL}`,
      note: "Fastest route — usually a reply within 24 h.",
      ext: false,
      ltr: true,
      email: true,
    },
    {
      kind: "github",
      name: "GitHub",
      value: "github.com/omidzzz",
      href: "https://github.com/omidzzz",
      note: "Code, experiments and open-source work.",
      ext: true,
      ltr: true,
    },
    {
      kind: "telegram",
      name: "Telegram",
      value: "@simplyeffedup",
      href: "https://t.me/simplyeffedup",
      note: "Direct messages — usually same day.",
      ext: true,
      ltr: true,
    },
    {
      kind: "tel",
      name: "Tel",
      value: "+98 936 747 1992",
      href: "tel:+989367471992",
      note: "Calls & voice — Tehran, UTC+3:30.",
      ext: false,
      ltr: true,
    },
  ],
  fa: [
    {
      kind: "email",
      name: "ایمیل",
      value: EMAIL,
      href: `mailto:${EMAIL}`,
      note: "سریع‌ترین مسیر — پاسخ معمولاً زیر ۲۴ ساعت.",
      ext: false,
      ltr: true,
      email: true,
    },
    {
      kind: "github",
      name: "گیت‌هاب",
      value: "github.com/omidzzz",
      href: "https://github.com/omidzzz",
      note: "کد، آزمایش‌ها و کارهای متن‌باز.",
      ext: true,
      ltr: true,
    },
    {
      kind: "telegram",
      name: "تلگرام",
      value: "@simplyeffedup",
      href: "https://t.me/simplyeffedup",
      note: "پیام مستقیم — معمولاً همان روز.",
      ext: true,
      ltr: true,
    },
    {
      kind: "tel",
      name: "تلفن",
      value: "+98 936 747 1992",
      href: "tel:+989367471992",
      note: "تماس صوتی — تهران، UTC+3:30.",
      ext: false,
      ltr: true,
    },
  ],
};

const COPY = {
  en: {
    status: "Open for remote work worldwide — Tehran, Iran (UTC+3:30)",
    channels: "channels",
    response: "response",
    copy: "Copy address",
    copied: "Copied ✓",
    hero: "SAY HI",
    words: ["OPEN CHANNEL", "UPLINK STABLE", "NO FORMS", "NO BOTS", "REPLY < 24H", "DIRECT LINE"],
    priority: "PRIORITY — DIRECT",
    crypto: "ENCRYPTION — OPTIONAL",
    utc: "UTC+3:30",
    ask: "Ask SINISTER to draft your first message",
    askPrompt:
      "Draft my first message to Omid — short, sharp, human. I need frontend help.",
  },
  fa: {
    status: "آماده همکاری دورکاری در سراسر جهان — تهران، ایران (UTC+3:30)",
    channels: "کانال",
    response: "زمان پاسخ",
    copy: "کپی نشانی",
    copied: "کپی شد ✓",
    hero: "سلام کن!",
    words: ["کانال باز", "آپلینک پایدار", "بدون فرم", "پاسخ زیر ۲۴ ساعت", "خط مستقیم"],
    priority: "اولویت — مستقیم",
    crypto: "رمزنگاری — اختیاری",
    utc: "UTC+3:30",
    ask: "از سینیستر بخواه اولین پیامت رو بنویسه",
    askPrompt:
      "اولین پیام من به امید رو بنویس — کوتاه، تیز، انسانی. کمک فرانت‌اند می‌خوام.",
  },
} as const;

export function generateStaticParams() {
  return [{ locale: "en" }, { locale: "fa" }];
}

export default async function ContactPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale: raw } = await params;
  const locale = (isLocale(raw) ? raw : "en") as Locale;
  const t = getDict(locale);
  const C = COPY[locale];
  const channels = CHANNELS[locale];

  return (
    <div className="contact-stage">
      <div className="mx-auto max-w-6xl px-5 pt-28 sm:px-8">
        <Reveal>
          <PageHero
            index={locale === "fa" ? "۰۷" : "07"}
            kicker={t.contact.kicker}
            title={t.contact.title}
            intro={t.contact.intro}
            stats={[
              { n: String(channels.length), label: C.channels },
              { n: "<24h", label: C.response },
            ]}
          />
        </Reveal>
      </div>

      {/* crossed mantra bands — the same signal-strip voice as the footer */}
      <Reveal>
        <div className="contact-cross" aria-hidden>
          {([false, true] as const).map((rev) => (
            <div
              key={String(rev)}
              dir="ltr"
              className={`ticker ticker-band ${rev ? "ticker-rev row-b" : "row-a"}`}
            >
              <div className="ticker-track">
                {Array.from({ length: 2 }, (_, copy) => (
                  <div key={copy} className="flex">
                    {C.words.map((w) => (
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
      </Reveal>

      <div className="contact-deck-wild">
        {/* scattered telemetry readouts — decorative */}
        <span className="contact-float cf-1" aria-hidden>{C.priority}</span>
        <span className="contact-float cf-2" aria-hidden>{C.crypto}</span>
        <span className="contact-float cf-3" aria-hidden>{t.coords}</span>

        {/* EMAIL — the hero channel */}
        <Reveal className="ch-hero-wrap">
          <article className="edu-card contact-card ch-hero">
            <span className="ch-ghost" aria-hidden>@</span>
            <span className="ch-orbit" aria-hidden />
            <div className="contact-head">
              <span className="contact-icon ch-icon-lg" aria-hidden>
                <ChannelIcon kind="email" />
              </span>
              <span className="edu-year">{channels[0].name}</span>
            </div>
            <p className="ch-display">
              <span className="glitchy stroke-line">{C.hero}</span>
            </p>
            <a href={channels[0].href} className="contact-value ch-address" dir="ltr">
              {channels[0].value}
            </a>
            <CopyEmailButton
              email={channels[0].value}
              copyLabel={C.copy}
              copiedLabel={C.copied}
            />
            <p className="edu-inst">{channels[0].note}</p>
          </article>
        </Reveal>

        {/* TELEGRAM — tilted */}
        <Reveal className="ch-tg">
          <Tilt maxTilt={6} className="h-full">
            <a
              href={channels[2].href}
              target="_blank"
              rel="noopener noreferrer"
              className="edu-card contact-card ch-tilt-a"
            >
              <div className="contact-head">
                <span className="contact-icon" aria-hidden>
                  <ChannelIcon kind="telegram" />
                </span>
                <span className="edu-year">{channels[2].name}</span>
              </div>
              <span className="contact-value" dir="ltr">{channels[2].value}</span>
              <p className="edu-inst">{channels[2].note}</p>
              <span className="contact-go" aria-hidden>
                <ArrowIcon
                  className={`size-4 ${locale === "fa" ? "rotate-45" : "-rotate-45"}`}
                />
              </span>
            </a>
          </Tilt>
        </Reveal>

        {/* GITHUB — counter-tilted */}
        <Reveal className="ch-gh">
          <Tilt maxTilt={6} className="h-full">
            <a
              href={channels[1].href}
              target="_blank"
              rel="noopener noreferrer"
              className="edu-card contact-card ch-tilt-b"
            >
              <div className="contact-head">
                <span className="contact-icon" aria-hidden>
                  <ChannelIcon kind="github" />
                </span>
                <span className="edu-year">{channels[1].name}</span>
              </div>
              <span className="contact-value" dir="ltr">{channels[1].value}</span>
              <p className="edu-inst">{channels[1].note}</p>
              <span className="contact-go" aria-hidden>
                <ArrowIcon
                  className={`size-4 ${locale === "fa" ? "rotate-45" : "-rotate-45"}`}
                />
              </span>
            </a>
          </Tilt>
        </Reveal>

        {/* TEL — the full-width console strip */}
        <Reveal className="ch-tel">
          <a href={channels[3].href} className="edu-card contact-card ch-strip">
            <div className="contact-head">
              <span className="contact-icon" aria-hidden>
                <ChannelIcon kind="tel" />
              </span>
              <span className="edu-year">{channels[3].name}</span>
            </div>
            <span className="contact-value ch-tel-num" dir="ltr">
              {channels[3].value}
            </span>
            <p className="edu-inst">{channels[3].note}</p>
            <span className="ch-utc" dir="ltr">{C.utc}</span>
          </a>
        </Reveal>
      </div>

      {/* console footer — availability + the resident menace */}
      <div className="mx-auto max-w-6xl px-5 sm:px-8">
        <div className="contact-console">
          <p className="contact-status">
            <span className="live-dot" aria-hidden />
            <span>{C.status}</span>
          </p>
          <AskSinisterButton locale={locale} label={C.ask} prompt={C.askPrompt} />
        </div>
      </div>
    </div>
  );
}
