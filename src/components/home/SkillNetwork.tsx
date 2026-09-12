"use client";

import { useEffect, useRef, useState } from "react";
import Reveal from "@/components/ui/Reveal";
import { Rail, Seam } from "@/components/ui/Section";
import { ArrowIcon, SparkIcon } from "@/components/ui/icons";
import { trackEvent } from "@/lib/analytics";
import { loc, type Locale } from "@/lib/i18n";
import skillsData from "@/data/skills.json";

/**
 * HOME ACT — SYNAPSE / SKILL NETWORK.
 * A living constellation of Omid's strongest skills, anchored by the
 * SINISTER agent hub. Pure <canvas>: soft-body physics (edge springs +
 * pairwise repulsion), pointer repel, node dragging, hover/selection
 * highlighting, idle drift so it never sits still. Honors
 * prefers-reduced-motion (settles to a static constellation) and pauses
 * when offscreen. Node clicks fire `skill_node_click` GA4 events.
 */

type Kind = "hub" | "cat" | "leaf";

interface NetNode {
  id: string;
  label: string; // short canvas label
  full: string; // full skill name (HUD)
  kind: Kind;
  group: string; // category key (EN, for analytics)
  level: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  r: number;
  phase: number;
}

interface NetEdge {
  a: number;
  b: number;
  deep: boolean; // true = cat→leaf spring, false = hub→cat
}

/** Curated constellation leaves, keyed by the exact skills.json names. */
const CATS: { key: string; en: string; fa: string; leaves: string[] }[] = [
  {
    key: "Frontend Development",
    en: "Frontend",
    fa: "فرانت‌اند",
    leaves: ["Next.js (App Router, SSG)", "React", "TypeScript"],
  },
  {
    key: "Styling",
    en: "Styling",
    fa: "استایل",
    leaves: ["TailwindCSS", "Advanced CSS Animation & Motion Design"],
  },
  {
    key: "AI Agent Engineering",
    en: "AI Agent",
    fa: "ایجنت هوش مصنوعی",
    leaves: [
      "LLM API Integration (streaming)",
      "Prompt Engineering (persona & system design)",
      "Chat UX (streaming responses, typing state)",
      "Context Injection (site corpus → agent)",
      "Agent Analytics (GA4 event funnels)",
      "Response Guardrails & Tone Shaping",
    ],
  },
  { key: "CMS", en: "CMS", fa: "مدیر محتوا", leaves: ["WordPress", "Elementor Pro"] },
  {
    key: "Database Expertise",
    en: "Database",
    fa: "پایگاه داده",
    leaves: ["MySQL", "MongoDB"],
  },
  { key: "Backend Development", en: "Backend", fa: "بک‌اند", leaves: ["Node.js", "PHP"] },
  {
    key: "Tools & Workflow",
    en: "Tooling",
    fa: "ابزارها",
    leaves: ["Lighthouse / Performance Auditing", "Web Scraping"],
  },
];

/** Short canvas labels — [EN, FA] by original skill name. */
const SHORT: Record<string, [string, string]> = {
  "Next.js (App Router, SSG)": ["Next.js", "نکست‌جی‌اس"],
  React: ["React", "ری‌اکت"],
  TypeScript: ["TypeScript", "تایپ‌اسکریپت"],
  TailwindCSS: ["Tailwind", "تیلویند"],
  "Advanced CSS Animation & Motion Design": ["CSS Motion", "انیمیشن CSS"],
  "LLM API Integration (streaming)": ["LLM Streaming", "اتصال LLM استریم"],
  "Prompt Engineering (persona & system design)": ["Prompt Eng.", "مهندسی پرامپت"],
  "Chat UX (streaming responses, typing state)": ["Chat UX", "چت استریمینگ"],
  "Context Injection (site corpus → agent)": ["Context Feed", "تزریق زمینه"],
  "Agent Analytics (GA4 event funnels)": ["Agent Analytics", "تحلیل رخداد ایجنت"],
  "Response Guardrails & Tone Shaping": ["Guardrails", "گاردریل پاسخ"],
  WordPress: ["WordPress", "وردپرس"],
  "Elementor Pro": ["Elementor", "المنتور"],
  MySQL: ["MySQL", "مای‌اس‌کیو‌ال"],
  MongoDB: ["MongoDB", "مونگو‌دی‌بی"],
  "Node.js": ["Node.js", "نود‌جی‌اس"],
  PHP: ["PHP", "پی‌اچ‌پی"],
  "Lighthouse / Performance Auditing": ["Lighthouse", "لایت‌هاوس"],
  "Web Scraping": ["Web Scraping", "اسکریپینگ"],
};

