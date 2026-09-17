import { site } from "@/content/site";
import { TransitionLink } from "@/components/system/TransitionLink";
import { Roll } from "@/components/ui/Roll";

const pages = [
  { href: "/work", label: "Work" },
  { href: "/services", label: "Services" },
  { href: "/studio", label: "Studio" },
  { href: "/contact", label: "Contact" },
];

/** Every page ends in the vortex: one call to action, then the facts. */
export function Footer() {
  const social = site.social.filter((s) => s.href);
  return (
    <footer className="foot" data-scene="cta">
      <div className="foot__cta frame">
        <p className="mono muted">Start a project</p>
        <TransitionLink href="/contact" title="Contact" className="foot__big">
          <span data-reveal="lines">Let’s erase your template.</span>
        </TransitionLink>
        <div className="foot__actions" data-reveal="fade">
          <TransitionLink href="/contact" title="Contact" className="pill pill--solid">
            <Roll>Plan a project</Roll>
            <i className="pill__dot" aria-hidden="true" />
          </TransitionLink>
          <a href={`mailto:${site.email}`} className="pill">
            <Roll>{site.email}</Roll>
          </a>
        </div>
      </div>

      <div className="foot__base frame">
        <div className="marks muted" aria-hidden="true">
          <i />
          <i />
          <i />
          <i />
        </div>
        <div className="foot__grid">
          <p className="foot__word">Erase</p>
          <div>
            <p className="mono muted">Studio</p>
            <p>Independent design &amp; development studio. Based in {site.based}, working worldwide.</p>
          </div>
          <div>
            <p className="mono muted">Pages</p>
            <ul>
              {pages.map((p) => (
                <li key={p.href}>
                  <TransitionLink href={p.href} title={p.label}>
                    <Roll>{p.label}</Roll>
                  </TransitionLink>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <p className="mono muted">Say hello</p>
            <ul>
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
        </div>
        <div className="foot__legal mono muted">
          <span>© {new Date().getFullYear()} Erase</span>
          <span>Designed and built from scratch</span>
        </div>
      </div>
    </footer>
  );
}
