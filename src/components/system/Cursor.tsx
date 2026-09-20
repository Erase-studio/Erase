"use client";

import { useEffect, useRef } from "react";

/**
 * The cursor is a small graphite dot that keeps out of the way.
 *
 *   Dot      follows closely, drawn with difference blending so it reads on
 *            paper, on graphite and on blue alike.
 *   Press    over anything you can press it opens a little and eases onto the
 *            target, which leans back toward it (see the magnet below).
 *   Lens     over a big headline [data-warp] the letters nearest it swell in
 *            weight and width (Mona Sans is variable).
 *   Label    over [data-cursor-label] (posters, the hero heap), a blue tag.
 *   Click    one quick pulse (the page ripples under it: see Wash).
 *
 * Fine pointers only; reduced motion keeps the dot with no lag or warp.
 */

type Char = { el: HTMLElement; x: number; y: number; c: number };
type Warp = { el: HTMLElement; chars: Char[]; base: number };

const WARP_R = 170; // px around the cursor where letters swell

export function Cursor() {
  const rootRef = useRef<HTMLDivElement>(null);
  const dotRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const fine = window.matchMedia("(hover: hover) and (pointer: fine)");
    if (!fine.matches) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const root = rootRef.current!;
    const dot = dotRef.current!;
    const tag = root.querySelector<HTMLElement>(".cur__tag")!;
    const tagText = tag.querySelector("span")!;
    const html = document.documentElement;
    html.classList.add("has-cursor");

    const pos = { x: -500, y: -500 };
    const at = { x: -500, y: -500, r: 5 };
    const tg = { x: -500, y: -500 };
    let state = "default";
    let target: HTMLElement | null = null;
    let visible = false;
    let magnet: HTMLElement | null = null;
    let raf = 0;
    let last = performance.now();
    let pulse = 0;

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
      target = null;
      if (!t) return "default";
      if (t.closest("[data-cursor='hide']")) return "hide";
      if (t.closest("input, textarea, select, [contenteditable='true']")) return "text";
      const lab = t.closest<HTMLElement>("[data-cursor-label]");
      if (lab) {
        tagText.textContent = lab.dataset.cursorLabel ?? "";
        return "label";
      }
      const press = t.closest<HTMLElement>("a[href], button, [role='button'], label, summary");
      if (press) {
        target = press;
        return "press";
      }
      if (t.closest("[data-warp]")) return "lens";
      return "default";
    };
    const look = (t: Element | null) => {
      const s = classify(t);
      if (s !== state) {
        state = s;
        html.dataset.cursor = s;
      }
    };

    const onMove = (e: PointerEvent) => {
      if (e.pointerType !== "mouse") return;
      pos.x = e.clientX;
      pos.y = e.clientY;
      if (!visible) {
        visible = true;
        at.x = tg.x = pos.x;
        at.y = tg.y = pos.y;
        html.dataset.cursorVisible = "true";
      }
      look(e.target as Element | null);
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
        magnet.style.translate = `${(dx * 0.2).toFixed(1)}px ${(dy * 0.3).toFixed(1)}px`;
      }
      wake();
    };

    const render = () => {
      raf = 0;
      const now = performance.now();
      const dt = Math.min(1 / 30, (now - last) / 1000);
      last = now;
      const ease = (k: number) => (reduced ? 1 : 1 - Math.pow(1 - k, dt * 60));

      // Where it wants to be: the pointer, or eased onto a small target.
      let wx = pos.x;
      let wy = pos.y;
      let wr = state === "hide" || state === "text" ? 0 : state === "label" ? 3 : state === "lens" ? 7 : 5;
      if (state === "press" && target?.isConnected) {
        const r = target.getBoundingClientRect();
        const snug = r.height <= 64 && r.width <= 360;
        wr = snug ? 13 : 9;
        if (snug) {
          // Eased onto the target, never all the way: you still lead it.
          wx = pos.x + (r.left + r.width / 2 - pos.x) * 0.35;
          wy = pos.y + (r.top + r.height / 2 - pos.y) * 0.35;
        }
      }
      at.x += (wx - at.x) * ease(0.62);
      at.y += (wy - at.y) * ease(0.62);
      at.r += (wr - at.r) * ease(0.25);
      pulse += (0 - pulse) * ease(0.22);
      const r = Math.max(0, at.r * (1 - pulse * 0.45));
      dot.style.transform = `translate3d(${at.x.toFixed(2)}px, ${at.y.toFixed(2)}px, 0)`;
      dot.style.width = dot.style.height = `${(r * 2).toFixed(2)}px`;

      tg.x += (pos.x - tg.x) * ease(0.25);
      tg.y += (pos.y - tg.y) * ease(0.25);
      tag.style.transform = `translate3d(${tg.x.toFixed(1)}px, ${tg.y.toFixed(1)}px, 0)`;

      const warping = stepWarp();
      const settling = Math.abs(wx - at.x) + Math.abs(wy - at.y) > 0.2 || Math.abs(wr - at.r) > 0.05 || pulse > 0.01 || Math.abs(pos.x - tg.x) > 0.3;
      if (warping || settling) wake();
    };
    const wake = () => {
      if (!raf) raf = requestAnimationFrame(render);
    };

    const onLeave = (e: MouseEvent) => {
      if (e.relatedTarget) return;
      visible = false;
      html.dataset.cursorVisible = "false";
    };
    const onDown = (e: PointerEvent) => {
      if (e.pointerType !== "mouse") return;
      html.dataset.cursorDown = "true";
      pulse = 1;
      wake();
    };
    const onUp = () => {
      html.dataset.cursorDown = "false";
      wake();
    };
    // The page moved under a still pointer: look again at what it's over.
    const onScroll = () => {
      if (!visible) return;
      look(document.elementFromPoint(pos.x, pos.y));
      wake();
    };

    window.addEventListener("pointermove", onMove, { passive: true });
    window.addEventListener("mouseout", onLeave);
    window.addEventListener("pointerdown", onDown);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      html.classList.remove("has-cursor");
      window.clearInterval(refresh);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("mouseout", onLeave);
      window.removeEventListener("pointerdown", onDown);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("scroll", onScroll);
      cancelAnimationFrame(raf);
    };
  }, []);

  // The dot blends with the page (difference), so it has to sit on its own at
  // the top level; the tag is drawn normally over everything.
  return (
    <>
      <i ref={dotRef} className="cur-dot" aria-hidden="true" />
      <div ref={rootRef} className="cur" aria-hidden="true">
        <div className="cur__tag">
          <span />
        </div>
      </div>
    </>
  );
}
