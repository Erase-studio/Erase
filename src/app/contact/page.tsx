import type { Metadata } from "next";
import { Suspense } from "react";
import { site } from "@/content/site";
import { PageHeader } from "@/components/agency/PageHeader";
import { BriefForm } from "@/components/agency/BriefForm";

export const metadata: Metadata = {
  title: "Start a project",
  description: "Tell Erase about your website project: scope, budget and timeline.",
  alternates: { canonical: "/contact" },
};

export default function ContactPage() {
  return (
    <main id="main">
      <PageHeader
        crumb="Contact"
        title="Let’s talk."
        intro="Tell us what you’re building. We read every brief and reply with next steps, not a sales script."
      >
        <p className="avail">
          <i aria-hidden="true" />
          {site.availability}
        </p>
      </PageHeader>

      <section className="grain brief" data-chapter="brief" data-chapter-label="Project brief" data-theme="dark">
        <div className="frame brief__grid">
          <dl className="brief__side">
            <div>
              <dt className="t-label text-smudge">Email</dt>
              <dd>
                <a href={`mailto:${site.email}`} className="ink-link">
                  {site.email}
                </a>
              </dd>
            </div>
            <div>
              <dt className="t-label text-smudge">What happens next</dt>
              <dd>An intro call, a clear proposal, then we start.</dd>
            </div>
            <div>
              <dt className="t-label text-smudge">Working with</dt>
              <dd>Brands and businesses worldwide</dd>
            </div>
          </dl>
          <Suspense>
            <BriefForm />
          </Suspense>
        </div>
      </section>
    </main>
  );
}
