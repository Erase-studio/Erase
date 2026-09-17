import type { ElementType } from "react";

/**
 * Hand-set line breaks for display type. Breaking by hand is deliberate:
 * automatic wrapping never puts the weight where the sentence needs it.
 * The full sentence is exposed once to assistive tech.
 */
export function Lines({
  lines,
  as: Tag = "h2",
  className,
  id,
}: {
  lines: string[];
  as?: ElementType;
  className?: string;
  id?: string;
}) {
  return (
    <Tag className={className} id={id} aria-label={lines.join(" ")}>
      {lines.map((line, i) => (
        <span key={i} className="reveal-line" aria-hidden="true">
          <span>{line}</span>
        </span>
      ))}
    </Tag>
  );
}
