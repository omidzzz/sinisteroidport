/**
 * BRAND MARK — the SINISTER "S" tile.
 *
 * A rounded-square tile carrying a bold acid→magenta→violet gradient "S",
 * with a live orbit dot circling the mark. Theme-aware (uses the site's
 * color variables) and server-safe — pure SVG, no hooks, no client JS.
 * The same geometry drives the generated favicon set
 * (scripts/tools/generate-brand-icons.mjs → public/brand-mark.svg).
 */
export default function BrandMark({ className = "" }: { className?: string }) {
  return (
    <svg
      className={`brand-mark ${className}`}
      width="34"
      height="34"
      viewBox="0 0 48 48"
      fill="none"
      aria-hidden
    >
      <defs>
        <linearGradient
          id="brand-grad"
          x1="6"
          y1="6"
          x2="42"
          y2="42"
          gradientUnits="userSpaceOnUse"
        >
          <stop offset="0" stopColor="var(--color-acid)" />
          <stop offset="0.55" stopColor="var(--color-accent)" />
          <stop offset="1" stopColor="var(--color-accent-2)" />
        </linearGradient>
      </defs>
      <rect
        x="3.5"
        y="3.5"
        width="41"
        height="41"
        rx="11.5"
        fill="var(--color-bg)"
        stroke="url(#brand-grad)"
        strokeWidth="1.6"
      />
      <path
        d="M31 15.5H19.5a5.75 5.75 0 0 0 0 11.5h9a5.75 5.75 0 0 1 0 11.5H17"
        stroke="url(#brand-grad)"
        strokeWidth="5"
        strokeLinecap="round"
      />
      <g className="brand-orbit">
        <circle cx="24" cy="2" r="1.8" fill="var(--color-acid)" />
      </g>
    </svg>
  );
}
