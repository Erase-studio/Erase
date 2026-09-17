"use client";

import { useEffect, useRef } from "react";
import { gsap } from "@/lib/gsap";
import { Lines } from "@/components/ui/Lines";

// Bottom to top: what a visitor never sees, up to what they do.
const layers = [
  { name: "Code", tag: "Next.js · hand-built" },
  { name: "CMS & SEO", tag: "Edit it yourself" },
  { name: "Layout", tag: "12-column grid" },
  { name: "Copy", tag: "Words first" },
  { name: "Motion", tag: "Only with a reason" },
  { name: "Design", tag: "Yours alone" },
];

export function Skin({ i }: { i: number }) {
  switch (i) {
    case 0:
      return (
        <div className="anat__plane ap-code">
          <b>export default</b> <em>function</em> Home() {"{"}
          <br />
          &nbsp;&nbsp;<b>return</b> (
          <br />
          &nbsp;&nbsp;&nbsp;&nbsp;&lt;<em>Hero</em> erase /&gt;
          <br />
          &nbsp;&nbsp;&nbsp;&nbsp;&lt;<em>Proof</em> sheets={"{"}work{"}"} /&gt;
          <br />
          &nbsp;&nbsp;&nbsp;&nbsp;&lt;<em>Contact</em> /&gt;
          <br />
          &nbsp;&nbsp;);
          <br />
          {"}"}
        </div>
      );
    case 1:
      return (
        <div className="anat__plane ap-seo">
          <div>
            Page title <i />
          </div>
          <div>
            Meta description <i />
          </div>
          <div>
            Open Graph image <i />
          </div>
          <div>
            Sitemap <i />
          </div>
        </div>
      );
    case 2:
      return <div className="anat__plane ap-grid" />;
    case 3:
      return (
        <div className="anat__plane ap-words">
          <p>
            Say the one thing
            <br />
            that matters.
          </p>
          <span />
        </div>
      );
    case 4:
      return (
        <div className="anat__plane ap-motion">
          <svg viewBox="0 0 500 280" preserveAspectRatio="none">
            <path className="guide" d="M0 280 L500 0" />
            <path d="M0 280 C 180 280, 220 0, 500 0" />
            <circle r="9" />
          </svg>
        </div>
      );
    default:
      return (
        <div className="anat__plane ap-design">
          <div className="ap-design__nav">
            <b>Your site</b>
            <i>Book a call</i>
          </div>
          <div className="ap-design__disc" />
          <p className="ap-design__title">
            Nothing
            <br />
            generic.
          </p>
        </div>
      );
  }
}

/**
 * Pinned. A finished website tilts over, comes apart into its layers,
 * lights each one up, then snaps back together.
 */
export function Inside() {
  const sceneRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const scene = sceneRef.current!;
    const stack = scene.querySelector<HTMLElement>(".anat__stack")!;
    const layerEls = gsap.utils.toArray<HTMLElement>(".anat__layer", scene);
    const labels = layerEls.map((l) => l.querySelector<HTMLElement>(".anat__label")!);
    const lifts = layerEls.map(() => ({ v: 0 }));
    const s = { rx: 0, rz: 0, gap: 0, scale: 1, labels: 0, active: -1 };

    const render = () => {
      const w = stack.offsetWidth;
      // Exploding lifts the stack up the screen; push it down by the same amount.
      stack.style.transform = `translateY(${s.gap * 22}%) scale(${s.scale}) rotateX(${s.rx}deg) rotateZ(${s.rz}deg)`;
      layerEls.forEach((el, i) => {
        const z = i * (0.6 + s.gap * w * 0.15) + lifts[i].v * w * 0.06;
        el.style.transform = `translateZ(${z}px)`;
        el.dataset.on = String(s.active === i);
        const lb = labels[i];
        lb.style.transform = `translateY(-50%) rotateZ(${-s.rz}deg) rotateX(${-s.rx}deg)`;
        const shown = gsap.utils.clamp(0, 1, s.labels * layerEls.length - (layerEls.length - 1 - i));
        lb.style.opacity = String(s.active === -1 ? shown : s.active === i ? 1 : shown * 0.35);
      });
    };

    const mm = gsap.matchMedia();
    mm.add(
      { motion: "(prefers-reduced-motion: no-preference)", fine: "(hover: hover) and (pointer: fine)" },
      (c) => {
        const { motion, fine } = c.conditions as { motion: boolean; fine: boolean };
        if (!motion) {
          Object.assign(s, { rx: 58, rz: -36, gap: 1, scale: 0.8, labels: 1 });
          render();
          return;
        }

        const tl = gsap.timeline({
          defaults: { ease: "power2.inOut", onUpdate: render },
          scrollTrigger: {
            trigger: scene,
            start: "top top",
            end: () => `+=${window.innerHeight * 3.2}`,
            pin: true,
            scrub: 0.7,
            invalidateOnRefresh: true,
          },
        });
        tl.to(s, { rx: 58, rz: -36, scale: 0.78, duration: 1 })
          .to(s, { gap: 1, duration: 1.2 }, ">-0.2")
          .to(s, { labels: 1, duration: 0.8, ease: "none" }, "<0.3")
          .to(s, {
            active: 0,
            duration: 2.4,
            ease: "none",
            onUpdate: function () {
              // Walk the highlight from the top layer down.
              const p = this.progress();
              s.active = Math.min(layerEls.length - 1, Math.floor((1 - p) * layerEls.length));
              render();
            },
            onComplete: () => {
              s.active = -1;
              render();
            },
            onReverseComplete: () => {
              s.active = -1;
              render();
            },
          })
          .to(s, { rz: -24, duration: 2.4, ease: "none" }, "<")
          .to(s, { labels: 0, duration: 0.4 })
          .to(s, { gap: 0, duration: 1 }, "<")
          .to(s, { rx: 0, rz: 0, scale: 1, duration: 1 }, ">-0.3")
          .to({}, { duration: 0.5 });

        if (!fine) return;
        const offs = layerEls.map((el, i) => {
          const enter = () => gsap.to(lifts[i], { v: 1, duration: 0.5, ease: "expo.out", onUpdate: render });
          const leave = () => gsap.to(lifts[i], { v: 0, duration: 0.6, ease: "expo.out", onUpdate: render });
          el.addEventListener("pointerenter", enter);
          el.addEventListener("pointerleave", leave);
          return () => {
            el.removeEventListener("pointerenter", enter);
            el.removeEventListener("pointerleave", leave);
          };
        });
        return () => offs.forEach((o) => o());
      },
    );
    render();
    return () => mm.revert();
  }, []);

  return (
    <section
      id="inside"
      data-chapter="inside"
      data-theme="light"
      data-wipe
      className="chapter-light grain anat"
      aria-labelledby="inside-title"
    >
      <header className="anat__head frame" data-reveal>
        <Lines id="inside-title" className="t-mega" lines={["Layers."]} />
      </header>

      <div ref={sceneRef} className="anat__scene">
        <div className="anat__stack">
          {layers.map((l, i) => (
            <div key={l.name} className="anat__layer" data-cursor-label={l.name}>
              <Skin i={i} />
              <p className="anat__label">
                <span>0{i + 1}</span>
                <b>{l.name}</b>
              </p>
            </div>
          ))}
        </div>
        <ul className="sr-only">
          {layers.map((l) => (
            <li key={l.name}>
              {l.name}: {l.tag}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
