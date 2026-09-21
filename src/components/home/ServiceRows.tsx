"use client";

import { useEffect, useRef, useState } from "react";
import { services } from "@/content/agency";
import { ServiceSketch } from "./ServiceSketch";
import { TransitionLink } from "@/components/system/TransitionLink";
import { Roll } from "@/components/ui/Roll";

/**
 * Six services as big rows. Point at one and a blue marker swipes behind its
 * name, the others step back, and a paper card follows your cursor while a
 * pencil sketches the service on it, with what it covers. On touch (or with
 * the keyboard) each row opens in place with the same sketch.
 */
export function ServiceRows({ kicker = "(03) What we do", limit }: { kicker?: string; limit?: number }) {
  // The home page shows the first few and sends you on; /services has them all.
  const shownServices = limit ? services.slice(0, limit) : services;
  const [hover, setHover] = useState<number | null>(null);
  const [open, setOpen] = useState<number | null>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLOListElement>(null);

  // The card trails the pointer and leans into the direction it's going.
  useEffect(() => {
    const card = cardRef.current!;
    const list = listRef.current!;
    if (!window.matchMedia("(hover: hover) and (pointer: fine)").matches) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const p = { x: 0, y: 0 };
    const c = { x: 0, y: 0, r: 0 };
    let raf = 0;
    let seeded = false;
    const tick = () => {
      const k = reduced ? 1 : 0.14;
      const vx = p.x - c.x;
      c.x += vx * k;
      c.y += (p.y - c.y) * k;
      c.r += (Math.max(-14, Math.min(14, vx * 0.06)) - c.r) * 0.12;
      card.style.transform = `translate3d(${c.x}px, ${c.y}px, 0) rotate(${(c.r - 3).toFixed(2)}deg)`;
      raf = Math.abs(vx) + Math.abs(p.y - c.y) > 0.2 || Math.abs(c.r) > 0.05 ? requestAnimationFrame(tick) : 0;
    };
    const onMove = (e: PointerEvent) => {
      if (e.pointerType !== "mouse") return;
      p.x = e.clientX + 36;
      p.y = e.clientY - 120;
      if (!seeded) {
        c.x = p.x;
        c.y = p.y;
        seeded = true;
      }
      if (!raf) raf = requestAnimationFrame(tick);
    };
    list.addEventListener("pointermove", onMove, { passive: true });
    return () => {
      list.removeEventListener("pointermove", onMove);
      cancelAnimationFrame(raf);
    };
  }, []);

  const active = hover ?? open;
  const shown = hover !== null ? shownServices[hover] : null;

  return (
    <section className="svc frame" data-sound="services" aria-labelledby="svc-title">
      <header className="svc__head">
        <p className="mono muted" data-reveal="fade">
          {kicker}
        </p>
        <h2 id="svc-title" className="h2" data-warp data-reveal="lines">
          Everything a website needs. One studio.
        </h2>
      </header>

      <ol ref={listRef} className="svc__list" data-active={active !== null} onPointerLeave={() => setHover(null)}>
        {shownServices.map((s, i) => (
          <li key={s.id} id={s.id} className="svc__row" data-on={active === i} data-open={open === i} data-reveal="fade">
            <button
              type="button"
              className="svc__bar"
              aria-expanded={open === i}
              aria-controls={`${s.id}-more`}
              onPointerEnter={(e) => e.pointerType === "mouse" && setHover(i)}
              onClick={() => setOpen((o) => (o === i ? null : i))}
            >
              <span className="mono svc__num">{String(i + 1).padStart(2, "0")}</span>
              <span className="svc__name">
                <span>{s.name}</span>
              </span>
              <span className="svc__count mono">{s.deliverables.length} parts</span>
              <span className="svc__plus" aria-hidden="true" />
            </button>
            <div className="svc__more" id={`${s.id}-more`}>
              <div className="svc__inner">
                {open === i && <ServiceSketch id={s.id} className="svc__sketch" />}
                <div className="svc__detail">
                  <p className="body">{s.short}</p>
                  <ul className="svc__tags">
                    {s.deliverables.map((d) => (
                      <li key={d} className="mono">
                        {d}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          </li>
        ))}
      </ol>

      {limit && (
        <p className="svc__rest" data-reveal="fade">
          <TransitionLink href="/services" title="Services" className="pill">
            <Roll>{`All ${services.length} services`}</Roll>
            <i className="pill__dot" aria-hidden="true" />
          </TransitionLink>
        </p>
      )}

      <div ref={cardRef} className="svc__card" data-show={hover !== null} aria-hidden="true">
        {shown && (
          <>
            <ServiceSketch key={shown.id} id={shown.id} />
            <p className="svc__card-text">{shown.short}</p>
            <p className="svc__card-tags mono">{shown.deliverables.join(", ")}</p>
          </>
        )}
      </div>
    </section>
  );
}
