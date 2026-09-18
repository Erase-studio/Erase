"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { gsap, ScrollTrigger } from "@/lib/gsap";
import { stage as signals } from "@/lib/stage/store";
import type { Stage, View } from "@/lib/stage/Stage";
import type { LineView } from "@/lib/stage/LineView";

type Mod = {
  Stage: typeof import("@/lib/stage/Stage").Stage;
  HeroView: typeof import("@/lib/stage/HeroView").HeroView;
  LineView: typeof import("@/lib/stage/LineView").LineView;
  CrumpleView: typeof import("@/lib/stage/CrumpleView").CrumpleView;
  StackView: typeof import("@/lib/stage/StackView").StackView;
  DiveView: typeof import("@/lib/stage/DiveView").DiveView;
};

/**
 * The single WebGL canvas over the page. On every route it looks for boxes that
 * want 3D (data-view="hero" | "crumple" | "stack" | "dive") and for the pencil line's
 * anchors (data-line), and binds a view to each.
 */
export function StageCanvas() {
  const hostRef = useRef<HTMLDivElement>(null);
  const pathname = usePathname();
  const ref = useRef<{ stage: Stage; mod: Mod; line: LineView; views: View[] } | null>(null);
  const bindRef = useRef<() => void>(() => {});

  useEffect(() => {
    const host = hostRef.current!;
    const html = document.documentElement;
    let disposed = false;
    let tick: (() => void) | null = null;
    const loaded = () => ref.current?.views.forEach((v) => (v as { start?: () => void }).start?.());

    (async () => {
      try {
        const [S, H, L, C, K, D] = await Promise.all([
          import("@/lib/stage/Stage"),
          import("@/lib/stage/HeroView"),
          import("@/lib/stage/LineView"),
          import("@/lib/stage/CrumpleView"),
          import("@/lib/stage/StackView"),
          import("@/lib/stage/DiveView"),
        ]);
        await document.fonts.ready;
        if (disposed) return;
        const mod: Mod = { Stage: S.Stage, HeroView: H.HeroView, LineView: L.LineView, CrumpleView: C.CrumpleView, StackView: K.StackView, DiveView: D.DiveView };
        const stage = new mod.Stage(host);
        const line = new mod.LineView(document.body, stage.shared);
        stage.add(line);
        ref.current = { stage, mod, line, views: [] };
        bindRef.current();
        let last = performance.now();
        let first = true;
        tick = () => {
          const now = performance.now();
          const dt = (now - last) / 1000;
          last = now;
          if (document.hidden) return;
          stage.frame(dt);
          if (first) {
            first = false;
            html.dataset.stage = "on";
            signals.ready = true;
            signals.onReady.forEach((f) => f());
          }
        };
        gsap.ticker.add(tick);
      } catch (err) {
        console.warn("[erase] 3D disabled:", err);
        html.dataset.stage = "off";
        signals.ready = true;
        signals.onReady.forEach((f) => f());
      }
    })();

    const onResize = () => {
      ref.current?.stage.resize();
      ref.current?.line.measure();
    };
    const onRefresh = () => ref.current?.line.measure();
    window.addEventListener("resize", onResize);
    window.addEventListener("erase:loaded", loaded);
    ScrollTrigger.addEventListener("refresh", onRefresh);

    return () => {
      disposed = true;
      if (tick) gsap.ticker.remove(tick);
      window.removeEventListener("resize", onResize);
      window.removeEventListener("erase:loaded", loaded);
      ScrollTrigger.removeEventListener("refresh", onRefresh);
      ref.current?.stage.dispose();
      ref.current = null;
      delete html.dataset.stage;
    };
  }, []);

  // Bind views for the current route.
  useEffect(() => {
    const bind = () => {
      const r = ref.current;
      if (!r) return;
      r.views.forEach((v) => r.stage.remove(v));
      r.views = [];
      const { mod, stage } = r;
      const loaded = !!window.__eraseLoaded;
      document.querySelectorAll<HTMLElement>("[data-view]").forEach((el) => {
        let v: View | null = null;
        const slot = el.querySelector<HTMLElement>("[data-slot]") ?? el;
        switch (el.dataset.view) {
          case "hero":
            v = new mod.HeroView(el, stage.shared, { startNow: loaded });
            break;
          case "crumple":
            v = new mod.CrumpleView(el, slot, stage.shared);
            break;
          case "stack": {
            const sv = new mod.StackView(el, slot, (el.dataset.slugs ?? "").split(","), stage.shared);
            sv.onActive = (i) => el.dispatchEvent(new CustomEvent("stack:active", { detail: i, bubbles: true }));
            v = sv;
            break;
          }
          case "dive":
            v = new mod.DiveView(el, stage.shared);
            break;
        }
        if (v) {
          stage.add(v);
          r.views.push(v);
        }
      });
      r.line.measure(true);
      // Layout settles after fonts and reveals; measure the line again then.
      window.setTimeout(() => ref.current?.line.measure(), 600);
    };
    bindRef.current = bind;
    const raf = requestAnimationFrame(bind);
    return () => cancelAnimationFrame(raf);
  }, [pathname]);

  return <div ref={hostRef} className="stage" aria-hidden="true" />;
}
