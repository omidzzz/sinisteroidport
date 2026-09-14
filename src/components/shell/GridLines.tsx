/** Fixed editorial hairline columns — pure decoration.
 *  Warp-lane parallax: each rail drifts at its own depth via --py (written
 *  by a single passive scroll+rAF loop). md+ only, static otherwise. */
"use client";

import { useEffect } from "react";

const DEPTHS = [0.04, 0.08, 0.12, 0.16];

export default function GridLines() {
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    if (window.matchMedia("(max-width: 767.98px)").matches) return;
    let raf = 0;
    let last = -1;
    const write = () => {
      raf = 0;
      const y = window.scrollY;
      if (y === last) return;
      last = y;
      document.documentElement.style.setProperty("--warp-y", `${Math.round(y)}`);
    };
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(write);
    };
    write();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      if (raf) cancelAnimationFrame(raf);
      document.documentElement.style.removeProperty("--warp-y");
    };
  }, []);

  return (
    // HYPERDRIVE constellation rails — tilted warp lanes instead of
    // editorial columns. Each rail is a rotated hairline with glowing
    // star nodes sitting along it (pure decoration).
    <div
      aria-hidden
      className="pointer-events-none fixed inset-0 z-0 hidden overflow-hidden md:block"
    >
      <div className="constellation-rails mx-auto h-full max-w-7xl">
        {Array.from({ length: 4 }, (_, i) => (
          <span
            key={i}
            className="grid-rail"
            style={{ ["--depth" as string]: DEPTHS[i] }}
          >
            <i className="star-node" />
            <i className="star-node" style={{ top: "38%" }} />
            <i className="star-node" style={{ top: "72%" }} />
          </span>
        ))}
      </div>
    </div>
  );
}
