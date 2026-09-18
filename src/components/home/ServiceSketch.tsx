"use client";

import { useEffect } from "react";
import { sound } from "@/lib/sound";

/**
 * A pencil sketch for each service, drawn stroke by stroke when it appears
 * (every element has pathLength=1 and a delay index --d), with the sound of the
 * pencil while it draws.
 */

const d = (i: number) => ({ pathLength: 1, style: { "--d": i } as React.CSSProperties });

const SKETCHES: Record<string, React.ReactNode> = {
  strategy: (
    <>
      <rect x="130" y="18" width="60" height="30" rx="4" {...d(0)} />
      <path d="M160 48v20M70 68h180M70 68v20M160 68v20M250 68v20" {...d(1)} />
      <rect x="40" y="88" width="60" height="28" rx="4" {...d(2)} />
      <rect x="130" y="88" width="60" height="28" rx="4" {...d(3)} />
      <rect x="220" y="88" width="60" height="28" rx="4" {...d(4)} />
      <path d="M48 134h44M48 146h30M138 134h44M138 146h36M228 134h44M228 146h24" {...d(5)} />
      <ellipse className="sk-blue" cx="160" cy="102" rx="44" ry="26" {...d(6)} />
      <path d="M210 170q30 8 60-4" {...d(7)} />
    </>
  ),
  ux: (
    <>
      <rect x="40" y="18" width="240" height="164" rx="10" {...d(0)} />
      <path d="M40 42h240" {...d(1)} />
      <path d="M60 64h110M60 84h80" {...d(2)} />
      <rect className="sk-blue" x="60" y="108" width="74" height="24" rx="12" {...d(3)} />
      <rect x="196" y="62" width="64" height="72" rx="4" {...d(4)} />
      <path d="M196 62l64 72M260 62l-64 72" {...d(5)} />
      <path d="M60 156h200" {...d(6)} />
      <path className="sk-blue" d="M142 124v26l7-7 6 13 5-2-6-13h10z" {...d(7)} />
    </>
  ),
  "art-direction": (
    <>
      <path d="M52 132l30-86 30 86M64 102h36" {...d(0)} />
      <path d="M150 100c-20-14-40 0-34 18s32 12 34-4v20M150 100v34" {...d(1)} />
      <circle className="sk-fill sk-ink" cx="208" cy="60" r="16" {...d(2)} />
      <circle className="sk-fill sk-blue" cx="250" cy="60" r="16" {...d(3)} />
      <circle cx="229" cy="100" r="16" {...d(4)} />
      <path className="sk-blue" d="M40 176c50-60 110 20 180-40" {...d(5)} />
      <path d="M40 176l20-30M220 136l24-18" {...d(6)} />
      <rect x="56" y="140" width="8" height="8" {...d(7)} />
      <rect x="240" y="114" width="8" height="8" {...d(7)} />
    </>
  ),
  motion: (
    <>
      <path d="M30 168h260" {...d(0)} />
      <path d="M36 168q34-150 70 0q26-96 52 0q20-56 40 0q14-28 28 0" {...d(1)} />
      <circle className="sk-fill sk-blue" cx="258" cy="152" r="14" {...d(2)} />
      <path d="M222 140h-18M226 152h-26M222 164h-18" {...d(3)} />
      <rect x="40" y="26" width="46" height="22" rx="5" {...d(4)} />
      <path d="M66 26v22" {...d(5)} />
      <path d="M96 40c20-6 34 2 44 14" {...d(6)} />
    </>
  ),
  development: (
    <>
      <path d="M112 44l-56 56 56 56" {...d(0)} />
      <path d="M208 44l56 56-56 56" {...d(1)} />
      <path className="sk-blue" d="M180 32l-40 136" {...d(2)} />
      <path d="M40 186h60" {...d(3)} />
      <rect className="sk-fill sk-ink" x="106" y="180" width="12" height="8" {...d(4)} />
    </>
  ),
  growth: (
    <>
      <path d="M44 20v152h250" {...d(0)} />
      <path d="M44 132h250M44 92h250M44 52h250" {...d(1)} />
      <path className="sk-blue" d="M50 158l40-18 34 10 44-44 40-12 44-52" {...d(2)} />
      <path className="sk-blue" d="M234 42l18 0 0 18" {...d(3)} />
      <circle cx="116" cy="70" r="22" {...d(4)} />
      <path d="M132 86l20 20" {...d(5)} />
    </>
  ),
};

export function ServiceSketch({ id, className = "" }: { id: string; className?: string }) {
  // The pencil is heard while it draws (about a second).
  useEffect(() => {
    if (!document.documentElement.classList.contains("motion")) return;
    const t0 = performance.now();
    let raf = 0;
    const tick = () => {
      const t = performance.now() - t0;
      if (t > 950) return;
      sound.write(260 + Math.abs(Math.sin(t / 70)) * 420);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [id]);

  return (
    <svg className={`sk ${className}`} viewBox="0 0 320 200" aria-hidden="true" focusable="false">
      {SKETCHES[id]}
    </svg>
  );
}
