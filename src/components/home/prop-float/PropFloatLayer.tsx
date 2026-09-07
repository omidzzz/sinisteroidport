"use client";

import { ScrollLazy } from "@/components/ui/LazyMount";
import PropFloat from "./PropFloat";

/**
 * PROP FLOAT LAYER — the console props, deployed as scroll-bound viewport
 * floaters, ONE per quarter of the page (scroll progress 0–25% → index 0 …
 * 75–100% → index 3), so no two props are ever on screen together:
 *   0 · frog    — darts away and trembles when the cursor gets close (hero act)
 *   1 · laptop  — heavy mass, banks slowly, sinks on fast scroll
 *   2 · plant   — sways elastically (telemetry act)
 *   3 · drone   — the UFO, saved for last (manifesto act)
 * Each springs in from its docked edge while its quarter is active.
 * The laptop also renders in-flow inside ConsoleBay for narrow viewports,
 * where this layer is hidden. Fixed layer, decorative, never interactive.
 *
 * Each prop is a ScrollLazy dynamic import — its chunk is NOT requested until
 * the prop's viewport quarter approaches, removing ~100 KiB of SVG/animation
 * JS from the initial bundle.
 */
export default function PropFloatLayer() {
  return (
    <>
      <PropFloat index={0} side="left" top="30%" depth={20} react="flee" className="pf-frog">
        <ScrollLazy load={() => import("../frog/Frog")} />
      </PropFloat>
      <PropFloat index={1} side="right" top="22%" depth={18} react="heavy" className="pf-laptop">
        <ScrollLazy load={() => import("../laptop-deck/LaptopDeck")} />
      </PropFloat>
      <PropFloat index={2} side="left" top="26%" depth={22} react="sway" className="pf-plant">
        <ScrollLazy load={() => import("../plant/Plant")} />
      </PropFloat>
      <PropFloat index={3} side="right" top="34%" depth={26} react="chase" className="pf-drone">
        <ScrollLazy load={() => import("../drone/Drone")} />
      </PropFloat>
    </>
  );
}
