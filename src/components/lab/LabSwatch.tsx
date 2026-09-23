"use client";

import { useEffect, useRef, useState } from "react";
import { writeClipboard } from "./svgExport";

/**
 * LAB SWATCH — one palette row as a press surface.
 *
 * The hex copies itself; the token copies `var(--…)`. The labels swap to a
 * "copied" voice for 1.6 s and then fall back — the same flash contract the
 * email chip and the plate actions keep, so every copy moment on the route
 * feels like the same gesture.
 */
export default function LabSwatch({
  hex,
  token,
  role,
  labels,
}: {
  hex: string;
  token: string;
  role: string;
  labels: { copy: string; copied: string };
}) {
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [done, setDone] = useState<"hex" | "token" | null>(null);

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    []
  );

  const copy = async (text: string, kind: "hex" | "token") => {
    if (await writeClipboard(text)) {
      setDone(kind);
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => setDone(null), 1600);
    }
  };

  return (
    <li className="lab-swatch">
      <span className="lab-swatch-chip" style={{ background: hex }} aria-hidden />
      <button
        type="button"
        className="lab-copy"
        data-done={done === "hex" || undefined}
        onClick={() => copy(hex, "hex")}
        aria-label={`${labels.copy}: ${hex}`}
      >
        <span className="lab-copy-text" dir="ltr">
          {done === "hex" ? labels.copied : hex}
        </span>
      </button>
      <button
        type="button"
        className="lab-copy"
        data-done={done === "token" || undefined}
        onClick={() => copy(`var(${token});`, "token")}
        aria-label={`${labels.copy}: ${token}`}
      >
        <span className="lab-copy-sub" dir="ltr">
          {done === "token" ? labels.copied : token}
        </span>
      </button>
      <span className="lab-swatch-role">{role}</span>
    </li>
  );
}
