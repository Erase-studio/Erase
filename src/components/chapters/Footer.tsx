"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { founders, navLinks, site } from "@/content/site";
import { work } from "@/content/work";
import { gsap, ScrollTrigger } from "@/lib/gsap";
import { eraserBus } from "@/lib/eraserBus";
import { Magnetic } from "@/components/ui/Magnetic";
import { scrollToTarget } from "@/components/system/SmoothScroll";
import { TransitionLink } from "@/components/system/TransitionLink";
import { usePageTransition } from "@/components/system/PageTransition";

/** The page lifts away; the blue layer is underneath, and the eraser comes to rest on the wordmark. */
export function Footer() {
  const rootRef = useRef<HTMLElement>(null);
  const pathname = usePathname();
  const { navigate } = usePageTransition();
  const social = site.social.filter((s) => s.href);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const mm = gsap.matchMedia();
    mm.add("(prefers-reduced-motion: no-preference)", () => {
      const letters = root.querySelectorAll(".curtain__mark span");
      gsap.fromTo(
        letters,
        { yPercent: 80, fontStretch: "75%", rotate: (i) => (i % 2 ? 8 : -8) },
        {
          yPercent: 0,
          fontStretch: "125%",
          rotate: 0,
          stagger: 0.06,
          ease: "none",
          scrollTrigger: { trigger: root, start: "top bottom", end: "bottom bottom", scrub: 0.6 },
        },
      );
      gsap.fromTo(
        root.querySelector(".curtain__content"),
        { yPercent: 40, opacity: 0 },
        {
          yPercent: 0,
          opacity: 1,
          ease: "none",
          scrollTrigger: { trigger: root, start: "top bottom", end: "bottom bottom", scrub: true },
        },
      );

      // Once the footer is fully out, the eraser drops in and rests on the last letter.
      let raf = 0;
      const rest = (t: number) => {
        raf = requestAnimationFrame(rest);
        const letter = root.querySelector(".curtain__mark span:nth-child(4)")!.getBoundingClientRect();
        eraserBus.point(letter.left + letter.width * 0.3, letter.top + letter.height * 0.3 + Math.sin(t * 0.0015) * 6, 0, 1.2);
      };
      const st = ScrollTrigger.create({
        trigger: root,
        start: "bottom bottom+=40",
        end: "bottom top",
        onToggle: (self) => {
          cancelAnimationFrame(raf);
          if (self.isActive) raf = requestAnimationFrame(rest);
        },
      });
      return () => {
        cancelAnimationFrame(raf);
        st.kill();
      };
    });
    return () => mm.revert();
  }, [pathname]);

  const restore = () => {
    try {
      sessionStorage.removeItem("erase:seen");
    } catch {}
    document.documentElement.classList.remove("intro-skip");
    if (pathname !== "/") {
      navigate("/", { title: "Agency®", label: "Putting it back" });
      return;
    }
    scrollToTarget(0);
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    window.setTimeout(
      () => window.dispatchEvent(new Event("erase:restore")),
      reduced || !window.__lenis ? 50 : 1300,
    );
  };

  // Case studies end by erasing into the next project, so there is no footer to reach.
  if (pathname.startsWith("/work/")) return null;

  return (
    <footer ref={rootRef} className="curtain" data-chapter="footer" data-chapter-index="∎" data-chapter-label="Erase" data-theme="light">
      <div className="curtain__inner frame">
        <div className="curtain__content">
          <Magnetic strength={0.12}>
            <a href={`mailto:${site.email}`} className="curtain__mail" data-cursor-label="Email">
              {site.email}
              <span aria-hidden="true">↗</span>
            </a>
          </Magnetic>

          <div className="curtain__cols mt-[5vh]">
            <ul aria-label="Work">
              {work.map((w) => (
                <li key={w.slug}>
                  <TransitionLink href={`/work/${w.slug}`} title={w.title} tone={w.tone} label={w.kind}>
                    {w.title}
                  </TransitionLink>
                </li>
              ))}
            </ul>
            <ul aria-label="Agency">
              {navLinks.map((l) => (
                <li key={l.href}>
                  <TransitionLink href={l.href} title={l.label}>
                    {l.label}
                  </TransitionLink>
                </li>
              ))}
            </ul>
            <ul aria-label="Elsewhere">
              {social.map((s) => (
                <li key={s.label}>
                  <a href={s.href} target="_blank" rel="noreferrer">
                    {s.label} ↗
                  </a>
                </li>
              ))}
              <li>
                <button type="button" onClick={restore} className="text-left">
                  Put the template back
                </button>
              </li>
            </ul>
            {/* The studio, kept small on purpose. */}
            <p className="curtain__studio">
              {founders.map((f) => f.name || f.alias).join(" & ")}. Two people, based in {site.based}.
              <br />© {new Date().getFullYear()} Erase
            </p>
          </div>
        </div>

        <p className="curtain__mark" aria-hidden="true">
          {"Erase".split("").map((c, i) => (
            <span key={i}>{c}</span>
          ))}
        </p>
      </div>
    </footer>
  );
}
