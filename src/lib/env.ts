"use client";

import { useSyncExternalStore } from "react";

function media(query: string) {
  return {
    subscribe(cb: () => void) {
      const mq = window.matchMedia(query);
      mq.addEventListener("change", cb);
      return () => mq.removeEventListener("change", cb);
    },
    get: () => window.matchMedia(query).matches,
  };
}

const reduced = media("(prefers-reduced-motion: reduce)");
const fine = media("(hover: hover) and (pointer: fine)");
const desktop = media("(min-width: 1024px)");

/** Server snapshot is the calm default: reduced motion, no custom pointer. */
export const useReducedMotion = () =>
  useSyncExternalStore(reduced.subscribe, reduced.get, () => true);

export const useFinePointer = () =>
  useSyncExternalStore(fine.subscribe, fine.get, () => false);

export const useDesktop = () =>
  useSyncExternalStore(desktop.subscribe, desktop.get, () => false);

export const prefersReducedMotion = () =>
  typeof window !== "undefined" && reduced.get();

export const hasFinePointer = () => typeof window !== "undefined" && fine.get();
