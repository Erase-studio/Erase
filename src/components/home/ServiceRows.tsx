import { services } from "@/content/agency";

/**
 * One service per screen. Each row names a scene, so the dust changes shape beside it:
 * a focus, a grid, a bloom, a knot, a lattice, a rising helix.
 */
export function ServiceRows({ kicker = "(04) What we do" }: { kicker?: string }) {
  return (
    <section className="svc frame" aria-labelledby="svc-title">
      {services.map((s, i) => (
        <article key={s.id} id={s.id} className="svc__row" data-scene={`svc-${i}`}>
          <div className="svc__text">
            {i === 0 && (
              <p className="mono muted svc__kicker" data-reveal="fade">
                {kicker}
              </p>
            )}
            <p className="mono svc__num" data-reveal="fade">
              {String(i + 1).padStart(2, "0")} / {String(services.length).padStart(2, "0")}
            </p>
            {i === 0 ? (
              <h2 id="svc-title" className="svc__name" data-reveal="lines">
                {s.name}
              </h2>
            ) : (
              <h3 className="svc__name" data-reveal="lines">
                {s.name}
              </h3>
            )}
            <p className="body" data-reveal="fade" data-delay="0.1">
              {s.short}
            </p>
            <ul className="svc__list" data-reveal="fade" data-delay="0.2">
              {s.deliverables.map((d) => (
                <li key={d} className="mono">
                  {d}
                </li>
              ))}
            </ul>
          </div>
        </article>
      ))}
    </section>
  );
}
