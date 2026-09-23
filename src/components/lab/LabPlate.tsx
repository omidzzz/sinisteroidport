"use client";

import { useCallback, useEffect, useRef, useState, type ComponentType } from "react";
import { ScrollLazy } from "@/components/ui/LazyMount";
import { buildPropSvgMarkup, downloadText, writeClipboard } from "./svgExport";

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
  ufo: () => import("@/components/home/drone/Drone"),
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
  labels,
  className,
}: {
  /** A LOADERS key ("frog" | "plant" | "ufo" | "laptop"). */
  prop: string;
  /** Figure number, ASCII/LTR ("01"…"04"). */
  no: string;
  caption: string;
  /** Copy/download labels for the active locale. */
  labels: { copy: string; copied: string; download: string };
  className?: string;
}) {
  const figRef = useRef<HTMLElement>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [done, setDone] = useState<"copy" | "dl" | null>(null);

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    []
  );

  const flash = useCallback((kind: "copy" | "dl") => {
    setDone(kind);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setDone(null), 2000);
  }, []);

  /* The mounted prop lives inside the stage (see the ScrollLazy contract).
     Both actions no-op silently when the chunk has not arrived yet — the
     row stays honest instead of copying an empty frame. */
  const onCopy = useCallback(async () => {
    const stage = figRef.current?.querySelector(".lab-stage");
    const markup = stage instanceof HTMLElement ? await buildPropSvgMarkup(stage) : null;
    if (!markup) return;
    if (await writeClipboard(markup)) flash("copy");
  }, [flash]);

  const onDownload = useCallback(async () => {
    const stage = figRef.current?.querySelector(".lab-stage");
    const markup = stage instanceof HTMLElement ? await buildPropSvgMarkup(stage) : null;
    if (!markup) return;
    downloadText(`<?xml version="1.0" encoding="UTF-8"?>\n${markup}`, `${prop}.svg`, "image/svg+xml");
    flash("dl");
  }, [flash, prop]);

  const load = LOADERS[prop] ?? LOADERS.frog;
  return (
    <figure ref={figRef} className={`lab-plate ${className ?? ""}`}>
      <div className="lab-stage" aria-hidden>
        <ScrollLazy load={load} />
      </div>
      <figcaption className="lab-caption">
        <span className="lab-fig" dir="ltr">
          FIG. {no}
        </span>
        <span className="lab-cap">{caption}</span>
      </figcaption>
      <div className="lab-actions">
        <button
          type="button"
          className="lab-act"
          data-done={done === "copy" || undefined}
          onClick={onCopy}
          aria-label={`${labels.copy}: FIG. ${no}`}
        >
          <span aria-hidden>⧉</span>
          <span>{done === "copy" ? labels.copied : labels.copy}</span>
        </button>
        <button
          type="button"
          className="lab-act"
          data-done={done === "dl" || undefined}
          onClick={onDownload}
          aria-label={`${labels.download}: ${prop}.svg`}
        >
          <span aria-hidden>↓</span>
          <span>{done === "dl" ? labels.copied : labels.download}</span>
        </button>
      </div>
    </figure>
  );
}