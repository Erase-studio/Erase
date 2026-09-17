"use client";

import { Fragment, useEffect, useRef } from "react";
import { gsap } from "@/lib/gsap";

const lines = ["Every template is someone else’s idea.", "We erase it.", "Then we build yours."];

/**
 * Pinned by CSS (sticky), scrubbed by scroll. While the template blows apart around
 * the camera, three lines surface word by word and give way to the next.
 */
export function Manifesto() {
  const rootRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const root = rootRef.current!;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const rows = [...root.querySelectorAll<HTMLElement>(".mf__line")];
    const words = rows.map((r) => [...r.querySelectorAll<HTMLElement>(".mf__w")]);
    if (reduced) return;

    let top = 0;
    let height = 1;
    const measure = () => {
      const r = root.getBoundingClientRect();
      top = r.top + window.scrollY;
      height = Math.max(1, r.height - window.innerHeight);
    };
    measure();
    window.addEventListener("resize", measure);

    const clamp = (v: number) => Math.min(1, Math.max(0, v));
    let lastP = -1;
    const tick = () => {
      const p = clamp((window.scrollY - top) / height);
      if (Math.abs(p - lastP) < 0.0003) return;
      lastP = p;
      const n = rows.length;
      rows.forEach((row, i) => {
        // Each line owns a slice of the scroll: words arrive, hold, then the line lifts away.
        const local = clamp((p - i / n) * n);
        const gone = i === n - 1 ? 0 : clamp((local - 0.8) / 0.2);
        const shown = i === 0 ? 1 : clamp(local * 12);
        row.style.opacity = String(shown * (1 - gone));
        row.style.transform = `translate3d(0, ${(-gone * 60).toFixed(1)}px, 0)`;
        const ws = words[i];
        ws.forEach((w, k) => {
          const t = clamp((local * 1.8 - k / ws.length) * 2.2);
          w.style.opacity = String(0.08 + 0.92 * t);
          w.style.transform = `translate3d(0, ${((1 - t) * 0.3).toFixed(3)}em, 0)`;
        });
      });
    };
    gsap.ticker.add(tick);
    return () => {
      gsap.ticker.remove(tick);
      window.removeEventListener("resize", measure);
    };
  }, []);

  return (
    <section ref={rootRef} className="mf" data-scene="dust" aria-label="What we believe">
      <div className="mf__sticky">
        <p className="mf__kicker mono muted">(01) Manifesto</p>
        {lines.map((l, i) => (
          <p key={l} className="mf__line" data-i={i}>
            {l.split(" ").map((w, k) => (
              <Fragment key={k}>
                {k > 0 && " "}
                <span className="mf__w">{w}</span>
              </Fragment>
            ))}
          </p>
        ))}
      </div>
    </section>
  );
}
