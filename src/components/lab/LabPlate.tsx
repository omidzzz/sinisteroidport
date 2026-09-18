"use client";

import type { ComponentType } from "react";
import { ScrollLazy } from "@/components/ui/LazyMount";

/**
 * Loader registry — statically analyzable dynamic imports so the bundler
 * still code-splits each prop into its own chunk. The server passes only the
 * `prop` key (functions cannot cross the server/client boundary) — the same
 * contract the home page's FigPlate uses, so the Lab is free to mount any
 * prop without ever paying for one before its tile approaches the viewport.
 */
const LOADERS: Record<string, () => Promise<{ default: ComponentType }>> = {
  frog: () => import("@/components/home/frog/Frog"),
  plant: () => import("@/components/home/plant/Plant"),
  drone: () => import("@/components/home/drone/Drone"),
  laptop: () => import("@/components/home/laptop-deck/LaptopDeck"),
};

/**
 * GRAPHICS LAB — a plate in the archive.
 *
 * The Lab is where the site's illustration layer (the props that float
 * through the home page) gets to be the subject instead of the decoration:
 * each plate mounts one asset at full size, in its own hairline frame, with
 * a FIG. number and caption. ScrollLazy keeps the chunk unrequested until
 * the plate is near the viewport, so the Lab's JS cost is per-tile, not
 * up-front.
 */
export default function LabPlate({
  prop,
  no,
  caption,
  className,
}: {
  /** A LOADERS key ("frog" | "plant" | "drone" | "laptop"). */
  prop: string;
  /** Figure number, ASCII/LTR ("01"…"04"). */
  no: string;
  caption: string;
  className?: string;
}) {
  const load = LOADERS[prop] ?? LOADERS.frog;
  return (
    <figure className={`lab-plate ${className ?? ""}`}>
      <div className="lab-stage" aria-hidden>
        <ScrollLazy load={load} />
      </div>
      <figcaption className="lab-caption">
        <span className="lab-fig" dir="ltr">
          FIG. {no}
        </span>
        <span className="lab-cap">{caption}</span>
      </figcaption>
    </figure>
  );
}