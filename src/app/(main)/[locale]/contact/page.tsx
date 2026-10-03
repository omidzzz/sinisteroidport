import type { Metadata } from "next";
import PageHero from "@/components/ui/PageHero";
import Reveal from "@/components/ui/Reveal";
import ChannelRow from "@/components/contact/ChannelRow";
import ContactUplink from "@/components/contact/ContactUplink";
import AskSinisterButton from "@/components/blog/AskSinisterButton";
import { getDict, isLocale, type Locale } from "@/lib/i18n";
import { CHANNELS, LEDGER } from "@/lib/contact";
import { seoAlternates, SITE } from "@/lib/seo";
import { BRAND } from "@/lib/brand";
import { JsonLd } from "@/components/ui/JsonLd";
import { contactPageJsonLd, breadcrumbJsonLd } from "@/lib/schema";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  return {
    title: "Contact & Availability",
    // Prose about the PERSON, so the name comes from the brand (the layout
    // then appends the same person as the title suffix — one name, not two).
    description: `Reach ${BRAND.person} directly — email, GitHub, Telegram or phone. Available for remote frontend work worldwide, usually replying within 24 hours.`,
    ...(isLocale(locale)
      ? { alternates: seoAlternates("contact", locale) }
      : {}),
  };
}

export function generateStaticParams() {
  return [{ locale: "en" }, { locale: "fa" }];
}

/**
 * CONTACT — the open channel.
 *
 * Four routes, read in the order they are actually used. The email is the
 * uplink and gets the page's one focal plate; GitHub, Telegram and the
 * telephone number close as a ruled ledger beneath it, one band each; the
 * terms strip answers the four questions every enquiry starts with; and the
 * page ends on a status line that can hand the first message to the resident
 * agent, for the visitor who would rather not start from a blank field.
 *
 * Nothing here decides a destination or a wording: lib/contact.ts fixes the
 * four addresses, lib/i18n carries the bilingual voice, and craft/contact.css
 * owns the whole visual contract. This file is only the order they appear in.
 */
export default async function ContactPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale: raw } = await params;
  const locale = (isLocale(raw) ? raw : "en") as Locale;
  const t = getDict(locale);
  const C = t.contact;

  return (
    <div className="contact-stage">
      <JsonLd
        data={[
          contactPageJsonLd(locale),
          breadcrumbJsonLd([
            { name: locale === "fa" ? "خانه" : "Home", url: `${SITE}/${locale}/` },
            { name: locale === "fa" ? "تماس" : "Contact", url: `${SITE}/${locale}/contact/` },
          ]),
        ]}
      />

      <div className="mx-auto max-w-6xl px-5 sm:px-8">
        <Reveal>
          <PageHero
            index={locale === "fa" ? "۰۸" : "08"}
            kicker={C.kicker}
            title={C.title}
            intro={C.intro}
            stats={[
              { n: String(CHANNELS.length), label: C.channels },
              { n: "<24h", label: C.response },
            ]}
          />
        </Reveal>

        {/* 1 · The uplink — the one plate that earns focal weight */}
        <Reveal>
          <ContactUplink locale={locale} />
        </Reveal>

        {/* 2 · The ledger — the other three, one ruled band each */}
        <section className="contact-ledger" aria-label={C.ledgerLabel}>
          <h2 className="contact-section-label">{C.ledgerLabel}</h2>
          <div className="contact-rows">
            {LEDGER.map((channel, i) => (
              <Reveal key={channel.kind} delay={i * 80}>
                <ChannelRow
                  channel={channel}
                  name={C.voice[channel.kind].name}
                  note={C.voice[channel.kind].note}
                  /* The telephone closes the board, so it carries the
                     teal end-rule that says "and then it stops here". */
                  className={channel.kind === "tel" ? "ch-strip" : undefined}
                />
              </Reveal>
            ))}
          </div>
        </section>

        {/* 3 · The terms strip — the facts you would otherwise have to ask for */}
        <Reveal>
          <section className="contact-terms" aria-label={C.termsLabel}>
            <h2 className="contact-section-label">{C.termsLabel}</h2>
            <dl className="contact-facts">
              {C.facts.map((fact) => (
                <div className="contact-fact" key={fact.k}>
                  <dt>{fact.k}</dt>
                  <dd>{fact.v}</dd>
                </div>
              ))}
            </dl>
          </section>
        </Reveal>

        {/* 4 · The console — the page ends on a status line, not a form */}
        <div className="contact-console">
          <p className="contact-status">
            <span className="live-dot" aria-hidden />
            <span>{C.status}</span>
          </p>
          <AskSinisterButton
            locale={locale}
            label={C.ask}
            prompt={C.askPrompt}
          />
        </div>
      </div>
    </div>
  );
}

