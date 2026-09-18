"use client";

import { useEffect, useRef } from "react";

/**
 * The cursor is a pencil and an eraser.
 *
 *   Pencil   a lead tip that leaves a faint graphite trail, which rubs itself
 *            away behind you. Drawn with difference blending, so it reads on
 *            paper, on graphite and on blue alike.
 *   Eraser   over anything you can press, the pencil flips into a small eraser
 *            that tilts with your movement; buttons lean toward it (magnetic).
 *   Lens     over a big headline [data-warp], the tip opens into a lens that
 *            inverts what's under it, and the letters nearest you swell in
 *            weight and width (Mona Sans is variable).
 *   Label    over [data-cursor-label] (posters, the hero heap), a blue tag.
 *
 * Fine pointers only; reduced motion keeps a plain tip with no trail or warp.
 */

type Char = { el: HTMLElement; x: number; y: number; c: number };
type Warp = { el: HTMLElement; chars: Char[]; base: number };

const TRAIL_LIFE = 460; // ms a pencil mark lasts before it's rubbed away
const WARP_R = 170; // px around the cursor where letters swell

export function Cursor() {
  const rootRef = useRef<HTMLDivElement>(null);
  const inkRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fine = window.matchMedia("(hover: hover) and (pointer: fine)");
    if (!fine.matches) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const root = rootRef.current!;
    const ink = inkRef.current!;
    const canvas = ink.querySelector("canvas")!;
    const ctx = canvas.getContext("2d")!;
    const tipEl = ink.querySelector<HTMLElement>(".cur__tip")!;
    const eraser = root.querySelector<HTMLElement>(".cur__eraser")!;
    const tag = root.querySelector<HTMLElement>(".cur__tag")!;
    const tagText = tag.querySelector("span")!;
    const html = document.documentElement;
    html.classList.add("has-cursor");

    let dpr = 1;
    const size = () => {
      dpr = Math.min(1.5, window.devicePixelRatio || 1);
      canvas.width = Math.round(window.innerWidth * dpr);
      canvas.height = Math.round(window.innerHeight * dpr);
    };
    size();

    const pos = { x: -200, y: -200 };
    const tip = { x: -200, y: -200 };
    const er = { x: -200, y: -200, a: 0 };
    const tg = { x: -200, y: -200 };
    const trail: { x: number; y: number; t: number }[] = [];
    let state = "default";
    let visible = false;
    let magnet: HTMLElement | null = null;
    let raf = 0;
    let lastMove = 0;

    // ─── Letters that swell ───
    const warps = new Map<HTMLElement, Warp>();
    const wrap = (el: HTMLElement): Warp => {
      if (!el.querySelector(".wc")) {
        const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
        const nodes: Text[] = [];
        while (walker.nextNode()) nodes.push(walker.currentNode as Text);
        for (const n of nodes) {
          const text = n.textContent ?? "";
          if (!text.trim()) continue;
          const frag = document.createDocumentFragment();
          for (const ch of text) {
            if (ch === " " || ch === "\n") frag.append(ch);
            else {
              const s = document.createElement("span");
              s.className = "wc";
              s.textContent = ch;
              frag.append(s);
            }
          }
          n.replaceWith(frag);
        }
      }
      const chars = [...el.querySelectorAll<HTMLElement>(".wc")].map((c) => ({ el: c, x: 0, y: 0, c: 0 }));
      const w = { el, chars, base: parseInt(getComputedStyle(el).fontWeight) || 500 };
      warps.set(el, w);
      return w;
    };
    const warpTargets = () => [...document.querySelectorAll<HTMLElement>("[data-warp]")];
    let targets = warpTargets();
    const refresh = window.setInterval(() => (targets = warpTargets()), 1200);

    const stepWarp = () => {
      let moving = false;
      for (const el of targets) {
        const r = el.getBoundingClientRect();
        const near = !reduced && pos.x > r.left - WARP_R && pos.x < r.right + WARP_R && pos.y > r.top - WARP_R && pos.y < r.bottom + WARP_R;
        let w = warps.get(el);
        if (!w && !near) continue;
        if (!w || !w.chars[0]?.el.isConnected) w = wrap(el);
        // Read every position first, then write, so the page lays out once.
        for (const ch of w.chars) {
          const b = ch.el.getBoundingClientRect();
          ch.x = b.left + b.width / 2;
          ch.y = b.top + b.height / 2;
        }
        for (const ch of w.chars) {
          const d = near ? Math.hypot(ch.x - pos.x, ch.y - pos.y) : Infinity;
          const t = d < WARP_R ? (1 - d / WARP_R) ** 2 : 0;
          ch.c += (t - ch.c) * 0.2;
          if (Math.abs(t - ch.c) > 0.002) moving = true;
          if (ch.c < 0.003) {
            if (ch.el.style.fontVariationSettings) ch.el.style.fontVariationSettings = "";
            continue;
          }
          ch.el.style.fontVariationSettings = `"wght" ${Math.min(900, w.base + 360 * ch.c).toFixed(0)}, "wdth" ${(100 + 22 * ch.c).toFixed(1)}`;
        }
      }
      return moving;
    };

    // ─── What the pointer is over ───
    const classify = (t: Element | null) => {
      if (!t) return "default";
      if (t.closest("[data-cursor='hide']")) return "hide";
      if (t.closest("input, textarea, select, [contenteditable='true']")) return "text";
      const lab = t.closest<HTMLElement>("[data-cursor-label]");
      if (lab) {
        tagText.textContent = lab.dataset.cursorLabel ?? "";
        return "label";
      }
      if (t.closest("a[href], button, [role='button'], label, summary")) return "press";
      if (t.closest("[data-warp]")) return "lens";
      return "default";
    };

    const setState = (s: string) => {
      if (s === state) return;
      state = s;
      html.dataset.cursor = s;
    };

    const onMove = (e: PointerEvent) => {
      if (e.pointerType !== "mouse") return;
      pos.x = e.clientX;
      pos.y = e.clientY;
      lastMove = performance.now();
      if (!visible) {
        visible = true;
        tip.x = er.x = tg.x = pos.x;
        tip.y = er.y = tg.y = pos.y;
        html.dataset.cursorVisible = "true";
      }
      setState(classify(e.target as Element | null));
      if (state === "default" && !reduced) trail.push({ x: pos.x, y: pos.y, t: lastMove });
      // Buttons lean toward the pointer.
      const m = (e.target as Element | null)?.closest?.<HTMLElement>(".pill, .nav__logo, .eb");
      if (m !== magnet) {
        if (magnet) {
          magnet.dataset.magnet = "off";
          magnet.style.translate = "";
        }
        magnet = reduced ? null : (m ?? null);
        if (magnet) magnet.dataset.magnet = "on";
      }
      if (magnet) {
        const r = magnet.getBoundingClientRect();
        const dx = pos.x - (r.left + r.width / 2);
        const dy = pos.y - (r.top + r.height / 2);
        magnet.style.translate = `${(dx * 0.22).toFixed(1)}px ${(dy * 0.32).toFixed(1)}px`;
      }
      wake();
    };

    const render = () => {
      raf = 0;
      const now = performance.now();
      const k = reduced ? 1 : 0.42;
      tip.x += (pos.x - tip.x) * k;
      tip.y += (pos.y - tip.y) * k;
      const vx = pos.x - er.x;
      const vy = pos.y - er.y;
      er.x += vx * 0.3;
      er.y += vy * 0.3;
      er.a += (Math.max(-28, Math.min(28, vx * 0.9)) - er.a) * 0.2;
      tg.x += (pos.x - tg.x) * 0.25;
      tg.y += (pos.y - tg.y) * 0.25;
      tipEl.style.transform = `translate3d(${tip.x}px, ${tip.y}px, 0)`;
      eraser.style.transform = `translate3d(${er.x}px, ${er.y}px, 0) rotate(${(-18 + er.a).toFixed(1)}deg)`;
      tag.style.transform = `translate3d(${tg.x}px, ${tg.y}px, 0)`;

      // The graphite trail, fading as the rubber catches up with it.
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const life = state === "default" ? TRAIL_LIFE : 140;
      while (trail.length && now - trail[0].t > life) trail.shift();
      ctx.lineCap = "round";
      ctx.strokeStyle = "#fff";
      for (let i = 1; i < trail.length; i++) {
        const a = trail[i - 1];
        const b = trail[i];
        const age = (now - b.t) / life;
        if (age >= 1) continue;
        ctx.globalAlpha = (1 - age) ** 1.6 * 0.8;
        ctx.lineWidth = 0.4 + (1 - age) * 2.1;
        ctx.beginPath();
        ctx.moveTo(a.x, a.y);
        ctx.lineTo(b.x, b.y);
        ctx.stroke();
      }
      ctx.globalAlpha = 1;

      const warping = stepWarp();
      const settling = Math.abs(pos.x - tip.x) + Math.abs(pos.y - tip.y) > 0.3 || Math.abs(pos.x - er.x) > 0.3;
      if (trail.length || warping || settling || now - lastMove < 300) wake();
    };
    const wake = () => {
      if (!raf) raf = requestAnimationFrame(render);
    };

    const onLeave = (e: MouseEvent) => {
      if (e.relatedTarget) return;
      visible = false;
      html.dataset.cursorVisible = "false";
      pos.x = pos.y = -500;
      wake();
    };
    const onDown = () => (html.dataset.cursorDown = "true");
    const onUp = () => (html.dataset.cursorDown = "false");
    // The page moved under a still pointer: look again at what it's over.
    const onScroll = () => {
      if (!visible) return;
      setState(classify(document.elementFromPoint(pos.x, pos.y)));
      wake();
    };

    window.addEventListener("pointermove", onMove, { passive: true });
    window.addEventListener("mouseout", onLeave);
    window.addEventListener("pointerdown", onDown);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", size);
    return () => {
      html.classList.remove("has-cursor");
      window.clearInterval(refresh);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("mouseout", onLeave);
      window.removeEventListener("pointerdown", onDown);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", size);
      cancelAnimationFrame(raf);
    };
  }, []);

  // Two layers: the ink blends (difference) with the page itself, so it has to
  // sit on its own at the top level; the eraser and tag are drawn normally.
  return (
    <>
      <div ref={inkRef} className="cur-ink" aria-hidden="true">
        <canvas className="cur__trail" />
        <div className="cur__tip">
          <i />
        </div>
      </div>
      <div ref={rootRef} className="cur" aria-hidden="true">
        <div className="cur__eraser">
          <i />
          <b />
        </div>
        <div className="cur__tag">
          <span />
        </div>
      </div>
    </>
  );
}
