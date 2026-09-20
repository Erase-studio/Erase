"use client";

import { useEffect, useRef } from "react";
import { principles } from "@/content/agency";
import { sound } from "@/lib/sound";

/**
 * Four rules, each written over the thing it replaces. As a rule comes on
 * screen the usual way of doing it gets a pencil line through it.
 */
const INSTEAD = ["Three agencies and a handoff", "A theme with your logo on it", "Speed as an afterthought", "Scope that drifts"];

export function Rules() {
  const ref = useRef<HTMLOListElement>(null);

  useEffect(() => {
    const items = [...ref.current!.querySelectorAll<HTMLElement>(".law")];
    const io = new IntersectionObserver(
      (es) => {
        for (const e of es) {
          if (!e.isIntersecting) continue;
          const el = e.target as HTMLElement;
          el.dataset.struck = "true";
          window.setTimeout(() => sound.strike(), 380);
          io.unobserve(el);
        }
      },
      { rootMargin: "0px 0px -35% 0px" },
    );
    items.forEach((i) => io.observe(i));
    return () => io.disconnect();
  }, []);

  return (
    <ol ref={ref} className="rules">
      {principles.map((p, i) => (
        <li key={p.title} className="law">
          <span className="law__num mono">{String(i + 1).padStart(2, "0")}</span>
          <p className="law__not mono">
            <span>{INSTEAD[i]}</span>
          </p>
          <h3 className="law__title" data-warp>
            {p.title}
          </h3>
          <p className="law__body">{p.body}</p>
        </li>
      ))}
    </ol>
  );
}
