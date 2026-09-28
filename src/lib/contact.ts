/**
 * CONTACT — the channel registry.
 *
 * The four routes out of the site, and the vocabulary ChannelIcon draws marks
 * for. Destinations are read from lib/site.ts (the one place the facts live);
 * what each channel is CALLED and what it is FOR is bilingual copy and stays
 * in the dictionaries under `contact.voice`.
 *
 * No component imports here — the registry is data, so the page composes it
 * and the icon component merely looks a kind up.
 */
import { SITE } from "./site";

/** The four channels, and the names ChannelIcon's marks are keyed by. */
export type ChannelKind = "email" | "github" | "telegram" | "tel";

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
    value: SITE.email,
    href: `mailto:${SITE.email}`,
    external: false,
    ltr: true,
  },
  {
    kind: "github",
    value: "github.com/omidzzz",
    href: SITE.github,
    external: true,
    ltr: true,
  },
  {
    kind: "telegram",
    value: "@simplyeffedup",
    href: SITE.telegram,
    external: true,
    ltr: true,
  },
  {
    kind: "tel",
    value: SITE.phoneLabel,
    href: `tel:${SITE.phone}`,
    external: false,
    ltr: true,
  },
] as const;

/** The email is the uplink: it gets the hero plate, the other three the ledger. */
export const UPLINK: Channel = CHANNELS[0];

/** Everything after the uplink, in the order the ledger rules them. */
export const LEDGER: readonly Channel[] = CHANNELS.slice(1);
