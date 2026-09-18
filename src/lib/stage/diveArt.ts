import * as THREE from "three";

/**
 * Flat art for the dive: the agency clichés the eraser flies through, and the
 * pencil-doodle stickers waiting at the end. All drawn on canvases at load.
 */

export const CLICHES = ["LOREM IPSUM", "SYNERGY", "BEST-IN-CLASS", "STOCK PHOTO", "SOLUTIONS", "GET STARTED", "INNOVATIVE", "TRUSTED BY"];

const ROW = 192;

/** One texture, one word per row. */
export function clicheAtlas(family: string) {
  const c = document.createElement("canvas");
  c.width = 1024;
  c.height = ROW * CLICHES.length;
  const x = c.getContext("2d")!;
  x.fillStyle = "#fff";
  x.textAlign = "center";
  x.textBaseline = "middle";
  CLICHES.forEach((w, i) => {
    let size = 170;
    x.font = `600 ${size}px ${family}`;
    const m = x.measureText(w).width;
    if (m > 960) size = Math.floor((size * 960) / m);
    x.font = `600 ${size}px ${family}`;
    x.fillText(w, 512, i * ROW + ROW / 2 + size * 0.04);
  });
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  return { texture: t, rows: CLICHES.length, aspect: 1024 / ROW };
}

type Pen = CanvasRenderingContext2D;

/** Each doodle is a path; the sticker is that path with a thick white die-cut border. */
const DOODLES: ((x: Pen) => void)[] = [
  // star
  (x) => {
    for (let i = 0; i < 10; i++) {
      const a = -Math.PI / 2 + (i * Math.PI) / 5;
      const r = i % 2 ? 36 : 84;
      const f = i ? x.lineTo.bind(x) : x.moveTo.bind(x);
      f(Math.cos(a) * r, Math.sin(a) * r);
    }
    x.closePath();
  },
  // heart
  (x) => {
    x.moveTo(0, 70);
    x.bezierCurveTo(-110, -6, -52, -92, 0, -38);
    x.bezierCurveTo(52, -92, 110, -6, 0, 70);
    x.closePath();
  },
  // lightning
  (x) => {
    x.moveTo(18, -88);
    x.lineTo(-46, 10);
    x.lineTo(-4, 10);
    x.lineTo(-22, 88);
    x.lineTo(48, -14);
    x.lineTo(6, -14);
    x.closePath();
  },
  // speech bubble
  (x) => {
    x.moveTo(-80, -52);
    x.quadraticCurveTo(-80, -70, -62, -70);
    x.lineTo(62, -70);
    x.quadraticCurveTo(80, -70, 80, -52);
    x.lineTo(80, 22);
    x.quadraticCurveTo(80, 40, 62, 40);
    x.lineTo(-14, 40);
    x.lineTo(-44, 74);
    x.lineTo(-40, 40);
    x.lineTo(-62, 40);
    x.quadraticCurveTo(-80, 40, -80, 22);
    x.closePath();
  },
  // smiley
  (x) => x.arc(0, 0, 78, 0, Math.PI * 2),
  // arrow
  (x) => {
    x.moveTo(-84, 18);
    x.lineTo(20, 18);
    x.lineTo(20, 52);
    x.lineTo(86, 0);
    x.lineTo(20, -52);
    x.lineTo(20, -18);
    x.lineTo(-84, -18);
    x.closePath();
  },
  // cloud
  (x) => {
    x.moveTo(-70, 40);
    x.arc(-52, 8, 34, Math.PI * 0.6, Math.PI * 1.45);
    x.arc(-6, -24, 46, Math.PI * 1.1, Math.PI * 1.9);
    x.arc(48, 0, 38, Math.PI * 1.5, Math.PI * 0.45);
    x.closePath();
  },
  // flower
  (x) => {
    for (let i = 0; i < 6; i++) {
      const a = (i * Math.PI) / 3;
      x.moveTo(Math.cos(a) * 46 + 34, Math.sin(a) * 46);
      x.arc(Math.cos(a) * 46, Math.sin(a) * 46, 34, 0, Math.PI * 2);
    }
  },
];

/** Marks drawn on top of each sticker in graphite pencil. */
const DETAILS: ((x: Pen) => void)[] = [
  () => {},
  (x) => {
    x.moveTo(-34, -24);
    x.quadraticCurveTo(-46, -8, -36, 6);
  },
  () => {},
  (x) => {
    x.font = "700 64px ui-rounded, system-ui, sans-serif";
    x.textAlign = "center";
    x.textBaseline = "middle";
    x.fillStyle = "#141517";
    x.fillText("hi!", 0, -14);
  },
  (x) => {
    x.moveTo(-26, -26);
    x.lineTo(-26, -6);
    x.moveTo(26, -26);
    x.lineTo(26, -6);
    x.moveTo(-40, 18);
    x.quadraticCurveTo(0, 56, 40, 18);
  },
  () => {},
  () => {},
  (x) => {
    x.moveTo(12, 0);
    x.arc(0, 0, 12, 0, Math.PI * 2);
  },
];

// They land on Erase blue, so no blue fills.
const FILLS = ["#141517", "#ffffff", "#141517", "#ffffff", "#ecebe6", "#141517", "#ffffff", "#b9bcc4"];

/** 4×2 atlas of die-cut stickers, 256px cells. */
export function stickerAtlas() {
  const cell = 256;
  const c = document.createElement("canvas");
  c.width = cell * 4;
  c.height = cell * 2;
  const x = c.getContext("2d")!;
  x.lineJoin = "round";
  x.lineCap = "round";
  DOODLES.forEach((shape, i) => {
    x.save();
    x.translate((i % 4) * cell + cell / 2, Math.floor(i / 4) * cell + cell / 2);
    // Die-cut border with a soft drop shadow.
    x.beginPath();
    shape(x);
    x.shadowColor = "rgba(0,0,0,0.35)";
    x.shadowBlur = 14;
    x.shadowOffsetY = 6;
    x.strokeStyle = "#fff";
    x.lineWidth = 34;
    x.stroke();
    x.fillStyle = "#fff";
    x.fill();
    x.shadowColor = "transparent";
    // The doodle: flat fill and a pencil outline.
    x.beginPath();
    shape(x);
    x.fillStyle = FILLS[i];
    x.fill();
    x.strokeStyle = "#141517";
    x.lineWidth = 7;
    x.stroke();
    x.beginPath();
    DETAILS[i](x);
    x.strokeStyle = FILLS[i] === "#141517" ? "#ecebe6" : "#141517";
    x.lineWidth = 8;
    x.stroke();
    x.restore();
  });
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return { texture: t, count: DOODLES.length, cols: 4, rows: 2 };
}