const LEVEL = new Map<string, number>(
  skillsData.flatMap((g) => g.skills.map((s) => [s.name, s.level] as const)),
);

/*__P2__*/

/**
 * Parse a color custom-property into an [r,g,b] triplet for canvas rgba().
 * The browser does NOT give back the `#hex` we author in tokens.css — Tailwind
 * v4 registers theme tokens as <color> properties, so getComputedStyle
 * serializes them to `rgb(184, 255, 0)`. Accept hex, 3-digit hex and
 * rgb()/ rgba() so the network NEVER silently paints black again. On a truly
 * unpare-able value, fail open to the acid-lime brand color (never black).
 */
const ACID_RGB: [number, number, number] = [184, 255, 0];

function hexToRgb(color: string): [number, number, number] {
  if (!color) return ACID_RGB;
  color = color.trim().toLowerCase();
  if (color.startsWith("#")) {
    let hex = color.slice(1);
    if (/^[0-9a-f]{3}$/.test(hex)) hex = hex.split("").map((c) => c + c).join("");
    if (/^[0-9a-f]{6}$/.test(hex)) {
      const n = parseInt(hex, 16);
      return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
    }
    return ACID_RGB;
  }
  if (color.startsWith("rgba(") || color.startsWith("rgb(")) {
    const body = color.slice(color.indexOf("(") + 1, -1);
    const nums = body.split(/[,\s]+/).map((p) => {
      if (p.endsWith("%")) return Math.round((parseFloat(p.slice(0, -1)) / 100) * 255);
      return parseFloat(p);
    });
    const [r, g, b] = nums;
    if ([r, g, b].every((v) => Number.isFinite(v)))
      return [Math.max(0, Math.min(255, r)), Math.max(0, Math.min(255, g)), Math.max(0, Math.min(255, b))];
  }
  return ACID_RGB;
}

