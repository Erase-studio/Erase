"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { eraserBus } from "@/lib/eraserBus";
import { humanPath, RubHand, RubSurface, runPath, withEraser } from "@/lib/rub";

/**
 * A pencil-hatched sheet over the content. Rub it with the cursor to reveal what's
 * underneath: the rubber drags, it takes a couple of passes, and it leaves smudges.
 * Nothing takes the eraser out of your hand: once most of it is gone and you pause,
 * the last flecks lift on their own. Cards nobody touches get erased by hand
 * (touch devices straight away).
 */

const TONES = {
  dark: { bg: "#17181b", ink: "rgba(121,200,238,0.55)", text: "#e9eaec", pill: "#111213", residue: "150,176,194", specks: ["#79c8ee", "#8b8e94", "#55585e"] },
  light: { bg: "#dfe0e3", ink: "rgba(17,18,19,0.35)", text: "#111213", pill: "#e9eaec", residue: "60,62,68", specks: ["#55585e", "#8b8e94"] },
};

export function ScratchCover({
  children,
  tone = "dark",
  label,
  className = "",
}: {
  children: ReactNode;
  tone?: "dark" | "light";
  label?: string;
  className?: string;
}) {
  const rootRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const marksRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const root = rootRef.current!;
    const canvas = canvasRef.current!;
    const marks = marksRef.current!;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) {
      root.dataset.clear = "true";
      return;
    }
    const t = TONES[tone];
    const surface = new RubSurface({ canvas, marks, residue: t.residue, specks: t.specks, cols: 16, rows: 10, strength: 0.21 });
    const mctx = marks.getContext("2d")!;
    const html = document.documentElement;
    const hand = new RubHand();
    let w = 0;
    let h = 0;
    let dpr = 1;
    let done = false;
    let touched = false;
    let auto = false;
    let inside = false;
    let lastRub = 0;
    let crumbDebt = 0;
    let raf = 0;
    let lastT = 0;
    const pointer = { x: 0, y: 0 };
    let timer = 0;

    const radius = () => Math.max(26, Math.min(60, w * 0.11));

    const paint = () => {
      const r = root.getBoundingClientRect();
      w = r.width;
      h = r.height;
      dpr = Math.min(window.devicePixelRatio, 1.5);
      // Keep the smudges through a resize.
      const old = marks.width > 1 ? marks.getContext("2d")!.getImageData(0, 0, marks.width, marks.height) : null;
      const oldW = marks.width;
      const oldH = marks.height;
      marks.width = Math.max(1, Math.round(w * dpr));
      marks.height = Math.max(1, Math.round(h * dpr));
      if (old && oldW && oldH) {
        const tmp = document.createElement("canvas");
        tmp.width = oldW;
        tmp.height = oldH;
        tmp.getContext("2d")!.putImageData(old, 0, 0);
        mctx.drawImage(tmp, 0, 0, marks.width, marks.height);
      }
      mctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      surface.setSize(w, h, dpr);
      const ctx = surface.context;
      ctx.fillStyle = t.bg;
      ctx.fillRect(0, 0, w, h);
      // Hand-ish hatching: slightly irregular diagonal pencil strokes.
      ctx.strokeStyle = t.ink;
      ctx.lineWidth = 1.2;
      let seed = 7;
      const rnd = () => (seed = (seed * 9301 + 49297) % 233280) / 233280;
      for (let x = -h; x < w + h; x += 9) {
        ctx.beginPath();
        ctx.moveTo(x + rnd() * 3, h + 2);
        ctx.lineTo(x + h * 0.9 + rnd() * 6, -2);
        ctx.stroke();
      }
      if (label) {
        ctx.font = `600 ${Math.max(12, Math.min(15, w * 0.035))}px ${getComputedStyle(document.body).fontFamily}`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        const tw = ctx.measureText(label).width + 28;
        ctx.fillStyle = t.pill;
        ctx.beginPath();
        ctx.roundRect(w / 2 - tw / 2, h / 2 - 17, tw, 34, 17);
        ctx.fill();
        ctx.fillStyle = t.text;
        ctx.fillText(label, w / 2, h / 2 + 1);
      }
      surface.replay();
    };

    const shed = (x: number, y: number, dx: number, dy: number, removed: number) => {
      crumbDebt += removed * 1.6;
      if (crumbDebt < 1) return;
      const n = Math.min(6, Math.floor(crumbDebt));
      crumbDebt -= n;
      if (eraserBus.ready()) eraserBus.crumbs(x, y, n, dx, dy);
    };

    const finish = () => {
      if (done) return;
      done = true;
      surface.dissolve(560, () => (root.dataset.clear = "true"));
    };

    const tick = (now: number) => {
      raf = 0;
      const dt = Math.min(0.05, lastT ? (now - lastT) / 1000 : 1 / 60);
      lastT = now;
      if (done || !inside || auto) return;
      raf = requestAnimationFrame(tick);
      const br = root.getBoundingClientRect();
      hand.aim(pointer.x, pointer.y);
      const moved = hand.step(dt);
      if (moved > 0.2) {
        const r = radius();
        const ox = hand.x;
        const oy = hand.y;
        const res = surface.rubTo(hand.x, hand.y, hand.pressure, hand.angle, r);
        if (res.removed > 0.003) {
          touched = true;
          lastRub = now;
        }
        if (hand.reversed) surface.turn(ox, oy, r);
        shed(br.left + hand.x, br.top + hand.y, hand.vx, hand.vy, res.removed);
      }
      eraserBus.point(br.left + hand.x, br.top + hand.y, Math.max(0.4, hand.pressure * 0.9), 0.75);
      // Enough is gone and the hand has paused: the last flecks lift by themselves.
      if (surface.progress() > 0.58 && now - lastRub > 300) finish();
    };

    const local = (e: PointerEvent) => {
      const br = root.getBoundingClientRect();
      return { x: e.clientX - br.left, y: e.clientY - br.top };
    };
    const move = (e: PointerEvent) => {
      const p = local(e);
      pointer.x = p.x;
      pointer.y = p.y;
      if (!inside) enter(e);
    };
    const enter = (e: PointerEvent) => {
      if (done || e.pointerType !== "mouse") return;
      // The hand takes over from an automatic sweep.
      auto = false;
      inside = true;
      const p = local(e);
      pointer.x = p.x;
      pointer.y = p.y;
      hand.reset(p.x, p.y);
      surface.lift();
      html.dataset.eraser = "on";
      lastT = 0;
      if (!raf) raf = requestAnimationFrame(tick);
    };
    const leave = () => {
      if (!inside) return;
      inside = false;
      surface.lift();
      html.dataset.eraser = "";
      if (surface.progress() > 0.4) finish();
      // Only hovered, never rubbed: it can still be erased for them later.
      else if (!touched) {
        window.clearTimeout(timer);
        timer = window.setTimeout(sweep, 2400);
      }
    };
    const down = () => (hand.push = 1);
    const up = () => (hand.push = 0);

    const fine = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
    paint();
    root.dataset.painted = "true";

    if (fine) {
      root.addEventListener("pointermove", move);
      root.addEventListener("pointerenter", enter);
      root.addEventListener("pointerleave", leave);
      root.addEventListener("pointerdown", down);
      window.addEventListener("pointerup", up);
    }

    // Untouched cards don't stay hidden: after a moment in view they're erased by hand.
    const sweep = () => {
      if (done || touched || inside) return;
      auto = true;
      withEraser(
        (drive) => {
          if (done || touched || inside || !auto) return Promise.resolve();
          // No free eraser (a crowd is queued, or it's busy): no invisible hand, it just fades.
          if (!drive) {
            finish();
            return Promise.resolve();
          }
          const r = radius() * 1.15;
          const path = humanPath(w, h, r, Math.min(1500, Math.max(900, (w + h) * 1.4)));
          return runPath({
            surface,
            path,
            radius: r,
            origin: () => {
              const br = root.getBoundingClientRect();
              return { x: br.left, y: br.top };
            },
            cancelled: () => !auto || done,
            onStep: (x, y, p, dx, dy, removed) => {
              eraserBus.point(x, y, p, 0.8);
              shed(x, y, dx, dy, removed);
            },
          }).then(() => {
            if (auto) finish();
          });
        },
        () => eraserBus.ready() && !eraserBus.active(),
      );
    };
    const io = new IntersectionObserver(
      ([entry]) => {
        window.clearTimeout(timer);
        if (entry.isIntersecting) timer = window.setTimeout(sweep, fine ? 3200 : 250);
      },
      { threshold: 0.6 },
    );
    io.observe(root);
    const ro = new ResizeObserver(() => {
      if (!root.dataset.clear) paint();
    });
    ro.observe(root);

    return () => {
      done = true;
      auto = false;
      cancelAnimationFrame(raf);
      root.removeEventListener("pointermove", move);
      root.removeEventListener("pointerenter", enter);
      root.removeEventListener("pointerleave", leave);
      root.removeEventListener("pointerdown", down);
      window.removeEventListener("pointerup", up);
      window.clearTimeout(timer);
      io.disconnect();
      ro.disconnect();
      html.dataset.eraser = "";
    };
  }, [tone, label]);

  return (
    <div ref={rootRef} className={`scratch ${className}`} data-cursor="hide">
      {children}
      <canvas ref={marksRef} className="scratch__marks" aria-hidden="true" />
      <canvas ref={canvasRef} className="scratch__canvas" aria-hidden="true" />
    </div>
  );
}
