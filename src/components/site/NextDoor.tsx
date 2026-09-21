"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { usePageTransition } from "@/components/system/PageTransition";
import { sound } from "@/lib/sound";

/**
 * The bottom of a page isn't the end of anything.
 *
 * Under the footer sits the next page's name and a line. Keep pushing once
 * you've hit the bottom — wheel, trackpad or thumb — and the line fills; fill
 * it and the site turns the page for you. Stop pushing and it drains back, so
 * nobody is taken anywhere they didn't mean to go. Clicking works too, and
 * with no JavaScript at all it is simply a link.
 */

const ORDER = [
  { href: "/", label: "Home", line: "Back to the start" },
  { href: "/work", label: "Work", line: "What we’ve drawn and built" },
  { href: "/services", label: "Services", line: "Everything a website needs" },
  { href: "/studio", label: "Studio", line: "How we work" },
  { href: "/contact", label: "Contact", line: "Write us a letter" },
];

/** How much pushing, in pixels of scroll, opens the door. */
const REACH = 620;

function nextFrom(pathname: string) {
  const here = pathname.startsWith("/work/") ? "/work" : pathname;
  const i = ORDER.findIndex((p) => p.href === here);
  return ORDER[(i < 0 ? 0 : i + 1) % ORDER.length];
}

export function NextDoor() {
  const pathname = usePathname();
  const next = nextFrom(pathname);
  const ref = useRef<HTMLDivElement>(null);
  const { navigate } = usePageTransition();

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    let push = 0;
    let going = false;
    let raf = 0;
    let lastTouch = 0;

    const atEnd = () => window.scrollY + window.innerHeight >= document.documentElement.scrollHeight - 4;

    const draw = () => {
      raf = 0;
      el.style.setProperty("--p", push.toFixed(3));
      el.dataset.armed = push > 0.02 ? "true" : "false";
    };
    const paint = () => {
      if (!raf) raf = requestAnimationFrame(draw);
    };

    const add = (dy: number) => {
      if (going) return;
      if (dy <= 0 || !atEnd()) return;
      push = Math.min(1, push + dy / REACH);
      paint();
      if (push >= 1) {
        going = true;
        sound.whoosh(0.8, 0.8);
        navigate(next.href, { title: next.label });
      }
    };

    const onWheel = (e: WheelEvent) => add(e.deltaY);
    const onTouch = (e: TouchEvent) => {
      const y = e.touches[0]?.clientY ?? 0;
      if (lastTouch) add((lastTouch - y) * 1.6);
      lastTouch = y;
    };
    const onTouchEnd = () => (lastTouch = 0);

    // Let go and it drains, so a stray flick never takes you anywhere.
    const drain = window.setInterval(() => {
      if (going || push <= 0) return;
      push = Math.max(0, push - 0.06);
      paint();
    }, 90);

    window.addEventListener("wheel", onWheel, { passive: true });
    window.addEventListener("touchmove", onTouch, { passive: true });
    window.addEventListener("touchend", onTouchEnd, { passive: true });
    return () => {
      window.clearInterval(drain);
      cancelAnimationFrame(raf);
      window.removeEventListener("wheel", onWheel);
      window.removeEventListener("touchmove", onTouch);
      window.removeEventListener("touchend", onTouchEnd);
    };
  }, [next.href, next.label, navigate]);

  return (
    <div ref={ref} className="nd frame" data-armed="false">
      <a
        href={next.href}
        className="nd__bar"
        onClick={(e) => {
          if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
          e.preventDefault();
          navigate(next.href, { title: next.label });
        }}
      >
        {/* Fills as you keep pushing past the bottom of the page. */}
        <svg className="nd__ring" viewBox="0 0 44 44" aria-hidden="true">
          <circle cx="22" cy="22" r="19" className="nd__track" />
          <circle cx="22" cy="22" r="19" className="nd__fill" pathLength="1" />
          <path d="M22 15v14M16 23l6 6 6-6" className="nd__down" />
        </svg>
        <span className="nd__text">
          <span className="mono muted nd__kicker">Keep scrolling for the next page</span>
          <span className="nd__title">{next.label}</span>
        </span>
        <span className="mono muted nd__line">{next.line}</span>
        <span className="nd__go" aria-hidden="true">
          →
        </span>
      </a>
    </div>
  );
}
