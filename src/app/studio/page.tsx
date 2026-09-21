import type { Metadata } from "next";
import { stack } from "@/content/agency";
import { site } from "@/content/site";
import { Rules } from "@/components/studio/Rules";
import { Ledger } from "@/components/studio/Ledger";

export const metadata: Metadata = {
  title: "Studio",
  description: "Erase is an independent design and development studio. How we work, what we believe, and what we build with.",
  alternates: { canonical: "/studio" },
};

export default function StudioPage() {
  return (
    <main id="main">
      <header className="sh frame">
        <div className="sh__top">
          <p className="mono muted" data-reveal="fade" data-delay="0.2">
            (Index) Studio
          </p>
          <p className="mono muted" data-reveal="fade" data-delay="0.3">
            Independent, {site.based}
          </p>
        </div>
        <div className="sh__row">
          <h1 className="sh__title" data-warp data-reveal="lines" data-delay="0.1">
            We start where the template ends.
          </h1>
          <p className="lede sh__lede" data-reveal="fade" data-delay="0.35">
            Erase is an independent design and development studio. We design, build and grow websites for brands that don’t want to look like anyone else.
          </p>
        </div>
      </header>

      <section className="princ frame" aria-labelledby="princ-title">
        <header className="princ__head">
          <p className="mono muted" data-reveal="fade">
            How we work
          </p>
          <h2 id="princ-title" className="h2" data-warp data-reveal="lines">
            Four rules we don’t bend.
          </h2>
        </header>
        <Rules />
      </section>

      <Ledger />

      <section className="kit frame" aria-labelledby="kit-title">
        <p id="kit-title" className="mono muted" data-reveal="fade">
          What we build with
        </p>
        <p className="kit__list" data-warp data-reveal="lines">
          {stack.join(" / ")}
        </p>
        <p className="mono muted kit__note" data-reveal="fade">
          Independent, based in {site.based}, working worldwide
        </p>
      </section>
    </main>
  );
}
