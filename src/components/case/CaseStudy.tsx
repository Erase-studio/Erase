import type { Work } from "@/content/work";
import type { CaseStudy as CaseData } from "@/content/cases";
import { work } from "@/content/work";
import { PreviewFrame } from "@/components/work/PreviewFrame";
import { TransitionLink } from "@/components/system/TransitionLink";
import { Roll } from "@/components/ui/Roll";

/** A case study that shows more than it says: the site, the call, the four decisions, the system. */
export function CaseStudy({ item, data, next, index }: { item: Work; data: CaseData; next: Work; index: number }) {
  const n = (v: number) => String(v).padStart(2, "0");
  return (
    <>
      <header className="cs-hero frame" data-scene="quietNight">
        <div className="cs-hero__top" data-reveal="fade">
          <TransitionLink href="/work" title="Work" className="pill">
            <span className="pill__arrow" aria-hidden="true">
              ←
            </span>
            <Roll>All work</Roll>
          </TransitionLink>
          <p className="mono muted">
            {n(index + 1)} / {n(work.length)}
          </p>
        </div>
        <h1 className="cs-hero__title" data-reveal="lines" data-delay="0.1">
          {item.title}
        </h1>
        <div className="cs-hero__row">
          <p className="lede cs-hero__lede" data-reveal="fade" data-delay="0.3">
            {data.lede}
          </p>
          <dl className="cs-meta" data-reveal="fade" data-delay="0.4">
            <div>
              <dt className="mono muted">Type</dt>
              <dd>{item.kind}</dd>
            </div>
            <div>
              <dt className="mono muted">Sector</dt>
              <dd>{item.sector}</dd>
            </div>
            <div>
              <dt className="mono muted">Year</dt>
              <dd>{item.year}</dd>
            </div>
            <div>
              <dt className="mono muted">Focus</dt>
              <dd>{item.tags.join(", ")}</dd>
            </div>
          </dl>
        </div>
      </header>

      <section className="cs-shot frame" data-scene="quietNight" aria-label={`${item.title} preview`}>
        <div className="cs-shot__frame" data-reveal="fade">
          <PreviewFrame item={item} />
        </div>
        {item.kind === "Concept study" && (
          <p className="mono muted cs-shot__note">Concept study: designed and built by Erase without a client, to show range.</p>
        )}
      </section>

      <section className="cs-story frame" data-scene="quiet" aria-label="The problem and the idea">
        {[
          { label: "The problem", ...data.problem },
          { label: "The idea", ...data.idea },
        ].map((b) => (
          <div key={b.label} className="cs-story__block">
            <p className="mono muted" data-reveal="fade">
              {b.label}
            </p>
            <h2 className="h3" data-reveal="lines">
              {b.title}
            </h2>
            <p className="body" data-reveal="fade" data-delay="0.1">
              {b.body}
            </p>
          </div>
        ))}
      </section>

      <section className="cs-quote frame" aria-label="In one line">
        <p className="h2 cs-quote__text" data-reveal="lines">
          “{data.quote}”
        </p>
      </section>

      <section className="cs-calls frame" aria-labelledby="calls-title">
        <h2 id="calls-title" className="mono muted" data-reveal="fade">
          Four decisions
        </h2>
        <ol className="cs-calls__grid">
          {data.decisions.map((d, i) => (
            <li key={d.title} data-reveal="fade" data-delay={String(i * 0.06)}>
              <span className="mono cs-calls__num">{n(i + 1)}</span>
              <h3 className="cs-calls__title">{d.title}</h3>
              <p className="body">{d.body}</p>
            </li>
          ))}
        </ol>
      </section>

      <section className="cs-system frame" aria-labelledby="system-title">
        <h2 id="system-title" className="mono muted" data-reveal="fade">
          System
        </h2>
        <ul className="cs-palette">
          {data.palette.map((c, i) => (
            <li key={c.hex} data-reveal="fade" data-delay={String(i * 0.06)}>
              <span className="cs-palette__chip" style={{ background: c.hex }} />
              <span className="mono">{c.name}</span>
              <span className="mono muted">{c.hex}</span>
            </li>
          ))}
        </ul>
        <div className="cs-type" data-reveal="fade">
          <p className="cs-type__sample">{data.type.sample}</p>
          <p className="mono muted">
            {data.type.name} · {data.type.note}
          </p>
        </div>
      </section>

      <TransitionLink href={`/work/${next.slug}`} title={next.title} label={next.kind} className="cs-next frame" data-scene="wordmark">
        <span className="mono muted">Next project</span>
        <span className="cs-next__title">
          <Roll>{next.title}</Roll>
        </span>
        <span className="mono muted">
          {next.kind} · {next.sector}
        </span>
      </TransitionLink>
    </>
  );
}
