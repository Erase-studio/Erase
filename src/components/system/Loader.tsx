"use client";

import { useEffect, useRef } from "react";
import { gsap } from "@/lib/gsap";
import { eraserBus } from "@/lib/eraserBus";

declare global {
  interface Window {
    __eraseLoaded?: boolean;
  }
}

// What the average website is doing while it loads.
const STATUSES = [
  "Loading stock photography",
  "Adding a gradient blob",
  "Centering the headline",
  "Writing “digital experiences”",
  "Picking a trendy font",
  "Almost average",
];

const band = (a: number) => `polygon(${a}% 0%, 150% 0%, 150% 100%, ${a - 25}% 100%)`;
const edge = (a: number) => `polygon(${a}% 0%, ${a + 0.35}% 0%, ${a - 24.65}% 100%, ${a - 25}% 100%)`;

export function Loader() {
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const root = rootRef.current!;
    const html = document.documentElement;
    const $ = <T extends Element = HTMLElement>(s: string) => root.querySelector<T & HTMLElement>(s)!;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const isHome = window.location.pathname === "/";
    let seen = false;
    try {
      seen = sessionStorage.getItem("erase:seen") === "1";
    } catch {}

    const lenis = window.__lenis;
    lenis?.stop();
    html.style.overflow = "hidden";

    const ready = Promise.all([
      document.fonts?.ready ?? Promise.resolve(),
      document.readyState === "complete"
        ? Promise.resolve()
        : new Promise((r) => window.addEventListener("load", r, { once: true })),
    ]);

    const announce = () => {
      window.__eraseLoaded = true;
      html.style.overflow = "";
      window.__lenis?.start();
      window.setTimeout(() => {
        window.dispatchEvent(new Event("erase:loaded"));
        window.dispatchEvent(new Event("erase:reveal"));
      }, 0);
    };

    const finish = () => {
      html.dataset.loaded = "true";
      root.dataset.state = "done";
    };

    if (reduced) {
      ready.then(() => {
        announce();
        finish();
      });
      return;
    }

    const digits = Array.from(root.querySelectorAll<HTMLElement>(".loader__digit > span"));
    const line = $(".loader__line i");
    const status = $(".loader__status");
    const word = $(".loader__word");
    const chars = root.querySelectorAll(".loader__char");
    const panel = $(".loader__panel");
    const edgeEl = $(".loader__edge");
    const meta = root.querySelectorAll(".loader__meta");

    const p = { v: 0 };
    const render = () => {
      const n = Math.round(p.v * 100);
      const parts = [Math.floor(n / 100), Math.floor(n / 10) % 10, n % 10];
      digits.forEach((d, i) => (d.style.transform = `translateY(${-parts[i] * 10}%)`));
      line.style.transform = `scaleX(${p.v})`;
    };

    const ctx = gsap.context(() => {
      // Write the wordmark in: each letter rises and widens, like a pencil pressing harder.
      gsap.fromTo(
        chars,
        { y: 0, yPercent: 105, fontStretch: "75%" },
        { y: 0, yPercent: 0, fontStretch: "112%", duration: 1.3, stagger: 0.07, ease: "expo.out", delay: 0.15 },
      );
      gsap.fromTo(meta, { opacity: 0 }, { opacity: 1, duration: 0.8, stagger: 0.08, delay: 0.3 });

      let si = 0;
      const statusTimer = window.setInterval(() => {
        si = (si + 1) % STATUSES.length;
        gsap.to(status, {
          duration: 0.5,
          scrambleText: { text: STATUSES[si], chars: "▮▯/\\_—01", speed: 0.6 },
          ease: "none",
        });
      }, seen ? 260 : 420);

      const minDur = seen ? 0.9 : 2.3;
      const count = gsap.to(p, { v: 0.84, duration: minDur, ease: "power2.inOut", onUpdate: render });

      Promise.all([ready, count.then()]).then(() => {
        window.clearInterval(statusTimer);
        const tl = gsap.timeline();
        tl.to(p, { v: 1, duration: 0.45, ease: "power3.out", onUpdate: render })
          .to(status, {
            duration: 0.45,
            scrambleText: { text: isHome && !seen ? "Done. Now erase it." : "Done.", chars: "▮▯/\\_", speed: 0.8 },
            ease: "none",
          }, "<")
          .to(meta, { opacity: 0, duration: 0.4, stagger: 0.04 }, "+=0.25")
          .add(() => {
            // Logo transition: the wordmark flies into the nav and becomes the logo.
            const target = document.querySelector<HTMLElement>(".nav__mark-word");
            const from = word.getBoundingClientRect();
            const scale = target ? target.getBoundingClientRect().height / from.height : 0.1;
            const to = target?.getBoundingClientRect();
            const flight = gsap.timeline();
            flight.to(word, {
              x: to ? to.left - from.left : -from.left,
              y: to ? to.top + to.height / 2 - (from.top + from.height / 2) : -from.top,
              scale,
              duration: 1.1,
              ease: "rub",
            });
            flight.to(chars, { fontStretch: "118%", duration: 1.1, ease: "rub" }, 0);
            flight.add(finish, 1.1);

            const a = { v: -25 };
            flight.to(
              a,
              {
                v: 150,
                duration: 1.15,
                ease: "rub",
                onStart: announce,
                onUpdate: () => {
                  panel.style.clipPath = band(a.v);
                  edgeEl.style.clipPath = edge(a.v);
                  eraserBus.band(a.v, 1.8);
                },
              },
              0.12,
            );
          });
      });

      return () => window.clearInterval(statusTimer);
    }, root);

    return () => ctx.revert();
  }, []);

  const letters = "Erase".split("");

  return (
    <div ref={rootRef} className="loader" data-state="loading" aria-hidden="true">
      <div className="loader__panel" />
      <div className="loader__edge" />
      <div className="loader__top frame">
        <span />
        <span className="t-label loader__meta loader__status">{STATUSES[0]}</span>
      </div>
      <div className="loader__center frame">
        <div className="loader__word">
          {letters.map((c, i) => (
            <span key={i} className="loader__mask">
              <span className="loader__char">{c}</span>
            </span>
          ))}
        </div>
        <div className="loader__line loader__meta">
          <i />
        </div>
      </div>
      <div className="loader__bottom frame">
        <span />
        <span className="loader__count loader__meta">
          {[0, 1, 2].map((col) => (
            <span key={col} className="loader__digit">
              <span>
                {Array.from({ length: 10 }, (_, d) => (
                  <b key={d}>{d}</b>
                ))}
              </span>
            </span>
          ))}
          <em>%</em>
        </span>
      </div>
    </div>
  );
}
