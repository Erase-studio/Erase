import type { Metadata } from "next";
import { Suspense } from "react";
import { Letter } from "@/components/contact/Letter";
import { Desk } from "@/components/contact/Desk";

export const metadata: Metadata = {
  title: "Write to us",
  description: "Start a website project with Erase. Fill in a short letter: who you are, what you need, budget and timing.",
  alternates: { canonical: "/contact" },
};

export default function ContactPage() {
  return (
    <main id="main" className="ct">
      <section className="ct__wrap frame" aria-labelledby="ct-title">
        <header className="ct__side">
          <p className="mono muted" data-reveal="fade" data-delay="0.2">
            (Contact) Write to us
          </p>
          <h1 id="ct-title" className="ct__title" data-warp data-reveal="lines" data-delay="0.1">
            No forms.
            <br />
            Write us a letter.
          </h1>
          <p className="lede ct__lede" data-reveal="fade" data-delay="0.3">
            Fill in the blanks. It goes straight to the people who’ll do the work, and we answer every one.
          </p>
          <div className="ct__foot" data-reveal="fade" data-delay="0.4">
            <Desk />
          </div>
        </header>
        <Suspense>
          <Letter />
        </Suspense>
      </section>
    </main>
  );
}
