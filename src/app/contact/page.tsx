import type { Metadata } from "next";
import { Suspense } from "react";
import { site } from "@/content/site";
import { PageHead } from "@/components/site/PageHead";
import { BriefForm } from "@/components/site/BriefForm";

export const metadata: Metadata = {
  title: "Start a project",
  description: "Tell Erase about your website project: scope, budget and timeline.",
  alternates: { canonical: "/contact" },
};

export default function ContactPage() {
  return (
    <main id="main">
      <PageHead
        index="(Index) Contact"
        title="Let’s talk"
        scene="contact"
        lede="Tell us what you’re building. We read every brief and reply with next steps, not a sales script."
      >
        <p className="avail mono">
          <i aria-hidden="true" />
          {site.availability}
        </p>
      </PageHead>

      <section className="brief frame" data-scene="quiet" aria-label="Project brief">
        <dl className="brief__side" data-reveal="fade">
          <div>
            <dt className="mono muted">Email</dt>
            <dd>
              <a href={`mailto:${site.email}`}>{site.email}</a>
            </dd>
          </div>
          <div>
            <dt className="mono muted">What happens next</dt>
            <dd>An intro call, a clear proposal, then we start.</dd>
          </div>
          <div>
            <dt className="mono muted">Working with</dt>
            <dd>Brands and businesses worldwide</dd>
          </div>
        </dl>
        <Suspense>
          <BriefForm />
        </Suspense>
      </section>
    </main>
  );
}
