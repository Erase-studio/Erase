"use client";

import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { SplitText } from "gsap/SplitText";
import { ScrambleTextPlugin } from "gsap/ScrambleTextPlugin";
import { CustomEase } from "gsap/CustomEase";
import { DrawSVGPlugin } from "gsap/DrawSVGPlugin";

if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger, SplitText, ScrambleTextPlugin, CustomEase, DrawSVGPlugin);
  // House curves: a quick pencil stroke, and a heavy eraser pass.
  CustomEase.create("stroke", "0.7, 0, 0.12, 1");
  CustomEase.create("rub", "0.83, 0, 0.17, 1");
  gsap.defaults({ ease: "expo.out", duration: 1 });
}

declare global {
  interface Window {
    __erasePT?: boolean;
  }
}

/**
 * Run an entrance once the page is actually visible: after the loader on a hard
 * load, or after the transition band starts lifting on a route change.
 */
export function onReveal(cb: () => void) {
  if (typeof window === "undefined") return () => {};
  const w = window as Window & { __eraseLoaded?: boolean };
  if (w.__eraseLoaded && !w.__erasePT) {
    cb();
    return () => {};
  }
  // Reveal events fire from inside GSAP tween callbacks; creating ScrollTriggers
  // mid-render corrupts their refresh order, so step out to the next frame first.
  let raf = 0;
  const handler = () => {
    raf = requestAnimationFrame(cb);
  };
  window.addEventListener("erase:reveal", handler, { once: true });
  return () => {
    window.removeEventListener("erase:reveal", handler);
    cancelAnimationFrame(raf);
  };
}

export const reducedMotion = () =>
  typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

export { gsap, ScrollTrigger, SplitText };
