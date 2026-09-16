import type { ReactNode } from "react";
import type { Locale } from "@/lib/i18n";

export type Mineral = "amber" | "rose" | "violet";

export type StationKey =
  | "crust"
  | "upper-mantle"
  | "transition"
  | "astheno"
  | "litho"
  | "trans"
  | "lower";

type StationMeta = {
  key: StationKey;
  /** ASCII survey index — always rendered LTR, even inside the RTL layout. */
  code: string;
  /** ASCII depth annotation for the tangent-planar section. */
  depth: string;
  mineral: Mineral;
  name: Record<Locale, string>;
};

const STATIONS: readonly StationMeta[] = [
  {
    key: "crust",
    code: "S.01",
    depth: "0–12 km",
    mineral: "amber",
    name: { en: "Crust", fa: "پوسته" },
  },
  {
    key: "upper-mantle",
    code: "S.02",
    depth: "12–410 km",
    mineral: "rose",
    name: { en: "Upper mantle", fa: "گوشتهٔ بالایی" },
  },
  {
    key: "transition",
    code: "S.03",
    depth: "410–660 km",
    mineral: "violet",
    name: { en: "Transition zone", fa: "ناحیهٔ گذار" },
  },
  {
    key: "astheno",
    code: "S.04",
    depth: "80–200 km",
    mineral: "amber",
    name: { en: "Asthenosphere", fa: "نرم‌کره" },
  },
  {
    key: "litho",
    code: "S.05",
    depth: "0–80 km",
    mineral: "rose",
    name: { en: "Litho shelf", fa: "قفسهٔ سنگ‌کره" },
  },
  {
    key: "trans",
    code: "S.06",
    depth: "660–2890 km",
    mineral: "violet",
    name: { en: "Transmission", fa: "انتقال" },
  },
  {
    key: "lower",
    code: "S.07",
    depth: "660–2890 km",
    mineral: "amber",
    name: { en: "Lower mantle", fa: "گوشتهٔ پایینی" },
  },
];

const BY_KEY = STATIONS.reduce<Record<string, StationMeta>>((acc, s) => {
  acc[s.key] = s;
  return acc;
}, {});

/**
 * TERRANOMY — tangent-planar survey cross-section (v8).
 *
 * The home page is a classified geological survey of a fictional mineral
 * world: one continuous vertical cross-section where each act is a labeled
 * station cut, read top-to-bottom. Amber → rose → violet cycle as the
 * survey annotation ink (cut line, marker numeral, stamp), never as a
 * surface tint.
 *
 * Server-safe; zero hooks. Each station's `data-mineral` re-maps the hot
 * --color-acid / --color-accent tokens for the whole subtree, so the acts
 * re-ink per station exactly as they did under the sheet layout. All the
 * chrome (axis rule, cut line, tick, stamp) is decorative: the stamp is
 * painted by CSS from `data-stamp`, and the axis marker is aria-hidden, so
 * screen readers only ever see the real station name.
 */
export default function Terranomy({
  locale,
  children,
}: {
  locale: Locale;
  children: ReactNode;
}) {
  const fa = locale === "fa";

  return (
    <div className="survey">
      <header className="survey-masthead">
        <div className="survey-masthead-head">
          <p className="survey-kicker">
            {fa ? "برداشت مماسی · برش A–A′" : "Tangential survey · section A–A′"}
          </p>
          <h2 dir="ltr" className="survey-title font-display">
            TERRANOMY
          </h2>
          <p className="survey-sub">
            {fa
              ? "هفت ایستگاه از پوسته تا گوشتهٔ پایینی؛ همان اجزا، جوهر تازه در هر برش."
              : "Seven stations from crust to lower mantle — the same acts, re-inked at every cut."}
          </p>
        </div>
        {/* Registration strip: the survey legend. ASCII codes, so it is pinned
            LTR and hidden from assistive tech (the stations below are the
            real, labeled content). */}
        <p className="survey-strip" dir="ltr" aria-hidden="true">
          {STATIONS.map((s) => (
            <span key={s.key} className="chip">
              <b>{s.code}</b>
              {s.name.en}
            </span>
          ))}
        </p>
      </header>

      <div className="survey-field">{children}</div>
    </div>
  );
}

/**
 * One labeled slice of the cross-section. Renders the cut line (via CSS
 * border), the axis marker sitting on that line, and the station label.
 */
export function Station({
  station,
  locale,
  children,
}: {
  station: StationKey;
  locale: Locale;
  children: ReactNode;
}) {
  const s = BY_KEY[station];

  return (
    <section
      className="survey-station"
      data-station={s.key}
      data-mineral={s.mineral}
      data-stamp={`${s.code} // ${s.name.en.toUpperCase()}`}
    >
      <span className="survey-vtick" aria-hidden="true">
        <b className="idx">{s.code}</b>
        <span className="rule" />
      </span>
      <p className="survey-station-label">
        <span className="code" dir="ltr">
          {s.code}
        </span>
        <span className="name">{s.name[locale]}</span>
        <span className="depth" dir="ltr">
          {s.depth}
        </span>
      </p>
      {children}
    </section>
  );
}
