/**
 * Miniature websites, built in HTML/CSS and sized in container units, so they
 * stay sharp at any frame width and weigh almost nothing.
 * They are decorative previews: hidden from assistive tech, described in the sheet copy.
 */

import type { Work } from "@/content/work";

export function Mini({ kind }: { kind: Work["mini"] }) {
  switch (kind) {
    case "erase":
      return <MiniErase />;
    case "khumbu":
      return <MiniKhumbu />;
    case "tessel":
      return <MiniTessel />;
    case "mirelle":
      return <MiniMirelle />;
  }
}

/* ───────────── Erase: before / after, split follows the pointer ───────────── */

function MiniErase() {
  return (
    <div className="mini mini-erase">
      <div className="mini-erase__after">
        <div className="mini-erase__nav">
          <b>Erase</b>
          <span>00 — Intro</span>
          <i>Start a project</i>
        </div>
        <div className="mini-erase__title">
          <span>Nothing</span>
          <span className="pl">generic</span>
          <span>left.</span>
        </div>
      </div>
      <div className="mini-erase__before">
        <div className="mini-erase__blob" />
        <div className="mini-erase__tnav">
          <b>Agency®</b>
          <span>Services Solutions Work About</span>
          <i>Get started</i>
        </div>
        <div className="mini-erase__thero">
          <em>✨ New: AI-powered solutions</em>
          <strong>
            We transform ideas into
            <br />
            digital experiences.
          </strong>
          <p>Where creativity meets technology.</p>
          <div>
            <i>Get started →</i>
            <i className="o">Learn more</i>
          </div>
        </div>
      </div>
      <div className="mini-erase__edge" />
    </div>
  );
}

/* ───────────── Khumbu Route: the route is the hero ───────────── */

const route = [
  ["Lukla", 2860],
  ["Phakding", 2610],
  ["Namche", 3440],
  ["Namche", 3440],
  ["Tengboche", 3860],
  ["Dingboche", 4410],
  ["Dingboche", 4410],
  ["Lobuche", 4940],
  ["Base Camp", 5364],
  ["Kala Patthar", 5545],
  ["Pheriche", 4371],
  ["Namche", 3440],
  ["Lukla", 2860],
] as const;

function profilePath(w: number, h: number) {
  const min = 2400;
  const max = 5700;
  const pts = route.map(([, m], i) => {
    const x = (i / (route.length - 1)) * w;
    const y = h - ((m - min) / (max - min)) * h;
    return [x, y] as const;
  });
  const line = pts.map(([x, y], i) => `${i ? "L" : "M"}${x.toFixed(1)} ${y.toFixed(1)}`).join(" ");
  return { line, area: `${line} L${w} ${h} L0 ${h} Z`, pts };
}

function MiniKhumbu() {
  const { line, area, pts } = profilePath(1000, 220);
  return (
    <div className="mini mini-khumbu">
      <div className="mk__nav">
        <b>KHUMBU ROUTE</b>
        <span>Treks</span>
        <span>Dates</span>
        <span>Guides</span>
        <i>Book a trek</i>
      </div>
      <div className="mk__hero">
        <div>
          <p className="mk__eyebrow">Everest Base Camp · 14 days · Moderate to hard</p>
          <p className="mk__alt">
            5,364<small>m</small>
          </p>
        </div>
        <div className="mk__dates">
          <p className="mk__eyebrow">Next departures</p>
          <ul>
            <li>
              04 Oct <span>3 places</span>
            </li>
            <li>
              18 Oct <span>6 places</span>
            </li>
            <li className="full">
              01 Nov <span>Full</span>
            </li>
          </ul>
          <p className="mk__price">
            From <b>$1,390</b> per person
          </p>
        </div>
      </div>
      <svg className="mk__profile" viewBox="0 0 1000 250" preserveAspectRatio="none">
        <path d={area} className="mk__area" />
        <path d={line} className="mk__line" vectorEffect="non-scaling-stroke" />
        {pts.map(([x, y], i) => (
          <circle key={i} cx={x} cy={y} r="4" className={i === 9 ? "mk__peak" : "mk__dot"} />
        ))}
      </svg>
      <div className="mk__days">
        {route.map(([name], i) => (
          <span key={i}>
            <b>D{i + 1}</b>
            {name}
          </span>
        ))}
      </div>
      <div className="mk__asks">
        <p className="mk__h">What it asks of you</p>
        <div>
          <p>
            <b>5–7 h</b>walking most days
          </p>
          <p>
            <b>5,545 m</b>highest point, day 10
          </p>
          <p>
            <b>2 days</b>built in to acclimatise
          </p>
        </div>
      </div>
    </div>
  );
}

