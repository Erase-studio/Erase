import metrics from "@/content/metrics.json";

/**
 * The ledger.
 *
 * Every number here was measured by the build that produced this page — see
 * scripts/metrics.mjs — not written by us and not rounded in our favour. If a
 * release makes the site heavier, this table says so the same day.
 *
 * It is the only kind of proof we can offer honestly: we have no awards to
 * list and we're not going to invent any.
 */

const pad = (n: number, width = 3) => String(n).padStart(width, "0");

type Row = { n: string; label: string; value: string; note?: string };

const groups: { title: string; rows: Row[] }[] = [
  {
    title: "What this page cost you",
    rows: [
      { n: "001", label: "JavaScript, first load", value: `${metrics.js} KB`, note: `budget ${metrics.budget} KB` },
      { n: "002", label: "Stylesheet", value: `${metrics.css} KB`, note: "one file, no framework runtime" },
      { n: "003", label: "Typefaces", value: `${metrics.fonts} KB`, note: "two, both variable" },
      { n: "004", label: "Requests before first paint", value: pad(metrics.requests), note: "document included" },
    ],
  },
  {
    title: "What the site is made of",
    rows: [
      { n: "005", label: "Raster images, whole site", value: pad(metrics.raster), note: "screenshots of our products; everything else is drawn in code" },
      { n: "006", label: "Runtime dependencies", value: pad(metrics.deps), note: "react, next, three, gsap, lenis" },
      { n: "007", label: "Pages, prerendered", value: pad(metrics.routes), note: "static, served from the edge" },
      { n: "008", label: "Templates started from", value: pad(0), note: "not once, not ever" },
    ],
  },
];

export function Ledger() {
  return (
    <section className="ldg" aria-labelledby="ldg-title" data-sound="services">
      <p className="ldg__ghost" aria-hidden="true">
        Measured
      </p>

      <div className="ldg__inner frame">
        <header className="ldg__head">
          <p className="mono muted" data-reveal="fade">
            Receipts
          </p>
          <h2 id="ldg-title" className="h2" data-warp data-reveal="lines">
            Numbers, not adjectives.
          </h2>
          <p className="lede ldg__lede" data-reveal="fade" data-delay="0.25">
            Every studio says it builds fast websites. Here is what this one actually weighs, measured by the build that made the page
            you’re reading.
          </p>
        </header>

        {groups.map((g) => (
          <div key={g.title} className="ldg__group">
            <p className="mono muted ldg__group-title">{g.title}</p>
            <ul className="ldg__rows">
              {g.rows.map((r) => (
                <li key={r.n} className="ldg__row" data-reveal="fade">
                  <span className="mono ldg__n">{r.n}</span>
                  <span className="ldg__label">{r.label}</span>
                  {r.note && <span className="mono muted ldg__note">{r.note}</span>}
                  <span className="ldg__value">{r.value}</span>
                </li>
              ))}
            </ul>
          </div>
        ))}

        <p className="mono muted ldg__stamp">
          Measured {metrics.measured}. Written by the build, not by us, and rerun on every deploy.
        </p>
      </div>
    </section>
  );
}
