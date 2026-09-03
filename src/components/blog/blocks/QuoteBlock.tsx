import type { ContentBlock } from "@/lib/blog/types";

export default function QuoteBlock({ block }: { block: ContentBlock }) {
  return (
    <blockquote className="relative my-10 border-s-2 border-accent bg-panel/40 py-5 pe-6 ps-12 italic text-ink">
      <span
        aria-hidden
        className="absolute start-4 top-3 font-mono text-4xl leading-none text-accent"
      >
        &ldquo;
      </span>
      <p className="leading-relaxed">{block.text}</p>
      {block.author && (
        <footer className="mt-3 font-mono text-xs not-italic tracking-widest text-muted">
          — {block.author}
        </footer>
      )}
    </blockquote>
  );
}