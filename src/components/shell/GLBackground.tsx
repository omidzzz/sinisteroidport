"use client";

import { useEffect, useRef } from "react";

const VERT = `
attribute vec2 aPos;
void main() {
  gl_Position = vec4(aPos, 0.0, 1.0);
}
`;

/* PSIONIC ORBIT NEBULA — ACID RAVE background.
   Two domain-warped fBm cloud fields drift through the void: an
   acid-lime layer and an electric-cyan layer crossing each other
   diagonally, dusted with twinkling stardust. The pointer adds a
   soft parallax pull. Light theme washes everything to a faint
   lab-whiteout. One loop, transform-free fullscreen quad, DPR-cap
   in host code below; reduced motion paints a single frame. */
const FRAG = `
precision highp float;
uniform vec2 uRes;
uniform float uTime;
uniform vec2 uMouse;
uniform float uLight;

vec2 hash2(vec2 p) {
  p = vec2(dot(p, vec2(127.1, 311.7)), dot(p, vec2(269.5, 183.3)));
  return -1.0 + 2.0 * fract(sin(p) * 43758.5453123);
}

float gnoise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(
    mix(dot(hash2(i + vec2(0.0, 0.0)), f - vec2(0.0, 0.0)),
        dot(hash2(i + vec2(1.0, 0.0)), f - vec2(1.0, 0.0)), u.x),
    mix(dot(hash2(i + vec2(0.0, 1.0)), f - vec2(0.0, 1.0)),
        dot(hash2(i + vec2(1.0, 1.0)), f - vec2(1.0, 1.0)), u.x),
    u.y);
}

float fbm(vec2 p) {
  float v = 0.0;
  float a = 0.55;
  for (int i = 0; i < 4; i++) {
    v += a * gnoise(p);
    p = p * 2.02 + 17.7;
    a *= 0.5;
  }
  return v;
}

float stars(vec2 frag, vec2 res, float t) {
  vec2 gp = (frag / res.y) * 30.0;
  vec2 id = floor(gp);
  float h = fract(sin(dot(id, vec2(41.3, 289.1))) * 43758.5453);
  vec2 gv = fract(gp) - 0.5;
  float core = smoothstep(0.09, 0.0, length(gv));
  float gate = step(0.986, h);
  float tw = 0.4 + 0.6 * sin(t * 2.1 + h * 87.0);
  return core * gate * tw;
}

void main() {
  vec2 uvRaw = (gl_FragCoord.xy * 2.0 - uRes) / min(uRes.x, uRes.y);

  /* Pointer parallax pull */
  vec2 uv = uvRaw + uMouse * 0.05;

  float t = uTime * 0.055;

  /* Acid cloud field */
  vec2 q = uv * 1.22;
  float f1 = fbm(q + vec2(t * 0.34, -t * 0.22));
  float f2 = fbm(q * 1.65 - vec2(f1 * 1.9, f1 * 1.4) + t * 0.12);
  float nebA = smoothstep(-0.52, 0.86, f2);

  /* Cyan counter-field, offset drift */
  float c1 = fbm(q * 0.78 + vec2(-t * 0.26, t * 0.18) + 31.7);
  float nebB = smoothstep(-0.44, 0.94, c1);

  bool lightMode = uLight > 0.5;
  vec3 voidC = lightMode ? vec3(0.952, 0.968, 0.936)
                         : vec3(0.008, 0.020, 0.012);
  vec3 acidC = lightMode ? vec3(0.400, 0.560, 0.080)
                         : vec3(0.700, 1.000, 0.000);
  vec3 cyanC = lightMode ? vec3(0.120, 0.480, 0.540)
                         : vec3(0.000, 0.900, 1.000);

  vec3 col = voidC;
  col = mix(col, cyanC * 0.60, nebB * (lightMode ? 0.30 : 0.46));
  col = mix(col, acidC * 0.62, nebA * (lightMode ? 0.26 : 0.40));

  if (!lightMode) {
    /* Deepen the void between clouds for type contrast */
    col *= 0.78 + 0.42 * nebB * (1.0 - nebA * 0.5);
  }

  /* Stardust */
  float st = stars(gl_FragCoord.xy, uRes, uTime * 0.9);
  vec3 stC = mix(cyanC, acidC, 0.5 + 0.5 * sin(uvRaw.x * 3.1 + uvRaw.y * 1.7));
  col += st * (lightMode ? vec3(0.25, 0.34, 0.30) : stC * 0.85);

  /* Gentle vignette */
  float vig = smoothstep(1.55, 0.35, length(uvRaw * vec2(0.85, 1.0)));
  col = mix(col * (lightMode ? 1.0 : 0.72), col, vig);

  gl_FragColor = vec4(col, 1.0);
}
`;

