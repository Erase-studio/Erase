"use client";

import { useState } from "react";
import { work, type WorkKind } from "@/content/work";
import { Mini } from "@/components/work/Minis";
import { ScratchCover } from "@/components/erase/ScratchCover";
import { TransitionLink } from "@/components/system/TransitionLink";

const filters: ("All" | WorkKind)[] = ["All", "Live", "Concept study"];

export function WorkIndex() {
  const [filter, setFilter] = useState<(typeof filters)[number]>("All");
  const items = work.filter((w) => filter === "All" || w.kind === filter);

  return (
    <section className="grain widx" data-chapter="work-index" data-chapter-label="Work" data-theme="dark">
      <div className="frame">
        <div className="widx__filters" role="group" aria-label="Filter work">
          {filters.map((f) => (
            <button key={f} type="button" className="widx__filter" aria-pressed={filter === f} onClick={() => setFilter(f)}>
              {f}
              <span className="ml-2 opacity-60">{f === "All" ? work.length : work.filter((w) => w.kind === f).length}</span>
            </button>
          ))}
        </div>

        <ul className="widx__grid">
          {items.map((w) => (
            <li key={w.slug} className="widx__card">
              <TransitionLink href={`/work/${w.slug}`} title={w.title} tone={w.tone} label={w.kind} className="grid gap-4" aria-label={`${w.title} case study`}>
                <ScratchCover tone="dark" label="Rub to preview" className="widx__visual">
                  <div className="bframe" aria-hidden="true">
                    <div className="bframe__bar">
                      <i />
                      <i />
                      <i />
                      <span className="bframe__url">{w.mini === "erase" ? "erase.studio" : `${w.slug}.concept`}</span>
                    </div>
                    <div className="bframe__view">
                      <Mini kind={w.mini} />
                    </div>
                  </div>
                </ScratchCover>
                <div className="widx__row">
                  <h2 className="widx__title">{w.title}</h2>
                  <span className="cs-pill t-label">{w.kind}</span>
                </div>
                <div className="widx__row text-smudge">
                  <span>{w.brief}</span>
                  <span className="t-label">
                    {w.sector} · {w.year}
                  </span>
                </div>
              </TransitionLink>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
