"use client";

import { usePathname } from "next/navigation";
import { TransitionLink } from "@/components/system/TransitionLink";
import { Roll } from "@/components/ui/Roll";

/**
 * The home page's last word: the pencil scribbles out "template?" and circles
 * "erase it.", and the button is the eraser itself. Other pages don't repeat it.
 */
export function FooterCta() {
  const pathname = usePathname();
  if (pathname !== "/") return null;
  return (
    <div className="foot__cta frame">
      <p className="mono muted" data-reveal="fade">
        (End) Start a project
      </p>
      <h2 className="fc__big" data-warp data-reveal="lines">
        Got a{" "}
        <span className="fc__mark" data-line="-0.04,0.5,0;0.14,0.34,20;0.3,0.66,0;0.48,0.36,20;0.66,0.64,0;0.84,0.38,20;1.04,0.52,0">
          template?
        </span>
        <br />
        Let’s{" "}
        <TransitionLink
          href="/erase-it"
          title="Erase it"
          className="fc__erase"
          data-line="0.5,-0.12,0;0.95,-0.04,50;1.07,0.5,0;0.93,1.08,-40;0.5,1.18,0;0.1,1.06,40;-0.02,0.52,0;0.1,-0.04,-30;0.52,-0.16,0;0.84,-0.08,20"
        >
          erase it.
        </TransitionLink>
      </h2>
      <div className="fc__row" data-reveal="fade">
        <TransitionLink href="/contact" title="Contact" className="eb">
          <span className="eb__rubber" aria-hidden="true">
            <i />
            <i />
            <b />
          </span>
          <span className="eb__sleeve">
            <Roll>Write to us</Roll> <span aria-hidden="true">→</span>
          </span>
        </TransitionLink>
      </div>
    </div>
  );
}
