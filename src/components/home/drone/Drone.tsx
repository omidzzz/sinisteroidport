"use client";

import { useEffect, useRef } from "react";
import { STYLE } from "./animations";
import {
  BAND,
  BEAM_POINTS,
  BEAM_STREAKS,
  DOME,
  EYES,
  FEET,
  GLARE_PATH,
  HEAD_PATH,
  HUES,
  INK,
  PORTHOLES,
  RIM,
  RIM_RING,
  SHOULDERS_PATH,
  STARS,
  starPath,
} from "./scene";

/**
 * PSYCHEDELIC ALIEN UFO — cute flat-cartoon saucer, acid-rave palette,
 * transparent background. A green alien peeks out of a tie-dye glass dome
 * atop a purple saucer with a rainbow porthole chase and a rainbow tractor
 * beam; the whole illustration rides a slow rainbow hue-cycle for that
 * acid-trip color drift. Decorative: pauses when scrolled out of view and
 * respects prefers-reduced-motion.
 */
export default function Drone() {
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    if (el.closest("[data-pf-host]")) return; /* host pauses via .pf-on */
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const obs = new IntersectionObserver(
      ([entry]) => el.classList.toggle("au-paused", !entry.isIntersecting),
      { threshold: 0.05 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  return (
    <div ref={wrapRef} aria-hidden="true" style={{ display: "flex", justifyContent: "center" }}>
      <style>{STYLE}</style>
      <svg
        className="au-root"
        xmlns="http://www.w3.org/2000/svg"
        viewBox="-150 -160 300 320"
        width="100%"
        style={{ overflow: "visible" }}
      >
        <defs>
          <radialGradient id="au-aura" cx="0.5" cy="0.42" r="0.6">
            <stop offset="0%" style={{ stopColor: "var(--color-acid)" }} stopOpacity="0.35" />
            <stop offset="45%" style={{ stopColor: "var(--color-accent-2)" }} stopOpacity="0.18" />
            <stop offset="100%" style={{ stopColor: "var(--color-accent-2)" }} stopOpacity="0" />
          </radialGradient>
          <linearGradient id="au-beamGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" style={{ stopColor: "var(--warn)" }} stopOpacity="0.9" />
            <stop offset="55%" style={{ stopColor: "var(--warn)" }} stopOpacity="0.35" />
            <stop offset="100%" style={{ stopColor: "var(--color-accent)" }} stopOpacity="0" />
          </linearGradient>
          <radialGradient id="au-rimGrad" cx="0.5" cy="0.35" r="0.75">
            <stop offset="0%" style={{ stopColor: "color-mix(in srgb, var(--color-accent-2) 30%, var(--color-ink))" }} />
            <stop offset="50%" style={{ stopColor: "var(--color-accent-2)" }} />
            <stop offset="100%" style={{ stopColor: "color-mix(in srgb, var(--color-accent-2) 58%, var(--color-bg))" }} />
          </radialGradient>
          <linearGradient id="au-rainbow" x1="0%" y1="0%" x2="100%" y2="0%">
            {HUES.map((h, i) => (
              <stop key={i} offset={`${(i / (HUES.length - 1)) * 100}%`} style={{ stopColor: h }} />
            ))}
          </linearGradient>
          <linearGradient id="au-domeGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" style={{ stopColor: "color-mix(in srgb, var(--color-accent-2) 16%, var(--color-ink))" }} />
            <stop offset="50%" style={{ stopColor: "color-mix(in srgb, var(--color-accent-2) 50%, var(--color-ink))" }} />
            <stop offset="100%" style={{ stopColor: "var(--warn)" }} />
          </linearGradient>
          <filter id="au-glow" x="-80%" y="-80%" width="260%" height="260%">
            <feGaussianBlur in="SourceGraphic" stdDeviation="2" result="b" />
            <feMerge>
              <feMergeNode in="b" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* background: breathing aura glow + drifting rainbow starfield */}
        <g className="au-hue-slow">
          <ellipse className="au-aura" cx="0" cy="-15" rx="150" ry="140" fill="url(#au-aura)" />
          {STARS.map((s, i) =>
            s.star ? (
              /* The positional translate lives on a wrapper <g>, NOT on the
                 animated path: the .au-spark CSS animation overrides the
                 path's transform attribute for its whole duration, so stars
                 used to snap to (0,0) the moment their animation-delay
                 expired — the single biggest CLS source on this page. */
              <g key={`st${i}`} transform={`translate(${s.x} ${s.y})`}>
                <path className="au-spark" d={starPath(s.r * 1.7)} fill={s.c}
                  style={{ ["--au-dl" as string]: s.d, ["--au-du" as string]: s.du, filter: "url(#au-glow)" }} />
              </g>
            ) : (
              <circle key={`st${i}`} className="au-twinkle" cx={s.x} cy={s.y} r={s.r} fill={s.c}
                style={{ ["--au-dl" as string]: s.d, ["--au-du" as string]: s.du }} />
            )
          )}
        </g>

        {/* rainbow tractor beam + rising energy streaks */}
        <g className="au-beam">
          <polygon points={BEAM_POINTS} fill="url(#au-beamGrad)" />
          <clipPath id="au-beamClip">
            <polygon points={BEAM_POINTS} />
          </clipPath>
          <g clipPath="url(#au-beamClip)">
            {BEAM_STREAKS.map((s, i) => (
              <rect key={`bs${i}`} className="au-streak" x={s.x - 2.4} y="80" width="4.8" height="16" rx="2.4"
                style={{ fill: "var(--color-ink)", ["--au-dl" as string]: s.delay, ["--au-du" as string]: s.dur }} opacity="0.8" />
            ))}
          </g>
        </g>

        {/* the saucer + alien — bob and hue-cycle together */}
        <g className="au-bob">
          <g className="au-hue">
            {/* feet bumps peeking from under the rim */}
            <g  style={{ stroke: INK, fill: "var(--color-accent-2)" }} strokeWidth="4">
              {FEET.map((f, i) => (
                <ellipse key={`ft${i}`} cx={f.x} cy={f.y} rx="15" ry="10" />
              ))}
            </g>

            {/* outer rim + spinning rainbow accent ring */}
            <ellipse cx="0" cy={RIM.cy} rx={RIM.rx} ry={RIM.ry} fill="url(#au-rimGrad)" style={{ stroke: INK }} strokeWidth="5" />
            <ellipse className="au-ring" cx="0" cy={RIM_RING.cy} rx={RIM_RING.rx} ry={RIM_RING.ry}
              fill="none" stroke="url(#au-rainbow)" strokeWidth="2.2" strokeDasharray="10 9" opacity="0.85" />

            {/* glass dome */}
            <ellipse cx="0" cy={DOME.cy} rx={DOME.rx} ry={DOME.ry} fill="url(#au-domeGrad)" style={{ stroke: INK }} strokeWidth="5" />

            {/* alien shoulders (static) */}
            <path d={SHOULDERS_PATH}  style={{ stroke: INK, fill: "var(--color-acid)" }} strokeWidth="4.5" />

            {/* alien head + eyes + glare — gently sways like it's dancing */}
            <g className="au-sway">
              <path d={HEAD_PATH}  style={{ stroke: INK, fill: "var(--color-acid)" }} strokeWidth="5" />
              <g className="au-blink">
                {EYES.map((e, i) => (
                  <ellipse key={`ey${i}`} cx={e.cx} cy={e.cy} rx={e.rx} ry={e.ry} style={{ fill: "color-mix(in srgb, var(--color-accent-2) 22%, var(--color-bg))" }}
                    transform={`rotate(${e.rot} ${e.cx} ${e.cy})`} />
                ))}
              </g>
              {EYES.map((e, i) => (
                <circle key={`gl${i}`} cx={e.gx} cy={e.gy} r="2.6" style={{ fill: "var(--color-ink)" }} />
              ))}
            </g>
            <path className="au-glare" d={GLARE_PATH} style={{ fill: "var(--color-ink)" }} opacity="0.5" />

            {/* deck band + rainbow porthole chase (drawn last to tuck the dome/alien in) */}
            <ellipse cx="0" cy={BAND.cy} rx={BAND.rx} ry={BAND.ry}  style={{ stroke: INK, fill: "color-mix(in srgb, var(--color-accent-2) 72%, var(--color-bg))" }} strokeWidth="5" />
            {PORTHOLES.map((p, i) => (
              <g key={`po${i}`}>
                <circle cx={p.x} cy={p.y} r="9" style={{ fill: INK }} />
                <circle className="au-port" cx={p.x} cy={p.y} r="5.5"
                  style={{ fill: p.c, ["--au-dl" as string]: p.delay, filter: "url(#au-glow)" }} />
              </g>
            ))}
          </g>
        </g>
      </svg>
    </div>
  );
}
