import Link from "next/link";
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
    <div className="mx-auto flex min-h-[70vh] max-w-6xl flex-col justify-center px-4 sm:px-6">
      <p className="label mb-4">{t.notFound.kicker}</p>
      <h1 className="font-display text-outline select-none text-[clamp(6rem,22vw,18rem)] font-bold leading-none">
        404
      </h1>
      <p className="mt-6 max-w-md text-muted">{t.notFound.intro}</p>
      <Link
        href={`/${locale}`}
        className="group mt-10 inline-flex w-fit items-center gap-3 bg-accent px-7 py-3 font-mono text-xs font-bold uppercase tracking-[0.15em] text-bg transition-opacity hover:opacity-85"
      >
        {t.notFound.back}
        <ArrowIcon className="transition-transform duration-300 group-hover:translate-x-1 rtl:-scale-x-100 rtl:group-hover:-translate-x-1" />
      </Link>
    </div>
  );
}
