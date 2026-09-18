/**
 * Command rows — the console's non-navigation verbs as tree items.
 *
 * Order comes from VERB_ORDER and labels from the dictionary, so the two
 * stay in step: adding a verb means adding it to the type union, the order
 * table and both dictionaries (the last is enforced by the compiler, since
 * the Persian dictionary is typed against the English one).
 */
import type { Dictionary } from "@/lib/i18n";
import { VERB_ORDER } from "./constants";
import type { ConsoleItem } from "./types";

/** Verb rows in tree order, labelled for the active locale. */
export function buildCommands(dict: Dictionary): readonly ConsoleItem[] {
  return VERB_ORDER.map((verb) => ({
    kind: "command" as const,
    label: dict.console.verbs[verb],
    sub: verb,
    value: verb,
  }));
}

/**
 * The pseudo file path a route row shows in the gutter — the console speaks
 * in files, so `/work` presents itself as the page that renders it. Purely
 * decorative (always rendered LTR), never used for navigation.
 */
export function routeFilePath(path: string): string {
  return path === "/"
    ? "src/app/[locale]/page.tsx"
    : `src/app/[locale]${path}/page.tsx`;
}