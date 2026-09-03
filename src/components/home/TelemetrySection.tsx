import Reveal from "@/components/ui/Reveal";
import CountUp from "@/components/ui/CountUp";
import { Rail, Seam } from "@/components/ui/Section";
import { GaugeIcon } from "@/components/ui/icons";
import { getDict, type Locale } from "@/lib/i18n";

/**
 * HOME ACT II — TELEMETRY. Floating stat gauges (experience, projects,
 * languages, capabilities). No .cv-auto here — its paint containment clips
 * the absolutely placed TTY console that hangs off the section's lower edge.
 */
export default function TelemetrySection({
  locale,
  skillTotal,
}: {
  locale: Locale;
  skillTotal: number;
}) {
  const t = getDict(locale);
  const fa = locale === "fa";

  const STATS = (
    fa
      ? [
          { n: 12, label: "سال تجربه" },
          { n: 7, label: "پروژه منتخب" },
          { n: 2, label: "زبان" },
          { n: skillTotal, label: "توانمندی" },
        ]
      : [
          { n: 12, label: "Years of craft" },
          { n: 7, label: "Selected projects" },
          { n: 2, label: "Languages" },
          { n: skillTotal, label: "Capabilities" },
        ]
  ).map((s) => ({ ...s, v: Math.round((s.n / Math.max(skillTotal, s.n)) * 100) }));

  const tel = fa ? "تلمتری · وضعیت پرواز" : "Telemetry · flight status";

  return (
    <>
      <section className="shell-grid relative mx-auto mt-6 max-w-[86rem] px-5 sm:px-8">
        <Rail label={tel} icon={<GaugeIcon />} />
        <div className="relative">
          <span aria-hidden dir="ltr" className="scrub-word rev-dir top-[-0.45em]">
            TELEMETRY
          </span>
          <div className="scatter mt-2 grid grid-cols-2 gap-4 lg:grid-cols-4">
            {STATS.map((s, i) => (
              <Reveal key={s.label} delay={i * 80} variant={i % 2 ? "left" : "scale"}>
                <div className="gauge-cell">
                  <span className="gauge-num block text-[clamp(1.9rem,3.2vw,2.7rem)] leading-none">
                    <CountUp to={s.n} suffix="+" />
                  </span>
                  <p className="mt-2 font-mono text-[0.62rem] uppercase tracking-[0.16em] text-muted">
                    {s.label}
                  </p>
                  <span className="gauge-meter">
                    <span className="gauge-fill" style={{ ["--v" as string]: `${s.v}%` }} />
                  </span>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <Seam flip />
    </>
  );
}