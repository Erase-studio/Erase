"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { RubHand, RubSurface } from "@/lib/rub";
import { sound } from "@/lib/sound";

/**
 * A sheet you can actually rub out.
 *
 * `paint` draws whatever is on top; drag across it and the real rubber engine
 * takes it off — the footprint tilts with the stroke, grit scores lines along
 * it, graphite piles up where you turn, and dust stays behind. Whatever is
 * underneath was there the whole time.
 *
 * `onClear` fires once, when there's little enough left to call it gone.
 */

export type Painter = (ctx: CanvasRenderingContext2D, w: number, h: number) => void;

export function Rubbable({
  paint,
  onClear,
  children,
  className = "",
  strength = 0.26,
  label = "Rub it out",
  resetKey = 0,
}: {
  paint: Painter;
  onClear?: () => void;
  children?: ReactNode;
  className?: string;
  strength?: number;
  label?: string;
  resetKey?: number;
}) {
  const hostRef = useRef<HTMLDivElement>(null);
  const sheetRef = useRef<HTMLCanvasElement>(null);
  const paintRef = useRef(paint);
  const clearRef = useRef(onClear);
  // Kept current without re-running the engine: the sheet shouldn't be rebuilt
  // just because a parent re-rendered with a new closure.
  useEffect(() => {
    paintRef.current = paint;
    clearRef.current = onClear;
  }, [paint, onClear]);

  useEffect(() => {
    const host = hostRef.current!;
    const sheet = sheetRef.current!;
    const surface = new RubSurface({ canvas: sheet, strength, cols: 30, rows: 18 });
    const hand = new RubHand(86);
    let raf = 0;
    let down = false;
    let last = performance.now();
    let cleared = false;
    let radius = 40;

    const repaint = () => {
      const r = host.getBoundingClientRect();
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      if (r.width < 8 || r.height < 8) return;
      surface.setSize(r.width, r.height, dpr);
      radius = Math.max(20, Math.min(r.width, r.height) * 0.1);
      const ctx = surface.context;
      ctx.clearRect(0, 0, r.width, r.height);
      paintRef.current(ctx, r.width, r.height);
      surface.replay();
    };

    const at = (e: PointerEvent) => {
      const r = host.getBoundingClientRect();
      return { x: e.clientX - r.left, y: e.clientY - r.top };
    };

    const loop = (now: number) => {
      raf = 0;
      const dt = Math.min(1 / 20, (now - last) / 1000);
      last = now;
      hand.step(dt);
      const res = surface.rubTo(hand.x, hand.y, hand.pressure, hand.angle, radius);
      if (hand.reversed) surface.turn(hand.x, hand.y, radius);
      if (res.dist > 0) sound.rub(Math.min(1, hand.speed / 900), hand.pressure);
      if (!cleared && surface.progress() > 0.9) {
        cleared = true;
        clearRef.current?.();
      }
      host.style.setProperty("--gone", surface.progress().toFixed(3));
      if (down) raf = requestAnimationFrame(loop);
    };

    const onDown = (e: PointerEvent) => {
      if (e.button !== 0 && e.pointerType === "mouse") return;
      const p = at(e);
      host.setPointerCapture?.(e.pointerId);
      hand.reset(p.x, p.y);
      surface.lift();
      down = true;
      host.dataset.rubbing = "true";
      last = performance.now();
      if (!raf) raf = requestAnimationFrame(loop);
    };
    const onMove = (e: PointerEvent) => {
      if (!down) return;
      const p = at(e);
      hand.aim(p.x, p.y);
    };
    const onUp = (e: PointerEvent) => {
      down = false;
      host.releasePointerCapture?.(e.pointerId);
      host.dataset.rubbing = "false";
      surface.lift();
    };

    // Keyboard and touch-assist: a single sweep, for anyone who can't drag.
    const sweep = () => {
      const r = host.getBoundingClientRect();
      let t = 0;
      hand.reset(-radius, r.height * 0.3);
      down = true;
      host.dataset.rubbing = "true";
      const band = window.setInterval(() => {
        t += 0.045;
        hand.aim(r.width * t * 1.15 - radius, r.height * (0.3 + Math.sin(t * 7) * 0.26));
        if (t >= 1) {
          window.clearInterval(band);
          down = false;
          host.dataset.rubbing = "false";
          surface.lift();
        }
      }, 24);
      last = performance.now();
      if (!raf) raf = requestAnimationFrame(loop);
    };
    host.addEventListener("rub:sweep", sweep);

    repaint();
    const ro = new ResizeObserver(repaint);
    ro.observe(host);
    host.addEventListener("pointerdown", onDown);
    host.addEventListener("pointermove", onMove, { passive: true });
    host.addEventListener("pointerup", onUp);
    host.addEventListener("pointercancel", onUp);
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      host.removeEventListener("rub:sweep", sweep);
      host.removeEventListener("pointerdown", onDown);
      host.removeEventListener("pointermove", onMove);
      host.removeEventListener("pointerup", onUp);
      host.removeEventListener("pointercancel", onUp);
    };
  }, [strength, resetKey]);

  return (
    <div ref={hostRef} className={`rb ${className}`} data-surface="light" data-rubbing="false" data-cursor-label={label}>
      <div className="rb__under">{children}</div>
      <canvas ref={sheetRef} className="rb__sheet" aria-hidden="true" />
    </div>
  );
}
