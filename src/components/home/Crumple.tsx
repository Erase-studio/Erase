"use client";

import { useEffect, useRef } from "react";
import { gsap } from "@/lib/gsap";

/**
 * Pinned. The agency homepage, printed on a sheet. Press it and it crinkles
 * like paper. Keep going and it is balled up and thrown away, and the one line
 * that survives is ours. (The paper itself is drawn by CrumpleView in the slot.)
 */

export function Crumple() {
  const rootRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const root = rootRef.current!;
    const title = root.querySelector<HTMLElement>(".cr__title")!;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) return;
    let last = -1;
    const tick = () => {
      const r = root.getBoundingClientRect();
      const p = Math.min(1, Math.max(0, -r.top / Math.max(1, r.height - window.innerHeight)));
      if (Math.abs(p - last) < 0.0005) return;
      last = p;
      const t = Math.min(1, Math.max(0, (p - 0.58) / 0.16));
      title.style.opacity = String(t);
      title.style.transform = `translate3d(0, ${((1 - t) * 40).toFixed(1)}px, 0)`;
      title.dataset.on = t > 0.6 ? "true" : "false";
    };
    gsap.ticker.add(tick);
    return () => gsap.ticker.remove(tick);
  }, []);

  return (
    <section ref={rootRef} className="cr" data-sound="crumple" aria-labelledby="cr-title">
      <div className="cr__sticky" data-view="crumple">
        <div className="cr__slot" data-slot aria-hidden="true" />
        <h2 id="cr-title" className="cr__title" data-warp data-on="false">
          Nothing <span className="cr__struck">generic</span>
          <br />
          survives here.
        </h2>
      </div>
    </section>
  );
}
