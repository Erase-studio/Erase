import { TransitionLink } from "@/components/system/TransitionLink";
import { Roll } from "@/components/ui/Roll";
import { StrikeList } from "./StrikeList";

/** Where the pencil first touches the page: it strikes out "generic". */
export function Statement() {
  return (
    <section className="st frame" data-sound="statement" aria-labelledby="st-title">
      <h2 id="st-title" className="st__title" data-warp data-reveal="lines">
        Nothing{" "}
        <span className="st__strike" data-line="-0.05,0.58,0;0.35,0.5,40;0.7,0.56,-20;1.05,0.47,0">
          generic
        </span>
        <br />
        survives here.
      </h2>
      <div className="st__side">
        <p className="mono muted">What doesn’t make it</p>
        <StrikeList items={["Stock photos of handshakes", "“Innovative solutions”", "Three-card feature grids", "Hero sliders", "Lorem ipsum"]} />
        <p className="st__keep">
          What does: <em>one idea</em>, drawn for one brand and built by hand.
        </p>
        <div data-reveal="fade" data-delay="0.2">
          <TransitionLink href="/studio" title="Studio" className="pill">
            <Roll>Our approach</Roll>
            <i className="pill__dot" aria-hidden="true" />
          </TransitionLink>
        </div>
      </div>
    </section>
  );
}
