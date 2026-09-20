"use client";

import { useEffect, useId, useRef } from "react";

/**
 * The Erase mark: the eraser character from the site, flattened. Soft white
 * rubber with a face (glossy eyes, blue cheeks, a small smile), the black
 * "Erase" sleeve with its blue stripe. When `alive`, its eyes follow the
 * cursor and it blinks now and then.
 */
export function Mark({ size = 64, alive = false, className = "" }: { size?: number; alive?: boolean; className?: string }) {
  const ref = useRef<SVGSVGElement>(null);
  const id = useId().replace(/:/g, "");

  useEffect(() => {
    if (!alive) return;
    const svg = ref.current!;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let raf = 0;
    let tx = 0;
    let ty = 0;
    const onMove = (e: PointerEvent) => {
      const b = svg.getBoundingClientRect();
      const dx = e.clientX - (b.left + b.width * 0.28);
      const dy = e.clientY - (b.top + b.height * 0.45);
      const d = Math.max(1, Math.hypot(dx, dy));
      const k = Math.min(1, d / 260);
      tx = (dx / d) * 2.4 * k;
      ty = (dy / d) * 1.8 * k;
      if (!raf)
        raf = requestAnimationFrame(() => {
          raf = 0;
          svg.style.setProperty("--lx", `${tx.toFixed(2)}px`);
          svg.style.setProperty("--ly", `${ty.toFixed(2)}px`);
        });
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    return () => {
      window.removeEventListener("pointermove", onMove);
      cancelAnimationFrame(raf);
    };
  }, [alive]);

  return (
    <svg
      ref={ref}
      className={`mark ${alive ? "mark--alive" : ""} ${className}`}
      width={size}
      height={(size * 56) / 100}
      viewBox="0 0 100 56"
      aria-hidden="true"
      focusable="false"
    >
      <defs>
        <linearGradient id={`${id}r`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#fdfcf8" />
          <stop offset="1" stopColor="#e4e2da" />
        </linearGradient>
        <linearGradient id={`${id}s`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#2a2c31" />
          <stop offset="0.35" stopColor="#141517" />
          <stop offset="1" stopColor="#0c0d0f" />
        </linearGradient>
      </defs>
      {/* Rubber */}
      <rect className="mark__rubber" x="3" y="7" width="54" height="43" rx="11" fill={`url(#${id}r)`} stroke="#141517" strokeWidth="2" />
      {/* Sleeve, a touch taller than the rubber, with its stripe */}
      <g className="mark__sleeve">
        <rect x="47" y="4.5" width="50" height="48" rx="5" fill={`url(#${id}s)`} />
        <path d="M47 43h50v4.5a5 5 0 0 1-5 5H47z" fill="#4d6bff" />
        <path d="M49 6.5h44" stroke="#fff" strokeOpacity=".16" strokeWidth="1.2" strokeLinecap="round" />
        <text x="72" y="33.5" textAnchor="middle" fontSize="17.5" fontWeight="700" letterSpacing="-0.9" fill="#f4f3ee">
          Erase
        </text>
      </g>
      {/* Face */}
      <g className="mark__face">
        <g className="mark__eye">
          <ellipse cx="19.5" cy="23.5" rx="3.7" ry="5.2" fill="#141517" />
          <circle cx="18.3" cy="21.4" r="1.25" fill="#fff" />
        </g>
        <g className="mark__eye">
          <ellipse cx="34.5" cy="23.5" rx="3.7" ry="5.2" fill="#141517" />
          <circle cx="33.3" cy="21.4" r="1.25" fill="#fff" />
        </g>
        <path d="M22 34q5 5.2 10 0" fill="none" stroke="#141517" strokeWidth="2.3" strokeLinecap="round" />
        <ellipse cx="12.5" cy="32.5" rx="3.8" ry="2.1" fill="#7d93ff" opacity=".8" />
        <ellipse cx="41.5" cy="32.5" rx="3.8" ry="2.1" fill="#7d93ff" opacity=".8" />
      </g>
    </svg>
  );
}
