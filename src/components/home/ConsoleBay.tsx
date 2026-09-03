import LaptopDeck from "./laptop-deck/LaptopDeck";

/** DEDICATED CONSOLE BAY — an in-flow strip for the acid laptop. Never
 * overlaps content; rides the scroll with a scrubbed 3D reveal. */
export default function ConsoleBay() {
  return (
    <section className="console-bay" aria-hidden="true">
      <div className="console-bay-inner">
        <div className="console-bay-deck">
          <LaptopDeck />
        </div>
      </div>
    </section>
  );
}