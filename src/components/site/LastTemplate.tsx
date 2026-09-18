"use client";

import { useEffect, useRef, useState } from "react";
import { RubHand, RubSurface, mulberry32 } from "@/lib/rub";
import { sound } from "@/lib/sound";

/**
 * The last template on the site. A generic landing page is printed over the
 * real call to action; you rub it out with the eraser. The rubber drags and
 * sticks, crumbs fall and pile up at the bottom, graphite smears where you
 * pushed. You're in control: nothing finishes for you while you're rubbing.
 * Leave after rubbing most of it and the rest fades; "Skip" or tabbing into
 * the links fades it at once. Without JavaScript there's no cover at all.
 */

type Crumb = { x: number; y: number; vx: number; vy: number; r: number; a: number; va: number; c: string; rest: boolean; pts: number[] };

const CRUMB_COLORS = ["#f2f1ec", "#e3e1da", "#cfccc4", "#b9bcc4"];

export function LastTemplate({ children }: { children: React.ReactNode }) {
  const rootRef = useRef<HTMLDivElement>(null);
  const [state, setState] = useState<"covered" | "open" | "gone">("covered");
  const [pct, setPct] = useState(0);
  const api = useRef<{ skip: () => void } | null>(null);

  useEffect(() => {
    const root = rootRef.current!;
    const cover = root.querySelector<HTMLCanvasElement>(".lt__cover")!;
    const marks = root.querySelector<HTMLCanvasElement>(".lt__marks")!;
    const crumbsC = root.querySelector<HTMLCanvasElement>(".lt__crumbs")!;
    const tool = root.querySelector<HTMLElement>(".lt__tool")!;
    const cctx = crumbsC.getContext("2d")!;
    const family = getComputedStyle(document.body).fontFamily;
    const surface = new RubSurface({ canvas: cover, marks, residue: "120,122,128", specks: ["#8b8e94", "#b9bcc4", "#5d6066"], strength: 0.26, cols: 40, rows: 22 });
    const hand = new RubHand(80);
    const rnd = mulberry32(7);
    const crumbs: Crumb[] = [];
    let w = 0;
    let h = 0;
    let dpr = 1;
    let over = false;
    let down = false;
    let raf = 0;
    let last = performance.now();
    let done = false;
    let cancelDissolve: (() => void) | null = null;
    let leaveTimer = 0;
    let lastPct = -1;

    const size = () => {
      const b = root.getBoundingClientRect();
      w = b.width;
      h = b.height;
      dpr = Math.min(2, window.devicePixelRatio || 1);
      surface.setSize(w, h, dpr);
      for (const c of [marks, crumbsC]) {
        c.width = Math.round(w * dpr);
        c.height = Math.round(h * dpr);
      }
      marks.getContext("2d")!.setTransform(dpr, 0, 0, dpr, 0, 0);
      cctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      if (!done) {
        drawCover(surface.context, w, h, family);
        surface.replay();
      }
    };

    const finish = (ms: number) => {
      if (done) return;
      done = true;
      setState("open");
      tool.style.opacity = "0";
      cancelDissolve = surface.dissolve(ms, () => setState("gone"));
    };
    api.current = { skip: () => finish(900) };

    const spawn = (x: number, y: number, amount: number) => {
      const n = Math.min(4, Math.floor(amount * 3 + rnd()));
      for (let i = 0; i < n && crumbs.length < 420; i++) {
        const r = 1.2 + rnd() * rnd() * 3.6;
        const pts: number[] = [];
        const k = 5 + Math.floor(rnd() * 3);
        for (let j = 0; j < k; j++) pts.push(0.6 + rnd() * 0.5);
        crumbs.push({
          x: x + (rnd() - 0.5) * 60,
          y: y + (rnd() - 0.3) * 20,
          vx: hand.vx * 0.12 + (rnd() - 0.5) * 120,
          vy: hand.vy * 0.08 - rnd() * 90,
          r,
          a: rnd() * 6,
          va: (rnd() - 0.5) * 14,
          c: CRUMB_COLORS[(rnd() * CRUMB_COLORS.length) | 0],
          rest: false,
          pts,
        });
      }
    };

    const drawCrumbs = (dt: number) => {
      cctx.clearRect(0, 0, w, h);
      let moving = false;
      for (const c of crumbs) {
        if (!c.rest) {
          moving = true;
          c.vy += 1900 * dt;
          c.vx *= Math.exp(-dt * 1.5);
          c.x += c.vx * dt;
          c.y += c.vy * dt;
          c.a += c.va * dt;
          const floor = h - c.r - 2;
          if (c.y > floor) {
            c.y = floor;
            if (Math.abs(c.vy) < 90) {
              c.rest = true;
              c.vy = 0;
            } else {
              c.vy *= -0.28;
              c.vx *= 0.6;
              c.va *= 0.5;
            }
          }
        }
        cctx.save();
        cctx.translate(c.x, c.y);
        cctx.rotate(c.a);
        cctx.beginPath();
        c.pts.forEach((p, j) => {
          const an = (j / c.pts.length) * Math.PI * 2;
          const f = j ? cctx.lineTo.bind(cctx) : cctx.moveTo.bind(cctx);
          f(Math.cos(an) * c.r * p * 1.3, Math.sin(an) * c.r * p);
        });
        cctx.closePath();
        cctx.fillStyle = c.c;
        cctx.shadowColor = "rgba(0,0,0,0.25)";
        cctx.shadowBlur = 2;
        cctx.shadowOffsetY = 1;
        cctx.fill();
        cctx.restore();
      }
      return moving;
    };

    const loop = (now: number) => {
      const dt = Math.min(1 / 30, (now - last) / 1000);
      last = now;
      let busy = false;
      if (over && !done) {
        hand.push = down ? 1 : 0;
        hand.step(dt);
        const pressure = hand.pressure * (down ? 1 : 0.75);
        const radius = Math.max(26, Math.min(44, w * 0.028));
        const got = surface.rubTo(hand.x, hand.y, pressure, hand.angle, radius);
        if (hand.reversed) surface.turn(hand.x, hand.y, radius);
        if (got.removed > 0.01) spawn(hand.x, hand.y, got.removed);
        sound.rub(hand.speed, pressure);
        tool.style.transform = `translate3d(${hand.x}px, ${hand.y}px, 0) rotate(${hand.angle + 1}rad) scale(${1 - pressure * 0.05})`;
        const p = Math.round(surface.progress() * 100);
        if (p !== lastPct) {
          lastPct = p;
          setPct(p);
          if (p >= 55) setState((s) => (s === "covered" ? "open" : s));
          if (p >= 97) finish(500);
        }
        busy = true;
      }
      if (drawCrumbs(dt)) busy = true;
      raf = busy ? requestAnimationFrame(loop) : 0;
    };
    const wake = () => {
      if (!raf) {
        last = performance.now();
        raf = requestAnimationFrame(loop);
      }
    };

    const local = (e: PointerEvent) => {
      const b = root.getBoundingClientRect();
      return { x: e.clientX - b.left, y: e.clientY - b.top };
    };
    const onEnter = (e: PointerEvent) => {
      if (done) return;
      window.clearTimeout(leaveTimer);
      const p = local(e);
      over = true;
      hand.reset(p.x, p.y);
      surface.lift();
      tool.style.opacity = "1";
      wake();
    };
    const onMove = (e: PointerEvent) => {
      if (done) return;
      if (!over) onEnter(e);
      const p = local(e);
      hand.aim(p.x, p.y);
    };
    const onLeave = () => {
      over = false;
      down = false;
      surface.lift();
      tool.style.opacity = "0";
      // Walked away having done most of it: let the rest fade on its own.
      if (surface.progress() > 0.5) leaveTimer = window.setTimeout(() => finish(1400), 700);
    };
    const onDown = (e: PointerEvent) => {
      down = true;
      if (e.pointerType !== "mouse") onEnter(e);
    };
    const onUp = (e: PointerEvent) => {
      down = false;
      if (e.pointerType !== "mouse") onLeave();
    };
    // Keyboard users reach the links under the cover: clear it for them.
    const onFocus = () => finish(700);

    size();
    const ro = new ResizeObserver(() => size());
    ro.observe(root);
    root.addEventListener("pointerenter", onEnter);
    root.addEventListener("pointermove", onMove);
    root.addEventListener("pointerleave", onLeave);
    root.addEventListener("pointercancel", onLeave);
    root.addEventListener("pointerdown", onDown);
    window.addEventListener("pointerup", onUp);
    root.addEventListener("focusin", onFocus);
    return () => {
      cancelAnimationFrame(raf);
      cancelDissolve?.();
      window.clearTimeout(leaveTimer);
      ro.disconnect();
      root.removeEventListener("pointerenter", onEnter);
      root.removeEventListener("pointermove", onMove);
      root.removeEventListener("pointerleave", onLeave);
      root.removeEventListener("pointercancel", onLeave);
      root.removeEventListener("pointerdown", onDown);
      window.removeEventListener("pointerup", onUp);
      root.removeEventListener("focusin", onFocus);
    };
  }, []);

  return (
    <>
      <div className="lt__bar mono muted">
        <p>(End) The last template on this site</p>
        <p className="lt__status" aria-hidden="true">
          {state === "covered" ? (
            <>
              <span className="lt__pct">{String(pct).padStart(2, "0")}%</span> rubbed out
            </>
          ) : (
            "Gone. Nothing generic left."
          )}
        </p>
        {state === "covered" && (
          <button type="button" className="lt__skip" onClick={() => api.current?.skip()}>
            Skip, just show me
          </button>
        )}
      </div>
      <div ref={rootRef} className="lt" data-state={state} data-cursor={state === "gone" ? undefined : "hide"}>
        <div className="lt__content">{children}</div>
        <canvas className="lt__marks" aria-hidden="true" />
        <canvas className="lt__cover" aria-hidden="true" />
        <canvas className="lt__crumbs" aria-hidden="true" />
        <div className="lt__tool" aria-hidden="true">
          <i />
          <b>Erase</b>
        </div>
        <p className="lt__hint mono" aria-hidden="true">
          Rub it out
        </p>
      </div>
    </>
  );
}

