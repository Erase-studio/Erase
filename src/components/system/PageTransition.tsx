"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import { gsap, ScrollTrigger } from "@/lib/gsap";
import { eraserBus } from "@/lib/eraserBus";

type Options = { title?: string; bg?: string; fg?: string; label?: string };
type Ctx = { navigate: (href: string, opts?: Options) => void };

const TransitionContext = createContext<Ctx>({ navigate: () => {} });
export const usePageTransition = () => useContext(TransitionContext);

const cover = (a: number) => `polygon(-50% 0%, ${a}% 0%, ${a - 25}% 100%, -75% 100%)`;
const edgeIn = (a: number) => `polygon(${a - 0.4}% 0%, ${a}% 0%, ${a - 25}% 100%, ${a - 25.4}% 100%)`;
const uncover = (a: number) => `polygon(${a}% 0%, 150% 0%, 150% 100%, ${a - 25}% 100%)`;
const edgeOut = (a: number) => `polygon(${a}% 0%, ${a + 0.4}% 0%, ${a - 24.6}% 100%, ${a - 25}% 100%)`;

/**
 * Route changes are an eraser pass: a band covers the page carrying the logo and
 * the destination's name, the route swaps underneath, and the band rubs itself off.
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
        if (url.hash) document.querySelector(url.hash)?.scrollIntoView();
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
      const edge = root.querySelector<HTMLElement>(".pt__edge")!;
      root.dataset.active = "true";
      window.__lenis?.stop();

      requestAnimationFrame(() => {
        const chars = root.querySelectorAll(".pt-char");
        const a = { v: -25 };
        const tl = gsap.timeline();
        tl.to(a, {
          v: 150,
          duration: 0.85,
          ease: "rub",
          onUpdate: () => {
            panel.style.clipPath = cover(a.v);
            edge.style.clipPath = edgeIn(a.v);
            eraserBus.band(a.v, 1.8);
          },
        })
          .fromTo(
            chars,
            { yPercent: 110, fontStretch: "75%" },
            { yPercent: 0, fontStretch: "112%", duration: 0.9, stagger: 0.025, ease: "expo.out" },
            0.35,
          )
          .fromTo(root.querySelectorAll(".pt__row > *"), { opacity: 0 }, { opacity: 1, duration: 0.4 }, 0.4)
          .add(() => {
            new Promise<void>((resolve) => {
              pending.current = { href: url.pathname + url.search + url.hash, resolve };
              router.push(href, { scroll: false });
            }).then(() => {
              // Land at the top (or the requested chapter), then rub the band off.
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
                const b = { v: -25 };
                window.__erasePT = false;
                window.setTimeout(() => window.dispatchEvent(new Event("erase:reveal")), 350);
                gsap
                  .timeline({
                    onComplete: () => {
                      root.dataset.active = "false";
                      panel.style.clipPath = cover(-25);
                      edge.style.clipPath = cover(-25);
                      busy.current = false;
                      window.__lenis?.start();
                    },
                  })
                  .to(chars, { yPercent: -110, fontStretch: "75%", duration: 0.6, stagger: 0.015, ease: "power3.in" })
                  .to(root.querySelectorAll(".pt__row > *"), { opacity: 0, duration: 0.3 }, 0)
                  .to(
                    b,
                    {
                      v: 150,
                      duration: 1,
                      ease: "rub",
                      onUpdate: () => {
                        panel.style.clipPath = uncover(b.v);
                        edge.style.clipPath = edgeOut(b.v);
                        eraserBus.band(b.v, 1.8);
                      },
                    },
                    0.3,
                  );
              }, 120);
            });
          }, "+=0.15");
      });
    },
    [router],
  );

  // Resolve once the new route has rendered.
  useEffect(() => {
    const p = pending.current;
    if (p && new URL(p.href, window.location.href).pathname === pathname) {
      pending.current = null;
      requestAnimationFrame(() => requestAnimationFrame(p.resolve));
    }
  }, [pathname]);

  const title = opts.title ?? "Erase";
  const words = title.split(" ");

  return (
    <TransitionContext.Provider value={{ navigate }}>
      {children}
      <div
        ref={rootRef}
        className="pt"
        data-active="false"
        aria-hidden="true"
        style={{ "--pt-bg": opts.bg, "--pt-fg": opts.fg } as React.CSSProperties}
      >
        <div className="pt__panel" />
        <div className="pt__edge" />
        <div className="pt__content frame">
          <div className="pt__row">
            <span className="pt__mark">Erase</span>
            <span className="t-label">{opts.label ?? "Loading"}</span>
          </div>
          <p className="pt__title">
            {words.map((wd, i) => (
              <span key={i} className="pt-line">
                {wd.split("").map((c, j) => (
                  <span key={j} className="pt-char">
                    {c}
                  </span>
                ))}
              </span>
            ))}
          </p>
          <span />
        </div>
      </div>
    </TransitionContext.Provider>
  );
}
