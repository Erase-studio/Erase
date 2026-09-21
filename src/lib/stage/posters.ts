import { work, type Work } from "@/content/work";

/**
 * Printed posters for the work stack: each project's own colours, its name set
 * large, and the real product pinned beside it like a print on a proof sheet.
 * Drawn at 1600 × 1000. The screenshot arrives after the first draw, so the
 * poster is printed twice and `onPrint` says when to upload it again.
 */

type Ctx = CanvasRenderingContext2D;

const W = 1600;
const H = 1000;

function mono(x: Ctx, size: number) {
  x.font = `500 ${size}px ui-monospace, "Geist Mono", monospace`;
  x.letterSpacing = "1.5px";
}

function sans(x: Ctx, family: string, weight: number, size: number, spacing = -0.045) {
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

/** Break a line of copy into at most `max` lines that fit `width`. */
function wrap(x: Ctx, text: string, width: number, max: number) {
  const lines: string[] = [];
  let line = "";
  for (const word of text.split(" ")) {
    const next = line ? `${line} ${word}` : word;
    if (x.measureText(next).width > width && line) {
      lines.push(line);
      line = word;
      if (lines.length === max) break;
    } else line = next;
  }
  if (lines.length < max && line) lines.push(line);
  return lines;
}

function draw(x: Ctx, item: Work, i: number, family: string, shot: HTMLImageElement | null) {
  const { bg, fg, muted, accent } = item.tone;
  const light = parseInt(bg.slice(1, 3), 16) > 128;
  x.fillStyle = bg;
  x.fillRect(0, 0, W, H);

  // The print: a browser window with the real product in it.
  const sx = 700;
  const sy = 150;
  const sw = W - sx - 96;
  const bar = 34;
  const sh = Math.round(sw / 1.75);
  x.save();
  x.shadowColor = light ? "rgba(20,16,10,0.22)" : "rgba(0,0,0,0.55)";
  x.shadowBlur = 60;
  x.shadowOffsetY = 26;
  x.fillStyle = "#1b1c1f";
  x.beginPath();
  x.roundRect(sx, sy, sw, sh + bar, 14);
  x.fill();
  x.restore();
  x.save();
  x.beginPath();
  x.roundRect(sx, sy, sw, sh + bar, 14);
  x.clip();
  x.fillStyle = "#1b1c1f";
  x.fillRect(sx, sy, sw, bar);
  x.fillStyle = "#3a3c41";
  for (let k = 0; k < 3; k++) {
    x.beginPath();
    x.arc(sx + 22 + k * 16, sy + bar / 2, 5, 0, Math.PI * 2);
    x.fill();
  }
  if (shot) {
    const r = Math.max(sw / shot.naturalWidth, sh / shot.naturalHeight);
    x.drawImage(shot, sx, sy + bar, shot.naturalWidth * r, shot.naturalHeight * r);
  } else {
    x.fillStyle = light ? "#dcd6ca" : "#222428";
    x.fillRect(sx, sy + bar, sw, sh);
  }
  x.restore();

  // The name, set big, with its number over it.
  x.textBaseline = "alphabetic";
  mono(x, 22);
  x.fillStyle = accent;
  x.fillText(String(i + 1).padStart(2, "0"), 96, 222);
  x.fillStyle = fg;
  // As big as fits beside the print.
  let size = 150;
  sans(x, family, 500, size);
  while (size > 70 && x.measureText(item.title).width > sx - 96 - 48) sans(x, family, 500, (size -= 4));
  x.fillText(item.title, 90, 222 + size * 0.98);
  if (item.native) {
    x.fillStyle = muted;
    x.font = `500 44px ${family}, "Nirmala UI", "Noto Sans Devanagari", sans-serif`;
    x.letterSpacing = "0px";
    x.fillText(item.native, 96, 222 + size * 0.98 + 70);
  }

  // Under the print: what it is, in the project's own words.
  x.fillStyle = fg;
  sans(x, family, 400, 38, -0.02);
  wrap(x, item.brief, W - 192, 2).forEach((l, k) => x.fillText(l, 96, 818 + k * 50));

  mono(x, 20);
  x.fillStyle = muted;
  x.fillText(item.sector.toUpperCase(), 96, 110);
  x.textAlign = "right";
  x.fillText(`${item.kind.toUpperCase()} / ${item.year}`, W - 96, 110);
  x.textAlign = "left";
  if (item.award) {
    x.fillStyle = accent;
    x.fillText(item.award.toUpperCase(), 96, H - 70);
  }
  frameMarks(x, light ? "rgba(20,16,10,0.3)" : "rgba(240,240,240,0.3)");
}

export function poster(slug: string, family: string, onPrint: () => void): HTMLCanvasElement {
  const i = Math.max(0, work.findIndex((w) => w.slug === slug));
  const item = work[i];
  const c = document.createElement("canvas");
  c.width = W;
  c.height = H;
  const x = c.getContext("2d") as Ctx;
  draw(x, item, i, family, null);
  const img = new Image();
  img.decoding = "async";
  img.src = item.shot.src;
  img
    .decode()
    .then(() => {
      draw(x, item, i, family, img);
      onPrint();
    })
    .catch(() => {});
  return c;
}
