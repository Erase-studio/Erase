import { mulberry32 } from "@/lib/rub";

/**
 * One sheet of paper, drawn four ways: the notes from the first call, a rough
 * direction, the blueprint, the finished site. Each stage is a list of pencil
 * operations that draw on in order, so any scroll position is a frame: stage
 * `i`, drawn `d` of the way (0..1). Between stages the eraser wipes across and
 * the next drawing starts behind it. Units: a 1000 × 700 sheet.
 */

export const SHEET = { w: 1000, h: 700 };

type Pt = [number, number];
type Op = {
  /** Where the pencil is when this op is `t` of the way done. */
  tip: (t: number) => Pt;
  draw: (x: CanvasRenderingContext2D, t: number) => void;
  /** Relative time it takes; lines take their length. */
  cost: number;
};

const LEAD = "rgba(28,29,33,0.82)";
const SOFT = "rgba(28,29,33,0.45)";
const BLUE = "#2448ff";
const PRINT = "rgba(36,72,255,0.85)";

let family = "system-ui, sans-serif";

// ─── Primitives ─────────────────────────────────────────────────────────────

/** A hand-drawn polyline: jittered once, when the sheet is built, so every frame agrees. */
function path(pts: Pt[], o: { color?: string; width?: number; jitter?: number; closed?: boolean; twice?: boolean } = {}, rnd = mulberry32(1)): Op {
  const j = o.jitter ?? 1.6;
  const src = o.closed ? [...pts, pts[0]] : pts;
  // Resample so long edges wobble along their length, not just at the corners.
  const dense: Pt[] = [];
  for (let i = 0; i < src.length - 1; i++) {
    const [ax, ay] = src[i];
    const [bx, by] = src[i + 1];
    const n = Math.max(1, Math.round(Math.hypot(bx - ax, by - ay) / 40));
    for (let k = 0; k < n; k++) dense.push([ax + ((bx - ax) * k) / n + (rnd() - 0.5) * j, ay + ((by - ay) * k) / n + (rnd() - 0.5) * j]);
  }
  dense.push([src[src.length - 1][0] + (rnd() - 0.5) * j, src[src.length - 1][1] + (rnd() - 0.5) * j]);
  const second = o.twice ? dense.map(([x, y]) => [x + (rnd() - 0.5) * j * 1.6, y + (rnd() - 0.5) * j * 1.6] as Pt) : null;
  const lens = dense.slice(1).map((p, i) => Math.hypot(p[0] - dense[i][0], p[1] - dense[i][1]));
  const total = lens.reduce((a, b) => a + b, 0) || 1;
  const at = (t: number): { i: number; f: number } => {
    let d = t * total;
    let i = 0;
    while (i < lens.length - 1 && d > lens[i]) d -= lens[i++];
    return { i, f: lens[i] ? Math.min(1, d / lens[i]) : 1 };
  };
  const stroke = (x: CanvasRenderingContext2D, pts: Pt[], t: number) => {
    const { i, f } = at(t);
    x.beginPath();
    x.moveTo(pts[0][0], pts[0][1]);
    for (let k = 1; k <= i; k++) x.lineTo(pts[k][0], pts[k][1]);
    const a = pts[i];
    const b = pts[i + 1] ?? a;
    x.lineTo(a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f);
    x.stroke();
  };
  return {
    cost: total,
    tip: (t) => {
      const { i, f } = at(t);
      const a = dense[i];
      const b = dense[i + 1] ?? a;
      return [a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f];
    },
    draw: (x, t) => {
      if (t <= 0) return;
      x.strokeStyle = o.color ?? LEAD;
      x.lineWidth = o.width ?? 2.2;
      x.lineCap = "round";
      x.lineJoin = "round";
      stroke(x, dense, t);
      if (second) {
        x.globalAlpha = 0.55;
        stroke(x, second, t);
        x.globalAlpha = 1;
      }
    },
  };
}

const line = (a: Pt, b: Pt, o = {}, rnd?: () => number) => path([a, b], o, rnd);
const rect = (x: number, y: number, w: number, h: number, o = {}, rnd?: () => number) =>
  path([[x, y], [x + w, y], [x + w, y + h], [x, y + h]], { closed: true, ...o }, rnd);
