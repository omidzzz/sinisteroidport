import type { ReactNode } from "react";

/**
 * QUIRE — the printed edition (register wrapper, v9).
 *
 * The home page is one continuous quire: a single measure of type read
 * top to bottom like a book. This wrapper carries the register scope
 * ([data-register] lives on <html>) and provides <Act>, the marginal
 * rule + numeral + title that separates acts. Hook-free: everything is
 * server-rendered, zero client JS added.
 *
 * Every act keeps its own content and i18n; only the voice changes.
 */
export default function Quire({
  locale,
  children,
}: {
  locale: string;
  children: ReactNode;
}) {
  return (
    <div className="quire" data-locale={locale}>
      {children}
    </div>
  );
}

/**
 * Act separator — a hairline rule with a marginal numeral and title.
 * Replaces the geological Station cuts: same role (section scoping),
 * printed voice. `title` is decorative only (the act's own heading
 * carries semantics); the rule is aria-hidden.
 */
export function Act({
  num,
  title,
  children,
}: {
  num: string;
  title: string;
  children?: ReactNode;
}) {
  return (
    <>
      {children}
      <div className="q-act-rule" aria-hidden>
        <span className="q-act-num" dir="ltr">
          {num}
        </span>
        <span className="q-act-title">{title}</span>
        <i />
      </div>
    </>
  );
}