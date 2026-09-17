import type { ReactNode } from "react";
import { EraseReveal } from "@/components/erase/EraseReveal";

/** The opening of every inner page: breadcrumb, a huge erased-in title, one line of intro. */
export function PageHeader({
  crumb,
  title,
  intro,
  children,
}: {
  crumb: string;
  title: string;
  intro: string;
  children?: ReactNode;
}) {
  return (
    <section className="grain phead" data-chapter="page" data-chapter-label={crumb} data-theme="dark">
      <div className="frame">
        <p className="t-label text-smudge phead__crumb">
          Erase <span aria-hidden="true">/</span> {crumb}
        </p>
        <EraseReveal cover="graphite" as="span" className="phead__title-wrap">
          <h1 className="t-mega phead__title">{title}</h1>
        </EraseReveal>
        <div className="phead__foot">
          <p className="phead__intro">{intro}</p>
          {children}
        </div>
      </div>
    </section>
  );
}
