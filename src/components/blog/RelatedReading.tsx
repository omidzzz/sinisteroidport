import type { Post } from "@/lib/blog/types";
import { postTitle, postExcerpt, formatPostDate } from "@/lib/blog/format";
import { loc, type Locale } from "@/lib/i18n";
import { ArrowIcon } from "../ui/icons";

/**
 * Related-reading block — the article's main CTR surface. A "Next
 * transmission" hero card for the single best-matching post (big title,
 * excerpt, cover, arrow) followed by compact rows for the rest. Rendered
 * inside the client post component (still SSR'd to static HTML) between the
 * article body and the FAQ so it isn't buried behind the accordions.
 */
export default function RelatedReading({
  related,
  locale,
}: {
  related: Post[];
  locale: Locale;
}) {
  if (!related.length) return null;

  const [hero, ...rest] = related;
  const heroHref = loc(locale, `/blog/${hero.slug}`);
  const heroTitle = postTitle(hero, locale);
  const heroExcerpt = postExcerpt(hero, locale);
  const heroCover = hero.featuredImage?.src || null;

  return (
    <section className="cv-auto relative mx-auto max-w-3xl px-4 py-16 sm:px-6">
      <span aria-hidden className="x-rule" />
      <h2 className="label mb-8">
        {locale === "fa" ? "(مطالب مرتبط)" : "(Related reading)"}
      </h2>

      {/* compact rows — title is the payload, date/excerpt stay quiet */}
      {rest.map((p) => {
        const title = postTitle(p, locale);
        const excerpt = postExcerpt(p, locale);
        const cover = p.featuredImage?.src || null;
        return (
          <a
            key={p.slug}
            href={loc(locale, `/blog/${p.slug}`)}
            data-track="related_post_click"
            className="group flex items-center gap-4 border-t border-line py-4 transition-colors hover:bg-panel/40"
          >
            {cover && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={cover}
                alt=""
                loading="lazy"
                decoding="async"
                width={160}
                height={90}
                className="h-14 w-24 shrink-0 border border-line object-cover"
              />
            )}
            <span className="min-w-0 flex-1">
              <span className="block font-medium tracking-tight underline decoration-line decoration-1 underline-offset-4 transition-colors duration-300 group-hover:text-accent group-hover:decoration-accent">
                {title}
              </span>
              <span className="mt-1 line-clamp-1 block text-xs leading-relaxed text-muted">
                {excerpt}
              </span>
            </span>
            <ArrowIcon className="size-4 shrink-0 text-muted transition-all duration-300 group-hover:translate-x-1 group-hover:text-acid rtl:-scale-x-100 rtl:group-hover:-translate-x-1" />
          </a>
        );
      })}

      {/* hero card — the one obvious next step at the end of the page */}
      <a
        href={heroHref}
        data-track="related_post_click"
        className="group relative mt-8 block border border-line bg-panel/40 p-6 transition-colors hover:border-accent/60"
      >
        <span className="label block text-muted">
          {locale === "fa" ? "(بعدی را بخوانید)" : "(Next transmission)"}
        </span>
        <span className="mt-4 flex items-start gap-5">
          {heroCover && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={heroCover}
              alt=""
              loading="lazy"
              decoding="async"
              width={320}
              height={180}
              className="hidden h-[4.5rem] w-40 shrink-0 border border-line object-cover sm:block"
            />
          )}
          <span className="min-w-0 flex-1">
            <span className="block text-lg font-bold leading-snug tracking-tight underline decoration-line decoration-1 underline-offset-4 transition-colors duration-300 group-hover:text-acid group-hover:decoration-acid sm:text-xl">
              {heroTitle}
            </span>
            {heroExcerpt && (
              <span className="mt-2 line-clamp-2 block text-sm leading-relaxed text-muted">
                {heroExcerpt}
              </span>
            )}
            <span
              className="mt-2 block font-mono text-[0.62rem] tracking-[0.2em] text-muted"
              dir="ltr"
            >
              {formatPostDate(hero.date)}
            </span>
          </span>
          <ArrowIcon className="mt-1 size-5 shrink-0 text-muted transition-all duration-300 group-hover:translate-x-1 group-hover:text-acid rtl:-scale-x-100 rtl:group-hover:-translate-x-1" />
        </span>
      </a>
    </section>
  );
}