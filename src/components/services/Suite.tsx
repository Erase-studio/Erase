"use client";

import { useEffect, useRef, useState } from "react";
import { services } from "@/content/agency";

/**
 * The pencil case.
 *
 * Six erasers lie in a tray above the list, each worn by the job it does.
 * Scroll and they stand up in a row; point at a service and its eraser rises
 * and turns its worn face toward you, with what that service actually covers.
 *
 * The 3D is a bonus: without it the list is still a list, with the wear noted
 * in words beside each name.
 */

/** In the same order as the services, worst worn last. */
const WORN = [
  "barely touched",
  "worn square",
  "worn to a wedge",
  "worn round",
  "down to half",
  "down to a sliver",
];

export function Suite() {
  const [at, setAt] = useState(0);
  const boxRef = useRef<HTMLDivElement>(null);
  const shown = services[at];

  // Tell the 3D tray which one the pointer is on.
  useEffect(() => {
    boxRef.current?.dispatchEvent(new CustomEvent("suite:hot", { detail: at }));
  }, [at]);

  return (
    <section className="suite" aria-labelledby="suite-title" data-sound="services">
      <div className="suite__inner frame">
        <header className="suite__head">
          <p className="mono" data-reveal="fade">
            (01) What we do
          </p>
          <h2 id="suite-title" className="suite__title" data-warp data-reveal="lines">
            Six tools. One hand.
          </h2>
          <p className="lede suite__lede" data-reveal="fade" data-delay="0.25">
            Every studio lists the same six services. Here they are as the things they actually are — worn to different shapes by how
            much of the work each one really does.
          </p>
        </header>

        <div ref={boxRef} className="suite__stage" data-view="suite" aria-hidden="true" />

        <div className="suite__body">
          <ol className="suite__list" onPointerLeave={() => setAt(at)}>
            {services.map((s, i) => (
              <li key={s.id} className="suite__row" data-on={i === at}>
                <button
                  type="button"
                  className="suite__bar"
                  aria-pressed={i === at}
                  onPointerEnter={(e) => e.pointerType === "mouse" && setAt(i)}
                  onFocus={() => setAt(i)}
                  onClick={() => setAt(i)}
                >
                  <span className="mono suite__n">{String(i + 1).padStart(2, "0")}</span>
                  <span className="suite__name">{s.name}</span>
                  <span className="mono suite__worn">{WORN[i]}</span>
                </button>
              </li>
            ))}
          </ol>

          <div className="suite__detail" aria-live="polite">
            <p className="suite__short">{shown.short}</p>
            <ul className="suite__parts">
              {shown.deliverables.map((d) => (
                <li key={d} className="mono">
                  {d}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}
