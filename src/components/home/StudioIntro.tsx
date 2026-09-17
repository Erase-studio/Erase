import { TransitionLink } from "@/components/system/TransitionLink";
import { Roll } from "@/components/ui/Roll";

const crafts = ["Strategy", "Art direction", "Interface design", "Motion & 3D", "Development"];

/** Daylight. The dust has gathered into one form beside the studio's short account of itself. */
export function StudioIntro() {
  return (
    <section className="intro frame" data-scene="form" aria-labelledby="intro-title">
      <div className="intro__text">
        <p className="mono muted" data-reveal="fade">
          (02) The studio
        </p>
        <h2 id="intro-title" className="h2" data-reveal="lines">
          Strategy, design and code. One small studio, start to finish.
        </h2>
        <p className="body" data-reveal="fade" data-delay="0.15">
          No handoffs, no themes, no page builders. Every site is drawn for one brand and built by hand, so it loads fast and
          stays yours.
        </p>
        <ul className="intro__crafts" data-reveal="fade" data-delay="0.25">
          {crafts.map((c) => (
            <li key={c} className="mono">
              {c}
            </li>
          ))}
        </ul>
        <div data-reveal="fade" data-delay="0.35">
          <TransitionLink href="/studio" title="Studio" className="pill">
            <Roll>About the studio</Roll>
            <span className="pill__arrow" aria-hidden="true">
              →
            </span>
          </TransitionLink>
        </div>
      </div>
    </section>
  );
}
