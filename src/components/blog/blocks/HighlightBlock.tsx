import type { ContentBlock } from "@/lib/blog/types";

export default function HighlightBlock({ block }: { block: ContentBlock }) {
  return (
    <aside className="my-10 border border-accent/40 bg-panel/60 p-5 shadow-[0_0_24px_rgba(60,226,255,0.08)]">
      {block.label && (
        <p className="mb-2 font-mono text-xs font-bold uppercase tracking-widest text-accent">
          [{block.label}]
        </p>
      )}
      <p className="leading-relaxed text-ink">{block.text}</p>
    </aside>
  );
}