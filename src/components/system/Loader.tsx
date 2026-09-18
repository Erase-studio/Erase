"use client";

import { useEffect, useRef, useState } from "react";
import { whenStageReady } from "@/lib/stage/store";
import { RubHand, RubSurface, mulberry32 } from "@/lib/rub";
import { sound } from "@/lib/sound";

declare global {
  interface Window {
    __eraseLoaded?: boolean;
  }
}

/**
 * The loader is a sheet of paper. A pencil shades the percentage in by hand;
 * each new number rubs out the last, which leaves a grey ghost behind. At 100
 * it asks how you'd like to come in (the click that lets sound start), and a
 * big eraser scrubs the whole sheet away, crumbs and all, with the site
 * underneath. Later visits in the same session get a short version with no
 * question. Reduced motion skips it entirely.
 */

type Seg = [number, number, number, number];
const PAPER = "#ecebe6";
const LEAD = "28,29,33";

export function Loader() {
  const rootRef = useRef<HTMLDivElement>(null);
  const gate = useRef<((withSound: boolean) => void) | null>(null);
  const [phase, setPhase] = useState<"idle" | "sketch" | "gate" | "exit" | "done">("idle");
  const [steps, setSteps] = useState({ fonts: false, stage: false, sketch: false });

  useEffect(() => {
    const root = rootRef.current!;
    const html = document.documentElement;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let seen = false;
    try {
      seen = sessionStorage.getItem("erase:seen") === "1";
    } catch {}

    const announce = () => {
      if (window.__eraseLoaded) return;
      window.__eraseLoaded = true;
      html.style.overflow = "";
      window.__lenis?.start();
      try {
        sessionStorage.setItem("erase:seen", "1");
      } catch {}
      window.setTimeout(() => {
        window.dispatchEvent(new Event("erase:loaded"));
        window.dispatchEvent(new Event("erase:reveal"));
      }, 0);
    };

    // Reduced motion: CSS keeps the loader hidden; just open the page.
    if (reduced) {
      announce();
      return;
    }

    html.style.overflow = "hidden";
    window.__lenis?.stop();
    let cancelled = false;
    const rafs = new Set<number>();

    // ─── Canvases: paper (with the grey ghosts), ink (the pencil), crumbs ───
    const paper = root.querySelector<HTMLCanvasElement>(".loader__paper")!;
    const ink = root.querySelector<HTMLCanvasElement>(".loader__ink")!;
    const crumbsC = root.querySelector<HTMLCanvasElement>(".loader__crumbs")!;
    const pencil = root.querySelector<HTMLElement>(".loader__pencil")!;
    const tool = root.querySelector<HTMLElement>(".loader__tool")!;
    const W = window.innerWidth;
    const H = window.innerHeight;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    for (const c of [paper, ink, crumbsC]) {
      c.width = Math.round(W * dpr);
      c.height = Math.round(H * dpr);
    }
    const pctx = paper.getContext("2d")!;
    const ictx = ink.getContext("2d")!;
    const cctx = crumbsC.getContext("2d")!;
    for (const x of [pctx, ictx, cctx]) x.setTransform(dpr, 0, 0, dpr, 0, 0);
    const rnd = mulberry32(19);

    // Paper with a little tooth.
    pctx.fillStyle = PAPER;
    pctx.fillRect(0, 0, W, H);
    const grain = document.createElement("canvas");
    grain.width = grain.height = 160;
    const g = grain.getContext("2d")!;
    const img = g.createImageData(160, 160);
    for (let i = 0; i < img.data.length; i += 4) {
      const v = rnd() < 0.5 ? 0 : 255;
      img.data[i] = img.data[i + 1] = img.data[i + 2] = v;
      img.data[i + 3] = rnd() * 16;
    }
    g.putImageData(img, 0, 0);
    pctx.fillStyle = pctx.createPattern(grain, "repeat")!;
    pctx.fillRect(0, 0, W, H);
    root.dataset.painted = "true";

    const frame = () =>
      new Promise<number>((r) => {
        const id = requestAnimationFrame((t) => {
          rafs.delete(id);
          r(t);
        });
        rafs.add(id);
      });
    const tween = async (ms: number, fn: (t: number) => void) => {
      const t0 = performance.now();
      for (;;) {
        const now = await frame();
        if (cancelled) return;
        const t = Math.min(1, (now - t0) / ms);
        fn(t);
        if (t >= 1) return;
      }
    };
    const sleep = (ms: number) => new Promise((r) => window.setTimeout(r, ms));

    // ─── Crumbs, shared by every rub ───
    type Crumb = { x: number; y: number; vx: number; vy: number; r: number; a: number; c: string };
    const crumbs: Crumb[] = [];
    const shed = (x: number, y: number, n: number, vx: number) => {
      for (let i = 0; i < n && crumbs.length < 500; i++)
        crumbs.push({
          x: x + (rnd() - 0.5) * 70,
          y: y + (rnd() - 0.5) * 24,
          vx: vx * 0.1 + (rnd() - 0.5) * 220,
          vy: -rnd() * 160,
          r: 1.2 + rnd() * rnd() * 4,
          a: rnd() * 6,
          c: ["#f4f3ee", "#dcdad2", "#bdbab2", "#8d8f95"][(rnd() * 4) | 0],
        });
    };
    let crumbsRunning = false;
    const runCrumbs = async () => {
      if (crumbsRunning) return;
      crumbsRunning = true;
      let last = performance.now();
      while (!cancelled && crumbs.length) {
        const now = await frame();
        const dt = Math.min(1 / 30, (now - last) / 1000);
        last = now;
        cctx.clearRect(0, 0, W, H);
        for (let i = crumbs.length - 1; i >= 0; i--) {
          const c = crumbs[i];
          c.vy += 2000 * dt;
          c.x += c.vx * dt;
          c.y += c.vy * dt;
          c.a += c.vx * 0.02 * dt;
          if (c.y > H + 20) {
            crumbs.splice(i, 1);
            continue;
          }
          cctx.save();
          cctx.translate(c.x, c.y);
          cctx.rotate(c.a);
          cctx.fillStyle = c.c;
          cctx.fillRect(-c.r, -c.r * 0.6, c.r * 2, c.r * 1.2);
          cctx.restore();
        }
      }
      cctx.clearRect(0, 0, W, H);
      crumbsRunning = false;
    };

    // ─── The pencil shading a number in ───
    const family = getComputedStyle(document.body).fontFamily;
    let fs = 100;
    const font = () => `600 ${fs}px ${family}`;
    const layout = () => {
      ictx.font = `600 100px ${family}`;
      const w100 = ictx.measureText("100").width;
      fs = Math.min(H * 0.46, (W * 0.84 * 100) / w100);
    };
    const cx = W / 2;
    const cy = H * 0.5;

    /** Hatch lines inside the glyphs, in the order a hand would draw them. */
    const hatch = (text: string, angle: number, gap: number): Seg[] => {
      ictx.font = font();
      const m = ictx.measureText(text);
      const tw = m.width;
      const asc = m.actualBoundingBoxAscent;
      const desc = m.actualBoundingBoxDescent;
      const k = 0.25;
      const mw = Math.ceil(tw * k) + 4;
      const mh = Math.ceil((asc + desc) * k) + 4;
      const mc = document.createElement("canvas");
      mc.width = mw;
      mc.height = mh;
      const mx = mc.getContext("2d", { willReadFrequently: true })!;
      mx.font = `600 ${fs * k}px ${family}`;
      mx.textBaseline = "alphabetic";
      mx.fillText(text, 2, 2 + asc * k);
      const a = mx.getImageData(0, 0, mw, mh).data;
      const x0 = cx - tw / 2;
      const top = cy - (asc + desc) / 2;
      const inside = (x: number, y: number) => {
        const u = Math.round((x - x0) * k + 2);
        const v = Math.round((y - top) * k + 2);
        return u >= 0 && v >= 0 && u < mw && v < mh && a[(v * mw + u) * 4 + 3] > 110;
      };
      const d = [Math.cos(angle), Math.sin(angle)];
      const nrm = [-d[1], d[0]];
      const half = Math.hypot(tw, asc + desc) / 2 + 10;
      const segs: Seg[] = [];
      let flip = false;
      for (let off = -half; off <= half; off += gap) {
        const bx = cx + nrm[0] * off;
        const by = cy + nrm[1] * off;
        const line: Seg[] = [];
        let start: number | null = null;
        for (let t = -half; t <= half + 3; t += 3) {
          const ins = t <= half && inside(bx + d[0] * t, by + d[1] * t);
          if (ins && start === null) start = t;
          if (!ins && start !== null) {
            if (t - start > 4) line.push([bx + d[0] * start, by + d[1] * start, bx + d[0] * t, by + d[1] * t]);
            start = null;
          }
        }
        // Back and forth, like a hand shading.
        if (flip) line.reverse().forEach((s) => s.splice(0, 4, s[2], s[3], s[0], s[1]));
        flip = !flip;
        segs.push(...line);
      }
      return segs;
    };

    const stroke = (s: Seg, alpha: number, width: number) => {
      const [x1, y1, x2, y2] = s;
      const mx = (x1 + x2) / 2 + (rnd() - 0.5) * 2.2;
      const my = (y1 + y2) / 2 + (rnd() - 0.5) * 2.2;
      ictx.strokeStyle = `rgba(${LEAD},${alpha})`;
      ictx.lineWidth = width;
      ictx.beginPath();
      ictx.moveTo(x1 + (rnd() - 0.5) * 1.5, y1 + (rnd() - 0.5) * 1.5);
      ictx.quadraticCurveTo(mx, my, x2 + (rnd() - 0.5) * 3, y2 + (rnd() - 0.5) * 3);
      ictx.stroke();
    };
    const tip = (x: number, y: number, show = true) => {
      pencil.style.opacity = show ? "1" : "0";
      pencil.style.transform = `translate3d(${x}px, ${y}px, 0)`;
    };

    const sketch = async (text: string, ms: number) => {
      ictx.lineCap = "round";
      const a = -1.05 + (rnd() - 0.5) * 0.2;
      const main = hatch(text, a, fs * 0.034);
      const cross = hatch(text, a + 1.2, fs * 0.07);
      let drawn = 0;
      let crossDrawn = 0;
      let last: Seg | null = null;
      await tween(ms, (t) => {
        const want = Math.floor(main.length * Math.min(1, t / 0.78));
        for (; drawn < want; drawn++) stroke((last = main[drawn]), 0.5 + rnd() * 0.3, 1.3 + rnd() * 1.1);
        if (t > 0.6) {
          const cw = Math.floor(cross.length * Math.min(1, (t - 0.6) / 0.4));
          for (; crossDrawn < cw; crossDrawn++) stroke((last = cross[crossDrawn]), 0.25 + rnd() * 0.2, 1 + rnd() * 0.8);
        }
        if (last) tip(last[2], last[3]);
      });
      // Two loose outline passes.
      ictx.font = font();
      ictx.textAlign = "center";
      ictx.textBaseline = "alphabetic";
      const m = ictx.measureText(text);
      const oy = cy + (m.actualBoundingBoxAscent - m.actualBoundingBoxDescent) / 2;
      for (let i = 0; i < 2; i++) {
        ictx.strokeStyle = `rgba(${LEAD},${0.55 + i * 0.2})`;
        ictx.lineWidth = 1.4 + i * 0.6;
        ictx.save();
        ictx.translate((rnd() - 0.5) * 3, (rnd() - 0.5) * 3);
        ictx.strokeText(text, cx, oy);
        ictx.restore();
      }
      return m;
    };

    // ─── Rubbing out ───
    const hand = new RubHand(120);
    const inkRub = new RubSurface({ canvas: ink, marks: paper, residue: "150,152,158", specks: ["#8b8e94", "#b9bcc4"], strength: 0.55, cols: 30, rows: 18 });
    Object.assign(inkRub, { w: W, h: H, dpr });

    /** Scrub a box with the eraser, row by row. Returns when it's done. */
    const scrub = async (surface: RubSurface, box: { x: number; y: number; w: number; h: number }, radius: number, ms: number, rows: number) => {
      const pts: [number, number][] = [];
      for (let r = 0; r < rows; r++) {
        const y = box.y + ((r + 0.5) / rows) * box.h;
        const l: [number, number] = [box.x - radius * 0.4 + rnd() * 20, y + (rnd() - 0.5) * radius * 0.3];
        const rr: [number, number] = [box.x + box.w + radius * 0.4 - rnd() * 20, y + (rnd() - 0.5) * radius * 0.3];
        pts.push(...(r % 2 ? [rr, l] : [l, rr]));
      }
      const lens = pts.slice(1).map((p, i) => Math.hypot(p[0] - pts[i][0], p[1] - pts[i][1]));
      const total = lens.reduce((a, b) => a + b, 0);
      hand.reset(pts[0][0], pts[0][1]);
      surface.lift();
      tool.style.opacity = "1";
      let lastT = performance.now();
      await tween(ms, (t) => {
        const now = performance.now();
        const dt = Math.max(1 / 240, (now - lastT) / 1000);
        lastT = now;
        // Ease in and out of the whole scrub.
        const e = t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2;
        let d = e * total;
        let i = 0;
        while (i < lens.length - 1 && d > lens[i]) d -= lens[i++];
        const f = lens[i] ? d / lens[i] : 0;
        hand.aim(pts[i][0] + (pts[i + 1][0] - pts[i][0]) * f, pts[i][1] + (pts[i + 1][1] - pts[i][1]) * f);
        hand.push = 1;
        hand.step(dt);
        const got = surface.rubTo(hand.x, hand.y, 1.1, hand.angle, radius);
        if (hand.reversed) surface.turn(hand.x, hand.y, radius);
        if (got.removed > 0.02) shed(hand.x, hand.y, Math.min(6, Math.ceil(got.removed * 4)), hand.vx);
        sound.rub(hand.speed, 1);
        tool.style.transform = `translate3d(${hand.x}px, ${hand.y}px, 0) rotate(${hand.angle + 1}rad) scale(${radius / 60})`;
        runCrumbs();
      });
      surface.lift();
      tool.style.opacity = "0";
    };

    const numberBox = (m: TextMetrics) => {
      const w = m.width;
      const h = m.actualBoundingBoxAscent + m.actualBoundingBoxDescent;
      return { x: cx - w / 2, y: cy - h / 2 - fs * 0.04, w, h: h + fs * 0.08 };
    };

    // ─── The sequence ───
    const fontsReady = document.fonts.ready.then(() => !cancelled && setSteps((s) => ({ ...s, fonts: true })));
    const stageReady = whenStageReady().then(() => !cancelled && setSteps((s) => ({ ...s, stage: true })));
    const ready = Promise.all([fontsReady, stageReady]);

    (async () => {
      await fontsReady;
      if (cancelled) return;
      layout();
      setPhase("sketch");
      const values = seen ? ["100"] : ["00", "41"];
      let m: TextMetrics | null = null;
      for (const v of values) {
        if (cancelled) return;
        if (m) {
          tip(0, 0, false);
          await scrub(inkRub, numberBox(m), fs * 0.2, 380, 3);
        }
        m = await sketch(v, seen ? 380 : 420);
        await sleep(seen ? 0 : 80);
      }
      await ready;
      if (cancelled) return;
      if (!seen && m) {
        tip(0, 0, false);
        await scrub(inkRub, numberBox(m), fs * 0.2, 340, 3);
        m = await sketch("100", 480);
      }
      tip(0, 0, false);
      setSteps((s) => ({ ...s, sketch: true }));

      // First visit: the question (and the click that starts sound).
      if (!seen) {
        setPhase("gate");
        const withSound = await new Promise<boolean>((resolve) => (gate.current = resolve));
        if (cancelled) return;
        sound.set(withSound);
      }
      setPhase("exit");

      // Put the drawing onto the paper, then rub the paper itself away.
      pctx.setTransform(1, 0, 0, 1, 0, 0);
      pctx.drawImage(ink, 0, 0);
      pctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ictx.clearRect(0, 0, W, H);
      root.dataset.clear = "true";
      const out = new RubSurface({ canvas: paper, strength: 0.95, cols: 32, rows: 20 });
      Object.assign(out, { w: W, h: H, dpr });
      const radius = Math.max(90, Math.min(160, W * 0.085));
      const rows = Math.ceil(H / (radius * 0.85)) + 1;
      window.setTimeout(announce, 120);
      await scrub(out, { x: 0, y: -radius * 0.2, w: W, h: H + radius * 0.4 }, radius, seen ? 900 : 1500, rows);
      await new Promise<void>((r) => out.dissolve(380, r));
      announce();
      while (crumbs.length && !cancelled) await frame();
      if (!cancelled) setPhase("done");
    })();

    return () => {
      cancelled = true;
      rafs.forEach((id) => cancelAnimationFrame(id));
      html.style.overflow = "";
    };
  }, []);

  if (phase === "done") return null;

  return (
    <div
      ref={rootRef}
      className="loader"
      data-phase={phase}
      role={phase === "gate" ? "dialog" : undefined}
      aria-modal={phase === "gate" ? true : undefined}
      aria-label="Welcome to Erase"
      aria-hidden={phase === "gate" ? undefined : true}
    >
      <canvas className="loader__paper" />
      <canvas className="loader__ink" />
      <canvas className="loader__crumbs" />
      <div className="loader__pencil" aria-hidden="true">
        <i />
      </div>
      <div className="loader__tool" aria-hidden="true">
        <i />
        <b>Erase</b>
      </div>

      <div className="loader__ui">
        <p className="loader__brand">Erase</p>
        <p className="loader__tag mono">Independent design &amp; development studio</p>
        <ul className="loader__steps mono">
          <li data-done={steps.fonts}>Sharpening the pencil</li>
          <li data-done={steps.stage}>Setting up the desk</li>
          <li data-done={steps.sketch}>Rubbing out the template</li>
        </ul>
        <p className="loader__tip mono">Headphones on. It sounds better.</p>

        {phase === "gate" && (
          <div className="loader__gate">
            <button type="button" className="loader__enter" autoFocus onClick={() => gate.current?.(true)}>
              <span className="snd" data-on="true" aria-hidden="true">
                <i />
                <i />
                <i />
                <i />
              </span>
              Enter with sound
            </button>
            <button type="button" className="loader__quiet mono" onClick={() => gate.current?.(false)}>
              or come in quietly
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
