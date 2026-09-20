"use client";

import { useEffect, useRef, useState } from "react";
import type { CaseStudy } from "@/content/cases";
import { sound } from "@/lib/sound";

/**
 * The story of a project on one screen. The screen holds still while a short
 * scroll turns it chapter by chapter (the problem gets struck out, the idea
 * lands, the line, the four calls dealt like cards, then the system), so the
 * whole case reads in a few flicks instead of a long page. The tabs jump.
 */

const CH = ["The problem", "The idea", "In one line", "Four calls", "System"];

export function CaseReel({ data }: { data: CaseStudy }) {
  const ref = useRef<HTMLElement>(null);
  const [at, setAt] = useState(0);
  const atRef = useRef(0);

  useEffect(() => {
    const el = ref.current!;
    const bar = el.querySelector<HTMLElement>(".cs-reel__fill")!;
    let raf = 0;
    const measure = () => {
      raf = 0;
      const r = el.getBoundingClientRect();
      const run = r.height - window.innerHeight;
      const p = run > 0 ? Math.min(1, Math.max(0, -r.top / run)) : 0;
      bar.style.transform = `scaleX(${p.toFixed(4)})`;
      const i = Math.min(CH.length - 1, Math.floor(p * CH.length * 0.999));
      if (i !== atRef.current) {
        sound.pageTurn(i > atRef.current ? 1 : -1);
        if (i === 0 && atRef.current > 0) sound.strike();
        atRef.current = i;
        setAt(i);
      }
    };
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(measure);
    };
    measure();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      cancelAnimationFrame(raf);
    };
  }, []);

  // The problem is struck through as it comes on screen.
  useEffect(() => {
    const el = ref.current!;
    const io = new IntersectionObserver(([e]) => {
      if (!e.isIntersecting) return;
      el.dataset.seen = "true";
      window.setTimeout(() => sound.strike(), 420);
      io.disconnect();
    }, { threshold: 0.6 });
    io.observe(el.querySelector(".cs-reel__screen")!);
    return () => io.disconnect();
  }, []);

  const jump = (i: number) => {
    const el = ref.current!;
    const top = el.getBoundingClientRect().top + window.scrollY;
    const run = el.offsetHeight - window.innerHeight;
    const y = top + ((i + 0.5) / CH.length) * run;
    if (window.__lenis) window.__lenis.scrollTo(y, { duration: 1.1 });
    else window.scrollTo({ top: y, behavior: "smooth" });
  };

  const n = (v: number) => String(v).padStart(2, "0");

  return (
    <section ref={ref} className="cs-reel" style={{ "--n": CH.length } as React.CSSProperties} aria-label="The story">
      <div className="cs-reel__screen frame">
        <nav className="cs-reel__tabs" aria-label="Chapters">
          {CH.map((c, i) => (
            <button key={c} type="button" className="cs-reel__tab mono" data-on={i === at} data-past={i < at} onClick={() => jump(i)}>
              <span>{n(i + 1)}</span> {c}
            </button>
          ))}
          <span className="cs-reel__track" aria-hidden="true">
            <i className="cs-reel__fill" />
          </span>
        </nav>

        <div className="cs-reel__stage" aria-live="polite">
          <span className="cs-reel__count mono" aria-hidden="true">
            {n(at + 1)}
            <em> / {n(CH.length)}</em>
          </span>

          <article className="cs-ch cs-ch--problem" data-on={at === 0} data-past={at > 0}>
            <h2 className="cs-ch__big">
              <span className="cs-strike">{data.problem.title}</span>
            </h2>
            <p className="lede cs-ch__body">{data.problem.body}</p>
          </article>

          <article className="cs-ch cs-ch--idea" data-on={at === 1} data-past={at > 1}>
            <h2 className="cs-ch__big">
              <span className="cs-mark">{data.idea.title}</span>
            </h2>
            <p className="lede cs-ch__body">{data.idea.body}</p>
          </article>

          <article className="cs-ch cs-ch--quote" data-on={at === 2} data-past={at > 2}>
            <p className="cs-ch__quote">
              <span aria-hidden="true">“</span>
              {data.quote}
              <span aria-hidden="true">”</span>
            </p>
          </article>

          <article className="cs-ch cs-ch--calls" data-on={at === 3} data-past={at > 3}>
            <ol className="cs-cards">
              {data.decisions.map((d, i) => (
                <li key={d.title} className="cs-card" style={{ "--i": i } as React.CSSProperties}>
                  <span className="mono cs-card__num">{n(i + 1)}</span>
                  <h3 className="cs-card__title">{d.title}</h3>
                  <p className="cs-card__body">{d.body}</p>
                </li>
              ))}
            </ol>
          </article>

          <article className="cs-ch cs-ch--system" data-on={at === 4} data-past={false}>
            <ul className="cs-chips">
              {data.palette.map((c, i) => (
                <li key={c.hex} style={{ "--i": i, "--c": c.hex } as React.CSSProperties}>
                  <span className="cs-chips__bar" />
                  <span className="mono">{c.name}</span>
                  <span className="mono muted">{c.hex}</span>
                </li>
              ))}
            </ul>
            <div className="cs-font">
              <p className="cs-font__sample">{data.type.sample}</p>
              <p className="mono muted">
                {data.type.name} · {data.type.note}
              </p>
            </div>
          </article>
        </div>
      </div>
    </section>
  );
}
