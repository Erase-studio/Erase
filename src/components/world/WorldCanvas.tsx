"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { gsap, ScrollTrigger } from "@/lib/gsap";
import { scenes, type SceneId } from "@/lib/world/scenes";
import { setScene, world } from "@/lib/world/store";

type Mark = { id: SceneId; top: number };

/**
 * The fixed WebGL world behind every page, and the director that drives it.
 * Sections declare a scene with data-scene; while the boundary between two
 * sections crosses the screen, the world pours from one scene into the next.
 */
export function WorldCanvas() {
  const hostRef = useRef<HTMLDivElement>(null);
  const pathname = usePathname();
  const marksRef = useRef<Mark[]>([]);

  // Re-read the page's scenes whenever the route or layout changes.
  useEffect(() => {
    const measure = () => {
      const y = window.scrollY;
      marksRef.current = [...document.querySelectorAll<HTMLElement>("[data-scene]")]
        .map((el) => ({ id: el.dataset.scene as SceneId, top: el.getBoundingClientRect().top + y }))
        .filter((m) => m.id in scenes)
        .sort((a, b) => a.top - b.top);
    };
    measure();
    const raf = requestAnimationFrame(measure);
    ScrollTrigger.addEventListener("refresh", measure);
    const ro = new ResizeObserver(measure);
    ro.observe(document.body);
    return () => {
      cancelAnimationFrame(raf);
      ScrollTrigger.removeEventListener("refresh", measure);
      ro.disconnect();
    };
  }, [pathname]);

  useEffect(() => {
    const host = hostRef.current!;
    const html = document.documentElement;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let disposed = false;
    let instance: import("@/lib/world/World").World | null = null;
    let lastNight = "";

    // The director runs even without WebGL: the DOM palette follows the scenes too.
    const direct = () => {
      const marks = marksRef.current;
      const vh = window.innerHeight;
      const y = window.scrollY;
      if (!marks.length) {
        setScene("quiet");
      } else {
        let a = 0;
        let b = 0;
        let mix = 0;
        for (let k = 0; k < marks.length - 1; k++) {
          const start = marks[k + 1].top - vh * 0.85;
          const end = marks[k + 1].top - vh * 0.15;
          if (y < start) break;
          if (y < end) {
            a = k;
            b = k + 1;
            mix = (y - start) / (end - start);
            break;
          }
          a = b = k + 1;
        }
        setScene(marks[a].id, marks[b].id, mix);
      }
      const night = scenes[world.a].night + (scenes[world.b].night - scenes[world.a].night) * world.mix > 0.5 ? "night" : "day";
      if (night !== lastNight) {
        lastNight = night;
        html.dataset.tone = night;
      }
    };

    const onPointer = (e: PointerEvent) => {
      world.pointer.x = (e.clientX / window.innerWidth) * 2 - 1;
      world.pointer.y = -(e.clientY / window.innerHeight) * 2 + 1;
      if (!reduced) world.pointer.t = performance.now();
    };
    window.addEventListener("pointermove", onPointer, { passive: true });

    let last = performance.now();
    const tick = () => {
      direct();
      const now = performance.now();
      const dt = (now - last) / 1000;
      last = now;
      if (instance && !document.hidden) instance.update(reduced ? Math.min(dt, 1 / 60) : dt);
    };
    gsap.ticker.add(tick);

    const onResize = () => instance?.resize();
    window.addEventListener("resize", onResize);

    (async () => {
      try {
        const { World, pickTier } = await import("@/lib/world/World");
        await document.fonts.ready;
        if (disposed) return;
        instance = new World(host, pickTier());
        // Shape the dust for what's on screen before the first frame.
        direct();
        instance.prepare([...new Set<SceneId>([world.a, world.b, ...marksRef.current.map((m) => m.id)])]);
        html.dataset.world = "on";
      } catch (err) {
        console.warn("[erase] world disabled:", err);
        html.dataset.world = "off";
      }
    })();

    return () => {
      disposed = true;
      gsap.ticker.remove(tick);
      window.removeEventListener("pointermove", onPointer);
      window.removeEventListener("resize", onResize);
      instance?.dispose();
      delete html.dataset.world;
    };
  }, []);

  return <div ref={hostRef} className="world" aria-hidden="true" />;
}
