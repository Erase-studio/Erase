"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

/**
 * Keeps the page-wide switches true for the life of the visit.
 *
 * The inline boot script sets them before first paint. This makes sure they
 * stay set: if anything ever re-renders <html> and strips its classes, or the
 * visitor changes their motion setting while the page is open, the pinned
 * scenes follow the real preference instead of silently falling back to
 * their still layout. It also points the phone's browser bar at the theme.
 */
export function Flags() {
  const pathname = usePathname();

  useEffect(() => {
    const html = document.documentElement;
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => {
      html.classList.toggle("motion", !mq.matches);
      const meta = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]');
      meta?.setAttribute("content", html.dataset.theme === "light" ? "#ecebe6" : "#000000");
    };
    sync();
    mq.addEventListener("change", sync);
    // Anything that rewrites the class list gets undone on the next frame.
    const watch = new MutationObserver(() => {
      if (html.classList.contains("motion") === mq.matches) sync();
    });
    watch.observe(html, { attributes: true, attributeFilter: ["class", "data-theme"] });
    return () => {
      mq.removeEventListener("change", sync);
      watch.disconnect();
    };
  }, [pathname]);

  return null;
}
