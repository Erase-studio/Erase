import type { Metadata } from "next";
import { principles, stack } from "@/content/agency";
import { site } from "@/content/site";
import { PageHeader } from "@/components/agency/PageHeader";
import { CtaBand } from "@/components/agency/CtaBand";
import { EraseReveal } from "@/components/erase/EraseReveal";
import { Tapes } from "@/components/chapters/Tapes";

export const metadata: Metadata = {
  title: "Studio",
  description: "Erase is an independent web design and development agency. How we work, what we believe, and what we build with.",
  alternates: { canonical: "/studio" },
};

export default function StudioPage() {
  return (
    <main id="main">
      <PageHeader
        crumb="Studio"
        title="Studio."
        intro="Erase is an independent web design and development agency. We partner with brands to design, build and grow websites that perform."
      />

      <Tapes />

      <section className="chapter-light grain princ" data-chapter="principles" data-chapter-label="Principles" data-theme="light">
        <div className="frame">
          <EraseReveal cover="sheet" as="span">
            <h2 className="t-h2" style={{ paddingTop: "clamp(120px, 20vw, 300px)" }}>
              How we
              <br />
              work.
            </h2>
          </EraseReveal>
          <ul className="princ__grid">
            {principles.map((p, i) => (
              <li key={p.title} className="princ__item">
                <span className="t-label text-pencil">{String(i + 1).padStart(2, "0")}</span>
                <h3>{p.title}</h3>
                <p>{p.body}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="grain studio-note" data-chapter="stack" data-chapter-label="Stack" data-theme="dark">
        <div className="frame grid gap-10 md:grid-cols-2 md:items-end">
          <div className="grid gap-6">
            <p className="t-label text-smudge">What we build with</p>
            <ul className="stack">
              {stack.map((s) => (
                <li key={s}>{s}</li>
              ))}
            </ul>
          </div>
          <p className="t-label text-smudge md:text-right">Independent · Based in {site.based} · Working worldwide</p>
        </div>
      </section>

      <CtaBand />
    </main>
  );
}
