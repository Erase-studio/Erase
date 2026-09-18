"use client";

import { useEffect, useRef } from "react";
import { gsap } from "@/lib/gsap";
import { TransitionLink } from "@/components/system/TransitionLink";
import { Roll } from "@/components/ui/Roll";
import { SoundToggle } from "@/components/system/Toggles";

/**
 * Pinned. A small window in the page opens onto the eraser's world; scrolling
 * grows it to fill the screen, then follows the eraser down a tunnel of generic
 * templates, rubbing them out (WebGL, bound to the window). This component only
 * sizes the window and times the words.
 */
export function Dive() {
  const rootRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const root = rootRef.current!;
    const sticky = root.querySelector<HTMLElement>(".dv__sticky")!;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const clamp = (v: number) => Math.min(1, Math.max(0, v));
    const ease = (v: number) => {
      const t = clamp(v);
      return t * t * (3 - 2 * t);
    };
    let last = -1;
    const tick = () => {
      const r = root.getBoundingClientRect();
      const p = clamp(-r.top / Math.max(1, r.height - window.innerHeight));
      if (Math.abs(p - last) < 0.0003) return;
      last = p;
      const s = sticky.style;
      s.setProperty("--g", ease(p / 0.13).toFixed(4)); // window grows
      s.setProperty("--k", ease((p - 0.8) / 0.1).toFixed(4)); // dark → blue
      s.setProperty("--intro", (ease((p - 0.09) / 0.07) * (1 - ease((p - 0.25) / 0.05))).toFixed(3));
      s.setProperty("--fly", (ease((p - 0.33) / 0.04) * (1 - ease((p - 0.78) / 0.04))).toFixed(3));
      s.setProperty("--end", ease((p - 0.9) / 0.07).toFixed(3));
    };
    gsap.ticker.add(tick);
    return () => gsap.ticker.remove(tick);
  }, []);

  return (
    <section
      ref={rootRef}
      className="dv"
      data-sound="dive"
      aria-labelledby="dv-title"
    >
      <div className="dv__sticky">
        <p className="dv__kicker mono muted">(05) Inside the page</p>
        <div className="dv__win dark" data-view="dive" data-line-hide>
          <div className="dv__intro">
            <h2 id="dv-title" className="dv__title">
              Step inside
              <br />
              the page.
            </h2>
            <div className="dv__aside">
              <p className="mono">Everything generic is about to go. Best with sound.</p>
              <SoundToggle label />
            </div>
          </div>
          <p className="dv__count mono" aria-hidden="true">
            <b data-count>000</b> templates erased
          </p>
          <div className="dv__end">
            <p className="dv__big">
              What’s left
              <br />
              is yours.
            </p>
            <TransitionLink href="/contact" title="Contact" className="pill pill--solid">
              <Roll>Start yours</Roll>
              <i className="pill__dot" aria-hidden="true" />
            </TransitionLink>
          </div>
        </div>
        <p className="dv__hint mono muted" aria-hidden="true">
          Scroll to step in ↓
        </p>
      </div>
    </section>
  );
}