const ellipse = (cx: number, cy: number, rx: number, ry: number, o = {}, rnd?: () => number) => {
  const pts: Pt[] = [];
  // A little more than a full turn, the way a quick hand circles a word.
  for (let k = 0; k <= 26; k++) {
    const a = -2.2 + (k / 24) * Math.PI * 2;
    pts.push([cx + Math.cos(a) * rx, cy + Math.sin(a) * ry]);
  }
  return path(pts, o, rnd);
};
const squiggle = (x0: number, y: number, w: number, rnd: () => number) => {
  const pts: Pt[] = [];
  for (let x = x0; x <= x0 + w; x += 9) pts.push([x, y + Math.sin(x * 0.19) * 5 + (rnd() - 0.5) * 5 - (rnd() < 0.08 ? 10 : 0)]);
  return path(pts, { width: 1.8, jitter: 0.8 }, rnd);
};

/** Text that appears as if written left to right. */
function text(s: string, px: number, py: number, o: { size?: number; weight?: number; italic?: boolean; color?: string; rot?: number; stroke?: boolean } = {}): Op {
  const size = o.size ?? 30;
  const font = `${o.italic ? "italic " : ""}${o.weight ?? 500} ${size}px ${family}`;
  let width = s.length * size * 0.5;
  return {
    cost: width * 0.8,
    tip: (t) => [px + width * t, py - size * 0.2],
    draw: (x, t) => {
      if (t <= 0) return;
      x.save();
      x.translate(px, py);
      x.rotate(o.rot ?? 0);
      x.font = font;
      width = x.measureText(s).width;
      x.beginPath();
      x.rect(-4, -size * 1.2, width * t + 4, size * 1.7);
      x.clip();
      if (o.stroke) {
        x.strokeStyle = o.color ?? LEAD;
        x.lineWidth = 2;
        x.strokeText(s, 0, 0);
      } else {
        x.fillStyle = o.color ?? LEAD;
        x.fillText(s, 0, 0);
      }
      x.restore();
    },
  };
}

/** A flat fill that fades in (paint, not pencil). */
function fill(shape: (x: CanvasRenderingContext2D) => void, color: string, at: Pt, cost = 120): Op {
  return {
    cost,
    tip: () => at,
    draw: (x, t) => {
      if (t <= 0) return;
      x.globalAlpha = Math.min(1, t * 1.4);
      x.fillStyle = color;
      x.beginPath();
      shape(x);
      x.fill();
      x.globalAlpha = 1;
    },
  };
}

/** Pencil shading inside a box. */
function hatch(x0: number, y0: number, w: number, h: number, gap: number, rnd: () => number): Op[] {
  const ops: Op[] = [];
  for (let k = -h; k < w; k += gap) {
    const a: Pt = [x0 + Math.max(0, k), y0 + Math.max(0, -k)];
    const len = Math.min(w - Math.max(0, k), h - Math.max(0, -k));
    if (len < 6) continue;
    ops.push(line(a, [a[0] + len, a[1] + len], { width: 1.4, color: SOFT, jitter: 1.2 }, rnd));
  }
  return ops;
}

// ─── The four drawings ──────────────────────────────────────────────────────

function talk(rnd: () => number): Op[] {
  return [
    text("Call notes, week 0", 70, 92, { size: 24, weight: 600 }),
    line([70, 106], [360, 110], { width: 2 }, rnd),
    text("Who is it for?", 90, 184, { size: 38, italic: true }),
    ellipse(262, 170, 82, 36, { width: 2, color: BLUE }, rnd),
    text("What should they feel?", 90, 262, { size: 38, italic: true }),
    text("One thing to remember.", 90, 340, { size: 38, italic: true }),
    line([92, 356], [470, 358], { width: 2.4 }, rnd),
    line([96, 366], [440, 369], { width: 1.6 }, rnd),
    path([[520, 330], [600, 300], [660, 250]], { width: 2.2 }, rnd),
    path([[640, 250], [662, 248], [655, 270]], { width: 2.2 }, rnd),
    path([[640, 120], [930, 120], [930, 250], [720, 250], [690, 290], [700, 250], [640, 250]], { closed: true, width: 2.2, twice: true }, rnd),
    text("“like nobody else”", 660, 196, { size: 30, italic: true, color: BLUE }),
    squiggle(90, 440, 520, rnd),
    squiggle(90, 488, 430, rnd),
    squiggle(90, 536, 480, rnd),
    squiggle(90, 584, 300, rnd),
    path([[830, 420], [845, 455], [884, 458], [854, 480], [866, 518], [830, 496], [794, 518], [806, 480], [776, 458], [815, 455]], { closed: true, width: 2 }, rnd),
    text("?", 880, 620, { size: 110, weight: 600, italic: true, color: SOFT }),
  ];
}

