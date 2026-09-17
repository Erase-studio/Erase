"use client";

import { useEffect, useRef } from "react";

/**
 * Dot + ring. The ring stretches along its direction of travel, wraps itself
 * around buttons ("stick"), grows into a label on [data-cursor-label] targets,
 * and steps aside where the page draws its own pointer. Fine pointers only.
 */
export function Cursor() {
  const dotRef = useRef<HTMLDivElement>(null);
  const ringRef = useRef<HTMLDivElement>(null);
  const stretchRef = useRef<HTMLDivElement>(null);
  const shapeRef = useRef<HTMLDivElement>(null);
  const labelRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const fine = window.matchMedia("(hover: hover) and (pointer: fine)");
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!fine.matches) return;

    const dot = dotRef.current!;
    const ring = ringRef.current!;
    const stretch = stretchRef.current!;
    const shape = shapeRef.current!;
    const label = labelRef.current!;
    const html = document.documentElement;
    html.classList.add("has-cursor");

    const pos = { x: -100, y: -100 };
    const target = { x: -100, y: -100 };
    const ringPos = { x: -100, y: -100 };
    let stuck: HTMLElement | null = null;
    let visible = false;
    let currentLabel = "";
    let raf = 0;

    const setSize = (w: number | null, h?: number) => {
      if (w === null) {
        shape.style.width = "";
        shape.style.height = "";
        shape.style.borderRadius = "";
        return;
      }
      shape.style.width = `${w}px`;
      shape.style.height = `${h}px`;
      shape.style.borderRadius = `${Math.min(h!, w) / 2}px`;
    };

    const render = () => {
      if (stuck) {
        const r = stuck.getBoundingClientRect();
        target.x = r.left + r.width / 2 + (pos.x - (r.left + r.width / 2)) * 0.12;
        target.y = r.top + r.height / 2 + (pos.y - (r.top + r.height / 2)) * 0.12;
      } else {
        target.x = pos.x;
        target.y = pos.y;
      }
      const k = reduced ? 1 : 0.18;
      const dx = target.x - ringPos.x;
      const dy = target.y - ringPos.y;
      ringPos.x += dx * k;
      ringPos.y += dy * k;
      dot.style.transform = `translate3d(${pos.x}px, ${pos.y}px, 0)`;
      ring.style.transform = `translate3d(${ringPos.x}px, ${ringPos.y}px, 0)`;

      // Squash and stretch along the direction of travel.
      const speed = Math.min(Math.hypot(dx, dy), 160);
      if (!stuck && !reduced && speed > 0.5) {
        const angle = (Math.atan2(dy, dx) * 180) / Math.PI;
        const s = speed / 160;
        stretch.style.transform = `rotate(${angle}deg) scale(${1 + s * 0.7}, ${1 - s * 0.35})`;
      } else {
        stretch.style.transform = "";
      }
      raf = requestAnimationFrame(render);
    };
    raf = requestAnimationFrame(render);

    const onMove = (e: PointerEvent) => {
      if (e.pointerType !== "mouse") return;
      pos.x = e.clientX;
      pos.y = e.clientY;
      if (!visible) {
        visible = true;
        ringPos.x = pos.x;
        ringPos.y = pos.y;
      }
      // Re-asserted on every move, so nothing can leave the cursor switched off.
      if (html.dataset.cursorVisible !== "true") html.dataset.cursorVisible = "true";
      const t = e.target as Element | null;
      const hideZone = t?.closest?.("[data-cursor='hide']");
      const labelled = t?.closest?.<HTMLElement>("[data-cursor-label]");
      const btn = t?.closest?.<HTMLElement>(".btn, .nav__toggle, .chip span");
      const interactive = t?.closest?.("a, button, input, textarea, select, label, [role='button']");

      const next = labelled?.dataset.cursorLabel ?? "";
      if (next !== currentLabel) {
        currentLabel = next;
        label.textContent = next;
      }

      if (btn && !labelled && !hideZone) {
        if (stuck !== btn) {
          stuck = btn;
          const r = btn.getBoundingClientRect();
          setSize(r.width + 14, r.height + 14);
        }
        html.dataset.cursor = "stick";
        return;
      }
      if (stuck) {
        stuck = null;
        setSize(null);
      }
      html.dataset.cursor = hideZone ? "hide" : next ? "label" : interactive ? "hover" : "default";
    };

    // Only hide when the pointer actually leaves the window (no related target).
    const onLeave = (e: MouseEvent) => {
      if (e.relatedTarget) return;
      visible = false;
      html.dataset.cursorVisible = "false";
    };
    const onDown = () => (html.dataset.cursorDown = "true");
    const onUp = () => (html.dataset.cursorDown = "false");
    const onScroll = () => {
      if (stuck) {
        const r = stuck.getBoundingClientRect();
        if (pos.x < r.left || pos.x > r.right || pos.y < r.top || pos.y > r.bottom) {
          stuck = null;
          setSize(null);
          html.dataset.cursor = "default";
        }
      }
    };

    window.addEventListener("pointermove", onMove, { passive: true });
    window.addEventListener("mouseout", onLeave);
    window.addEventListener("pointerdown", onDown);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      html.classList.remove("has-cursor");
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("mouseout", onLeave);
      window.removeEventListener("pointerdown", onDown);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("scroll", onScroll);
      cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <div className="cursor" aria-hidden="true">
      <div ref={ringRef} className="cursor__ring">
        <div ref={stretchRef} className="cursor__stretch">
          <div ref={shapeRef} className="cursor__shape" />
        </div>
        <span ref={labelRef} className="cursor__label t-label" />
      </div>
      <div ref={dotRef} className="cursor__dot" />
    </div>
  );
}
