import Link from "next/link";
import PageHero from "@/components/PageHero";
import Reveal from "@/components/Reveal";
import Spotlight from "@/components/Spotlight";
import { getDict } from "@/lib/i18n";
import { ArrowIcon } from "@/components/icons";

export default function LocaleNotFound({
  params,
}: {
  params: { locale: string };
}) {
  const locale = params?.locale === "fa" ? "fa" : "en";
  const t = getDict(locale);
  return (
    <div className="mx-auto flex min-h-[80vh] max-w-6xl flex-col justify-center px-5 pt-24 sm:px-8">
      <Spotlight className="relative">
        <Reveal>
          <PageHero
            index="ERR"
            kicker={t.notFound.kicker}
            title={locale === "fa" ? "خطا 404" : "Error 404"}
            intro={t.notFound.intro}
          />
        </Reveal>
        <Reveal delay={120}>
          <Link
            href={`/${locale}`}
            className="group mt-10 inline-flex w-fit items-center gap-3 bg-accent px-7 py-3 font-mono text-xs font-bold uppercase tracking-[0.15em] text-bg transition-opacity hover:opacity-85"
          >
            {t.notFound.back}
            <ArrowIcon className="transition-transform duration-300 group-hover:translate-x-1 rtl:-scale-x-100 rtl:group-hover:-translate-x-1" />
          </Link>
        </Reveal>
      </Spotlight>
    </div>
  );
}