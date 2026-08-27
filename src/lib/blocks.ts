/** Lightweight markup ↔ content-block conversion shared by the admin API and UI.
 *
 *  Syntax:
 *    ## Heading        → heading (level 2)
 *    ### Heading       → heading (level 3)
 *    - item            → bullet list
 *    1. item           → ordered list
 *    > text            → quote
 *    ! text            → highlight box
 *    !lead text        → lead paragraph
 *    plain line        → paragraph
 */
export function parseContent(src: string): any[] {
  const blocks: any[] = [];
  let list: { ordered: boolean; items: string[] } | null = null;
  const flush = () => {
    if (list) {
      blocks.push({
        type: "list",
        style: list.ordered ? "ordered" : "bullet",
        items: list.items,
      });
      list = null;
    }
  };
  for (const raw of src.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line) {
      flush();
      continue;
    }
    let m: RegExpMatchArray | null;
    if ((m = line.match(/^#{1,3}\s+(.*)$/))) {
      flush();
      blocks.push({
        type: "heading",
        level: m[0].startsWith("### ") ? 3 : 2,
        text: m[1],
      });
    } else if ((m = line.match(/^-\s+(.*)$/))) {
      if (!list || list.ordered) {
        flush();
        list = { ordered: false, items: [] };
      }
      list.items.push(m[1]);
    } else if ((m = line.match(/^\d+\.\s+(.*)$/))) {
      if (!list || !list.ordered) {
        flush();
        list = { ordered: true, items: [] };
      }
      list.items.push(m[1]);
    } else if ((m = line.match(/^>\s?(.*)$/))) {
      flush();
      blocks.push({ type: "quote", text: m[1] });
    } else if ((m = line.match(/^!\s+(.*)$/))) {
      flush();
      blocks.push({ type: "highlight", label: "KEY INSIGHT", text: m[1] });
    } else if ((m = line.match(/^!lead\s+(.*)$/))) {
      flush();
      blocks.push({ type: "paragraph", style: "lead", text: m[1] });
    } else {
      flush();
      blocks.push({ type: "paragraph", text: line });
    }
  }
  flush();
  return blocks;
}

export function serializeContent(blocks: any[]): string {
  if (!Array.isArray(blocks)) return "";
  return blocks
    .map((b) => {
      switch (b?.type) {
        case "heading":
          return `${"#".repeat(Math.min(Math.max(b.level ?? 2, 2), 3))} ${b.text ?? ""}`;
        case "list":
          return (b.items ?? [])
            .map((it: string, i: number) =>
              b.style === "ordered" ? `${i + 1}. ${it}` : `- ${it}`
            )
            .join("\n");
        case "quote":
          return `> ${b.text ?? ""}`;
        case "highlight":
          return `! ${b.text ?? ""}`;
        default:
          return b?.text ?? "";
      }
    })
    .join("\n\n");
}
