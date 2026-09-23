/**
 * SYS RULE — the home page's section separator in the console voice.
 *
 * Replaces the printed edition's act rule (numeral + hairline "q-act-rule"):
 * same role — one breathing point between sections — different register, a
 * `[NN] LABEL ──────────` line. Purely decorative (the section's own heading
 * carries the semantics), so it is aria-hidden.
 */
export default function SysRule({
  num,
  label,
}: {
  /** Two-digit section ordinal, rendered LTR ("02"). */
  num: string;
  label: string;
}) {
  return (
    <div className="sys-rule" aria-hidden>
      <span className="sys-rule-num" dir="ltr">
        [{num}]
      </span>
      <span className="sys-rule-label">{label}</span>
      <i />
    </div>
  );
}
