"use client";

import { useEffect, useState } from "react";
import LaptopDeck from "./laptop-deck/LaptopDeck";

/** DEDICATED CONSOLE BAY — the in-flow acid laptop for narrow viewports only.
 * On ≥768px the laptop lives in the scroll-bound float layer instead
 * (components/home/prop-float/), so this section unmounts itself there and
 * takes up zero space. It renders nothing on the server either, so a desktop
 * first paint never shows an empty strip (mobile paints it after hydration). */
export default function ConsoleBay() {
  const [mobile, setMobile] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 767.98px)");
    const apply = () => setMobile(mq.matches);
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, []);

  if (!mobile) return null;

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