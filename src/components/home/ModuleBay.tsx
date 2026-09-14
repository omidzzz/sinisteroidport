import Tilt from "@/components/ui/Tilt";
import Spotlight from "@/components/ui/Spotlight";
import { Rail, Seam } from "@/components/ui/Section";
import { ArrowIcon, OrbitIcon } from "@/components/ui/icons";
import { getDict, type Locale } from "@/lib/i18n";

/** HOME ACT III — MODULE BAY. Mirrored service cards with hover tilt. */
/* Static stack footers — parallel to the 4 services in the dictionaries. */
const STACKS_EN = [
  ["React", "Next.js", "Motion"],
  ["WordPress", "Elementor", "Perf"],
  ["SEO", "Editorial", "GEO"],
  ["EN↔FA", "Docs", "L10n"],
];
const STACKS_FA = [
  ["ری‌اکت", "نکست", "موشن"],
  ["وردپرس", "المنتور", "پرف"],
  ["سئو", "تحریریه", "GEO"],
  ["EN↔FA", "مستندات", "بومی‌سازی"],
];
export default function ModuleBay({ locale }: { locale: Locale }) {
  const t = getDict(locale);
  const fa = locale === "fa";
  const bay = fa ? "ماهواره‌ها · مهارت‌ها" : "Modules · capability deck";
  return (
    <>
      <section className="shell-grid rev relative mx-auto mt-6 max-w-[86rem] px-5 sm:px-8">
        <Spotlight className="min-w-0">
          <div className="bay-grid relative">
            {t.services.map((service, i) => (
              <Tilt key={service.title} maxTilt={7}>
                <article
                  className={`module-card ${i % 2 ? "rotate-1 md:-translate-y-6" : "-rotate-1"}`}
                  data-hue={i % 2 ? "cyan" : "acid"}
                >
                  <span aria-hidden className="mod-halo" />
                  <div className="flex items-center justify-between">
                    <span className="mod-idx">M.{String(i + 1).padStart(2, "0")}</span>
                    <ArrowIcon className="mod-arrow size-5 text-muted" />
                  </div>
                  <h2 className="mod-title text-[clamp(1.05rem,2vw,1.45rem)]">{service.title}</h2>
                  <p className="mod-desc">{service.description}</p>
                  <div className="mod-foot">
                    {(fa ? STACKS_FA[i] : STACKS_EN[i]).map((chip) => (
                      <span key={chip} className="mod-chip">
                        {chip}
                      </span>
                    ))}
                  </div>
                </article>
              </Tilt>
            ))}
          </div>
        </Spotlight>
        <Rail label={bay} icon={<OrbitIcon />} />
      </section>

      <Seam cyan flip tag="SIG.04 ▸ MODULES" />
    </>
  );
}