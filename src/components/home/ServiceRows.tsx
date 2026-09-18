import { services } from "@/content/agency";

/** Six services as big rows. The pencil line switches back across the list as you read. */
export function ServiceRows({ kicker = "(03) What we do" }: { kicker?: string }) {
  return (
    <section className="svc frame" data-sound="services" aria-labelledby="svc-title">
      <header className="svc__head">
        <p className="mono muted" data-reveal="fade">
          {kicker}
        </p>
        <h2 id="svc-title" className="h2" data-reveal="lines">
          Everything a website needs. One studio.
        </h2>
      </header>
      <ol className="svc__list">
        {services.map((s, i) => (
          <li
            key={s.id}
            id={s.id}
            className="svc__row"
            data-reveal="fade"
            // The pencil rules the list: along each separator, turning in the margins.
          >
            <span className="mono svc__num">{String(i + 1).padStart(2, "0")}</span>
            <h3 className="svc__name">{s.name}</h3>
            <div className="svc__detail">
              <p className="body">{s.short}</p>
              <ul className="svc__tags">
                {s.deliverables.map((d) => (
                  <li key={d} className="mono">
                    {d}
                  </li>
                ))}
              </ul>
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}
