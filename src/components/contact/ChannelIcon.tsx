/**
 * CONTACT CHANNEL MARKS — transmission scenes, not glyphs.
 *
 * The obvious icons (envelope / git-branch / paper-plane / handset) read as
 * clip-art, so each channel is drawn instead as a small piece of the site's
 * telemetry world, in the FAB-robot recipe: 1.5px round-cap monoline in
 * accent cyan, acid spark details, faint gradient fills, soft glow.
 *
 *   email    → BEACON UPLINK   dish antenna firing a dashed beam
 *   github   → CIRCUIT TRACE   chip + PCB traces, one glowing via
 *   telegram → PULSE DART      lozenge launched through speed chevrons
 *   tel      → VOICE EQ        waveform bars flanked by sound arcs
 *
 * Every color routes through the theme tokens (--color-accent /
 * --color-acid), so light/dark flip for free. Namespaced defs
 * (ci-<kind>-*) keep the four instances collision-free on one page.
 */

import type { ReactNode } from "react";

export type ChannelKind = "email" | "github" | "telegram" | "tel";

function GlowFilter({ id }: { id: string }) {
  return (
    <filter id={id} x="-80%" y="-80%" width="260%" height="260%">
      <feGaussianBlur in="SourceGraphic" stdDeviation="1.8" result="b" />
      <feMerge>
        <feMergeNode in="b" />
        <feMergeNode in="SourceGraphic" />
      </feMerge>
    </filter>
  );
}

/* ── EMAIL — beacon uplink: dish antenna → dashed beam → wavefront ── */
function EmailMark() {
  return (
    <>
      <defs>
        <GlowFilter id="ci-email-glow" />
      </defs>
      {/* dish mouth — quarter arc opening up-right */}
      <path
        d="M7 22A15 15 0 0 1 22 7"
        fill="none" stroke="var(--color-accent)" strokeWidth="1.6"
        strokeLinecap="round"
      />
      {/* feed horn reaching to the focus point */}
      <path
        d="M14 15l4.5-4.5"
        fill="none" stroke="var(--color-accent)" strokeWidth="1.5"
        strokeLinecap="round"
      />
      <circle cx="19.5" cy="9.5" r="1.7" fill="var(--color-acid)" filter="url(#ci-email-glow)" />
      {/* stand + base */}
      <path
        d="M12.7 21v6.5M8 27.5h9.4"
        fill="none" stroke="var(--color-accent)" strokeWidth="1.6"
        strokeLinecap="round"
      />
      {/* dashed transmission beam */}
      <path
        d="M26 12 39 7.5"
        fill="none" stroke="var(--color-acid)" strokeWidth="1.5"
        strokeLinecap="round" strokeDasharray="3.5 3"
      />
      {/* wavefront rings at beam end */}
      <path
        d="M40.5 3.5a5 5 0 0 1 4.5 6.5M41.5 6a2.5 2.5 0 0 1 2.3 3.2"
        fill="none" stroke="var(--color-acid)" strokeWidth="1.5"
        strokeLinecap="round" opacity="0.85"
      />
    </>
  );
}

/* ── GITHUB — circuit trace: chip core, pads, one glowing via ── */
function GithubMark() {
  return (
    <>
      <defs>
        <GlowFilter id="ci-github-glow" />
        <linearGradient id="ci-github-fill" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" style={{ stopColor: "var(--color-accent)", stopOpacity: 0.16 }} />
          <stop offset="100%" style={{ stopColor: "var(--color-acid)", stopOpacity: 0.05 }} />
        </linearGradient>
      </defs>
      {/* the chip */}
      <rect
        x="18" y="18" width="12" height="12" rx="2.5"
        fill="url(#ci-github-fill)"
        stroke="var(--color-accent)" strokeWidth="1.6"
      />
      {/* burning core */}
      <circle cx="24" cy="24" r="1.8" fill="var(--color-acid)" filter="url(#ci-github-glow)" />
      {/* pins */}
      <path
        d="M13.5 21H18M13.5 27H18M30 21h4.5M30 27h4.5"
        fill="none" stroke="var(--color-accent)" strokeWidth="1.5"
        strokeLinecap="round"
      />
      {/* left traces: straight to a via, then a bent run */}
      <path
        d="M6.5 21h7M6.5 27h4a3 3 0 0 1 3 3v4"
        fill="none" stroke="var(--color-accent)" strokeWidth="1.5"
        strokeLinecap="round"
      />
      <circle cx="6.5" cy="21" r="2" fill="none" stroke="var(--color-accent)" strokeWidth="1.4" />
      <circle cx="13.5" cy="36.4" r="2" fill="none" stroke="var(--color-accent)" strokeWidth="1.4" />
      {/* right traces: straight run + the glowing sink via */}
      <path
        d="M30 21h11M30 27h6.5a3 3 0 0 1 3 3v4"
        fill="none" stroke="var(--color-accent)" strokeWidth="1.5"
        strokeLinecap="round"
      />
      <circle cx="43.5" cy="21" r="2" fill="none" stroke="var(--color-accent)" strokeWidth="1.4" />
      <circle cx="39.5" cy="36.4" r="2.2" fill="var(--color-acid)" filter="url(#ci-github-glow)" />
    </>
  );
}

