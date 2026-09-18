"use client";

import type { CSSProperties } from "react";
import type { NavRoute } from "@/lib/nav/types";

/** Custom properties have no place in React's CSSProperties type. */
const vars = (entries: Record<string, string | number>): CSSProperties =>
  entries as CSSProperties;

/**
 * The node ring — the console's spatial flourish.
 *
 * The eight routes bloom onto a ring around the prompt, connected by
 * hairlines, and the whole ring leans toward the pointer: the container
 * reads --ring-x / --ring-y / --ring-a (written by usePointerRing in one
 * rAF loop, never through React state) and each node offsets itself along
 * its own radius. Purely decorative — aria-hidden, pointer-events: none,
 * and every node it shows is also a real row in the tree.
 */
export default function ConsoleRing({
  routes,
  hotId,
}: {
  routes: readonly NavRoute[];
  /** Route id under the keyboard cursor (or "" when a verb is selected). */
  hotId?: string;
}) {
  if (routes.length === 0) return null;

  return (
    <div className="craft-ring" aria-hidden>
      <span className="craft-ring-hub" />
      {routes.map((route, index) => (
        <span
          key={route.id}
          className="craft-node"
          data-hot={route.id === hotId || undefined}
          style={vars({ "--i": index, "--n": routes.length })}
        >
          <i className="craft-node-dot" />
          <em className="craft-node-label">{route.label}</em>
        </span>
      ))}
    </div>
  );
}