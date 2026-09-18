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
 * Route changes: a graphite sheet rises with the destination's name, the route
 * swaps underneath, and the sheet carries on up and out.
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
      sound.whoosh(1, 0.9);
      setOpts(o);
      const root = rootRef.current!;
      const panel = root.querySelector<HTMLElement>(".pt__panel")!;
      root.dataset.active = "true";
      window.__lenis?.stop();

      requestAnimationFrame(() => {
        const chars = root.querySelectorAll(".pt__label span");
        gsap
          .timeline()
          .fromTo(panel, { yPercent: 101, borderRadius: "var(--radius) var(--radius) 0 0" }, { yPercent: 0, borderRadius: 0, duration: 0.9, ease: "expo.inOut" }, 0)
          .fromTo(chars, { yPercent: 105 }, { yPercent: 0, duration: 0.8, stagger: 0.02, ease: "expo.out" }, 0.45)
          .add(() => {
            new Promise<void>((resolve) => {
              pending.current = { href: url.pathname, resolve };
              router.push(href, { scroll: false });
            }).then(() => {
              window.__lenis?.scrollTo(0, { immediate: true, force: true });
              window.scrollTo(0, 0);
              window.setTimeout(() => {
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
                gsap
                  .timeline({
                    onComplete: () => {
                      root.dataset.active = "false";
                      busy.current = false;
                      window.__lenis?.start();
                    },
                  })
                  .to(chars, { yPercent: -105, duration: 0.5, stagger: 0.012, ease: "power3.in" }, 0)
                  .to(panel, { yPercent: -101, borderRadius: "0 0 var(--radius) var(--radius)", duration: 1, ease: "expo.inOut" }, 0.15);
              }, 80);
            });
          }, "+=0.1");
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
          <p className="pt__label">
            {title.split("").map((c, i) => (
              <span key={i}>{c}</span>
            ))}
          </p>
          <div className="pt__meta marks mono">
            <i />
            <span>{opts.label ?? "Erase"}</span>
            <i />
          </div>
        </div>
      </div>
    </TransitionContext.Provider>
  );
}
