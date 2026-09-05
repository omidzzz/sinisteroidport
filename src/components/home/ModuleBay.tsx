import Tilt from "@/components/ui/Tilt";
import Spotlight from "@/components/ui/Spotlight";
import { Rail, Seam } from "@/components/ui/Section";
import { ArrowIcon, OrbitIcon } from "@/components/ui/icons";
import { getDict, type Locale } from "@/lib/i18n";

/** HOME ACT III — MODULE BAY. Mirrored service cards with hover tilt. */
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
                    <ArrowIcon className="size-5 text-muted transition-all duration-300 group-hover:text-acid" />
                  </div>
                  <h2 className="mod-title text-[clamp(1.05rem,2vw,1.45rem)]">{service.title}</h2>
                  <p className="mod-desc">{service.description}</p>
                </article>
              </Tilt>
            ))}
          </div>
        </Spotlight>
        <Rail label={bay} icon={<OrbitIcon />} />
      </section>

      <Seam cyan flip />
    </>
  );
}