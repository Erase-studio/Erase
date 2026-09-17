"use client";

import { useEffect, useRef } from "react";
import { gsap } from "@/lib/gsap";
import type { Work } from "@/content/work";
import { Mini } from "./Minis";

/**
 * Direct manipulation instead of a hover animation: the pointer's height scrolls
 * the miniature site, and on the Erase preview its x position moves the split.
 */
export function PreviewFrame({ item, interactive = true }: { item: Work; interactive?: boolean }) {
  const viewRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const view = viewRef.current!;
    const mini = view.firstElementChild as HTMLElement;
    const fine = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const isSplit = item.mini === "erase";
    // Outside the home stack the scroll owns the pan; only the before/after split stays live.
    if (!fine || reduced || (!interactive && !isSplit)) return;

    const yTo = gsap.quickTo(mini, "y", { duration: 0.9, ease: "expo.out" });

    const move = (e: PointerEvent) => {
      const r = view.getBoundingClientRect();
      const px = (e.clientX - r.left) / r.width;
      const py = (e.clientY - r.top) / r.height;
      if (isSplit) {
        mini.style.setProperty("--split", `${Math.round(Math.max(0, Math.min(1, px)) * 100)}%`);
        return;
      }
      const overflow = mini.offsetHeight - r.height;
      if (overflow > 0) yTo(-overflow * Math.max(0, Math.min(1, (py - 0.1) / 0.8)));
    };
    const leave = () => {
      if (isSplit) mini.style.setProperty("--split", "52%");
      else yTo(0);
    };
    view.addEventListener("pointermove", move);
    view.addEventListener("pointerleave", leave);
    return () => {
      view.removeEventListener("pointermove", move);
      view.removeEventListener("pointerleave", leave);
    };
  }, [item.mini, interactive]);

  const host = item.mini === "erase" ? "erase.studio" : `${item.slug}.concept`;

  return (
    <div
      className="bframe"
      data-cursor-label={interactive ? "View case" : item.mini === "erase" ? "Before / after" : undefined}
      aria-hidden="true"
    >
      <div className="bframe__bar">
        <i />
        <i />
        <i />
        <span className="bframe__url">{host}</span>
      </div>
      <div ref={viewRef} className="bframe__view">
        <Mini kind={item.mini} />
      </div>
    </div>
  );
}
