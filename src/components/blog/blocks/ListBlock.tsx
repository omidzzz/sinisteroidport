import type { ContentBlock } from "@/lib/blog/types";

export default function ListBlock({ block }: { block: ContentBlock }) {
  const items = (block.items ?? []).filter(
    (item): item is string => typeof item === "string"
  );
  if (!items.length) return null;

  if (block.style === "ordered") {
    return (
      <ol className="mb-6 space-y-3">
        {items.map((item, j) => (
          <li key={j} className="flex gap-4">
            <span
              aria-hidden
              dir="ltr"
              className="shrink-0 pt-0.5 font-mono text-xs font-bold tracking-widest text-accent"
            >
              {String(j + 1).padStart(2, "0")}
            </span>
            <span className="leading-relaxed text-muted">{item}</span>
          </li>
        ))}
      </ol>
    );
  }

  return (
    <ul className="mb-6 space-y-3">
      {items.map((item, j) => (
        <li key={j} className="flex gap-3.5">
          <span
            aria-hidden
            className="mt-[0.55em] h-1.5 w-1.5 shrink-0 rotate-45 bg-accent"
          />
          <span className="leading-relaxed text-muted">{item}</span>
        </li>
      ))}
    </ul>
  );
}