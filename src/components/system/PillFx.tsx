"use client";

import { useEffect } from "react";

/**
 * Tells each pill where the pointer came in and where it left, so its liquid
 * fill grows from that point and drains back toward it (see .pill::before).
 */
export function PillFx() {
  useEffect(() => {
    const at = (e: PointerEvent, pill: HTMLElement) => {
      const r = pill.getBoundingClientRect();
      pill.style.setProperty("--bx", `${e.clientX - r.left}px`);
      pill.style.setProperty("--by", `${e.clientY - r.top}px`);
    };
    const over = (e: PointerEvent) => {
      const pill = (e.target as Element | null)?.closest?.<HTMLElement>(".pill");
      const from = (e.relatedTarget as Element | null)?.closest?.(".pill");
      if (pill && from !== pill) at(e, pill);
    };
    const out = (e: PointerEvent) => {
      const pill = (e.target as Element | null)?.closest?.<HTMLElement>(".pill");
      const to = (e.relatedTarget as Element | null)?.closest?.(".pill");
      if (pill && to !== pill) at(e, pill);
    };
    document.addEventListener("pointerover", over, { passive: true });
    document.addEventListener("pointerout", out, { passive: true });
    return () => {
      document.removeEventListener("pointerover", over);
      document.removeEventListener("pointerout", out);
    };
  }, []);
  return null;
}
