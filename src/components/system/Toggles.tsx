"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { sound } from "@/lib/sound";
import { Roll } from "@/components/ui/Roll";

/** Sound on/off. Four bars that dance while it's on. `label` adds words. */
export function SoundToggle({ label = false, className = "" }: { label?: boolean; className?: string }) {
  const [on, setOn] = useState(false);
  useEffect(() => sound.subscribe(setOn), []);
  return (
    <button
      type="button"
      className={`pill ${label ? "" : "pill--icon"} ${className}`}
      aria-pressed={on}
      aria-label={label ? undefined : "Sound"}
      title={on ? "Sound off" : "Sound on"}
      onClick={() => sound.toggle()}
    >
      <span className="snd" data-on={on} aria-hidden="true">
        <i />
        <i />
        <i />
        <i />
      </span>
      {label && <Roll>{on ? "Sound on" : "Sound off"}</Roll>}
    </button>
  );
}

type Theme = "light" | "dark";

/** Day / night. The new look wipes out in a circle from the button. */
export function ThemeToggle() {
  const theme = useSyncExternalStore<Theme>(
    (cb) => {
      window.addEventListener("erase:theme", cb);
      return () => window.removeEventListener("erase:theme", cb);
    },
    () => (document.documentElement.dataset.theme === "dark" ? "dark" : "light"),
    () => "light",
  );

  const apply = (next: Theme) => {
    document.documentElement.dataset.theme = next;
    try {
      localStorage.setItem("erase:theme", next);
    } catch {}
    window.dispatchEvent(new Event("erase:theme"));
  };

  const onClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    const next: Theme = theme === "dark" ? "light" : "dark";
    sound.tick();
    const doc = document as Document & { startViewTransition?: (cb: () => void) => { ready: Promise<void> } };
    if (!doc.startViewTransition || !document.documentElement.classList.contains("motion")) return apply(next);
    const b = e.currentTarget.getBoundingClientRect();
    const x = e.clientX || b.left + b.width / 2;
    const y = e.clientY || b.top + b.height / 2;
    const r = Math.hypot(Math.max(x, innerWidth - x), Math.max(y, innerHeight - y));
    const vt = doc.startViewTransition(() => apply(next));
    vt.ready.then(() => {
      document.documentElement.animate(
        { clipPath: [`circle(0px at ${x}px ${y}px)`, `circle(${r}px at ${x}px ${y}px)`] },
        { duration: 900, easing: "cubic-bezier(0.76, 0, 0.24, 1)", pseudoElement: "::view-transition-new(root)" },
      );
    });
  };

  return (
    <button
      type="button"
      className="pill pill--icon"
      aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
      title={theme === "dark" ? "Lights on" : "Lights off"}
      onClick={onClick}
    >
      <span className="thm" data-theme={theme} aria-hidden="true" />
    </button>
  );
}
