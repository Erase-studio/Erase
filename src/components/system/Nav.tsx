"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { site } from "@/content/site";
import { TransitionLink } from "./TransitionLink";
import { Roll } from "@/components/ui/Roll";
import { SoundToggle, ThemeToggle } from "./Toggles";
import { sound } from "@/lib/sound";

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

  useEffect(() => {
    const lenis = window.__lenis;
    if (open) {
      lenis?.stop();
      const first = menuRef.current?.querySelector<HTMLElement>("a");
      window.setTimeout(() => first?.focus({ preventScroll: true }), 350);
    } else {
      lenis?.start();
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && open) {
        setOpen(false);
        toggleRef.current?.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
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
          Erase
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

      <div ref={menuRef} id="site-menu" className="menu" data-open={open} inert={!open} aria-label="Site menu">
        <div className="menu__top">
          <span className="nav__logo">Erase</span>
          <button type="button" className="pill" onClick={toggle}>
            <Roll>Close</Roll>
            <span className="pill__dots" aria-hidden="true">
              <i />
              <i />
            </span>
          </button>
        </div>
        <nav aria-label="Primary">
          <ul className="menu__links">
            {links.map((l, i) => (
              <li key={l.href}>
                <TransitionLink
                  href={l.href}
                  title={l.label}
                  aria-current={pathname === l.href ? "page" : undefined}
                  style={{ "--i": i } as React.CSSProperties}
                  onClick={() => {
                    if (pathname === l.href) setOpen(false);
                  }}
                >
                  <span className="mono">0{i}</span>
                  <Roll>{l.label}</Roll>
                </TransitionLink>
              </li>
            ))}
          </ul>
        </nav>
        <div className="menu__foot mono">
          <a href={`mailto:${site.email}`}>{site.email}</a>
          <span>Independent · Based in {site.based} · Working worldwide</span>
        </div>
      </div>
    </>
  );
}
