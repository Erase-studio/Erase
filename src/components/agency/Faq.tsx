"use client";

import { useId, useState } from "react";
import { faqs } from "@/content/agency";
import { EraseReveal } from "@/components/erase/EraseReveal";

/** Questions every client asks before the first call. */
export function Faq() {
  const [open, setOpen] = useState(0);
  const uid = useId();

  return (
    <section id="faq" className="chapter-light grain faq" data-chapter="faq" data-chapter-label="FAQ" data-theme="light" aria-labelledby="faq-title">
      <div className="frame faq__grid">
        <EraseReveal cover="sheet" as="span" className="faq__title-wrap">
          <h2 id="faq-title" className="t-mega">
            FAQ.
          </h2>
        </EraseReveal>

        <div className="faq__list">
          {faqs.map((f, i) => {
            const isOpen = open === i;
            return (
              <div key={f.q} className="faq__item" data-open={isOpen}>
                <h3>
                  <button
                    type="button"
                    className="faq__q"
                    aria-expanded={isOpen}
                    aria-controls={`${uid}-${i}`}
                    onClick={() => setOpen(isOpen ? -1 : i)}
                  >
                    <span>{f.q}</span>
                    <i aria-hidden="true" />
                  </button>
                </h3>
                <div id={`${uid}-${i}`} className="faq__a" role="region" hidden={!isOpen}>
                  <p>{f.a}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
