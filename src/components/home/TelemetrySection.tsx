import Reveal from "@/components/ui/Reveal";
import CountUp from "@/components/ui/CountUp";
import { Rail } from "@/components/ui/Section";
import SysRule from "./SysRule";
import { GaugeIcon } from "@/components/ui/icons";
import { getDict, type Locale } from "@/lib/i18n";

/**
 * HOME ACT II — TELEMETRY / LEDGER.
 * Advanced stats display with segmented-display aesthetic,
 * orbital header indicator, and progress meters.
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
          <div className="ledger-header">
            <div className="ledger-orbital" aria-hidden="true">
              <div className="ledger-orbital-ring" />
              <div className="ledger-orbital-dot" />
            </div>
            <span className="ledger-title">
              {fa ? "تلمتری · وضعیت پرواز" : "Telemetry · flight status"}
            </span>
          </div>

          <div className="ledger-grid mt-2">
            {STATS.map((s, i) => (
              <Reveal key={s.label} delay={i * 80} variant={i % 2 ? "left" : "scale"}>
                <div className="ledger-cell" data-primary={i === 0 ? "true" : "false"}>
                  <span dir="ltr" className="ledger-idx" aria-hidden>
                    S.0{i + 1}
                  </span>
                  <span className="ledger-num">
                    <CountUp to={s.n} suffix="+" />
                  </span>
                  <p className="ledger-label">{s.label}</p>
                  <div className="ledger-meter">
                    <div className="ledger-meter-fill" style={{ "--v": `${s.v}%` } as React.CSSProperties} />
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <SysRule num="02" label={fa ? "دفتر شمار" : "Ledger"} />
    </>
  );
}
