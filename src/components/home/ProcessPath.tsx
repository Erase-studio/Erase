"use client";

import { useEffect, useRef, useState } from "react";
import { gsap } from "@/lib/gsap";
import { buildSheet, SHEET } from "@/lib/processSheet";
import { sound } from "@/lib/sound";

const steps = [
  { name: "Talk", when: "Week 0", body: "Thirty minutes. Honest questions about who the site is for." },
  { name: "Direction", when: "Weeks 1–2", body: "One clear direction, not twelve mood boards." },
  { name: "Build", when: "Weeks 2–6", body: "A live preview link from the first week." },
  { name: "Launch", when: "Week 6 onward", body: "Go live, measure, keep improving." },
];

/**
 * Pinned. One sheet of paper becomes the website as you scroll: the notes from
 * the first call, a rough direction, the blueprint, the finished site. The
 * pencil draws each stage on; between stages the eraser wipes the sheet. It's
 * all driven by scroll, so it runs backwards too. Reduced motion gets the four
 * steps as a list beside the finished drawing.
 */
export function ProcessPath() {
  const rootRef = useRef<HTMLElement>(null);
  const [active, setActive] = useState(0);

  useEffect(() => {
    const root = rootRef.current!;
    const box = root.querySelector<HTMLElement>(".pr__sheet")!;
    const canvas = box.querySelector("canvas")!;
    const pencil = box.querySelector<HTMLElement>(".pr__pencil")!;
    const rubber = box.querySelector<HTMLElement>(".pr__rubber")!;
    const rail = root.querySelector<HTMLElement>(".pr__rail")!;
    const ctx = canvas.getContext("2d")!;
    const sheet = buildSheet(getComputedStyle(document.body).fontFamily);
    const reduced = !document.documentElement.classList.contains("motion");
    let scale = 1;
    let dpr = 1;
    let p = reduced ? 1 : 0;
    let drawnAt = -1;
    let lastEx = 0;
    let lastI = -1;
    let lastTip: [number, number] | null = null;

    const clamp = (v: number) => Math.min(1, Math.max(0, v));
    const smooth = (v: number) => {
      const t = clamp(v);
      return t * t * (3 - 2 * t);
    };

    const draw = (dt: number) => {
      const n = steps.length;
      const x = clamp(p) * n;
      const i = Math.min(n - 1, Math.floor(x));
      const local = x - i;
      const wipe = i === 0 ? 1 : smooth(local / 0.22);
      const d = reduced ? 1 : clamp((local - (i === 0 ? 0.02 : 0.18)) / 0.6);
      ctx.setTransform(scale, 0, 0, scale, 0, 0);
      const tip = sheet.render(ctx, i, d, wipe);
      if (i !== lastI) {
        lastI = i;
        setActive(i);
      }
      rail.style.setProperty("--p", (clamp(p) * n).toFixed(3));

      const k = scale / dpr; // sheet units → CSS px
      // The pencil sits on whatever is being drawn.
      if (tip && wipe >= 1 && !reduced) {
        pencil.style.opacity = "1";
        pencil.style.transform = `translate3d(${tip[0] * k}px, ${tip[1] * k}px, 0)`;
        // The pencil is heard only while it's actually moving across the paper.
        if (lastTip) {
          const speed = (Math.hypot(tip[0] - lastTip[0], tip[1] - lastTip[1]) * k) / Math.max(dt, 1e-3);
          if (speed > 8 && speed < 4000) sound.write(speed);
        }
        lastTip = tip;
      } else {
        pencil.style.opacity = "0";
        lastTip = null;
      }
      // The rubber rides the edge of the wipe, scrubbing up and down.
      if (wipe > 0 && wipe < 1 && !reduced) {
        const ex = (wipe * (SHEET.w + 120) - 60) * k;
        const ey = (SHEET.h / 2 + Math.sin(wipe * Math.PI * 7) * SHEET.h * 0.32) * k;
        rubber.style.opacity = "1";
        rubber.style.transform = `translate3d(${ex}px, ${ey}px, 0) rotate(${Math.cos(wipe * Math.PI * 7) * 0.3 - 1.2}rad)`;
        const speed = Math.abs(ex - lastEx) / Math.max(dt, 1e-3);
        if (speed > 20) sound.rub(speed * 0.9, 0.6);
        lastEx = ex;
      } else rubber.style.opacity = "0";
    };

    const size = () => {
      const b = box.getBoundingClientRect();
      dpr = Math.min(2, window.devicePixelRatio || 1);
      canvas.width = Math.round(b.width * dpr);
      canvas.height = Math.round(b.height * dpr);
      scale = canvas.width / SHEET.w;
      drawnAt = -1;
      draw(1 / 60);
    };
    const ro = new ResizeObserver(size);
    ro.observe(box);

    if (reduced) return () => ro.disconnect();

    let last = performance.now();
    const tick = () => {
      const now = performance.now();
      const dt = (now - last) / 1000;
      last = now;
      const r = root.getBoundingClientRect();
      if (r.bottom < -100 || r.top > window.innerHeight + 100) return;
      const target = clamp(-r.top / Math.max(1, r.height - window.innerHeight));
      p += (target - p) * (1 - Math.exp(-dt * 10));
      if (Math.abs(target - p) < 1e-4) p = target;
      if (Math.abs(p - drawnAt) < 1e-4) return;
      drawnAt = p;
      draw(dt);
    };
    gsap.ticker.add(tick);
    return () => {
      gsap.ticker.remove(tick);
      ro.disconnect();
    };
  }, []);

  return (
    <section id="process" ref={rootRef} className="pr" data-sound="process" aria-labelledby="proc-title">
      <div className="pr__sticky frame">
        <header className="pr__head">
          <p className="mono muted">(04) How a project runs</p>
          <h2 id="proc-title" className="pr__h">
            Four stops.
            <br />
            No surprises.
          </h2>
        </header>

        <ol className="pr__steps">
          {steps.map((s, i) => (
            <li key={s.name} className="pr__step" data-on={i === active}>
              <p className="pr__num" aria-hidden="true">
                0{i + 1}
              </p>
              <div className="pr__text">
                <p className="mono muted">{s.when}</p>
                <h3 className="pr__name">{s.name}</h3>
                <p className="body">{s.body}</p>
              </div>
            </li>
          ))}
        </ol>

        <div className="pr__rail" aria-hidden="true">
          {steps.map((s, i) => (
            <span key={s.name} style={{ "--k": i } as React.CSSProperties}>
              <i />
              <b className="mono">{s.name}</b>
            </span>
          ))}
        </div>

        <div className="pr__sheet" aria-hidden="true">
          <canvas />
          <div className="pr__pencil">
            <i />
          </div>
          <div className="pr__rubber">
            <i />
            <b>Erase</b>
          </div>
        </div>
      </div>
    </section>
  );
}
