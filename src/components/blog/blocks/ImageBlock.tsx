import type { ContentBlock } from "@/lib/blog/types";
import { altText } from "./utils";

export default function ImageBlock({
  block,
  figureNumber,
}: {
  block: ContentBlock;
  /** Incrementing figure index shared across the whole article. */
  figureNumber: number;
}) {
  const src = block.src ?? "";
  if (!src) return null;

  return (
    <figure className="group my-10">
      <div className="border border-line bg-panel p-1.5 transition-all duration-300 group-hover:border-accent/40 group-hover:shadow-[0_0_30px_rgba(60,226,255,0.07)]">
        {/* eslint-disable @next/next/no-img-element */}
        <img
          src={src}
          alt={altText(block.altText)}
          loading="lazy"
          className="w-full object-cover"
        />
      </div>
      {block.caption && (
        <figcaption className="mt-3 text-center font-mono text-xs leading-relaxed text-muted">
          <span className="text-accent" dir="ltr">
            [FIG.{figureNumber}]
          </span>{" "}
          {block.caption}
        </figcaption>
      )}
    </figure>
  );
}