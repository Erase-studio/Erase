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
          <h1 id="ct-title" className="ct__title" data-reveal="lines" data-delay="0.1" data-line="1.04,0.5,0;0.7,1.07,60;0.3,1.0,0;-0.05,1.1,0"
            data-line-m="1.04,1.08,0;0.5,1.14,30;-0.03,1.1,0">
            No forms.
            <br />
            Write us a letter.
          </h1>
          <p className="lede" data-reveal="fade" data-delay="0.3">
            Fill in the blanks, as much or as little as you like. It comes straight to the two of us, and we answer every one.
          </p>
          <div data-reveal="fade" data-delay="0.4">
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
