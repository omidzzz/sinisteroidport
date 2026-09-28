import type { ContentBlock } from "@/lib/blog/types";

export default function ParagraphBlock({
  block,
  first = false,
}: {
  block: ContentBlock;
  /** True for the article's opening paragraph — it carries the drop cap. */
  first?: boolean;
}) {
  return (
    <p
      className={
        [
          block.style === "lead"
            ? "mb-8 border-s-2 border-accent ps-5 text-lg leading-relaxed text-ink sm:text-xl"
            : "leading-relaxed text-muted",
          first ? "prose-dropcap" : "",
        ]
          .filter(Boolean)
          .join(" ")
      }
    >
      {block.text}
    </p>
  );
}