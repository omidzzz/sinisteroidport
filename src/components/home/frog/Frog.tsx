"use client";

import { useEffect, useRef } from "react";
import { STYLE } from "./animations";
import { INK, DRIPS, SWIRLS, EYES } from "./geometry";

/* the two solid pupil dots are replaced by spinning psychedelic spirals */
const BODY = INK.filter((p) => !p.pupil);

/* neon hues ride deck-local CSS vars (attributes can't consume var()) */
const C: Record<string, string> = {
  acid: "var(--frg-acid)",
  cyan: "var(--frg-cyan)",
  mag: "var(--frg-mag)",
};

/**
 * FROG — the nervous Pepe frog (hand-drawn meme icon), psychedelic acid
 * edition. The source icon's ink is kept verbatim, rendered three times:
 * green base + chromatic acid/magenta ghost inks that swim behind it under
 * a counter-rotating vortex of dashed rings. Sweat scribbles drip cyan,
 * extra neon droplets slide down the face in acid/magenta/cyan. Decorative,
 * pauses when scrolled out of view, respects prefers-reduced-motion.
 */
export default function Frog() {
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    if (el.closest("[data-pf-host]")) return; /* host pauses via .pf-on */
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const obs = new IntersectionObserver(
      ([entry]) => el.classList.toggle("frg-paused", !entry.isIntersecting),
      { threshold: 0.05 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  return (
    <div
      ref={wrapRef}
      dir="ltr"
      aria-hidden="true"
      className="frg-root"
      style={{ position: "relative", display: "flex", justifyContent: "center", willChange: "transform" }}
    >
      <style>{STYLE}</style>
      <svg
        xmlns="http://www.w3.org/2000/svg"
        className="frg-svg"
        viewBox="-3 -3 54 54"
        width="100%"
        style={{ pointerEvents: "none", overflow: "visible", direction: "ltr", display: "block" }}
      >
        <defs>
          {/* acid -> magenta trip aura */}
          <radialGradient id="frg-aura" cx="0.5" cy="0.45" r="0.62">
            <stop offset="0%" stopColor="rgba(158,219,90,0.3)" />
            <stop offset="42%" stopColor="rgba(184,255,0,0.13)" />
            <stop offset="74%" stopColor="rgba(255,43,214,0.1)" />
            <stop offset="100%" stopColor="rgba(255,43,214,0)" />
          </radialGradient>
          <radialGradient id="frg-auraB" cx="0.5" cy="0.5" r="0.62">
            <stop offset="0%" stopColor="rgba(255,43,214,0.3)" />
            <stop offset="60%" stopColor="rgba(0,229,255,0.1)" />
            <stop offset="100%" stopColor="rgba(0,229,255,0)" />
          </radialGradient>
          <filter id="frg-glowF" x="-80%" y="-80%" width="260%" height="260%">
            <feGaussianBlur stdDeviation="0.55" result="b" />
            <feMerge>
              <feMergeNode in="b" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* breathing acid/magenta aura + counter-rotating vortex rings */}
        <ellipse className="frg-aura" cx="24" cy="24" rx="24" ry="23" fill="url(#frg-aura)" />
        <ellipse className="frg-auraB" cx="29" cy="27" rx="13" ry="12" fill="url(#frg-auraB)" />
        <ellipse
          className="frg-ring"
          cx="24" cy="24" rx="21" ry="20.4"
          fill="none" stroke={C.acid} strokeWidth="0.4" strokeDasharray="3 5" opacity="0.3"
        />
        <ellipse
          className="frg-ring frg-ringB"
          cx="24" cy="24" rx="16.5" ry="15.8"
          fill="none" stroke={C.mag} strokeWidth="0.4" strokeDasharray="2 4" opacity="0.3"
        />

        <g className="frg-frog">
          {/* chromatic ghost inks (acid + magenta) swimming behind the green */}
          <g className="frg-ink frg-inkB">
            {BODY.map((p, i) => <path key={`b${i}`} d={p.d} />)}
          </g>
          <g className="frg-ink frg-inkA">
            {BODY.map((p, i) => <path key={`a${i}`} d={p.d} />)}
          </g>
          {/* the meme's hand-drawn ink, verbatim; sweat scribbles drip cyan */}
          <g className="frg-ink">
            {BODY.map((p, i) => (
              <path
                key={i}
                d={p.d}
                className={p.sweat ? "frg-drop" : undefined}
                style={p.sweat ? { ["--frg-dl" as string]: p.dl } : undefined}
              />
            ))}
          </g>
          {/* hypnotic pupils: dark acid-lit sockets + 3 color-cycling
              counter-rotating spiral layers per eye */}
          {EYES.map((e, i) => (
            <circle key={`e${i}`} className="frg-socket" cx={e.cx} cy={e.cy} r={e.r} />
          ))}
          {SWIRLS.map((s, i) => (
            <path
              key={`s${i}`}
              className={`frg-swirl frg-swirl${s.a}`}
              d={s.d}
              fill="none"
              strokeWidth={0.44 - s.a * 0.07}
              strokeLinecap="round"
              style={{ filter: "url(#frg-glowF)" }}
            />
          ))}
          {/* extra neon droplets sliding down the face, rainbow-cycled */}
          {DRIPS.map((d, i) => (
            <path
              key={`d${i}`}
              className="frg-drip"
              d={d.d}
              fill={[C.acid, C.mag, C.cyan][i % 3]}
              style={{ ["--frg-dl" as string]: d.dl, filter: "url(#frg-glowF)" }}
            />
          ))}
        </g>
      </svg>
    </div>
  );
}
