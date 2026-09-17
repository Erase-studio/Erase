"use client";

import Link from "next/link";
import { services } from "@/content/agency";
import { Skin } from "@/components/chapters/Inside";
import { EraseReveal } from "@/components/erase/EraseReveal";
import { ScratchCover } from "@/components/erase/ScratchCover";
import { TransitionLink } from "@/components/system/TransitionLink";

/** Six services as cards. Each illustration sits under pencil hatching you rub away. */
export function ServicesGrid() {
  return (
    <section id="services" className="grain svc" data-chapter="services" data-chapter-label="Services" data-theme="dark" aria-labelledby="svc-title">
      <div className="frame">
        <header className="svc__head">
          <EraseReveal cover="graphite" as="span" className="svc__title-wrap">
            <h2 id="svc-title" className="t-mega">
              Services.
            </h2>
          </EraseReveal>
          <div className="svc__aside">
            <p className="svc__intro">Everything a website needs, from the first workshop to the hundredth deploy.</p>
            <TransitionLink href="/services" title="Services" className="btn btn-ghost">
              All services <span className="btn-arrow">→</span>
            </TransitionLink>
          </div>
        </header>

        <ul className="svc__grid">
          {services.map((s, i) => (
            <li key={s.id} className="svc__card">
              <div className="svc__meta t-label">
                <span>{String(i + 1).padStart(2, "0")}</span>
                <Link href={`/services#${s.id}`} className="svc__arrow" aria-label={`${s.name} details`}>
                  ↗
                </Link>
              </div>
              <ScratchCover tone="dark" label="Rub to reveal" className="svc__visual">
                <div className="skin-box">
                  <Skin i={s.skin} />
                </div>
              </ScratchCover>
              <h3 className="svc__name">{s.name}</h3>
              <p className="svc__short">{s.short}</p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
