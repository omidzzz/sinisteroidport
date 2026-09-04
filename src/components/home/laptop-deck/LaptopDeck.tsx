/*
 * LAPTOP DECK - isometric cyberpunk acid-rave neon terminal.
 * The screen runs a loop of commands (npm run dev -> npm test ->
 * git push origin main). True 2:1 isometric projection (SVG matrix).
 * Keys press + neon-strobe in sync with the per-character typing on screen.
 * The sequence loops forever: type -> run -> backspace -> next command.
 * Decorative, aria-hidden. Pauses when scrolled out of view; tilts subtly
 * on hover (fine pointers only).
 *
 * This component is the SVG render. The math/data layers live alongside it:
 *   timing.ts      command-sequence timing engine (pure)
 *   keyboard.ts    keycap layout (pure)
 *   scene.ts       isometric projection + scene constants (pure)
 *   animations.ts  generated keyframes/<style> payload (pure)
 */
"use client";

import { useEffect, useRef } from "react";
import { STYLE } from "./animations";
import { ROWS } from "./keyboard";
import { CH_X0, COMMANDS, CW, CYCLES, PRESSED } from "./timing";
import {
  A,
  B,
  C,
  CHAR_COLORS,
  DIAMONDS,
  Dp,
  EQ_FILL,
  GRID_X,
  GRID_Y,
  iso,
  MAT_DECK,
  MAT_SCREEN,
  P,
  PARTICLES,
  SCREEN_H,
  TH_,
} from "./scene";

/* per-command terminal output lines (screen text) */
const OUTPUTS: { text: string; y: number; size: number; color: string }[][] = [
  [
    { text: "ready - sinisteroid@dev", y: 88, size: 6, color: "#36e5a0" },
    { text: "Local: http://localhost:3000", y: 100, size: 5.5, color: "#8fa294" },
    { text: "watching for file changes...", y: 114, size: 5.5, color: "#8fa294" },
  ],
  [
    { text: "running test suite...", y: 88, size: 6, color: "#36e5a0" },
    { text: "✓ 24 passing (2.1s)", y: 100, size: 5.5, color: "var(--lp-acid)" },
    { text: "0 failing · 0 skipped", y: 114, size: 5.5, color: "#8fa294" },
  ],
  [
    { text: "pushing main → origin...", y: 88, size: 6, color: "#36e5a0" },
    { text: "✓ deployed", y: 100, size: 5.5, color: "var(--lp-acid)" },
    { text: "live at sinisteroid.dev", y: 114, size: 5.5, color: "#8fa294" },
  ],
];

