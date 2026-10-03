import type { Metadata } from "next";
import PageHero from "@/components/ui/PageHero";
import Reveal from "@/components/ui/Reveal";
import AskSinisterButton from "@/components/blog/AskSinisterButton";
import LabPlate from "@/components/lab/LabPlate";
import LabSwatch from "@/components/lab/LabSwatch";
import { getDict, isLocale, loc, type Locale } from "@/lib/i18n";
import { seoAlternates, SITE } from "@/lib/seo";
import { BRAND } from "@/lib/brand";
import { JsonLd } from "@/components/ui/JsonLd";
import { itemListJsonLd, breadcrumbJsonLd } from "@/lib/schema";

/** The archive: every illustration prop the site ships, with its FIG. no.
 *  Captions stay in the dictionaries' spirit — one line, technical, dry. */
const PLATES: { prop: string; no: string; en: string; fa: string }[] = [
  { prop: "frog", no: "01", en: "The frog · it darts", fa: "قورباغه · می‌پرد" },
  { prop: "plant", no: "02", en: "The plant · it sways", fa: "گیاه · تاب می‌خورد" },
  { prop: "laptop", no: "03", en: "The laptop · it works", fa: "لپ‌تاپ · کار می‌کند" },
  { prop: "ufo", no: "04", en: "The UFO · it watches", fa: "یوافو · تماشا می‌کند" },
];

/** The palette the whole edition is mixed from — rendered from the same
 *  five values the tokens define, so the page cannot drift from the CSS.
 *  All FIVE read from the brand source (two grounds + three inks); the CSS
 *  token sheet and the @property initial-values are the styling side of the
 *  same values, and verify-craft asserts the hexes agree in both. */
const SWATCHES = [
  {
    hex: BRAND.themeColors.dark,
    token: "--color-bg",
    role: "ground",
    roleFa: "زمینه",
  },
  {
    hex: BRAND.themeColors.light,
    token: "--color-surface",
    role: "cards",
    roleFa: "کارت‌ها",
  },
  {
    hex: BRAND.inks.signature,
    token: "--color-accent",
    role: "signature",
    roleFa: "امضا",
  },
  {
    hex: BRAND.inks.secondary,
    token: "--color-accent-2",
    role: "secondary",
    roleFa: "فرعی",
  },
  {
    hex: BRAND.inks.structure,
    token: "--color-muted",
    role: "structure",
    roleFa: "ساختار",
  },
];

export function generateStaticParams() {
  return [{ locale: "en" }, { locale: "fa" }];
}
export const dynamicParams = false;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale: raw } = await params;
  const locale: Locale = isLocale(raw) ? raw : "en";
  const t = getDict(locale);
  return {
    title: t.lab.title,
    description: t.lab.intro,
    ...(isLocale(locale) ? { alternates: seoAlternates("lab", locale) } : {}),
  };
}

export default async function LabPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale: raw } = await params;
  const locale: Locale = isLocale(raw) ? raw : "en";
  const t = getDict(locale);
  const fa = locale === "fa";

  /** Button labels for the plate actions and the palette rows. */
  const labels = fa
    ? {
        copy: "کپی SVG",
        copied: "کپی شد",
        download: "دانلود",
      }
    : { copy: "Copy SVG", copied: "Copied", download: "Download" };

  return (
    <div className="craft-lab cv-auto">
      {/* No pt-* here, like every other interior route: the hero owns the
          dock clearance in its own padding (craft/pages.css), so this box
          starts at the top of the page and the ambient wash covers the full
          screen. It also used to open at pt-6, which put its eyebrow a full
          hero-height above the other routes. */}
      <div className="mx-auto max-w-6xl px-5 sm:px-8">
        <PageHero
          index="06"
          kicker={t.lab.kicker}
          title={t.lab.title}
          intro={t.lab.intro}
        />

        <div className="lab-grid mt-12 sm:mt-16">
          {PLATES.map((plate, i) => (
            <Reveal
              key={plate.prop}
              variant={i % 2 ? "right" : "left"}
              className="lab-cell"
            >
              <LabPlate
                prop={plate.prop}
                no={plate.no}
                caption={locale === "fa" ? plate.fa : plate.en}
                labels={labels}
              />
            </Reveal>
          ))}
        </div>

        <section className="lab-palette mt-16 sm:mt-20">
          <h2 className="label mb-4">
            {locale === "fa" ? "(پالت) پنج رنگ" : "(Palette) five inks"}
          </h2>
          <ul className="lab-swatches">
            {SWATCHES.map((swatch) => (
              <LabSwatch
                key={swatch.hex}
                hex={swatch.hex}
                token={swatch.token}
                role={locale === "fa" ? swatch.roleFa : swatch.role}
                labels={labels}
              />
            ))}
          </ul>
        </section>

        <div className="lab-ask mt-14">
          <AskSinisterButton
            locale={locale}
            label={locale === "fa" ? "از آزمایشگاه بپرس" : "Ask about the lab"}
            prompt={
              locale === "fa"
                ? "آزمایشگاه گرافیک چی هست و چه چیزهایی توش پیدا می‌شه؟"
                : "What is the graphics lab and what lives in it?"
            }
          />
        </div>
      </div>

      <JsonLd
        data={[
          itemListJsonLd(
            PLATES.map((plate) => ({
              name: plate.en,
              description: plate.en,
            })),
            locale
          ),
          breadcrumbJsonLd([
            { name: locale === "fa" ? "خانه" : "Home", url: `${SITE}/${locale}/` },
            { name: locale === "fa" ? "آزمایشگاه گرافیک" : "Graphics Lab", url: `${SITE}/${locale}/lab/` },
          ]),
        ]}
      />
    </div>
  );
}