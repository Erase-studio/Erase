"use client";

import { useEffect, useRef } from "react";
import { gsap } from "@/lib/gsap";
import { work } from "@/content/work";
import { eraserBus } from "@/lib/eraserBus";
import { EraseReveal } from "@/components/erase/EraseReveal";
import { PreviewFrame } from "@/components/work/PreviewFrame";
import { TransitionLink } from "@/components/system/TransitionLink";

const isLight = (hex: string) => {
  const n = parseInt(hex.slice(1), 16);
  const [r, g, b] = [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  return 0.2126 * r + 0.7152 * g + 0.0722 * b > 150;
};

// Visible area of a sheet while the eraser band crosses it (a: 0 → 150).
const band = (a: number) => `polygon(${a}% 0%, 150% 0%, 150% 100%, ${a - 25}% 100%)`;
const edge = (a: number) =>
  `polygon(${a}% 0%, ${a + 0.25}% 0%, ${a - 24.75}% 100%, ${a - 25}% 100%)`;

export function Proof() {
  const rootRef = useRef<HTMLElement>(null);
  const stackRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const root = rootRef.current!;
    const stack = stackRef.current!;
    const mm = gsap.matchMedia();

    mm.add("(min-width: 1024px) and (prefers-reduced-motion: no-preference)", () => {
      const sheets = gsap.utils.toArray<HTMLElement>(".sheet", stack);
      const rail = gsap.utils.toArray<HTMLElement>(".proof__rail li", stack);
      const railFill = stack.querySelector<HTMLElement>(".proof__rail-fill");
      const n = sheets.length;
      stack.dataset.pinned = "true";

      // Previews tilt toward the pointer, like picking a sheet up off the desk.
      const tilts = gsap.utils.toArray<HTMLElement>(".sheet__tilt", stack);
      const offs = tilts.map((el) => {
        const rx = gsap.quickTo(el, "rotationX", { duration: 0.8, ease: "expo.out" });
        const ry = gsap.quickTo(el, "rotationY", { duration: 0.8, ease: "expo.out" });
        const move = (e: PointerEvent) => {
          const r = el.getBoundingClientRect();
          ry(((e.clientX - r.left) / r.width - 0.5) * 12);
          rx(-((e.clientY - r.top) / r.height - 0.5) * 9);
        };
        const leave = () => {
          rx(0);
          ry(0);
        };
        el.addEventListener("pointermove", move);
        el.addEventListener("pointerleave", leave);
        return () => {
          el.removeEventListener("pointermove", move);
          el.removeEventListener("pointerleave", leave);
        };
      });
      root.dataset.theme = isLight(work[0].tone.bg) ? "light" : "dark";

      // Each sheet rests (HOLD) before the eraser crosses it (1 unit). No snapping:
      // the rest beats do that job without fighting the wheel.
      const HOLD = 0.6;
      const units = HOLD + (n - 1) * (1 + HOLD);
      const at = (i: number) => HOLD + i * (1 + HOLD);
      const tl = gsap.timeline({
        defaults: { ease: "power2.inOut", duration: 1 },
        scrollTrigger: {
          trigger: stack,
          start: "top top",
          end: () => `+=${units * window.innerHeight * 0.7}`,
          pin: true,
          scrub: 0.8,
          invalidateOnRefresh: true,
          onUpdate(self) {
            const t = self.progress * units;
            // Switch halfway through each erase.
            const i = Math.min(n - 1, Math.max(0, Math.floor((t - HOLD - 0.5) / (1 + HOLD)) + 1));
            root.dataset.theme = isLight(work[i].tone.bg) ? "light" : "dark";
            rail.forEach((li, k) => (li.dataset.on = String(k === i)));
            if (railFill) railFill.style.transform = `scaleY(${self.progress})`;
          },
        },
      });
      tl.to({}, { duration: units }, 0);

      // Huge ghost titles drift against the sheets for depth.
      sheets.forEach((sheet, idx) => {
        const ghost = sheet.querySelector(".sheet__ghost");
        if (ghost) tl.fromTo(ghost, { xPercent: 12 }, { xPercent: -18, ease: "none", duration: 1 + HOLD * 2 }, Math.max(0, at(idx) - 1 - HOLD));
      });

      sheets.forEach((sheet, idx) => {
        if (idx === n - 1) return;
        const i = at(idx);
        const next = sheets[idx + 1];
        const a = { v: 0 };
        tl.to(
          a,
          {
            v: 150,
            onUpdate: () => {
              sheet.style.clipPath = band(a.v);
              (sheet.querySelector(".sheet__edge") as HTMLElement).style.clipPath = edge(a.v);
              eraserBus.band(a.v, 1.7);
            },
          },
          i,
        )
          .to(sheet.querySelector(".sheet__frame"), { xPercent: 10, rotate: 1.5 }, i)
          .fromTo(next.querySelector(".sheet__text"), { xPercent: -8 }, { xPercent: 0 }, i)
          .fromTo(
            next.querySelector(".sheet__frame"),
            { yPercent: 8, scale: 0.94 },
            { yPercent: 0, scale: 1 },
            i,
          );
      });

      return () => {
        offs.forEach((off) => off());
        delete stack.dataset.pinned;
        root.dataset.theme = "dark";
        sheets.forEach((s) => {
          s.style.clipPath = "";
          (s.querySelector(".sheet__edge") as HTMLElement).style.clipPath = "";
        });
      };
    });

    return () => mm.revert();
  }, []);

  return (
    <section
      ref={rootRef}
      id="proof"
      data-chapter="proof"
      data-theme="dark"
      className="proof grain"
      aria-labelledby="proof-title"
    >
      <header className="frame svc__head pt-[clamp(120px,20vh,240px)]">
        <EraseReveal cover="graphite" as="span">
          <h2 id="proof-title" className="t-mega">
            Work.
          </h2>
        </EraseReveal>
        <div className="svc__aside">
          <p className="svc__intro">Selected websites: our own, and concept studies that show our range.</p>
          <TransitionLink href="/work" title="Work" className="btn btn-ghost">
            All work <span className="btn-arrow">→</span>
          </TransitionLink>
        </div>
      </header>

      <div ref={stackRef} className="proof__stack">
        {work.map((item, i) => (
          <article
            key={item.slug}
            className="sheet"
            style={
              {
                "--sheet-bg": item.tone.bg,
                "--sheet-fg": item.tone.fg,
                "--sheet-muted": item.tone.muted,
                zIndex: work.length - i,
              } as React.CSSProperties
            }
            aria-labelledby={`work-${item.slug}`}
          >
            <p className="sheet__ghost" aria-hidden="true">
              {item.title}
            </p>
            <div className="sheet__inner frame">
              <div className="sheet__meta t-label">
                <span className="sheet__kind" data-kind={item.kind}>
                  {item.kind}
                </span>
              </div>

              <div className="sheet__body">
                <div className="sheet__text">
                  <h3 id={`work-${item.slug}`} className="sheet__title">
                    {item.title}
                  </h3>
                  <p className="sheet__brief">{item.brief}</p>
                  <TransitionLink
                    href={`/work/${item.slug}`}
                    title={item.title}
                    tone={item.tone}
                    label={item.kind}
                    className="sheet__open"
                  >
                    <span>Open</span>
                    <span className="sheet__open-arrow" aria-hidden="true">
                      →
                    </span>
                  </TransitionLink>
                </div>
                <div className="sheet__frame">
                  <TransitionLink
                    href={`/work/${item.slug}`}
                    title={item.title}
                    tone={item.tone}
                    label={item.kind}
                    className="sheet__tilt"
                    aria-label={`Open the ${item.title} case study`}
                    tabIndex={-1}
                  >
                    <PreviewFrame item={item} />
                  </TransitionLink>
                </div>
              </div>
            </div>
            <div className="sheet__edge" aria-hidden="true" />
          </article>
        ))}
        <div className="proof__rail" aria-hidden="true">
          <span className="proof__rail-track">
            <span className="proof__rail-fill" />
          </span>
          <ol>
            {work.map((w, k) => (
              <li key={w.slug} data-on={k === 0}>
                <span>{String(k + 1).padStart(2, "0")}</span>
              </li>
            ))}
          </ol>
        </div>
      </div>

    </section>
  );
}
