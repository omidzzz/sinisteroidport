import type { Metadata } from "next";
import PageHero from "@/components/ui/PageHero";
import Reveal from "@/components/ui/Reveal";
import AskSinisterButton from "@/components/blog/AskSinisterButton";
import LabPlate from "@/components/lab/LabPlate";
import { getDict, isLocale, loc, type Locale } from "@/lib/i18n";
import { seoAlternates } from "@/lib/seo";
import { JsonLd } from "@/components/ui/JsonLd";
import { itemListJsonLd } from "@/lib/schema";

/** The archive: every illustration prop the site ships, with its FIG. no.
 *  Captions stay in the dictionaries' spirit — one line, technical, dry. */
const PLATES: { prop: string; no: string; en: string; fa: string }[] = [
  { prop: "frog", no: "01", en: "The frog · it darts", fa: "قورباغه · می‌پرد" },
  { prop: "plant", no: "02", en: "The plant · it sways", fa: "گیاه · تاب می‌خورد" },
  { prop: "laptop", no: "03", en: "The laptop · it works", fa: "لپ‌تاپ · کار می‌کند" },
  { prop: "drone", no: "04", en: "The drone · it watches", fa: "پهپاد · تماشا می‌کند" },
];

/** The palette the whole edition is mixed from — rendered from the same
 *  five values the tokens define, so the page cannot drift from the CSS. */
const SWATCHES = [
  { hex: "#272727", token: "--color-bg", role: "ground", roleFa: "زمینه" },
  { hex: "#eff1f3", token: "--color-surface", role: "cards", roleFa: "کارت‌ها" },
  { hex: "#fed766", token: "--color-accent", role: "signature", roleFa: "امضا" },
  { hex: "#009fb7", token: "--color-accent-2", role: "secondary", roleFa: "فرعی" },
  { hex: "#696773", token: "--color-muted", role: "structure", roleFa: "ساختار" },
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

  return (
    <div className="craft-lab cv-auto">
      <div className="mx-auto max-w-[86rem] px-5 pt-6 sm:px-8">
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
              <li key={swatch.hex} className="lab-swatch">
                <span
                  className="lab-swatch-chip"
                  style={{ background: swatch.hex }}
                  aria-hidden
                />
                <span className="lab-swatch-hex" dir="ltr">
                  {swatch.hex}
                </span>
                <span className="lab-swatch-token" dir="ltr">
                  {swatch.token}
                </span>
                <span className="lab-swatch-role">
                  {locale === "fa" ? swatch.roleFa : swatch.role}
                </span>
              </li>
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
        ]}
      />
    </div>
  );
}