"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { sound, type SceneName } from "@/lib/sound";

/**
 * Tells the score where you are and how fast you're moving: whichever
 * [data-sound] section covers the middle of the screen sets the chord, and
 * scroll speed brightens it. Links and buttons answer hover and click.
 *
 * The section is found by an observer with the viewport squeezed to a single
 * line across its middle, so nothing is measured until something crosses it.
 */
export function SoundDirector() {
  const pathname = usePathname();

  useEffect(() => {
    let lastY = window.scrollY;
    let lastT = performance.now();
    let queued = false;
    const onScroll = () => {
      if (queued) return;
      queued = true;
      requestAnimationFrame(() => {
        queued = false;
        const now = performance.now();
        const v = Math.abs(window.scrollY - lastY) / Math.max(1, now - lastT); // px/ms
        lastY = window.scrollY;
        lastT = now;
        sound.motion(v / 3);
      });
    };

    // Sections stacked in the document can both touch the middle line for a
    // frame; the last one to cross it wins, which is the one you're entering.
    const crossing = new Set<HTMLElement>();
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          const el = e.target as HTMLElement;
          if (e.isIntersecting) crossing.add(el);
          else crossing.delete(el);
        }
        const el = [...crossing].pop();
        sound.scene((el?.dataset.sound ?? "page") as SceneName);
      },
      { rootMargin: "-50% 0px -50% 0px" },
    );
    document.querySelectorAll<HTMLElement>("[data-sound]").forEach((el) => io.observe(el));

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
    window.addEventListener("scroll", onScroll, { passive: true });
    document.addEventListener("pointerover", onOver, { passive: true });
    document.addEventListener("pointerdown", onDown, { passive: true });
    return () => {
      io.disconnect();
      window.removeEventListener("scroll", onScroll);
      document.removeEventListener("pointerover", onOver);
      document.removeEventListener("pointerdown", onDown);
    };
  }, [pathname]);

  return null;
}
