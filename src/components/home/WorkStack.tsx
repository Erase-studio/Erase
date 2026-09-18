"use client";

import { useEffect, useRef, useState } from "react";
import { work } from "@/content/work";
import { PreviewFrame } from "@/components/work/PreviewFrame";
import { TransitionLink } from "@/components/system/TransitionLink";
import { Roll } from "@/components/ui/Roll";

/**
 * The work as a stack of printed posters. Scroll peels the top sheet away (WebGL
 * page curl) and the next project is underneath. The copy beside it follows.
 */
export function WorkStack() {
  const rootRef = useRef<HTMLElement>(null);
  const [active, setActive] = useState(0);

  useEffect(() => {
    const root = rootRef.current!;
    const on = (e: Event) => setActive((e as CustomEvent<number>).detail);
    root.addEventListener("stack:active", on);
    return () => root.removeEventListener("stack:active", on);
  }, []);

  const item = work[active];
  const n = (v: number) => String(v).padStart(2, "0");

  return (
    <section
      ref={rootRef}
      className="ws"
      data-sound="work"
      style={{ "--n": work.length } as React.CSSProperties}
      aria-labelledby="ws-title"
    >
      <div className="ws__sticky frame" data-view="stack" data-slugs={work.map((w) => w.slug).join(",")}>
        <header className="ws__head">
          <div>
            <p className="mono muted">(02) Selected work</p>
            <h2 id="ws-title" className="ws__lede">
              Our own site, and concept studies that show our range.
            </h2>
          </div>
          <TransitionLink href="/work" title="Work" className="pill">
            <Roll>All work</Roll>
            <span className="pill__arrow" aria-hidden="true">
              →
            </span>
          </TransitionLink>
        </header>

        <div className="ws__body">
          <div className="ws__info" aria-live="polite">
            <p className="ws__count mono">
              <b>{n(active + 1)}</b> / {n(work.length)}
            </p>
            {work.map((w, i) => (
              <div key={w.slug} className="ws__item" data-on={i === active} aria-hidden={i !== active}>
                <h3 className="ws__title">
                  {w.title.split("").map((c, k) => (
                    <span key={k} style={{ "--i": k } as React.CSSProperties}>
                      {c}
                    </span>
                  ))}
                </h3>
                <p className="mono ws__meta">
                  <span data-kind={w.kind}>{w.kind}</span> · {w.sector} · {w.year}
                </p>
                <p className="body">{w.brief}</p>
                <TransitionLink href={`/work/${w.slug}`} title={w.title} label={w.kind} className="pill pill--solid" tabIndex={i === active ? 0 : -1}>
                  <Roll>View case</Roll>
                  <span className="pill__arrow" aria-hidden="true">
                    →
                  </span>
                </TransitionLink>
              </div>
            ))}
            <div className="ws__dots" aria-hidden="true">
              {work.map((w, i) => (
                <i key={w.slug} data-on={i === active} />
              ))}
            </div>
          </div>

          <TransitionLink
            href={`/work/${item.slug}`}
            title={item.title}
            label={item.kind}
            className="ws__slot"
            data-slot
            data-cursor-label="View"
            tabIndex={-1}
            aria-hidden="true"
          >
            <span className="ws__fallback">
              <PreviewFrame item={item} interactive={false} />
            </span>
          </TransitionLink>
        </div>
      </div>
    </section>
  );
}
