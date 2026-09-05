import { ArrowIcon } from "../../ui/icons";

/**
 * Compact mid-article related-post callout — inserted deterministically by
 * ContentRenderer every few blocks so internal-link CTR isn't confined to
 * the page footer. Same corner-tick treatment as CtaBlock, single-line body.
 * Rendered as a plain anchor (not next/link) so navigation stays reliable in
 * this static export — same reasoning as the blog issue grid.
 */
export default function InlineCallout({
  kicker,
  title,
  href,
}: {
  kicker: string;
  title: string;
  href: string;
}) {
  return (
    <a
      href={href}
      data-track="inline_cta_click"
      className="group relative my-8 block border border-dashed border-accent/40 bg-panel/60 px-6 py-4"
    >
      {/* corner ticks */}
      <span
        aria-hidden
        className="absolute -start-px -top-px h-2.5 w-2.5 border-s-2 border-t-2 border-accent transition-colors group-hover:border-solid group-hover:border-accent"
      />
      <span
        aria-hidden
        className="absolute -end-px -top-px h-2.5 w-2.5 border-e-2 border-t-2 border-accent transition-colors group-hover:border-solid group-hover:border-accent"
      />
      <span
        aria-hidden
        className="absolute -bottom-px -start-px h-2.5 w-2.5 border-b-2 border-s-2 border-accent transition-colors group-hover:border-solid group-hover:border-accent"
      />
      <span
        aria-hidden
        className="absolute -bottom-px -end-px h-2.5 w-2.5 border-b-2 border-e-2 border-accent transition-colors group-hover:border-solid group-hover:border-accent"
      />
      <span className="label block text-muted">{kicker}</span>
      <span className="mt-1.5 flex items-center gap-2">
        <span className="font-medium leading-snug tracking-tight text-ink underline decoration-line decoration-1 underline-offset-4 transition-colors duration-200 group-hover:text-accent group-hover:decoration-accent">
          {title}
        </span>
        <ArrowIcon className="size-4 shrink-0 text-accent transition-transform duration-200 group-hover:translate-x-0.5 rtl:-scale-x-100 rtl:group-hover:-translate-x-0.5" />
      </span>
    </a>
  );
}