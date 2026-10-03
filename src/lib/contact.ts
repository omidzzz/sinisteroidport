/**
 * CONTACT — the channel registry.
 *
 * The four routes out of the site, and the vocabulary ChannelIcon draws marks
 * for. Destinations are read from lib/brand.ts (the one place the identity
 * facts live); what each channel is CALLED and what it is FOR is bilingual
 * copy and stays in the dictionaries under `contact.voice`.
 *
 * No component imports here — the registry is data, so the page composes it
 * and the icon component merely looks a kind up.
 */
import { BRAND } from "./brand";

/** The four channels, and the names ChannelIcon's marks are keyed by. */
export type ChannelKind = "email" | "github" | "telegram" | "tel";

/**
 * DISPLAY FORMS — what a visitor actually reads, derived from the canonical
 * URLs in brand.json rather than re-typed beside them.
 *
 * The rule: the brand owns the link, this module owns the shape it wears.
 * A handle can then never disagree with the href it points at, and a brand
 * edit propagates to every surface that prints it (channels board, console
 * donate row, easter-egg copy, and the Node generators, which re-derive the
 * same forms from the same JSON).
 */

/** Scheme and trailing slash stripped — "donatr.ee/sinisteroid". */
export const DONATE_LABEL = BRAND.contact.donate
  .replace(/^https?:\/\//, "")
  .replace(/\/$/, "");

/** Host + path, no scheme — "github.com/omidzzz". */
export const GITHUB_HANDLE = BRAND.contact.github
  .replace(/^https?:\/\//, "")
  .replace(/\/$/, "");

/** The t.me handle in its @name form — "@simplyeffedup". */
export const TELEGRAM_HANDLE = BRAND.contact.telegram
  .replace(/^https?:\/\/(www\.)?t(elegram)?\.me\//, "@")
  .replace(/\/$/, "");

export type Channel = {
  kind: ChannelKind;
  /** The handle as a visitor reads it, already display-formatted. */
  value: string;
  href: string;
  /** Leaves the site — the row's arrow says so by mirroring. */
  external: boolean;
  /** Addresses, handles and numbers are code, not prose: pinned LTR in both
   *  locales, the same rule the rail and the prompt host follow. */
  ltr: boolean;
};

export const CHANNELS: readonly Channel[] = [
  {
    kind: "email",
    value: BRAND.contact.email,
    href: `mailto:${BRAND.contact.email}`,
    external: false,
    ltr: true,
  },
  {
    kind: "github",
    value: GITHUB_HANDLE,
    href: BRAND.contact.github,
    external: true,
    ltr: true,
  },
  {
    kind: "telegram",
    value: TELEGRAM_HANDLE,
    href: BRAND.contact.telegram,
    external: true,
    ltr: true,
  },
  {
    kind: "tel",
    value: BRAND.contact.phoneLabel,
    href: `tel:${BRAND.contact.phone}`,
    external: false,
    ltr: true,
  },
] as const;

/** The email is the uplink: it gets the hero plate, the other three the ledger. */
export const UPLINK: Channel = CHANNELS[0];

/** Everything after the uplink, in the order the ledger rules them. */
export const LEDGER: readonly Channel[] = CHANNELS.slice(1);