function compile(
  gl: WebGLRenderingContext,
  type: number,
  src: string,
  kind: "vertex" | "fragment"
) {
  /* createShader → null when the WebGL context is lost or unavailable (GPU
     resets, too many live contexts, headless/software renderers). That is an
     expected degradation for a decorative background: return quietly so the
     CSS layer on the wrapper stays put instead of a console `null`. */
  const sh = gl.createShader(type);
  if (!sh) return null;
  gl.shaderSource(sh, src);
  gl.compileShader(sh);
  if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
    /* getShaderInfoLog may legitimately return null (no driver log, or a dead
       context) — which is exactly what the old console.error(null) printed. */
    const log = gl.getShaderInfoLog(sh);
    console.warn(
      `[GLBackground] ${kind} shader did not compile` +
        (log
          ? `: ${log}`
          : "; driver returned no info log (WebGL context unavailable?)")
    );
    gl.deleteShader(sh);
    return null;
  }
  return sh;
}

export default function GLBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    // Touch / coarse-pointer devices get a single painted frame: a full-page
    // per-pixel shader loop is pure battery drain on phones and dominates the
    // main thread in mobile performance audits. Desktop (fine pointer) keeps
    // the slow-drifting animation.
    const coarse = !window.matchMedia("(pointer: fine)").matches;
    const staticFrame = reduced || coarse;
    const gl = canvas.getContext("webgl", {
      antialias: false,
      alpha: false,
      /* Static single-frame canvases must retain the drawing buffer: some
         mobile compositors re-present a CLEARED buffer (blank background)
         when the fixed layer is evicted during scroll unless it persists. */
      preserveDrawingBuffer: staticFrame,
    });
    if (!gl || gl.isContextLost()) return; // CSS bg on the wrapper is the fallback

    const vs = compile(gl, gl.VERTEX_SHADER, VERT, "vertex");
    // Coarse/low-end devices also drop one fBm octave (4 → 3): the nebula is
    // soft cloud noise, so the lost high-frequency octave is invisible, and
    // shader cost scales with per-pixel octave count. String-level
    // specialization keeps the hot loop free of uniforms and branches.
    const fragSrc = coarse ? FRAG.replace("i < 4", "i < 3") : FRAG;
    const fs = compile(gl, gl.FRAGMENT_SHADER, fragSrc, "fragment");
    if (!vs || !fs) return;
    const prog = gl.createProgram()!;
    gl.attachShader(prog, vs);
    gl.attachShader(prog, fs);
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) return;
    gl.useProgram(prog);

    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]),
      gl.STATIC_DRAW
    );
    const loc = gl.getAttribLocation(prog, "aPos");
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);

    const uRes = gl.getUniformLocation(prog, "uRes");
    const uTime = gl.getUniformLocation(prog, "uTime");
    const uMouse = gl.getUniformLocation(prog, "uMouse");
    const uLight = gl.getUniformLocation(prog, "uLight");

    let mx = 0;
    let my = 0;
    let tx = 0;
    let ty = 0;

    /* One triangle-strip draw with explicit uniforms — shared by the static
       painters (resize / theme flip) and the animation loop. */
    const paint = (time: number, px: number, py: number) => {
      gl.uniform1f(uTime, time);
      gl.uniform2f(uMouse, px, py);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    };

    const applyTheme = () => {
      gl.uniform1f(uLight, document.documentElement.dataset.theme === "light" ? 1 : 0);
      /* Static canvases never run the rAF loop: without this repaint the
         stale dark-theme frame lingers under the light UI after toggling,
         leaving the page stuck between the two themes. */
      if (staticFrame) paint(21.0, 99, 99);
    };
    applyTheme();
    const onTheme = () => applyTheme();
    window.addEventListener("themechange", onTheme);
    /* Coarse devices render at 0.75× native and upscale: the nebula is soft
       fBm clouds, so sub-pixel detail is imperceptible while fragment cost
       drops by ~44%. Fine-pointer desktops keep 1:1 (capped at DPR 1). */
    const dpr = Math.min(window.devicePixelRatio || 1, 1) * (coarse ? 0.75 : 1);

    const resize = () => {
      canvas.width = Math.floor(canvas.clientWidth * dpr);
      canvas.height = Math.floor(canvas.clientHeight * dpr);
      gl.viewport(0, 0, canvas.width, canvas.height);
      gl.uniform2f(uRes, canvas.width, canvas.height);
      /* Assigning width/height WIPES the drawing buffer. The animated path
         repaints on the next rAF, but the static path (mobile) draws once,
         so it must repaint here — otherwise the nebula vanishes whenever
         the mobile URL bar collapses/expands mid-scroll (a resize event). */
      if (staticFrame) paint(21.0, 99, 99);
    };
    resize();
    window.addEventListener("resize", resize);

    const onMove = (e: MouseEvent) => {
      tx = (e.clientX / window.innerWidth) * 2 - 1;
      ty = -((e.clientY / window.innerHeight) * 2 - 1);
    };
    if (!staticFrame) window.addEventListener("mousemove", onMove, { passive: true });

    let raf = 0;
    let last = 0;
    const start = performance.now();
    const FPS = 30; // soft cap: the nebula drifts slowly, so 30fps reads identically
    /* If the context is lost mid-session (GPU process reset, memory pressure,
       browser reclaim), stop scheduling frames instead of repainting a dead
       context forever — the CSS background stays on the wrapper. */
    const stopLoop = () => {
      cancelAnimationFrame(raf);
      raf = 0;
    };
    const onContextLost = () => stopLoop();
    canvas.addEventListener("webglcontextlost", onContextLost);

    const frame = (ts: number) => {
      if (gl.isContextLost()) return; // onContextLost already tore down the loop
      raf = requestAnimationFrame(frame);
      if (document.hidden) return;
      if (ts - last < 1000 / FPS) return;
      last = ts;
      mx += (tx - mx) * 0.04;
      my += (ty - my) * 0.04;
      gl.uniform1f(uTime, (performance.now() - start) / 1000);
      gl.uniform2f(uMouse, mx, my);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    };

    if (staticFrame) {
      // single static frame, no loop
      paint(21.0, 99, 99);
    } else {
      raf = requestAnimationFrame(frame);
    }

    return () => {
      stopLoop();
      canvas.removeEventListener("webglcontextlost", onContextLost);
      window.removeEventListener("resize", resize);
      if (!staticFrame) window.removeEventListener("mousemove", onMove);
      window.removeEventListener("themechange", onTheme);
      /* Only release the context on a real unmount. During dev StrictMode /
         Fast-Refresh effect re-runs the canvas is still connected, so its
         context must stay alive for the next effect run to reuse. */
      if (!canvas.isConnected)
        gl.getExtension("WEBGL_lose_context")?.loseContext();
    };
  }, []);

  return (
    <div aria-hidden className="fixed inset-0 -z-10 bg-bg">
      <canvas ref={canvasRef} className="h-full w-full" />
    </div>
  );
}