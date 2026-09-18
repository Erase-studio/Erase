/**
 * Printed posters for the work stack, drawn in code at 1600 × 1000 from each
 * project's own palette and type. They are the sheets you peel through.
 */

type Ctx = CanvasRenderingContext2D;

const W = 1600;
const H = 1000;

function canvas() {
  const c = document.createElement("canvas");
  c.width = W;
  c.height = H;
  return { c, x: c.getContext("2d") as Ctx };
}

function mono(x: Ctx, size: number) {
  x.font = `500 ${size}px ui-monospace, "Geist Mono", monospace`;
  x.letterSpacing = "1px";
}

function sans(x: Ctx, family: string, weight: number, size: number, spacing = -0.04, stretch: CanvasFontStretch = "normal") {
  x.fontStretch = stretch;
  x.font = `${weight} ${size}px ${family}`;
  x.letterSpacing = `${size * spacing}px`;
}

function frameMarks(x: Ctx, color: string) {
  x.strokeStyle = color;
  x.lineWidth = 2;
  for (const [cx, cy] of [
    [48, 48],
    [W - 48, 48],
    [48, H - 48],
    [W - 48, H - 48],
  ]) {
    x.beginPath();
    x.moveTo(cx - 10, cy);
    x.lineTo(cx + 10, cy);
    x.moveTo(cx, cy - 10);
    x.lineTo(cx, cy + 10);
    x.stroke();
  }
}

function rng(seed: number) {
  return () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
}

function erase(family: string) {
  const { c, x } = canvas();
  x.fillStyle = "#0b0c0e";
  x.fillRect(0, 0, W, H);
  // The template on the right, coming apart.
  const r = rng(3);
  x.strokeStyle = "rgba(232,236,244,0.55)";
  x.lineWidth = 3;
  const boxes = [
    [880, 170, 560, 56, 28],
    [900, 270, 520, 44, 10],
    [960, 340, 400, 44, 10],
    [980, 430, 170, 64, 32],
    [1170, 430, 170, 64, 32],
    [880, 560, 170, 150, 20],
    [1075, 560, 170, 150, 20],
    [1270, 560, 170, 150, 20],
  ];
  boxes.forEach(([bx, by, bw, bh, br], i) => {
    const gone = i / boxes.length;
    x.globalAlpha = 1 - gone * 0.6;
    x.beginPath();
    x.roundRect(bx, by, bw, bh, br);
    x.stroke();
  });
  x.globalAlpha = 1;
  for (let i = 0; i < 2600; i++) {
    const t = Math.pow(r(), 0.6);
    const px = 900 + t * 700 + (r() - 0.5) * 60;
    const py = 160 + r() * 620 + (r() - 0.5) * 40 * t;
    const s = 1 + r() * 3.2 * t;
    x.fillStyle = r() < 0.12 ? "#3d63ff" : `rgba(232,236,244,${0.25 + r() * 0.6})`;
    x.beginPath();
    x.arc(px, py, s, 0, Math.PI * 2);
    x.fill();
  }
  x.fillStyle = "#e8ecf4";
  sans(x, family, 500, 150, -0.05);
  x.textBaseline = "alphabetic";
  ["Nothing", "generic", "survives."].forEach((l, i) => x.fillText(l, 96, 380 + i * 142));
  mono(x, 22);
  x.fillStyle = "#8a8f9c";
  x.fillText("ERASE — STUDIO SITE", 96, 150);
  x.fillText("LIVE · 2026", 96, H - 96);
  x.fillStyle = "#3d63ff";
  x.beginPath();
  x.arc(W - 110, H - 104, 10, 0, Math.PI * 2);
  x.fill();
  frameMarks(x, "rgba(232,236,244,0.35)");
  return c;
}

function khumbu(family: string) {
  const { c, x } = canvas();
  x.fillStyle = "#edebe3";
  x.fillRect(0, 0, W, H);
  // Contour lines behind everything.
  x.strokeStyle = "rgba(27,42,36,0.08)";
  x.lineWidth = 2;
  for (let k = 0; k < 14; k++) {
    x.beginPath();
    for (let i = 0; i <= 80; i++) {
      const px = (i / 80) * W;
      const py = 260 + k * 48 + Math.sin(i * 0.19 + k * 0.7) * 30 + Math.sin(i * 0.05 + k) * 40;
      if (i) x.lineTo(px, py);
      else x.moveTo(px, py);
    }
    x.stroke();
  }
  x.fillStyle = "#1b2a24";
  sans(x, family, 700, 300, -0.055, "condensed");
  x.textBaseline = "alphabetic";
  x.fillText("5,364", 90, 410);
  const numW = x.measureText("5,364").width;
  sans(x, family, 600, 110, -0.03, "condensed");
  x.fillText("m", 90 + numW + 18, 410);
  // The elevation profile: the climb, day by day.
  const pts: [number, number][] = [];
  const alt = [2860, 3440, 3440, 3870, 4410, 4410, 4940, 5164, 5364, 4240, 3440, 2860];
  alt.forEach((a, i) => pts.push([110 + (i / (alt.length - 1)) * (W - 220), 900 - ((a - 2600) / 2900) * 380]));
  x.beginPath();
  x.moveTo(pts[0][0], 900);
  pts.forEach(([px, py]) => x.lineTo(px, py));
  x.lineTo(pts[pts.length - 1][0], 900);
  x.closePath();
  const g = x.createLinearGradient(0, 520, 0, 900);
  g.addColorStop(0, "rgba(27,42,36,0.22)");
  g.addColorStop(1, "rgba(27,42,36,0)");
  x.fillStyle = g;
  x.fill();
  x.strokeStyle = "#1b2a24";
  x.lineWidth = 4;
  x.beginPath();
  pts.forEach(([px, py], i) => (i ? x.lineTo(px, py) : x.moveTo(px, py)));
  x.stroke();
  mono(x, 20);
  pts.forEach(([px, py], i) => {
    x.fillStyle = i === 8 ? "#d9481f" : "#1b2a24";
    x.beginPath();
    x.arc(px, py, i === 8 ? 14 : 6, 0, Math.PI * 2);
    x.fill();
    x.fillStyle = "rgba(27,42,36,0.6)";
    x.fillText(`D${String(i + 1).padStart(2, "0")}`, px - 18, 944);
  });
  x.fillStyle = "#1b2a24";
  x.fillText("KHUMBU ROUTE — CONCEPT STUDY", 96, 110);
  x.textAlign = "right";
  x.fillText("12 DAYS · FROM $1,390", W - 96, 110);
  x.textAlign = "left";
  frameMarks(x, "rgba(27,42,36,0.35)");
  return c;
}

