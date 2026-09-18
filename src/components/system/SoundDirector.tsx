"use client";

import { useEffect } from "react";
import { sound, type SceneName } from "@/lib/sound";

/**
 * Tells the score where you are and how fast you're moving: whichever
 * [data-sound] section covers the middle of the screen sets the chord, and
 * scroll speed brightens it. Links and buttons answer hover and click.
 */
export function SoundDirector() {
  useEffect(() => {
    let lastY = window.scrollY;
    let lastT = performance.now();
    const onScroll = () => {
      const now = performance.now();
      const v = Math.abs(window.scrollY - lastY) / Math.max(1, now - lastT); // px/ms
      lastY = window.scrollY;
      lastT = now;
      sound.motion(v / 3);
    };
    const where = () => {
      const el = document.elementFromPoint(window.innerWidth / 2, window.innerHeight / 2);
      const scene = (el?.closest<HTMLElement>("[data-sound]")?.dataset.sound ?? "page") as SceneName;
      sound.scene(scene);
    };
    const pressable = "a[href], button, [role='button'], select, label";
    let hovered: Element | null = null;
    const onOver = (e: PointerEvent) => {
      if (e.pointerType !== "mouse") return;
      const t = (e.target as Element | null)?.closest?.(pressable) ?? null;
      if (t && t !== hovered) sound.hover();
      hovered = t;
    };
    const onDown = (e: PointerEvent) => {
      if ((e.target as Element | null)?.closest?.(pressable)) sound.press();
    };
    const timer = window.setInterval(where, 250);
    window.addEventListener("scroll", onScroll, { passive: true });
    document.addEventListener("pointerover", onOver, { passive: true });
    document.addEventListener("pointerdown", onDown, { passive: true });
    return () => {
      window.clearInterval(timer);
      window.removeEventListener("scroll", onScroll);
      document.removeEventListener("pointerover", onOver);
      document.removeEventListener("pointerdown", onDown);
    };
  }, []);
  return null;
}