/* ───────────── Tessel: plans first ───────────── */

function Plan({ variant = 0 }: { variant?: number }) {
  const rooms = [
    [
      [0, 0, 60, 55],
      [60, 0, 40, 35],
      [60, 35, 40, 65],
      [0, 55, 35, 45],
      [35, 55, 25, 45],
    ],
    [
      [0, 0, 100, 30],
      [0, 30, 45, 70],
      [45, 30, 55, 40],
      [45, 70, 55, 30],
    ],
    [
      [0, 0, 33, 100],
      [33, 0, 34, 60],
      [67, 0, 33, 60],
      [33, 60, 67, 40],
    ],
  ][variant % 3];
  return (
    <svg viewBox="-4 -4 108 108" className="mt__plan" aria-hidden="true">
      {rooms.map(([x, y, w, h], i) => (
        <rect key={i} x={x} y={y} width={w} height={h} />
      ))}
      <path d="M60 20 A 12 12 0 0 1 48 32" className="door" />
      <path d="M35 70 A 10 10 0 0 0 45 80" className="door" />
      <line x1="10" y1="100" x2="28" y2="100" className="gap" />
    </svg>
  );
}

function MiniTessel() {
  const index = [
    ["01", "Casa Lume", "Residence", "2025"],
    ["02", "The Weir", "Workspace", "2024"],
    ["03", "Row Nine", "Housing", "2024"],
    ["04", "Salt Hall", "Civic", "2023"],
  ];
  return (
    <div className="mini mini-tessel">
      <div className="mt__nav">
        <b>Tessel</b>
        <span>Index</span>
        <span>Practice</span>
        <span>Contact</span>
      </div>
      <div className="mt__hero">
        <p className="mt__title">
          Plans
          <br />
          first.
        </p>
        <div className="mt__drawing">
          <Plan />
          <span className="mt__cap">Casa Lume, ground floor, 1:200</span>
        </div>
      </div>
      <div className="mt__index">
        {index.map(([n, name, type, year], i) => (
          <div key={n} className="mt__row">
            <span>{n}</span>
            <b>{name}</b>
            <span>{type}</span>
            <span>{year}</span>
            <Plan variant={i + 1} />
          </div>
        ))}
      </div>
    </div>
  );
}

/* ───────────── Mirelle: the label is the page ───────────── */

function MiniMirelle() {
  const ingredients = [
    ["Niacinamide", "5%", "Evens tone"],
    ["Panthenol", "2%", "Calms"],
    ["Ceramide NP", "0.2%", "Repairs barrier"],
    ["Squalane", "4%", "Softens"],
  ];
  return (
    <div className="mini mini-mirelle">
      <div className="mm__nav">
        <b>mirelle</b>
        <span>Shop by ingredient</span>
        <span>Routines</span>
        <i>Bag (0)</i>
      </div>
      <div className="mm__hero">
        <div className="mm__copy">
          <p className="mm__title">
            Read the
            <br />
            label first.
          </p>
          <p className="mm__sub">Barrier Serum · 30 ml · four actives, nothing hidden.</p>
          <div className="mm__chips">
            {ingredients.map(([n, p]) => (
              <span key={n}>
                {n} <b>{p}</b>
              </span>
            ))}
          </div>
          <div className="mm__buy">
            <i>Add to bag · $38</i>
            <span>Shipping $4, free over $50</span>
          </div>
        </div>
        <div className="mm__stage">
          <div className="mm__bottle">
            <span className="cap" />
            <span className="neck" />
            <span className="body">
              <em>mirelle</em>
              <small>barrier serum</small>
              <small className="pct">5 · 2 · 0.2 · 4</small>
            </span>
          </div>
        </div>
      </div>
      <div className="mm__table">
        {ingredients.map(([n, p, d]) => (
          <div key={n}>
            <b>{n}</b>
            <span>{p}</span>
            <span>{d}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
