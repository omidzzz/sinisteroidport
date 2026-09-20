import type { ReactNode } from "react";

/**
 * Shared interior page hero — asymmetric header with a ghost numeral,
 * an accent eyebrow, a display title whose first word is the signature
 * (hollow, struck in the accent), intro copy and an optional stats row.
 *
 * Server-safe (no hooks). Re-voiced in the Craft register: the class
 * contract is `craft-*` and craft/pages.css owns every one of them, so
 * restyling the register never requires touching the seven route pages
 * that render this component.
 */
export default function PageHero({
  index,
  kicker,
  title,
  intro,
  stats,
}: {
  index: string;
  kicker: string;
  title: string;
  intro?: string;
  stats?: { n: React.ReactNode; label: string }[];
}) {
  const [head, ...rest] = title.trim().split(/\s+/);
  return (
    <div className="craft-page-hero">
      <span aria-hidden className="craft-page-index">
        {index}
      </span>
      <p className="craft-eyebrow">{kicker}</p>
      <h1 className="craft-title">
        <span className="craft-hl">{head}</span>
        {rest.length > 0 ? ` ${rest.join(" ")}` : ""}
      </h1>
      {intro && <p className="craft-intro">{intro}</p>}
      {stats && stats.length > 0 && (
        <div className="craft-stats">
          {stats.map((s) => (
            <span key={s.label}>
              <b>{s.n}</b>
              {s.label}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}