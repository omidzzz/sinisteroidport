/**
 * Custom monoline icons, drawn to match the site's hairline/editorial
 * stroke language (1.5px, round caps, currentColor). No icon fonts and no
 * glyph characters are used anywhere in the UI.
 *
 * Directional icons default to LTR; apply `rtl:-scale-x-100` (or
 * `rotate-180 rtl:rotate-0`) at the call site so they mirror in Persian.
 */

export function ArrowIcon({ className }: { className?: string }) {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      className={className}
    >
      <path d="M4 12h15m0 0-6-6m6 6-6 6" />
    </svg>
  );
}

/** Six-ray spark used as the ticker separator */
export function SparkIcon({ className }: { className?: string }) {
  return (
    <svg
      width="10"
      height="10"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      aria-hidden
      className={className}
    >
      <path d="M12 2v20M3.34 7l17.32 10M20.66 7 3.34 17" />
    </svg>
  );
}

/** Circular dash gauge — telemetry section */
export function GaugeIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" aria-hidden className={className}>
      <circle cx="12" cy="13" r="8" />
      <path d="M12 13V9" />
      <path d="M16.5 7.5l-3.2 3.2" />
      <path d="M10 17.5 9 21" />
      <path d="M15 17.5 16 21" />
    </svg>
  );
}

/** Orbit ellipse with planet — modules/skills section */
export function OrbitIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" aria-hidden className={className}>
      <ellipse cx="12" cy="12" rx="10" ry="4.4" transform="rotate(-18 12 12)" />
      <circle cx="20" cy="6.5" r="2.4" />
      <circle cx="5" cy="11" r="1.4" />
      <circle cx="12" cy="7.6" r="1.1" />
      <path d="M12 12V7.6" />
    </svg>
  );
}

/** Signal broadcast waves — writing section */
export function SignalIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden className={className}>
      <path d="M4.5 9.5a11 11 0 0 1 15 0" />
      <path d="M7 13a7 7 0 0 1 10 0" />
      <path d="M9.6 16.4a3 3 0 0 1 4.8 0" />
      <circle cx="12" cy="19" r="1.4" />
    </svg>
  );
}

/** Satellite dish — transmissions asset */
export function SatelliteIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden className={className}>
      <path d="M6 12 12 8a4 4 0 0 1 5.7 5.7l-4 6a3 3 0 1 1-4.2-4.2Z" />
      <path d="M9 12h.01" />
      <circle cx="12" cy="12" r="9" />
      <path d="M12 21V9" />
    </svg>
  );
}

/** Heartbeat pulse — support/donate CTA */
export function HeartIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      className={className}
    >
      <path d="M12 20.5C7 16.5 3.5 13.4 3.5 9.6 3.5 7 5.8 5 8.4 5c1.7 0 3.1.9 3.6 2 .5-1.1 1.9-2 3.6-2 2.6 0 4.9 2 4.9 4.6 0 3.8-3.5 6.9-8.5 10.9Z" />
      <path d="M8 13.2h2.4l1.1-2.9 1.7 4.6 1.1-1.7H16" />
    </svg>
  );
}

/* ── SIN-CHAT monoline set — same hairline language (1.5px, round caps,
   currentColor) as the icons above; drawn for the assistant widget. ── */

const MONOLINE = {
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.5,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  "aria-hidden": true,
};

/** Plus — new conversation */
export function PlusIcon({ className }: { className?: string }) {
  return (
    <svg {...MONOLINE} width="14" height="14" className={className}>
      <path d="M12 5v14M5 12h14" />
    </svg>
  );
}

/** Info — the "what SINISTER knows" inspector */
export function InfoIcon({ className }: { className?: string }) {
  return (
    <svg {...MONOLINE} width="14" height="14" className={className}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 11v5" />
      <path d="M12 7.5h.01" />
    </svg>
  );
}

/** Chevron down — jump to latest / disclosure affordance */
export function ChevronDownIcon({ className }: { className?: string }) {
  return (
    <svg {...MONOLINE} width="14" height="14" className={className}>
      <path d="m6 9 6 6 6-6" />
    </svg>
  );
}

/** Speaker — read a message aloud */
export function VolumeIcon({ className }: { className?: string }) {
  return (
    <svg {...MONOLINE} width="14" height="14" className={className}>
      <path d="M11 5 6.5 8.5H3v7h3.5L11 19V5Z" />
      <path d="M15 9.5a4 4 0 0 1 0 5" />
      <path d="M17.5 7a7.5 7.5 0 0 1 0 10" />
    </svg>
  );
}

/** Filled stop square — interrupt playback or generation */
export function StopSquareIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" width="14" height="14" aria-hidden className={className}>
      <rect x="6.5" y="6.5" width="11" height="11" rx="2" fill="currentColor" />
    </svg>
  );
}

/** Refresh — regenerate the last reply */
export function RefreshIcon({ className }: { className?: string }) {
  return (
    <svg {...MONOLINE} width="14" height="14" className={className}>
      <path d="M20 12a8 8 0 1 1-2.3-5.6" />
      <path d="M20 4v4h-4" />
    </svg>
  );
}

