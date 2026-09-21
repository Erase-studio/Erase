"use client";

import { useEffect, useRef, useState } from "react";
import type { CaseStudy } from "@/content/cases";
import type { Work } from "@/content/work";
import { sound } from "@/lib/sound";
import { Roll } from "@/components/ui/Roll";

/**
 * The story of a project on one screen. The screen holds still while a short
 * scroll turns it chapter by chapter (the problem gets struck out, the approach
 * is marked, what we built is dealt like cards, then what happened and what
 * we'd change), so the whole case reads in a few flicks. The tabs jump.
 */

const CHAPTERS = ["The problem", "The approach", "What we built", "The result"];
/** The four above plus a closing chapter, whose name the case chooses. */
const N = CHAPTERS.length + 1;

export function CaseReel({ data, item }: { data: CaseStudy; item: Work }) {
  const CH = [...CHAPTERS, data.closer ?? "In hindsight"];
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
      const i = Math.min(N - 1, Math.floor(p * N * 0.999));
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
    const y = top + ((i + 0.5) / N) * run;
    if (window.__lenis) window.__lenis.scrollTo(y, { duration: 1.1 });
    else window.scrollTo({ top: y, behavior: "smooth" });
  };

  const n = (v: number) => String(v).padStart(2, "0");

  return (
    <section ref={ref} className="cs-reel" style={{ "--n": N } as React.CSSProperties} aria-label="The story">
      <div className="cs-reel__screen frame">
        <nav className="cs-reel__tabs" aria-label="Chapters">
          {CH.map((c, i) => (
            <button key={c} type="button" className="cs-reel__tab mono" data-on={i === at} data-past={i < at} onClick={() => jump(i)}>
              <span>{n(i + 1)}</span> <Roll>{c}</Roll>
            </button>
          ))}
          <span className="cs-reel__track" aria-hidden="true">
            <i className="cs-reel__fill" />
          </span>
        </nav>

        <div className="cs-reel__stage" aria-live="polite">
          <span className="cs-reel__count mono" aria-hidden="true">
            {n(at + 1)}
            <em> / {n(N)}</em>
          </span>

          <article className="cs-ch cs-ch--problem" data-on={at === 0} data-past={at > 0}>
            <h2 className="cs-ch__big">
              <span className="cs-strike">{data.problem.title}</span>
            </h2>
            <p className="cs-ch__text">{data.problem.body}</p>
          </article>

          <article className="cs-ch cs-ch--idea" data-on={at === 1} data-past={at > 1}>
            <h2 className="cs-ch__big">
              <span className="cs-mark">{data.approach.title}</span>
            </h2>
            <p className="cs-ch__text">{data.approach.body}</p>
          </article>

          <article className="cs-ch cs-ch--calls" data-on={at === 2} data-past={at > 2}>
            <ol className="cs-cards" data-count={data.built.length} style={{ "--k": data.built.length } as React.CSSProperties}>
              {data.built.map((d, i) => (
                <li key={d.title} className="cs-card" style={{ "--i": i } as React.CSSProperties}>
                  <span className="mono cs-card__num">{n(i + 1)}</span>
                  <h3 className="cs-card__title">{d.title}</h3>
                  <p className="cs-card__body">{d.body}</p>
                </li>
              ))}
            </ol>
          </article>

          <article className="cs-ch cs-ch--result" data-on={at === 3} data-past={at > 3}>
            {item.award && <p className="mono cs-award">{item.award}</p>}
            <p className="cs-ch__result">{data.result}</p>
            <ul className="cs-stack" aria-label="Built with">
              {item.tags.map((t, i) => (
                <li key={t} className="mono" style={{ "--i": i } as React.CSSProperties}>
                  {t}
                </li>
              ))}
            </ul>
          </article>

          <article className="cs-ch cs-ch--quote" data-on={at === 4} data-past={false}>
            <p className="cs-ch__quote" data-plain={!!data.closer}>{data.hindsight}</p>
          </article>
        </div>
      </div>
    </section>
  );
}
