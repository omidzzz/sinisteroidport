"use client";

import type { ComponentType } from "react";
import { ScrollLazy } from "@/components/ui/LazyMount";

/**
 * Loader registry — statically analyzable dynamic imports so the bundler
 * still code-splits each prop into its own chunk. The server passes only
 * the `prop` key (functions cannot cross the server/client boundary).
 */
const LOADERS: Record<string, () => Promise<{ default: ComponentType<any> }>> = {
  frog: () => import("@/components/home/frog/Frog"),
  plant: () => import("@/components/home/plant/Plant"),
  laptop: () => import("@/components/home/laptop-deck/LaptopDeck"),
  drone: () => import("@/components/home/drone/Drone"),
};

/**
 * FIG. PLATE — the printed plate (QUIRE register).
 *
 * The scroll-bound prop floaters (frog / laptop / plant / drone) retire as
 * fixed floaters and return as monochrome figures mounted in-flow inside
 * their acts: hairline frame, grayscale ink, marginal caption. The prop
 * chunk is still NOT requested until the plate nears the viewport
 * (ScrollLazy), so the initial JS budget is unchanged.
 */
export default function FigPlate({
  no,
  caption,
  prop,
  className,
}: {
  /** Figure number, ASCII/LTR ("01"…"04"). */
  no: string;
  /** Marginal caption under the plate. */
  caption: string;
  /** Which prop to mount — a LOADERS key ("frog" | "plant" | "laptop" | "drone"). */
  prop: string;
  className?: string;
}) {
  const load = LOADERS[prop] ?? LOADERS.frog;
  return (
    <figure className={`fig-plate ${className ?? ""}`}>
      <ScrollLazy load={load} />
      <figcaption className="fig-caption">
        <span className="fig-no" dir="ltr">
          FIG. {no}
        </span>
        <span>{caption}</span>
      </figcaption>
    </figure>
  );
}