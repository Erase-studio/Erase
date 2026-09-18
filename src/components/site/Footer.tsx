import { site } from "@/content/site";
import { TransitionLink } from "@/components/system/TransitionLink";
import { Roll } from "@/components/ui/Roll";
import { FooterCta } from "./FooterCta";
import { BackToTop, FooterWord, StudioClock } from "./FooterBits";

const pages = [
  { href: "/work", label: "Work" },
  { href: "/services", label: "Services" },
  { href: "/studio", label: "Studio" },
  { href: "/contact", label: "Contact" },
];

/**
 * The end of every page: the facts, the studio's clock, and a giant wordmark the
 * eraser leans on. The home page also gets the big call to action above them.
 */
export function Footer() {
  const social = site.social.filter((s) => s.href);
  return (
    <footer className="foot" data-sound="end">
      <FooterCta />

      <div className="foot__base frame">
        <div className="fb__grid">
          <div className="fb__about">
            <p className="mono muted">Studio</p>
            <p className="fb__lead">An independent design &amp; development studio. We draw every site for one brand and build it by hand.</p>
            <p className="avail mono">
              <i aria-hidden="true" />
              {site.availability}
            </p>
          </div>
          <nav aria-label="Footer">
            <p className="mono muted">Pages</p>
            <ul className="fb__links">
              {pages.map((p) => (
                <li key={p.href}>
                  <TransitionLink href={p.href} title={p.label}>
                    <Roll>{p.label}</Roll>
                  </TransitionLink>
                </li>
              ))}
            </ul>
          </nav>
          <div>
            <p className="mono muted">Say hello</p>
            <ul className="fb__links">
              <li>
                <a href={`mailto:${site.email}`}>
                  <Roll>{site.email}</Roll>
                </a>
              </li>
              {social.map((s) => (
                <li key={s.label}>
                  <a href={s.href} target="_blank" rel="noreferrer">
                    <Roll>{s.label}</Roll>
                  </a>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <p className="mono muted">Studio time</p>
            <StudioClock />
          </div>
        </div>

        <FooterWord />

        <div className="foot__legal mono muted">
          <span>© {new Date().getFullYear()} Erase</span>
          <span>Designed and built from scratch</span>
          <BackToTop />
        </div>
      </div>
    </footer>
  );
}
