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
export function CaseStudy({
  item,
  data,
  next,
  index,
}: {
  item: Work;
  data: CaseData;
  next: Work;
  index: number;
}) {
  const n = (v: number) => String(v).padStart(2, "0");
  return (
    <>
      <header
        className="cs-hero frame"
        style={{ "--accent": item.tone.accent } as React.CSSProperties}
      >
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
            {item.award && (
              <p className="mono cs-award" data-reveal="fade">
                <i aria-hidden="true" />
                {item.award}
              </p>
            )}
            <h1
              className="cs-hero__title"
              data-warp
              data-reveal="lines"
              data-delay="0.1"
            >
              {item.title}
            </h1>
            <p
              className="lede cs-hero__lede"
              data-reveal="fade"
              data-delay="0.3"
            >
              {item.brief}
            </p>
            {(item.links.live || item.links.github) && (
              <div className="cs-links" data-reveal="fade" data-delay="0.35">
                {item.links.live && (
                  <a
                    className="pill pill--solid"
                    href={item.links.live}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <Roll>Open the live site</Roll>
                    <span className="pill__arrow" aria-hidden="true">
                      ↗
                    </span>
                  </a>
                )}
                {item.links.github && (
                  <a
                    className="pill"
                    href={item.links.github}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <Roll>Code on GitHub</Roll>
                    <span className="pill__arrow" aria-hidden="true">
                      ↗
                    </span>
                  </a>
                )}
              </div>
            )}
            <dl className="cs-meta" data-reveal="fade" data-delay="0.45">
              <div>
                <dt className="mono muted">Field</dt>
                <dd>{item.sector}</dd>
              </div>
              <div>
                <dt className="mono muted">Year</dt>
                <dd>{item.year}</dd>
              </div>
              <div className="cs-meta__wide">
                <dt className="mono muted">Built with</dt>
                <dd>{item.tags.join(", ")}</dd>
              </div>
            </dl>
          </div>
          <div
            className="cs-hero__shot"
            data-reveal="fade"
            data-delay="0.2"
            role="img"
            aria-label={`${item.title}, screenshot of the product`}
          >
            <PreviewFrame item={item} interactive priority />
          </div>
        </div>
      </header>

      <CaseReel data={data} item={item} />

      <TransitionLink
        href={`/work/${next.slug}`}
        title={next.title}
        label={next.kind}
        className="cs-next frame"
      >
        <span className="mono muted">Next project</span>
        <span className="cs-next__title">
          <Roll>{next.title}</Roll>
        </span>
        <span className="mono muted">
          {next.kind}, {next.sector}
        </span>
      </TransitionLink>
    </>
  );
}
