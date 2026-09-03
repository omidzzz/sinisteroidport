import Reveal from "@/components/ui/Reveal";
import Spotlight from "@/components/ui/Spotlight";
import { Rail } from "@/components/ui/Section";
import { getDict, type Locale } from "@/lib/i18n";

/** HOME ACT V — MANIFESTO. Split-kinetic working philosophy + sign-off. */
export default function ManifestoSection({ locale }: { locale: Locale }) {
  const t = getDict(locale);
  const fa = locale === "fa";
  const man = fa ? "مانیفست · حوزه سیگنال" : "Manifesto · signal domain";

  const w = t.quote.split(" ");
  const mid = Math.ceil(w.length / 2);
  const qHead = w.slice(0, mid).join(" ");
  const qTail = w.slice(mid).join(" ");

  return (
    <section className="cv-auto shell-grid relative mx-auto my-20 max-w-[86rem] px-5 sm:px-8">
      <Rail label={man} />
      <Spotlight className="relative min-w-0 py-6">
        <span aria-hidden dir="ltr" className="scrub-word top-[-0.35em]">
          PHILOSOPHY
        </span>
        <Reveal delay={100} variant="left">
          <p className="mani-block anaglyph-strong relative">{qHead}</p>
        </Reveal>
        <Reveal delay={220} variant="right">
          <p
            className={`mani-block anaglyph-strong relative mt-6 ${
              fa ? "mani-offset-end text-start" : "mani-offset-end text-end"
            }`}
          >
            {qTail}
          </p>
        </Reveal>
        <Reveal delay={320}>
          <div className="mt-14 flex flex-wrap items-center justify-between gap-4 border-t border-line pt-5 font-mono text-[0.62rem] uppercase tracking-[0.2em] text-muted">
            <span>{t.quoteLabel}</span>
            <span dir="ltr" className="text-acid">SIG.OK ▸ VOID-FREE</span>
          </div>
        </Reveal>
      </Spotlight>
    </section>
  );
}