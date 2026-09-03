/**
 * Brand logotype — the SINISTER[OID] lockup.
 *
 * Two registers that telegraph the dev-translator persona:
 *  • SINISTER  — bold refusal register in Unbounded (via --font-logo),
 *                which fills acid on hover (CSS-backed in globals.css).
 *  • [OID]     — an "electronic suffix" in the mono voice, with a live
 *                outlined ring-O and a blinking cursor. Reads like a
 *                status readout, echoing the site-wide label idiom.
 *
 * Purely presentational + server-safe (no hooks). The brand is ASCII so
 * it is pinned LTR and reads unchanged inside the Persian layout.
 */
export default function LogoType({
  variant = "full",
  className = "",
  activate = false,
}: {
  /** full = SINISTER[OID], compact = tight (navbar) */
  variant?: "full" | "compact";
  className?: string;
  /** when true, adds data-logo-activate so the Easter egg can key 7 clicks */
  activate?: boolean;
}) {
  return (
    <span
      dir="ltr"
      className={`logo-type ${className}`}
      data-logo-activate={activate ? "" : undefined}
    >
      <span className="logo-sinister">SINISTER</span>
      {variant === "full" && <span className="logo-glyph">[</span>}
      <span className="logo-oid">
        <span className="logo-ring">O</span>
        <span className="logo-id">ID</span>
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