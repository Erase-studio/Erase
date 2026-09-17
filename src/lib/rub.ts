/**
 * Rubbing, simulated.
 *
 * RubHand    the rubber drags on the paper: it sticks until you pull hard enough,
 *            slips, chatters, and trails the pointer a little. That lag is the resistance.
 * RubSurface erases a canvas with a grainy rubber footprint, a little per pass,
 *            so it takes a few strokes; the lifted graphite smears into a marks layer.
 * humanPath  back-and-forth strokes the way a hand actually scrubs, for automatic erasing.
 */

export type Pt = { x: number; y: number };

export function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ─────────────────────────── Hand ───────────────────────────

const STATIC_PULL = 3.4; // px of pull before the rubber lets go
const KINETIC_PULL = 2.1; // px-equivalent of sliding friction

export class RubHand {
  x = 0;
  y = 0;
  vx = 0;
  vy = 0;
  tx = 0;
  ty = 0;
  /** 0.25 → 1.2, rises when you pull hard or hold the button. */
  pressure = 0.35;
  speed = 0;
  /** Footprint angle for the canvas (radians). */
  angle = -1;
  /** True on the step where a stroke turned round. */
  reversed = false;
  push = 0;
  private stuck = true;
  private travel = 0;
  private dx = 0;
  private dy = 0;

  constructor(private stiffness = 92) {}

  reset(x: number, y: number) {
    this.x = this.tx = x;
    this.y = this.ty = y;
    this.vx = this.vy = 0;
    this.dx = this.dy = 0;
    this.stuck = true;
  }

  aim(x: number, y: number) {
    this.tx = x;
    this.ty = y;
  }

  /** Advances the simulation; returns how far the rubber actually moved. */
  step(dt: number) {
    const w = this.stiffness;
    const w2 = w * w;
    const n = Math.min(24, Math.max(1, Math.ceil(dt / (1 / 240))));
    const h = dt / n;
    let moved = 0;
    let pull = 0;
    this.reversed = false;

    for (let i = 0; i < n; i++) {
      const px = this.tx - this.x;
      const py = this.ty - this.y;
      pull = Math.hypot(px, py);
      if (this.stuck) {
        if (pull < STATIC_PULL) continue;
        this.stuck = false;
      }
      this.vx += (w2 * px - 1.8 * w * this.vx) * h;
      this.vy += (w2 * py - 1.8 * w * this.vy) * h;
      // Sliding friction, rippling with distance: rubber skips instead of gliding.
      const sp = Math.hypot(this.vx, this.vy);
      const fr = w2 * KINETIC_PULL * (1 + 0.6 * Math.sin(this.travel * 0.85)) * h;
      if (sp <= fr) {
        this.vx = this.vy = 0;
        if (pull < STATIC_PULL) this.stuck = true;
      } else {
        const k = (sp - fr) / sp;
        this.vx *= k;
        this.vy *= k;
      }
      const sx = this.vx * h;
      const sy = this.vy * h;
      this.x += sx;
      this.y += sy;
      const d = Math.hypot(sx, sy);
      moved += d;
      this.travel += d;
    }

    this.speed = Math.hypot(this.vx, this.vy);
    if (this.speed > 140) {
      const dot = this.vx * this.dx + this.vy * this.dy;
      const mag = Math.hypot(this.dx, this.dy);
      if (mag > 90 && dot < -0.25 * this.speed * mag) {
        this.reversed = true;
        this.dx = this.vx;
        this.dy = this.vy;
      }
    }
    const k = 1 - Math.exp(-dt * 9);
    this.dx += (this.vx - this.dx) * k;
    this.dy += (this.vy - this.dy) * k;

    const p = Math.min(1.2, Math.max(0.25, 0.3 + pull / 38 + this.speed / 2800 + this.push * 0.35));
    this.pressure += (p - this.pressure) * (1 - Math.exp(-dt * 12));
    const a = -1 + Math.max(-0.4, Math.min(0.4, this.vx * 0.0003));
    this.angle += (a - this.angle) * (1 - Math.exp(-dt * 8));
    return moved;
  }
}

