import type { ContentBlock } from "@/lib/blog/types";

/** In-content headings — H1 statement, H2 section divider (TOC-anchored),
 * H3 sub-section, H4+ quiet rule. */
export default function HeadingBlock({
  block,
  index,
}: {
  block: ContentBlock;
  /** Deterministic block index — the post TOC links to `sec-${index}`. */
  index: number;
}) {
  const level = Math.min(Math.max(block.level ?? 2, 2), 4);
  const Tag = (`h${level}` as unknown) as "h2";

  if (level <= 1) {
    /* In-content H1: big statement + short accent underline bar */
    return (
      <Tag className="mt-12 mb-6">
        <span className="text-2xl font-bold leading-tight text-ink sm:text-3xl">
          {block.text}
        </span>
        <span aria-hidden className="mt-4 block h-0.5 w-14 bg-accent" />
      </Tag>
    );
  }

  if (level === 2) {
    /* Section divider: mono # marker over a hairline rule.
       Deterministic id (block index) — the post TOC links to it. */
    return (
      <Tag id={`sec-${index}`} className="mt-14 mb-5 flex items-baseline gap-3 border-b border-line pb-3">
        <span aria-hidden className="font-mono text-sm font-bold text-accent">
          #
        </span>
        <span className="text-xl font-bold text-ink sm:text-2xl">
          {block.text}
        </span>
      </Tag>
    );
  }

  if (level === 3) {
    /* Sub-section: mono // marker, no rule */
    return (
      <Tag id={`sec-${index}`} className="mt-10 mb-3 flex items-baseline gap-2">
        <span aria-hidden className="font-mono text-xs font-bold text-accent">
          {"//"}
        </span>
        <span className="text-lg font-semibold text-ink">
          {block.text}
        </span>
      </Tag>
    );
  }

  /* H4+: quiet dash marker */
  return (
    <Tag className="mt-8 mb-2 flex items-baseline gap-2">
      <span aria-hidden className="font-mono text-xs text-accent">
        —
      </span>
      <span className="font-semibold text-ink">{block.text}</span>
    </Tag>
  );
}