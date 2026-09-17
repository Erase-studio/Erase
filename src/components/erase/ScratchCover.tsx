"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { eraserBus } from "@/lib/eraserBus";

/**
 * A pencil-hatched sheet over the content. Rub it with the cursor to reveal what's
 * underneath; past a threshold it clears itself. Touch devices get it cleared
 * automatically when the card scrolls into view.
 */
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

  useEffect(() => {
    const root = rootRef.current!;
    const canvas = canvasRef.current!;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) {
      root.dataset.clear = "true";
      return;
    }
    const ctx = canvas.getContext("2d")!;
    const bg = tone === "dark" ? "#17181b" : "#dfe0e3";
    const ink = tone === "dark" ? "rgba(121,200,238,0.55)" : "rgba(17,18,19,0.35)";
    const COLS = 16;
    const ROWS = 10;
    const grid = new Uint8Array(COLS * ROWS);
    let covered = 0;
    let w = 0;
    let h = 0;
    let clearing = false;
    let last: { x: number; y: number } | null = null;
    const strokes: { a: { x: number; y: number }; b: { x: number; y: number }; r: number }[] = [];

    const paint = () => {
      const r = root.getBoundingClientRect();
      w = r.width;
      h = r.height;
      const dpr = Math.min(window.devicePixelRatio, 1.5);
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.globalCompositeOperation = "source-over";
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, w, h);
      // Hand-ish hatching: slightly irregular diagonal pencil strokes.
      ctx.strokeStyle = ink;
      ctx.lineWidth = 1.2;
      let seed = 7;
      const rnd = () => ((seed = (seed * 9301 + 49297) % 233280) / 233280);
      for (let x = -h; x < w + h; x += 9) {
        ctx.beginPath();
        ctx.moveTo(x + rnd() * 3, h + 2);
        ctx.lineTo(x + h * 0.9 + rnd() * 6, -2);
        ctx.stroke();
      }
      if (label) {
        ctx.fillStyle = tone === "dark" ? "#e9eaec" : "#111213";
        ctx.font = `600 ${Math.max(12, Math.min(15, w * 0.035))}px ${getComputedStyle(document.body).fontFamily}`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        const tw = ctx.measureText(label).width + 28;
        ctx.fillStyle = tone === "dark" ? "#111213" : "#e9eaec";
        ctx.beginPath();
        ctx.roundRect(w / 2 - tw / 2, h / 2 - 17, tw, 34, 17);
        ctx.fill();
        ctx.fillStyle = tone === "dark" ? "#e9eaec" : "#111213";
        ctx.fillText(label, w / 2, h / 2 + 1);
      }
      ctx.globalCompositeOperation = "destination-out";
      ctx.lineCap = "round";
      for (const s of strokes) {
        ctx.lineWidth = s.r * w * 2;
        ctx.beginPath();
        ctx.moveTo(s.a.x * w, s.a.y * h);
        ctx.lineTo(s.b.x * w, s.b.y * h);
        ctx.stroke();
      }
    };

    const rub = (a: { x: number; y: number }, b: { x: number; y: number }, r: number) => {
      ctx.globalCompositeOperation = "destination-out";
      ctx.lineCap = "round";
      ctx.lineWidth = r * 2;
      ctx.beginPath();
      ctx.moveTo(a.x, a.y);
      ctx.lineTo(b.x, b.y);
      ctx.stroke();
      strokes.push({ a: { x: a.x / w, y: a.y / h }, b: { x: b.x / w, y: b.y / h }, r: r / w });
      const steps = Math.max(1, Math.ceil(Math.hypot(b.x - a.x, b.y - a.y) / (r * 0.5)));
      for (let i = 0; i <= steps; i++) {
        const px = a.x + ((b.x - a.x) * i) / steps;
        const py = a.y + ((b.y - a.y) * i) / steps;
        for (let row = 0; row < ROWS; row++)
          for (let col = 0; col < COLS; col++) {
            const idx = row * COLS + col;
            if (grid[idx]) continue;
            const dx = ((col + 0.5) * w) / COLS - px;
            const dy = ((row + 0.5) * h) / ROWS - py;
            if (dx * dx + dy * dy < r * r) {
              grid[idx] = 1;
              covered++;
            }
          }
      }
    };

    const clearAll = (drive: boolean) => {
      if (clearing) return;
      clearing = true;
      const r = Math.max(30, Math.min(w, h) * 0.22);
      const rows = Math.ceil(h / (r * 1.4)) + 1;
      const t0 = performance.now();
      const dur = 650 + rows * 90;
      let prev = { x: -r, y: 0 };
      const at = (t: number) => {
        const row = Math.min(rows - 1, Math.floor(t * rows));
        const f = t * rows - row;
        const y = (row / (rows - 1 || 1)) * h;
        const x = row % 2 ? w + r - f * (w + 2 * r) : -r + f * (w + 2 * r);
        return { x, y };
      };
      const step = (now: number) => {
        const t = Math.min(1, (now - t0) / dur);
        const cur = at(t);
        rub(prev, cur, r);
        if (drive) {
          const br = root.getBoundingClientRect();
          eraserBus.point(br.left + Math.max(0, Math.min(w, cur.x)), br.top + cur.y, 1, 0.9);
          eraserBus.crumbs(br.left + Math.max(0, Math.min(w, cur.x)), br.top + cur.y, 1, Math.sign(cur.x - prev.x));
        }
        prev = cur;
        if (t < 1) requestAnimationFrame(step);
        else root.dataset.clear = "true";
      };
      requestAnimationFrame(step);
    };

    paint();
    root.dataset.painted = "true";

    const fine = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
    let raf = 0;
    let inside = false;
    const pointer = { x: 0, y: 0 };
    const hold = () => {
      raf = requestAnimationFrame(hold);
      if (inside && !clearing) eraserBus.point(pointer.x, pointer.y, 0.5, 0.75);
    };
    const move = (e: PointerEvent) => {
      if (clearing) return;
      const br = root.getBoundingClientRect();
      const p = { x: e.clientX - br.left, y: e.clientY - br.top };
      pointer.x = e.clientX;
      pointer.y = e.clientY;
      document.documentElement.dataset.eraser = "on";
      const r = Math.max(22, w * 0.09);
      if (last) {
        rub(last, p, r);
        const d = Math.hypot(p.x - last.x, p.y - last.y);
        if (d > 8 && eraserBus.ready()) eraserBus.crumbs(e.clientX, e.clientY, 1, Math.sign(p.x - last.x));
      }
      last = p;
      if (covered / grid.length > 0.4) clearAll(eraserBus.ready());
    };
    const enter = () => {
      inside = true;
      if (!raf) raf = requestAnimationFrame(hold);
    };
    const leave = () => {
      inside = false;
      last = null;
      document.documentElement.dataset.eraser = "";
    };

    if (fine) {
      root.addEventListener("pointermove", move);
      root.addEventListener("pointerenter", enter);
      root.addEventListener("pointerleave", leave);
    }
    // Never hide the work for long: if nobody rubs it, it clears itself shortly after
    // coming into view (straight away on touch, after an invitation to play on desktop).
    let timer = 0;
    const io = new IntersectionObserver(
      ([entry]) => {
        window.clearTimeout(timer);
        if (!entry.isIntersecting) return;
        timer = window.setTimeout(
          () => {
            if (!inside && !clearing) clearAll(false);
          },
          fine ? 2600 : 250,
        );
      },
      { threshold: 0.6 },
    );
    io.observe(root);
    const ro = new ResizeObserver(() => {
      if (!root.dataset.clear) paint();
    });
    ro.observe(root);

    return () => {
      cancelAnimationFrame(raf);
      root.removeEventListener("pointermove", move);
      root.removeEventListener("pointerenter", enter);
      root.removeEventListener("pointerleave", leave);
      window.clearTimeout(timer);
      io.disconnect();
      ro.disconnect();
      document.documentElement.dataset.eraser = "";
    };
  }, [tone, label]);

  return (
    <div ref={rootRef} className={`scratch ${className}`} data-cursor="hide">
      {children}
      <canvas ref={canvasRef} className="scratch__canvas" aria-hidden="true" />
    </div>
  );
}
