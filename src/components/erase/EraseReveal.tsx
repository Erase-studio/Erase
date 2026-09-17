"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { eraserBus } from "@/lib/eraserBus";
import { onReveal } from "@/lib/gsap";

/**
 * Covers its content with a flat sheet the colour of the page, then rubs it off
 * in zigzag strokes when it scrolls into view. Reveals take turns, so the one 3D
 * eraser can visibly do each of them.
 */

let queue: Promise<void> = Promise.resolve();
let waiting = 0;

type Props = {
  children: ReactNode;
  /** Cover colour: "sheet" on light chapters, "graphite" on dark ones, or any CSS colour. */
  cover?: "sheet" | "graphite" | string;
  className?: string;
  as?: "div" | "span";
};

const COLORS: Record<string, string> = { sheet: "#e9eaec", graphite: "#111213" };

export function EraseReveal({ children, cover = "graphite", className = "", as = "div" }: Props) {
  // Always a div (headings go inside); "span" just means shrink-wrap the content.
  const Tag = "div";
  const rootRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const root = rootRef.current!;
    const canvas = canvasRef.current!;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) {
      root.dataset.revealed = "true";
      return;
    }
    const ctx = canvas.getContext("2d")!;
    const color = COLORS[cover] ?? cover;
    let w = 0;
    let h = 0;
    let done = false;
    let cancelled = false;

    const paint = () => {
      const r = root.getBoundingClientRect();
      w = r.width;
      h = r.height;
      const dpr = Math.min(window.devicePixelRatio, 1.5);
      canvas.width = Math.max(1, Math.round(w * dpr));
      canvas.height = Math.max(1, Math.round(h * dpr));
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.fillStyle = color;
      ctx.fillRect(0, 0, w, h);
    };
    paint();
    root.dataset.painted = "true";

    const sweep = (drive: boolean) =>
      new Promise<void>((resolve) => {
        if (cancelled) return resolve();
        paint();
        const r = Math.max(26, Math.min(90, h / 3.2, w / 6));
        const rows = Math.max(2, Math.ceil(h / (r * 1.35)));
        const pts: { x: number; y: number }[] = [];
        for (let i = 0; i <= rows; i++) {
          const y = (i / rows) * h;
          pts.push(i % 2 ? { x: w + r, y } : { x: -r, y });
          pts.push(i % 2 ? { x: -r, y: y + r * 0.5 } : { x: w + r, y: y + r * 0.5 });
        }
        const lens = [0];
        for (let i = 1; i < pts.length; i++) lens.push(lens[i - 1] + Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y));
        const total = lens[lens.length - 1];
        const dur = Math.min(1500, 520 + total * 0.12);
        const t0 = performance.now();
        let prev = pts[0];
        let seg = 1;
        ctx.globalCompositeOperation = "destination-out";
        ctx.lineCap = "round";
        ctx.lineJoin = "round";
        ctx.lineWidth = r * 2;

        const step = (now: number) => {
          if (cancelled) return resolve();
          const raw = Math.min(1, (now - t0) / dur);
          const e = raw < 0.5 ? 2 * raw * raw : 1 - Math.pow(-2 * raw + 2, 2) / 2;
          const dist = e * total;
          let i = seg;
          while (i < lens.length - 1 && lens[i] < dist) i++;
          const k = (dist - lens[i - 1]) / (lens[i] - lens[i - 1] || 1);
          const cur = { x: pts[i - 1].x + (pts[i].x - pts[i - 1].x) * k, y: pts[i - 1].y + (pts[i].y - pts[i - 1].y) * k };
          ctx.beginPath();
          ctx.moveTo(prev.x, prev.y);
          for (let j = seg; j < i; j++) ctx.lineTo(pts[j].x, pts[j].y);
          ctx.lineTo(cur.x, cur.y);
          ctx.stroke();
          seg = i;
          if (drive) {
            const br = root.getBoundingClientRect();
            const cx = br.left + Math.max(0, Math.min(w, cur.x));
            const cy = br.top + cur.y;
            eraserBus.point(cx, cy, 1, Math.max(0.7, Math.min(1.3, h / 260)));
            if (Math.hypot(cur.x - prev.x, cur.y - prev.y) > 4) eraserBus.crumbs(cx, cy, 2, Math.sign(cur.x - prev.x));
          }
          prev = cur;
          if (raw < 1) requestAnimationFrame(step);
          else {
            ctx.clearRect(0, 0, w, h);
            root.dataset.revealed = "true";
            resolve();
          }
        };
        requestAnimationFrame(step);
      });

    const run = () => {
      if (done) return;
      done = true;
      // Take a turn with the eraser; if a crowd is waiting, don't make it wait.
      if (waiting > 2) {
        sweep(false);
        return;
      }
      waiting++;
      queue = queue.then(() => sweep(eraserBus.ready()).then(() => new Promise<void>((r) => setTimeout(r, 60)))).finally(() => {
        waiting--;
      });
    };

    let io: IntersectionObserver | undefined;
    const cancelReveal = onReveal(() => {
      io = new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting) {
            io?.disconnect();
            run();
          }
        },
        { threshold: 0.45, rootMargin: "0px 0px -8% 0px" },
      );
      io.observe(root);
    });
    const ro = new ResizeObserver(() => {
      if (!done) paint();
    });
    ro.observe(root);

    return () => {
      cancelled = true;
      cancelReveal();
      io?.disconnect();
      ro.disconnect();
    };
  }, [cover]);

  return (
    <Tag ref={rootRef} className={`er ${as === "span" ? "er--inline" : ""} ${className}`} data-cover={cover}>
      {children}
      <canvas ref={canvasRef} className="er__canvas" aria-hidden="true" />
    </Tag>
  );
}
