"use client";

import { useEffect, useRef, useSyncExternalStore } from "react";
import { site } from "@/content/site";
import { Mark } from "@/components/ui/Mark";

/** What time it is at the studio, ticking every 20 s (blank on the server). */
export function StudioClock() {
  const stamp = useSyncExternalStore(
    (cb) => {
      const t = window.setInterval(cb, 20000);
      return () => window.clearInterval(t);
    },
    () => Math.floor(Date.now() / 20000),
    () => 0,
  );
  const time = stamp
    ? new Intl.DateTimeFormat("en-GB", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Kathmandu" }).format(new Date(stamp * 20000))
    : "--:--";
  return (
    <p className="fb__time">
      {time}
      <span className="mono muted"> {site.based}</span>
    </p>
  );
}

export function BackToTop() {
  return (
    <button
      type="button"
      className="fb__top-btn mono"
      onClick={() => (window.__lenis ? window.__lenis.scrollTo(0, { duration: 1.8 }) : window.scrollTo({ top: 0, behavior: "smooth" }))}
    >
      Back to top ↑
    </button>
  );
}

/** The giant wordmark: its letters rise into view, and the eraser leans on the end of it. */
export function FooterWord() {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current!;
    const io = new IntersectionObserver(
      ([e]) => {
        if (!e.isIntersecting) return;
        el.dataset.in = "true";
        io.disconnect();
      },
      { rootMargin: "0px 0px -10% 0px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return (
    <div ref={ref} className="fb__word" data-in="false" aria-hidden="true">
      <span className="fb__letters">
        {"Erase".split("").map((c, i) => (
          <span key={i} style={{ "--i": i } as React.CSSProperties}>
            {c}
          </span>
        ))}
      </span>
      <span className="fb__mark">
        <Mark size={400} alive />
      </span>
    </div>
  );
}
