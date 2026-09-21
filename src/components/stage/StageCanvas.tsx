"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { gsap, ScrollTrigger } from "@/lib/gsap";
import { stage as signals } from "@/lib/stage/store";
import type { Stage, View } from "@/lib/stage/Stage";
import type { LineView } from "@/lib/stage/LineView";

/**
 * The single WebGL canvas over the page.
 *
 * Nothing 3D is fetched until a box that wants it is nearly on screen. Each
 * [data-view] element (and the pencil line's data-line anchors) opens its own
 * module the first time it comes within two and a half screens, so a page that
 * only has a footer scribble never pays for the dive, and the first second of
 * every visit belongs to the type rather than to three.js.
 */

/** One importer per kind of box. Called at most once each, and only when needed. */
const VIEWS = {
  hero: () => import("@/lib/stage/HeroView"),
  crumple: () => import("@/lib/stage/CrumpleView"),
  stack: () => import("@/lib/stage/StackView"),
  dive: () => import("@/lib/stage/DiveView"),
  suite: () => import("@/lib/stage/SuiteView"),
} as const;

type Kind = keyof typeof VIEWS;

/**
 * Devices that would rather have the words. We only bow out where WebGL would
 * genuinely hurt — no WebGL at all, almost no memory, or data saver on — and
 * the page falls back to its printed version (see html[data-stage="off"]).
 */
function capable() {
  const n = navigator as Navigator & { deviceMemory?: number; connection?: { saveData?: boolean } };
  if (n.connection?.saveData) return false;
  if (typeof n.deviceMemory === "number" && n.deviceMemory <= 2) return false;
  try {
    const c = document.createElement("canvas");
    return !!(c.getContext("webgl2") || c.getContext("webgl"));
  } catch {
    return false;
  }
}

