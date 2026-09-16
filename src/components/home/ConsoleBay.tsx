import FigPlate from "./figure/FigPlate";

/** DEDICATED CONSOLE BAY — the laptop, printed as FIG. 03 (QUIRE).
 * The prop float layer is retired in the printed edition, so the deck
 * reads as an in-flow monochrome plate on every viewport. Decorative:
 * aria-hidden, and the chunk stays scroll-lazy inside FigPlate. */
export default function ConsoleBay({ locale }: { locale?: string }) {
  const fa = locale === "fa";
  return (
    <div aria-hidden="true">
      <FigPlate
        no="03"
        caption={fa ? "لپ‌تاپ · کار می‌کند" : "The laptop · it works"}
        prop="laptop"
        className="quire-plate console-bay"
      />
    </div>
  );
}