"use client";

import { useEffect, useRef, useState } from "react";
import { gsap } from "@/lib/gsap";
import { eraserBus } from "@/lib/eraserBus";

const steps = [
  {
    name: "Talk",
    word: "Discover",
    when: "Week 0",
    body: "30 minutes. Honest questions.",
    url: "call-notes.txt",
  },
  {
    name: "Direction",
    word: "Design",
    when: "Weeks 1–2",
    body: "One direction. Not twelve mood boards.",
    url: "sketch — v1",
  },
  {
    name: "Build",
    word: "Build",
    when: "Weeks 2–6",
    body: "A live preview link from week one.",
    url: "preview.erase.studio/you",
  },
  {
    name: "Launch & after",
    word: "Launch",
    when: "Week 6 onward",
    body: "Launch, measure, keep improving.",
    url: "yourbusiness.com",
  },
];

// Next stage writes in from the left along the eraser angle (a: 0 → 150).
const write = (a: number) => `polygon(-50% 0%, ${a}% 0%, ${a - 25}% 100%, -50% 100%)`;

function Stage({ i }: { i: number }) {
  if (i === 0)
    return (
      <div className="ps ps--talk">
        <p className="ps__note-head">Call notes · 30 min</p>
        <ol>
          <li>Who has to trust this site before they buy?</li>
          <li>What should they do next, exactly?</li>
          <li>What is the current site getting wrong?</li>
          <li>What do competitors all say? (don’t)</li>
        </ol>
        <svg viewBox="0 0 300 20" className="ps__scribble" preserveAspectRatio="none">
          <path d="M2 14 C 60 4, 90 18, 150 9 S 250 6, 298 12" />
        </svg>
      </div>
    );
  if (i === 1)
    return (
      <div className="ps ps--sketch">
        <svg viewBox="0 0 160 100" preserveAspectRatio="none">
          <path d="M6 8 L40 7.5" />
          <path d="M118 8 L126 8.4 M132 8 L140 7.6 M146 8 L154 8.2" />
          <path d="M7 22 L96 21 M7 33 L78 33.6" className="thick" />
          <path d="M7 44 L60 44.4 M7 49 L52 48.6" />
          <path d="M7 58 Q 8 55 12 55 L 34 55.4 Q 37 56 37 59 L 36.6 63 Q 36 65 33 65 L 11 64.6 Q 7 64 7 61 Z" />
          <path d="M104 20 L154 20.5 L153.5 66 L103.6 65.4 Z M104 20 L153.5 66 M154 20.5 L103.6 65.4" />
          <path d="M6 76 L50 76.3 L49.6 96 L6.4 95.6 Z M58 76 L102 75.6 L102.4 96 L58.2 96.3 Z M110 76.2 L154 76 L153.7 96 L110 95.6 Z" />
        </svg>
      </div>
    );
  if (i === 2)
    return (
      <div className="ps ps--build">
        <div className="ps__bnav">
          <b>Your business</b>
          <span />
          <span />
          <i />
        </div>
        <p className="ps__bh">
          Your website,
          <br />
          almost.
        </p>
        <div className="ps__blines">
          <span />
          <span />
        </div>
        <div className="ps__bimg" />
        <div className="ps__bgrid">
          <span />
          <span />
          <span />
        </div>
        <span className="ps__chip">Live preview · updated today</span>
      </div>
    );
  return (
    <div className="ps ps--live">
      <div className="ps__lnav">
        <b>Your business</b>
        <span>Work</span>
        <span>About</span>
        <i>Book a call</i>
      </div>
      <p className="ps__lh">
        Your website,
        <br />
        finally.
      </p>
      <p className="ps__lsub">The one that makes people get in touch.</p>
      <div className="ps__limg" />
      <span className="ps__live">Live</span>
    </div>
  );
}

