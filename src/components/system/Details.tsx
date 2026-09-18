"use client";

import { useEffect } from "react";
import { site } from "@/content/site";

/** Small things nobody asked for. */
export function Details() {
  useEffect(() => {
    // A note for whoever opens devtools.
    if (!(window as Window & { __eraseHello?: boolean }).__eraseHello) {
      (window as Window & { __eraseHello?: boolean }).__eraseHello = true;
      console.log(
        "%cErase%c\nHand-built by two people. No templates were harmed.\nLike reading source? " + site.email,
        "font: 800 28px/1.2 sans-serif; color:#3D63FF; letter-spacing:-1px",
        "font: 12px/1.6 monospace; color:#8B8E94",
      );
    }

    // Leave the tab and it notices.
    let original = document.title;
    const onVis = () => {
      if (document.hidden) {
        original = document.title;
        document.title = "Still erasing…";
      } else {
        document.title = original;
      }
    };
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, []);

  return null;
}
