"use client";

import { useEffect, useRef, useState } from "react";
import { gsap } from "@/lib/gsap";
import { work } from "@/content/work";
import { PreviewFrame } from "@/components/work/PreviewFrame";
import { TransitionLink } from "@/components/system/TransitionLink";
import { Roll } from "@/components/ui/Roll";

/**
 * The index as big rows. On a mouse, the hovered piece's preview floats beside the
 * pointer, leaning into the direction it's travelling. On touch, previews sit in the rows.
 */
export function WorkList() {
  const rootRef = useRef<HTMLElement>(null);
  const floatRef = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState<number | null>(null);

  useEffect(() => {
    const root = rootRef.current!;
    const float = floatRef.current!;
    const fine = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!fine) return;
    const xTo = gsap.quickTo(float, "x", { duration: reduced ? 0 : 0.9, ease: "expo.out" });
    const yTo = gsap.quickTo(float, "y", { duration: reduced ? 0 : 0.9, ease: "expo.out" });
    const rTo = gsap.quickTo(float, "rotation", { duration: 1.2, ease: "expo.out" });
    let lastX = 0;
    const move = (e: PointerEvent) => {
      xTo(e.clientX);
      yTo(e.clientY);
      if (!reduced) rTo(Math.max(-8, Math.min(8, (e.clientX - lastX) * 0.4)));
      lastX = e.clientX;
    };
    root.addEventListener("pointermove", move);
    return () => root.removeEventListener("pointermove", move);
  }, []);

  return (
    <section ref={rootRef} className="wl frame" aria-label="All work" onPointerLeave={() => setActive(null)}>
      <div className="wl__head mono muted">
        <span>Project</span>
        <span>Type</span>
        <span>Sector</span>
        <span>Year</span>
      </div>
      <ol className="wl__list">
        {work.map((item, i) => (
          <li key={item.slug} className="wl__row" data-dim={active !== null && active !== i}>
            <TransitionLink
              href={`/work/${item.slug}`}
              title={item.title}
              label={item.kind}
              className="wl__link"
              onPointerEnter={() => setActive(i)}
              onFocus={() => setActive(i)}
            >
              <span className="wl__title">
                <span className="mono muted wl__i">{String(i + 1).padStart(2, "0")}</span>
                <Roll>{item.title}</Roll>
              </span>
              <span className="mono wl__kind" data-kind={item.kind}>
                {item.kind}
              </span>
              <span className="mono muted">{item.sector}</span>
              <span className="mono muted">{item.year}</span>
              <span className="wl__brief muted">{item.brief}</span>
              <span className="wl__inline" aria-hidden="true">
                <PreviewFrame item={item} interactive={false} />
              </span>
            </TransitionLink>
          </li>
        ))}
      </ol>

      <div ref={floatRef} className="wl__float" data-on={active !== null} aria-hidden="true">
        {work.map((item, i) => (
          <div key={item.slug} className="wl__float-item" data-on={active === i}>
            <PreviewFrame item={item} interactive={false} />
          </div>
        ))}
      </div>
    </section>
  );
}
