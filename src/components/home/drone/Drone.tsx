"use client";

import { useEffect, useRef } from "react";
import { STYLE } from "./animations";
import {
  ANT,
  BLUR,
  CORE,
  DECK,
  DOME_INNER,
  DOME_OUTER,
  FLOOR_CY,
  GIMBAL,
  HULL,
  LEGS,
  MAST,
  MOTES,
  NACELLES,
  PAD_RING2,
  PAD_RX,
  PAD_RY,
  RIM_LEDS,
  RIVETS,
  ROTOR,
  SEAMS,
  SKIRT,
  SPEC,
} from "./scene";

/* neon hues ride deck-local CSS vars (attributes can't consume var()) */
const C: Record<string, string> = {
  acid: "var(--drn-acid)",
  cyan: "var(--drn-cyan)",
  mag: "var(--drn-mag)",
};

/**
 * HOVER DRONE — isometric sci-fi saucer hovering over a scanning pad.
 * Tiered hull with clipped panel seams + rivets, rim LED strip, sensor-core
 * canopy, crown rotor with motion-blur disc, thruster nacelles, folded
 * landing struts, antenna beacon, sensor gimbal, radar sweep + scan rings
 * and drifting energy motes. Decorative, pauses when scrolled out of view.
 */
export default function Drone() {
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const obs = new IntersectionObserver(
      ([entry]) => el.classList.toggle("drn-paused", !entry.isIntersecting),
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
      className="drn-root"
      style={{ position: "relative", display: "flex", justifyContent: "center", willChange: "transform" }}
    >
      <style>{STYLE}</style>
      <svg
        xmlns="http://www.w3.org/2000/svg"
        className="drn-svg"
        viewBox="-105 -85 210 205"
        width="100%"
        style={{ pointerEvents: "none", overflow: "visible", direction: "ltr", display: "block" }}
      >
        <defs>
          <radialGradient id="drn-hullLit" cx="0.5" cy="0.32" r="0.85">
            <stop offset="0%" stopColor="#2a3d6b" />
            <stop offset="55%" stopColor="#15213c" />
            <stop offset="100%" stopColor="#0a1020" />
          </radialGradient>
          <radialGradient id="drn-skirtLit" cx="0.5" cy="0.4" r="0.9">
            <stop offset="0%" stopColor="#1b2a4a" />
            <stop offset="100%" stopColor="#0a1120" />
          </radialGradient>
          <linearGradient id="drn-glass" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="rgba(0,229,255,0.34)" />
            <stop offset="100%" stopColor="rgba(0,229,255,0.06)" />
          </linearGradient>
          <radialGradient id="drn-coreGlow">
            <stop offset="0%" stopColor="rgba(184,255,0,0.55)" />
            <stop offset="100%" stopColor="rgba(184,255,0,0)" />
          </radialGradient>
          <radialGradient id="drn-underGlow">
            <stop offset="0%" stopColor="rgba(184,255,0,0.4)" />
            <stop offset="100%" stopColor="rgba(184,255,0,0)" />
          </radialGradient>
          <radialGradient id="drn-blurDisc" cx="0.5" cy="0.5" r="0.6">
            <stop offset="0%" stopColor="rgba(200,220,255,0.28)" />
            <stop offset="70%" stopColor="rgba(184,255,0,0.14)" />
            <stop offset="100%" stopColor="rgba(184,255,0,0)" />
          </radialGradient>
          <linearGradient id="drn-magGlow">
            <stop offset="0%" stopColor="rgba(255,43,214,0.22)" />
            <stop offset="100%" stopColor="rgba(255,43,214,0)" />
          </linearGradient>
          <filter id="drn-glow" x="-80%" y="-80%" width="260%" height="260%">
            <feGaussianBlur in="SourceGraphic" stdDeviation="2" result="b1" />
            <feGaussianBlur in="SourceGraphic" stdDeviation="5" result="b2" />
            <feMerge>
              <feMergeNode in="b2" />
              <feMergeNode in="b1" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <clipPath id="drn-hullClip"><ellipse cx="0" cy={HULL.y} rx={HULL.rx} ry={HULL.ry} /></clipPath>
        </defs>

        <ellipse className="drn-breathe" cx="0" cy={FLOOR_CY - 3} rx={PAD_RX * 1.05} ry={PAD_RY * 1.05} fill="url(#drn-underGlow)" />
        <ellipse className="drn-breathe" cx="0" cy={FLOOR_CY - 2} rx={PAD_RX * 0.88} ry={PAD_RY * 0.88} fill="url(#drn-magGlow)" style={{ animationDelay: "-1.5s" }} />
        <ellipse cx="0" cy={FLOOR_CY} rx={PAD_RX * 0.5} ry={PAD_RY * 0.5} fill="rgba(0,0,0,0.42)" />

        {/* landing pad rings */}
        <ellipse cx="0" cy={FLOOR_CY} rx={PAD_RX} ry={PAD_RY} fill="none" stroke={C.cyan} strokeWidth="0.7" opacity="0.22" />
        <ellipse className="drn-scan" cx="0" cy={FLOOR_CY} rx={PAD_RX} ry={PAD_RY} fill="none" stroke={C.cyan} strokeWidth="1.2" style={{ filter: "url(#drn-glow)" }} />
        <ellipse className="drn-scan" cx="0" cy={FLOOR_CY} rx={PAD_RX} ry={PAD_RY} fill="none" stroke={C.mag} strokeWidth="0.6" style={{ animationDelay: "-1.6s", filter: "url(#drn-glow)" }} />
        <ellipse cx="0" cy={FLOOR_CY} rx={PAD_RING2.rx} ry={PAD_RING2.ry} fill="none" stroke={C.acid} strokeWidth="0.4" opacity="0.16" />

        {/* radar sweep rotating around the pad */}
        <g className="drn-sweep">
          <polygon points="0,46 12,40 34,22 20,34" fill={C.cyan} opacity="0.1" />
          <line x1="0" y1="46" x2="34" y2="22" stroke={C.cyan} strokeWidth="0.8" opacity="0.5" style={{ filter: "url(#drn-glow)" }} />
        </g>

        {/* crosshair ticks on the pad */}
        <line x1={-PAD_RX * 0.6} y1={FLOOR_CY} x2={PAD_RX * 0.6} y2={FLOOR_CY} stroke="#1d2c47" strokeWidth="0.4" opacity="0.4" />
        <line x1="0" y1={FLOOR_CY - PAD_RY * 0.5} x2="0" y2={FLOOR_CY + PAD_RY * 0.5} stroke="#1d2c47" strokeWidth="0.4" opacity="0.4" />

        {/* the saucer — bobs as one unit; nested animated groups stay
            transform-attribute-free so CSS transforms never collide */}
        <g className="drn-bob">
          {/* landing struts */}
          {LEGS.map((lg, i) => (
            <g key={`lg${i}`}>
              <line x1={lg.a[0]} y1={lg.a[1]} x2={lg.p[0]} y2={lg.p[1]} stroke="#182740" strokeWidth="1.1" />
              <ellipse cx={lg.p[0]} cy={lg.p[1]} rx="5.5" ry="2.2" fill="#0a1120" stroke="#2a3d66" strokeWidth="0.5" />
            </g>
          ))}

          {/* sensor gimbal under the hull */}
          <line x1="0" y1={GIMBAL.y0} x2="0" y2={GIMBAL.y1} stroke="#1c2b45" strokeWidth="0.8" />
          <circle cx="0" cy={GIMBAL.y1} r={GIMBAL.r} fill="#0b1424" stroke="#22385c" strokeWidth="0.6" />
          <circle cx="0" cy={GIMBAL.y1} r="1.4" fill={C.cyan} style={{ filter: "url(#drn-glow)" }} />

          {/* skirt tier + under-engine exhaust */}
          <ellipse cx="0" cy={SKIRT.y} rx={SKIRT.rx} ry={SKIRT.ry} fill="url(#drn-skirtLit)" stroke="#20304f" strokeWidth="0.6" />
          <ellipse cx="0" cy={SKIRT.y + 2} rx="18" ry="5.5" fill="rgba(0,0,0,0.5)" />
          <g className="drn-flicker">
            <ellipse cx="0" cy={SKIRT.y + 2} rx="12" ry="3.6" fill={C.acid} opacity="0.85" style={{ filter: "url(#drn-glow)" }} />
          </g>

          {/* thruster nacelles */}
          {NACELLES.map((n) => (
            <g key={`nac${n.side}`} transform={`translate(${n.x} ${n.y})`}>
              <ellipse rx={n.rx} ry={n.ry} fill="url(#drn-skirtLit)" stroke="#22385c" strokeWidth="0.6" />
              <circle className="drn-led" cx={n.side * 4} cy="0" r="1.5" fill={C.mag} style={{ ["--drn-dl" as string]: n.side > 0 ? "0.2s" : "0.5s", filter: "url(#drn-glow)" }} />
              <g className="drn-flicker">
                <ellipse cx={n.side * 9} cy="0" rx="3.4" ry="1.8" fill={C.cyan} opacity="0.6" style={{ filter: "url(#drn-glow)" }} />
              </g>
            </g>
          ))}

          {/* main hull + clipped panel seams/rivets */}
          <ellipse cx="0" cy={HULL.y} rx={HULL.rx} ry={HULL.ry} fill="url(#drn-hullLit)" stroke="#2a3d66" strokeWidth="0.8" />
          <g clipPath="url(#drn-hullClip)">
            {SEAMS.map((d, i) => <path key={`sm${i}`} d={d} fill="none" stroke="#2b3c5c" strokeWidth="0.6" opacity="0.4" />)}
            <path d={SPEC} fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth="0.8" />
            <ellipse cx="0" cy={HULL.y} rx={HULL.rx * 0.45} ry={HULL.ry * 0.45} fill="rgba(255,255,255,0.045)" />
          </g>
          {/* rim light */}
          <ellipse cx="0" cy={HULL.y} rx={HULL.rx} ry={HULL.ry} fill="none" stroke={C.cyan} strokeWidth="1.4" opacity="0.5" style={{ filter: "url(#drn-glow)" }} />
          {/* rim LED strip */}
          {RIM_LEDS.map((l, i) => (
            <circle key={`rm${i}`} className="drn-led" cx={l.x} cy={l.y} r="1.3" fill={C[l.c]} style={{ ["--drn-dl" as string]: l.delay, filter: "url(#drn-glow)" }} />
          ))}

          {/* upper deck + rivets */}
          <ellipse cx="0" cy={DECK.y} rx={DECK.rx} ry={DECK.ry} fill="url(#drn-hullLit)" stroke="#20304f" strokeWidth="0.6" />
          {RIVETS.map((rv, i) => <circle key={`rv${i}`} cx={rv.x} cy={rv.y} r="0.85" fill="#3a5178" opacity="0.8" />)}

          {/* antenna boom + beacon */}
          <line x1={ANT.x0} y1={ANT.y0} x2={ANT.x1} y2={ANT.y1} stroke="#1c2b45" strokeWidth="0.7" />
          <circle className="drn-beacon" cx={ANT.x1} cy={ANT.y1} r="1.4" fill={C.mag} style={{ filter: "url(#drn-glow)" }} />

          {/* canopy over the sensor core */}
          <ellipse cx="0" cy={DOME_OUTER.y} rx={DOME_OUTER.rx} ry={DOME_OUTER.ry} fill="url(#drn-glass)" stroke="rgba(0,229,255,0.4)" strokeWidth="0.7" style={{ filter: "url(#drn-glow)" }} />
          <ellipse cx="0" cy={DOME_OUTER.y + 3} rx={DOME_OUTER.rx * 0.4} ry={DOME_OUTER.ry * 0.5} fill="rgba(255,255,255,0.07)" />
          <ellipse cx="0" cy={DOME_INNER.y} rx={DOME_INNER.rx} ry={DOME_INNER.ry} fill="rgba(0,40,70,0.5)" />
          <circle className="drn-core" cx={CORE.x} cy={CORE.y} r={CORE.r * 3.4} fill="url(#drn-coreGlow)" />
          <circle cx={CORE.x} cy={CORE.y} r={CORE.r} fill={C.acid} style={{ filter: "url(#drn-glow)" }} />

          {/* rotor assembly on the crown */}
          <line x1="0" y1={MAST.y0} x2="0" y2={MAST.y1} stroke="#1c2b45" strokeWidth="1.4" />
          <ellipse cx="0" cy={BLUR.y} rx={BLUR.rx} ry={BLUR.ry} fill="url(#drn-blurDisc)" />
          <g transform={`translate(0 ${ROTOR.y})`}>
            <g className="drn-rotor">
              {Array.from({ length: 4 }, (_, i) => (
                <g key={`bd${i}`} transform={`rotate(${i * 90})`}>
                  <path d={`M ${-ROTOR.r},0 L ${-ROTOR.r * 0.35},0`} fill="none" stroke="rgba(200,220,255,0.7)" strokeWidth="2.4" strokeLinecap="round" />
                  <path d={`M ${-ROTOR.r},0 L ${-ROTOR.r * 0.35},0`} fill="none" stroke={C.acid} strokeWidth="0.7" strokeLinecap="round" opacity="0.6" style={{ filter: "url(#drn-glow)" }} />
                </g>
              ))}
            </g>
            <ellipse cx="0" cy={ROTOR.hubY - ROTOR.y} rx="6" ry="4" fill="url(#drn-skirtLit)" stroke="#2a3d66" strokeWidth="0.6" />
            <circle className="drn-beacon" cx="0" cy={ROTOR.hubY - ROTOR.y - 1} r="1.3" fill={C.acid} style={{ filter: "url(#drn-glow)", animationDelay: "-0.3s" }} />
          </g>
        </g>

        {/* drifting energy motes around the saucer */}
        {MOTES.map((m, i) => (
          <circle key={`mt${i}`} className="drn-mote" cx={m.x} cy={m.y} r={m.r} fill={C[m.c]} style={{ ["--drn-dl" as string]: m.d, ["--drn-du" as string]: m.du, filter: "url(#drn-glow)" }} />
        ))}
      </svg>
    </div>
  );
}