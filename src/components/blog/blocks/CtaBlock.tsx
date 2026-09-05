import type { ContentBlock } from "@/lib/blog/types";
import { ArrowIcon } from "../../ui/icons";

export default function CtaBlock({ block }: { block: ContentBlock }) {
  return (
    <div className="group relative my-10 border border-dashed border-accent/40 bg-panel/60 p-7 text-center">
      {/* corner ticks */}
      <span
        aria-hidden
        className="absolute -start-px -top-px h-3 w-3 border-s-2 border-t-2 border-accent transition-colors group-hover:border-solid group-hover:border-accent"
      />
      <span
        aria-hidden
        className="absolute -end-px -top-px h-3 w-3 border-e-2 border-t-2 border-accent transition-colors group-hover:border-solid group-hover:border-accent"
      />
      <span
        aria-hidden
        className="absolute -bottom-px -start-px h-3 w-3 border-b-2 border-s-2 border-accent transition-colors group-hover:border-solid group-hover:border-accent"
      />
      <span
        aria-hidden
        className="absolute -bottom-px -end-px h-3 w-3 border-b-2 border-e-2 border-accent transition-colors group-hover:border-solid group-hover:border-accent"
      />
      <h3 className="text-lg font-bold text-ink">{block.title}</h3>
      {block.text && (
        <p className="mx-auto mt-2 max-w-prose text-sm leading-relaxed text-muted">
          {block.text}
        </p>
      )}
      {block.buttonUrl && (
        <a
          href={block.buttonUrl}
          className="cta-btn mt-5 inline-flex items-center gap-2 border border-accent px-6 py-2.5 font-mono text-xs font-bold uppercase tracking-widest text-accent transition-colors duration-200"
        >
          {block.buttonText ?? "Read more"}
          <ArrowIcon className="transition-transform duration-200 group-hover:translate-x-0.5 rtl:-scale-x-100 rtl:group-hover:-translate-x-0.5" />
        </a>
      )}
    </div>
  );
}