export default function SkillNetwork({ locale }: { locale: Locale }) {
  const fa = locale === "fa";
  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef(0);
  const hiddenRef = useRef(false);
  const dprRef = useRef(1);
  const wRef = useRef(0);
  const hRef = useRef(0);
  const nodesRef = useRef<NetNode[]>([]);
  const edgesRef = useRef<NetEdge[]>([]);
  const hotRef = useRef(-1); // hovered node index
  const selRef = useRef(-1); // selected node index
  const dragRef = useRef(-1);
  const downAtRef = useRef(0);
  const downPtRef = useRef({ x: 0, y: 0 });
  const pointersRef = useRef<{ x: number; y: number }[]>([]);
  const [active, setActive] = useState<{ label: string; full: string; level: number } | null>(
    null,
  );
  const [reduced, setReduced] = useState(false);

  const L = (en: string, fallback: string) => (fa ? fallback : en);

  /* ── Graph build + physics/render loop ─────────────────────────── */

  useEffect(() => {
    const canvas = canvasRef.current;
    const wrap = wrapRef.current;
    if (!canvas || !wrap) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    /* Palette is resolved from the live theme and RE-resolved when the
       user flips the light/dark toggle (MutationObserver below). */
    const resolvePal = () => {
      const styles = getComputedStyle(document.documentElement);
      return {
        acid: styles.getPropertyValue("--color-acid").trim() || "#b8ff00",
        cyan: styles.getPropertyValue("--color-accent").trim() || "#00e5ff",
        violet: styles.getPropertyValue("--color-accent-2").trim() || "#08b8cf",
        ink: styles.getPropertyValue("--color-ink").trim() || "#ecffe9",
      };
    };
    let C = resolvePal();
    const A = () => hexToRgb(C.acid);
    const Y = () => hexToRgb(C.cyan);
    const V = () => hexToRgb(C.violet);
    const K = () => hexToRgb(C.ink);
    const themeDark = () =>
      document.documentElement.getAttribute("data-theme") !== "light";

    const reducedQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    const reducedMotion = reducedQuery.matches;
    setReduced(reducedMotion);

    /* ── Build the constellation ─────────────────────────────────── */
    const nodes: NetNode[] = [];
    const edges: NetEdge[] = [];

    const HUB: NetNode = {
      id: "hub",
      label: fa ? "سینیستر" : "SINISTER",
      full: fa ? "ایجنت سینیستر" : "SINISTER agent",
      kind: "hub",
      group: "AI Agent Engineering",
      level: 5,
      x: 0,
      y: 0,
      vx: 0,
      vy: 0,
      r: 34,
      phase: Math.random() * Math.PI * 2,
    };
    nodes.push(HUB);
    const hubIdx = 0;

    CATS.forEach((cat) => {
      const catNode: NetNode = {
        id: `cat:${cat.key}`,
        label: fa ? cat.fa : cat.en,
        full: fa ? cat.fa : cat.en,
        kind: "cat",
        group: cat.key,
        level: 0,
        x: 0,
        y: 0,
        vx: 0,
        vy: 0,
        r: 17,
        phase: Math.random() * Math.PI * 2,
      };
      const catIdx = nodes.push(catNode) - 1;
      edges.push({ a: hubIdx, b: catIdx, deep: false });

      cat.leaves.forEach((name) => {
        const [en, fallback] = SHORT[name] ?? [name, name];
        const leaf: NetNode = {
          id: `leaf:${name}`,
          label: fa ? fallback : en,
          full: name,
          kind: "leaf",
          group: cat.key,
          level: LEVEL.get(name) ?? 3,
          x: 0,
          y: 0,
          vx: 0,
          vy: 0,
          r: 9 + (LEVEL.get(name) ?? 3),
          phase: Math.random() * Math.PI * 2,
        };
        const leafIdx = nodes.push(leaf) - 1;
        edges.push({ a: catIdx, b: leafIdx, deep: true });
      });
    });

    nodesRef.current = nodes;
    edgesRef.current = edges;

    /*__P1__*/

    /* ── Sizing (DPR aware) ──────────────────────────────────────── */
    const sizeCanvas = () => {
      const rect = wrap.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      dprRef.current = dpr;
      wRef.current = rect.width;
      hRef.current = rect.height;
      canvas.width = Math.round(rect.width * dpr);
      canvas.height = Math.round(rect.height * dpr);
      canvas.style.width = `${rect.width}px`;
      canvas.style.height = `${rect.height}px`;
    };
    sizeCanvas();

    /* Scatter initial positions on rings around center. */
    const cx = wRef.current / 2;
    const cy = hRef.current / 2;
    const cats = nodes.filter((n) => n.kind === "cat");
    cats.forEach((n, i) => {
      const ang = (i / cats.length) * Math.PI * 2 - Math.PI / 2;
      const rad = Math.min(wRef.current, hRef.current) * 0.3;
      n.x = cx + Math.cos(ang) * rad;
      n.y = cy + Math.sin(ang) * rad;
    });
    let li = 0;
    const leafCount = nodes.filter((n) => n.kind === "leaf").length;
    nodes.forEach((n) => {
      if (n.kind !== "leaf") return;
      const ang = (li / leafCount) * Math.PI * 2 + n.phase;
      const rad = Math.min(wRef.current, hRef.current) * 0.42;
      n.x = cx + Math.cos(ang) * rad;
      n.y = cy + Math.sin(ang) * rad;
      li++;
    });
    HUB.x = cx;
    HUB.y = cy;

    /* Static dust field for depth (normalized coords). */
    const dust = Array.from({ length: 64 }, () => ({
      x: Math.random(),
      y: Math.random(),
      s: 0.4 + Math.random() * 1.1,
      p: Math.random() * Math.PI * 2,
    }));

    /* ── Interaction ─────────────────────────────────────────────── */
    const toCanvas = (e: PointerEvent) => {
      const rect = canvas.getBoundingClientRect();
      return { x: e.clientX - rect.left, y: e.clientY - rect.top };
    };
    const hit = (px: number, py: number) => {
      for (let i = nodes.length - 1; i >= 0; i--) {
        const n = nodes[i];
        const dx = px - n.x;
        const dy = py - n.y;
        const rr = Math.max(n.r + 10, 26);
        if (dx * dx + dy * dy <= rr * rr) return i;
      }
      return -1;
    };

    const onPointerMove = (e: PointerEvent) => {
      const p = toCanvas(e);
      pointersRef.current = [{ x: p.x, y: p.y }];
      /* Dragged node follows the pointer 1:1 — no physics fight. */
      if (dragRef.current !== -1) {
        const n = nodes[dragRef.current];
        n.x = p.x;
        n.y = p.y;
        n.vx = 0;
        n.vy = 0;
      }
      const h = hit(p.x, p.y);
      hotRef.current = h;
      canvas.style.cursor = h === -1 ? "default" : dragRef.current === h ? "grabbing" : "grab";
      if (h !== -1) {
        const n = nodes[h];
        setActive({ label: n.label, full: n.full, level: n.level });
      } else if (dragRef.current === -1) {
        setActive(null);
      }
    };
    const onPointerDown = (e: PointerEvent) => {
      const p = toCanvas(e);
      const h = hit(p.x, p.y);
      downAtRef.current = performance.now();
      downPtRef.current = p;
      if (h !== -1) {
        dragRef.current = h;
        canvas.setPointerCapture(e.pointerId);
        canvas.style.cursor = "grabbing";
      }
    };
    const onPointerUp = (e: PointerEvent) => {
      const p = toCanvas(e);
      const dist = Math.hypot(p.x - downPtRef.current.x, p.y - downPtRef.current.y);
      const h = hit(p.x, p.y);
      if (dragRef.current !== -1 && dist < 8 && h === dragRef.current) {
        const n = nodes[h];
        selRef.current = selRef.current === h ? -1 : h;
        setActive({ label: n.label, full: n.full, level: n.level });
        trackEvent("skill_node_click", {
          node: n.id,
          group: n.group,
          kind: n.kind,
          level: n.level,
        });
      }
      dragRef.current = -1;
      canvas.style.cursor = h !== -1 ? "grab" : "default";
    };
    const onPointerLeave = () => {
      pointersRef.current = [];
      hotRef.current = -1;
      setActive(null);
    };

    canvas.addEventListener("pointermove", onPointerMove);
    canvas.addEventListener("pointerdown", onPointerDown);
    canvas.addEventListener("pointerup", onPointerUp);
    canvas.addEventListener("pointerleave", onPointerLeave);

    /*__P2__*/

    /* Pause when scrolled out of view (battery/CPU courtesy). */
    const io = new IntersectionObserver(
      (entries) => {
        hiddenRef.current = !entries[0]?.isIntersecting;
      },
      { rootMargin: "80px" },
    );
    io.observe(canvas);

    const onResize = () => {
      sizeCanvas();
      const ncx = wRef.current / 2;
      const ncy = hRef.current / 2;
      nodes.forEach((n) => {
        n.x += ncx - cx;
        n.y += ncy - cy;
      });
    };
    const ro = new ResizeObserver(onResize);
    ro.observe(wrap);

    /* ── Physics + render ────────────────────────────────────────── */
    let t = 0;
    const step = () => {
      rafRef.current = requestAnimationFrame(step);
      if (hiddenRef.current) return; // paused offscreen
      const w = wRef.current;
      const h = hRef.current;
      const ncx = w / 2;
      const ncy = h / 2;

      if (!reducedMotion) {
        t += 1 / 60;

        /* Springs: hub→cat tight ring, cat→leaf softer. */
        for (const e of edges) {
          const a = nodes[e.a];
          const b = nodes[e.b];
          const dx = b.x - a.x;
          const dy = b.y - a.y;
          const dist = Math.max(Math.hypot(dx, dy), 0.001);
          const rest = e.deep ? 150 : 115;
          const k = e.deep ? 0.0018 : 0.006;
          const f = (dist - rest) * k;
          const fx = (dx / dist) * f;
          const fy = (dy / dist) * f;
          if (dragRef.current !== e.a) {
            a.vx += fx;
            a.vy += fy;
          }
          if (dragRef.current !== e.b) {
            b.vx -= fx;
            b.vy -= fy;
          }
        }

        /* Pairwise repulsion (O(n²), n≈29 — trivial). */
        for (let i = 0; i < nodes.length; i++) {
          for (let j = i + 1; j < nodes.length; j++) {
            const a = nodes[i];
            const b = nodes[j];
            const dx = b.x - a.x;
            const dy = b.y - a.y;
            const d2 = dx * dx + dy * dy;
            if (d2 > 90000) continue;
            const dist = Math.max(Math.sqrt(d2), 1);
            const f = Math.min(2200 / d2, 0.9);
            const fx = (dx / dist) * f;
            const fy = (dy / dist) * f;
            if (dragRef.current !== i) {
              a.vx -= fx;
              a.vy -= fy;
            }
            if (dragRef.current !== j) {
              b.vx += fx;
              b.vy += fy;
            }
          }
        }

        /* Centering + idle drift + pointer repel + damping + integrate. */
        for (let i = 0; i < nodes.length; i++) {
          const n = nodes[i];
          const centerK = n.kind === "hub" ? 0.05 : n.kind === "cat" ? 0.012 : 0.006;
          n.vx += (ncx - n.x) * centerK;
          n.vy += (ncy - n.y) * centerK;
          n.vx += Math.sin(t * 0.9 + n.phase) * 0.015;
          n.vy += Math.cos(t * 0.7 + n.phase * 1.3) * 0.015;
          /* Pointer repel — never applied to the hovered/dragged node,
             or it flees the cursor before you can grab it. */
          if (i !== hotRef.current && i !== dragRef.current) {
            for (const p of pointersRef.current) {
              const dx = n.x - p.x;
              const dy = n.y - p.y;
              const d2 = dx * dx + dy * dy;
              if (d2 < 16900 && d2 > 0.01) {
                const dist = Math.sqrt(d2);
                const f = Math.min(900 / d2, 1.4);
                n.vx += (dx / dist) * f;
                n.vy += (dy / dist) * f;
              }
            }
          }
          n.vx *= 0.9;
          n.vy *= 0.9;
          if (dragRef.current !== i) {
            n.x += n.vx;
            n.y += n.vy;
          }
        }

        /* Soft bounds. */
        for (const n of nodes) {
          const pad = n.r + 6;
          if (n.x < pad) {
            n.x = pad;
            n.vx = Math.abs(n.vx) * 0.4;
          }
          if (n.x > w - pad) {
            n.x = w - pad;
            n.vx = -Math.abs(n.vx) * 0.4;
          }
          if (n.y < pad) {
            n.y = pad;
            n.vy = Math.abs(n.vy) * 0.4;
          }
          if (n.y > h - pad) {
            n.y = h - pad;
            n.vy = -Math.abs(n.vy) * 0.4;
          }
        }
      }

      /* ── Draw ──────────────────────────────────────────────────── */
      ctx.setTransform(dprRef.current, 0, 0, dprRef.current, 0, 0);
      ctx.clearRect(0, 0, w, h);
      const draw = () => {
        const hot = hotRef.current;
        const sel = selRef.current;
        const focus = sel !== -1 ? sel : hot;
        const focusGroup = focus !== -1 ? nodes[focus].group : null;
        const dark = themeDark();

        /* Dust field — slow shimmering depth layer. Kept whisper-thin in
           dark mode: every dot is additive haze over transparency. */
        if (!reducedMotion) {
          const dustColor = dark ? Y() : K();
          ctx.fillStyle = `rgba(${dustColor[0]},${dustColor[1]},${dustColor[2]},${dark ? 0.16 : 0.13})`;
          for (const d of dust) {
            ctx.beginPath();
            ctx.arc(d.x * w, d.y * h + Math.sin(t * 0.6 + d.p) * 5, d.s, 0, Math.PI * 2);
            ctx.fill();
          }
        }

        /* Edges — gently bowed for an organic synapse look. */
        for (const e of edges) {
          const a = nodes[e.a];
          const b = nodes[e.b];
          const lit =
            focusGroup !== null && (a.group === focusGroup || b.group === focusGroup);
          const alpha = lit
            ? e.deep ? 0.7 : 0.85
            : dark
              ? e.deep ? 0.5 : 0.62
              : e.deep ? 0.18 : 0.28;
          const [r, g, bl] = lit ? Y() : dark ? A() : K();
          ctx.strokeStyle = `rgba(${r},${g},${bl},${alpha})`;
          ctx.lineWidth = lit ? (e.deep ? 2 : 2.8) : dark ? (e.deep ? 1.8 : 2.2) : e.deep ? 0.9 : 1.4;
          ctx.beginPath();
          ctx.moveTo(a.x, a.y);
          ctx.quadraticCurveTo(
            (a.x + b.x) / 2 + (b.y - a.y) * 0.09,
            (a.y + b.y) / 2 - (b.x - a.x) * 0.09,
            b.x,
            b.y,
          );
          ctx.stroke();
        }

        /* Pulses travelling along the lit cluster's edges. */
        if (!reducedMotion && focusGroup !== null) {
          for (const e of edges) {
            if (!e.deep) continue;
            const a = nodes[e.a];
            const b = nodes[e.b];
            if (a.group !== focusGroup) continue;
            const tt = (t * 0.9 + e.a * 0.37) % 1;
            ctx.fillStyle = `rgba(${Y()[0]},${Y()[1]},${Y()[2]},1)`;
            ctx.beginPath();
            ctx.arc(a.x + (b.x - a.x) * tt, a.y + (b.y - a.y) * tt, 3, 0, Math.PI * 2);
            ctx.fill();
          }
        }

        /* Nodes. */
        for (let i = 0; i < nodes.length; i++) {
          const n = nodes[i];
          const isHub = n.kind === "hub";
          const isHot = i === hot || i === sel;
          const lit = focusGroup !== null && n.group === focusGroup;
          /* Dark idle nodes/labels: neon acid-lime by default (matches the
             house identity); cyan is reserved for the hovered/lit state so
             focus always reads as a different signal. Light theme uses ink. */
          const [r, g, bl] = isHub
            ? A()
            : lit || isHot
              ? Y()
              : dark
                ? A()
                : K();
          const baseA = isHub
            ? 1
            : lit || isHot
              ? 1
              : dark
                ? n.kind === "cat"
                  ? 0.85
                  : 0.68
                : n.kind === "cat"
                  ? 0.6
                  : 0.4;
          const breathe = reducedMotion
            ? 1
            : 1 + Math.sin(t * 2 + n.phase) * (isHub ? 0.05 : 0.025);

          /* Glow — hot/hub always; dark idle nodes get a TIGHT halo only.
             The old r*8 bloom on every node stacked ~29 translucent washes
             into a smoked-glass haze (the "black tint"). */
          if (isHot || isHub || dark) {
            /* Inner tight halo — bright core glow. */
            const glowInner = ctx.createRadialGradient(n.x, n.y, 0, n.x, n.y, n.r * 2.2);
            glowInner.addColorStop(0, `rgba(${r},${g},${bl},${isHub ? 0.95 : isHot ? 0.9 : dark ? 0.5 : 0.3})`);
            glowInner.addColorStop(0.45, `rgba(${r},${g},${bl},${isHub ? 0.6 : isHot ? 0.55 : dark ? 0.28 : 0.15})`);
            glowInner.addColorStop(1, `rgba(${r},${g},${bl},0)`);
            ctx.fillStyle = glowInner;
            ctx.beginPath();
            ctx.arc(n.x, n.y, n.r * 2.2, 0, Math.PI * 2);
            ctx.fill();
            /* Outer wide bloom — hot/hub ONLY. */
            if (isHot || isHub) {
              const glowOuter = ctx.createRadialGradient(n.x, n.y, 0, n.x, n.y, n.r * 6);
              glowOuter.addColorStop(0, `rgba(${r},${g},${bl},${isHub ? 0.7 : 0.6})`);
              glowOuter.addColorStop(0.25, `rgba(${r},${g},${bl},${isHub ? 0.35 : 0.3})`);
              glowOuter.addColorStop(0.6, `rgba(${r},${g},${bl},${isHub ? 0.1 : 0.08})`);
              glowOuter.addColorStop(1, `rgba(${r},${g},${bl},0)`);
              ctx.fillStyle = glowOuter;
              ctx.beginPath();
              ctx.arc(n.x, n.y, n.r * 6, 0, Math.PI * 2);
              ctx.fill();
            }
          }

          if (isHub) {
            /* Rotating dashed orbit ring around the hub. */
            ctx.setLineDash([5, 8]);
            ctx.lineDashOffset = -t * 14;
            ctx.strokeStyle = `rgba(${A()[0]},${A()[1]},${A()[2]},${0.35 + Math.sin(t * 1.7) * 0.12})`;
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.arc(n.x, n.y, n.r + 12, 0, Math.PI * 2);
            ctx.stroke();
            ctx.setLineDash([]);
          }
          if (i === sel) {
            /* Pinned-node ripple. */
            const rp = (t * 0.7) % 1;
            ctx.strokeStyle = `rgba(${Y()[0]},${Y()[1]},${Y()[2]},${(1 - rp) * 0.5})`;
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.arc(n.x, n.y, n.r + 4 + rp * 26, 0, Math.PI * 2);
            ctx.stroke();
          }

          ctx.beginPath();
          ctx.arc(n.x, n.y, n.r * breathe, 0, Math.PI * 2);
          if (isHub) {
            const rg = ctx.createRadialGradient(
              n.x - n.r * 0.4,
              n.y - n.r * 0.4,
              n.r * 0.15,
              n.x,
              n.y,
              n.r,
            );
            rg.addColorStop(0, `rgba(${A()[0]},${A()[1]},${A()[2]},1)`);
            rg.addColorStop(1, `rgba(${V()[0]},${V()[1]},${V()[2]},1)`);
            ctx.fillStyle = rg;
          } else {
            ctx.fillStyle = `rgba(${r},${g},${bl},${isHot ? 1 : dark ? 0.85 : baseA * 0.32})`;
          }
          ctx.fill();
          if (!isHub) {
            ctx.strokeStyle = `rgba(${r},${g},${bl},${isHot ? 1 : dark ? 0.9 : baseA})`;
            ctx.lineWidth = isHot ? 3 : dark ? 2 : 1;
            ctx.stroke();
            if (n.kind === "cat") {
              /* Secondary halo ring for cluster anchors. */
              ctx.strokeStyle = `rgba(${r},${g},${bl},${isHot ? 0.6 : dark ? 0.35 : 0.2})`;
              ctx.lineWidth = 1.5;
              ctx.beginPath();
              ctx.arc(n.x, n.y, n.r + 6, 0, Math.PI * 2);
              ctx.stroke();
            }
          }

          /* Orbiting satellite on the hub. */
          if (isHub && !reducedMotion) {
            const oa = t * 1.4 + n.phase;
            ctx.fillStyle = `rgba(${A()[0]},${A()[1]},${A()[2]},0.95)`;
            ctx.beginPath();
            ctx.arc(
              n.x + Math.cos(oa) * (n.r + 9),
              n.y + Math.sin(oa) * (n.r + 9),
              3,
              0,
              Math.PI * 2,
            );
            ctx.fill();
          }

          /* Label. */
          const fs = isHub ? 13 : n.kind === "cat" ? 11 : 10;
          const weight = isHub || isHot ? "700" : n.kind === "cat" ? "600" : "600";
          ctx.font = `${weight} ${fs}px "Vazirmatn", "Space Grotesk", ui-sans-serif, sans-serif`;
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          ctx.fillStyle = isHub
            ? "#020503"
            : `rgba(${r},${g},${bl},${isHot ? 1 : lit ? 0.95 : dark ? 0.92 : baseA})`;
          ctx.fillText(n.label, n.x, n.y + (isHub ? 0 : n.r + fs * 0.9));
        }
      };
      draw();
    };
    rafRef.current = requestAnimationFrame(step);

    const onVis = () => {
      cancelAnimationFrame(rafRef.current);
      if (!document.hidden) rafRef.current = requestAnimationFrame(step);
    };
    document.addEventListener("visibilitychange", onVis);

    /* Live theme: re-resolve the palette when the toggle flips — the frame
       loop repaints from the new values on the next frame (it runs even in
       reduced-motion mode, where only physics/dust are gated). */
    const themeObs = new MutationObserver(() => {
      C = resolvePal();
    });
    themeObs.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["data-theme"],
    });

    return () => {
      themeObs.disconnect();
      cancelAnimationFrame(rafRef.current);
      io.disconnect();
      ro.disconnect();
      document.removeEventListener("visibilitychange", onVis);
      canvas.removeEventListener("pointermove", onPointerMove);
      canvas.removeEventListener("pointerdown", onPointerDown);
      canvas.removeEventListener("pointerup", onPointerUp);
      canvas.removeEventListener("pointerleave", onPointerLeave);
    };
  }, [fa]);

  const hint = fa
    ? "بکش، بگرد، کلیک کن — هر دسته روشن می‌شه"
    : "Drag, wander, click — each cluster lights up";
  const cta = fa ? "همه‌ی مهارت‌ها" : "All skills";
  const hudLevel = fa ? "سطح" : "level";
  const kicker = fa ? "شبکه‌ی سیناپسی · مهارت‌ها" : "SYNAPSE · skill network";

  return (
    <>
      <section
        id="synapse"
        className="shell-grid relative mx-auto mt-6 max-w-[86rem] px-5 sm:px-8"
      >
        <Rail label={kicker} icon={<SparkIcon />} />
        <div className="relative">
          <span aria-hidden dir="ltr" className="scrub-word rev-dir top-[-0.45em]">
            SYNAPSE
          </span>

          <Reveal>
            <div className="net-stage relative mt-2 overflow-hidden rounded-2xl">
              <div ref={wrapRef} className="relative h-[460px] sm:h-[540px] lg:h-[600px]">
                <canvas
                  ref={canvasRef}
                  className="absolute inset-0 block cursor-default"
                  style={{ touchAction: "pan-y" }}
                  aria-label={fa ? "نقشه تعاملی مهارت‌ها" : "Interactive map of Omid's skills"}
                  role="img"
                />

                {/* HUD — active node readout */}
                <div
                  dir={fa ? "rtl" : "ltr"}
                  className="pointer-events-none absolute top-4 z-10 font-mono text-[0.62rem] uppercase tracking-[0.16em] text-muted"
                  style={fa ? { left: "1rem" } : { right: "1rem" }}
                >
                  {active ? (
                    <span className="net-hud block rounded-lg border border-[rgba(var(--rgb-acid),0.35)] bg-[rgba(2,5,3,0.75)] px-3 py-2">
                      <b className="font-display text-[0.8rem] tracking-normal text-[var(--color-ink)]">
                        {active.full}
                      </b>
                      <span className="mt-0.5 block opacity-70">
                        {active.level > 0
                          ? `${hudLevel} ${active.level}/5`
                          : fa
                            ? "دسته‌بندی"
                            : "category"}
                      </span>
                    </span>
                  ) : (
                    <span className="block opacity-60">{hint}</span>
                  )}
                </div>
              </div>

              <div
                dir={fa ? "rtl" : "ltr"}
                className="flex flex-wrap items-center justify-between gap-3 px-5 pb-1 pt-3"
              >
                <p className="font-mono text-[0.62rem] uppercase tracking-[0.16em] text-muted">
                  {fa
                    ? "هاب سینیستر = مهارت‌های ایجنت هوش مصنوعی"
                    : "SINISTER hub = the AI-agent skill stack"}
                </p>
                <a
                  href={loc(locale, "/skills")}
                  className="btn-ghost group text-xs"
                  onClick={() => trackEvent("skill_network_cta", { locale: locale as string })}
                >
                  {cta}
                  <ArrowIcon className="transition-transform duration-300 group-hover:translate-x-1 rtl:-scale-x-100 rtl:group-hover:-translate-x-1" />
                </a>
              </div>
            </div>
          </Reveal>
        </div>
      </section>
      <Seam cyan />
    </>
  );
}