// ─────────────────────────── Textures ───────────────────────────

let footprint: HTMLCanvasElement | null = null;
let smear: HTMLCanvasElement | null = null;
let dust: HTMLCanvasElement | null = null;

/** The rubber's contact patch: a soft rounded rectangle full of grain. */
function getFootprint() {
  if (footprint) return footprint;
  const S = 128;
  const c = document.createElement("canvas");
  c.width = c.height = S;
  const x = c.getContext("2d")!;
  x.fillStyle = "#000";
  x.filter = "blur(1.5px)";
  x.beginPath();
  x.roundRect(8, 16, S - 16, S - 32, 16);
  x.fill();
  x.filter = "none";
  const img = x.getImageData(0, 0, S, S);
  const rnd = mulberry32(11);
  // Grain in rows across the patch: some lines of rubber bite harder than others,
  // so a stroke comes out streaked rather than airbrushed.
  const rows = Array.from({ length: S }, () => 0.55 + rnd() * 0.45);
  for (let py = 0; py < S; py++)
    for (let px = 0; px < S; px++) {
      const i = py * S + px;
      const g = rnd();
      const bite = rows[py] * (g < 0.12 ? 0.2 : 0.8 + g * 0.2);
      img.data[i * 4 + 3] = Math.round(img.data[i * 4 + 3] * bite);
    }
  x.putImageData(img, 0, 0);
  footprint = c;
  return c;
}

/** Soft smear of lifted graphite. */
function getSmear() {
  if (smear) return smear;
  const S = 64;
  const c = document.createElement("canvas");
  c.width = c.height = S;
  const x = c.getContext("2d")!;
  const g = x.createRadialGradient(S / 2, S / 2, 0, S / 2, S / 2, S / 2);
  g.addColorStop(0, "rgba(255,255,255,1)");
  g.addColorStop(0.55, "rgba(255,255,255,0.45)");
  g.addColorStop(1, "rgba(255,255,255,0)");
  x.fillStyle = g;
  x.fillRect(0, 0, S, S);
  const img = x.getImageData(0, 0, S, S);
  const rnd = mulberry32(5);
  for (let i = 0; i < S * S; i++) img.data[i * 4 + 3] *= 0.55 + rnd() * 0.45;
  x.putImageData(img, 0, 0);
  smear = c;
  return c;
}

/** Blotchy value noise for dissolving leftovers: high values go first. */
function getDust() {
  if (dust) return dust;
  const W = 160;
  const H = 90;
  const c = document.createElement("canvas");
  c.width = W;
  c.height = H;
  const x = c.getContext("2d")!;
  const img = x.createImageData(W, H);
  const rnd = mulberry32(23);
  const octave = (cell: number) => {
    const gw = Math.ceil(W / cell) + 2;
    const gh = Math.ceil(H / cell) + 2;
    const g = Array.from({ length: gw * gh }, rnd);
    return (px: number, py: number) => {
      const fx = px / cell;
      const fy = py / cell;
      const ix = Math.floor(fx);
      const iy = Math.floor(fy);
      const u = fx - ix;
      const v = fy - iy;
      const s = (t: number) => t * t * (3 - 2 * t);
      const a = g[iy * gw + ix];
      const b = g[iy * gw + ix + 1];
      const cc = g[(iy + 1) * gw + ix];
      const d = g[(iy + 1) * gw + ix + 1];
      return a + (b - a) * s(u) + (cc - a) * s(v) + (a - b - cc + d) * s(u) * s(v);
    };
  };
  const o1 = octave(24);
  const o2 = octave(9);
  const o3 = octave(3);
  for (let py = 0; py < H; py++)
    for (let px = 0; px < W; px++) {
      const n = o1(px, py) * 0.55 + o2(px, py) * 0.3 + o3(px, py) * 0.15;
      img.data[(py * W + px) * 4 + 3] = Math.round(Math.min(1, Math.max(0, (n - 0.2) * 1.6)) * 255);
    }
  x.putImageData(img, 0, 0);
  dust = c;
  return c;
}

// ─────────────────────────── Surface ───────────────────────────

