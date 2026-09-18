"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import { gsap, ScrollTrigger } from "@/lib/gsap";
import { sound } from "@/lib/sound";

type Options = { title?: string; label?: string };
type Ctx = { navigate: (href: string, opts?: Options) => void };

const TransitionContext = createContext<Ctx>({ navigate: () => {} });
export const usePageTransition = () => useContext(TransitionContext);

/**
 * Route changes: the eraser sweeps across and rubs the page away (the sheet
 * behind it is the page's own paper), the destination's name shows for a beat
 * while the route swaps, then a second sweep rubs that away to the new page.
 */
export function PageTransition({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const rootRef = useRef<HTMLDivElement>(null);
  const [opts, setOpts] = useState<Options>({});
  const pending = useRef<{ href: string; resolve: () => void } | null>(null);
  const busy = useRef(false);

  const navigate = useCallback(
    (href: string, o: Options = {}) => {
      if (busy.current) return;
      const url = new URL(href, window.location.href);
      const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      if (url.pathname === window.location.pathname) {
        const el = url.hash ? document.querySelector<HTMLElement>(url.hash) : null;
        if (window.__lenis) window.__lenis.scrollTo(el ?? 0, { duration: 1.4 });
        else (el ?? document.body).scrollIntoView({ behavior: reduced ? "auto" : "smooth" });
        return;
      }
      if (reduced) {
        router.push(href);
        return;
      }
      busy.current = true;
      window.__erasePT = true;
      setOpts(o);
      const root = rootRef.current!;
      const panel = root.querySelector<HTMLElement>(".pt__panel")!;
      const tool = root.querySelector<HTMLElement>(".pt__tool")!;
      const label = root.querySelector<HTMLElement>(".pt__label")!;
      root.dataset.active = "true";
      window.__lenis?.stop();

      // One sweep of the eraser across the screen. "in" wipes the page away
      // behind it (the panel is the page's own paper); "out" wipes the panel off.
      const sweep = (dir: "in" | "out", duration: number) =>
        new Promise<void>((resolve) => {
          const W = window.innerWidth;
          const H = window.innerHeight;
          const s = { p: 0 };
          let lastX = -1;
          let lastT = performance.now();
          gsap.to(s, {
            p: 1,
            duration,
            ease: "power2.inOut",
            onUpdate: () => {
              const x = s.p * (W + 360) - 180;
              panel.style.clipPath = dir === "in" ? `inset(0 ${Math.max(0, W - x)}px 0 0)` : `inset(0 0 0 ${Math.max(0, x)}px)`;
              const y = H * (0.5 + Math.sin(s.p * Math.PI * 2.5) * 0.27);
              tool.style.transform = `translate3d(${x}px, ${y}px, 0) rotate(${-1.1 + Math.cos(s.p * Math.PI * 2.5) * 0.3}rad)`;
              const now = performance.now();
              if (lastX >= 0) sound.rub(Math.abs(x - lastX) / Math.max(1, now - lastT) * 700, 1);
              lastX = x;
              lastT = now;
            },
            onComplete: () => resolve(),
          });
        });

      requestAnimationFrame(async () => {
        tool.style.opacity = "1";
        label.style.opacity = "0";
        await sweep("in", 0.62);
        tool.style.opacity = "0";
        gsap.fromTo(label, { opacity: 0, y: 14 }, { opacity: 1, y: 0, duration: 0.35, ease: "power2.out" });
        await new Promise<void>((resolve) => {
          pending.current = { href: url.pathname, resolve };
          router.push(href, { scroll: false });
        });
        window.__lenis?.scrollTo(0, { immediate: true, force: true });
        window.scrollTo(0, 0);
        await new Promise((r) => window.setTimeout(r, 120));
        ScrollTrigger.refresh();
        if (url.hash) {
          const el = document.querySelector<HTMLElement>(url.hash);
          if (el) {
            const y = el.getBoundingClientRect().top + window.scrollY;
            window.__lenis?.scrollTo(y, { immediate: true, force: true });
            window.scrollTo(0, y);
          }
        }
        window.__erasePT = false;
        window.dispatchEvent(new Event("erase:reveal"));
        gsap.to(label, { opacity: 0, duration: 0.2 });
        tool.style.opacity = "1";
        await sweep("out", 0.66);
        tool.style.opacity = "0";
        panel.style.clipPath = "";
        root.dataset.active = "false";
        busy.current = false;
        window.__lenis?.start();
      });
    },
    [router],
  );

  useEffect(() => {
    const p = pending.current;
    if (p && p.href === pathname) {
      pending.current = null;
      requestAnimationFrame(() => requestAnimationFrame(p.resolve));
    }
  }, [pathname]);

  const title = opts.title ?? "Erase";

  return (
    <TransitionContext.Provider value={{ navigate }}>
      {children}
      <div ref={rootRef} className="pt" data-active="false" aria-hidden="true">
        <div className="pt__panel">
          <div className="pt__label">
            <p className="mono muted">{opts.label ?? "Erase"}</p>
            <p className="pt__title">{title}</p>
          </div>
        </div>
        <div className="pt__tool">
          <i />
          <b>Erase</b>
        </div>
      </div>
    </TransitionContext.Provider>
  );
}
