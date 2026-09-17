"use client";

import { useId, useState } from "react";

/** Questions as rows; one open at a time; the answer slides open with the grid trick. */
export function Faq({ items }: { items: { q: string; a: string }[] }) {
  const [open, setOpen] = useState(0);
  const uid = useId();
  return (
    <section className="faq frame" data-scene="quiet" aria-labelledby={`${uid}-title`}>
      <header className="faq__head">
        <p className="mono muted" data-reveal="fade">
          Questions
        </p>
        <h2 id={`${uid}-title`} className="h2" data-reveal="lines">
          Asked before.
        </h2>
      </header>
      <ul className="faq__list">
        {items.map((f, i) => {
          const isOpen = open === i;
          return (
            <li key={f.q} className="faq__item" data-open={isOpen} data-reveal="fade" data-delay={String(i * 0.04)}>
              <h3>
                <button
                  type="button"
                  className="faq__q"
                  aria-expanded={isOpen}
                  aria-controls={`${uid}-a${i}`}
                  onClick={() => setOpen(isOpen ? -1 : i)}
                >
                  <span className="mono muted">{String(i + 1).padStart(2, "0")}</span>
                  <span className="faq__qtext">{f.q}</span>
                  <span className="faq__icon" aria-hidden="true" />
                </button>
              </h3>
              <div id={`${uid}-a${i}`} className="faq__a" role="region">
                <div>
                  <p className="body">{f.a}</p>
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
