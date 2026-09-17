import type { Metadata } from "next";
import { principles, stack } from "@/content/agency";
import { site } from "@/content/site";
import { PageHead } from "@/components/site/PageHead";

export const metadata: Metadata = {
  title: "Studio",
  description: "Erase is an independent design and development studio. How we work, what we believe, and what we build with.",
  alternates: { canonical: "/studio" },
};

export default function StudioPage() {
  return (
    <main id="main">
      <PageHead
        index="(Index) Studio"
        title="Studio"
        scene="studio"
        lede="Erase is an independent design and development studio. We design, build and grow websites for brands that don’t want to look like anyone else."
      />

      <section className="princ frame" data-scene="quiet" aria-labelledby="princ-title">
        <header className="princ__head">
          <p className="mono muted" data-reveal="fade">
            How we work
          </p>
          <h2 id="princ-title" className="h2" data-reveal="lines">
            Four rules we don’t bend.
          </h2>
        </header>
        <ol className="princ__grid">
          {principles.map((p, i) => (
            <li key={p.title} data-reveal="fade" data-delay={String(i * 0.06)}>
              <span className="mono princ__num">{String(i + 1).padStart(2, "0")}</span>
              <h3 className="h3">{p.title}</h3>
              <p className="body">{p.body}</p>
            </li>
          ))}
        </ol>
      </section>

      <section className="kit frame" data-scene="quietNight" aria-labelledby="kit-title">
        <p id="kit-title" className="mono muted" data-reveal="fade">
          What we build with
        </p>
        <ul className="kit__list">
          {stack.map((s, i) => (
            <li key={s} data-reveal="fade" data-delay={String(i * 0.04)}>
              {s}
            </li>
          ))}
        </ul>
        <p className="mono muted kit__note" data-reveal="fade">
          Independent · Based in {site.based} · Working worldwide
        </p>
      </section>
    </main>
  );
}
