"use client";

type FaqItem = { question: string; answer: string };

/**
 * Dropdown (accordion) FAQ list built on native <details>/<summary>, so it
 * works without JS and stays crawlable/accessible. Answers are justified to
 * match the rest of the post prose.
 */
export default function FaqAccordion({ items }: { items: FaqItem[] }) {
  return (
    <div className="space-y-3">
      {items.map((item) => (
        <details
          key={item.question}
          className="group border border-line bg-panel/40"
        >
          <summary className="flex cursor-pointer select-none list-none items-center justify-between gap-4 px-4 py-4 text-start font-semibold text-accent transition-colors hover:text-ink [&::-webkit-details-marker]:hidden">
            <span>{item.question}</span>
            {/* plus glyph that rotates into an × when open */}
            <span
              aria-hidden
              className="relative mt-0.5 h-3 w-3 shrink-0 transition-transform duration-300 group-open:rotate-45"
            >
              <span className="absolute inset-x-0 top-1/2 h-px -translate-y-1/2 bg-current" />
              <span className="absolute inset-y-0 left-1/2 w-px -translate-x-1/2 bg-current" />
            </span>
          </summary>
          <p className="border-t border-line px-4 py-4 leading-relaxed text-muted text-justify">
            {item.answer}
          </p>
        </details>
      ))}
    </div>
  );
}
