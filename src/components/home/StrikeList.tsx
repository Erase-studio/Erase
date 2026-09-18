"use client";

import { useEffect, useRef } from "react";

/** A list the pencil crosses out, one line after another, when it scrolls into view. */
export function StrikeList({ items }: { items: string[] }) {
  const ref = useRef<HTMLUListElement>(null);
  useEffect(() => {
    const ul = ref.current!;
    const io = new IntersectionObserver(
      ([e]) => {
        if (!e.isIntersecting) return;
        ul.dataset.struck = "true";
        io.disconnect();
      },
      { rootMargin: "0px 0px -25% 0px" },
    );
    io.observe(ul);
    return () => io.disconnect();
  }, []);
  return (
    <ul ref={ref} className="strike" data-struck="false">
      {items.map((t, i) => (
        <li key={t} style={{ "--i": i } as React.CSSProperties}>
          <span>{t}</span>
        </li>
      ))}
    </ul>
  );
}