type Stamp = { x: number; y: number; a: number; rx: number; ry: number; al: number };

export type RubOpts = {
  canvas: HTMLCanvasElement;
  /** Residue layer the lifted graphite smears onto. Optional. */
  marks?: HTMLCanvasElement | null;
  /** Where this surface's (0,0) sits inside the marks canvas, in CSS px. */
  marksOrigin?: () => Pt;
  /** "r,g,b" of the smear. */
  residue?: string;
  /** Colours of the fine dust that stays behind. */
  specks?: string[];
  /** Fraction removed per stamp (before grain). */
  strength?: number;
  cols?: number;
  rows?: number;
};

export type RubResult = { removed: number; dist: number };

export class RubSurface {
  w = 0;
  h = 0;
  dpr = 1;
  private ctx: CanvasRenderingContext2D;
  private mctx: CanvasRenderingContext2D | null;
  private ink: Float32Array;
  private cleared = 0;
  private cols: number;
  private rows: number;
  private last: Pt | null = null;
  private dirt = 0;
  private history: Stamp[] = [];
  private rnd = mulberry32((Math.random() * 1e9) | 0);
  private dissolving = 0;
  /** Grit in the rubber: offsets across the footprint that bite harder along the whole stroke. */
  private grit = Array.from({ length: 9 }, () => this.newGrit());
  private gritTravel = 0;

  constructor(private o: RubOpts) {
    this.ctx = o.canvas.getContext("2d")!;
    this.mctx = o.marks?.getContext("2d") ?? null;
    this.cols = o.cols ?? 24;
    this.rows = o.rows ?? 14;
    this.ink = new Float32Array(this.cols * this.rows).fill(1);
  }

