/**
 * FilterDefs — the single SVG defs block powering CSS `filter:
 * url(#signal-break)`. Rendered once in the root layout, zero
 * paint, aria-hidden. The feTurbulence displacement physically
 * tears glyphs on hover (see fx-modern.css §12). Filters MUST
 * not live in a `display:none` subtree — hidden via size zero.
 */
export default function FilterDefs() {
  return (
    <svg
      aria-hidden="true"
      className="pointer-events-none fixed"
      width="0"
      height="0"
      style={{ position: "absolute", overflow: "hidden" }}
    >
      <defs>
        <filter id="signal-break" x="-20%" y="-20%" width="140%" height="140%">
          <feTurbulence
            type="fractalNoise"
            baseFrequency="0.65 0.1"
            numOctaves="2"
            seed="7"
            result="turb"
          />
          <feDisplacementMap
            in="SourceGraphic"
            in2="turb"
            scale="14"
            xChannelSelector="R"
            yChannelSelector="G"
          />
        </filter>
      </defs>
    </svg>
  );
}