/** The most generic landing page we could make, on purpose. */
function drawCover(x: CanvasRenderingContext2D, w: number, h: number, family: string) {
  const generic = "Arial, Helvetica, sans-serif";
  const blue = "#1a73e8";
  const s = Math.min(w / 1200, h / 640, 1.25);
  const pad = 40 * s;
  x.save();
  x.globalCompositeOperation = "source-over";
  x.globalAlpha = 1;
  x.clearRect(0, 0, w, h);
  x.fillStyle = "#f6f7f9";
  x.fillRect(0, 0, w, h);

  // Nav.
  x.fillStyle = "#d4d7dd";
  x.beginPath();
  x.roundRect(pad, pad, 96 * s, 30 * s, 4 * s);
  x.fill();
  x.fillStyle = "#8a9099";
  x.font = `700 ${13 * s}px ${generic}`;
  x.textBaseline = "middle";
  x.fillText("LOGO", pad + 28 * s, pad + 15 * s);
  const links = ["Home", "About", "Services", "Blog", "Contact"];
  x.font = `${15 * s}px ${generic}`;
  x.fillStyle = "#5f6670";
  let lx = w - pad - 150 * s;
  for (let i = links.length - 1; i >= 0; i--) {
    lx -= x.measureText(links[i]).width + 28 * s;
    if (lx < w * 0.35) break;
    x.fillText(links[i], lx, pad + 15 * s);
  }
  x.fillStyle = blue;
  x.beginPath();
  x.roundRect(w - pad - 132 * s, pad - 2 * s, 132 * s, 34 * s, 4 * s);
  x.fill();
  x.fillStyle = "#fff";
  x.font = `700 ${14 * s}px ${generic}`;
  x.textAlign = "center";
  x.fillText("Get a Quote", w - pad - 66 * s, pad + 15 * s);

  // Hero copy.
  const narrow = w < 700;
  const colW = narrow ? w - pad * 2 : w * 0.46;
  const top = h * (narrow ? 0.2 : 0.3);
  x.textAlign = "left";
  x.textBaseline = "alphabetic";
  x.fillStyle = "#1f2329";
  const hs = (narrow ? 34 : 50) * s * (narrow ? 1.2 : 1);
  x.font = `700 ${hs}px ${generic}`;
  const head = wrap(x, "Your Headline Goes Here", colW);
  head.forEach((l, i) => x.fillText(l, pad, top + hs * (i + 1) * 1.08));
  let y = top + hs * head.length * 1.08 + 26 * s;
  x.fillStyle = "#6b7280";
  const bs = 18 * s * (narrow ? 1.15 : 1);
  x.font = `${bs}px ${generic}`;
  wrap(x, "Lorem ipsum dolor sit amet, consectetur adipiscing elit. We deliver innovative, best-in-class solutions for your business.", colW).forEach((l) => {
    y += bs * 1.45;
    x.fillText(l, pad, y);
  });
  y += 34 * s;
  const btn = (label: string, bx: number, filled: boolean) => {
    x.font = `700 ${15 * s}px ${generic}`;
    const bw = x.measureText(label).width + 44 * s;
    x.beginPath();
    x.roundRect(bx, y, bw, 46 * s, 4 * s);
    if (filled) {
      x.fillStyle = blue;
      x.fill();
    } else {
      x.strokeStyle = blue;
      x.lineWidth = 2 * s;
      x.stroke();
    }
    x.fillStyle = filled ? "#fff" : blue;
    x.textAlign = "center";
    x.textBaseline = "middle";
    x.fillText(label, bx + bw / 2, y + 23 * s);
    x.textAlign = "left";
    x.textBaseline = "alphabetic";
    return bw;
  };
  const b1 = btn("Contact Us", pad, true);
  btn("Learn More", pad + b1 + 14 * s, false);

  // The stock photo.
  if (!narrow) {
    const px = w * 0.56;
    const py = h * 0.2;
    const pw = w - px - pad;
    const ph = h * 0.62;
    x.fillStyle = "#e3e6eb";
    x.beginPath();
    x.roundRect(px, py, pw, ph, 6 * s);
    x.fill();
    x.fillStyle = "#c9ced6";
    x.beginPath();
    x.moveTo(px + pw * 0.18, py + ph * 0.72);
    x.lineTo(px + pw * 0.4, py + ph * 0.42);
    x.lineTo(px + pw * 0.56, py + ph * 0.62);
    x.lineTo(px + pw * 0.66, py + ph * 0.52);
    x.lineTo(px + pw * 0.84, py + ph * 0.72);
    x.closePath();
    x.fill();
    x.beginPath();
    x.arc(px + pw * 0.7, py + ph * 0.3, ph * 0.07, 0, Math.PI * 2);
    x.fill();
    x.fillStyle = "#9aa1ab";
    x.font = `${13 * s}px ${generic}`;
    x.textAlign = "center";
    x.fillText("stock-photo-handshake.jpg  ·  1200 × 800", px + pw / 2, py + ph * 0.88);
    x.textAlign = "left";
  }

  // "Trusted by".
  const ty = h - pad - 26 * s;
  x.fillStyle = "#9aa1ab";
  x.font = `700 ${12 * s}px ${generic}`;
  x.fillText("TRUSTED BY INDUSTRY LEADERS", pad, ty - 18 * s);
  for (let i = 0; i < (narrow ? 3 : 6); i++) {
    x.fillStyle = "#dfe2e7";
    x.beginPath();
    x.roundRect(pad + i * 130 * s, ty - 4 * s, 110 * s, 30 * s, 15 * s);
    x.fill();
  }
  // A faint studio stamp so it reads as printed, not broken.
  x.fillStyle = "rgba(20,21,23,0.35)";
  x.font = `500 ${11 * s}px ${family}`;
  x.textAlign = "right";
  x.fillText("template_v3_final_FINAL.psd", w - pad, h - pad * 0.6);
  x.restore();
}

function wrap(x: CanvasRenderingContext2D, text: string, max: number) {
  const out: string[] = [];
  let line = "";
  for (const word of text.split(" ")) {
    const t = line ? `${line} ${word}` : word;
    if (x.measureText(t).width > max && line) {
      out.push(line);
      line = word;
    } else line = t;
  }
  if (line) out.push(line);
  return out;
}
