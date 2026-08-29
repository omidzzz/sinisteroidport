"use client";

import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";
import type { CmdEntry } from "./CommandPalette";
import type { Locale } from "@/lib/i18n";

const CommandPalette = dynamic(() => import("./CommandPalette"), { ssr: false });
const EasterEgg = dynamic(() => import("./EasterEgg"), { ssr: false });

const KONAMI = [
  "ArrowUp",
  "ArrowUp",
  "ArrowDown",
  "ArrowDown",
  "ArrowLeft",
  "ArrowRight",
  "ArrowLeft",
  "ArrowRight",
  "b",
  "a",
];

/**
 * Lazy overlay loaders — CommandPalette and EasterEgg are never needed for
 * first paint. next/dynamic with ssr:false only CODE-SPLITS; the component
 * would still mount + hydrate on every route. This wrapper defers the mount
 * itself: two cheap global listeners (one keydown, one click) capture the
 * triggers while the overlays are unmounted, the real component mounts on
 * first use (or during a long idle pre-warm), and `autoOpen` carries the
 * triggering intent into the first render. Zero visual/behavior change —
 * the overlays just cost nothing until used.
 */
export function CommandPaletteLazy({
  locale,
  entries,
}: {
  locale: Locale;
  entries: CmdEntry[];
}) {
  const [mount, setMount] = useState(false);
  const [autoOpen, setAutoOpen] = useState(false);
  const mounted = useRef(false);

  useEffect(() => {
    // Unmounted trigger: mount the palette, opened. Mounted trigger: the
    // palette's own listener handles the event — never re-dispatch here.
    const request = () => {
      if (mounted.current) {
        window.dispatchEvent(new CustomEvent("open-command-palette"));
      } else {
        setAutoOpen(true);
        setMount(true);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const typing =
        target?.tagName === "INPUT" ||
        target?.tagName === "TEXTAREA" ||
        target?.isContentEditable;
      const matchK = (e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k";
      const matchSlash = e.key === "/" && !typing;
      if (matchK || matchSlash) {
        e.preventDefault();
        request();
      }
    };
    window.addEventListener("keydown", onKey);
    window.addEventListener("open-command-palette", request);

    // Pre-warm: pull + hydrate the chunk during idle, long after LCP, so
    // the very first open is instant. 12s hard cap keeps it off slow CPUs.
    let warm: number | undefined;
    if (typeof window.requestIdleCallback === "function") {
      const id = window.requestIdleCallback(() => setMount(true), {
        timeout: 12000,
      });
      warm = id as unknown as number;
    } else {
      warm = window.setTimeout(() => setMount(true), 6000);
    }
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("open-command-palette", request);
      if (typeof window.cancelIdleCallback === "function" && warm !== undefined)
        window.cancelIdleCallback(warm);
      else if (warm !== undefined) window.clearTimeout(warm);
    };
  }, []);

  useEffect(() => {
    if (mount) mounted.current = true;
  }, [mount]);

  return mount ? <CommandPalette locale={locale} entries={entries} autoOpen={autoOpen} /> : null;
}

export function EasterEggLazy({ locale }: { locale: Locale }) {
  const [mount, setMount] = useState(false);
  const [autoOpen, setAutoOpen] = useState(false);

  // Capture the egg's triggers while it is unmounted. Once mounted, the egg
  // runs its own identical listeners — duplicate counters are harmless (both
  // only ever call open).
  useEffect(() => {
    let pos = 0;
    let clicks = 0;
    const fire = () => {
      setAutoOpen(true);
      setMount(true);
    };
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (target?.tagName === "INPUT" || target?.tagName === "TEXTAREA") return;
      if (e.key === KONAMI[pos]) {
        pos += 1;
        if (pos === KONAMI.length) {
          pos = 0;
          fire();
        }
      } else {
        pos = e.key === KONAMI[0] ? 1 : 0;
      }
    };
    const onClick = (e: MouseEvent) => {
      const t = e.target as HTMLElement | null;
      if (t?.closest?.("[data-logo-activate]")) {
        clicks += 1;
        if (clicks >= 7) {
          clicks = 0;
          fire();
        }
      }
    };
    window.addEventListener("keydown", onKey);
    document.addEventListener("click", onClick);
    return () => {
      window.removeEventListener("keydown", onKey);
      document.removeEventListener("click", onClick);
    };
  }, []);

  return mount ? <EasterEgg locale={locale} autoOpen={autoOpen} /> : null;
}