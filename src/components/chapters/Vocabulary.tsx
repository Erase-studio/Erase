"use client";

import { useEffect, useRef } from "react";
import { gsap } from "@/lib/gsap";
import { eraserBus, scrub } from "@/lib/eraserBus";

const pairs = [
  { old: "We transform ideas into digital experiences.", now: "Websites people remember." },
  { old: "Where creativity meets technology.", now: "Designed and coded. Same hands." },
  { old: "Innovative solutions tailored to your vision.", now: "One idea. Built properly." },
];

/**
 * Pinned. One cliché fills the screen and the 3D eraser rubs it out as you
 * scroll, shedding crumbs; what we actually mean writes in behind it.
 */
export function Vocabulary() {
  const rootRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const root = rootRef.current!;
    const mm = gsap.matchMedia();

    mm.add("(prefers-reduced-motion: no-preference)", () => {
      root.dataset.motion = "true";
      const items = gsap.utils.toArray<HTMLElement>(".vx__pair", root);
      const dots = gsap.utils.toArray<HTMLElement>(".vx__dots i", root);

      const band = (a: number) => `polygon(${a}% -20%, 160% -20%, 160% 120%, ${a - 18}% 120%)`;
      const tl = gsap.timeline({
        defaults: { ease: "none" },
        scrollTrigger: {
          trigger: root,
          start: "top top",
          end: () => `+=${window.innerHeight * 3.4}`,
          pin: true,
          scrub: 0.6,
          invalidateOnRefresh: true,
        },
      });

      items.forEach((item, i) => {
        const old = item.querySelector<HTMLElement>(".vx__old")!;
        const now = item.querySelectorAll(".vx__now .vx__c");
        const at = i * 3;
        if (i > 0) {
          tl.fromTo(item, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.01 }, at);
          tl.fromTo(old, { yPercent: 40, opacity: 0, rotateX: -50 }, { yPercent: 0, opacity: 1, rotateX: 0, duration: 0.45 }, at);
        }
        tl.call(() => dots.forEach((d, k) => (d.dataset.on = String(k === i))), [], at + 0.05);

        // Rub-out: the band edge crosses the line; the eraser rides it and scrubs up and down.
        const p = { a: -10 };
        tl.to(
          p,
          {
            a: 125,
            duration: 1.4,
            onUpdate: () => {
              old.style.clipPath = band(p.a);
              const r = old.getBoundingClientRect();
              const t = (p.a + 10) / 135;
              if (t <= 0.01 || t >= 0.99) return;
              const x = r.left + (r.width * (p.a - 9)) / 100;
              const y = r.top + r.height * (0.5 + 0.9 * (scrub(t, 9) - 0.5));
              const dx = x - eraserBus.state.x;
              const dy = y - eraserBus.state.y;
              eraserBus.point(x, y, 1, 1.25);
              if (Math.hypot(dx, dy) > 1) eraserBus.crumbs(x, y, 2, dx, dy);
            },
          },
          at + 0.5,
        );

        tl.fromTo(
          now,
          { yPercent: 110, rotate: 8, fontStretch: "75%" },
          { yPercent: 0, rotate: 0, fontStretch: "100%", stagger: 0.012, duration: 0.8, ease: "power3.out" },
          at + 1.25,
        );
        if (i < items.length - 1) {
          tl.to(item.querySelector(".vx__now"), { yPercent: -40, opacity: 0, filter: "blur(8px)", duration: 0.5 }, at + 2.6);
          tl.set(item, { autoAlpha: 0 }, at + 3);
        }
      });
      tl.to({}, { duration: 0.6 });

      return () => {
        delete root.dataset.motion;
        items.forEach((it) => ((it.querySelector(".vx__old") as HTMLElement).style.clipPath = ""));
      };
    });

    return () => mm.revert();
  }, []);

  // The space sits between word boxes; inside an inline-block it would collapse.
  const chars = (s: string) =>
    s.split(" ").flatMap((word, wi) => [
      wi > 0 ? " " : null,
      <span key={wi} className="vx__w">
        {word.split("").map((c, ci) => (
          <span key={ci} className="vx__c">
            {c}
          </span>
        ))}
      </span>,
    ]);

  return (
    <section ref={rootRef} id="vocabulary" data-chapter="vocabulary" data-theme="light" className="chapter-light grain vx">
      <h2 className="sr-only">Clichés we deleted</h2>
      <div className="vx__stage frame">
        {pairs.map((p, i) => (
          <div key={p.old} className="vx__pair" style={{ zIndex: i + 1 }}>
            <p className="vx__old">
              <span className="sr-only">Instead of “{p.old}”, </span>
              <span aria-hidden="true">{p.old}</span>
            </p>
            <p className="vx__now">
              <span className="sr-only">{p.now}</span>
              <span aria-hidden="true">{chars(p.now)}</span>
            </p>
          </div>
        ))}
      </div>
      <div className="vx__dots frame" aria-hidden="true">
        {pairs.map((p, i) => (
          <i key={p.old} data-on={i === 0} />
        ))}
      </div>
    </section>
  );
}