/** Circle-plus — rate a reply as useful */
export function RateUpIcon({ className }: { className?: string }) {
  return (
    <svg {...MONOLINE} width="14" height="14" className={className}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 8v8M8 12h8" />
    </svg>
  );
}

/** Circle-minus — rate a reply as not useful */
export function RateDownIcon({ className }: { className?: string }) {
  return (
    <svg {...MONOLINE} width="14" height="14" className={className}>
      <circle cx="12" cy="12" r="9" />
      <path d="M8 12h8" />
    </svg>
  );
}

/** Stacked rows — conversation threads */
export function StackIcon({ className }: { className?: string }) {
  return (
    <svg {...MONOLINE} width="14" height="14" className={className}>
      <path d="M4 6h16M4 12h16M4 18h10" />
    </svg>
  );
}

/** Bubble-x — clear the current conversation (bubble + X inside: wipe this thread, not a trash can, not a plus) */
export function ClearIcon({ className }: { className?: string }) {
  return (
    <svg {...MONOLINE} width="14" height="14" className={className}>
      <path d="M3.5 4.5h17v11h-9.8L5 19V4.5Z" />
      <path d="M9.2 8.6l5.6 3.8M14.8 8.6l-5.6 3.8" />
    </svg>
  );
}

/** Close X — thread delete / dismiss (dedicated glyph, not a rotated plus) */
export function XIcon({ className }: { className?: string }) {
  return (
    <svg {...MONOLINE} width="14" height="14" className={className}>
      <path d="M6 6l12 12M18 6L6 18" />
    </svg>
  );
}

/** Hamburger — the universal "this opens a menu" mark.
 *
 *  Three bars rather than a glyph character, because the console's own
 *  rule is that no UI affordance is a text symbol (the prompt caret is the
 *  one exception, and it means "type here", not "press me"). On a phone the
 *  disclosure button is a bare circle with its label clipped away, so this
 *  mark is the ONLY thing telling a visitor the button opens a menu — it has
 *  to be the one everybody already recognises.
 *
 *  The bars are addressed individually as .menu-bar and morphed into the
 *  same X as XIcon above, by CSS off aria-expanded (craft/nav.css §8). The
 *  whole state change is transform/opacity with no second icon swapping in,
 *  and no React state. */
export function MenuIcon({ className }: { className?: string }) {
  return (
    <svg {...MONOLINE} width="16" height="16" className={className}>
      <path className="menu-bar" d="M4 7.5h16" />
      <path className="menu-bar" d="M4 12h16" />
      <path className="menu-bar" d="M4 16.5h16" />
    </svg>
  );
}

/** The assistant's mark — the floating widget's only glyph.
 *
 *  More articulated than a plain robot head, because at the size it actually
 *  renders (20px inside a 2rem plate) a bare head-plus-two-dots is three
 *  blobs with no character. What earns the detail, and why each piece:
 *
 *    - a CHAMFERED crown. Flat top with angled shoulders reads as machined;
 *      a plain rounded rect reads as a toy.
 *    - side TABS. They break the head's silhouette outward, which is what
 *      stops the mark collapsing into a dot-within-a-circle at small sizes.
 *    - two large solid optics, held far enough apart to stay two eyes. A
 *      narrow gap here is the whole ballgame: bring them together and they
 *      fuse into a single lozenge and the face is gone.
 *    - a jaw grille, to give the lower half something to say.
 *
 *  Drawn after one bad revision: the first attempt put a pair of broadcast
 *  arcs beside the emitter ball, and at 20px those arcs collided with the
 *  ball into two unidentifiable blobs while the optics fused. Signal arcs are
 *  the classic detail that only survives at sizes this control never gets,
 *  so the reception idea moved into the tabs instead of being drawn.
 *
 *  The viewBox is cropped tight to the art (18.6 units of canvas for ~16.5 of
 *  ink) — with a full 24x24 grid most of the box is empty padding, so
 *  raising the percentage in agent-chat.css would only enlarge that padding.
 *  Inherits `color` from the plate, so it re-inks per edition for free. */
export function AgentIcon({ className }: { className?: string }) {
  return (
    <svg
      {...MONOLINE}
      viewBox="2.7 0.85 18.6 18.6"
      width="20"
      height="20"
      className={className}
    >
      {/* antenna: emitter ball on a stem into the crown */}
      <circle cx="12" cy="3.4" r="1.35" fill="currentColor" />
      <path d="M12 6.5V4.7" />
      {/* side tabs — the silhouette breakers */}
      <rect x="4.9" y="10.9" width="1.5" height="2.8" rx="0.75" />
      <rect x="17.6" y="10.9" width="1.5" height="2.8" rx="0.75" />
      {/* chassis: flat crown, chamfered shoulders, rounded jaw */}
      <path d="M8.3 6.7h7.4L18 9.1v7.2a2.3 2.3 0 0 1-2.3 2.3H8.3A2.3 2.3 0 0 1 6 16.3V9.1z" />
      {/* optic sensors — kept wide apart so they never merge */}
      <circle cx="9.5" cy="12.2" r="1.7" fill="currentColor" />
      <circle cx="14.5" cy="12.2" r="1.7" fill="currentColor" />
      {/* jaw grille */}
      <path d="M10.3 15.9h3.4" />
    </svg>
  );
}

