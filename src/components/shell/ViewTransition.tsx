"use client";

/**
 * VIEW TRANSITIONS — native `document.startViewTransition` wrapped around
 * Next's SPA navigation (no experimental flags needed).
 *
 * VTLink is a drop-in <Link> replacement for the site chrome. It intercepts
 * plain left-clicks on internal routes: the browser snapshots the old frame,
 * the callback runs router.push, and the returned promise resolves once the
 * new page has actually painted (ViewTransitionBridge resolves it on the
 * first pathname change). The chrome — dock, brand chip, mobile pill — is
 * captured as its own layer (view-transitions.css) and stays pinned while
 * the page content cross-fades underneath.
 *
 * Fails soft everywhere:
 *  - no startViewTransition (Firefox)      → plain navigation
 *  - prefers-reduced-motion                → plain navigation
 *  - navigation never commits (1600ms cap) → snapshot released, UI unfrozen
 * Full-document loads (language swap, the command palette's
 * location.assign) get the cross-document `@view-transition` treatment
 * from src/styles/view-transitions.css instead.
 */

import Link from "next/link";
import { useEffect, useRef } from "react";
import { usePathname, useRouter } from "next/navigation";
import type { ComponentProps, MouseEvent } from "react";

type VTDocument = Document & {
  startViewTransition?: (
    update: () => void | Promise<void>
  ) => { finished: Promise<void> };
};

/** The one in-flight transition, if any (module scope: one document). */
let pending: {
  resolve: () => void;
  timer: ReturnType<typeof setTimeout>;
} | null = null;

/**
 * Start a view transition around a navigation. Returns false when the
 * browser can't animate (unsupported / reduced motion) — callers should
 * then let the normal navigation proceed untouched.
 */
export function startVT(navigate: () => void): boolean {
  const doc = document as VTDocument;
  if (typeof doc.startViewTransition !== "function") return false;
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    return false;
  }
  // A hidden document has no rendering to snapshot — startViewTransition
  // would abort with "invalid state".
  if (document.visibilityState === "hidden") return false;
  // A second click while a transition is still waiting: release the old
  // snapshot immediately so we never stack frames.
  if (pending) {
    clearTimeout(pending.timer);
    pending.resolve();
    pending = null;
  }
  let resolve!: () => void;
  const committed = new Promise<void>((r) => {
    resolve = r;
  });
  // Hard cap — if the navigation never commits (offline, stalled chunk) the
  // old-frame snapshot must be released or the page would look frozen.
  const timer = setTimeout(resolve, 1600);
  pending = { resolve, timer };
  const vt = doc.startViewTransition(() => {
    navigate();
    return committed;
  });
  // Starting a new transition (rapid double-click) or losing the document's
  // rendering state aborts the in-flight one — its ready/finished promises
  // then reject. Both are expected, never user-visible: swallow them so the
  // rejection never surfaces as an unhandled error.
  vt.ready.catch(() => {});
  vt.finished.catch(() => {});
  return true;
}

/**
 * Mounted once in the locale layout. Watches pathname changes and resolves
 * the pending transition after the new page has painted (two frames:
 * commit → paint), so the "new" snapshot holds real content. When no VT
 * was pending (fallback navigation, see GlobalVTNav), it instead plays the
 * CSS page-enter reveal on <html>.
 */
export function ViewTransitionBridge() {
  const pathname = usePathname();
  const mounted = useRef(false);

  useEffect(() => {
    if (!mounted.current) {
      mounted.current = true;
      return; // skip the initial mount — that's not a route change
    }
    if (pending) {
      clearTimeout(pending.timer);
      const p = pending;
      pending = null;
      requestAnimationFrame(() => requestAnimationFrame(() => p.resolve()));
    } else {
      // A fallback (non-VT) navigation just committed — play the enter reveal.
      const root = document.documentElement;
      root.classList.remove("page-exit");
      root.classList.add("page-enter");
      window.setTimeout(() => root.classList.remove("page-enter"), 700);
    }
  }, [pathname]);

  return null;
}

/**
 * GLOBAL NAV INTERCEPTOR — catches clicks on ANY internal link in the
 * document (content cards, hero CTAs, dock, footer, related posts —
 * everything), not just the chrome that used VTLink. Wraps the navigation
 * in a view transition, so the whole site animates on route change.
 *
 *  - View Transitions API present → startVT() around router.push.
 *  - No API (Firefox)             → 180ms opacity "page-exit", then push;
 *                                   the Bridge plays "page-enter" on arrival.
 *  - Reduced motion               → untouched plain navigation.
 *
 * Excluded on purpose: locale swaps (dir/lang live on <html>, which the
 * SPA router can't re-render — they keep their full-document load and ride
 * the @view-transition rule), external/protocol/hash anchors, blank-target
 * and download links, and anything already handled (defaultPrevented) —
 * which includes VTLink's own handlers (no double transitions).
 */
export function GlobalVTNav() {
  const router = useRouter();

  useEffect(() => {
    const onClick = (e: PointerEvent) => {
      if (
        e.defaultPrevented ||
        e.button !== 0 ||
        e.metaKey ||
        e.ctrlKey ||
        e.shiftKey ||
        e.altKey
      ) {
        return;
      }
      const anchor = (e.target as HTMLElement | null)?.closest?.("a");
      if (!anchor) return;
      if (anchor.target === "_blank" || anchor.hasAttribute("download")) return;
      const href = anchor.getAttribute("href");
      if (!href) return;
      if (href.startsWith("#") || /^(https?:|mailto:|tel:)/i.test(href)) return;
      const target = href.split(/[?#]/)[0];
      if (!target || target === location.pathname) return;
      // Locale swap → keep the full-document load (see doc comment).
      const nextLocale = /^\/(en|fa)(\/|$)/.exec(target)?.[1];
      const curLocale = /^\/(en|fa)(\/|$)/.exec(location.pathname)?.[1];
      if (nextLocale && curLocale && nextLocale !== curLocale) return;

      const go = () => router.push(href);
      if (startVT(go)) {
        e.preventDefault();
        return;
      }
      // Fallback for browsers without the API (Firefox & friends).
      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
      e.preventDefault();
      document.documentElement.classList.add("page-exit");
      window.setTimeout(go, 180);
    };
    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, [router]);

  return null;
}

type LinkProps = ComponentProps<typeof Link>;

/** <Link> that plays a view transition on plain internal navigations. */
export default function VTLink({ href, onClick, ...rest }: LinkProps) {
  const router = useRouter();
  const pathname = usePathname();

  const handleClick = (e: MouseEvent<HTMLAnchorElement>) => {
    onClick?.(e);
    if (e.defaultPrevented) return;
    // modifier-clicks / middle-click: let the browser do its thing
    if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) {
      return;
    }
    if (typeof href !== "string") return;
    // hashes, external URLs and protocol links are not route transitions
    if (href.startsWith("#") || /^(https?:|mailto:|tel:)/i.test(href)) return;
    const target = href.split(/[?#]/)[0];
    if (!target || target === pathname) return;
    if (startVT(() => router.push(href))) e.preventDefault();
  };

  return <Link href={href} {...rest} onClick={handleClick} />;
}
