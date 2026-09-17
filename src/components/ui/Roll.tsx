/**
 * Text whose letters roll up to a copy of themselves when its link or button is hovered.
 * Screen readers get the plain string.
 */
export function Roll({ children, className = "" }: { children: string; className?: string }) {
  return (
    <>
      <span className="sr-only">{children}</span>
      <span className={`roll ${className}`} aria-hidden="true">
        {children.split("").map((c, i) => (
          <span key={i} className="roll__c" style={{ "--i": i } as React.CSSProperties}>
            {c}
          </span>
        ))}
      </span>
    </>
  );
}
