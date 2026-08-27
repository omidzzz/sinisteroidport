"use client";

import { useEffect, useRef, useState } from "react";

export interface Project {
  name: string;
  image: string;
  description: string;
  tags: string[];
}

/**
 * Editorial project index with a cursor-following image preview
 * (desktop / fine-pointer only). The preview lerps toward the pointer
 * and crossfades between preloaded images.
 */
export default function ProjectIndex({ projects }: { projects: Project[] }) {
  const [active, setActive] = useState<number | null>(null);
  const previewRef = useRef<HTMLDivElement>(null);
  const fine = useRef(true);

  useEffect(() => {
    fine.current = window.matchMedia("(pointer: fine)").matches;
    if (!fine.current) return;

    let mx = 0;
    let my = 0;
    let px = 0;
    let py = 0;
    let raf = 0;

    const onMove = (e: MouseEvent) => {
      mx = e.clientX;
      my = e.clientY;
    };

    const loop = () => {
      raf = requestAnimationFrame(loop);
      px += (mx - px) * 0.11;
      py += (my - py) * 0.11;
      const el = previewRef.current;
      if (el) {
        el.style.transform = `translate3d(${px + 28}px, ${py - 140}px, 0) rotate(${((mx - px) * 0.02).toFixed(2)}deg)`;
        el.style.opacity = active === null ? "0" : "1";
      }
    };

    window.addEventListener("mousemove", onMove, { passive: true });
    raf = requestAnimationFrame(loop);
    return () => {
      window.removeEventListener("mousemove", onMove);
      cancelAnimationFrame(raf);
    };
  }, [active]);

  return (
    <>
      {/* Floating preview — desktop only */}
      <div
        ref={previewRef}
        aria-hidden
        className="pointer-events-none fixed left-0 top-0 z-40 hidden h-56 w-80 overflow-hidden border border-line opacity-0 transition-opacity duration-300 lg:block"
      >
        {projects.map((p, i) => (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            key={`${p.name}-${active === i ? "on" : "off"}`}
            src={p.image}
            alt=""
            className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-300 ${
              active === i ? "project-wipe opacity-100" : "opacity-0"
            }`}
          />
        ))}
      </div>

      <ul className="mt-16">
        {projects.map((project, i) => (
          <li key={project.name}>
            <article
              data-cursor
              onMouseEnter={() => fine.current && setActive(i)}
              onMouseLeave={() => setActive(null)}
              className="group grid cursor-none grid-cols-[auto_1fr] items-baseline gap-x-6 gap-y-3 border-t border-line py-8 transition-colors duration-300 last:border-b hover:bg-panel/40 lg:grid-cols-[4rem_1fr_1fr]"
            >
              <span className="font-mono text-xs text-muted transition-colors group-hover:text-accent">
                {String(i + 1).padStart(2, "0")}
              </span>
              <h2 className="text-3xl font-semibold tracking-tight transition-all duration-300 group-hover:translate-x-3 group-hover:text-accent sm:text-5xl">
                {project.name}
              </h2>
              <div>
                <p className="max-w-md text-sm leading-relaxed text-muted">
                  {project.description}
                </p>
                <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-1 font-mono text-[0.65rem] uppercase tracking-wider text-muted">
                  {project.tags.map((tag) => (
                    <li key={tag}>{tag}</li>
                  ))}
                </ul>
                {/* inline thumbnail on touch layouts */}
                <img
                  src={project.image}
                  alt={`${project.name} preview`}
                  loading="lazy"
                  className="mt-5 aspect-video w-full object-cover lg:hidden"
                />
              </div>
            </article>
          </li>
        ))}
      </ul>
    </>
  );
}
