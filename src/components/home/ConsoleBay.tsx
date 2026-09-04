import LaptopDeck from "./laptop-deck/LaptopDeck";
import Plant from "./plant/Plant";
import Frog from "./frog/Frog";
import Drone from "./drone/Drone";

/** DEDICATED CONSOLE BAY — an in-flow strip for the acid laptop plus its
 * companion props (a potted neon plant, a nervous Pepe frog and a hover
 * drone). Never overlaps content; rides the scroll with a scrubbed 3D reveal. */
export default function ConsoleBay() {
  return (
    <section className="console-bay" aria-hidden="true">
      <div className="console-bay-inner">
        <div className="console-bay-deck">
          <Plant />
          <LaptopDeck />
          <Frog />
          <Drone />
        </div>
      </div>
    </section>
  );
}