"use client";

import Reveal from "./Reveal";
import { ArrowIcon } from "./icons";

/**
 * Showcase — asymmetric bento "broadcast wall".
 * A 4-column interlocking patchwork: tiles span 1–2 columns and drift
 * up/down so the columns break into a dynamic, slightly off-register wall.
 * Giant ghost indices bleed behind each tile; compact frames keep the
 * low-res animated webps small; hover raises a tile to acid and sweeps a
 * scanline. RTL-safe, tileable, reduced-motion inert.
 */

export interface Project {
  name: string;
  image: string;
  description: string;
  tags: string[];
}

/* Per-project grid config: span (1|2 cols) + drift */
const SPANS = [2, 1, 1, 2, 1, 2, 1] as const;
const DRIFT: Array<"up" | "down" | ""> = ["down", "up", "down", "up", "", "down", "up"];

const driftClass = (d: string) =>
  d === "up" ? "bento-up" : d === "down" ? "bento-down" : "";

function ProjectTags({ tags }: { tags: string[] }) {
  const shown = tags.slice(0, 2);
  const extra = tags.length - shown.length;
  return (
    <div className="bento-tags">
      {shown.map((tag) => (
        <span key={tag} className="bento-tag">
          {tag}
        </span>
      ))}
      {extra > 0 && <span className="bento-tag bento-tag-dim">+{extra}</span>}
      <ArrowIcon className="bento-arrow" />
    </div>
  );
}

export default function ProjectIndex({ projects }: { projects: Project[] }) {
  return (
    <div className="bento-wall mt-16 sm:mt-20">
      {projects.map((project, i) => {
        const span = `bento-s${SPANS[i] ?? 1}`;
        const drift = driftClass(DRIFT[i] ?? "");
        const n = String(i + 1).padStart(2, "0");
        return (
          <Reveal
            key={project.name}
            variant={i % 2 ? "right" : "left"}
            className={`bento-cellwrap ${span} ${drift}`}
          >
            <article className="bento">
              <span aria-hidden className="bento-ghost">
                {n}
              </span>
              <div className="bento-head">
                <span className="bento-index">{n}</span>
                <span className="bento-type">{project.tags[0] ?? "case"}</span>
              </div>
              <div className="bento-frame">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={project.image}
                  alt={`${project.name} preview`}
                  width={424}
                  height={240}
                  decoding="async"
                  loading="lazy"
                />
                <span aria-hidden className="bento-scan" />
              </div>
              <h3 className="bento-name">{project.name}</h3>
              <p className="bento-desc">{project.description}</p>
              <ProjectTags tags={project.tags} />
            </article>
          </Reveal>
        );
      })}
    </div>
  );
}