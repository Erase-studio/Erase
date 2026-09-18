import type { Metadata } from "next";
import { engagements, faqs, stack } from "@/content/agency";
import { PageHead } from "@/components/site/PageHead";
import { ServiceRows } from "@/components/home/ServiceRows";
import { Faq } from "@/components/site/Faq";
import { TransitionLink } from "@/components/system/TransitionLink";
import { Roll } from "@/components/ui/Roll";

export const metadata: Metadata = {
  title: "Services",
  description:
    "Strategy, interface design, art direction, motion and 3D, development and growth. Everything a website needs, from one studio.",
  alternates: { canonical: "/services" },
};

export default function ServicesPage() {
  return (
    <main id="main">
      <PageHead
        index="(Index) Services"
        title="Services"
        lede="Six disciplines, one small team. We take a website from the first workshop to launch, and keep improving it after."
      >
        <ul className="chips" aria-label="Tools we build with">
          {stack.map((s) => (
            <li key={s} className="mono">
              {s}
            </li>
          ))}
        </ul>
      </PageHead>

      <ServiceRows kicker="What we do" />

      <section className="eng frame" aria-labelledby="eng-title">
        <header className="eng__head">
          <p className="mono muted" data-reveal="fade">
            Ways to work together
          </p>
          <h2 id="eng-title" className="h2" data-reveal="lines">
            Three ways in.
          </h2>
        </header>
        <ol className="eng__grid">
          {engagements.map((e, i) => (
            <li key={e.id} className="eng__card" data-featured={e.featured ?? false} data-reveal="fade" data-delay={String(i * 0.08)}>
              <div className="eng__top">
                <span className="mono muted">0{i + 1}</span>
                <span className="mono">{e.timeline}</span>
              </div>
              <h3 className="eng__name">{e.name}</h3>
              <p className="mono muted">{e.for}</p>
              <p className="eng__summary">{e.summary}</p>
              <ul className="eng__list">
                {e.includes.map((x) => (
                  <li key={x}>{x}</li>
                ))}
              </ul>
              <TransitionLink href={`/contact?type=${e.id}`} title="Contact" className={`pill ${e.featured ? "pill--solid" : ""}`}>
                <Roll>{`Start a ${e.name.toLowerCase()}`}</Roll>
                <span className="pill__arrow" aria-hidden="true">
                  →
                </span>
              </TransitionLink>
            </li>
          ))}
        </ol>
      </section>

      <Faq items={faqs} />
    </main>
  );
}
