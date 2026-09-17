/**
 * Paints "the average agency website" onto a canvas.
 * It is deliberately faithful: system font, gradient blob, pill buttons,
 * logo-cloud placeholders, feature cards. If it isn't recognisable, the joke dies.
 */

const SYS =
  'ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif';

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  const rr = Math.max(0, Math.min(r, h / 2, w / 2));
  if (w <= 0 || h <= 0) return;
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + h, rr);
  ctx.arcTo(x + w, y + h, x, y + h, rr);
  ctx.arcTo(x, y + h, x, y, rr);
  ctx.arcTo(x, y, x + w, y, rr);
  ctx.closePath();
}

function blob(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  r: number,
  color: string,
) {
  const g = ctx.createRadialGradient(x, y, 0, x, y, r);
  g.addColorStop(0, color);
  g.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = g;
  ctx.fillRect(x - r, y - r, r * 2, r * 2);
}

export const TEMPLATE_BG = "#F6F6F9";

/** t: 0 → 1 load-in progress. Each block fades up in order, like a slow site assembling itself. */
export function drawTemplate(ctx: CanvasRenderingContext2D, w: number, h: number, t = 1) {
  if (w < 40 || h < 40) return;
  const mobile = w < 720;
  const pad = mobile ? 20 : Math.max(32, w * 0.04);
  const cx = w / 2;

  ctx.save();
  let open = false;
  const stage = (i: number) => {
    if (open) ctx.restore();
    ctx.save();
    open = true;
    const a = Math.max(0, Math.min(1, t * 9 - i));
    const e = 1 - Math.pow(1 - a, 3);
    ctx.globalAlpha = e;
    ctx.translate(0, (1 - e) * 18);
    // restore() resets text state, so every stage starts from the same defaults.
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
  };
  ctx.globalCompositeOperation = "source-over";
  ctx.fillStyle = TEMPLATE_BG;
  ctx.fillRect(0, 0, w, h);

  stage(0);
  // The gradient blob. Of course.
  const s = Math.min(w, h);
  blob(ctx, cx - s * 0.28, h * 0.42, s * 0.55, "rgba(139,92,246,0.42)");
  blob(ctx, cx + s * 0.3, h * 0.36, s * 0.5, "rgba(236,72,153,0.30)");
  blob(ctx, cx + s * 0.05, h * 0.62, s * 0.5, "rgba(59,130,246,0.30)");

  // Subtle dot grid, because every template has one.
  ctx.fillStyle = "rgba(15,23,42,0.06)";
  const gap = mobile ? 22 : 28;
  for (let y = gap; y < h; y += gap) {
    for (let x = gap; x < w; x += gap) ctx.fillRect(x, y, 1.2, 1.2);
  }

  stage(1);
  // Nav
  const navY = mobile ? 26 : 36;
  ctx.textBaseline = "middle";
  ctx.fillStyle = "#0F172A";
  ctx.font = `700 ${mobile ? 17 : 20}px ${SYS}`;
  ctx.textAlign = "left";
  ctx.fillText("Agency®", pad, navY + 8);

  if (!mobile) {
    ctx.font = `500 15px ${SYS}`;
    ctx.fillStyle = "#475569";
    const links = ["Services", "Solutions", "Work", "About", "Blog"];
    let lx = cx - 210;
    for (const l of links) {
      ctx.fillText(l, lx, navY + 8);
      lx += ctx.measureText(l).width + 34;
    }
  }
  const navBtnW = mobile ? 108 : 132;
  const navBtnX = w - pad - navBtnW;
  roundRect(ctx, navBtnX, navY - 12, navBtnW, 40, 20);
  ctx.fillStyle = "#0F172A";
  ctx.fill();
  ctx.fillStyle = "#FFFFFF";
  ctx.font = `600 ${mobile ? 13 : 14}px ${SYS}`;
  ctx.textAlign = "center";
  ctx.fillText("Get started", navBtnX + navBtnW / 2, navY + 8);

  stage(2);
  // Badge
  const top = mobile ? h * 0.2 : h * 0.24;
  ctx.font = `500 ${mobile ? 12 : 14}px ${SYS}`;
  const badge = "✨ New: AI-powered solutions  →";
  const bw = ctx.measureText(badge).width + 32;
  roundRect(ctx, cx - bw / 2, top - 17, bw, 34, 17);
  ctx.fillStyle = "rgba(255,255,255,0.75)";
  ctx.fill();
  ctx.strokeStyle = "rgba(139,92,246,0.35)";
  ctx.lineWidth = 1;
  ctx.stroke();
  ctx.fillStyle = "#6D28D9";
  ctx.fillText(badge, cx, top + 1);

  stage(3);
  // Headline
  const hs = mobile ? Math.min(w * 0.095, 40) : Math.min(w * 0.058, 78);
  ctx.fillStyle = "#0F172A";
  ctx.font = `700 ${hs}px ${SYS}`;
  const hl = mobile
    ? ["We transform", "ideas into digital", "experiences."]
    : ["We transform ideas into", "digital experiences."];
  let y = top + (mobile ? 58 : 78) + hs * 0.2;
  for (const line of hl) {
    ctx.fillText(line, cx, y);
    y += hs * 1.12;
  }

  stage(4);
  // Subhead
  ctx.fillStyle = "#64748B";
  const ss = mobile ? 15 : Math.min(20, w * 0.015);
  ctx.font = `400 ${ss}px ${SYS}`;
  const sub = mobile
    ? ["Where creativity meets technology.", "Innovative solutions, tailored", "to your vision."]
    : [
        "Where creativity meets technology. Innovative solutions tailored",
        "to your vision, powered by our passion and expertise.",
      ];
  y += ss * 0.6;
  for (const line of sub) {
    ctx.fillText(line, cx, y);
    y += ss * 1.55;
  }

  stage(5);
  // Buttons
  y += mobile ? 22 : 30;
  const b1w = mobile ? 150 : 170;
  const b2w = mobile ? 130 : 150;
  const bh = mobile ? 46 : 52;
  const gapB = 12;
  const bx = cx - (b1w + b2w + gapB) / 2;
  const grad = ctx.createLinearGradient(bx, 0, bx + b1w, 0);
  grad.addColorStop(0, "#7C3AED");
  grad.addColorStop(1, "#DB2777");
  ctx.shadowColor = "rgba(124,58,237,0.35)";
  ctx.shadowBlur = 24;
  ctx.shadowOffsetY = 8;
  roundRect(ctx, bx, y - bh / 2, b1w, bh, bh / 2);
  ctx.fillStyle = grad;
  ctx.fill();
  ctx.shadowColor = "transparent";
  ctx.fillStyle = "#FFFFFF";
  ctx.font = `600 ${mobile ? 14 : 16}px ${SYS}`;
  ctx.fillText("Get started →", bx + b1w / 2, y + 1);
  roundRect(ctx, bx + b1w + gapB, y - bh / 2, b2w, bh, bh / 2);
  ctx.fillStyle = "rgba(255,255,255,0.8)";
  ctx.fill();
  ctx.strokeStyle = "#CBD5E1";
  ctx.stroke();
  ctx.fillStyle = "#0F172A";
  ctx.fillText("Learn more", bx + b1w + gapB + b2w / 2, y + 1);

  stage(6);
  // Social proof that proves nothing
  y += mobile ? 64 : 84;
  ctx.fillStyle = "#94A3B8";
  ctx.font = `500 ${mobile ? 11 : 13}px ${SYS}`;
  ctx.fillText("TRUSTED BY 500+ COMPANIES WORLDWIDE", cx, y);
  y += mobile ? 28 : 36;
  const logos = mobile ? 3 : 5;
  const lw = mobile ? 76 : 104;
  const lgap = mobile ? 18 : 36;
  let lx0 = cx - (logos * lw + (logos - 1) * lgap) / 2;
  ctx.fillStyle = "rgba(148,163,184,0.45)";
  for (let i = 0; i < logos; i++) {
    roundRect(ctx, lx0, y - 10, lw, 20, 6);
    ctx.fill();
    lx0 += lw + lgap;
  }

  stage(7);
  // Feature cards peeking from the fold
  y += mobile ? 44 : 60;
  const cards = mobile ? 1 : 3;
  const cw = mobile ? w - pad * 2 : Math.min(360, (w - pad * 2 - 48) / 3);
  const cgap = 24;
  let cxs = cx - (cards * cw + (cards - 1) * cgap) / 2;
  const icons = ["⚡", "🚀", "💡"];
  const titles = ["Lightning fast", "Scalable growth", "Smart solutions"];
  for (let i = 0; i < cards; i++) {
    ctx.shadowColor = "rgba(15,23,42,0.08)";
    ctx.shadowBlur = 30;
    ctx.shadowOffsetY = 12;
    roundRect(ctx, cxs, y, cw, 220, 20);
    ctx.fillStyle = "rgba(255,255,255,0.9)";
    ctx.fill();
    ctx.shadowColor = "transparent";
    roundRect(ctx, cxs + 24, y + 24, 44, 44, 12);
    ctx.fillStyle = "rgba(139,92,246,0.12)";
    ctx.fill();
    ctx.font = `20px ${SYS}`;
    ctx.fillText(icons[i], cxs + 46, y + 47);
    ctx.textAlign = "left";
    ctx.fillStyle = "#0F172A";
    ctx.font = `600 17px ${SYS}`;
    ctx.fillText(titles[i], cxs + 24, y + 96);
    ctx.fillStyle = "rgba(148,163,184,0.5)";
    roundRect(ctx, cxs + 24, y + 120, cw * 0.72, 9, 4);
    ctx.fill();
    roundRect(ctx, cxs + 24, y + 138, cw * 0.55, 9, 4);
    ctx.fill();
    ctx.textAlign = "center";
    cxs += cw + cgap;
  }

  if (open) ctx.restore();
  ctx.restore();
}
