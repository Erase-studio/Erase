const steps = [
  { name: "Talk", when: "Week 0", body: "Thirty minutes. Honest questions about who the site is for." },
  { name: "Direction", when: "Weeks 1–2", body: "One clear direction, not twelve mood boards." },
  { name: "Build", when: "Weeks 2–6", body: "A live preview link from the first week." },
  { name: "Launch", when: "Week 6 onward", body: "Go live, measure, keep improving." },
];

/** Four stops. The pencil line runs straight through them, so it becomes the timeline. */
export function ProcessPath() {
  return (
    <section id="process" className="proc frame" aria-labelledby="proc-title">
      <header className="proc__head">
        <p className="mono muted" data-reveal="fade">
          (04) How a project runs
        </p>
        <h2 id="proc-title" className="h2" data-reveal="lines">
          Four stops. No surprises.
        </h2>
      </header>
      <ol className="proc__steps">
        {steps.map((s, i) => (
          <li key={s.name} data-reveal="fade" data-delay={String(i * 0.08)}>
            <span className="proc__stop" data-line="0.5,0.5,0" aria-hidden="true" />
            <p className="mono muted">
              0{i + 1} · {s.when}
            </p>
            <p className="proc__name">{s.name}</p>
            <p className="body">{s.body}</p>
          </li>
        ))}
      </ol>
    </section>
  );
}
