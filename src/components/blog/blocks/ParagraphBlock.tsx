import type { ContentBlock } from "@/lib/blog/types";

export default function ParagraphBlock({ block }: { block: ContentBlock }) {
  return (
    <p
      className={
        block.style === "lead"
          ? "mb-8 border-s-2 border-accent ps-5 text-lg leading-relaxed text-ink sm:text-xl"
          : "leading-relaxed text-muted"
      }
    >
      {block.text}
    </p>
  );
}