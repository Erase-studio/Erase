import { TransitionLink } from "@/components/system/TransitionLink";
import { Roll } from "@/components/ui/Roll";

/** Where the pencil first touches the page. */
export function Statement() {
  return (
    <section className="st frame" aria-labelledby="st-title" data-line="-0.06,0.18,0;0.16,0.5,90;0.4,0.86,0;0.7,0.7,-60;0.9,0.98,40"
      data-line-m="-0.08,0.1,0;0.03,0.45,0;-0.03,0.8,0;0.5,1.02,0;1.08,0.96,0"
    >
      <h2 id="st-title" className="st__title" data-reveal="lines">
        Nothing generic
        <br />
        survives here.
      </h2>
      <div className="st__side">
        <p className="body" data-reveal="fade" data-delay="0.1">
          Strategy, design and code from one small studio. Every site is drawn for one brand and built by hand, so it loads fast,
          reads clearly and looks like nobody else.
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
