import type { ReactNode } from "react";
/* Shared interior page hero — asymmetric header with a ghost numeral,
   an accent eyebrow, a mixed solid/outline display title, intro copy and
   an optional stats row. Server-safe (no hooks). */
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
    <div className="page-hero">
      <span aria-hidden className="page-index">
        {index}
      </span>
      <p className="page-hero-eyebrow">{kicker}</p>
      <h1 className="page-hero-title">
        <span className="hl">{head}</span>
        {rest.length > 0 ? ` ${rest.join(" ")}` : ""}
      </h1>
      {intro && <p className="page-hero-intro">{intro}</p>}
      {stats && stats.length > 0 && (
        <div className="page-hero-stats">
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