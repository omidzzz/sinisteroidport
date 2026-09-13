import type { Locale } from "@/lib/i18n";

/**
 * KINETIC TITLE FRAME — SERVER COMPONENT.
 *
 * Renders the kinetic title's letter spans into the initial HTML. This is
 * what the browser paints on first render (the letters at wght 300, their
 * resting state) and what search engines/indexers see. The file has NO
 * "use client" directive, so Next.js prerenders it statically.
 *
 * The client wrapper in KineticTitle.tsx mounts the rAF loop + mouse
 * listener on top of these spans after hydration — the letters look
 * identical before and after (both at wght:300), so there's zero visual
 * shift on hydration.
 */
export default function KineticTitleFrame({
  text,
  className = "",
}: {
  text: string;
  className?: string;
}) {
  const isArabicScript = /[\u0600-\u06FF]/.test(text);
  let key = 0;

  if (isArabicScript) {
    const words = text.split(" ").filter(Boolean);
    return (
      <h1 className={className} aria-label={text}>
        {words.map((word, wi) => (
          <span key={wi}>
            <span
              data-ch
              className="inline-block whitespace-nowrap will-change-[font-variation-settings]"
              style={{ fontVariationSettings: '"wght" 300', fontWeight: 300 }}
            >
              {word}
            </span>
            {wi < words.length - 1 ? " " : null}
          </span>
        ))}
      </h1>
    );
  }

  return (
    <h1 className={className} aria-label={text}>
      {text.split(" ").map((word, wi) => (
        <span key={wi} className="inline-block whitespace-nowrap">
          {word.split("").map((ch) => (
            <span
              key={key++}
              data-ch
              className="inline-block will-change-[font-variation-settings]"
              style={{ fontVariationSettings: '"wght" 300', fontWeight: 300 }}
            >
              {ch}
            </span>
          ))}
          <span className="inline-block">&nbsp;</span>
        </span>
      ))}
    </h1>
  );
}
