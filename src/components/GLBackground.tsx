"use client";

import { useEffect, useRef } from "react";

const VERT = `
attribute vec2 aPos;
void main() {
  gl_Position = vec4(aPos, 0.0, 1.0);
}
`;

/* Domain-warped fBm smoke. Monochrome with a faint acid tint that
   follows the pointer — cheap enough to run at 60fps on integrated GPUs. */
const FRAG = `
precision highp float;
uniform vec2 uRes;
uniform float uTime;
uniform vec2 uMouse;
uniform float uLight; // 0 = dark theme, 1 = light theme

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

void main() {
  vec2 uv = (gl_FragCoord.xy * 2.0 - uRes) / min(uRes.x, uRes.y);
  float t = uTime * 0.05;

  vec2 q = uv * 1.35;
  float f1 = fbm(q + vec2(t * 0.35, -t * 0.22));
  float f2 = fbm(q * 1.6 + vec2(f1 * 1.9, -f1 * 1.4) + t * 0.15);

  // theme-aware palette: dark smoke on charcoal / light smoke on paper
  vec3 baseD = vec3(0.030, 0.031, 0.034);
  vec3 smokeD = vec3(0.078, 0.081, 0.088);
  vec3 baseL = vec3(0.957, 0.949, 0.925);
  vec3 smokeL = vec3(0.878, 0.871, 0.843);
  vec3 base = mix(baseD, baseL, uLight);
  vec3 smoke = mix(smokeD, smokeL, uLight);
  vec3 col = mix(base, smoke, smoothstep(-0.4, 0.9, f2));

  // faint acid tint in the dense folds
  col += mix(vec3(0.10, 0.13, 0.02), vec3(0.16, 0.20, 0.04), uLight)
       * smoothstep(0.55, 1.15, f2) * 0.35;

  // pointer torch (darker olive stroke on light surfaces)
  float d = length(uv - uMouse);
  col += mix(vec3(0.85, 1.0, 0.25), vec3(0.38, 0.48, 0.06), uLight)
       * smoothstep(0.85, 0.0, d) * 0.10;

  // vignette
  float vig = smoothstep(1.9, 0.4, length(uv));
  col *= mix(0.72, 1.0, vig);

  gl_FragColor = vec4(col, 1.0);
}
`;

function compile(gl: WebGLRenderingContext, type: number, src: string) {
  const shader = gl.createShader(type)!;
  gl.shaderSource(shader, src);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    console.error(gl.getShaderInfoLog(shader));
    return null;
  }
  return shader;
}

export default function GLBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const gl = canvas.getContext("webgl", { antialias: false, alpha: false });
    if (!gl) return; // CSS bg on the wrapper is the fallback

    const vs = compile(gl, gl.VERTEX_SHADER, VERT);
    const fs = compile(gl, gl.FRAGMENT_SHADER, FRAG);
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

    const applyTheme = () => {
      gl.uniform1f(
        uLight,
        document.documentElement.dataset.theme === "light" ? 1 : 0
      );
    };
    applyTheme();
    window.addEventListener("themechange", applyTheme);

    let mx = 0;
    let my = 0;
    let tx = 0;
    let ty = 0;
    const dpr = Math.min(window.devicePixelRatio || 1, 1.5);

    const resize = () => {
      canvas.width = Math.floor(canvas.clientWidth * dpr);
      canvas.height = Math.floor(canvas.clientHeight * dpr);
      gl.viewport(0, 0, canvas.width, canvas.height);
      gl.uniform2f(uRes, canvas.width, canvas.height);
    };
    resize();
    window.addEventListener("resize", resize);

    const onMove = (e: MouseEvent) => {
      // map to same normalized space as uv (aspect-corrected)
      const aspect = canvas.clientWidth / canvas.clientHeight;
      tx = ((e.clientX / canvas.clientWidth) * 2 - 1) * Math.max(aspect, 1);
      ty = -(((e.clientY / canvas.clientHeight) * 2 - 1) * Math.max(1 / aspect, 1));
    };
    if (!reduced) window.addEventListener("mousemove", onMove, { passive: true });

    let raf = 0;
    const start = performance.now();
    const frame = () => {
      raf = requestAnimationFrame(frame);
      if (document.hidden) return;
      mx += (tx - mx) * 0.045;
      my += (ty - my) * 0.045;
      gl.uniform1f(uTime, (performance.now() - start) / 1000);
      gl.uniform2f(uMouse, mx, my);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    };

    if (reduced) {
      // single static frame, no loop
      gl.uniform1f(uTime, 12.0);
      gl.uniform2f(uMouse, 99, 99);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    } else {
      raf = requestAnimationFrame(frame);
    }

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("themechange", applyTheme);
      gl.getExtension("WEBGL_lose_context")?.loseContext();
    };
  }, []);

  return (
    <div aria-hidden className="fixed inset-0 -z-10 bg-bg">
      <canvas ref={canvasRef} className="h-full w-full" />
    </div>
  );
}
