import ChannelIcon from "./ChannelIcon";
import { ArrowIcon } from "@/components/ui/icons";
import type { Channel } from "@/lib/contact";

/**
 * One ruled row of the channel ledger.
 *
 * The board stopped being a bento of glass cards and became a ledger (the
 * same grammar the education route uses): a hairline band carrying the
 * channel mark, its name, what it is FOR, the handle in mono, and a go arrow
 * that leans toward the row's reading direction. Everything is one anchor —
 * the whole band is the target, so there is nothing to line up and nothing to
 * miss on a phone.
 *
 * The handle is pinned LTR on its own (`ltr` on the registry entry) rather
 * than on the row: the name and the note stay in the document's direction, so
 * a Persian page still reads right-to-left while the address stays a
 * well-formed address.
 */
export default function ChannelRow({
  channel,
  name,
  note,
  className = "",
}: {
  channel: Channel;
  /** Bilingual label — dictionaries, contact.voice[kind].name */
  name: string;
  /** Bilingual one-liner — dictionaries, contact.voice[kind].note */
  note: string;
  /** Extra modifier from the page (the telephone row closes the ledger). */
  className?: string;
}) {
  return (
    <a
      href={channel.href}
      className={`contact-row${className ? ` ${className}` : ""}`}
      {...(channel.external
        ? { target: "_blank", rel: "noopener noreferrer" }
        : {})}
    >
      <span className="contact-row-mark" aria-hidden>
        <ChannelIcon kind={channel.kind} />
      </span>

      <span className="contact-row-text">
        <span className="contact-row-name">{name}</span>
        <span className="contact-row-note">{note}</span>
      </span>

      <span className="contact-value contact-row-value" dir={channel.ltr ? "ltr" : undefined}>
        {channel.value}
      </span>

      <span className="contact-row-go" aria-hidden>
        <ArrowIcon className="size-4" />
      </span>
    </a>
  );
}
