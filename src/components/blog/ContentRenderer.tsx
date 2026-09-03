"use client";

import type { ContentBlock } from "@/lib/blog/types";
import HeadingBlock from "./blocks/HeadingBlock";
import ParagraphBlock from "./blocks/ParagraphBlock";
import ListBlock from "./blocks/ListBlock";
import HighlightBlock from "./blocks/HighlightBlock";
import QuoteBlock from "./blocks/QuoteBlock";
import ImageBlock from "./blocks/ImageBlock";
import CtaBlock from "./blocks/CtaBlock";
import StatsBlock from "./blocks/StatsBlock";
import AlertBlock from "./blocks/AlertBlock";
import CodeBlock from "./blocks/CodeBlock";
import TableBlock from "./blocks/TableBlock";

/**
 * Article renderer — dispatches each typed content block to its dedicated
 * block component (see ./blocks). Keeps the deterministic `sec-<index>`
 * heading ids (the post TOC links to them) and the article-wide figure
 * counter here so the block components stay stateless and trivially reusable.
 */
export default function ContentRenderer({ blocks }: { blocks: ContentBlock[] }) {
  if (!Array.isArray(blocks)) return null;

  let figIndex = 0;

  return (
    <div className="prose-post">
      {blocks.map((block, i) => {
        switch (block.type) {
          case "heading":
            return <HeadingBlock key={i} block={block} index={i} />;
          case "paragraph":
            return <ParagraphBlock key={i} block={block} />;
          case "list":
            return <ListBlock key={i} block={block} />;
          case "highlight":
            return <HighlightBlock key={i} block={block} />;
          case "quote":
            return <QuoteBlock key={i} block={block} />;
          case "image": {
            figIndex += 1;
            return <ImageBlock key={i} block={block} figureNumber={figIndex} />;
          }
          case "cta":
            return <CtaBlock key={i} block={block} />;
          case "stats":
            return <StatsBlock key={i} block={block} />;
          case "alert":
            return <AlertBlock key={i} block={block} />;
          case "code":
            return <CodeBlock key={i} block={block} />;
          case "table":
            return <TableBlock key={i} block={block} />;
          default:
            return null;
        }
      })}
    </div>
  );
}