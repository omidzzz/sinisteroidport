"use client";

import { useEffect, useRef } from "react";
import { STYLE } from "./animations";
import {
  BACK,
  band,
  BLOOM,
  BUDS,
  CALLOUTS,
  HELIX_A,
  HELIX_B,
  HELIX_RUNGS,
  LEAVES,
  LED_STRIP,
  P,
  PLAQUE,
  PLINTH,
  POT_BOT,
  POT_FRONT,
  POT_TOP,
  PROBE,
  PROBE_PATH,
  RETICLE,
  RINGS,
  RIVETS,
  ROOT_TIPS,
  ROOTS,
  SCAN,
  SCAN_DIST,
  SOIL,
  SPECK,
  SPORES,
  SPROUT,
  STEM_PATH,
  TICKS,
} from "./geometry";

/* neon hues ride deck-local CSS vars (attributes can't consume var()) */
const C: Record<string, string> = {
  acid: "var(--plt-acid)",
  cyan: "var(--plt-cyan)",
  mag: "var(--plt-mag)",
};

/**
 * NEON PLANT mk.II — potted bioluminescent flora (`BIO // 303`), advanced-
 * scanner pass. A dark plinth and greebled frustum pot (rivets, chase-lit
 * LED strip, denser glowing roots) hold an S-curved stalk with veined
 * leaves, two mini-buds, a magenta bloom, and a double-helix tendril with
 * traveling data beads. A corner reticle frames the specimen, leader-line
 * callouts annotate it, a ruler runs beside the scan line, and a micro-
 * scanner probe orbits the whole thing. Same acid/cyan/magenta palette
 * throughout. Decorative, pauses (CSS + SMIL) when scrolled out of view.
 */
