import { engagements } from "@/content/agency";
import { EraseReveal } from "@/components/erase/EraseReveal";
import { TransitionLink } from "@/components/system/TransitionLink";

/** Three clear ways to hire us. */
export function Engagements({ tone = "dark" }: { tone?: "dark" | "light" }) {
  return (
    <section
      id="engagements"
      className={`grain eng ${tone === "light" ? "chapter-light" : ""}`}
      data-chapter="engagements"
      data-chapter-label="Engagements"
      data-theme={tone}
      aria-labelledby="eng-title"
    >
      <div className="frame">
        <header className="eng__head">
          <EraseReveal cover={tone === "light" ? "sheet" : "graphite"} as="span">
            <h2 id="eng-title" className="t-h2">
              Ways to work
              <br />
              with us.
            </h2>
          </EraseReveal>
        </header>

        <ul className="eng__grid">
          {engagements.map((e) => (
            <li key={e.id} className="eng__card" data-featured={e.featured ?? false}>
              <div className="eng__top">
                <p className="t-label">{e.for}</p>
                {e.featured && <span className="eng__badge t-label">Most requested</span>}
              </div>
              <h3 className="eng__name">{e.name}</h3>
              <p className="eng__summary">{e.summary}</p>
              <ul className="eng__list">
                {e.includes.map((x) => (
                  <li key={x}>{x}</li>
                ))}
              </ul>
              <div className="eng__foot">
                <p>
                  <span className="t-label">Typical timeline</span>
                  <b>{e.timeline}</b>
                </p>
                <TransitionLink href={`/contact?type=${e.id}`} title="Start a project" className="eng__cta">
                  Start <span aria-hidden="true">→</span>
                  <span className="sr-only"> a {e.name} project</span>
                </TransitionLink>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
