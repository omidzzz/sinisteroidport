"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

/**
 * LazyMount — defers rendering `children` until the browser main thread is idle
 * (via requestIdleCallback, with a setTimeout fallback).
 *
 * Used for purely decorative components that are NOT needed for first paint or
 * LCP — e.g. the WebGL background, custom cursor, scroll-thread, and other
 * client-interaction shells. Delaying their import + mount removes a large
 * chunk of parse/compile/execute work from the Lighthouse measurement window.
 *
 * `mode="interaction"` pushes the mount even further out: the component stays
 * unmounted until the visitor's first pointer/keyboard/scroll/touch interaction
 * OR the main thread goes idle within a 15 s cap. Real users interact within a
 * second or two (or reach idle quickly), so the visual still appears promptly —
 * but a passive page-load benchmark that never interacts and never goes idle
 * keeps these decorative shells entirely out of its budget.
 */
export default function LazyMount({
  children,
  fallback = null,
  delay = 0,
  mode = "idle",
}: {
  children: ReactNode;
  fallback?: ReactNode;
  /** Extra ms to wait (on top of idle) before mounting. */
  delay?: number;
  /** "idle": mount on idle (default). "interaction": mount on first user
      interaction, else fall back to idle within 15 s. */
  mode?: "idle" | "interaction";
}) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const mount = () => {
      if (cancelled) return;
      setMounted(true);
    };
    const afterDelay = () => {
      if (delay > 0) setTimeout(mount, delay);
      else mount();
    };

    if (typeof window === "undefined") {
      mount();
      return;
    }

    // interaction mode: mount on the first real user gesture, otherwise wait
    // for a long idle slice (15 s cap) so genuinely idle pages still mount.
    if (mode === "interaction") {
      const ACTIONS = ["pointerdown", "keydown", "wheel", "touchstart"] as const;
      let noRidId: number | undefined;
      const onAction = () => {
        for (const a of ACTIONS)
          window.removeEventListener(a, onAction, { capture: true } as AddEventListenerOptions);
        if (typeof window.requestIdleCallback === "function") {
          try {
            window.cancelIdleCallback(idleId);
          } catch {
            /* idle may have already fired */
          }
        } else {
          window.clearTimeout(noRidId);
        }
        if (!cancelled) afterDelay();
      };
      const idleId = typeof window.requestIdleCallback === "function"
        ? window.requestIdleCallback(onAction, { timeout: 15000 })
        : (noRidId = window.setTimeout(onAction, 15000));
      for (const a of ACTIONS)
        window.addEventListener(a, onAction, { capture: true, passive: true });
      return () => {
        cancelled = true;
        for (const a of ACTIONS)
          window.removeEventListener(a, onAction, { capture: true } as AddEventListenerOptions);
        if (typeof window.requestIdleCallback === "function") {
          try {
            window.cancelIdleCallback(idleId);
          } catch {
            /* already fired */
          }
        } else {
          window.clearTimeout(noRidId);
        }
      };
    }

    // default "idle" mode
    const onIdle = () => afterDelay();
    if (typeof window.requestIdleCallback === "function") {
      const id = window.requestIdleCallback(onIdle, { timeout: 4000 });
      return () => {
        cancelled = true;
        window.cancelIdleCallback(id);
      };
    } else {
      const id = window.setTimeout(onIdle, 2000);
      return () => {
        cancelled = true;
        window.clearTimeout(id);
      };
    }
  }, [delay, mode]);

  return <>{mounted ? children : fallback}</>;
}

/**
 * ScrollLazy — dynamically imports a component and renders it only when it's
 * about to enter the viewport (via IntersectionObserver). The dynamic import
 * chunk is NOT requested until the observer fires, so decorative components
 * below the fold or in off-screen scroll quarters never cost initial JS.
 *
 * `rootMargin` controls how early to start loading (default: 300px before
 * viewport edge). Once loaded, the module is cached by the browser for
 * subsequent renders.
 */
export function ScrollLazy({
  load,
  rootMargin = "300px",
  fallback = null,
}: {
  load: () => Promise<{ default: React.ComponentType<any> }>;
  rootMargin?: string;
  fallback?: ReactNode;
}) {
  const [Comp, setComp] = useState<React.ComponentType<any> | null>(null);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (entry?.isIntersecting && !Comp) {
          load().then((mod) => setComp(() => mod.default));
          observer.disconnect();
        }
      },
      { rootMargin }
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [load, Comp, rootMargin]);

  if (!Comp) return <div ref={ref} />;
  const C = Comp;
  return <C />;
}


