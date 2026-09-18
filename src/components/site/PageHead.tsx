import type { ReactNode } from "react";

/** Opening screen of an inner page: a label, one very large word, a line of context. */
export function PageHead({
  index,
  title,
  lede,
  children,
}: {
  index: string;
  title: string;
  lede?: string;
  children?: ReactNode;
}) {
  return (
    <header className="ph frame">
      <p className="mono muted" data-reveal="fade" data-delay="0.2">
        {index}
      </p>
      <h1 className="ph__title" data-reveal="lines" data-delay="0.1" data-line="-0.05,0.7,0;0.3,1.12,70;0.72,1.02,0;1.05,1.2,0">
        {title}
      </h1>
      <div className="ph__row">
        {lede && (
          <p className="lede ph__lede" data-reveal="fade" data-delay="0.35">
            {lede}
          </p>
        )}
        {children && (
          <div className="ph__aside" data-reveal="fade" data-delay="0.45">
            {children}
          </div>
        )}
      </div>
    </header>
  );
}
