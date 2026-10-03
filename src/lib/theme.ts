/**
 * Shared theme helper — single source of truth for the light/dark flip.
 *
 * Writes `data-theme` on <html> (the CSS tokens re-map from there), persists
 * to localStorage and broadcasts the existing "themechange" event so canvas
 * renderers (GLBackground) repaint without a reload.
 *
 * Deliberately plain-synchronous. A startViewTransition-wrapped flip caused
 * a hard visual bug on some engines: flipping `color-scheme` mid-view
 * transition can leave the whole page rendering white until a later repaint.
 * A small crossfade is not worth the risk of a broken first look.
 *
 * Theme grounds are owned by lib/brand.ts (BRAND.themeColors) so the flip
 * can never point the system chrome at a colour the tokens no longer ship.
 */
import { BRAND } from "./brand";

export type Theme = "light" | "dark";

export function currentTheme(): Theme {
  return document.documentElement.dataset.theme === "light" ? "light" : "dark";
}

export function setTheme(next: Theme): void {
  const root = document.documentElement;
  if (root.dataset.theme === next) return;
  root.dataset.theme = next;
  // The Safari/Android URL bar and the add-to-home-screen chrome are painted
  // from this meta, not from the page, so a flip has to re-point it or the
  // system chrome keeps the old edition's ground. THEME_INIT does the same for
  // the first paint; the tag is null-safe in case a route omits the viewport
  // export, hence the optional chain.
  document
    .querySelector<HTMLMetaElement>('meta[name="theme-color"]')
    ?.setAttribute("content", next === "light" ? BRAND.themeColors.light : BRAND.themeColors.dark);
  try {
    localStorage.setItem("theme", next);
  } catch {
    /* private mode — session-only theme */
  }
  window.dispatchEvent(new Event("themechange"));
}

export function toggleTheme(): void {
  setTheme(currentTheme() === "light" ? "dark" : "light");
}