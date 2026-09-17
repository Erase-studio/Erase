"use client";

import { useEffect, useRef } from "react";
import { drawTemplate } from "./drawTemplate";
import { eraserBus } from "@/lib/eraserBus";
import { humanPath, RubHand, RubSurface, runPath } from "@/lib/rub";

type Props = {
  /** Fires once the template is fully gone. */
  onDone: () => void;
  /** Fires on the first stroke that actually removes something. */
  onStart?: () => void;
  /** 0 → 1, how much of the template has been rubbed away. */
  onProgress?: (p: number) => void;
  /** Selector for a canvas under the template that keeps the smudges once it's gone. */
  marks?: string;
};

type Crumb = { x: number; y: number; vx: number; vy: number; life: number; size: number; rot: number; vr: number; shade: string; pts: number[] };

/** Most of it gone and the hand has paused: the rest lifts by itself. */
const DONE_AT = 0.42;
const PAUSE_MS = 450;
const SHADES = ["#6B6E75", "#8B8E94", "#A5A8AE", "#C4C6CB", "#9D8FD9"];

export function EraseLayer({ onDone, onStart, onProgress, marks: marksSelector }: Props) {
  const rootRef = useRef<HTMLDivElement>(null);
  const paperRef = useRef<HTMLCanvasElement>(null);
  const crumbRef = useRef<HTMLCanvasElement>(null);
  const tipRef = useRef<HTMLDivElement>(null);
  const cbs = useRef({ onDone, onStart, onProgress });

  useEffect(() => {
    cbs.current = { onDone, onStart, onProgress };
  });

  useEffect(() => {
    const root = rootRef.current!;
    const paper = paperRef.current!;
    const crumbCanvas = crumbRef.current!;
    const tip = tipRef.current!;
    const marks = marksSelector ? document.querySelector<HTMLCanvasElement>(marksSelector) : null;
    const cctx = crumbCanvas.getContext("2d")!;
    const html = document.documentElement;

    const origin = { x: 0, y: 0 };
    const surface = new RubSurface({
      canvas: paper,
      marks,
      marksOrigin: () => origin,
      residue: "214,215,224",
      specks: ["#c9cbd3", "#9d8fd9", "#79c8ee", "#8b8e94"],
      cols: 28,
      rows: 16,
      strength: 0.21,
    });
    const hand = new RubHand();

    let w = 0;
    let h = 0;
    let dpr = 1;
    let crumbs: Crumb[] = [];
    let raf = 0;
    let lastT = 0;
    let load = 0;
    let loadStart = 0;
    let started = false;
    let finishing = false;
    let finished = false;
    let inside = false;
    let lastRub = 0;
    let crumbDebt = 0;
    let shownProgress = -1;
    let stopDissolve = () => {};
    const pointer = { x: 0, y: 0 };

    const baseRadius = () => Math.max(38, Math.min(88, w * 0.045));

    const measureOrigin = () => {
      if (!marks) return;
      const a = root.getBoundingClientRect();
      const b = marks.getBoundingClientRect();
      origin.x = a.left - b.left;
      origin.y = a.top - b.top;
    };

    function size() {
      const rect = root.getBoundingClientRect();
      w = rect.width;
      h = rect.height;
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      surface.setSize(w, h, dpr);
      crumbCanvas.width = Math.round(w * dpr);
      crumbCanvas.height = Math.round(h * dpr);
      cctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      drawTemplate(surface.context, w, h, load);
      surface.replay();
      if (marks) {
        const mr = marks.getBoundingClientRect();
        const mw = Math.max(1, Math.round(mr.width * dpr));
        const mh = Math.max(1, Math.round(mr.height * dpr));
        if (marks.width !== mw || marks.height !== mh) {
          marks.width = mw;
          marks.height = mh;
        }
        marks.getContext("2d")!.setTransform(dpr, 0, 0, dpr, 0, 0);
        measureOrigin();
      }
    }

    function begin() {
      if (started) return;
      started = true;
      root.dataset.started = "true";
      cbs.current.onStart?.();
    }

    function report() {
      const p = Math.round(Math.min(1, surface.progress() / DONE_AT) * 100);
      if (p === shownProgress) return;
      shownProgress = p;
      root.style.setProperty("--erased", String(p / 100));
      cbs.current.onProgress?.(p / 100);
    }

    /** Crumbs, sized by how much was actually lifted. Rubbing a clean patch sheds nothing. */
    function shed(x: number, y: number, dx: number, dy: number, removed: number) {
      crumbDebt += removed * 0.9;
      if (crumbDebt < 1) return;
      const n = Math.min(6, Math.floor(crumbDebt));
      crumbDebt -= n;
      if (eraserBus.ready()) {
        const rect = root.getBoundingClientRect();
        eraserBus.crumbs(rect.left + x, rect.top + y, n, dx, dy);
        return;
      }
      // No WebGL: flat crumbs on a canvas instead.
      if (crumbs.length > 140) return;
      const d = Math.hypot(dx, dy) || 1;
      for (let i = 0; i < n; i++) {
        const pts: number[] = [];
        const k = 4 + ((Math.random() * 3) | 0);
        for (let j = 0; j < k; j++) {
          const a = (j / k) * Math.PI * 2 + Math.random() * 0.6;
          const r = 0.5 + Math.random() * 0.6;
          pts.push(Math.cos(a) * r * (1.2 + Math.random() * 0.6), Math.sin(a) * r * 0.7);
        }
        crumbs.push({
          x: x + (Math.random() - 0.5) * 30,
          y: y + (Math.random() - 0.5) * 30,
          vx: (dx / d) * (0.6 + Math.random() * 2.2) + (Math.random() - 0.5) * 1.4,
          vy: -Math.random() * 2,
          life: 1,
          size: 1.2 + Math.pow(Math.random(), 2) * 4,
          rot: Math.random() * Math.PI,
          vr: (Math.random() - 0.5) * 0.35,
          shade: SHADES[(Math.random() * SHADES.length) | 0],
          pts,
        });
      }
    }

    function drawCrumbs(dt: number) {
      if (!crumbs.length) return;
      cctx.clearRect(0, 0, w, h);
      const f = dt * 60;
      crumbs = crumbs.filter((c) => c.life > 0 && c.y < h + 20);
      for (const c of crumbs) {
        c.vy += 0.24 * f;
        c.vx *= Math.pow(0.97, f);
        c.x += c.vx * f;
        c.y += c.vy * f;
        c.rot += c.vr * f;
        c.life -= 0.01 * f;
        cctx.save();
        cctx.globalAlpha = Math.max(0, Math.min(1, c.life * 1.4));
        cctx.translate(c.x, c.y);
        cctx.rotate(c.rot);
        cctx.scale(c.size, c.size);
        cctx.fillStyle = c.shade;
        cctx.beginPath();
        for (let i = 0; i < c.pts.length; i += 2) cctx.lineTo(c.pts[i], c.pts[i + 1]);
        cctx.fill();
        cctx.restore();
      }
      if (!crumbs.length) cctx.clearRect(0, 0, w, h);
    }

    function tick(now: number) {
      raf = requestAnimationFrame(tick);
      const dt = Math.min(0.05, lastT ? (now - lastT) / 1000 : 1 / 60);
      lastT = now;

      if (loadStart && load < 1) {
        load = Math.min(1, (now - loadStart) / 1300);
        if (!finishing) {
          const ctx = surface.context;
          ctx.clearRect(0, 0, w, h);
          drawTemplate(ctx, w, h, load);
          surface.replay();
        }
        if (load >= 1) root.dataset.drawn = "true";
      }
      drawCrumbs(dt);
      if (finishing || load < 1) return;

      if (inside) {
        const rect = root.getBoundingClientRect();
        measureOrigin();
        hand.aim(pointer.x - rect.left, pointer.y - rect.top);
        const moved = hand.step(dt);
        if (moved > 0.2) {
          const r = baseRadius() * (0.9 + Math.min(hand.speed / 2600, 0.35));
          const res = surface.rubTo(hand.x, hand.y, hand.pressure, hand.angle, r);
          if (res.removed > 0.004) {
            begin();
            lastRub = now;
          }
          if (hand.reversed) surface.turn(hand.x, hand.y, r);
          shed(hand.x, hand.y, hand.vx, hand.vy, res.removed);
          report();
        }
        eraserBus.point(rect.left + hand.x, rect.top + hand.y, Math.max(0.35, hand.pressure));
        tip.style.opacity = "1";
        tip.style.transform = `translate3d(${hand.x}px, ${hand.y}px, 0) translate(-50%, -50%) scale(${baseRadius() / 50})`;
      }

      const p = surface.progress();
      if (started && ((p >= DONE_AT && now - lastRub > PAUSE_MS) || p >= DONE_AT * 1.7)) lift();
    }

    /** Leftovers dissolve in place. Nothing moves the eraser for you. */
    function lift() {
      if (finishing) return;
      finishing = true;
      begin();
      root.dataset.finishing = "true";
      tip.style.opacity = "0";
      cbs.current.onProgress?.(1);
      stopDissolve = surface.dissolve(900, complete, (t) => {
        paper.style.opacity = String(t < 0.7 ? 1 : 1 - (t - 0.7) / 0.3);
      });
    }

    /** "Skip", touch and keyboard: erased by hand, quickly, then the leftovers lift. */
    function sweep() {
      if (finishing) return;
      finishing = true;
      begin();
      root.dataset.finishing = "true";
      tip.style.opacity = "0";
      const r = Math.max(w, h) * 0.1;
      measureOrigin();
      runPath({
        surface,
        path: humanPath(w, h, r, 1500),
        radius: r,
        origin: () => {
          const rect = root.getBoundingClientRect();
          return { x: rect.left, y: rect.top };
        },
        cancelled: () => finished,
        onStep: (x, y, p, dx, dy, removed) => {
          const rect = root.getBoundingClientRect();
          eraserBus.point(x, y, p, 1.7);
          shed(x - rect.left, y - rect.top, dx, dy, removed * 0.35);
        },
      }).then(() => {
        stopDissolve = surface.dissolve(380, complete);
      });
    }

    function complete() {
      if (finished) return;
      finished = true;
      surface.context.clearRect(0, 0, w, h);
      root.dataset.done = "true";
      html.dataset.eraser = "";
      window.setTimeout(() => cbs.current.onDone(), 60);
    }

    function onMove(e: PointerEvent) {
      if (e.pointerType === "touch") return;
      const rect = root.getBoundingClientRect();
      pointer.x = e.clientX;
      pointer.y = e.clientY;
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      const now = x >= 0 && y >= 0 && x <= rect.width && y <= rect.height;
      if (finishing || load < 1) return;
      if (now && !inside) {
        // Picks the rubber up where the pointer is; no stroke from the last exit point.
        hand.reset(x, y);
        surface.lift();
      }
      if (!now && inside) {
        surface.lift();
        tip.style.opacity = "0";
      }
      inside = now;
      html.dataset.eraser = now ? "on" : "";
    }
    const onDown = () => (hand.push = 1);
    const onUp = () => (hand.push = 0);

    function onScroll() {
      if (loadStart && window.scrollY > 24) lift();
    }

    if (marks) {
      const m = marks.getContext("2d")!;
      m.setTransform(1, 0, 0, 1, 0, 0);
      m.clearRect(0, 0, marks.width, marks.height);
    }
    size();
    root.dataset.ready = "true";
    raf = requestAnimationFrame(tick);

    const ro = new ResizeObserver(() => {
      if (!finished) size();
    });
    ro.observe(root);
    window.addEventListener("pointermove", onMove, { passive: true });
    window.addEventListener("pointerdown", onDown);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("scroll", onScroll, { passive: true });
    root.addEventListener("erase:finish", sweep);

    // Touch devices get the sweep as an intro; dragging would fight the scroll.
    const coarse = window.matchMedia("(hover: none), (pointer: coarse)").matches;
    let auto = 0;
    const onLoaded = () => {
      if (loadStart) return;
      loadStart = performance.now();
      if (coarse) auto = window.setTimeout(sweep, 2600);
    };
    if (window.__eraseLoaded) onLoaded();
    else window.addEventListener("erase:loaded", onLoaded, { once: true });

    return () => {
      finished = true;
      ro.disconnect();
      stopDissolve();
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerdown", onDown);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("erase:loaded", onLoaded);
      root.removeEventListener("erase:finish", sweep);
      html.dataset.eraser = "";
      window.clearTimeout(auto);
      cancelAnimationFrame(raf);
    };
  }, [marksSelector]);

  return (
    <div ref={rootRef} className="erase-layer" data-cursor="hide" aria-hidden="true">
      <canvas ref={paperRef} className="erase-layer__paper" />
      <canvas ref={crumbRef} className="erase-layer__crumbs" />
      <div ref={tipRef} className="erase-layer__tip" />
    </div>
  );
}
