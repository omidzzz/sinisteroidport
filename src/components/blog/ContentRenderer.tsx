"use client";

import type { ContentBlock } from "@/lib/blog/types";
import { ArrowIcon } from "../ui/icons";

function altText(alt: ContentBlock["altText"]): string {
  if (!alt) return "";
  return typeof alt === "string" ? alt : alt.en ?? "";
}

export default function ContentRenderer({ blocks }: { blocks: ContentBlock[] }) {
  if (!Array.isArray(blocks)) return null;

  let figIndex = 0;

  return (
    <div className="prose-post">
      {blocks.map((block, i) => {
        switch (block.type) {
          case "heading": {
            const level = Math.min(Math.max(block.level ?? 2, 2), 4);
            const Tag = (`h${level}` as unknown) as "h2";
            if (level <= 1) {
              /* In-content H1: big statement + short accent underline bar */
              return (
                <Tag key={i} className="mt-12 mb-6">
                  <span className="text-2xl font-bold leading-tight text-ink sm:text-3xl">
                    {block.text}
                  </span>
                  <span
                    aria-hidden
                    className="mt-4 block h-0.5 w-14 bg-accent"
                  />
                </Tag>
              );
            }
            if (level === 2) {
              /* Section divider: mono # marker over a hairline rule.
                 Deterministic id (block index) — the post TOC links to it. */
              return (
                <Tag
                  key={i}
                  id={`sec-${i}`}
                  className="mt-14 mb-5 flex items-baseline gap-3 border-b border-line pb-3"
                >
                  <span
                    aria-hidden
                    className="font-mono text-sm font-bold text-accent"
                  >
                    #
                  </span>
                  <span className="text-xl font-bold text-ink sm:text-2xl">
                    {block.text}
                  </span>
                </Tag>
              );
            }
            if (level === 3) {
              /* Sub-section: mono // marker, no rule */
              return (
                <Tag key={i} id={`sec-${i}`} className="mt-10 mb-3 flex items-baseline gap-2">
                  <span
                    aria-hidden
                    className="font-mono text-xs font-bold text-accent"
                  >
                    {"//"}
                  </span>
                  <span className="text-lg font-semibold text-ink">
                    {block.text}
                  </span>
                </Tag>
              );
            }
            /* H4+: quiet dash marker */
            return (
              <Tag key={i} className="mt-8 mb-2 flex items-baseline gap-2">
                <span aria-hidden className="font-mono text-xs text-accent">
                  —
                </span>
                <span className="font-semibold text-ink">{block.text}</span>
              </Tag>
            );
          }
          case "paragraph":
            return (
              <p
                key={i}
                className={
                  block.style === "lead"
                    ? "mb-8 border-s-2 border-accent ps-5 text-lg leading-relaxed text-ink sm:text-xl"
                    : "leading-relaxed text-muted"
                }
              >
                {block.text}
              </p>
            );
          case "list": {
            const items = (block.items ?? []).filter(
              (item): item is string => typeof item === "string"
            );
            if (!items.length) return null;
            if (block.style === "ordered") {
              return (
                <ol key={i} className="mb-6 space-y-3">
                  {items.map((item, j) => (
                    <li key={j} className="flex gap-4">
                      <span
                        aria-hidden
                        dir="ltr"
                        className="shrink-0 pt-0.5 font-mono text-xs font-bold tracking-widest text-accent"
                      >
                        {String(j + 1).padStart(2, "0")}
                      </span>
                      <span className="leading-relaxed text-muted">{item}</span>
                    </li>
                  ))}
                </ol>
              );
            }
            return (
              <ul key={i} className="mb-6 space-y-3">
                {items.map((item, j) => (
                  <li key={j} className="flex gap-3.5">
                    <span
                      aria-hidden
                      className="mt-[0.55em] h-1.5 w-1.5 shrink-0 rotate-45 bg-accent"
                    />
                    <span className="leading-relaxed text-muted">{item}</span>
                  </li>
                ))}
              </ul>
            );
          }
          case "highlight":
            return (
              <aside
                key={i}
                className="my-10 border border-accent/40 bg-panel/60 p-5 shadow-[0_0_24px_rgba(60,226,255,0.08)]"
              >
                {block.label && (
                  <p className="mb-2 font-mono text-xs font-bold uppercase tracking-widest text-accent">
                    [{block.label}]
                  </p>
                )}
                <p className="leading-relaxed text-ink">{block.text}</p>
              </aside>
            );
          case "quote":
            return (
              <blockquote
                key={i}
                className="relative my-10 border-s-2 border-accent bg-panel/40 py-5 pe-6 ps-12 italic text-ink"
              >
                <span
                  aria-hidden
                  className="absolute start-4 top-3 font-mono text-4xl leading-none text-accent"
                >
                  &ldquo;
                </span>
                <p className="leading-relaxed">{block.text}</p>
                {block.author && (
                  <footer className="mt-3 font-mono text-xs not-italic tracking-widest text-muted">
                    — {block.author}
                  </footer>
                )}
              </blockquote>
            );
          case "image": {
            const src = block.src ?? "";
            if (!src) return null;
            figIndex += 1;
            /* eslint-disable @next/next/no-img-element */
            return (
              <figure key={i} className="group my-10">
                <div className="border border-line bg-panel p-1.5 transition-all duration-300 group-hover:border-accent/40 group-hover:shadow-[0_0_30px_rgba(60,226,255,0.07)]">
                  <img
                    src={src}
                    alt={altText(block.altText)}
                    loading="lazy"
                    className="w-full object-cover"
                  />
                </div>
                {block.caption && (
                  <figcaption className="mt-3 text-center font-mono text-xs leading-relaxed text-muted">
                    <span className="text-accent" dir="ltr">
                      [FIG.{figIndex}]
                    </span>{" "}
                    {block.caption}
                  </figcaption>
                )}
              </figure>
            );
          }
          case "cta":
            return (
              <div
                key={i}
                className="group relative my-10 border border-dashed border-accent/40 bg-panel/60 p-7 text-center"
              >
                {/* corner ticks */}
                <span
                  aria-hidden
                  className="absolute -start-px -top-px h-3 w-3 border-s-2 border-t-2 border-accent transition-colors group-hover:border-solid group-hover:border-accent"
                />
                <span
                  aria-hidden
                  className="absolute -end-px -top-px h-3 w-3 border-e-2 border-t-2 border-accent transition-colors group-hover:border-solid group-hover:border-accent"
                />
                <span
                  aria-hidden
                  className="absolute -bottom-px -start-px h-3 w-3 border-b-2 border-s-2 border-accent transition-colors group-hover:border-solid group-hover:border-accent"
                />
                <span
                  aria-hidden
                  className="absolute -bottom-px -end-px h-3 w-3 border-b-2 border-e-2 border-accent transition-colors group-hover:border-solid group-hover:border-accent"
                />
                <h3 className="text-lg font-bold text-ink">{block.title}</h3>
                {block.text && (
                  <p className="mx-auto mt-2 max-w-prose text-sm leading-relaxed text-muted">
                    {block.text}
                  </p>
                )}
                {block.buttonUrl && (
                  <a
                    href={block.buttonUrl}
                    className="mt-5 inline-flex items-center gap-2 border border-accent px-6 py-2.5 font-mono text-xs font-bold uppercase tracking-widest text-accent transition-colors duration-200 hover:bg-accent hover:text-bg"
                  >
                    {block.buttonText ?? "Read more"}
                    <ArrowIcon className="transition-transform duration-200 group-hover:translate-x-0.5 rtl:-scale-x-100 rtl:group-hover:-translate-x-0.5" />
                  </a>
                )}
              </div>
            );
          case "stats": {
            const stats = (block.items ?? []).filter(
              (item): item is { value: string; label: string } =>
                typeof item === "object" && item !== null && "value" in item
            );
            if (!stats.length) return null;
            /* Adaptive columns: hairline-grid of stat cells */
            const cols =
              stats.length === 2
                ? "sm:grid-cols-2"
                : stats.length === 4
                  ? "sm:grid-cols-4"
                  : "sm:grid-cols-3";
            return (
              <div
                key={i}
                className={`my-10 grid grid-cols-1 gap-px border border-line bg-line ${cols}`}
              >
                {stats.map((stat, j) => (
                  <div key={j} className="relative bg-panel p-5">
                    <span
                      aria-hidden
                      className="absolute start-0 top-0 h-0.5 w-8 bg-accent"
                    />
                    <p
                      dir="auto"
                      className="font-mono text-2xl font-bold text-accent"
                    >
                      {stat.value}
                    </p>
                    <p className="mt-2 text-sm leading-relaxed text-muted">
                      {stat.label}
                    </p>
                  </div>
                ))}
              </div>
            );
          }
          case "alert": {
            /* Custom monoline SVG markers — no glyph characters */
            const icons: Record<string, React.ReactNode> = {
              warning: (
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                  <path d="M12 3 2 20h20L12 3z" />
                  <path d="M12 10v4m0 3v.01" />
                </svg>
              ),
              tip: (
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" aria-hidden>
                  <path d="M12 3l7 9-7 9-7-9z" />
                </svg>
              ),
              info: (
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
                  <circle cx="12" cy="12" r="9" />
                  <path d="M12 11v5m0-8v.01" />
                </svg>
              ),
            };
            const variants: Record<
              string,
              { box: string; tone: string }
            > = {
              warning: {
                box: "border-(--warn)/60 bg-(--warn)/5",
                tone: "border-(--warn) text-(--warn)",
              },
              tip: {
                box: "border-accent/50 bg-accent/[0.04]",
                tone: "border-accent text-accent",
              },
              info: {
                box: "border-dashed border-line bg-panel/60",
                tone: "border-muted text-muted",
              },
            };
            const style = block.alertStyle ?? "info";
            const v = variants[style] ?? variants.info;
            return (
              <aside key={i} className={`my-10 border p-5 ${v.box}`}>
                {block.title && (
                  <p className="mb-3 flex items-center gap-2.5">
                    <span
                      aria-hidden
                      dir="ltr"
                      className={`flex h-5 w-5 shrink-0 items-center justify-center border ${v.tone}`}
                    >
                      {icons[style] ?? icons.info}
                    </span>
                    <span
                      className={`font-mono text-xs font-bold uppercase tracking-widest ${v.tone.split(" ")[1]}`}
                    >
                      {block.title}
                    </span>
                  </p>
                )}
                <p className="leading-relaxed text-muted">{block.text}</p>
              </aside>
            );
          }
          case "code":
            return (
              <div
                key={i}
                className="my-10 overflow-hidden rounded-lg border border-line bg-panel"
              >
                {/* terminal chrome */}
                <div
                  dir="ltr"
                  className="flex items-center gap-1.5 border-b border-line px-4 py-2.5"
                >
                  <span aria-hidden className="h-2.5 w-2.5 rounded-full bg-[#fb923c]/70" />
                  <span aria-hidden className="h-2.5 w-2.5 rounded-full bg-muted/40" />
                  <span aria-hidden className="h-2.5 w-2.5 rounded-full bg-accent/70" />
                  <span className="ms-auto label">sh</span>
                </div>
                <pre dir="ltr" className="overflow-x-auto p-4">
                  <code className="font-mono text-xs leading-relaxed text-muted">
                    {block.code}
                  </code>
                </pre>
              </div>
            );
          case "table": {
            const headers = block.headers ?? [];
            const rows = block.rows ?? [];
            if (!headers.length || !rows.length) return null;
            return (
              <div key={i} className="my-8 overflow-x-auto">
                <table className="w-full border-collapse border border-line text-sm">
                  <thead>
                    <tr>
                      {headers.map((h) => (
                        <th
                          key={h}
                          className="border border-line bg-panel px-3 py-2 text-start font-mono text-xs uppercase tracking-wider text-accent"
                        >
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((row, ri) => (
                      <tr key={ri} className="odd:bg-panel/40">
                        {row.map((cell, ci) => (
                          <td key={ci} className="border border-line px-3 py-2 text-muted">
                            {cell}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            );
          }
          default:
            return null;
        }
      })}
    </div>
  );
}