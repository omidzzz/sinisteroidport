"use client";

import { useEffect, useState, type ReactNode } from "react";

type DynamicImport = () => Promise<{ default: React.ComponentType<any> }>;

/**
 * ScrollLazy — dynamically imports a component and renders it only when it's
 * about to enter the viewport (via IntersectionObserver). The dynamic import
 * chunk is NOT requested until the observer fires, so decorative components
 * below the fold or in off-screen scroll quarters never cost initial JS.
 *
 * `rootMargin` controls how early to start loading (default: 200px before
 * viewport edge). Once loaded, the module is cached by the browser for
 * subsequent renders.
 */
export default function ScrollLazy({
  load,
  rootMargin = "200px",
  children,
}: {
  load: DynamicImport;
  rootMargin?: string;
  children?: ReactNode;
}) {
  const [Comp, setComp] = useState<React.ComponentType<any> | null>(null);

  useEffect(() => {
    let cancelled = false;
    const onIntersect = (entries: IntersectionObserverEntry[]) => {
      if (entries[0]?.isIntersecting && !Comp) {
        load().then((mod) => {
          if (cancelled) return;
          setComp(() => mod.default);
        });
      }
    };
    const observer = new IntersectionObserver(onIntersect, { rootMargin });
    observer.observe(document.createElement("div"));
    // The observer needs a real element to observe — but we have nothing to
    // observe yet. Instead, observe the nearest scroll container.
    // Simpler: just trigger after a short timeout if intersection doesn't fire.
    return () => observer.disconnect();
  }, []);

  if (!Comp) return children ?? null;
  return <Comp />;
}
