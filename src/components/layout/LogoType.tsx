/**
 * Brand logotype — the canonical SINISTER[OID] lockup.
 *
 * Three registers of ONE mark (Option A: Omid is the person, Sinisteroid the
 * website/handle, SINISTER[OID] the logotype):
 *  • hero   — flat ink, no gradient, no glow: the suffix drops to a smaller
 *             mono accent so the display word keeps the hero's weight and the
 *             h1 keeps its "flat ink" art direction.
 *  • full   — the signature register: gradient word, outlined ring-O,
 *             blinking cursor. Footer masthead and the Easter-egg banner.
 *  • compact— tight, no brackets. Unused chrome slot.
 *
 * Purely presentational + server-safe (no hooks). The brand is ASCII so
 * it is pinned LTR and reads unchanged inside the Persian layout.
 *
 * The letterforms live here, never as loose strings: full = SINISTER[OID],
 * compact = navbar. Import BRAND and read logoFull/logoPrefix/logoSuffix.
 */
import { BRAND } from "@/lib/brand";

export default function LogoType({
  variant = "full",
  className = "",
  activate = false,
}: {
  /** hero = flat display word + small mono suffix; full = the signature
   *  lockup with brackets and cursor; compact = tight (no brackets). */
  variant?: "hero" | "full" | "compact";
  className?: string;
  /** when true, adds data-logo-activate so the Easter egg can key 7 clicks */
  activate?: boolean;
}) {
  if (variant === "hero") {
    return (
      <span dir="ltr" className={`logo-type logo-type--hero ${className}`}>
        <span className="logo-hero-word">{BRAND.logoPrefix}</span>
        <span className="logo-glyph">[</span>
        <span className="logo-oid">
          <span className="logo-ring">{BRAND.logoSuffix[0]}</span>
          <span className="logo-id">{BRAND.logoSuffix.slice(1)}</span>
        </span>
        <span className="logo-glyph">]</span>
      </span>
    );
  }

  return (
    <span
      dir="ltr"
      className={`logo-type ${className}`}
      data-logo-activate={activate ? "" : undefined}
    >
      <span className="logo-sinister">{BRAND.logoPrefix}</span>
      {variant === "full" && <span className="logo-glyph">[</span>}
      <span className="logo-oid">
        <span className="logo-ring">{BRAND.logoSuffix[0]}</span>
        <span className="logo-id">{BRAND.logoSuffix.slice(1)}</span>
      </span>
      {variant === "full" && (
        <>
          <span className="logo-glyph">]</span>
          <span className="logo-cursor">_</span>
        </>
      )}
    </span>
  );
}