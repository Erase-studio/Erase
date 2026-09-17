"use client";

import type { AnchorHTMLAttributes, ReactNode } from "react";
import { usePageTransition } from "./PageTransition";

type Props = AnchorHTMLAttributes<HTMLAnchorElement> & {
  href: string;
  children: ReactNode;
  title?: string;
  tone?: { bg: string; fg: string };
  label?: string;
};

/** A real link (new tabs, crawlers, no-JS all work) that plays the erase transition. */
export function TransitionLink({ href, children, title, tone, label, onClick, ...rest }: Props) {
  const { navigate } = usePageTransition();
  return (
    <a
      href={href}
      {...rest}
      onClick={(e) => {
        onClick?.(e);
        if (e.defaultPrevented || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
        e.preventDefault();
        navigate(href, { title, bg: tone?.bg, fg: tone?.fg, label });
      }}
    >
      {children}
    </a>
  );
}
