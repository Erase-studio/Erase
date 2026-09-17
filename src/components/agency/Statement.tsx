"use client";

import { useEffect, useRef } from "react";
import { site } from "@/content/site";
import { gsap } from "@/lib/gsap";
import { EraseReveal } from "@/components/erase/EraseReveal";

const facts = [
  { n: 6, label: "Disciplines under one roof", from: 0 },
  { n: 0, label: "Templates, ever", from: 99 },
  { n: 1, label: "Team from strategy to launch", from: 12 },
];

/** Who we are, in one sentence, and three numbers that are actually true. */
export function Statement() {
  const rootRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const root = rootRef.current!;
    const mm = gsap.matchMedia();
    mm.add("(prefers-reduced-motion: no-preference)", () => {
      root.querySelectorAll<HTMLElement>("[data-count]").forEach((el) => {
        const to = Number(el.dataset.count);
        const obj = { v: Number(el.dataset.from) };
        el.textContent = String(obj.v);
        gsap.to(obj, {
          v: to,
          duration: 1.6,
          ease: "power3.out",
          onUpdate: () => (el.textContent = String(Math.round(obj.v))),
          scrollTrigger: { trigger: el, start: "top 85%", toggleActions: "play none none none" },
        });
      });
    });
    return () => mm.revert();
  }, []);

  return (
    <section ref={rootRef} className="chapter-light grain statement" data-chapter="agency" data-chapter-label="Agency" data-theme="light" aria-labelledby="statement-title">
      <div className="frame">
        <div className="statement__top">
          <p className="t-label text-pencil">{site.tagline}</p>
          <p className="avail">
            <i aria-hidden="true" />
            {site.availability}
          </p>
        </div>

        <EraseReveal cover="sheet" className="statement__reveal">
          <h2 id="statement-title" className="statement__text">
            We design, build and grow websites for brands that refuse to blend in.
          </h2>
        </EraseReveal>

        <dl className="facts">
          {facts.map((f) => (
            <div key={f.label} className="facts__item">
              <dt className="t-label text-pencil">{f.label}</dt>
              <dd className="facts__n" data-count={f.n} data-from={f.from}>
                {f.n}
              </dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
}
