"use client";

import { useEffect, useRef } from "react";
import { gsap } from "@/lib/gsap";
import { TransitionLink } from "@/components/system/TransitionLink";
import { Roll } from "@/components/ui/Roll";

/**
 * The world starts as a dark window on the paper, holding the website every agency
 * ships, drawn in dust. Move through it and it tears; scroll and the window opens
 * to the whole screen as the template blows apart.
 */
export function Hero() {
  const rootRef = useRef<HTMLElement>(null);
  const windowRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const root = rootRef.current!;
    const win = windowRef.current!;
    const html = document.documentElement;
    const worldEl = document.querySelector<HTMLElement>(".world");
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const inner = win.querySelectorAll<HTMLElement>("[data-window-in]");

    // How far the window has opened after loading (0 = a line, 1 = the window).
    const open = { v: reduced || window.__eraseLoaded ? 1 : 0 };
    let rect = { t: 0, r: 0, b: 0, l: 0, rad: 0 };
    const measure = () => {
      // The window is pinned, so its box in the viewport doesn't change while it opens.
      const r = win.getBoundingClientRect();
      rect = {
        t: r.top,
        l: r.left,
        r: window.innerWidth - r.right,
        b: window.innerHeight - r.bottom,
        rad: parseFloat(getComputedStyle(win).borderRadius) || 20,
      };
    };
    measure();

    let last = "";
    const tick = () => {
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      const y = window.scrollY;
      // Opens fully over the first 70% of a screen of scroll.
      const s = Math.min(1, Math.max(0, y / (vh * 0.7)));
      const e = s * s * (3 - 2 * s);
      const o = open.v;
      const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
      // Before it opens it's a thin line across the middle.
      const t = lerp(vh / 2 - 1, rect.t, o) * (1 - e);
      const b = lerp(vh / 2 - 1, rect.b, o) * (1 - e);
      const l = lerp(vw * 0.44, rect.l, o) * (1 - e);
      const r = lerp(vw * 0.44, rect.r, o) * (1 - e);
      const rad = rect.rad * (1 - e);
      const clip = s >= 1 ? "none" : `inset(${t.toFixed(1)}px ${r.toFixed(1)}px ${b.toFixed(1)}px ${l.toFixed(1)}px round ${rad.toFixed(1)}px)`;
      if (clip !== last && worldEl) {
        last = clip;
        worldEl.style.clipPath = clip === "none" ? "" : clip;
      }
      html.dataset.window = s < 0.92 ? "true" : "false";
      // The window's own text leaves as it opens.
      const k = Math.min(1, s * 1.8);
      for (const el of inner) {
        el.style.opacity = String((1 - k) * o);
        el.style.transform = `translate3d(0, ${-k * 60}px, 0)`;
      }
      root.style.setProperty("--open", String(e));
    };
    gsap.ticker.add(tick);
    tick();

    const onLoaded = () => {
      gsap.to(open, { v: 1, duration: 1.5, ease: "expo.inOut", delay: 0.15 });
    };
    if (open.v < 1) window.addEventListener("erase:loaded", onLoaded, { once: true });
    window.addEventListener("resize", measure);

    return () => {
      gsap.ticker.remove(tick);
      window.removeEventListener("resize", measure);
      window.removeEventListener("erase:loaded", onLoaded);
      if (worldEl) worldEl.style.clipPath = "";
      delete html.dataset.window;
    };
  }, []);

  return (
    <section ref={rootRef} className="hero" data-scene="template" aria-labelledby="hero-title">
      <div className="hero__pin">
        <div ref={windowRef} className="hero__window">
          <div className="hero__top" data-window-in>
            <p className="mono">The template</p>
            <p className="mono hero__hint">
              <span className="hero__hint-dot" aria-hidden="true" />
              Move through it
            </p>
          </div>
          <div className="hero__bottom" data-window-in>
            <h1 id="hero-title" className="h1 hero__title" data-reveal="lines" data-delay="0.9">
              We turn templates
              <br />
              to dust.
            </h1>
            <div className="hero__side" data-reveal="fade" data-delay="1.2">
              <p>An independent design &amp; development studio. We build the website only your brand could have.</p>
              <TransitionLink href="/contact" title="Contact" className="pill pill--solid">
                <Roll>Start a project</Roll>
                <i className="pill__dot" aria-hidden="true" />
              </TransitionLink>
            </div>
          </div>
        </div>
        <div className="hero__marks marks mono" aria-hidden="true">
          <i />
          <span>Scroll to erase</span>
          <i />
        </div>
      </div>
    </section>
  );
}