export default function LaptopDeck() {
  const wrapRef = useRef<HTMLDivElement>(null);

  /* pause every animation while the bay is scrolled out of view (A3) */
  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const obs = new IntersectionObserver(
      ([entry]) => el.classList.toggle("lp-paused", !entry.isIntersecting),
      { threshold: 0.05 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  /* subtle hover parallax tilt (C2) — fine-pointer devices only */
  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    if (window.matchMedia("(pointer: coarse)").matches) return;
    let raf = 0;
    const onMove = (e: PointerEvent) => {
      const r = el.getBoundingClientRect();
      const nx = (e.clientX - r.left) / r.width - 0.5;
      const ny = (e.clientY - r.top) / r.height - 0.5;
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        el.style.transform = `perspective(900px) rotateY(${(nx * 6).toFixed(2)}deg) rotateX(${(-ny * 5).toFixed(2)}deg)`;
      });
    };
    const onLeave = () => {
      cancelAnimationFrame(raf);
      el.style.transform = "";
    };
    el.addEventListener("pointermove", onMove);
    el.addEventListener("pointerleave", onLeave);
    return () => {
      cancelAnimationFrame(raf);
      el.removeEventListener("pointermove", onMove);
      el.removeEventListener("pointerleave", onLeave);
      el.style.transform = "";
    };
  }, []);

  return (
    <div
      ref={wrapRef}
      dir="ltr"
      aria-hidden="true"
      className="lp-root"
      style={{ display: "flex", justifyContent: "center", padding: "1rem 0 0.5rem", willChange: "transform" }}
    >
      <style>{STYLE}</style>
      <svg
        className="lp-svg"
        viewBox="-30 -36 395 376"
        width="100%"
        role="img"
        aria-label="isometric neon laptop typing npm run dev"
        style={{ pointerEvents: "none", overflow: "visible", direction: "ltr" }}
      >
        <defs>
          <linearGradient id="lg-body" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#212b4e" /><stop offset="100%" stopColor="#0d1426" />
          </linearGradient>
          <linearGradient id="lg-sideF" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#111a32" /><stop offset="100%" stopColor="#080d1a" />
          </linearGradient>
          <linearGradient id="lg-sideL" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#0b1122" /><stop offset="100%" stopColor="#05080f" />
          </linearGradient>
          <linearGradient id="lg-sideR" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#161f38" /><stop offset="100%" stopColor="#0a101d" />
          </linearGradient>
          <linearGradient id="lg-sideB" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#0e1425" /><stop offset="100%" stopColor="#070b15" />
          </linearGradient>
          <linearGradient id="lg-lid" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#182240" /><stop offset="100%" stopColor="#0b1226" />
          </linearGradient>
          <linearGradient id="lg-glass" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="rgba(255,255,255,0.08)" /><stop offset="100%" stopColor="rgba(255,255,255,0)" />
          </linearGradient>
          <linearGradient id="lg-spill" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="rgba(184,255,0,0.16)" /><stop offset="100%" stopColor="rgba(184,255,0,0)" />
          </linearGradient>
          <radialGradient id="rp-magenta">
            <stop offset="0%" stopColor="rgba(255,43,214,0.26)" /><stop offset="100%" stopColor="rgba(255,43,214,0)" />
          </radialGradient>
          <radialGradient id="rh-violet">
            <stop offset="0%" stopColor="rgba(124,58,255,0.13)" /><stop offset="100%" stopColor="rgba(124,58,255,0)" />
          </radialGradient>
          <radialGradient id="rh-magenta">
            <stop offset="0%" stopColor="rgba(255,43,214,0.09)" /><stop offset="100%" stopColor="rgba(255,43,214,0)" />
          </radialGradient>
          <radialGradient id="rh-cyan">
            <stop offset="0%" stopColor="rgba(0,229,255,0.09)" /><stop offset="100%" stopColor="rgba(0,229,255,0)" />
          </radialGradient>
          <pattern id="lp-scan" width="4" height="3.2" patternUnits="userSpaceOnUse">
            <rect width="4" height="1.1" fill="rgba(0,0,0,0.42)" />
          </pattern>
          {/* Screen clip path to prevent text overflow */}
          <clipPath id="lp-screen-clip">
            <rect x="14" y="12" width="162" height={SCREEN_H - 24} rx="2" />
          </clipPath>
          <filter id="lf-glow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur in="SourceGraphic" stdDeviation="2" result="blur1" />
            <feGaussianBlur in="SourceGraphic" stdDeviation="4" result="blur2" />
            <feMerge>
              <feMergeNode in="blur2" />
              <feMergeNode in="blur1" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <filter id="lf-glow2" x="-80%" y="-80%" width="260%" height="260%">
            <feGaussianBlur in="SourceGraphic" stdDeviation="6" result="blur1" />
            <feGaussianBlur in="SourceGraphic" stdDeviation="12" result="blur2" />
            <feMerge>
              <feMergeNode in="blur2" />
              <feMergeNode in="blur1" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <filter id="lf-bloom" x="-100%" y="-100%" width="300%" height="300%">
            <feGaussianBlur in="SourceGraphic" stdDeviation="8" result="blur" />
            <feColorMatrix in="blur" type="saturate" values="2" result="saturated" />
            <feMerge>
              <feMergeNode in="saturated" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          {/* floor reflection (B1): blurred, faded acid mirror below the chassis */}
          <filter id="lf-rblur" x="-20%" y="-40%" width="140%" height="180%">
            <feGaussianBlur stdDeviation="1.6" />
          </filter>
          <clipPath id="lp-reflect-clip">
            <rect x="-30" y="307" width="395" height="33" />
          </clipPath>
          <linearGradient id="lg-reflect" gradientUnits="userSpaceOnUse" x1="0" y1="308" x2="0" y2="-22">
            <stop offset="0%" stopColor="#b8ff00" stopOpacity="0.34" />
            <stop offset="55%" stopColor="#b8ff00" stopOpacity="0.1" />
            <stop offset="100%" stopColor="#b8ff00" stopOpacity="0" />
          </linearGradient>
        </defs>

        {/* ambient haze */}
        <circle className="lp-hz" cx="95" cy="130" r="95" fill="url(#rh-violet)" />
        <circle className="lp-hz" style={{ animationDelay: "-2.4s" }} cx="288" cy="185" r="105" fill="url(#rh-magenta)" />
        <circle className="lp-hz" style={{ animationDelay: "-4.8s" }} cx="255" cy="58" r="75" fill="url(#rh-cyan)" />

        {/* isometric floor grid */}
        <g stroke="#2a3a5c" strokeWidth="0.7" opacity="0.16">
          {GRID_Y.map((s, i) => <line key={`gy${i}`} x1={s[0][0]} y1={s[0][1]} x2={s[1][0]} y2={s[1][1]} />)}
          {GRID_X.map((s, i) => <line key={`gx${i}`} x1={s[0][0]} y1={s[0][1]} x2={s[1][0]} y2={s[1][1]} />)}
        </g>
        {/* acid grid square under the rig */}
        <polygon points={P([iso(-15, -15), iso(205, -15), iso(205, 155), iso(-15, 155)])}
          fill="none" stroke="#b8ff00" strokeWidth="1" opacity="0.22" style={{ filter: "url(#lf-glow)" }} />

        {/* magenta floor pool only â€” no acid/green glow under the chassis */}
        <ellipse className="lp-st1" cx="163" cy="298" rx="112" ry="21" fill="url(#rp-magenta)" />

        {/* mirrored acid reflection of the rig below the front edge (B1) */}
        <g clipPath="url(#lp-reflect-clip)" opacity="0.55" filter="url(#lf-rblur)">
          <g transform={`translate(0 ${(1.62 * 308).toFixed(1)}) scale(1 -0.62)`}>
            <polygon points={P([A, B, Dp, C])} fill="url(#lg-reflect)" />
            <polygon points={P([[150, -22], [314.5, 73], [314.5, 231], [150, 136]])} fill="url(#lg-reflect)" />
          </g>
        </g>

        {/* ===== screen (rises from the deck's back edge) ===== */}
        <polygon points={P([[150, -22], [314.5, 73], [314.5, 231], [150, 136]])}
          fill="#b8ff00" opacity="0.1" style={{ filter: "url(#lf-glow2)" }} />
        <g transform={MAT_SCREEN}>
          {/* lid + bezel */}
          <rect x="0" y="0" width="190" height={SCREEN_H} rx="6" fill="url(#lg-lid)" stroke="#2a3f65" strokeWidth="1.2" />
          <rect x="7" y="7" width="176" height={SCREEN_H - 14} rx="3" fill="#04060e" />
          {/* screen flicker overlay */}
          <rect x="7" y="7" width="176" height={SCREEN_H - 14} rx="3" fill="rgba(184,255,0,0.02)" className="lp-screen-flicker" />
          {/* screen-wide flash on Enter (B2) */}
          <rect x="7" y="7" width="176" height={SCREEN_H - 14} rx="3"
            style={{ fill: "var(--lp-acid)", opacity: 0, animation: `lp-flash ${CYCLES}` }} />

          {/* titlebar */}
          <circle cx="15" cy="17" r="1.8" fill="#ff2bd6" />
          <circle cx="22" cy="17" r="1.8" fill="#b8ff00" />
          <circle cx="29" cy="17" r="1.8" fill="#00e5ff" />
          <text x="38" y="19.5" fontSize="5.5" fill="#7f93b8" fontFamily="var(--font-mono), monospace">~/sinisteroid</text>

          {/* typing prompt â€” per-character <text> reveal, synced with the key flashes */}
          <g clipPath="url(#lp-screen-clip)">
            <g style={{ filter: "url(#lf-glow)" }}>
              <text x="24" y="54" fontSize="8" fontFamily="var(--font-mono), monospace"
                style={{ fill: "var(--lp-cyan)", filter: "drop-shadow(0 0 2px var(--lp-cyan))" }}>$</text>
              {COMMANDS.map((cmd, ci) =>
                cmd.chars.map((ch, i) =>
                  ch === " " ? null : (
                    <text key={`${ci}-${i}`} className="lp-ch" x={CH_X0 + i * CW} y="54" fontSize="8"
                      textLength={CW} lengthAdjust="spacingAndGlyphs"
                      fontFamily="var(--font-mono), monospace"
                      style={{
                        fill: CHAR_COLORS[i % 3],
                        animation: `lp-c${ci}-${i} ${CYCLES}`,
                        filter: `drop-shadow(0 0 2px ${CHAR_COLORS[i % 3]})`,
                      }}>{ch}</text>
                  )
                )
              )}
              {/* cursor blinks and steps along the line as characters land */}
              <rect className="lp-cur-el" x={CH_X0 - 2} y={46.5} width="3" height="9"
                style={{
                  fill: "var(--lp-acid)",
                  animation: `lp-cur ${CYCLES}, lp-curstep ${CYCLES}`,
                  filter: "drop-shadow(0 0 2px var(--lp-acid))",
                }} />
            </g>
          </g>

          {/* per-command run output */}
          {COMMANDS.map((cmd, ci) => (
            <g key={`out${ci}`} clipPath="url(#lp-screen-clip)">
              <g className="lp-ch" style={{ animation: `lp-run${ci} ${CYCLES}` }}>
                {OUTPUTS[ci].map((o) => (
                  <text key={o.text} x="24" y={o.y} fontSize={o.size}
                    fontFamily="var(--font-mono), monospace"
                    style={{ fill: o.color, filter: `drop-shadow(0 0 2px ${o.color})` }}>{o.text}</text>
                ))}
              </g>
            </g>
          ))}

          {/* equalizer bars dance while the server runs */}
          <g clipPath="url(#lp-screen-clip)">
            <g style={{ animation: `lp-eqshow ${CYCLES}` }}>
              {EQ_FILL.map((f, i) => (
                <g key={i} style={{ filter: `drop-shadow(0 0 2px ${f})` }}>
                  <rect className="lp-eq" x={138 + i * 8} y={86} width="3.5" height="14"
                    opacity="0.9" style={{ fill: f, animation: `lp-eq${i} ${CYCLES}` }} />
                </g>
              ))}
            </g>
          </g>

          {/* scanlines + glass sheen */}
          <rect x="7" y="7" width="176" height={SCREEN_H - 14} fill="url(#lp-scan)" opacity="0.5" />
          <path d="M7,7 L128,7 L86,64 L7,64 Z" fill="url(#lg-glass)" />

          {/* webcam + brand */}
          <circle cx="95" cy="3.6" r="1.8" fill="#0a1520" stroke="#2a3f65" strokeWidth="0.5" />
          <circle cx="95" cy="3.6" r="0.6" fill="#b8ff00" opacity="0.8" />
          <text x="95" y={SCREEN_H - 2} fontSize="4.6" letterSpacing="2.5" textAnchor="middle" fill="#5a6a88" fontFamily="var(--font-mono), monospace">SINISTEROID</text>

          {/* neon screen edges â€” multi-layer glow */}
          <line x1="1" y1="1" x2="1" y2={SCREEN_H - 1} stroke="#b8ff00" strokeWidth="1.5" opacity="0.8" style={{ filter: "url(#lf-glow)" }} />
          <line x1="189" y1="1" x2="189" y2={SCREEN_H - 1} stroke="#ff2bd6" strokeWidth="1.5" opacity="0.7" style={{ filter: "url(#lf-glow)" }} />
          <line x1="1" y1="0.8" x2="189" y2="0.8" stroke="#00e5ff" strokeWidth="1" opacity="0.6" style={{ filter: "url(#lf-glow)" }} />
          <line x1="1" y1={SCREEN_H - 0.8} x2="189" y2={SCREEN_H - 0.8} stroke="#b8ff00" strokeWidth="0.8" opacity="0.5" style={{ filter: "url(#lf-glow)" }} />
          <rect x="0.6" y="0.6" width="188.8" height={SCREEN_H - 1.2} rx="6" fill="none" stroke="#b8ff00" strokeWidth="0.7" opacity="0.4" style={{ filter: "url(#lf-glow)" }} />
        </g>

        {/* ===== chassis ===== */}
        {/* left wall */}
        <polygon points={P([A, C, [C[0], C[1] + TH_], [A[0], A[1] + TH_]])}
          fill="url(#lg-sideL)" stroke="#1a2438" strokeWidth="0.8" />
        {/* front wall */}
        <polygon points={P([C, Dp, [Dp[0], Dp[1] + TH_], [C[0], C[1] + TH_]])}
          fill="url(#lg-sideF)" stroke="#1a2438" strokeWidth="0.8" />
        {/* vents on the front wall */}
        {[28, 66, 104, 142].map(x => {
          const q = [iso(x, 140.6), iso(x + 9, 140.6)] as [number, number][];
          q.push([iso(x + 9, 140.6)[0], iso(x + 9, 140.6)[1] + 4.5]);
          q.push([iso(x, 140.6)[0], iso(x, 140.6)[1] + 4.5]);
          return <polygon key={x} points={P(q)} fill="#04070d" />;
        })}
        {/* right wall â€” closes the hollow right side of the casing */}
        <polygon points={P([B, Dp, [Dp[0], Dp[1] + TH_], [B[0], B[1] + TH_]])}
          fill="url(#lg-sideR)" stroke="#1a2438" strokeWidth="0.8" />
        {/* vents on the right wall */}
        {[22, 75, 105, 130].map(y => {
          const q = [iso(189.6, y), iso(189.6, y + 9)] as [number, number][];
          q.push([iso(189.6, y + 9)[0], iso(189.6, y + 9)[1] + 4.5]);
          q.push([iso(189.6, y)[0], iso(189.6, y)[1] + 4.5]);
          return <polygon key={y} points={P(q)} fill="#04070d" />;
        })}
        {/* ports on the right wall */}
        {[45, 61].map(y => {
          const p1 = iso(189.6, y), p2 = iso(189.6, y + 9);
          return (
            <polygon key={y} points={P([p1, p2, [p2[0], p2[1] + 5], [p1[0], p1[1] + 5]])}
              fill="#04070c" stroke="#00e5ff" strokeWidth="0.4" opacity="0.7" />
          );
        })}
        {/* back wall â€” closes the rear of the chassis under the hinge */}
        <polygon points={P([A, B, [B[0], B[1] + TH_], [A[0], A[1] + TH_]])}
          fill="url(#lg-sideB)" stroke="#1a2438" strokeWidth="0.8" />
        {/* ports on the left wall */}
        {[58, 74].map(y => {
          const p1 = iso(0.4, y), p2 = iso(0.4, y + 9);
          return (
            <polygon key={y} points={P([p1, p2, [p2[0], p2[1] + 5], [p1[0], p1[1] + 5]])}
              fill="#04070c" stroke="#00e5ff" strokeWidth="0.4" opacity="0.7" />
          );
        })}
        {/* glowing data cable */}
        <path
          d={`M${iso(0, 83)[0].toFixed(1)},${(iso(0, 83)[1] + 7).toFixed(1)} C ${(iso(0, 83)[0] - 26).toFixed(1)},${(iso(0, 83)[1] + 26).toFixed(1)} ${(iso(0, 110)[0] - 20).toFixed(1)},${(iso(0, 110)[1] + 50).toFixed(1)} ${(iso(0, 120)[0] - 6).toFixed(1)},${(iso(0, 120)[1] + 68).toFixed(1)}`}
          fill="none" stroke="#00e5ff" strokeWidth="2" strokeLinecap="round" opacity="0.65"
          style={{ filter: "url(#lf-glow)" }} />
        <circle cx={iso(0, 83)[0]} cy={iso(0, 83)[1] + 7} r="1.3" fill="#00e5ff" opacity="0.9" />

        {/* deck top */}
        <polygon points={P([A, B, Dp, C])} fill="url(#lg-body)" stroke="#26355a" strokeWidth="1.2" strokeLinejoin="round" />
        {/* screen light spill on the deck */}
        <g transform={MAT_DECK}><rect x="10" y="2" width="170" height="12" fill="url(#lg-spill)" /></g>
        {/* spill brightens while the dev server "runs" (B2) */}
        <g transform={MAT_DECK}>
          <rect x="10" y="2" width="170" height="12" fill="rgba(184,255,0,0.3)"
            opacity="0" style={{ animation: `lp-spill ${CYCLES}` }} />
        </g>
        {/* neon edge strips â€” front acid / left magenta, with pulsing overlays */}
        <line x1={C[0]} y1={C[1]} x2={Dp[0]} y2={Dp[1]} stroke="#b8ff00" strokeWidth="2" opacity="0.9" style={{ filter: "url(#lf-glow)" }} />
        <line className="lp-st1" x1={C[0]} y1={C[1]} x2={Dp[0]} y2={Dp[1]} stroke="#ff2bd6" strokeWidth="1.5" style={{ filter: "url(#lf-glow)" }} />
        <line x1={A[0]} y1={A[1]} x2={C[0]} y2={C[1]} stroke="#ff2bd6" strokeWidth="1.5" opacity="0.8" style={{ filter: "url(#lf-glow)" }} />
        <line className="lp-st2" x1={A[0]} y1={A[1]} x2={C[0]} y2={C[1]} stroke="#00e5ff" strokeWidth="1.2" style={{ filter: "url(#lf-glow)" }} />
        {/* bottom edge glow */}
        <line x1={C[0]} y1={C[1] + TH_} x2={Dp[0]} y2={Dp[1] + TH_} stroke="#00e5ff" strokeWidth="1" opacity="0.5" style={{ filter: "url(#lf-glow)" }} />
        {/* hinge */}
        <polygon points={P([A, B, [B[0], B[1] + 5], [A[0], A[1] + 5]])} fill="#0a0f1e" stroke="#1e2d4a" strokeWidth="0.8" />

        {/* deck internals jolting on every backspace (B5) */}
        <g className="lp-shake" style={{ animation: `lp-shake ${CYCLES}` }}>
        {/* keybed well */}
        <g transform={MAT_DECK}>
          <rect x="7" y="13" width="176" height="88" rx="5" fill="#060a16" stroke="#1c2a44" strokeWidth="1" />
          <rect x="9" y="15" width="172" height="84" rx="4" fill="none" stroke="#b8ff00" strokeWidth="0.4" opacity="0.15" />
          {/* soft inner rim: light catch along the top, shade at the bottom for depth */}
          <rect x="8" y="13" width="174" height="1" fill="rgba(255,255,255,0.045)" />
          <rect x="8" y="99" width="174" height="1.4" fill="rgba(0,0,0,0.42)" />
        </g>

        {/* keys â€” press + neon-strobe in sync with the terminal */}
        {ROWS.map((row, ri) =>
          row.keys.map((k) => {
            const keyId = k.id ?? k.l;
            const pressed = (PRESSED[keyId] ?? []).length > 0;
            return (
              <g
                key={`${ri}-${k.x}`}
                transform={`${MAT_DECK} translate(${k.x} ${row.y})`}
                style={pressed ? { animation: `lp-k${keyId} ${CYCLES}` } : undefined}
              >
                {/* key shadow for depth */}
                <rect x="1" y="2" width={k.w - 1} height="11" rx="2" fill="#060a14" opacity="0.6" />
                {/* key base */}
                <rect x="1" y="1" width={k.w - 1} height="12" rx="2" fill="#0b1220" />
                {/* key top (static fill; the strobe is the overlays below) */}
                <rect x="0" y="0" width={k.w - 1} height="12" rx="2" fill="#18243c" stroke="#33456b" strokeWidth="0.4" />
                {/* keycap top facet highlight + soft bottom rim shade */}
                <rect x="1.1" y="1.3" width={k.w - 3.2} height="1.6" rx="0.8" fill="rgba(255,255,255,0.07)" />
                <rect x="1.1" y="10.1" width={k.w - 3.2} height="1.1" rx="0.55" fill="rgba(0,0,0,0.26)" />
                {/* home-row nubs (F/J) */}
                {k.nub && <circle cx={(k.w - 1) / 2} cy="10.7" r="0.75" fill="#8ba0c4" opacity="0.85" />}
                {/* key label */}
                {k.l && (
                  <text x={(k.w - 1) / 2} y="8.6" fontSize="5.5" textAnchor="middle" fill="#93a7cc"
                    fontFamily="var(--font-mono), monospace" style={{ pointerEvents: "none", userSelect: "none" }}>{k.l}</text>
                )}
                {/* neon strobe overlays: opacity only, static filters (A1) */}
                {pressed && (
                  <>
                    <rect className="lp-kglow" x="0" y="0" width={k.w - 1} height="12" rx="2"
                      style={{ fill: "var(--lp-acid)", animation: `lp-ga${keyId} ${CYCLES}`, filter: "drop-shadow(0 0 6px var(--lp-acid))" }} />
                    <rect className="lp-kglow" x="0" y="0" width={k.w - 1} height="12" rx="2"
                      style={{ fill: "var(--lp-mag)", animation: `lp-gm${keyId} ${CYCLES}`, filter: "drop-shadow(0 0 6px var(--lp-mag))" }} />
                    <rect className="lp-kglow" x="0" y="0" width={k.w - 1} height="12" rx="2"
                      style={{ fill: "var(--lp-cyan)", animation: `lp-gc${keyId} ${CYCLES}`, filter: "drop-shadow(0 0 4px var(--lp-cyan))" }} />
                  </>
                )}
              </g>
            );
          })
        )}

        {/* trackpad + rave stickers */}
        <g transform={MAT_DECK}>
          <rect x="55" y="108" width="80" height="15" rx="4" fill="#0a1120" stroke="#223252" strokeWidth="0.8" />
          <rect x="58" y="110" width="74" height="11" rx="3" fill="#070d1a" />
          <rect x="58" y="110" width="74" height="11" rx="3" fill="none" stroke="#b8ff00" strokeWidth="0.3" opacity="0.18" />
          <text x="25" y="121" fontSize="8" fontWeight="bold" fill="#ff2bd6" opacity="0.9"
            fontFamily="var(--font-orbitron-var), var(--font-mono), monospace">ACID</text>
          <rect x="146" y="112" width="30" height="10" rx="2" fill="#0b0f1c" stroke="#b8ff00" strokeWidth="0.5" opacity="0.85" />
          <text x="161" y="119.6" fontSize="6.5" fontWeight="bold" textAnchor="middle" fill="#b8ff00"
            fontFamily="var(--font-mono), monospace">303</text>
        </g>

        {/* status LED on the front wall */}
        <circle className="lp-led" cx={iso(180, 140.6)[0]} cy={iso(180, 140.6)[1] + 4} r="2"
          style={{ fill: "var(--lp-acid)", filter: "url(#lf-glow)" }} />
        </g>
        {/* end deck-internals shake group */}

        {/* floating rave particles â€” enhanced with bloom */}
        {PARTICLES.map((p, i) => (
          <g key={`p${i}`} className="lp-pt" style={{ animationDelay: p.d }}>
            <circle cx={p.x} cy={p.y} r={p.r * 4} fill={p.c} opacity="0.1" style={{ filter: "url(#lf-bloom)" }} />
            <circle cx={p.x} cy={p.y} r={p.r * 2} fill={p.c} opacity="0.3" style={{ filter: "url(#lf-glow)" }} />
            <circle cx={p.x} cy={p.y} r={p.r} fill={p.c} opacity="0.9" style={{ filter: `drop-shadow(0 0 4px ${p.c})` }} />
          </g>
        ))}
        {DIAMONDS.map((p, i) => (
          <g key={`d${i}`} className="lp-pt" style={{ animationDelay: p.d }}>
            <polygon
              points={`${p.x},${p.y - 3.5} ${p.x + 3.5},${p.y} ${p.x},${p.y + 3.5} ${p.x - 3.5},${p.y}`}
              fill="none" stroke={p.c} strokeWidth="1" opacity="0.7" />
          </g>
        ))}

        {/* long idle breathing dim over the whole scene (C3) */}
        <rect className="lp-dim" x="-30" y="-36" width="395" height="376"
          fill="#020503" opacity="0" style={{ animation: "lp-dim 64s linear infinite" }} />
      </svg>
    </div>
  );
}