export function StageCanvas() {
  const hostRef = useRef<HTMLDivElement>(null);
  const pathname = usePathname();
  const ref = useRef<{
    stage: Stage | null;
    line: LineView | null;
    views: Map<HTMLElement, View>;
    watch: IntersectionObserver | null;
    tick: (() => void) | null;
  } | null>(null);
  const bindRef = useRef<() => void>(() => {});

  useEffect(() => {
    const host = hostRef.current!;
    const html = document.documentElement;
    const self = { stage: null as Stage | null, line: null as LineView | null, views: new Map<HTMLElement, View>(), watch: null as IntersectionObserver | null, tick: null as (() => void) | null };
    ref.current = self;
    let disposed = false;

    // Tell the page it can stop holding its breath. The loader waits on this,
    // and the fallbacks key off it, so it must not wait for a first frame.
    const on = capable();
    html.dataset.stage = on ? "on" : "off";
    signals.ready = true;
    signals.onReady.forEach((f) => f());
    if (!on) return;

    /**
     * While the loading screen is up it owns the graphics card — it has a
     * renderer and a character of its own, and nothing behind it is visible
     * anyway. So the site's stage waits for the page to open before it starts
     * building, rather than racing the thing the visitor is actually watching.
     */
    const opened = window.__eraseLoaded
      ? Promise.resolve()
      : new Promise<void>((go) => {
          window.addEventListener("erase:loaded", () => go(), { once: true });
          window.setTimeout(go, 6000); // in case the loader never gets there
        });

    /** The renderer, made once, the first time anything actually needs it. */
    let booting: Promise<Stage | null> | null = null;
    const ensureStage = () => {
      if (self.stage) return Promise.resolve(self.stage);
      booting ??= (async () => {
        try {
          const [{ Stage }] = await Promise.all([import("@/lib/stage/Stage"), document.fonts.ready, opened]);
          if (disposed) return null;
          const stage = new Stage(host);
          self.stage = stage;
          let last = performance.now();
          self.tick = () => {
            const now = performance.now();
            const dt = (now - last) / 1000;
            last = now;
            // Nothing bound yet means nothing to clear or draw.
            if (!document.hidden && (self.line || self.views.size)) stage.frame(dt);
          };
          gsap.ticker.add(self.tick);
          return stage;
        } catch (err) {
          console.warn("[erase] 3D disabled:", err);
          html.dataset.stage = "off";
          return null;
        }
      })();
      return booting;
    };

    /** Build the view a box asked for, once it is nearly on screen. */
    const mount = async (el: HTMLElement) => {
      const kind = el.dataset.view as Kind | undefined;
      if (!kind || !VIEWS[kind] || self.views.has(el)) return;
      // Claim the slot straight away so a second intersection can't double-build.
      self.views.set(el, null as unknown as View);
      const [mod, stage] = await Promise.all([VIEWS[kind](), ensureStage()]);
      if (disposed || !stage || !el.isConnected) {
        self.views.delete(el);
        return;
      }
      const slot = el.querySelector<HTMLElement>("[data-slot]") ?? el;
      const loaded = !!window.__eraseLoaded;
      let v: View;
      switch (kind) {
        case "hero":
          v = new (mod as typeof import("@/lib/stage/HeroView")).HeroView(el, stage.shared, { startNow: loaded });
          break;
        case "crumple":
          v = new (mod as typeof import("@/lib/stage/CrumpleView")).CrumpleView(el, slot, stage.shared);
          break;
        case "stack": {
          const sv = new (mod as typeof import("@/lib/stage/StackView")).StackView(el, slot, (el.dataset.slugs ?? "").split(","), stage.shared);
          sv.onActive = (i) => el.dispatchEvent(new CustomEvent("stack:active", { detail: i, bubbles: true }));
          v = sv;
          break;
        }
        case "dive":
          v = new (mod as typeof import("@/lib/stage/DiveView")).DiveView(el, stage.shared);
          break;
        case "suite": {
          const sv = new (mod as typeof import("@/lib/stage/SuiteView")).SuiteView(el, stage.shared);
          // The list beside it says which row the pointer is on.
          el.addEventListener("suite:hot", (e) => sv.setHot((e as CustomEvent<number>).detail));
          v = sv;
          break;
        }
      }
      self.views.set(el, v);
      stage.add(v);
      if (loaded) (v as { start?: () => void }).start?.();
    };

    /** The pencil line is one view for the whole document, built with the first mark. */
    let lining = false;
    const mountLine = async () => {
      if (self.line || lining) return;
      lining = true;
      const [mod, stage] = await Promise.all([import("@/lib/stage/LineView"), ensureStage()]);
      if (disposed || !stage) return;
      const line = new mod.LineView(document.body, stage.shared);
      self.line = line;
      stage.add(line);
      line.measure(true);
      window.setTimeout(() => ref.current?.line?.measure(), 600);
    };

    // Everything mounts on approach: two and a half screens of warning is enough
    // for the module to arrive and the shaders to compile before you see it.
    const watch = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (!e.isIntersecting) continue;
          watch.unobserve(e.target);
          const el = e.target as HTMLElement;
          if (el.dataset.view) void mount(el);
          else void mountLine();
        }
      },
      { rootMargin: "250% 0px" },
    );
    self.watch = watch;

    /**
     * Scrolling is the worst moment to build a scene — every texture a view
     * draws is a frame someone doesn't get. So once the page has opened and the
     * visitor is reading rather than moving, the rest of the page's views are
     * built one at a time in the gaps between frames, in the order they'll be
     * met. By the time anything is scrolled to, it is usually already there.
     */
    const idle = (window.requestIdleCallback ?? ((fn: () => void) => window.setTimeout(fn, 200))) as (fn: () => void, o?: { timeout: number }) => number;
    let queued = false;
    const warmRest = () => {
      if (queued || disposed) return;
      queued = true;
      const next = () => {
        if (disposed) return;
        const el = [...document.querySelectorAll<HTMLElement>("[data-view]")].find((e) => !self.views.has(e));
        const mark = self.line ? null : document.querySelector<HTMLElement>("[data-line]");
        if (!el && !mark) {
          queued = false;
          return;
        }
        const job = el ? mount(el) : mountLine();
        if (el) watch.unobserve(el);
        void job.then(() => idle(next, { timeout: 4000 }));
      };
      idle(next, { timeout: 4000 });
    };

    const bind = () => {
      if (disposed) return;
      // Drop views whose boxes left with the last page.
      for (const [el, v] of self.views) {
        if (!el.isConnected) {
          if (v) self.stage?.remove(v);
          self.views.delete(el);
        }
      }
      document.querySelectorAll<HTMLElement>("[data-view]").forEach((el) => {
        if (!self.views.has(el)) watch.observe(el);
      });
      const mark = document.querySelector<HTMLElement>("[data-line]");
      if (mark) {
        if (self.line) self.line.measure(true);
        else watch.observe(mark);
      }
      if (window.__eraseLoaded) warmRest();
    };
    bindRef.current = bind;

    const loaded = () => {
      self.views.forEach((v) => (v as { start?: () => void })?.start?.());
      warmRest();
    };
    const onResize = () => {
      self.stage?.resize();
      self.line?.measure();
    };
    const onRefresh = () => self.line?.measure();
    window.addEventListener("resize", onResize);
    window.addEventListener("erase:loaded", loaded);
    ScrollTrigger.addEventListener("refresh", onRefresh);

    return () => {
      disposed = true;
      watch.disconnect();
      if (self.tick) gsap.ticker.remove(self.tick);
      window.removeEventListener("resize", onResize);
      window.removeEventListener("erase:loaded", loaded);
      ScrollTrigger.removeEventListener("refresh", onRefresh);
      self.stage?.dispose();
      ref.current = null;
      delete html.dataset.stage;
    };
  }, []);

  // Watch the boxes the new route brought with it.
  useEffect(() => {
    const raf = requestAnimationFrame(() => bindRef.current());
    return () => cancelAnimationFrame(raf);
  }, [pathname]);

  return <div ref={hostRef} className="stage" aria-hidden="true" />;
}
