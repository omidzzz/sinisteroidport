import type { ContentBlock } from "@/lib/blog/types";

export default function CodeBlock({ block }: { block: ContentBlock }) {
  return (
    <div className="my-10 overflow-hidden rounded-lg border border-line bg-panel">
      {/* terminal chrome */}
      <div dir="ltr" className="flex items-center gap-1.5 border-b border-line px-4 py-2.5">
        <span aria-hidden className="h-2.5 w-2.5 rounded-full bg-[#fb923c]/70" />
        <span aria-hidden className="h-2.5 w-2.5 rounded-full bg-muted/40" />
        <span aria-hidden className="h-2.5 w-2.5 rounded-full bg-accent/70" />
        <span className="ms-auto label">sh</span>
      </div>
      <pre dir="ltr" className="overflow-x-auto p-4">
        <code className="font-mono text-xs leading-relaxed text-muted">
          {block.code}
        </code>
      </pre>
    </div>
  );
}