function tessel(family: string) {
  const { c, x } = canvas();
  x.fillStyle = "#f2f1ed";
  x.fillRect(0, 0, W, H);
  x.strokeStyle = "rgba(20,20,20,0.06)";
  x.lineWidth = 1;
  for (let i = 0; i < W; i += 40) {
    x.beginPath();
    x.moveTo(i, 0);
    x.lineTo(i, H);
    x.stroke();
  }
  for (let j = 0; j < H; j += 40) {
    x.beginPath();
    x.moveTo(0, j);
    x.lineTo(W, j);
    x.stroke();
  }
  // A floor plan, drawn at one scale.
  x.strokeStyle = "#141414";
  x.lineWidth = 7;
  const ox = 820;
  const oy = 180;
  x.strokeRect(ox, oy, 640, 620);
  x.lineWidth = 4;
  x.beginPath();
  x.moveTo(ox + 380, oy);
  x.lineTo(ox + 380, oy + 300);
  x.moveTo(ox, oy + 300);
  x.lineTo(ox + 260, oy + 300);
  x.moveTo(ox + 380, oy + 300);
  x.lineTo(ox + 640, oy + 300);
  x.moveTo(ox + 200, oy + 300);
  x.lineTo(ox + 200, oy + 620);
  x.stroke();
  x.lineWidth = 2;
  x.beginPath();
  x.arc(ox + 260, oy + 300, 120, 0, Math.PI / 2);
  x.stroke();
  x.beginPath();
  x.arc(ox + 380, oy + 180, 120, Math.PI / 2, Math.PI);
  x.stroke();
  x.setLineDash([10, 10]);
  x.strokeRect(ox + 420, oy + 360, 180, 220);
  x.setLineDash([]);
  x.fillStyle = "#141414";
  sans(x, family, 300, 170, -0.05);
  x.textBaseline = "alphabetic";
  x.fillText("Plans", 96, 470);
  x.fillText("first.", 96, 630);
  mono(x, 20);
  x.fillText("TESSEL — ARCHITECTURE PRACTICE", 96, 110);
  x.fillText("CASA LUME · 1:200", ox, oy + 660);
  x.fillText("CONCEPT STUDY · 2026", 96, H - 96);
  frameMarks(x, "rgba(20,20,20,0.35)");
  return c;
}

function mirelle(family: string) {
  const { c, x } = canvas();
  x.fillStyle = "#2b3990";
  x.fillRect(0, 0, W, H);
  // The bottle.
  const g = x.createLinearGradient(1060, 0, 1340, 0);
  g.addColorStop(0, "#dcdae8");
  g.addColorStop(0.5, "#f4f2ee");
  g.addColorStop(1, "#cfcde0");
  x.fillStyle = "#141414";
  x.beginPath();
  x.roundRect(1150, 140, 100, 120, 14);
  x.fill();
  x.fillStyle = g;
  x.beginPath();
  x.roundRect(1060, 250, 280, 580, 44);
  x.fill();
  x.fillStyle = "#1f1b3d";
  sans(x, family, 600, 54, -0.04);
  x.textAlign = "center";
  x.fillText("mirelle", 1200, 520);
  mono(x, 18);
  x.fillText("NIACINAMIDE 5%", 1200, 570);
  x.textAlign = "left";
  x.fillStyle = "#f3f1fa";
  sans(x, family, 640, 128, -0.045);
  x.textBaseline = "alphabetic";
  x.fillText("Read the", 96, 400);
  x.fillText("label first.", 96, 530);
  const chips = ["Niacinamide 5%", "Zinc 2%", "Retinal 0.2%", "Urea 4%"];
  mono(x, 22);
  let cx = 96;
  chips.forEach((t) => {
    const w = x.measureText(t).width + 44;
    x.strokeStyle = "rgba(243,241,250,0.5)";
    x.lineWidth = 2;
    x.beginPath();
    x.roundRect(cx, 610, w, 52, 26);
    x.stroke();
    x.fillStyle = "#f3f1fa";
    x.fillText(t.toUpperCase(), cx + 22, 644);
    cx += w + 14;
  });
  x.fillStyle = "#aeb5e3";
  x.fillText("MIRELLE — SKINCARE STORE", 96, 110);
  x.fillText("CONCEPT STUDY · 2026", 96, H - 96);
  frameMarks(x, "rgba(243,241,250,0.35)");
  return c;
}

export function poster(slug: string, family: string): HTMLCanvasElement {
  switch (slug) {
    case "erase":
      return erase(family);
    case "khumbu-route":
      return khumbu(family);
    case "tessel":
      return tessel(family);
    default:
      return mirelle(family);
  }
}
