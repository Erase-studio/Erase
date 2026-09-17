import { Magnetic } from "@/components/ui/Magnetic";
import { EraseReveal } from "@/components/erase/EraseReveal";
import { TransitionLink } from "@/components/system/TransitionLink";

export function CtaBand({ title = "Have a project in mind?" }: { title?: string }) {
  return (
    <section className="grain ctaband" data-chapter="cta" data-chapter-label="Start a project" data-theme="dark">
      <div className="frame ctaband__inner">
        <EraseReveal cover="graphite" as="span">
          <h2 className="t-h2 ctaband__title">{title}</h2>
        </EraseReveal>
        <Magnetic strength={0.3}>
          <TransitionLink href="/contact" title="Start a project" className="send" data-cursor-label="Let’s talk">
            Start a project →
          </TransitionLink>
        </Magnetic>
      </div>
    </section>
  );
}
