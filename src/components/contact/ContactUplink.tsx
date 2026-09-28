import ChannelIcon from "./ChannelIcon";
import CopyEmailButton from "./CopyEmailButton";
import { ArrowIcon } from "@/components/ui/icons";
import { getDict, type Locale } from "@/lib/i18n";
import { UPLINK } from "@/lib/contact";

/**
 * THE UPLINK — the email as the page's one primary plate.
 *
 * The board used to treat all four channels as equal tiles, which is a lie:
 * one inbox is where the work actually starts, and the other three are
 * alternates. So the email gets a full-width plate with the signature crown
 * and the address as the centerpiece, and the ledger below it carries the
 * rest at ledger weight.
 *
 * Two ways to act on the same address, side by side: open the mail client,
 * or put it on the clipboard. CopyEmailButton owns the second (and its
 * success state); this component only decides where they sit.
 */
export default function ContactUplink({ locale }: { locale: Locale }) {
  const C = getDict(locale).contact;

  return (
    <article className="contact-hero">
      <header className="contact-hero-head">
        <span className="contact-row-mark" aria-hidden>
          <ChannelIcon kind={UPLINK.kind} />
        </span>
        <span className="contact-hero-tag">{C.uplinkTag}</span>
      </header>

      <p className="contact-hero-label">{C.voice.email.name}</p>

      <a
        href={UPLINK.href}
        className="contact-value contact-hero-address"
        dir="ltr"
      >
        {UPLINK.value}
      </a>

      <p className="contact-hero-note">{C.uplinkLabel}</p>

      <div className="contact-hero-actions">
        <a href={UPLINK.href} className="craft-btn">
          <span>{C.write}</span>
          <ArrowIcon className="size-4" />
        </a>
        <CopyEmailButton
          email={UPLINK.value}
          copyLabel={C.copy}
          copiedLabel={C.copied}
        />
      </div>
    </article>
  );
}