  /** Resizes the backing store. The owner repaints, then calls replay(). */
  setSize(w: number, h: number, dpr: number) {
    this.w = w;
    this.h = h;
    this.dpr = dpr;
    this.o.canvas.width = Math.max(1, Math.round(w * dpr));
    this.o.canvas.height = Math.max(1, Math.round(h * dpr));
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  get context() {
    return this.ctx;
  }

  progress() {
    return this.cleared / this.ink.length;
  }

  /** Lift the rubber off the page; the next rubTo starts a new stroke. */
  lift() {
    this.last = null;
  }

  replay() {
    const fp = getFootprint();
    const ctx = this.ctx;
    ctx.globalCompositeOperation = "destination-out";
    for (const s of this.history) this.draw(ctx, fp, s.x * this.w, s.y * this.w, s.a, s.rx * this.w, s.ry * this.w, s.al, this.dpr);
    this.restore();
  }

  /** Drag the rubber from wherever it was to (x, y). */
  rubTo(x: number, y: number, pressure: number, angle: number, radius: number): RubResult {
    if (!this.last) {
      this.last = { x, y };
      return { removed: 0, dist: 0 };
    }
    const a = this.last;
    const dist = Math.hypot(x - a.x, y - a.y);
    if (dist < 0.4) return { removed: 0, dist: 0 };
    const rx = radius * 0.95;
    const ry = radius * 0.5;
    const spacing = Math.max(1.5, rx * 0.17);
    const n = Math.max(1, Math.ceil(dist / spacing));
    const strength = (this.o.strength ?? 0.2) * Math.min(1.25, pressure);
    const fp = getFootprint();
    const ctx = this.ctx;
    const ux = (x - a.x) / dist;
    const uy = (y - a.y) / dist;
    let removed = 0;

    ctx.globalCompositeOperation = "destination-out";
    for (let i = 1; i <= n; i++) {
      const t = i / n;
      const sx = a.x + (x - a.x) * t;
      const sy = a.y + (y - a.y) * t;
      this.draw(ctx, fp, sx, sy, angle, rx, ry, strength, this.dpr);
      if (this.history.length < 30000)
        this.history.push({ x: sx / this.w, y: sy / this.w, a: angle, rx: rx / this.w, ry: ry / this.w, al: strength });
      const got = this.wear(sx, sy, (rx + ry) * 0.5, strength);
      removed += got;
      this.dirt = this.dirt * 0.985 + got * 0.6;
      if (this.mctx) this.residue(sx, sy, ux, uy, angle, rx, ry, got);
    }
    // Streaks: each bit of grit scores a line along the stroke.
    const e1x = Math.cos(angle);
    const e1y = Math.sin(angle);
    const ext = Math.hypot(rx * (-uy * e1x + ux * e1y), ry * (uy * e1y + ux * e1x)) * 0.9;
    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    ctx.lineCap = "butt";
    for (const g of this.grit) {
      const ox = -uy * g.o * ext;
      const oy = ux * g.o * ext;
      ctx.globalAlpha = Math.min(1, g.al * strength * 2.4);
      ctx.lineWidth = g.w;
      ctx.beginPath();
      ctx.moveTo(a.x + ox, a.y + oy);
      ctx.lineTo(x + ox, y + oy);
      ctx.stroke();
    }
    // Grit wears and moves: now and then one line fades out and another starts.
    this.gritTravel += dist;
    if (this.gritTravel > 60) {
      this.gritTravel = 0;
      this.grit[(this.rnd() * this.grit.length) | 0] = this.newGrit();
    }
    this.restore();
    this.last = { x, y };
    return { removed, dist };
  }

  private newGrit() {
    const r = this.rnd ?? Math.random;
    return { o: (r() - 0.5) * 2, w: 0.8 + r() * r() * 5, al: 0.25 + r() * 0.75 };
  }

  /** A heavier blot where a stroke turns round: that's where graphite piles up. */
  turn(x: number, y: number, radius: number) {
    const m = this.mctx;
    if (!m || this.dirt < 0.02) return;
    const o = this.o.marksOrigin?.() ?? { x: 0, y: 0 };
    const al = Math.min(0.045, this.dirt * 0.04);
    this.drawTinted(m, o.x + x, o.y + y, this.rnd() * 3, radius * 0.8, radius * 0.55, al);
    this.restoreMarks();
    this.dirt *= 0.6;
  }

  /** Fades whatever is left in blotches. Returns a cancel function. */
  dissolve(ms: number, onDone: () => void, onFrame?: (t: number) => void) {
    const noise = getDust();
    const t0 = performance.now();
    const c = this.o.canvas;
    const ctx = this.ctx;
    const tick = (now: number) => {
      const t = Math.min(1, (now - t0) / ms);
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.globalCompositeOperation = "destination-out";
      ctx.globalAlpha = Math.min(1, 0.04 + t * t * 0.45);
      ctx.drawImage(noise, 0, 0, c.width, c.height);
      this.restore();
      onFrame?.(t);
      if (t < 1) this.dissolving = requestAnimationFrame(tick);
      else {
        ctx.clearRect(0, 0, this.w, this.h);
        this.dissolving = 0;
        onDone();
      }
    };
    this.dissolving = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(this.dissolving);
  }

  private draw(
    ctx: CanvasRenderingContext2D,
    img: HTMLCanvasElement,
    x: number,
    y: number,
    angle: number,
    rx: number,
    ry: number,
    alpha: number,
    dpr: number,
  ) {
    const c = Math.cos(angle);
    const s = Math.sin(angle);
    ctx.setTransform(dpr * c * rx, dpr * s * rx, -dpr * s * ry, dpr * c * ry, dpr * x, dpr * y);
    ctx.globalAlpha = alpha;
    ctx.drawImage(img, -1, -1, 2, 2);
  }

  private wear(x: number, y: number, r: number, strength: number) {
    const cw = this.w / this.cols;
    const ch = this.h / this.rows;
    const c0 = Math.max(0, Math.floor((x - r) / cw));
    const c1 = Math.min(this.cols - 1, Math.floor((x + r) / cw));
    const r0 = Math.max(0, Math.floor((y - r) / ch));
    const r1 = Math.min(this.rows - 1, Math.floor((y + r) / ch));
    const k = strength * 0.5;
    let got = 0;
    for (let row = r0; row <= r1; row++)
      for (let col = c0; col <= c1; col++) {
        const dx = (col + 0.5) * cw - x;
        const dy = (row + 0.5) * ch - y;
        if (dx * dx + dy * dy > r * r) continue;
        const i = row * this.cols + col;
        const before = this.ink[i];
        const after = before * (1 - k);
        this.ink[i] = after;
        got += before - after;
        if (before >= 0.3 && after < 0.3) this.cleared++;
      }
    return got;
  }

  private residue(x: number, y: number, ux: number, uy: number, angle: number, rx: number, ry: number, got: number) {
    const m = this.mctx!;
    const o = this.o.marksOrigin?.() ?? { x: 0, y: 0 };
    const mx = o.x + x;
    const my = o.y + y;
    // Rubbing over an old smudge lifts some of it again.
    m.globalCompositeOperation = "destination-out";
    this.draw(m, getFootprint(), mx, my, angle, rx, ry, 0.012, this.dpr);
    if (this.dirt > 0.015) {
      m.globalCompositeOperation = "source-over";
      // Smear trails behind the direction of travel, stretched along it.
      const al = Math.min(0.016, this.dirt * 0.007);
      this.drawTinted(m, mx - ux * rx * 0.35, my - uy * rx * 0.35, Math.atan2(uy, ux), rx * 0.9, ry * 0.75, al);
    }
    // Fine dust that stays where it fell.
    if (got > 0 && this.o.specks?.length && this.rnd() < got * 0.9) {
      const edge = (this.rnd() - 0.5) * 2;
      const px = mx + Math.cos(angle) * rx * edge + (this.rnd() - 0.5) * 6;
      const py = my + Math.sin(angle) * rx * edge + (this.rnd() - 0.5) * 6;
      const sz = 0.6 + this.rnd() * this.rnd() * 2.2;
      m.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
      m.globalCompositeOperation = "source-over";
      m.globalAlpha = 0.25 + this.rnd() * 0.45;
      m.fillStyle = this.o.specks[(this.rnd() * this.o.specks.length) | 0];
      m.translate(px, py);
      m.rotate(this.rnd() * 3);
      m.fillRect(-sz, -sz * 0.45, sz * 2, sz * (0.6 + this.rnd() * 0.5));
    }
    this.restoreMarks();
  }

  private tinted: HTMLCanvasElement | null = null;
  private drawTinted(m: CanvasRenderingContext2D, x: number, y: number, angle: number, rx: number, ry: number, al: number) {
    if (!this.tinted) {
      const src = getSmear();
      const c = document.createElement("canvas");
      c.width = src.width;
      c.height = src.height;
      const t = c.getContext("2d")!;
      t.drawImage(src, 0, 0);
      t.globalCompositeOperation = "source-in";
      t.fillStyle = `rgb(${this.o.residue ?? "139,142,148"})`;
      t.fillRect(0, 0, c.width, c.height);
      this.tinted = c;
    }
    this.draw(m, this.tinted, x, y, angle, rx, ry, al, this.dpr);
  }

  private restore() {
    this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    this.ctx.globalAlpha = 1;
    this.ctx.globalCompositeOperation = "source-over";
  }

  private restoreMarks() {
    const m = this.mctx!;
    m.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    m.globalAlpha = 1;
    m.globalCompositeOperation = "source-over";
  }
}

// ─────────────────────────── Automatic strokes ───────────────────────────

export type HumanPath = {
  duration: number;
  /** Position and pressure at time t (ms). */
  sample: (t: number) => Pt & { p: number };
};

/**
 * Scrubbing the way a hand does it: strokes that bow with the wrist, overshoot
 * the edge by different amounts, sometimes fall short, slow into each turn
 * and work their way down the area.
 */
export function humanPath(w: number, h: number, r: number, duration: number, seed = (Math.random() * 1e9) | 0): HumanPath {
  const rnd = mulberry32(seed);
  type Seg = { ax: number; ay: number; cx: number; cy: number; bx: number; by: number; t0: number; d: number };
  const segs: Seg[] = [];
  let x = -r * (0.2 + rnd() * 0.5);
  let y = -r * (0.1 + rnd() * 0.3);
  let right = true;
  let total = 0;
  while (y < h + r * 0.2) {
    const dy = r * (0.72 + rnd() * 0.3);
    const short = rnd() < 0.18 ? r * (0.1 + rnd() * 0.45) : 0;
    const bx = right ? w + r * (0.05 + rnd() * 0.55) - short : -r * (0.05 + rnd() * 0.55) + short;
    const by = y + dy;
    const len = Math.hypot(bx - x, by - y);
    const bow = -r * (0.12 + rnd() * 0.38);
    const d = Math.pow(len, 0.8) * (0.85 + rnd() * 0.3);
    segs.push({ ax: x, ay: y, cx: (x + bx) / 2 + (rnd() - 0.5) * r * 0.3, cy: (y + by) / 2 + bow, bx, by, t0: total, d });
    total += d;
    x = bx;
    y = by;
    right = !right;
  }
  const scale = duration / total;
  for (const s of segs) {
    s.t0 *= scale;
    s.d *= scale;
  }
  return {
    duration,
    sample(t) {
      let i = 0;
      while (i < segs.length - 1 && t > segs[i].t0 + segs[i].d) i++;
      const s = segs[i];
      const u = Math.min(1, Math.max(0, (t - s.t0) / s.d));
      // Slows into the turn without ever quite stopping.
      const e = u - (Math.sin(2 * Math.PI * u) / (2 * Math.PI)) * 0.8;
      const m = 1 - e;
      return {
        x: m * m * s.ax + 2 * m * e * s.cx + e * e * s.bx,
        y: m * m * s.ay + 2 * m * e * s.cy + e * e * s.by,
        p: 0.75 + 0.3 * Math.sin(Math.PI * u),
      };
    },
  };
}

// ─────────────────────────── Taking turns ───────────────────────────

let turn: Promise<void> = Promise.resolve();
let waiting = 0;

/**
 * There is one 3D eraser. Automatic erasers queue for it so each one is visibly
 * done by hand; if a crowd is waiting, the job runs without it rather than wait.
 */
export function withEraser(job: (drive: boolean) => Promise<void>, ready: () => boolean) {
  if (waiting > 2) return job(false);
  waiting++;
  const p = turn
    .then(() => job(ready()))
    .then(() => new Promise<void>((r) => setTimeout(r, 60)))
    .finally(() => {
      waiting--;
    });
  turn = p;
  return p;
}

/**
 * Runs a humanPath over a surface in real time, optionally carrying the 3D eraser.
 * Resolves when the path is done (or cancelled).
 */
export function runPath(opts: {
  surface: RubSurface;
  path: HumanPath;
  radius: number;
  /** Viewport position of the surface's (0,0), read each frame. */
  origin: () => Pt;
  /** Called per frame with the eraser's viewport position, pressure and travel. */
  onStep?: (x: number, y: number, p: number, dx: number, dy: number, removed: number) => void;
  cancelled: () => boolean;
}) {
  const { surface, path, radius, origin, onStep, cancelled } = opts;
  return new Promise<void>((resolve) => {
    const t0 = performance.now();
    let tp = 0;
    let prev = path.sample(0);
    let angle = -1;
    surface.lift();
    surface.rubTo(prev.x, prev.y, prev.p, angle, radius);
    const step = (now: number) => {
      if (cancelled()) return resolve();
      const t = Math.min(path.duration, now - t0);
      // Sub-sample so the corners of each stroke are actually visited.
      const n = Math.max(1, Math.ceil((t - tp) / 6));
      let removed = 0;
      let cur = prev;
      let sub = prev;
      for (let i = 1; i <= n; i++) {
        cur = path.sample(tp + ((t - tp) * i) / n);
        angle = -1 + Math.max(-0.4, Math.min(0.4, (cur.x - sub.x) * 0.02));
        removed += surface.rubTo(cur.x, cur.y, cur.p, angle, radius).removed;
        sub = cur;
      }
      const o = origin();
      onStep?.(o.x + cur.x, o.y + cur.y, cur.p, cur.x - prev.x, cur.y - prev.y, removed);
      prev = cur;
      tp = t;
      if (t < path.duration) requestAnimationFrame(step);
      else resolve();
    };
    requestAnimationFrame(step);
  });
}
