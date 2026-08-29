"use client";

import dynamic from "next/dynamic";
import type { CmdEntry } from "./CommandPalette";
import type { Locale } from "@/lib/i18n";

/**
 * Lazy overlay loaders — CommandPalette and EasterEgg are never needed for
 * first paint (palette opens via Ctrl+K / the dock chip; the egg via 7 logo
 * clicks). next/dynamic with ssr:false keeps their code out of the initial
 * bundle and skips their hydration cost; the dock chip opens the palette on
 * demand.
 */
const CommandPalette = dynamic(() => import("./CommandPalette"), { ssr: false });
const EasterEgg = dynamic(() => import("./EasterEgg"), { ssr: false });

export function CommandPaletteLazy({
  locale,
  entries,
}: {
  locale: Locale;
  entries: CmdEntry[];
}) {
  return <CommandPalette locale={locale} entries={entries} />;
}

export function EasterEggLazy({ locale }: { locale: Locale }) {
  return <EasterEgg locale={locale} />;
}