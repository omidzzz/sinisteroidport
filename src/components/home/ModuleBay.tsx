import { Rail } from "@/components/ui/Section";
import SysRule from "./SysRule";
import { ArrowIcon } from "@/components/ui/icons";
import { getDict, type Locale } from "@/lib/i18n";

/**
 * HOME ACT III — MODULE BAY.
 * Clean, styled service cards with hover effects.
 */
const STACKS_EN = [
  ["React", "Next.js", "Motion"],
  ["WordPress", "Elementor", "Perf"],
  ["SEO", "Editorial", "GEO"],
  ["EN" + String.fromCharCode(8594) + "FA", "Docs", "L10n"],
];
const STACKS_FA = [
  ["ری‌اکت", "نکست", "موشن"],
  ["وردپرس", "المنتور", "پرف"],
  ["سئو", "تحریریه", "GEO"],
  ["EN" + String.fromCharCode(8594) + "FA", "مستندات", "بومی‌سازی"],
];

export default function ModuleBay({ locale }: { locale: Locale }) {
  const t = getDict(locale);
  const fa = locale === "fa";
  const bay = fa ? "سرویس‌ها · توانمندی‌ها" : "Services · capability deck";

  return (
    <>
      <section className="shell-grid relative mx-auto mt-6 max-w-[86rem] px-5 sm:px-8">
        <Rail label={bay} icon={<ArrowIcon />} />
        <div className="module-grid relative">
          {t.services.map((service, i) => (
            <article
              key={service.title}
              className={`service-card ${i % 2 === 0 ? "even" : "odd"}`}
            >
              <div className="service-glow" aria-hidden />
              <div className="service-content">
                <div className="service-header">
                  <span className="service-idx">M.{String(i + 1).padStart(2, "0")}</span>
                  <span className="service-tag">{fa ? "سرویس" : "SERVICE"}</span>
                </div>
                <h2 className="service-title">{service.title}</h2>
                <p className="service-desc">{service.description}</p>
                <div className="service-stack">
                  {(fa ? STACKS_FA[i] : STACKS_EN[i]).map((tech) => (
                    <span key={tech} className="service-chip">{tech}</span>
                  ))}
                </div>
              </div>
              <div className="service-action">
                <ArrowIcon className="service-arrow" />
              </div>
            </article>
          ))}
        </div>
      </section>

      <SysRule num="04" label={fa ? "سرویس‌ها" : "Services"} />
    </>
  );
}
