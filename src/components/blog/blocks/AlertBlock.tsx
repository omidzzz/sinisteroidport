import type { ContentBlock } from "@/lib/blog/types";
import { ALERT_ICONS, ALERT_VARIANTS } from "./utils";

export default function AlertBlock({ block }: { block: ContentBlock }) {
  const style = block.alertStyle ?? "info";
  const v = ALERT_VARIANTS[style] ?? ALERT_VARIANTS.info;

  return (
    <aside className={`my-10 border p-5 ${v.box}`}>
      {block.title && (
        <p className="mb-3 flex items-center gap-2.5">
          <span
            aria-hidden
            dir="ltr"
            className={`flex h-5 w-5 shrink-0 items-center justify-center border ${v.tone}`}
          >
            {ALERT_ICONS[style] ?? ALERT_ICONS.info}
          </span>
          <span
            className={`font-mono text-xs font-bold uppercase tracking-widest ${v.tone.split(" ")[1]}`}
          >
            {block.title}
          </span>
        </p>
      )}
      <p className="leading-relaxed text-muted">{block.text}</p>
    </aside>
  );
}