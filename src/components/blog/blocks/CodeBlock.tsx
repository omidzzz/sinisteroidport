"use client";

import { useEffect, useRef, useState } from "react";
import type { ContentBlock } from "@/lib/blog/types";

export default function CodeBlock({ block }: { block: ContentBlock }) {
  const [copied, setCopied] = useState(false);
  const timer = useRef<number | null>(null);

  // Clear the "copied" feedback timer on unmount
  useEffect(() => () => {
    if (timer.current) window.clearTimeout(timer.current);
  }, []);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(block.code ?? "");
      setCopied(true);
      if (timer.current) window.clearTimeout(timer.current);
      timer.current = window.setTimeout(() => setCopied(false), 1500);
    } catch {
      // Clipboard API unavailable (e.g. insecure context) — no-op
    }
  };

  return (
    <div className="my-10 overflow-hidden rounded-lg border border-line bg-panel">
      {/* terminal chrome */}
      <div dir="ltr" className="flex items-center gap-1.5 border-b border-line px-4 py-2.5">
        <span aria-hidden className="h-2.5 w-2.5 rounded-full bg-[#fb923c]/70" />
        <span aria-hidden className="h-2.5 w-2.5 rounded-full bg-muted/40" />
        <span aria-hidden className="h-2.5 w-2.5 rounded-full bg-accent/70" />
        <span className="ms-auto label">sh</span>
        <button
          type="button"
          onClick={copy}
          aria-label="Copy code to clipboard"
          className={`label cursor-pointer transition-colors duration-200 ${
            copied ? "text-acid" : "text-muted hover:text-ink"
          }`}
        >
          {copied ? "COPIED ✓" : "COPY"}
        </button>
      </div>
      <pre dir="ltr" className="overflow-x-auto p-4">
        <code className="font-mono text-xs leading-relaxed text-muted">
          {block.code}
        </code>
      </pre>
    </div>
  );
}