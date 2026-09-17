"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { gsap, onReveal, SplitText } from "@/lib/gsap";

/**
 * Page-wide entrances, declared in markup:
 *   data-reveal="lines"  headings rise line by line out of a mask
 *   data-reveal="fade"   blocks drift up and in
 * Optional data-delay (seconds). Runs once per element, when it scrolls into view.
 */
export function RevealFx() {
  const pathname = usePathname();

  useEffect(() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const els = [...document.querySelectorAll<HTMLElement>("[data-reveal]")];
    if (reduced) {
      els.forEach((el) => el.classList.add("is-in", "is-split"));
      return;
    }
    const splits: SplitText[] = [];
    let io: IntersectionObserver | undefined;

    const play = (el: HTMLElement) => {
      const delay = parseFloat(el.dataset.delay ?? "0");
      if (el.dataset.reveal === "fade") {
        el.style.setProperty("--delay", `${delay}s`);
        el.classList.add("is-in");
        return;
      }
      const lines = el.querySelectorAll(".reveal-line");
      gsap.fromTo(lines, { yPercent: 110 }, { yPercent: 0, duration: 1.3, stagger: 0.08, delay, ease: "expo.out" });
    };

    const cancel = onReveal(() => {
      document.fonts.ready.then(() => {
        for (const el of els) {
          if (el.dataset.reveal !== "lines" || el.classList.contains("is-split")) continue;
          splits.push(SplitText.create(el, { type: "lines", mask: "lines", linesClass: "reveal-line", autoSplit: false }));
          gsap.set(el.querySelectorAll(".reveal-line"), { yPercent: 110 });
          el.classList.add("is-split");
        }
        io = new IntersectionObserver(
          (entries) => {
            for (const e of entries) {
              if (!e.isIntersecting) continue;
              io!.unobserve(e.target);
              play(e.target as HTMLElement);
            }
          },
          { rootMargin: "0px 0px -10% 0px" },
        );
        els.forEach((el) => io!.observe(el));
      });
    });

    return () => {
      cancel();
      io?.disconnect();
      splits.forEach((s) => s.revert());
      els.forEach((el) => el.classList.remove("is-split", "is-in"));
    };
  }, [pathname]);

  return null;
}
