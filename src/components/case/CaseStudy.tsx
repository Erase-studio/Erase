"use client";

import { useEffect, useRef, useState } from "react";
import { gsap, onReveal, ScrollTrigger } from "@/lib/gsap";
import type { Work } from "@/content/work";
import type { CaseStudy as CaseData } from "@/content/cases";
import { PreviewFrame } from "@/components/work/PreviewFrame";
import { TransitionLink } from "@/components/system/TransitionLink";
import { usePageTransition } from "@/components/system/PageTransition";
import { Lines } from "@/components/ui/Lines";

export function CaseStudy({ item, data, next, index }: {
  item: Work;
  data: CaseData;
  next: Work;
  index: number;
}) {
  const rootRef = useRef<HTMLDivElement>(null);
  const { navigate } = usePageTransition();
  const [stretch, setStretch] = useState(100);

  useEffect(() => {
    const root = rootRef.current!;
    const mm = gsap.matchMedia();

    mm.add(
      {
        motion: "(prefers-reduced-motion: no-preference)",
        desktop: "(min-width: 1024px)",
      },
      (context) => {
        const { motion, desktop } = context.conditions as { motion: boolean; desktop: boolean };
        if (!motion) return;

        // Title: letters rise and widen, once the page is actually on screen.
        const chars = root.querySelectorAll(".cs-title .cs-char");
        const fades = root.querySelectorAll(".cs-hero [data-fade]");
        gsap.set(chars, { yPercent: 110, fontStretch: "75%" });
        gsap.set(fades, { opacity: 0, y: 20 });
        // A named context method records tweens made later, so revert still cleans them up.
        context.add("intro", () => {
          gsap.to(chars, { yPercent: 0, fontStretch: "112.5%", duration: 1.4, stagger: 0.04, ease: "expo.out" });
          gsap.to(fades, { opacity: 1, y: 0, duration: 1.1, stagger: 0.08, delay: 0.3 });
        });
        const cancelIntro = onReveal(() => (context as unknown as { intro: () => void }).intro());

        // Zoom: the frame grows to full bleed, then scrolls through the site inside it.
        const zoom = root.querySelector<HTMLElement>(".cs-zoom")!;
        const frame = zoom.querySelector<HTMLElement>(".cs-zoom__frame")!;
        const mini = zoom.querySelector<HTMLElement>(".mini")!;
        const view = zoom.querySelector<HTMLElement>(".bframe__view")!;
        if (desktop) {
          zoom.dataset.pinned = "true";
          const tl = gsap.timeline({
            scrollTrigger: {
              trigger: zoom,
              start: "top top",
              end: () => `+=${window.innerHeight * 2.2}`,
              pin: true,
              scrub: 0.8,
              invalidateOnRefresh: true,
            },
          });
          tl.fromTo(frame, { scale: 0.58, borderRadius: 18 }, { scale: 1, borderRadius: 0, ease: "power2.inOut", duration: 1 })
            .fromTo(
              mini,
              { y: 0 },
              { y: () => -Math.max(0, mini.offsetHeight - view.offsetHeight), ease: "none", duration: 1.4 },
              ">-0.1",
            )
            .to(frame, { scale: 0.9, duration: 0.5, ease: "power2.in" });
        } else {
          // Phones: the frame scrolls its site as the page passes it, no pin.
          gsap.fromTo(
            mini,
            { y: 0 },
            {
              y: () => -Math.max(0, mini.offsetHeight - view.offsetHeight),
              ease: "none",
              scrollTrigger: { trigger: zoom, start: "top 70%", end: "bottom 20%", scrub: true, invalidateOnRefresh: true },
            },
          );
        }

        // Quote: words ink in one by one as you read.
        const words = root.querySelectorAll(".cs-quote__w");
        gsap.fromTo(
          words,
          { opacity: 0.12 },
          {
            opacity: 1,
            stagger: 0.1,
            ease: "none",
            scrollTrigger: { trigger: ".cs-quote", start: "top 75%", end: "bottom 45%", scrub: true },
          },
        );

        // Decisions: a horizontal run on desktop.
        if (desktop) {
          const track = root.querySelector<HTMLElement>(".cs-decisions__track")!;
          const wrap = root.querySelector<HTMLElement>(".cs-decisions")!;
          const run = gsap.to(track, {
            x: () => -(track.scrollWidth - window.innerWidth),
            ease: "none",
            scrollTrigger: {
              trigger: wrap,
              start: "top top",
              end: () => `+=${track.scrollWidth - window.innerWidth}`,
              pin: true,
              scrub: 0.8,
              invalidateOnRefresh: true,
            },
          });
          gsap.utils.toArray<HTMLElement>(".cs-card").forEach((card) => {
            gsap.fromTo(
              card.querySelector(".cs-card__title"),
              { fontStretch: "75%" },
              {
                fontStretch: "118%",
                ease: "none",
                scrollTrigger: {
                  trigger: card,
                  containerAnimation: run,
                  start: "left 90%",
                  end: "left 40%",
                  scrub: true,
                },
              },
            );
          });
        }

        // Swatches rise in.
        gsap.fromTo(
          root.querySelectorAll(".cs-swatch"),
          { yPercent: 40, opacity: 0 },
          {
            yPercent: 0,
            opacity: 1,
            stagger: 0.08,
            duration: 1.2,
            scrollTrigger: { trigger: ".cs-system", start: "top 70%", toggleActions: "play none none none" },
          },
        );

        // Next project: scrolling to the end erases this page into the next one.
        const nextEl = root.querySelector<HTMLElement>(".cs-next")!;
        const bar = nextEl.querySelector<HTMLElement>(".cs-next__bar i")!;
        let fired = false;
        ScrollTrigger.create({
          trigger: nextEl,
          start: "top top",
          end: "bottom bottom",
          scrub: true,
          onUpdate: (self) => {
            bar.style.transform = `scaleX(${self.progress})`;
            nextEl.style.setProperty("--p", String(self.progress));
            if (self.progress > 0.995 && !fired) {
              fired = true;
              navigate(`/work/${next.slug}`, { title: next.title, bg: next.tone.bg, fg: next.tone.fg, label: "Next project" });
            }
          },
        });

        return () => cancelIntro();
      },
    );

    return () => mm.revert();
  }, [navigate, next]);

  const splitChars = (s: string) =>
    s.split("").map((c, i) => (
      <span key={i} className="cs-char">
        {c === " " ? " " : c}
      </span>
    ));

  return (
    <div
      ref={rootRef}
      className="cs"
      style={
        {
          "--cs-bg": item.tone.bg,
          "--cs-fg": item.tone.fg,
          "--cs-muted": item.tone.muted,
          "--cs-next-bg": next.tone.bg,
          "--cs-next-fg": next.tone.fg,
        } as React.CSSProperties
      }
    >
      <section
        className="cs-hero frame"
        data-chapter="case"
        data-chapter-index={String(index + 1).padStart(2, "0")}
        data-chapter-label={item.title}
        data-theme={isLight(item.tone.bg) ? "light" : "dark"}
      >
        <div className="cs-hero__meta t-label" data-fade>
          <TransitionLink href="/#proof" title="Proof" label="Back to the work" className="cs-back" data-cursor-label="Back">
            ← All work
          </TransitionLink>
          <span className="cs-pill ml-auto">{item.kind}</span>
        </div>
        <h1 className="cs-title" aria-label={item.title}>
          <span className="cs-title__mask" aria-hidden="true">
            {splitChars(item.title)}
          </span>
        </h1>
        <div className="cs-hero__foot">
          <p className="cs-lede" data-fade>
            {data.lede}
          </p>
        </div>
      </section>

      <section
        className="cs-zoom"
        data-chapter="case"
        data-chapter-index="—"
        data-chapter-label="The site"
        data-theme={isLight(item.tone.bg) ? "light" : "dark"}
        aria-label={`${item.title} preview`}
      >
        <div className="cs-zoom__frame">
          <PreviewFrame item={item} interactive={false} />
        </div>
      </section>

      <section className="cs-quote frame" data-chapter="case" data-chapter-index="B" data-chapter-label="In one line" data-theme="dark">
        <p className="cs-quote__text">
          <span className="sr-only">{data.quote}</span>
          <span aria-hidden="true">
            {data.quote.split(" ").map((wd, i) => (
              <span key={i} className="cs-quote__w">
                {wd}{" "}
              </span>
            ))}
          </span>
        </p>
      </section>

      <section className="cs-decisions" data-chapter="case" data-chapter-index="C" data-chapter-label="Decisions" data-theme="light">
        <div className="cs-decisions__track">
          <div className="cs-decisions__intro">
            <p className="t-mega cs-decisions__mega">Calls.</p>
          </div>
          {data.decisions.map((d) => (
            <article key={d.title} className="cs-card">
              <span className="cs-card__rule" />
              <h3 className="cs-card__title">{d.title}</h3>
              <p>{d.body}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="cs-system frame grain" data-chapter="case" data-chapter-index="D" data-chapter-label="System" data-theme="dark">
        <div className="grid-12 gap-y-10">
          <div className="col-span-4 md:col-span-4" data-reveal>
            <Lines as="h2" className="cs-h2" lines={["System."]} />
          </div>
          <div className="cs-swatches col-span-4 md:col-span-8">
            {data.palette.map((c) => (
              <div key={c.hex} className="cs-swatch" style={{ background: c.hex, color: isLight(c.hex) ? "#111213" : "#E9EAEC" }}>
                <span className="t-label">{c.name}</span>
                <span className="t-label">{c.hex}</span>
              </div>
            ))}
          </div>
        </div>
        <div
          className="cs-specimen"
          data-cursor-label="Move"
          onPointerMove={(e) => {
            const r = e.currentTarget.getBoundingClientRect();
            setStretch(Math.round(75 + ((e.clientX - r.left) / r.width) * 50));
          }}
        >
          <div className="cs-specimen__meta t-label">
            <span>{data.type.name}</span>
            <span>{data.type.note}</span>
            <span className="text-blueline">wdth {stretch}</span>
          </div>
          <p className="cs-specimen__sample" style={{ fontStretch: `${stretch}%` }}>
            {data.type.sample}
          </p>
        </div>
      </section>

      <section className="cs-next" data-chapter="case" data-chapter-index="→" data-chapter-label="Next project" data-theme={isLight(next.tone.bg) ? "light" : "dark"}>
        <div className="cs-next__sticky frame">
          <div className="cs-next__row t-label">
            <span>Next</span>
            <span>↓</span>
          </div>
          <TransitionLink
            href={`/work/${next.slug}`}
            title={next.title}
            tone={next.tone}
            label="Next project"
            className="cs-next__title"
            data-cursor-label="Open"
          >
            {next.title}
          </TransitionLink>
          <div className="cs-next__bar">
            <i />
          </div>
        </div>
      </section>
    </div>
  );
}

function isLight(hex: string) {
  const n = parseInt(hex.slice(1), 16);
  const [r, g, b] = [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  return 0.2126 * r + 0.7152 * g + 0.0722 * b > 150;
}
