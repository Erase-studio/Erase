"use client";

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { EraseLayer } from "@/components/erase/EraseLayer";
import { InkTitle } from "@/components/erase/InkTitle";
import { TransitionLink } from "@/components/system/TransitionLink";
import { site } from "@/content/site";
import { scrollToTarget } from "@/components/system/SmoothScroll";
import { useFinePointer } from "@/lib/env";
import { gsap } from "@/lib/gsap";

type Phase = "template" | "erasing" | "done";

const SEEN_KEY = "erase:seen";
const noop = () => () => {};
const shouldSkipIntro = () => {
  let seen = false;
  try {
    seen = sessionStorage.getItem(SEEN_KEY) === "1";
  } catch {}
  return seen || window.matchMedia("(prefers-reduced-motion: reduce)").matches;
};

export function Hero() {
  const rootRef = useRef<HTMLElement>(null);
  const layerRef = useRef<HTMLDivElement>(null);
  const meterRef = useRef<HTMLSpanElement>(null);
  const [rawPhase, setPhase] = useState<Phase>("template");
  const [run, setRun] = useState(0);
  const coarse = !useFinePointer();
  // Returning in the same session, or asking for less motion: skip the bit.
  // (The inline script in layout.tsx makes the same call before paint.)
  const skipIntro = useSyncExternalStore(noop, shouldSkipIntro, () => false);
  const phase: Phase = run === 0 && skipIntro ? "done" : rawPhase;

  // "Put the template back", from the footer.
  useEffect(() => {
    const restore = () => {
      try {
        sessionStorage.removeItem(SEEN_KEY);
      } catch {}
      document.documentElement.classList.remove("intro-skip");
      setPhase("template");
      setRun((r) => r + 1);
    };
    window.addEventListener("erase:restore", restore);
    return () => window.removeEventListener("erase:restore", restore);
  }, []);

  const onDone = useCallback(() => {
    try {
      sessionStorage.setItem(SEEN_KEY, "1");
    } catch {}
    setPhase("done");
  }, []);

  // The real nav stays out of the way until the fake one has been rubbed out.
  useEffect(() => {
    document.documentElement.dataset.intro = phase;
  }, [phase]);

  // The supporting copy writes in once the template is gone.
  useEffect(() => {
    if (phase !== "done") return;
    const root = rootRef.current!;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const items = root.querySelectorAll("[data-hero-in]");
    if (reduced) {
      gsap.set(items, { opacity: 1, y: 0 });
      return;
    }
    const ctx = gsap.context(() => {
      const start = () =>
        gsap.fromTo(
          items,
          { opacity: 0, y: 24 },
          { opacity: 1, y: 0, duration: 1.1, stagger: 0.07, delay: 0.1 },
        );
      if (window.__eraseLoaded) start();
      else window.addEventListener("erase:loaded", start, { once: true });
    }, root);
    return () => ctx.revert();
  }, [phase]);

  // Exit: the supporting copy drifts up; the headline dissolves itself in WebGL.
  useEffect(() => {
    const root = rootRef.current!;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) return;
    const ctx = gsap.context(() => {
      gsap.to(".hero__aside, .hero__top", {
        yPercent: -60,
        opacity: 0,
        ease: "none",
        scrollTrigger: { trigger: root, start: "top top", end: "bottom 20%", scrub: true },
      });
    }, root);
    return () => ctx.revert();
  }, []);

  const eraseForMe = () => {
    layerRef.current?.querySelector(".erase-layer")?.dispatchEvent(new Event("erase:finish"));
  };

  const onProgress = useCallback((p: number) => {
    const el = meterRef.current;
    if (el) el.textContent = String(Math.round(p * 100));
  }, []);

  const showTemplate = phase !== "done";

  return (
    <section
      ref={rootRef}
      id="intro"
      data-chapter="intro"
      data-theme="dark"
      data-phase={phase}
      className="hero grain"
      aria-labelledby="hero-title"
    >
      <div
        className="hero__real frame"
        // Tabbing into the hidden hero finishes the erase instead of focusing invisible buttons.
        onFocusCapture={phase === "done" ? undefined : eraseForMe}
      >
        <div className="hero__bar hero__top" data-hero-in>
          <p className="avail">
            <i aria-hidden="true" />
            {site.availability}
          </p>
          <ul className="hero__svc" aria-label="What we do">
            {["Web design", "Development", "E-commerce", "Motion & 3D"].map((s) => (
              <li key={s}>{s}</li>
            ))}
          </ul>
        </div>

        <div className="hero__bottom">
          <h1 id="hero-title" className="hero__title t-display" data-hero-headline>
            <span className="sr-only">Erase, a web design and development agency. </span>
            <span className="hero__word hero__word--1" data-hero-word>
              Nothing
            </span>
            <span className="hero__word hero__word--2" data-hero-word>
              generic
            </span>
            <span className="hero__word hero__word--3" data-hero-word>
              left.
            </span>
          </h1>

          <div className="hero__aside hero__aside--agency" data-hero-in>
            <p className="hero__pitch">
              A web design & development agency building websites for brands that refuse to blend in.
            </p>
            <div className="flex flex-wrap items-center gap-3">
              <TransitionLink href="/contact" title="Start a project" className="btn">
                Start a project <span className="btn-arrow">→</span>
              </TransitionLink>
              <a
                href="#proof"
                className="btn btn-ghost"
                onClick={(e) => {
                  e.preventDefault();
                  scrollToTarget("#proof");
                }}
              >
                See our work
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* Smudges from the rubbing stay on the page after the template is gone. */}
      <canvas className="hero__marks" aria-hidden="true" />

      {phase === "done" && <InkTitle hostRef={rootRef} />}

      {showTemplate && (
        <div ref={layerRef} key={run} className="hero__template">
          <EraseLayer onDone={onDone} onStart={() => setPhase("erasing")} onProgress={onProgress} marks=".hero__marks" />
          <div className="erase-veil" aria-hidden="true" />
          <div className="hero__fig" data-cursor="hide">
            <p className="hero__fig-hint">{coarse ? "Watch." : "Move to erase"}</p>
            <p className="hero__fig-meter" aria-hidden="true">
              <span className="hero__fig-bar" />
              <span>
                <span ref={meterRef}>0</span>% erased
              </span>
            </p>
            <button type="button" className="hero__fig-btn t-label" onClick={eraseForMe}>
              <span className="hero__fig-skip">Skip</span>
              <span className="hero__fig-finish">Finish it</span>
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
