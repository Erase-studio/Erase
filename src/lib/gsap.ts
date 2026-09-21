"use client";

import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

/**
 * The two pieces every page needs. Anything heavier — SplitText for the line
 * reveals, DrawSVG for the drawn portraits — is fetched by the one component
 * that uses it, so a page without them never carries the code.
 */
if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger);
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

export { gsap, ScrollTrigger };
