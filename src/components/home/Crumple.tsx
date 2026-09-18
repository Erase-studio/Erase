"use client";

import { useEffect, useRef } from "react";
import { gsap } from "@/lib/gsap";

/**
 * Pinned. The generic agency homepage, printed on a sheet, gets crumpled into a
 * ball and thrown away as you scroll (WebGL draws the paper in the slot). The
 * words land once the page is gone.
 */
export function Crumple() {
  const rootRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const root = rootRef.current!;
    const title = root.querySelector<HTMLElement>(".cr__title")!;
    const cap = root.querySelector<HTMLElement>(".cr__cap")!;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) return;
    let last = -1;
    const tick = () => {
      const r = root.getBoundingClientRect();
      const p = Math.min(1, Math.max(0, -r.top / Math.max(1, r.height - window.innerHeight)));
      if (Math.abs(p - last) < 0.0005) return;
      last = p;
      const t = Math.min(1, Math.max(0, (p - 0.7) / 0.14));
      title.style.opacity = String(t);
      title.style.transform = `translate3d(0, ${((1 - t) * 40).toFixed(1)}px, 0)`;
      cap.style.opacity = String(1 - Math.min(1, p / 0.35));
    };
    gsap.ticker.add(tick);
    return () => gsap.ticker.remove(tick);
  }, []);

  return (
    <section ref={rootRef} className="cr" data-sound="crumple" aria-labelledby="cr-title">
      <div className="cr__sticky" data-view="crumple">
        <p className="cr__kicker mono muted">(01) The template</p>
        <div className="cr__slot" data-slot aria-hidden="true" />
        <p className="cr__cap mono muted">The homepage every agency ships. Printed. Keep scrolling.</p>
        <h2 id="cr-title" className="cr__title">
          Every template
          <br />
          ends up like this.
        </h2>
      </div>
    </section>
  );
}
