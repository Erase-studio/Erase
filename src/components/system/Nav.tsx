"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { chapters, navLinks, site } from "@/content/site";
import { work } from "@/content/work";
import { gsap } from "@/lib/gsap";
import { Magnetic } from "@/components/ui/Magnetic";
import { scrollToTarget } from "./SmoothScroll";
import { usePageTransition } from "./PageTransition";

type Chapter = { id: string; index: string; label: string };

export function Nav() {
  const pathname = usePathname();
  const isHome = pathname === "/";
  const { navigate } = usePageTransition();
  const [current, setCurrent] = useState<Chapter>(chapters[0]);
  const [theme, setTheme] = useState<"dark" | "light">("dark");
  const [open, setOpen] = useState(false);
  const [hidden, setHidden] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const toggleRef = useRef<HTMLButtonElement>(null);
  const labelRef = useRef<HTMLSpanElement>(null);

  // The chapter label scrambles into its new name, like it's being rewritten.
  useEffect(() => {
    const el = labelRef.current;
    if (!el || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const t = gsap.to(el, { duration: 0.6, scrambleText: { text: current.label, chars: "▮▯/\\_", speed: 0.7 }, ease: "none" });
    return () => {
      t.kill();
    };
  }, [current.label]);

  // Which chapter sits under the nav bar, and what colour it is.
  useEffect(() => {
    const probe = () => {
      const y = 36;
      // Deepest match wins, so a footer or sheet inside a section reports itself.
      const sections = Array.from(document.querySelectorAll<HTMLElement>("[data-chapter]"));
      let hit: HTMLElement | null = null;
      for (const s of sections) {
        const r = s.getBoundingClientRect();
        if (r.top <= y && r.bottom > y) hit = s;
      }
      if (!hit) return;
      const found = chapters.find((c) => c.id === hit!.dataset.chapter);
      const next = found ?? {
        id: `${hit.dataset.chapter}-${hit.dataset.chapterLabel}`,
        index: hit.dataset.chapterIndex ?? "",
        label: hit.dataset.chapterLabel ?? "",
      };
      setCurrent((c) => (c.id === next.id ? c : next));
      setTheme(hit.dataset.theme === "light" ? "light" : "dark");
    };
    // Get out of the way while reading down; come back the moment you scroll up.
    let lastY = window.scrollY;
    const direction = () => {
      const y = window.scrollY;
      if (Math.abs(y - lastY) < 6) return;
      setHidden(y > lastY && y > 240);
      lastY = y;
    };
    let raf = 0;
    const onScroll = () => {
      if (!raf)
        raf = requestAnimationFrame(() => {
          raf = 0;
          probe();
          direction();
        });
    };
    probe();
    const settle = window.setTimeout(probe, 400);
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.clearTimeout(settle);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      cancelAnimationFrame(raf);
    };
  }, [pathname]);

  const close = useCallback((returnFocus = true) => {
    setOpen(false);
    if (returnFocus) toggleRef.current?.focus();
  }, []);

  // Menu: lock scroll, trap focus, close on Escape.
  useEffect(() => {
    if (!open) return;
    const lenis = window.__lenis;
    lenis?.stop();
    document.documentElement.style.overflow = "hidden";
    const menu = menuRef.current!;
    const focusables = () =>
      Array.from(menu.querySelectorAll<HTMLElement>("a, button")).concat(toggleRef.current!);
    window.setTimeout(() => focusables()[0]?.focus(), 350);

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
      if (e.key !== "Tab") return;
      const f = focusables();
      const i = f.indexOf(document.activeElement as HTMLElement);
      if (e.shiftKey && i <= 0) {
        e.preventDefault();
        f[f.length - 1].focus();
      } else if (!e.shiftKey && i === f.length - 1) {
        e.preventDefault();
        f[0].focus();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.documentElement.style.overflow = "";
      lenis?.start();
    };
  }, [open, close]);

  const go = (id: string, label?: string) => (e: React.MouseEvent) => {
    if (e.metaKey || e.ctrlKey || e.shiftKey) return;
    e.preventDefault();
    const wasOpen = open;
    if (wasOpen) close(false);
    if (!isHome) {
      window.setTimeout(() => navigate(id === "intro" ? "/" : `/#${id}`, { title: label ?? "Erase" }), wasOpen ? 300 : 0);
      return;
    }
    window.setTimeout(() => scrollToTarget(`#${id}`), wasOpen ? 450 : 0);
  };

  // Page links: same-page anchors scroll, everything else gets the erase transition.
  const goHref = (href: string, label: string) => (e: React.MouseEvent) => {
    if (e.metaKey || e.ctrlKey || e.shiftKey) return;
    e.preventDefault();
    const wasOpen = open;
    if (wasOpen) close(false);
    const [path, hash] = href.split("#");
    const delay = wasOpen ? 350 : 0;
    if ((path || "/") === pathname && hash) {
      window.setTimeout(() => scrollToTarget(`#${hash}`), delay);
      return;
    }
    if ((path || "/") === pathname && !hash) {
      window.setTimeout(() => scrollToTarget(0), delay);
      return;
    }
    window.setTimeout(() => navigate(href, { title: label === "Home" ? "Erase" : label }), delay);
  };

  return (
    <>
      <header
        className="nav"
        data-theme={open ? "dark" : theme}
        data-open={open}
        data-hidden={hidden && !open}
        onFocusCapture={() => setHidden(false)}
      >
        <div className="nav__bar frame">
          <a href={isHome ? "#intro" : "/"} onClick={go("intro", "Erase")} className="nav__mark" aria-label="Erase, home">
            <span className="nav__mark-word">Erase</span>
          </a>

          <p className="nav__chapter t-label">
            <span className="sr-only">Current chapter: {current.label}</span>
            <span className="nav__chapter-inner" aria-hidden="true">
              <span className="nav__chapter-index">{current.index}</span>
              <span className="nav__chapter-sep" />
              <span ref={labelRef}>{current.label}</span>
            </span>
          </p>

          <nav aria-label="Primary" className="nav__links">
            {navLinks.map((l) => (
              <a
                key={l.href}
                href={l.href}
                onClick={goHref(l.href, l.label)}
                className="nav__link"
                aria-current={pathname === l.href || (l.href === "/work" && pathname.startsWith("/work/")) ? "page" : undefined}
              >
                <span>{l.label}</span>
                <span aria-hidden="true">{l.label}</span>
              </a>
            ))}
          </nav>

          <div className="nav__actions">
            <Magnetic className="nav__cta">
              <a href="/contact" onClick={goHref("/contact", "Start a project")} className="btn btn-sm">
                Start a project
              </a>
            </Magnetic>
            <button
              ref={toggleRef}
              type="button"
              className="nav__toggle"
              aria-expanded={open}
              aria-controls="site-menu"
              onClick={() => (open ? close() : setOpen(true))}
            >
              <span className="nav__toggle-text" data-text={open ? "Close" : "Menu"}>
                {open ? "Close" : "Menu"}
              </span>
              <span className="nav__toggle-lines" aria-hidden="true">
                <i />
                <i />
              </span>
            </button>
          </div>
        </div>
      </header>

      <div
        ref={menuRef}
        id="site-menu"
        className="menu"
        data-open={open}
        role="dialog"
        aria-modal="true"
        aria-label="Site menu"
        inert={!open}
      >
        <div className="menu__inner frame">
          <nav aria-label="Site" className="menu__nav">
            <ol>
              {[{ href: "/", label: "Home" }, ...navLinks].map((l, i) => (
                <li key={l.href} style={{ "--i": i } as React.CSSProperties}>
                  <a href={l.href} onClick={goHref(l.href, l.label)} className="menu__link">
                    <span className="menu__index t-label">{String(i + 1).padStart(2, "0")}</span>
                    <span className="menu__word">{l.label}</span>
                  </a>
                </li>
              ))}
            </ol>
            <ul className="menu__work" aria-label="Case studies">
              <li className="t-label text-smudge">Case studies</li>
              {work.map((w, i) => (
                <li key={w.slug} style={{ "--i": i + 3 } as React.CSSProperties}>
                  <a
                    href={`/work/${w.slug}`}
                    className="menu__work-link"
                    onClick={(e) => {
                      if (e.metaKey || e.ctrlKey || e.shiftKey) return;
                      e.preventDefault();
                      close(false);
                      window.setTimeout(
                        () => navigate(`/work/${w.slug}`, { title: w.title, bg: w.tone.bg, fg: w.tone.fg, label: w.kind }),
                        300,
                      );
                    }}
                  >
                    <span className="menu__swatch" style={{ background: w.tone.bg }} />
                    {w.title}
                    <span className="t-label text-smudge">{w.kind}</span>
                  </a>
                </li>
              ))}
            </ul>
          </nav>
          <div className="menu__foot">
            <span />
            <a href={`mailto:${site.email}`} className="ink-link t-h3" data-cursor-label="Email">
              {site.email}
            </a>
          </div>
        </div>
      </div>
    </>
  );
}