export default function Plant() {
  const wrapRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    const el = wrapRef.current;
    const svg = svgRef.current;
    if (!el) return;
    if (el.closest("[data-pf-host]")) return; /* host pauses via .pf-on */
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      svg?.pauseAnimations?.();
      return;
    }
    const obs = new IntersectionObserver(
      ([entry]) => {
        el.classList.toggle("plt-paused", !entry.isIntersecting);
        if (entry.isIntersecting) svg?.unpauseAnimations?.();
        else svg?.pauseAnimations?.();
      },
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
      className="plt-root"
      style={{ position: "relative", display: "flex", justifyContent: "center", willChange: "transform" }}
    >
      <style>{STYLE}</style>
      <svg
        ref={svgRef}
        xmlns="http://www.w3.org/2000/svg"
        className="plt-svg"
        viewBox="-120 -165 240 260"
        width="100%"
        style={{ pointerEvents: "none", overflow: "visible", direction: "ltr", display: "block" }}
      >
        <defs>
          <radialGradient id="plt-acidGlow">
            <stop offset="0%" stopColor="rgba(184,255,0,0.32)" />
            <stop offset="100%" stopColor="rgba(184,255,0,0)" />
          </radialGradient>
          <radialGradient id="plt-magGlow">
            <stop offset="0%" stopColor="rgba(255,43,214,0.3)" />
            <stop offset="100%" stopColor="rgba(255,43,214,0)" />
          </radialGradient>
          <radialGradient id="plt-cyanGlow">
            <stop offset="0%" stopColor="rgba(0,229,255,0.28)" />
            <stop offset="100%" stopColor="rgba(0,229,255,0)" />
          </radialGradient>
          <linearGradient id="plt-pot" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#141d33" />
            <stop offset="100%" stopColor="#080b18" />
          </linearGradient>
          <filter id="plt-glow" x="-70%" y="-70%" width="240%" height="240%">
            <feGaussianBlur in="SourceGraphic" stdDeviation="2" result="b1" />
            <feGaussianBlur in="SourceGraphic" stdDeviation="5" result="b2" />
            <feMerge>
              <feMergeNode in="b2" />
              <feMergeNode in="b1" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        <ellipse className="plt-breath" cx={PLINTH.cx} cy={PLINTH.cy + 22} rx={PLINTH.rx * 1.25} ry={PLINTH.ry * 1.3} fill="url(#plt-acidGlow)" />
        <ellipse className="plt-breath" cx={PLINTH.cx} cy={PLINTH.cy + 20} rx={PLINTH.rx * 1.05} ry={PLINTH.ry * 1.12} fill="url(#plt-cyanGlow)" style={{ animationDelay: "-2s" }} />

        {/* plinth slab */}
        <ellipse cx={PLINTH.cx} cy={PLINTH.cy + 4} rx={PLINTH.rx} ry={PLINTH.ry} fill="#060a14" stroke="#1a2740" strokeWidth="0.8" />
        <ellipse cx={PLINTH.cx} cy={PLINTH.cy + 4} rx={PLINTH.rx} ry={PLINTH.ry} fill="none" stroke={C.acid} strokeWidth="0.5" opacity="0.2" />
        <circle className="plt-pulse" cx={PLINTH.cx + 26} cy={PLINTH.cy + 26} r="4" fill={C.acid} style={{ filter: "url(#plt-glow)" }} />
        <circle className="plt-pulse" cx={PLINTH.cx - 30} cy={PLINTH.cy + 30} r="3" fill={C.cyan} style={{ filter: "url(#plt-glow)", animationDelay: "-1.1s" }} />

        {/* pot back faces */}
        {BACK.map((s, i) => <polygon key={`b${i}`} points={P(s.q)} fill="#070b18" stroke="#1a2740" strokeWidth="0.6" />)}
        {/* pot body */}
        {POT_FRONT.map((s, i) => <polygon key={`f${i}`} points={P(s.q)} fill="url(#plt-pot)" stroke="#223252" strokeWidth="0.8" />)}
        {/* rivets down each front face's leading edge */}
        {RIVETS.map((p, i) => <circle key={`rv${i}`} cx={p[0]} cy={p[1]} r="0.8" fill="#2a3a54" opacity="0.85" />)}
        {/* neon bands (acid top, thin cyan lower) */}
        {POT_FRONT.map((s) => (
          <polygon key={`bandA${s.face}`} points={P(band(19, 25)(s.face))} fill="none" stroke={C.acid} strokeWidth="0.7" style={{ filter: "url(#plt-glow)" }} />
        ))}
        {POT_FRONT.map((s) => (
          <polygon key={`bandC${s.face}`} points={P(band(6, 8)(s.face))} fill="none" stroke={C.cyan} strokeWidth="0.5" opacity="0.5" />
        ))}
        {/* status-LED strip, chase-lit */}
        {LED_STRIP.map((l, i) => (
          <circle key={`led${i}`} className="plt-led" cx={l.x} cy={l.y} r="1" fill={C[l.c]} style={{ ["--plt-dl" as string]: l.delay, filter: "url(#plt-glow)" }} />
        ))}
        {/* pot top rim */}
        <polygon points={P(POT_TOP)} fill="none" stroke={C.cyan} strokeWidth="0.7" opacity="0.35" />
        {/* soil + specks */}
        <ellipse cx={SOIL.cx} cy={SOIL.cy} rx={SOIL.rx} ry={SOIL.ry} fill="#0a1220" />
        {SPECK.map((s, i) => <circle key={`sp${i}`} cx={SOIL.cx + s.x} cy={SOIL.cy + s.y} r={s.r} fill="#16202f" />)}
        {/* denser glowing root network in the soil */}
        {ROOTS.map((r, i) => (
          <path key={`rt${i}`} d={r.d} fill="none" stroke={C[r.c]} strokeWidth={r.w} opacity={r.o} style={{ filter: "url(#plt-glow)" }} />
        ))}
        {ROOT_TIPS.map((t, i) => (
          <circle key={`rtp${i}`} className="plt-pulse" cx={t.x} cy={t.y} r="0.7" fill={C[t.c]} style={{ filter: "url(#plt-glow)", animationDelay: `${-i * 0.4}s` }} />
        ))}

        {/* ---------- flora ---------- */}
        <g>
          {/* aura behind the whole plant */}
          <ellipse className="plt-breath" cx={0} cy={-66} rx={58} ry={96} fill="url(#plt-cyanGlow)" />
          <ellipse className="plt-breath" cx={0} cy={-66} rx={48} ry={84} fill="url(#plt-magGlow)" style={{ animationDelay: "-3s" }} />

          {/* double-helix tendril with cross-rungs + traveling data beads */}
          <path d={HELIX_A} fill="none" stroke={C.cyan} strokeWidth="1" opacity="0.7" style={{ filter: "url(#plt-glow)" }} />
          <path d={HELIX_B} fill="none" stroke={C.acid} strokeWidth="1" opacity="0.7" style={{ filter: "url(#plt-glow)" }} />
          {HELIX_RUNGS.map((r, i) => (
            <line key={`hr${i}`} x1={r.x1} y1={r.y1} x2={r.x2} y2={r.y2} stroke={C.mag} strokeWidth="0.35" opacity="0.35" />
          ))}
          {[0, 1].map((k) => (
            <circle key={`hb${k}`} r="1.1" fill={k === 0 ? C.acid : C.cyan} style={{ filter: "url(#plt-glow)" }}>
              <animateMotion dur={`${3 + k * 0.6}s`} begin={`${k * 1.3}s`} repeatCount="indefinite" path={HELIX_A} />
            </circle>
          ))}

          {/* main stalk */}
          <path d={STEM_PATH} fill="none" stroke="#1c2b45" strokeWidth="3.4" />
          <path d={STEM_PATH} fill="none" stroke={C.acid} strokeWidth="1.1" opacity="0.85" style={{ filter: "url(#plt-glow)" }} />

          {/* leaves (nested animated group avoids transform-attribute collision) */}
          {LEAVES.map((l, i) => (
            <g key={`l${i}`} transform={`translate(${l.bx} ${l.by}) rotate(${l.rot})`}>
              <g className="plt-leaf" style={{ ["--plt-dl" as string]: `${l.dl}s` }}>
                <ellipse cx={l.w * 0.42} cy={0} rx={l.w * 0.5} ry={l.h * 0.5} fill={C[l.c]} opacity="0.8" style={{ filter: "url(#plt-glow)" }} />
                <line x1={l.w * 0.05} y1={-l.h * 0.35} x2={l.w * 0.9} y2={l.h * 0.4} stroke="#0e1a28" strokeWidth="0.7" />
                <line x1={l.w * 0.1} y1={0} x2={l.w * 0.95} y2={0} stroke={l.c === "acid" ? "#dfff55" : l.c === "cyan" ? "#7fe8ff" : "#ff7be0"} strokeWidth="0.8" opacity="0.9" />
                <line x1={l.w * 0.2} y1={-l.h * 0.1} x2={l.w * 0.7} y2={l.h * 0.14} stroke={l.c === "acid" ? "#dfff55" : l.c === "cyan" ? "#7fe8ff" : "#ff7be0"} strokeWidth="0.4" opacity="0.5" />
              </g>
            </g>
          ))}

          {/* mini secondary buds along the stalk */}
          {BUDS.map((b, i) => (
            <g key={`bud${i}`} transform={`translate(${b.bx} ${b.by})`}>
              <g className="plt-bloom" style={{ animationDelay: `${b.dl}s` }}>
                <circle r={b.r * 1.7} fill={b.c === "cyan" ? "url(#plt-cyanGlow)" : "url(#plt-acidGlow)"} />
                {[-30, 30].map((a, k) => (
                  <g key={k} transform={`rotate(${a})`}>
                    <ellipse cx={0} cy={-b.r * 0.5} rx={b.r * 0.32} ry={b.r * 0.55} fill={C[b.c]} opacity="0.85" style={{ filter: "url(#plt-glow)" }} />
                  </g>
                ))}
                <circle r={b.r * 0.22} fill={C.mag} style={{ filter: "url(#plt-glow)" }} />
              </g>
            </g>
          ))}

          {/* base sprout */}
          <g transform={`translate(${SPROUT.bx} ${SPROUT.by})`}>
            <g className="plt-leaf" style={{ ["--plt-dl" as string]: `${SPROUT.dl}s` }}>
              <ellipse cx={5} cy={-3} rx={4.5} ry={2.4} fill={C[SPROUT.c]} opacity="0.85" style={{ filter: "url(#plt-glow)" }} />
              <ellipse cx={9} cy={-8} rx={4} ry={2} fill={C[SPROUT.c]} opacity="0.7" style={{ filter: "url(#plt-glow)" }} />
            </g>
          </g>

          {/* holo scan rings circling the specimen */}
          {RINGS.map((rt, i) => (
            <ellipse key={`r${i}`} className="plt-ring" cx={rt.cx} cy={rt.cy} rx={rt.rx} ry={rt.ry} fill="none" stroke={i === 0 ? C.cyan : C.acid} strokeWidth="0.6" style={{ ["--plt-dl" as string]: `${rt.dl}s`, filter: "url(#plt-glow)" }} />
          ))}

          {/* ruler ticks running beside the scan line's track */}
          {TICKS.map((t, i) => (
            <line key={`tk${i}`} className="plt-tick" x1={SCAN.x1 - 14} y1={t.y} x2={SCAN.x1 - 14 + (t.major ? 6 : 3)} y2={t.y} stroke={C.cyan} strokeWidth={t.major ? 0.6 : 0.4} opacity={t.major ? 0.5 : 0.3} />
          ))}

          {/* vertical scan line sweeping the specimen */}
          <g className="plt-scanline" style={{ ["--plt-scan-dist" as string]: SCAN_DIST }}>
            <line x1={SCAN.x1} y1={SCAN.y0} x2={SCAN.x2} y2={SCAN.y0} stroke={C.cyan} strokeWidth="0.7" style={{ filter: "url(#plt-glow)" }} />
          </g>

          {/* bloom at the top */}
          <g transform={`translate(${BLOOM.x} ${BLOOM.y})`}>
            <circle className="plt-bloom" cx={0} cy={0} r={BLOOM.r * 1.9} fill="url(#plt-magGlow)" />
            {[-60, -20, 20, 60].map((a, i) => (
              <g key={`p${i}`} transform={`rotate(${a})`}>
                <g className="plt-bloom">
                  <ellipse cx={0} cy={-BLOOM.r * 0.55} rx={BLOOM.r * 0.34} ry={BLOOM.r * 0.62} fill={C.mag} opacity="0.88" style={{ filter: "url(#plt-glow)" }} />
                </g>
              </g>
            ))}
            <circle className="plt-pulse" cx={0} cy={0} r={BLOOM.r * 0.28} fill={C.acid} style={{ filter: "url(#plt-glow)" }} />
          </g>
        </g>

        {/* corner reticle brackets framing the specimen */}
        {RETICLE.map((r, i) => (
          <g key={`ret${i}`} className="plt-reticle" transform={`translate(${r.x} ${r.y}) scale(${r.sx} ${r.sy})`} style={{ animationDelay: `${i * 0.2}s` }}>
            <path d="M 0,12 L 0,0 L 12,0" fill="none" stroke={C.cyan} strokeWidth="1" style={{ filter: "url(#plt-glow)" }} />
          </g>
        ))}

        {/* leader-line annotation callouts */}
        {CALLOUTS.map((co, i) => (
          <g key={`co${i}`} className="plt-callout" style={{ animationDelay: `${i * 0.6}s` }}>
            <circle cx={co.mx} cy={co.my} r="1.3" fill={C[co.c]} style={{ filter: "url(#plt-glow)" }} />
            <line x1={co.mx} y1={co.my} x2={co.lx} y2={co.ly} stroke={C[co.c]} strokeWidth="0.4" opacity="0.45" />
            <text x={co.lx + (co.anchor === "end" ? -2 : 2)} y={co.ly + 1.2} fontSize="4" textAnchor={co.anchor} fill="#8fa294" fontFamily="var(--font-mono), monospace">{co.label}</text>
          </g>
        ))}

        {/* micro-scanner probe orbiting the specimen */}
        <g>
          <path d="M 0,-3 L 2.6,0 L 0,3 L -2.6,0 Z" fill="#0a1120" stroke={C.cyan} strokeWidth="0.6" style={{ filter: "url(#plt-glow)" }} />
          <circle className="plt-plaque" r="0.8" fill={C.acid} style={{ filter: "url(#plt-glow)" }} />
          <animateMotion dur={PROBE.dur} repeatCount="indefinite" path={PROBE_PATH} rotate="auto" />
        </g>

        {/* plaque on the pot front */}
        <rect x={PLAQUE.x - 14} y={PLAQUE.y - 3.4} width="28" height="6.8" rx="1.6" fill="#0a1120" stroke="#223252" strokeWidth="0.6" />
        <text x={PLAQUE.x} y={PLAQUE.y + 1.2} fontSize="3.5" textAnchor="middle" fill="#8fa294" fontFamily="var(--font-mono), monospace">BIO//303</text>
        <circle className="plt-plaque" cx={PLAQUE.x + 18} cy={PLAQUE.y} r="1.3" fill={C.acid} style={{ filter: "url(#plt-glow)" }} />
        {/* tiny growth-level bar graph beneath the plaque */}
        {Array.from({ length: 5 }, (_, i) => (
          <rect key={`bg${i}`} x={PLAQUE.x - 13 + i * 2.4} y={PLAQUE.y + 4.6} width="1.7" height="1.6" fill={i < 4 ? C.acid : "#223252"} opacity={i < 4 ? 0.9 : 0.6} />
        ))}

        {/* spores drifting up around the flora */}
        {SPORES.map((sr, i) => (
          <circle key={`sr${i}`} className="plt-spore" cx={sr.x} cy={sr.y} r={sr.r} fill={C[sr.c]} style={{ ["--plt-dl" as string]: `${sr.d}s`, filter: "url(#plt-glow)" }} />
        ))}
      </svg>
    </div>
  );
}
