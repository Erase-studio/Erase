"use client";

import type { AnchorHTMLAttributes, ReactNode } from "react";
import { usePageTransition } from "./PageTransition";

type Props = AnchorHTMLAttributes<HTMLAnchorElement> & {
  href: string;
  children: ReactNode;
  title?: string;
  label?: string;
};

/** A real link (new tabs, crawlers and no-JS all work) that plays the transition. */
export function TransitionLink({ href, children, title, label, onClick, ...rest }: Props) {
  const { navigate } = usePageTransition();
  return (
    <a
      href={href}
      {...rest}
      onClick={(e) => {
        onClick?.(e);
        if (e.defaultPrevented || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
        e.preventDefault();
        navigate(href, { title, label });
      }}
    >
      {children}
    </a>
  );
}
