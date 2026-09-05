"use client";

import type { ReactNode } from "react";
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
import InlineCallout from "./blocks/InlineCallout";

export interface RelatedCallout {
  kicker: string;
  title: string;
  href: string;
}

/**
 * Article renderer — dispatches each typed content block to its dedicated
 * block component (see ./blocks). Keeps the deterministic `sec-<index>`
 * heading ids (the post TOC links to them) and the article-wide figure
 * counter here so the block components stay stateless and trivially reusable.
 *
 * When `callouts` is provided, compact related-post callouts are inserted
 * deterministically — every 4th block, never directly before a heading,
 * never in the article tail, capped at two — so internal-link CTR isn't
 * confined to the page footer. Deterministic = identical SSR/SSG output.
 */
export default function ContentRenderer({
  blocks,
  callouts = [],
}: {
  blocks: ContentBlock[];
  callouts?: RelatedCallout[];
}) {
  if (!Array.isArray(blocks)) return null;

  let figIndex = 0;
  let calloutIndex = 0;
  const nodes: ReactNode[] = [];

  blocks.forEach((block, i) => {
    switch (block.type) {
      case "heading":
        nodes.push(<HeadingBlock key={i} block={block} index={i} />);
        break;
      case "paragraph":
        nodes.push(<ParagraphBlock key={i} block={block} />);
        break;
      case "list":
        nodes.push(<ListBlock key={i} block={block} />);
        break;
      case "highlight":
        nodes.push(<HighlightBlock key={i} block={block} />);
        break;
      case "quote":
        nodes.push(<QuoteBlock key={i} block={block} />);
        break;
      case "image": {
        figIndex += 1;
        nodes.push(
          <ImageBlock key={i} block={block} figureNumber={figIndex} />
        );
        break;
      }
      case "cta":
        nodes.push(<CtaBlock key={i} block={block} />);
        break;
      case "stats":
        nodes.push(<StatsBlock key={i} block={block} />);
        break;
      case "alert":
        nodes.push(<AlertBlock key={i} block={block} />);
        break;
      case "code":
        nodes.push(<CodeBlock key={i} block={block} />);
        break;
      case "table":
        nodes.push(<TableBlock key={i} block={block} />);
        break;
      default:
        break;
    }

    if (
      callouts.length > 0 &&
      calloutIndex < 2 &&
      (i + 1) % 4 === 0 &&
      i < blocks.length - 2 &&
      blocks[i + 1]?.type !== "heading" &&
      // Never stack onto an authored CTA block — the author's own callout
      // already occupies that slot
      block.type !== "cta"
    ) {
      const c = callouts[calloutIndex % callouts.length];
      calloutIndex += 1;
      nodes.push(<InlineCallout key={`callout-${i}`} {...c} />);
    }
  });

  return <div className="prose-post">{nodes}</div>;
}