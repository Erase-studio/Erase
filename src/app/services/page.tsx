import type { Metadata } from "next";
import { services, stack } from "@/content/agency";
import { PageHeader } from "@/components/agency/PageHeader";
import { Engagements } from "@/components/agency/Engagements";
import { Faq } from "@/components/agency/Faq";
import { CtaBand } from "@/components/agency/CtaBand";
import { Inside, Skin } from "@/components/chapters/Inside";
import { EraseReveal } from "@/components/erase/EraseReveal";

export const metadata: Metadata = {
  title: "Services",
  description:
    "Strategy, UX, art direction, motion, development and growth. Everything a high-performance website needs, from one agency.",
  alternates: { canonical: "/services" },
};

export default function ServicesPage() {
  return (
    <main id="main">
      <PageHeader
        crumb="Services"
        title="Services."
        intro="Six disciplines, one team. We take a website from the first workshop to launch, and keep it improving after."
      >
        <ul className="stack" aria-label="Tools we build with">
          {stack.slice(0, 5).map((s) => (
            <li key={s}>{s}</li>
          ))}
        </ul>
      </PageHeader>

      <section className="grain sdet" data-chapter="services-detail" data-chapter-label="Services" data-theme="dark">
        <div className="frame">
          {services.map((s, i) => (
            <article key={s.id} id={s.id} className="sdet__row">
              <div>
                <p className="t-label sdet__num">{String(i + 1).padStart(2, "0")} / 06</p>
                <h2 className="sdet__name">{s.name}</h2>
                <p className="sdet__short">{s.short}</p>
                <ul className="sdet__list">
                  {s.deliverables.map((d) => (
                    <li key={d}>{d}</li>
                  ))}
                </ul>
              </div>
              <EraseReveal cover="graphite" className="sdet__visual">
                <div className="skin-box">
                  <Skin i={s.skin} />
                </div>
              </EraseReveal>
            </article>
          ))}
        </div>
      </section>

      <Inside />
      <Engagements />
      <Faq />
      <CtaBand />
    </main>
  );
}