export function Process() {
  const rootRef = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(0);

  useEffect(() => {
    const root = rootRef.current!;
    const mm = gsap.matchMedia();
    mm.add("(prefers-reduced-motion: no-preference)", () => {
      root.dataset.motion = "true";
      const layers = gsap.utils.toArray<HTMLElement>(".process__layer", root);
      const words = gsap.utils.toArray<HTMLElement>(".proc__word", root);
      const tilt = root.querySelector<HTMLElement>(".proc__tilt")!;
      const view = root.querySelector<HTMLElement>(".proc__tilt .bframe__view")!;
      const n = steps.length;
      const HOLD = 0.5;
      const STEP = 0.9;
      const units = HOLD + (n - 1) * (STEP + HOLD);

      // y: 0 everywhere so a stale pixel offset can never stack on top of yPercent.
      words.forEach((w, i) => gsap.set(w.querySelectorAll(".proc__c"), { y: 0, yPercent: i === 0 ? 0 : 115 }));

      const tl = gsap.timeline({
        defaults: { ease: "power2.inOut", duration: STEP },
        scrollTrigger: {
          trigger: root,
          start: "top top",
          end: () => `+=${units * window.innerHeight * 0.8}`,
          pin: true,
          scrub: 0.7,
          invalidateOnRefresh: true,
          onUpdate: (self) => {
            const t = self.progress * units;
            setActive(Math.min(n - 1, Math.max(0, Math.floor((t - HOLD - STEP / 2) / (STEP + HOLD)) + 1)));
          },
        },
      });
      tl.to({}, { duration: units }, 0);
      // The frame turns slowly through the whole sequence.
      tl.fromTo(tilt, { rotateY: -22, rotateX: 12, rotateZ: -3 }, { rotateY: 18, rotateX: -6, rotateZ: 2, ease: "none", duration: units }, 0);

      layers.forEach((layer, i) => {
        if (i === 0) return;
        const at = HOLD + (i - 1) * (STEP + HOLD);
        const a = { v: -25 };
        layer.style.clipPath = write(-25);
        tl.to(
          a,
          {
            v: 150,
            onUpdate: () => {
              layer.style.clipPath = write(a.v);
              if (a.v < 0 || a.v > 122) return;
              // The eraser rubs the old stage off the frame.
              const r = view.getBoundingClientRect();
              const f = 0.5 + 0.36 * Math.sin(a.v * 0.3);
              const x = r.left + (r.width * (a.v - 25 * f)) / 100;
              const y = r.top + r.height * f;
              const dx = x - eraserBus.state.x;
              eraserBus.point(x, y, 1, 1.05);
              if (Math.abs(dx) > 0.5) eraserBus.crumbs(x, y, 2, Math.sign(dx));
            },
          },
          at,
        );
        tl.fromTo(
          words[i - 1].querySelectorAll(".proc__c"),
          { y: 0, yPercent: 0, fontStretch: "112.5%" },
          { y: 0, yPercent: -115, fontStretch: "75%", stagger: 0.03, duration: STEP * 0.5, ease: "power3.in", immediateRender: false },
          at,
        );
        tl.fromTo(
          words[i].querySelectorAll(".proc__c"),
          { y: 0, yPercent: 115, fontStretch: "125%" },
          { y: 0, yPercent: 0, fontStretch: "112.5%", stagger: 0.03, duration: STEP * 0.6, ease: "power3.out", immediateRender: false },
          at + STEP * 0.45,
        );
      });

      // Pointer adds a little extra tilt on top.
      const fine = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
      const inner = root.querySelector<HTMLElement>(".proc__frame")!;
      const rx = gsap.quickTo(inner, "rotationX", { duration: 0.9, ease: "expo.out" });
      const ry = gsap.quickTo(inner, "rotationY", { duration: 0.9, ease: "expo.out" });
      const move = (e: PointerEvent) => {
        ry((e.clientX / window.innerWidth - 0.5) * 12);
        rx(-(e.clientY / window.innerHeight - 0.5) * 8);
      };
      if (fine) window.addEventListener("pointermove", move);

      return () => {
        window.removeEventListener("pointermove", move);
        delete root.dataset.motion;
        layers.forEach((l) => (l.style.clipPath = ""));
        setActive(0);
      };
    });
    return () => mm.revert();
  }, []);

  return (
    <section id="process" data-chapter="process" data-theme="light" className="chapter-light grain process">
      <h2 className="sr-only">How a project runs</h2>
      <ol className="sr-only">
        {steps.map((s) => (
          <li key={s.name}>
            {s.name}: {s.body}
          </li>
        ))}
      </ol>

      <div ref={rootRef} className="proc" aria-hidden="true">
        <div className="proc__words">
          {steps.map((s) => (
            <p key={s.name} className="proc__word" style={{ fontSize: `min(27vw, ${150 / s.word.length}vw)` }}>
              {s.word.split("").map((c, k) => (
                <span key={k} className="proc__c">
                  {c}
                </span>
              ))}
            </p>
          ))}
        </div>

        <div className="proc__frame">
          <div className="proc__tilt">
            <div className="bframe bframe--light">
              <div className="bframe__bar">
                <i />
                <i />
                <i />
                <span className="bframe__url">{steps[active].url}</span>
              </div>
              <div className="bframe__view">
                {steps.map((s, i) => (
                  <div key={s.name} className="process__layer" style={{ zIndex: i + 1 }}>
                    <Stage i={i} />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        <p className="proc__count t-label">
          How we work · 0{active + 1} <span>/ 0{steps.length} · {steps[active].when}</span>
        </p>
      </div>
    </section>
  );
}
