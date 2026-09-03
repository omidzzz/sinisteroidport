import type { ContentBlock } from "@/lib/blog/types";

/** Resolve an image alt from its possibly-localized form; EN wins. */
export function altText(alt: ContentBlock["altText"]): string {
  if (!alt) return "";
  return typeof alt === "string" ? alt : alt.en ?? "";
}

/** All the custom monoline SVG markers used by alert boxes. */
const ALERT_ICONS: Record<string, React.ReactNode> = {
  warning: (
    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M12 3 2 20h20L12 3z" />
      <path d="M12 10v4m0 3v.01" />
    </svg>
  ),
  tip: (
    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" aria-hidden>
      <path d="M12 3l7 9-7 9-7-9z" />
    </svg>
  ),
  info: (
    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 11v5m0-8v.01" />
    </svg>
  ),
};

const ALERT_VARIANTS: Record<string, { box: string; tone: string }> = {
  warning: {
    box: "border-(--warn)/60 bg-(--warn)/5",
    tone: "border-(--warn) text-(--warn)",
  },
  tip: {
    box: "border-accent/50 bg-accent/[0.04]",
    tone: "border-accent text-accent",
  },
  info: {
    box: "border-dashed border-line bg-panel/60",
    tone: "border-muted text-muted",
  },
};

export { ALERT_ICONS, ALERT_VARIANTS };