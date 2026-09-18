import { site } from "@/content/site";
import { TransitionLink } from "@/components/system/TransitionLink";
import { Roll } from "@/components/ui/Roll";
import { LastTemplate } from "./LastTemplate";

const pages = [
  { href: "/work", label: "Work" },
  { href: "/services", label: "Services" },
  { href: "/studio", label: "Studio" },
  { href: "/contact", label: "Contact" },
];

/** Every page ends the same way: one last template to rub out, the call to action under it, then the facts. */
export function Footer() {
  const social = site.social.filter((s) => s.href);
  return (
    <footer className="foot" data-line="1.05,0.02,0">
      <div className="foot__cta frame">
        <LastTemplate>
          <p className="mono muted">Start a project</p>
          <TransitionLink
            href="/contact"
            title="Contact"
            className="foot__big"
            data-line="0.5,-0.2,0;0.97,-0.08,50;1.07,0.46,0;0.9,1.08,-40;0.5,1.2,0;0.1,1.06,40;-0.07,0.5,0;0.08,-0.06,-30;0.52,-0.24,0;0.83,-0.14,20"
          >
            Let’s erase your template.
          </TransitionLink>
          <div className="foot__actions">
            <TransitionLink href="/contact" title="Contact" className="pill pill--solid">
              <Roll>Plan a project</Roll>
              <i className="pill__dot" aria-hidden="true" />
            </TransitionLink>
            <a href={`mailto:${site.email}`} className="pill">
              <Roll>{site.email}</Roll>
            </a>
          </div>
        </LastTemplate>
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
