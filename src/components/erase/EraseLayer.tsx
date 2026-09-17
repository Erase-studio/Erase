"use client";

import { useEffect, useRef } from "react";
import { drawTemplate } from "./drawTemplate";
import { eraserBus } from "@/lib/eraserBus";

type Props = {
  /** Fires once the template is fully gone. */
  onDone: () => void;
  /** Fires on the first stroke, so the page can drop its hint. */
  onStart?: () => void;
};

type Pt = { x: number; y: number };
type Stroke = { a: Pt; b: Pt; r: number }; // normalised to width
type Crumb = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  size: number;
  rot: number;
  vr: number;
  shade: string;
};

const COLS = 28;
const ROWS = 16;
const FINISH_AT = 0.34;
const SHADES = ["#6B6E75", "#8B8E94", "#A5A8AE", "#C4C6CB", "#9D8FD9"];

export function EraseLayer({ onDone, onStart }: Props) {
  const rootRef = useRef<HTMLDivElement>(null);
  const paperRef = useRef<HTMLCanvasElement>(null);
  const crumbRef = useRef<HTMLCanvasElement>(null);
  const tipRef = useRef<HTMLDivElement>(null);
  const doneRef = useRef(onDone);
  const startRef = useRef(onStart);

  useEffect(() => {
    doneRef.current = onDone;
    startRef.current = onStart;
  });

  useEffect(() => {
    const root = rootRef.current!;
    const paper = paperRef.current!;
    const crumbCanvas = crumbRef.current!;
    const tip = tipRef.current!;
    const pctx = paper.getContext("2d")!;
    const cctx = crumbCanvas.getContext("2d")!;

    let w = 0;
    let h = 0;
    let dpr = 1;
    const strokes: Stroke[] = [];
    const grid = new Uint8Array(COLS * ROWS);
    let covered = 0;
    let crumbs: Crumb[] = [];
    let last: (Pt & { t: number }) | null = null;
    let raf = 0;
    let load = 0; // template load-in progress
    let loadStart = 0;
    let started = false;
    let finishing = false;
    let finished = false;
    let sweep: {
      pts: Pt[];
      lens: number[];
      total: number;
      t0: number;
      r: number;
      prev: Pt;
      seg: number;
    } | null = null;

    const baseRadius = () => Math.max(38, Math.min(88, w * 0.045));

    function size() {
      const rect = root.getBoundingClientRect();
      w = rect.width;
      h = rect.height;
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      for (const c of [paper, crumbCanvas]) {
        c.width = Math.round(w * dpr);
        c.height = Math.round(h * dpr);
      }
      pctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      cctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      drawTemplate(pctx, w, h, load);
      for (const s of strokes) {
        rub({ x: s.a.x * w, y: s.a.y * w }, { x: s.b.x * w, y: s.b.y * w }, s.r * w, false);
      }
    }

    function mark(p: Pt, r: number) {
      const cw = w / COLS;
      const ch = h / ROWS;
      const c0 = Math.max(0, Math.floor((p.x - r) / cw));
      const c1 = Math.min(COLS - 1, Math.floor((p.x + r) / cw));
      const r0 = Math.max(0, Math.floor((p.y - r) / ch));
      const r1 = Math.min(ROWS - 1, Math.floor((p.y + r) / ch));
      for (let row = r0; row <= r1; row++) {
        for (let col = c0; col <= c1; col++) {
          const i = row * COLS + col;
          if (grid[i]) continue;
          const dx = (col + 0.5) * cw - p.x;
          const dy = (row + 0.5) * ch - p.y;
          if (dx * dx + dy * dy <= r * r) {
            grid[i] = 1;
            covered++;
          }
        }
      }
    }

    function rub(a: Pt, b: Pt, r: number, record = true) {
      pctx.save();
      pctx.globalCompositeOperation = "destination-out";
      pctx.lineCap = "round";
      pctx.lineJoin = "round";
      pctx.lineWidth = r * 2;
      pctx.beginPath();
      pctx.moveTo(a.x, a.y);
      pctx.lineTo(b.x, b.y);
      pctx.stroke();
      pctx.restore();
      if (!record) return;
      strokes.push({ a: { x: a.x / w, y: a.y / w }, b: { x: b.x / w, y: b.y / w }, r: r / w });
      const d = Math.hypot(b.x - a.x, b.y - a.y);
      const steps = Math.max(1, Math.ceil(d / (r * 0.5)));
      for (let i = 0; i <= steps; i++) {
        const t = i / steps;
        mark({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t }, r);
      }
      spawnCrumbs(a, b, r, d);
    }

    function spawnCrumbs(a: Pt, b: Pt, r: number, d: number) {
      if (eraserBus.ready()) {
        const rect = root.getBoundingClientRect();
        const n3 = Math.min(5, Math.floor(d / 16));
        if (n3) eraserBus.crumbs(rect.left + b.x, rect.top + b.y, n3, d ? (b.x - a.x) / d : 0);
        return;
      }
      const n = Math.min(6, Math.floor(d / 14));
      if (crumbs.length > 140) return;
      const dirX = d ? (b.x - a.x) / d : 0;
      for (let i = 0; i < n; i++) {
        const t = Math.random();
        const edge = (Math.random() - 0.5) * r * 1.6;
        crumbs.push({
          x: a.x + (b.x - a.x) * t + -dirX * 4 + edge * (dirX ? 0.2 : 1),
          y: a.y + (b.y - a.y) * t + edge,
          vx: -dirX * (0.6 + Math.random() * 1.8) + (Math.random() - 0.5) * 1.2,
          vy: -Math.random() * 1.6,
          life: 1,
          size: 1.4 + Math.random() * 2.8,
          rot: Math.random() * Math.PI,
          vr: (Math.random() - 0.5) * 0.3,
          shade: SHADES[(Math.random() * SHADES.length) | 0],
        });
      }
      loop();
    }

    function frame(now: number) {
      raf = 0;
      if (loadStart && load < 1) {
        load = Math.min(1, (now - loadStart) / 1300);
        if (!finishing) {
          pctx.setTransform(dpr, 0, 0, dpr, 0, 0);
          pctx.clearRect(0, 0, w, h);
          drawTemplate(pctx, w, h, load);
          for (const s of strokes) rub({ x: s.a.x * w, y: s.a.y * w }, { x: s.b.x * w, y: s.b.y * w }, s.r * w, false);
        }
        if (load >= 1) root.dataset.drawn = "true";
      }
      if (sweep) stepSweep(now);

      cctx.clearRect(0, 0, w, h);
      crumbs = crumbs.filter((c) => c.life > 0 && c.y < h + 20);
      for (const c of crumbs) {
        c.vy += 0.22;
        c.vx *= 0.97;
        c.x += c.vx;
        c.y += c.vy;
        c.rot += c.vr;
        c.life -= 0.012;
        cctx.save();
        cctx.globalAlpha = Math.max(0, Math.min(1, c.life * 1.4));
        cctx.translate(c.x, c.y);
        cctx.rotate(c.rot);
        cctx.fillStyle = c.shade;
        cctx.fillRect(-c.size / 2, -c.size * 0.35, c.size, c.size * 0.7);
        cctx.restore();
      }
      if (crumbs.length || sweep || (loadStart && load < 1)) loop();
    }

    function loop() {
      if (!raf) raf = requestAnimationFrame(frame);
    }

    function begin() {
      if (started) return;
      started = true;
      root.dataset.started = "true";
      startRef.current?.();
    }

    function finish() {
      if (finishing) return;
      finishing = true;
      begin();
      root.dataset.finishing = "true";
      const r = Math.max(w, h) * 0.11;
      const rows = Math.ceil(h / (r * 1.25)) + 1;
      const pts: Pt[] = [];
      for (let i = 0; i < rows; i++) {
        const y = -r * 0.2 + i * r * 1.25 + (i % 2 ? r * 0.3 : 0);
        const left = { x: -r, y };
        const right = { x: w + r, y: y + r * 0.35 };
        if (i % 2) pts.push(right, left);
        else pts.push(left, right);
      }
      const lens = [0];
      for (let i = 1; i < pts.length; i++) {
        lens.push(lens[i - 1] + Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y));
      }
      sweep = { pts, lens, total: lens[lens.length - 1], t0: performance.now(), r, prev: pts[0], seg: 1 };
      tip.style.opacity = "0";
      loop();
    }

    function stepSweep(now: number) {
      if (!sweep) return;
      const dur = Math.min(1500, 700 + sweep.pts.length * 70);
      const raw = Math.min(1, (now - sweep.t0) / dur);
      const e = raw < 0.5 ? 4 * raw * raw * raw : 1 - Math.pow(-2 * raw + 2, 3) / 2;
      const dist = e * sweep.total;
      let i = 1;
      while (i < sweep.lens.length - 1 && sweep.lens[i] < dist) i++;
      const segStart = sweep.lens[i - 1];
      const segLen = sweep.lens[i] - segStart || 1;
      const k = (dist - segStart) / segLen;
      const a = sweep.pts[i - 1];
      const b = sweep.pts[i];
      // Visit every corner passed since last frame so no strip is skipped.
      let prev = sweep.prev;
      for (let j = sweep.seg; j < i; j++) {
        rub(prev, sweep.pts[j], sweep.r);
        prev = sweep.pts[j];
      }
      const cur = { x: a.x + (b.x - a.x) * k, y: a.y + (b.y - a.y) * k };
      const rr = root.getBoundingClientRect();
      eraserBus.point(rr.left + cur.x, rr.top + cur.y, 1, 1.7);
      rub(prev, cur, sweep.r);
      sweep.prev = cur;
      sweep.seg = i;
      if (raw >= 1) {
        sweep = null;
        complete();
      }
    }

    function complete() {
      if (finished) return;
      finished = true;
      pctx.clearRect(0, 0, w, h);
      root.dataset.done = "true";
      document.documentElement.dataset.eraser = "";
      window.setTimeout(() => doneRef.current(), 60);
    }

    function onMove(e: PointerEvent) {
      if (finishing || !loadStart || e.pointerType === "touch") return;
      const rect = root.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      const inside = x >= 0 && y >= 0 && x <= rect.width && y <= rect.height;
      const now = performance.now();
      document.documentElement.dataset.eraser = inside ? "on" : "";
      pointerInside = inside;
      pointerClient = { x: e.clientX, y: e.clientY };
      if (!inside) {
        last = null;
        tip.style.opacity = "0";
        return;
      }
      const v = last ? Math.hypot(x - last.x, y - last.y) / Math.max(1, now - last.t) : 0;
      pointerPressure = Math.min(1, 0.35 + v * 0.5);
      const r = baseRadius() * (0.85 + Math.min(v / 2.2, 0.55));
      tip.style.opacity = "1";
      tip.style.transform = `translate3d(${x}px, ${y}px, 0) translate(-50%, -50%) scale(${r / 50})`;
      if (last) {
        begin();
        rub(last, { x, y }, r);
        if (covered / grid.length >= FINISH_AT) finish();
      }
      last = { x, y, t: now };
    }

    function onScroll() {
      if (loadStart && window.scrollY > 24) finish();
    }

    // Keep the 3D eraser in hand while the pointer rests over the template.
    let pointerInside = false;
    let pointerClient = { x: 0, y: 0 };
    let pointerPressure = 0.35;
    let holdRaf = 0;
    const hold = () => {
      holdRaf = requestAnimationFrame(hold);
      if (pointerInside && loadStart && !finishing) {
        eraserBus.point(pointerClient.x, pointerClient.y, pointerPressure);
        pointerPressure += (0.3 - pointerPressure) * 0.08;
      }
    };
    holdRaf = requestAnimationFrame(hold);

    size();
    root.dataset.ready = "true";

    const ro = new ResizeObserver(() => {
      if (!finished) size();
    });
    ro.observe(root);
    window.addEventListener("pointermove", onMove, { passive: true });
    window.addEventListener("scroll", onScroll, { passive: true });
    const onFinish = () => finish();
    root.addEventListener("erase:finish", onFinish);

    // Touch devices get the sweep as an intro; dragging would fight the scroll.
    const coarse = window.matchMedia("(hover: none), (pointer: coarse)").matches;
    let auto = 0;
    const onLoaded = () => {
      if (loadStart) return;
      loadStart = performance.now();
      loop();
      if (coarse) auto = window.setTimeout(finish, 2600);
    };
    if (window.__eraseLoaded) onLoaded();
    else window.addEventListener("erase:loaded", onLoaded, { once: true });

    return () => {
      ro.disconnect();
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("erase:loaded", onLoaded);
      cancelAnimationFrame(holdRaf);
      document.documentElement.dataset.eraser = "";
      root.removeEventListener("erase:finish", onFinish);
      window.clearTimeout(auto);
      cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <div ref={rootRef} className="erase-layer" data-cursor="hide" aria-hidden="true">
      <canvas ref={paperRef} className="erase-layer__paper" />
      <canvas ref={crumbRef} className="erase-layer__crumbs" />
      <div ref={tipRef} className="erase-layer__tip" />
    </div>
  );
}
