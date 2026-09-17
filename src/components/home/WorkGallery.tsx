"use client";

import { useEffect, useRef } from "react";
import { gsap } from "@/lib/gsap";
import { work } from "@/content/work";
import { PreviewFrame } from "@/components/work/PreviewFrame";
import { TransitionLink } from "@/components/system/TransitionLink";
import { Roll } from "@/components/ui/Roll";

/**
 * Night. The dust becomes a ring and the work floats inside it on a slow arc:
 * scroll turns the arc, the current piece faces you, the others fall back into the dark.
 */
export function WorkGallery() {
  const rootRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const root = rootRef.current!;
    const cards = [...root.querySelectorAll<HTMLElement>(".wg__card")];
    const count = root.querySelector<HTMLElement>(".wg__count b");
    const fill = root.querySelector<HTMLElement>(".wg__fill");
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const n = cards.length;
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

    let smooth = 0;
    let lastActive = -1;
    let lastKey = "";
    const tick = () => {
      const p = Math.min(1, Math.max(0, (window.scrollY - top) / height));
      const target = p * (n - 1);
      // A little inertia on top of the smooth scroll: the arc swings, it doesn't snap.
      smooth += (target - smooth) * 0.1;
      if (Math.abs(target - smooth) < 0.0005) smooth = target;
      const vw = window.innerWidth;
      const key = `${smooth.toFixed(4)}:${vw}`;
      if (key === lastKey) return;
      lastKey = key;
      const wide = vw >= 900;
      cards.forEach((card, i) => {
        const o = i - smooth;
        const ao = Math.abs(o);
        const x = o * (wide ? vw * 0.44 : vw * 0.86);
        const z = -ao * (wide ? 560 : 240);
        const ry = -o * (wide ? 28 : 8);
        const op = Math.max(0, 1 - Math.max(0, ao - 0.55) * 0.85);
        card.style.transform = `translate3d(${x.toFixed(1)}px, ${(ao * 24).toFixed(1)}px, ${z.toFixed(1)}px) rotateY(${ry.toFixed(2)}deg)`;
        card.style.opacity = op.toFixed(3);
        card.style.zIndex = String(100 - Math.round(ao * 10));
        card.dataset.active = String(ao < 0.5);
      });
      const active = Math.round(smooth);
      if (active !== lastActive && count) {
        lastActive = active;
        count.textContent = String(active + 1).padStart(2, "0");
      }
      if (fill) fill.style.transform = `scaleX(${(smooth / Math.max(1, n - 1)).toFixed(4)})`;
    };
    gsap.ticker.add(tick);
    return () => {
      gsap.ticker.remove(tick);
      window.removeEventListener("resize", measure);
    };
  }, []);

  return (
    <section
      ref={rootRef}
      className="wg"
      data-scene="work"
      style={{ "--n": work.length } as React.CSSProperties}
      aria-labelledby="wg-title"
    >
      <div className="wg__sticky">
        <header className="wg__head frame">
          <div>
            <p className="mono muted">(03) Selected work</p>
            <h2 id="wg-title" className="wg__lede">
              Our own site, and concept studies that show our range.
            </h2>
          </div>
          <TransitionLink href="/work" title="Work" className="pill">
            <Roll>All work</Roll>
            <span className="pill__arrow" aria-hidden="true">
              →
            </span>
          </TransitionLink>
        </header>

        <div className="wg__stage">
          {work.map((item) => (
            <article key={item.slug} className="wg__card" aria-labelledby={`wg-${item.slug}`}>
              <TransitionLink
                href={`/work/${item.slug}`}
                title={item.title}
                label={item.kind}
                className="wg__link"
                data-cursor-label="View"
              >
                <div className="wg__frame">
                  <PreviewFrame item={item} interactive={false} />
                </div>
                <div className="wg__cap">
                  <h3 id={`wg-${item.slug}`} className="wg__title">
                    <Roll>{item.title}</Roll>
                  </h3>
                  <p className="mono muted">
                    {item.kind} · {item.sector} · {item.year}
                  </p>
                </div>
              </TransitionLink>
            </article>
          ))}
        </div>

        <div className="wg__foot frame mono">
          <p className="wg__count">
            <b>01</b> / {String(work.length).padStart(2, "0")}
          </p>
          <span className="wg__track" aria-hidden="true">
            <span className="wg__fill" />
          </span>
          <p className="muted">Scroll</p>
        </div>
      </div>
    </section>
  );
}
