import type { ContentBlock } from "@/lib/blog/types";

export default function TableBlock({ block }: { block: ContentBlock }) {
  const headers = block.headers ?? [];
  const rows = block.rows ?? [];
  if (!headers.length || !rows.length) return null;

  return (
    <div className="my-8 overflow-x-auto">
      <table className="w-full border-collapse border border-line text-sm">
        <thead>
          <tr>
            {headers.map((h) => (
              <th
                key={h}
                className="border border-line bg-panel px-3 py-2 text-start font-mono text-xs uppercase tracking-wider text-accent"
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, ri) => (
            <tr key={ri} className="odd:bg-panel/40">
              {row.map((cell, ci) => (
                <td key={ci} className="border border-line px-3 py-2 text-muted">
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}