"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { gsap, onReveal, ScrollTrigger, SplitText } from "@/lib/gsap";

/**
 * Site-wide scroll grammar, declared in markup:
 * - [data-reveal] headings (.reveal-line > span) write in letter by letter: each
 *   character rises and widens on the width axis, like a pencil pressing harder.
 * - Labels inside [data-reveal] scramble into place.
 * - [data-wipe] chapters arrive with a slanted top edge that flattens as they rise.
 * - Big type leans with scroll velocity, and settles when you stop.
 */
export function ChapterFx() {
  const pathname = usePathname();

  useEffect(() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) return;

    const ctx = gsap.context(() => {});
    const splits: SplitText[] = [];

    const build = () =>
      ctx.add(() => {
        gsap.utils.toArray<HTMLElement>("[data-reveal]").forEach((group) => {
          const lines = Array.from(group.querySelectorAll<HTMLElement>(".reveal-line > span"));
          const fades = group.querySelectorAll("[data-fade]");
          const labels = Array.from(group.querySelectorAll<HTMLElement>(".t-label[data-fade]"));

          const chars: Element[] = [];
          lines.forEach((line) => {
            gsap.set(line, { y: 0, yPercent: 0 });
            // Words keep lines from breaking mid-word; chars carry the motion.
            const split = SplitText.create(line, { type: "words,chars", wordsClass: "fx-word", charsClass: "fx-char" });
            splits.push(split);
            chars.push(...split.chars);
          });
          const tl = gsap.timeline({
            // Play-only instead of once:true. A once-trigger kills itself during
            // refresh when the page is already scrolled past it, which corrupts
            // ScrollTrigger's list while other triggers are still being created.
            scrollTrigger: { trigger: group, start: "top 86%", toggleActions: "play none none none" },
          });
          if (chars.length) {
            gsap.set(chars, { yPercent: 118, rotate: 7, fontStretch: "75%", transformOrigin: "0% 100%" });
            tl.to(chars, {
              yPercent: 0,
              rotate: 0,
              fontStretch: "100%",
              duration: 1.25,
              stagger: { each: 0.018 },
              ease: "expo.out",
              clearProps: "fontStretch",
            });
          }
          if (fades.length)
            tl.fromTo(
              fades,
              { opacity: 0, y: 18 },
              { opacity: 1, y: 0, duration: 1, stagger: 0.06, ease: "expo.out" },
              0.15,
            );
          labels.forEach((label) => {
            const text = label.textContent ?? "";
            tl.to(label, { duration: 0.9, scrambleText: { text, chars: "▮▯/\\_—01", speed: 0.5 }, ease: "none" }, 0.1);
          });
        });

        gsap.utils.toArray<HTMLElement>("[data-wipe]").forEach((el) => {
          gsap.fromTo(
            el,
            { clipPath: "polygon(0% 18vh, 100% 0%, 100% 100%, 0% 100%)" },
            {
              clipPath: "polygon(0% 0vh, 100% 0%, 100% 100%, 0% 100%)",
              ease: "none",
              scrollTrigger: { trigger: el, start: "top bottom", end: "top 30%", scrub: true },
            },
          );
        });

        // Velocity lean on big type.
        const leaners = gsap.utils.toArray<HTMLElement>(".t-h2, .t-mega, .sheet__title, .cs-quote__text");
        if (leaners.length) {
          const proxy = { skew: 0 };
          const setSkew = gsap.quickSetter(leaners, "skewY", "deg");
          ScrollTrigger.create({
            start: 0,
            end: "max",
            onUpdate: (self) => {
              const skew = gsap.utils.clamp(-4, 4, self.getVelocity() / -400);
              if (Math.abs(skew) > Math.abs(proxy.skew)) {
                proxy.skew = skew;
                gsap.to(proxy, {
                  skew: 0,
                  duration: 0.8,
                  ease: "power3",
                  overwrite: true,
                  onUpdate: () => setSkew(proxy.skew),
                });
              }
            },
          });
        }
      });

    let cancel = () => {};
    // Wait a frame so a freshly routed page has rendered and pinned first.
    const raf = requestAnimationFrame(() => {
      cancel = onReveal(() => {
        build();
        ScrollTrigger.refresh();
      });
    });
    document.fonts?.ready.then(() => ScrollTrigger.refresh());

    return () => {
      cancelAnimationFrame(raf);
      cancel();
      ctx.revert();
      splits.forEach((s) => s.revert());
    };
  }, [pathname]);

  return null;
}
