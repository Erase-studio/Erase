"use client";

import { useEffect, useRef } from "react";
import Image from "next/image";
import { gsap } from "@/lib/gsap";
import { hostOf, type Work } from "@/content/work";

/**
 * The real product, in a browser window. On a mouse the screenshot drifts a
 * little against the pointer, as if the window had depth behind the glass.
 * Projects with a themed UI show the side that matches the site's theme.
 */
export function PreviewFrame({ item, interactive = false, priority = false }: { item: Work; interactive?: boolean; priority?: boolean }) {
  const viewRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!interactive) return;
    const view = viewRef.current!;
    const fine = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!fine || reduced) return;
    const shot = view.querySelector<HTMLElement>(".bframe__shots")!;
    const xTo = gsap.quickTo(shot, "xPercent", { duration: 0.9, ease: "expo.out" });
    const yTo = gsap.quickTo(shot, "yPercent", { duration: 0.9, ease: "expo.out" });
    const move = (e: PointerEvent) => {
      const r = view.getBoundingClientRect();
      xTo(((e.clientX - r.left) / r.width - 0.5) * -3);
      yTo(((e.clientY - r.top) / r.height - 0.5) * -3);
    };
    const leave = () => {
      xTo(0);
      yTo(0);
    };
    view.addEventListener("pointermove", move);
    view.addEventListener("pointerleave", leave);
    return () => {
      view.removeEventListener("pointermove", move);
      view.removeEventListener("pointerleave", leave);
    };
  }, [interactive]);

  const { shot } = item;
  const sizes = "(min-width: 1024px) 50vw, 100vw";

  return (
    <div className="bframe" aria-hidden="true">
      <div className="bframe__bar">
        <i />
        <i />
        <i />
        {hostOf(item) && <span className="bframe__url">{hostOf(item)}</span>}
      </div>
      <div ref={viewRef} className="bframe__view" data-hover={interactive}>
        <div className="bframe__shots">
          <Image className="bframe__shot" data-theme-shot={shot.light ? "dark" : undefined} src={shot.src} alt="" width={shot.w} height={shot.h} sizes={sizes} priority={priority} />
          {shot.light && <Image className="bframe__shot" data-theme-shot="light" src={shot.light} alt="" width={shot.w} height={shot.h} sizes={sizes} />}
        </div>
      </div>
    </div>
  );
}