function direction(rnd: () => number): Op[] {
  return [
    text("Direction A", 70, 92, { size: 24, weight: 600 }),
    rect(70, 120, 520, 470, { width: 2.2, twice: true }, rnd),
    // Type-led layout: one huge headline block, shaded.
    ...hatch(110, 170, 420, 120, 13, rnd),
    rect(110, 170, 420, 120, { width: 1.8 }, rnd),
    line([110, 330], [420, 332], { width: 2.6 }, rnd),
    line([110, 360], [360, 361], { width: 2.6 }, rnd),
    ellipse(490, 470, 48, 48, { width: 2 }, rnd),
    text("one big idea", 110, 470, { size: 26, italic: true, color: SOFT }),
    text("Aa", 660, 290, { size: 190, weight: 600, stroke: true }),
    fill((x) => x.arc(690, 400, 34, 0, Math.PI * 2), "#141517", [690, 400]),
    fill((x) => x.arc(780, 400, 34, 0, Math.PI * 2), BLUE, [780, 400]),
    ellipse(870, 400, 34, 34, { width: 2 }, rnd),
    text("big, tight, ours", 660, 490, { size: 28, italic: true }),
    path([[650, 520], [600, 560], [540, 300]], { width: 2 }, rnd),
    path([[528, 318], [540, 296], [556, 316]], { width: 2 }, rnd),
    text("✓", 880, 610, { size: 70, weight: 600, color: BLUE }),
  ];
}

function build(rnd: () => number): Op[] {
  const crisp = { color: PRINT, width: 1.8, jitter: 0 };
  const faint = { color: "rgba(36,72,255,0.22)", width: 1, jitter: 0 };
  const ops: Op[] = [
    fill((x) => x.rect(0, 0, SHEET.w, SHEET.h), "rgba(36,72,255,0.05)", [500, 350], 60),
  ];
  for (let gx = 100; gx < SHEET.w; gx += 50) ops.push(line([gx, 30], [gx, 670], faint, rnd));
  for (let gy = 50; gy < SHEET.h; gy += 50) ops.push(line([30, gy], [970, gy], faint, rnd));
  ops.push(
    line([80, 56], [920, 56], crisp, rnd),
    text("1440", 470, 46, { size: 18, weight: 600, color: PRINT }),
    rect(80, 80, 840, 540, { ...crisp, width: 2.4 }, rnd),
    line([80, 124], [920, 124], crisp, rnd),
    ellipse(106, 102, 6, 6, crisp, rnd),
    ellipse(126, 102, 6, 6, crisp, rnd),
    ellipse(146, 102, 6, 6, crisp, rnd),
    line([120, 180], [560, 180], { ...crisp, width: 14 }, rnd),
    line([120, 220], [470, 220], { ...crisp, width: 14 }, rnd),
    line([120, 262], [380, 262], { ...crisp, width: 14 }, rnd),
    rect(120, 310, 150, 44, crisp, rnd),
    rect(600, 160, 280, 220, crisp, rnd),
    line([600, 160], [880, 380], faint, rnd),
    line([880, 160], [600, 380], faint, rnd),
  );
  for (let c = 0; c < 12; c++) ops.push(line([120 + c * 63, 420], [120 + c * 63, 590], { ...faint, color: "rgba(36,72,255,0.35)" }, rnd));
  ops.push(text("12 col", 124, 612, { size: 18, weight: 600, color: PRINT }), text("</>", 830, 600, { size: 34, weight: 600, color: PRINT }));
  return ops;
}

