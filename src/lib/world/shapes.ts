/**
 * Targets for the dust. Each shape is a Float32Array of N×4 (x, y, z, weight),
 * in world units: the camera sits ~10 units away and the view is ~8 units wide.
 * Particle i goes to point i of whichever shape is active, so shapes are shuffled
 * and every morph crosses the room instead of sliding.
 */

export type ShapeId =
  | "template"
  | "wordmark"
  | "form"
  | "ring"
  | "sphere"
  | "grid"
  | "bloom"
  | "knot"
  | "lattice"
  | "helix"
  | "path"
  | "vortex"
  | "cloud"
  | "line";

type Rnd = () => number;

function mulberry(seed: number): Rnd {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const gauss = (r: Rnd) => Math.sqrt(-2 * Math.log(r() + 1e-9)) * Math.cos(2 * Math.PI * r());

/** Shuffle whole points (4 floats each) in place. */
function shuffle(a: Float32Array, r: Rnd) {
  const n = a.length / 4;
  for (let i = n - 1; i > 0; i--) {
    const j = (r() * (i + 1)) | 0;
    for (let k = 0; k < 4; k++) {
      const t = a[i * 4 + k];
      a[i * 4 + k] = a[j * 4 + k];
      a[j * 4 + k] = t;
    }
  }
  return a;
}

/** Sample N points from the drawn pixels of a canvas. */
function fromCanvas(
  n: number,
  r: Rnd,
  draw: (ctx: CanvasRenderingContext2D, w: number, h: number) => void,
  opts: { w: number; h: number; width: number; depth: (r: Rnd, lum: number, px: number, py: number) => number },
) {
  const c = document.createElement("canvas");
  c.width = opts.w;
  c.height = opts.h;
  const ctx = c.getContext("2d", { willReadFrequently: true })!;
  draw(ctx, opts.w, opts.h);
  const data = ctx.getImageData(0, 0, opts.w, opts.h).data;
  const idx: number[] = [];
  const lum: number[] = [];
  for (let i = 0; i < opts.w * opts.h; i++) {
    const a = data[i * 4 + 3];
    if (a > 40) {
      idx.push(i);
      lum.push(data[i * 4] / 255);
    }
  }
  const out = new Float32Array(n * 4);
  const scale = opts.width / opts.w;
  for (let k = 0; k < n; k++) {
    const j = (r() * idx.length) | 0;
    const px = (idx[j] % opts.w) + r() - 0.5;
    const py = Math.floor(idx[j] / opts.w) + r() - 0.5;
    out[k * 4] = (px - opts.w / 2) * scale;
    out[k * 4 + 1] = -(py - opts.h / 2) * scale;
    out[k * 4 + 2] = opts.depth(r, lum[j], px, py);
    out[k * 4 + 3] = r();
  }
  return out;
}

const SYS = 'ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, Arial, sans-serif';

/** The website every agency ships, as line art. Red channel encodes the layer (depth). */
function drawTemplate(ctx: CanvasRenderingContext2D, w: number) {
  const layer = (d: number) => `rgb(${Math.round(d * 255)},0,0)`;
  const rr = (x: number, y: number, ww: number, hh: number, rad: number) => {
    ctx.beginPath();
    ctx.roundRect(x, y, ww, hh, rad);
  };
  ctx.lineWidth = 3;
  ctx.textBaseline = "middle";

  // Nav
  ctx.fillStyle = ctx.strokeStyle = layer(0.5);
  ctx.font = `700 34px ${SYS}`;
  ctx.textAlign = "left";
  ctx.fillText("Agency®", 70, 64);
  ctx.font = `500 22px ${SYS}`;
  ctx.textAlign = "center";
  ["Services", "Solutions", "Work", "About", "Blog"].forEach((l, i) => ctx.fillText(l, w / 2 - 240 + i * 120, 64));
  rr(w - 250, 36, 180, 56, 28);
  ctx.fill();

  // Gradient blob, as rings of dots
  ctx.fillStyle = layer(0.1);
  for (let k = 0; k < 900; k++) {
    const a = Math.random() * Math.PI * 2;
    const rad = Math.pow(Math.random(), 0.5) * 300;
    ctx.fillRect(w / 2 + Math.cos(a) * rad * 1.5, 360 + Math.sin(a) * rad * 0.8, 3, 3);
  }

  // Badge, headline, subhead
  ctx.strokeStyle = ctx.fillStyle = layer(0.75);
  rr(w / 2 - 190, 150, 380, 50, 25);
  ctx.stroke();
  ctx.font = `500 22px ${SYS}`;
  ctx.fillText("✨ New: AI-powered solutions →", w / 2, 176);
  ctx.fillStyle = layer(1);
  ctx.font = `800 84px ${SYS}`;
  ctx.fillText("We transform ideas into", w / 2, 280);
  ctx.fillText("digital experiences.", w / 2, 378);
  ctx.fillStyle = layer(0.7);
  ctx.font = `400 28px ${SYS}`;
  ctx.fillText("Where creativity meets technology. Innovative solutions", w / 2, 460);
  ctx.fillText("tailored to your vision, powered by passion.", w / 2, 500);

  // Buttons
  ctx.fillStyle = layer(0.9);
  rr(w / 2 - 250, 548, 240, 76, 38);
  ctx.fill();
  ctx.strokeStyle = layer(0.9);
  ctx.lineWidth = 4;
  rr(w / 2 + 10, 548, 240, 76, 38);
  ctx.stroke();
  ctx.lineWidth = 3;

  // Logo wall
  ctx.fillStyle = layer(0.4);
  ctx.font = `600 18px ${SYS}`;
  ctx.fillText("TRUSTED BY 500+ COMPANIES WORLDWIDE", w / 2, 680);
  for (let i = 0; i < 5; i++) {
    rr(w / 2 - 440 + i * 180, 712, 140, 26, 8);
    ctx.fill();
  }

  // Feature cards
  ctx.strokeStyle = layer(0.6);
  for (let i = 0; i < 3; i++) {
    const x = w / 2 - 540 + i * 370;
    rr(x, 790, 340, 200, 26);
    ctx.stroke();
    rr(x + 30, 820, 56, 56, 14);
    ctx.stroke();
    ctx.fillStyle = layer(0.6);
    ctx.textAlign = "left";
    ctx.font = `600 26px ${SYS}`;
    ctx.fillText(["Lightning fast", "Scalable growth", "Smart solutions"][i], x + 30, 912);
    rr(x + 30, 944, 240, 10, 5);
    ctx.fill();
    ctx.textAlign = "center";
  }
}

function template(n: number, r: Rnd) {
  const pts = fromCanvas(n, r, drawTemplate, {
    w: 1400,
    h: 1020,
    width: 9.2,
    // Layers stand off the page a little, like a site pulled apart in 3D.
    depth: (r, lum) => (lum - 0.5) * 0.9 + gauss(r) * 0.02,
  });
  for (let i = 0; i < n; i++) pts[i * 4 + 1] -= 0.2;
  return pts;
}

function wordmark(n: number, r: Rnd, text: string, family: string) {
  return fromCanvas(
    n,
    r,
    (ctx, w, h) => {
      ctx.fillStyle = "#fff";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.font = `800 ${h * 0.72}px ${family}`;
      (ctx as CanvasRenderingContext2D & { letterSpacing?: string }).letterSpacing = `${-h * 0.03}px`;
      ctx.fillText(text, w / 2, h * 0.54);
    },
    { w: 1600, h: 420, width: 9, depth: (r) => (r() - 0.5) * 0.5 },
  );
}

/** A single twisted ribbon of dust with a loose halo: the idea, before it's anything else. */
function form(n: number, r: Rnd) {
  const out = new Float32Array(n * 4);
  for (let i = 0; i < n; i++) {
    const halo = r() < 0.14;
    const t = r() * Math.PI * 2;
    const p = 2;
    const q = 3;
    const R = 1.55 + 0.55 * Math.cos(q * t);
    let x = R * Math.cos(p * t);
    let y = R * Math.sin(p * t);
    let z = 0.75 * Math.sin(q * t);
    // Flat ribbon: spread along a twisting width rather than a round tube.
    const tw = t * 3;
    const u = (r() - 0.5) * 0.55;
    const v = gauss(r) * 0.035;
    x += Math.cos(tw) * u;
    y += Math.sin(tw) * v;
    z += Math.sin(tw) * u;
    if (halo) {
      const s = 1.2 + r() * 1.8;
      x *= s * (0.8 + r() * 0.4);
      y *= s * (0.8 + r() * 0.4);
      z = gauss(r) * 1.4;
    }
    out.set([x, y, z, r()], i * 4);
  }
  return out;
}

function ring(n: number, r: Rnd) {
  const out = new Float32Array(n * 4);
  for (let i = 0; i < n; i++) {
    const a = r() * Math.PI * 2;
    const band = r() < 0.7;
    const rad = band ? 4.2 + gauss(r) * 0.35 : 2.5 + r() * 6;
    const y = gauss(r) * (band ? 0.12 : 0.9);
    out.set([Math.cos(a) * rad, y, Math.sin(a) * rad, r()], i * 4);
  }
  return out;
}

function sphere(n: number, r: Rnd) {
  const out = new Float32Array(n * 4);
  const ga = Math.PI * (3 - Math.sqrt(5));
  for (let i = 0; i < n; i++) {
    const core = r() < 0.12;
    const yy = 1 - (i / (n - 1)) * 2;
    const rad = Math.sqrt(1 - yy * yy);
    const th = ga * i;
    const s = core ? r() * 0.5 : 2 + gauss(r) * 0.02;
    out.set([Math.cos(th) * rad * s, yy * s, Math.sin(th) * rad * s, r()], i * 4);
  }
  return shuffle(out, r);
}

function grid(n: number, r: Rnd) {
  const out = new Float32Array(n * 4);
  const L = 6;
  const lines = 12;
  for (let i = 0; i < n; i++) {
    const along = (r() - 0.5) * L;
    const k = ((r() * (lines + 1)) | 0) / lines - 0.5;
    const across = k * L;
    const horiz = r() < 0.5;
    const x = horiz ? along : across;
    const z = horiz ? across : along;
    const y = Math.sin(x * 0.9) * Math.cos(z * 0.7) * 0.45;
    out.set([x, y, z, r()], i * 4);
  }
  return out;
}

function bloom(n: number, r: Rnd) {
  const out = new Float32Array(n * 4);
  const ga = Math.PI * (3 - Math.sqrt(5));
  for (let i = 0; i < n; i++) {
    const k = r();
    const rad = Math.sqrt(k) * 2.7;
    const th = ga * Math.floor(k * 2400);
    const y = Math.cos(rad * 0.9) * 0.9 - 0.3;
    out.set([Math.cos(th) * rad + gauss(r) * 0.02, y + gauss(r) * 0.02, Math.sin(th) * rad + gauss(r) * 0.02, r()], i * 4);
  }
  return out;
}

function knot(n: number, r: Rnd) {
  const out = new Float32Array(n * 4);
  for (let i = 0; i < n; i++) {
    const t = r() * Math.PI * 2;
    const p = 3;
    const q = 5;
    const R = 1.6 + 0.6 * Math.cos(q * t);
    const tube = 0.1 + gauss(r) * 0.04;
    const a = r() * Math.PI * 2;
    out.set(
      [R * Math.cos(p * t) + Math.cos(a) * tube, R * Math.sin(p * t) + Math.sin(a) * tube, 0.9 * Math.sin(q * t) + Math.cos(a + 1) * tube, r()],
      i * 4,
    );
  }
  return out;
}

function lattice(n: number, r: Rnd) {
  const out = new Float32Array(n * 4);
  const cells = 4;
  const S = 3.2;
  for (let i = 0; i < n; i++) {
    const axis = (r() * 3) | 0;
    const a = ((r() * (cells + 1)) | 0) / cells - 0.5;
    const b = ((r() * (cells + 1)) | 0) / cells - 0.5;
    const t = r() - 0.5;
    const v = axis === 0 ? [t, a, b] : axis === 1 ? [a, t, b] : [a, b, t];
    out.set([v[0] * S, v[1] * S, v[2] * S, r()], i * 4);
  }
  return out;
}

function helix(n: number, r: Rnd) {
  const out = new Float32Array(n * 4);
  for (let i = 0; i < n; i++) {
    const t = r();
    const strand = r() < 0.5 ? 0 : Math.PI;
    const rung = r() < 0.18;
    const a = t * Math.PI * 7 + strand;
    const y = (t - 0.5) * 5.5;
    const rad = 1.1 * (0.6 + t * 0.6);
    if (rung) {
      const s = r() * 2 - 1;
      const step = Math.floor(t * 40) / 40;
      const aa = step * Math.PI * 7;
      out.set([Math.cos(aa) * rad * s, (step - 0.5) * 5.5, Math.sin(aa) * rad * s, r()], i * 4);
    } else out.set([Math.cos(a) * rad + gauss(r) * 0.03, y, Math.sin(a) * rad + gauss(r) * 0.03, r()], i * 4);
  }
  return out;
}

/** Four stops along one line: talk, direction, build, launch. */
function path(n: number, r: Rnd) {
  const out = new Float32Array(n * 4);
  const at = (t: number) => [(t - 0.5) * 9, Math.sin(t * Math.PI * 1.6) * 0.8, Math.cos(t * Math.PI * 2) * 0.8];
  for (let i = 0; i < n; i++) {
    const node = r() < 0.45;
    if (node) {
      const k = (r() * 4) | 0;
      const c = at((k + 0.5) / 4);
      const s = 0.25 + k * 0.1;
      out.set([c[0] + gauss(r) * s * 0.5, c[1] + gauss(r) * s * 0.5, c[2] + gauss(r) * s * 0.5, r()], i * 4);
    } else {
      const c = at(r());
      out.set([c[0] + gauss(r) * 0.02, c[1] + gauss(r) * 0.02, c[2] + gauss(r) * 0.02, r()], i * 4);
    }
  }
  return out;
}

function vortex(n: number, r: Rnd) {
  const out = new Float32Array(n * 4);
  for (let i = 0; i < n; i++) {
    const t = Math.pow(r(), 0.7);
    const a = r() * Math.PI * 2;
    const rad = 0.08 + t * t * 5;
    const y = -2.6 + t * 4.2 + gauss(r) * 0.05;
    out.set([Math.cos(a) * rad, y, Math.sin(a) * rad, r()], i * 4);
  }
  return out;
}

function cloud(n: number, r: Rnd) {
  const out = new Float32Array(n * 4);
  for (let i = 0; i < n; i++) out.set([gauss(r) * 4.5, gauss(r) * 2.6, gauss(r) * 3 - 1, r()], i * 4);
  return out;
}

function line(n: number, r: Rnd) {
  const out = new Float32Array(n * 4);
  for (let i = 0; i < n; i++) out.set([(r() - 0.5) * 3, gauss(r) * 0.008, gauss(r) * 0.01, r()], i * 4);
  return out;
}

export function buildShape(id: ShapeId, n: number, family: string): Float32Array {
  let h = n;
  for (let i = 0; i < id.length; i++) h = Math.imul(h ^ id.charCodeAt(i), 16777619);
  const r = mulberry(h);
  switch (id) {
    case "template":
      return template(n, r);
    case "wordmark":
      return wordmark(n, r, "Erase", family);
    case "form":
      return form(n, r);
    case "ring":
      return ring(n, r);
    case "sphere":
      return sphere(n, r);
    case "grid":
      return grid(n, r);
    case "bloom":
      return bloom(n, r);
    case "knot":
      return knot(n, r);
    case "lattice":
      return lattice(n, r);
    case "helix":
      return helix(n, r);
    case "path":
      return path(n, r);
    case "vortex":
      return vortex(n, r);
    case "cloud":
      return cloud(n, r);
    case "line":
      return line(n, r);
  }
}
