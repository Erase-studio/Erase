"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { eraserBus } from "@/lib/eraserBus";
import { onReveal } from "@/lib/gsap";
import { humanPath, RubSurface, runPath, withEraser } from "@/lib/rub";

/**
 * Covers its content with a flat sheet the colour of the page, then rubs it off
 * by hand (uneven back-and-forth strokes) when it scrolls into view. Reveals take
 * turns, so the one 3D eraser can visibly do each of them.
 */

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
    const color = COLORS[cover] ?? cover;
    const surface = new RubSurface({ canvas, cols: 8, rows: 4, strength: 0.34 });
    let done = false;
    let cancelled = false;

    const paint = () => {
      const r = root.getBoundingClientRect();
      surface.setSize(r.width, r.height, Math.min(window.devicePixelRatio, 1.5));
      const ctx = surface.context;
      ctx.fillStyle = color;
      ctx.fillRect(0, 0, r.width, r.height);
    };
    paint();
    root.dataset.painted = "true";

    const sweep = (drive: boolean) => {
      if (cancelled) return Promise.resolve();
      paint();
      if (!drive)
        return new Promise<void>((resolve) =>
          surface.dissolve(520, () => {
            root.dataset.revealed = "true";
            resolve();
          }),
        );
      const { w, h } = surface;
      const r = Math.max(30, Math.min(100, h / 2.6, w / 5));
      const path = humanPath(w, h, r, Math.min(1500, 560 + (w + h) * 0.45));
      let debt = 0;
      return runPath({
        surface,
        path,
        radius: r,
        origin: () => {
          const br = root.getBoundingClientRect();
          return { x: br.left, y: br.top };
        },
        cancelled: () => cancelled,
        onStep: (x, y, p, dx, dy, removed) => {
          eraserBus.point(x, y, p, Math.max(0.7, Math.min(1.3, h / 260)));
          debt += removed * 1.2;
          if (debt >= 1) {
            const n = Math.min(4, Math.floor(debt));
            debt -= n;
            eraserBus.crumbs(x, y, n, dx, dy);
          }
        },
      }).then(
        () =>
          new Promise<void>((resolve) => {
            if (cancelled) return resolve();
            // The last grey streaks lift off.
            surface.dissolve(260, () => {
              root.dataset.revealed = "true";
              resolve();
            });
          }),
      );
    };

    const run = () => {
      if (done) return;
      done = true;
      withEraser(sweep, () => eraserBus.ready());
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