function launch(): Op[] {
  const round = (x: CanvasRenderingContext2D, rx: number, ry: number, w: number, h: number, r: number) => x.roundRect(rx, ry, w, h, r);
  return [
    fill((x) => round(x, 88, 92, 840, 540, 14), "rgba(0,0,0,0.12)", [500, 360], 40),
    fill((x) => round(x, 80, 80, 840, 540, 14), "#ffffff", [500, 350], 60),
    fill((x) => round(x, 80, 80, 840, 44, 14), "#e7e6e1", [500, 100], 40),
    fill((x) => x.arc(106, 102, 6, 0, Math.PI * 2), "#ff5f57", [106, 102], 10),
    fill((x) => x.arc(126, 102, 6, 0, Math.PI * 2), "#febc2e", [126, 102], 10),
    fill((x) => x.arc(146, 102, 6, 0, Math.PI * 2), "#28c840", [146, 102], 10),
    fill((x) => round(x, 380, 90, 240, 24, 12), "#ffffff", [500, 102], 20),
    text("yourbrand.com", 448, 108, { size: 15, weight: 500, color: "#6c6d72" }),
    fill((x) => x.rect(80, 124, 840, 290), "#141517", [500, 260], 80),
    fill((x) => {
      const g = x.createRadialGradient(760, 250, 10, 760, 270, 130);
      g.addColorStop(0, "#7d93ff");
      g.addColorStop(1, BLUE);
      x.fillStyle = g;
      x.arc(760, 270, 110, 0, Math.PI * 2);
    }, BLUE, [760, 270], 60),
    text("Yours, and", 120, 216, { size: 56, weight: 600, color: "#ecebe6" }),
    text("nobody else’s.", 120, 276, { size: 56, weight: 600, color: "#ecebe6" }),
    fill((x) => round(x, 120, 318, 150, 46, 23), BLUE, [195, 341], 30),
    text("Start →", 150, 348, { size: 20, weight: 600, color: "#ffffff" }),
    fill((x) => round(x, 120, 450, 210, 12, 6), "#d9d7d0", [225, 456], 20),
    fill((x) => round(x, 120, 474, 160, 12, 6), "#e6e4dd", [200, 480], 20),
    fill((x) => round(x, 400, 450, 210, 12, 6), "#d9d7d0", [505, 456], 20),
    fill((x) => round(x, 400, 474, 180, 12, 6), "#e6e4dd", [490, 480], 20),
    fill((x) => round(x, 680, 450, 200, 110, 10), "#ecebe6", [780, 505], 20),
    fill((x) => round(x, 760, 640, 160, 40, 20), "#141517", [840, 660], 30),
    fill((x) => x.arc(786, 660, 6, 0, Math.PI * 2), "#28c840", [786, 660], 10),
    text("Live", 804, 667, { size: 20, weight: 600, color: "#ecebe6" }),
    text("✓", 60, 680, { size: 60, weight: 600, color: BLUE }),
  ];
}

// ─── The sheet ──────────────────────────────────────────────────────────────

export type Sheet = {
  /** Draws the frame for stage `i` drawn `d` of the way, with the eraser at `wipe` (0..1) across from the previous stage. Returns where the pencil is. */
  render: (x: CanvasRenderingContext2D, i: number, d: number, wipe: number) => Pt | null;
};

export function buildSheet(fontFamily: string): Sheet {
  family = fontFamily;
  const stages = [talk(mulberry32(3)), direction(mulberry32(5)), build(mulberry32(7)), launch()].map((ops) => {
    const total = ops.reduce((a, o) => a + o.cost, 0);
    let acc = 0;
    return ops.map((o) => {
      const from = acc / total;
      acc += o.cost;
      return { o, from, to: acc / total };
    });
  });

  const drawStage = (x: CanvasRenderingContext2D, i: number, d: number): Pt | null => {
    let tip: Pt | null = null;
    for (const s of stages[i]) {
      if (d <= s.from) break;
      const t = Math.min(1, (d - s.from) / (s.to - s.from));
      s.o.draw(x, t);
      if (t < 1) tip = s.o.tip(t);
    }
    return tip;
  };

  return {
    render(x, i, d, wipe) {
      x.clearRect(0, 0, SHEET.w, SHEET.h);
      if (i > 0 && wipe < 1) {
        const ex = wipe * (SHEET.w + 120) - 60;
        x.save();
        x.beginPath();
        x.rect(ex, 0, SHEET.w, SHEET.h);
        x.clip();
        drawStage(x, i - 1, 1);
        x.restore();
        // Where the rubber has just been: a soft grey smudge.
        const g = x.createLinearGradient(ex - 90, 0, ex, 0);
        g.addColorStop(0, "rgba(120,122,128,0)");
        g.addColorStop(1, "rgba(120,122,128,0.16)");
        x.fillStyle = g;
        x.fillRect(ex - 90, 0, 90, SHEET.h);
        x.save();
        x.beginPath();
        x.rect(0, 0, Math.max(0, ex - 30), SHEET.h);
        x.clip();
        const tip = drawStage(x, i, d);
        x.restore();
        return tip;
      }
      return drawStage(x, i, d);
    },
  };
}
