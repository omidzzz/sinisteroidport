/**
 * Google Analytics 4 — gtag helpers for the static export.
 *
 * GoogleTag.tsx owns loading gtag.js and the initial config; this module is
 * the single place the Measurement ID lives and the only import event wiring
 * uses, so G-J4JGBQHEQH is never scattered across the codebase.
 */

export const GA_ID = "G-J4JGBQHEQH";

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
  }
}

/**
 * Queue a gtag command. GoogleTag.tsx installs `window.dataLayer` before
 * hydration, so any event pushed here — even before the external script has
 * loaded — is buffered in the data layer and shipped once gtag.js arrives.
 * No-op outside the browser so this module is safe to import in server code.
 */
export function gtag(...args: unknown[]): void {
  if (typeof window === "undefined") return;
  const layer = window.dataLayer ?? (window.dataLayer = []);
  layer.push(args);
}

/** Fire a named GA4 event with optional string/number/boolean params. */
export function trackEvent(
  name: string,
  params: Record<string, string | number | boolean> = {}
): void {
  gtag("event", name, params);
}