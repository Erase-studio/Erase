"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { site } from "@/content/site";
import { TransitionLink } from "./TransitionLink";
import { Roll } from "@/components/ui/Roll";
import { SoundToggle, ThemeToggle } from "./Toggles";
import { sound } from "@/lib/sound";
import { Mark } from "@/components/ui/Mark";

const links = [
  { href: "/", label: "Home" },
  { href: "/work", label: "Work" },
  { href: "/services", label: "Services" },
  { href: "/studio", label: "Studio" },
  { href: "/contact", label: "Contact" },
];

/** Wordmark left; talk, sound, day/night and menu right. Slides away on the way down, back on the way up. */
export function Nav() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [openedAt, setOpenedAt] = useState(pathname);
  const navRef = useRef<HTMLElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const toggleRef = useRef<HTMLButtonElement>(null);

  // A new route closes the menu.
  if (open && pathname !== openedAt) setOpen(false);

  useEffect(() => {
    const nav = navRef.current!;
    let lastY = window.scrollY;
    let hidden = false;
    const onScroll = () => {
      const y = window.scrollY;
      const down = y > lastY + 2;
      const up = y < lastY - 2;
      if (down && y > 160 && !hidden) {
        hidden = true;
        nav.dataset.hidden = "true";
      } else if ((up || y < 160) && hidden) {
        hidden = false;
        nav.dataset.hidden = "false";
      }
      lastY = y;
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Anything light that slides under the bar (the contact letter, a pasted
  // screenshot) would swallow light-on-dark buttons. Each item checks what's
  // under it and switches to dark ink while it's over paper.
  useEffect(() => {
    const nav = navRef.current!;
    let raf = 0;
    const check = () => {
      raf = 0;
      const sheets = [...document.querySelectorAll<HTMLElement>("[data-surface='light']")].map((e) => e.getBoundingClientRect());
      nav.querySelectorAll<HTMLElement>(".nav__mid, .nav__right > *").forEach((item) => {
        const r = item.getBoundingClientRect();
        const cx = r.left + r.width / 2;
        const cy = r.top + r.height / 2;
        const over = sheets.some((s) => cx > s.left && cx < s.right && cy > s.top && cy < s.bottom);
        if ((item.dataset.onLight === "true") !== over) item.dataset.onLight = String(over);
      });
    };
    const queue = () => {
      if (!raf) raf = requestAnimationFrame(check);
    };
    queue();
    // Pages swap in after a transition; look again once the new one is laid out.
    const late = window.setTimeout(queue, 900);
    window.addEventListener("scroll", queue, { passive: true });
    window.addEventListener("resize", queue);
    return () => {
      cancelAnimationFrame(raf);
      window.clearTimeout(late);
      window.removeEventListener("scroll", queue);
      window.removeEventListener("resize", queue);
    };
  }, [pathname]);

  useEffect(() => {
    if (!open) return;
    const first = menuRef.current?.querySelector<HTMLElement>("a");
    const t = window.setTimeout(() => first?.focus({ preventScroll: true }), 220);
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      setOpen(false);
      toggleRef.current?.focus();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      window.clearTimeout(t);
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const toggle = () => {
    sound.whoosh(0.6, 0.6, open ? -0.4 : 0.4);
    setOpenedAt(pathname);
    setOpen((o) => !o);
  };

  return (
    <>
      <header ref={navRef} className="nav" data-hidden="false">
        <TransitionLink href="/" className="nav__logo" aria-label="Erase, home" title="Home">
          <Mark alive size={76} />
        </TransitionLink>
        <p className="nav__mid mono">Independent design &amp; development studio</p>
        <div className="nav__right">
          <TransitionLink href="/contact" title="Contact" className="pill pill--solid nav__talk">
            <Roll>Let’s talk</Roll>
            <i className="pill__dot" aria-hidden="true" />
          </TransitionLink>
          <SoundToggle label className="nav__sound" />
          <ThemeToggle />
          <button ref={toggleRef} type="button" className="pill" aria-expanded={open} aria-controls="site-menu" onClick={toggle}>
            <Roll>Menu</Roll>
            <span className="pill__dots" aria-hidden="true">
              <i />
              <i />
            </span>
          </button>
        </div>
      </header>

      {open && <button type="button" className="menu__veil" aria-label="Close menu" onClick={toggle} />}

      <div ref={menuRef} id="site-menu" className="menu" data-open={open} inert={!open} aria-label="Site menu">
        <nav className="menu__card" style={{ "--c": 0 } as React.CSSProperties} aria-label="Primary">
          <ul className="menu__links">
            {links.map((l, i) => (
              <li key={l.href}>
                <TransitionLink
                  href={l.href}
                  title={l.label}
                  aria-current={pathname === l.href ? "page" : undefined}
                  onClick={() => setOpen(false)}
                >
                  <span className="mono">0{i}</span>
                  <Roll>{l.label}</Roll>
                </TransitionLink>
              </li>
            ))}
          </ul>
        </nav>

        <div className="menu__card menu__note" style={{ "--c": 1 } as React.CSSProperties}>
          <p className="mono" style={{ opacity: 0.45 }}>
            Studio
          </p>
          <p className="menu__lead">Every site drawn for one brand and built by hand.</p>
          <p className="menu__foot mono">
            <a href={`mailto:${site.email}`}>{site.email}</a>
            <span>Based in {site.based}, working worldwide</span>
          </p>
        </div>

        <TransitionLink
          href="/erase-it"
          title="Erase your homepage"
          className="menu__card menu__card--flip menu__labs"
          style={{ "--c": 2 } as React.CSSProperties}
          onClick={() => setOpen(false)}
        >
          <Roll>Erase your homepage</Roll>
          <span aria-hidden="true">↗</span>
        </TransitionLink>
      </div>
    </>
  );
}
