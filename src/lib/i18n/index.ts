import en, { type Dictionary } from "./en";
import fa from "./fa";

export { type Dictionary };

export const locales = ["en", "fa"] as const;
export type Locale = (typeof locales)[number];

export function isLocale(value: string): value is Locale {
  return (locales as readonly string[]).includes(value);
}

export const dictionaries: Record<Locale, Dictionary> = { en, fa };

export function getDict(locale: Locale): Dictionary {
  return dictionaries[locale];
}

/** Prefix an internal href with the active locale */
export function loc(locale: Locale, path: string): string {
  return path === "/" ? `/${locale}` : `/${locale}${path}`;
}