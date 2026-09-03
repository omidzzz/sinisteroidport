import type { ContentBlock } from "@/lib/blog/types";

export default function StatsBlock({ block }: { block: ContentBlock }) {
  const stats = (block.items ?? []).filter(
    (item): item is { value: string; label: string } =>
      typeof item === "object" && item !== null && "value" in item
  );
  if (!stats.length) return null;

  /* Adaptive columns: hairline-grid of stat cells */
  const cols =
    stats.length === 2
      ? "sm:grid-cols-2"
      : stats.length === 4
        ? "sm:grid-cols-4"
        : "sm:grid-cols-3";

  return (
    <div className={`my-10 grid grid-cols-1 gap-px border border-line bg-line ${cols}`}>
      {stats.map((stat, j) => (
        <div key={j} className="relative bg-panel p-5">
          <span
            aria-hidden
            className="absolute start-0 top-0 h-0.5 w-8 bg-accent"
          />
          <p dir="auto" className="font-mono text-2xl font-bold text-accent">
            {stat.value}
          </p>
          <p className="mt-2 text-sm leading-relaxed text-muted">
            {stat.label}
          </p>
        </div>
      ))}
    </div>
  );
}