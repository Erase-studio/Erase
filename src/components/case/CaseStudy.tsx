import type { Work } from "@/content/work";
import type { CaseStudy as CaseData } from "@/content/cases";
import { work } from "@/content/work";
import { PreviewFrame } from "@/components/work/PreviewFrame";
import { TransitionLink } from "@/components/system/TransitionLink";
import { Roll } from "@/components/ui/Roll";
import { CaseReel } from "./CaseReel";

/**
 * A case study in three moves: the project and its site on one screen, the
 * story on one held screen that a short scroll turns (CaseReel), and the next.
 */
export function CaseStudy({ item, data, next, index }: { item: Work; data: CaseData; next: Work; index: number }) {
  const n = (v: number) => String(v).padStart(2, "0");
  return (
    <>
      <header className="cs-hero frame">
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

        <div className="cs-hero__grid">
          <div className="cs-hero__text">
            <h1 className="cs-hero__title" data-warp data-reveal="lines" data-delay="0.1">
              {item.title}
            </h1>
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
          <div className="cs-hero__shot" data-reveal="fade" data-delay="0.2" aria-label={`${item.title} preview`}>
            <PreviewFrame item={item} interactive={false} />
            {item.kind === "Concept study" && <p className="mono muted cs-hero__note">Concept study: designed and built by Erase without a client, to show range.</p>}
          </div>
        </div>
      </header>

      <CaseReel data={data} />

      <TransitionLink href={`/work/${next.slug}`} title={next.title} label={next.kind} className="cs-next frame">
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