/* ── TELEGRAM — pulse dart: lozenge launched through speed chevrons ── */
function TelegramMark() {
  return (
    <>
      <defs>
        <GlowFilter id="ci-telegram-glow" />
        <linearGradient id="ci-telegram-fill" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" style={{ stopColor: "var(--color-accent)", stopOpacity: 0.16 }} />
          <stop offset="100%" style={{ stopColor: "var(--color-acid)", stopOpacity: 0.07 }} />
        </linearGradient>
      </defs>
      {/* dart body + inner echo */}
      <path
        d="M24 9 38 24 24 39 10 24Z"
        fill="url(#ci-telegram-fill)"
        stroke="var(--color-accent)" strokeWidth="1.6"
        strokeLinecap="round" strokeLinejoin="round"
      />
      <path
        d="M24 16 32 24 24 32 16 24Z"
        fill="none" stroke="var(--color-acid)" strokeWidth="1.2" opacity="0.8"
      />
      {/* nose spark */}
      <circle cx="38" cy="24" r="1.6" fill="var(--color-acid)" filter="url(#ci-telegram-glow)" />
      {/* speed chevrons trailing behind */}
      <path
        d="M5 18.5 10.5 24 5 29.5"
        fill="none" stroke="var(--color-acid)" strokeWidth="1.5"
        strokeLinecap="round" strokeLinejoin="round"
      />
      <path
        d="M1.5 20.8 5.5 24l-4 3.2"
        fill="none" stroke="var(--color-acid)" strokeWidth="1.5"
        strokeLinecap="round" strokeLinejoin="round" opacity="0.5"
      />
    </>
  );
}

/* ── TEL — voice EQ: waveform bars flanked by sound arcs ── */
function TelMark() {
  return (
    <>
      <defs>
        <GlowFilter id="ci-tel-glow" />
      </defs>
      {/* EQ bars — the LaptopDeck waveform motif, miniaturized.
          heights 7/12/20/12/7 around midline y=24; center bar burns acid */}
      <rect x="11.6" y="20.5" width="3.2" height="7" rx="1.6" fill="none" stroke="var(--color-accent)" strokeWidth="1.4" />
      <rect x="16.8" y="18" width="3.2" height="12" rx="1.6" fill="none" stroke="var(--color-accent)" strokeWidth="1.4" />
      <rect x="22" y="14" width="3.2" height="20" rx="1.6" fill="var(--color-acid)" filter="url(#ci-tel-glow)" />
      <rect x="27.2" y="18" width="3.2" height="12" rx="1.6" fill="none" stroke="var(--color-accent)" strokeWidth="1.4" />
      <rect x="32.4" y="20.5" width="3.2" height="7" rx="1.6" fill="none" stroke="var(--color-accent)" strokeWidth="1.4" />
      {/* sound arcs — one per side, sweeping away from the voice */}
      <path
        d="M7.5 18a8 8 0 0 0 0 12"
        fill="none" stroke="var(--color-acid)" strokeWidth="1.5" strokeLinecap="round"
      />
      <path
        d="M40.5 18a8 8 0 0 1 0 12"
        fill="none" stroke="var(--color-acid)" strokeWidth="1.5" strokeLinecap="round"
      />
    </>
  );
}

const MARKS: Record<ChannelKind, () => ReactNode> = {
  email: EmailMark,
  github: GithubMark,
  telegram: TelegramMark,
  tel: TelMark,
};

export default function ChannelIcon({ kind }: { kind: ChannelKind }) {
  const Mark = MARKS[kind];
  return (
    <svg
      viewBox="0 0 48 48"
      fill="none"
      aria-hidden
      className="contact-mark"
      style={{ width: "100%", height: "100%", display: "block" }}
    >
      <Mark />
    </svg>
  );
}
