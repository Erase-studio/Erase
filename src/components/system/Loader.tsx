"use client";

import { useEffect, useRef } from "react";
import { gsap } from "@/lib/gsap";
import { world } from "@/lib/world/store";

declare global {
  interface Window {
    __eraseLoaded?: boolean;
  }
}

/**
 * A counter and a bar while fonts and the world get ready; then the paper lifts
 * and the dust pulls itself together underneath. Repeat visits get a shorter count.
 */
export function Loader() {
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const root = rootRef.current!;
    const html = document.documentElement;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let seen = false;
    try {
      seen = sessionStorage.getItem("erase:seen") === "1";
    } catch {}

    const announce = () => {
      if (window.__eraseLoaded) return;
      window.__eraseLoaded = true;
      html.style.overflow = "";
      window.__lenis?.start();
      try {
        sessionStorage.setItem("erase:seen", "1");
      } catch {}
      window.setTimeout(() => {
        window.dispatchEvent(new Event("erase:loaded"));
        window.dispatchEvent(new Event("erase:reveal"));
      }, 0);
    };

    if (reduced) {
      root.dataset.state = "done";
      root.style.display = "none";
      announce();
      return;
    }

    root.dataset.state = "loading";
    html.style.overflow = "hidden";
    window.__lenis?.stop();
    world.pulse = 1;

    const worldReady = new Promise<void>((resolve) => {
      if (world.ready) return resolve();
      const done = () => {
        world.onReady.delete(done);
        resolve();
      };
      world.onReady.add(done);
      // No WebGL (or very slow): don't hold the page hostage.
      window.setTimeout(done, 6000);
    });
    const ready = Promise.all([document.fonts.ready, worldReady]);

    const count = root.querySelectorAll<HTMLElement>(".loader__digit");
    const bar = root.querySelector<HTMLElement>(".loader__bar i")!;
    const p = { v: 0 };
    const render = () => {
      const s = String(Math.round(p.v)).padStart(3, "0");
      count.forEach((el, i) => (el.textContent = s[i]));
      bar.style.transform = `scaleX(${p.v / 100})`;
    };

    // Counts to 80 on a clock, waits for real readiness, then finishes.
    const first = gsap.to(p, { v: 80, duration: seen ? 0.5 : 1.6, ease: "power2.inOut", onUpdate: render });
    let cancelled = false;
    Promise.all([ready, first.then()]).then(() => {
      if (cancelled) return;
      gsap
        .timeline()
        .to(p, { v: 100, duration: 0.45, ease: "power2.out", onUpdate: render })
        .to(root.querySelectorAll(".loader__count, .loader__bar, .loader__note"), { yPercent: -40, opacity: 0, duration: 0.5, ease: "power3.in" }, "+=0.1")
        .add(announce)
        .to(root, { yPercent: -100, duration: 1.1, ease: "expo.inOut" }, "-=0.15")
        .to(world, { pulse: 0, duration: 2.2, ease: "power2.out" }, "<0.2")
        .add(() => {
          root.dataset.state = "done";
          root.style.display = "none";
        });
    });

    return () => {
      cancelled = true;
      first.kill();
      html.style.overflow = "";
    };
  }, []);

  return (
    <div ref={rootRef} className="loader" data-state="idle" aria-hidden="true">
      <div className="loader__bar">
        <i />
      </div>
      <p className="loader__count">
        <span className="loader__digit">0</span>
        <span className="loader__digit">0</span>
        <span className="loader__digit">0</span>
      </p>
      <p className="loader__note mono">Erasing the template</p>
    </div>
  );
}
