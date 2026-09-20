"use client";

import { useEffect, useRef } from "react";
import { startRipples } from "@/lib/ripples";

/**
 * The same water as the way in, now under the whole site: move across a page
 * and a wake of fine ripples spreads out behind you, catching light on the
 * crests and dying away a few seconds later. Clicking drops a ring.
 *
 * It sits behind every word on the page, re-colours itself when the page goes
 * from night to day, stops simulating the moment you stop moving, and never
 * runs at all for reduced motion.
 */

/** Night: white crests on deep blue, the way the loader does it. */
const NIGHT = { hi: [1, 1, 1] as [number, number, number], lo: [0.16, 0.21, 0.5] as [number, number, number], gain: 2.7, max: 0.3 };
/** Day: graphite in the troughs, paper on the crests, and far quieter. */
const DAY = { hi: [0.07, 0.07, 0.09] as [number, number, number], lo: [1, 1, 1] as [number, number, number], gain: 2, max: 0.11 };

export function Wash() {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const water = startRipples(ref.current!, NIGHT);
    if (!water) return;

    const html = document.documentElement;
    const apply = () => water.set(html.dataset.theme === "dark" ? NIGHT : DAY);
    apply();
    const theme = new MutationObserver(apply);
    theme.observe(html, { attributes: true, attributeFilter: ["data-theme"] });

    return () => {
      theme.disconnect();
      water.dispose();
    };
  }, []);

  return <canvas ref={ref} className="wash" aria-hidden="true" />;
}
