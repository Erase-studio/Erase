"use client";

import { useEffect, useRef } from "react";
import { gsap, ScrollTrigger } from "@/lib/gsap";

const cliches = [
  "We transform ideas into digital experiences",
  "Where creativity meets technology",
  "Innovative solutions",
  "Your vision, our expertise",
  "Stunning modern design",
  "Let’s build something amazing",
];

/**
 * Two strips of tape across the seam between chapters. Blue tape carries the
 * struck-out clichés; black tape carries what's left. Speed and direction follow
 * the scroll, so a hard flick makes them race.
 */
export function Tapes() {
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const root = rootRef.current!;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) return;

    const tracks = Array.from(root.querySelectorAll<HTMLElement>(".tape__track"));
    const state = tracks.map((t, i) => ({ el: t, x: 0, dir: i === 0 ? -1 : 1, width: t.scrollWidth / 2 }));
    let boost = 0;
    let direction = 1;
    let visible = false;

    const measure = () => state.forEach((s) => (s.width = s.el.scrollWidth / 2));
    const io = new IntersectionObserver(([e]) => (visible = e.isIntersecting), { rootMargin: "20% 0px" });
    io.observe(root);
    const st = ScrollTrigger.create({
      start: 0,
      end: "max",
      onUpdate: (self) => {
        direction = self.direction;
        boost = Math.min(Math.abs(self.getVelocity()) / 120, 40);
      },
    });

    const tick = (_t: number, dt: number) => {
      boost *= 0.92;
      if (!visible) return;
      for (const s of state) {
        const speed = (0.9 + boost) * (dt / 16.67);
        s.x += speed * s.dir * direction;
        if (s.x <= -s.width) s.x += s.width;
        if (s.x > 0) s.x -= s.width;
        s.el.style.transform = `translate3d(${s.x}px,0,0) skewX(${-Math.min(boost, 12) * s.dir * direction * 0.6}deg)`;
      }
    };
    gsap.ticker.add(tick);
    window.addEventListener("resize", measure);
    document.fonts?.ready.then(measure);

    return () => {
      gsap.ticker.remove(tick);
      io.disconnect();
      st.kill();
      window.removeEventListener("resize", measure);
    };
  }, []);

  const blue = (
    <>
      {cliches.map((c) => (
        <span key={c} className="tape__item">
          <span className="tape__text">{c}</span>
          <span className="tape__x">✕</span>
        </span>
      ))}
    </>
  );
  const ink = (
    <>
      {Array.from({ length: 6 }, (_, i) => (
        <span key={i} className="tape__item">
          Nothing generic left
          <span className="tape__dot" />
        </span>
      ))}
    </>
  );

  return (
    <div ref={rootRef} className="tapes" aria-hidden="true">
      <div className="tape tape--ink">
        <div className="tape__track">
          {ink}
          {ink}
        </div>
      </div>
      <div className="tape tape--blue">
        <div className="tape__track">
          {blue}
          {blue}
        </div>
      </div>
    </div>
  );
}
