import { TransitionLink } from "@/components/system/TransitionLink";
import { Roll } from "@/components/ui/Roll";

/**
 * A dark window full of the studio's tools: erasers, sleeves and pencils in a
 * floating heap you can shove around. The words sit above it, like a caption.
 */
export function Hero() {
  return (
    <section className="hero frame" data-sound="hero" aria-labelledby="hero-title">
      <div className="hero__head">
        <h1 id="hero-title" className="hero__title" data-reveal="lines" data-delay="0.6">
          We design and build websites that couldn’t belong to anyone else.
        </h1>
        <div className="hero__cta" data-reveal="fade" data-delay="0.9">
          <TransitionLink href="/contact" title="Contact" className="pill pill--solid">
            <Roll>Start a project</Roll>
            <i className="pill__dot" aria-hidden="true" />
          </TransitionLink>
        </div>
      </div>
      <div className="hero__window" data-view="hero">
        <p className="hero__tag mono">Erase · Independent studio</p>
        <p className="hero__hint mono">
          <span className="hero__hint-dot" aria-hidden="true" />
          Push it around · click to scatter
        </p>
      </div>
      <div className="hero__marks marks mono" aria-hidden="true">
        <i />
        <i />
        <span>Scroll to explore</span>
        <i />
        <i />
      </div>
    </section>
  );
}
