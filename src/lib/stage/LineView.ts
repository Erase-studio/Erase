import * as THREE from "three";
import { pixelCamera, type Frame, type Shared, type View, warmScene } from "./Stage";
import { materials, PALETTE, pencilBodyGeometry, pencilTipGeometry } from "./objects";
import { sound } from "@/lib/sound";

/**
 * Graphite strokes, drawn by a pencil as you scroll. Each element with
 * data-line="x,y[,z];…" is one stroke through those fractions of its box
 * (z in px, toward the viewer); phones can use data-line-m instead. Strokes are
 * kept for the few places where a hand-drawn mark says something (a statement
 * underlined, a title, the last call to action circled), not everywhere.
 */
const GRAPHITE = new THREE.Color("#23252a");
const CHALK = new THREE.Color("#d9d7d0");

type Stroke = {
  curve: THREE.CatmullRomCurve3;
  tube: THREE.Mesh;
  caps: THREE.Mesh[];
  samples: { u: number; reach: number }[];
  segments: number;
  length: number;
  u: number;
};

export class LineView implements View {
  full = true;
  order = 10;
  el: HTMLElement;
  private scene = new THREE.Scene();
  private camera = pixelCamera(1, 1);
  private strokes: Stroke[] = [];
  private radial = 10;
  private pencil = new THREE.Group();
  private lineMat: THREE.MeshPhysicalMaterial;
  private cap = new THREE.SphereGeometry(1, 16, 12);
  private radius = 6;
  private lift = 1;
  private last: { stroke: Stroke; u: number } | null = null;
  /** Boxes the line must not be drawn over (windows onto other scenes). */
  private hides: HTMLElement[] = [];

  constructor(el: HTMLElement, shared: Shared) {
    this.el = el;
    this.lineMat = new THREE.MeshPhysicalMaterial({
      color: (document.documentElement.dataset.theme === "dark" ? CHALK : GRAPHITE).clone(),
      // Graphite is metallic, but metal with nothing to reflect goes black.
      metalness: shared.env ? 0.72 : 0.12,
      roughness: shared.env ? 0.34 : 0.5,
      clearcoat: 0.3,
      envMap: shared.env,
      envMapIntensity: 1.2,
    });
    const mats = materials(shared.env, shared.family);
    const body = new THREE.Mesh(pencilBodyGeometry(), mats.lacquer.clone());
    (body.material as THREE.MeshPhysicalMaterial).color = PALETTE.blue.clone();
    const tip = new THREE.Mesh(pencilTipGeometry(), mats.tip);
    this.pencil.add(body, tip);
    this.pencil.scale.setScalar(96);
    this.scene.add(this.pencil);
    const key = new THREE.DirectionalLight(0xffffff, 2);
    key.position.set(-0.4, 0.8, 1);
    this.scene.add(key, new THREE.HemisphereLight(0xffffff, 0x9aa0ad, 0.9));
  }

  private clear() {
    for (const s of this.strokes) {
      this.scene.remove(s.tube, ...s.caps);
      s.tube.geometry.dispose();
    }
    this.strokes = [];
  }

  /** Re-read the strokes from the page. Call after layout changes; reset on a new page. */
  measure(reset = false) {
    const keep = new Map(reset ? [] : this.strokes.map((s, i) => [i, s.u]));
    this.clear();
    this.last = null;
    this.hides = [...document.querySelectorAll<HTMLElement>("[data-line-hide]")];
    const narrow = window.innerWidth < 700;
    this.radius = narrow ? 3.5 : 6;
    this.pencil.scale.setScalar(narrow ? 58 : 96);
    document.querySelectorAll<HTMLElement>("[data-line]").forEach((el) => {
      // Layout boxes, not painted ones: entrance animations mustn't bend the stroke.
      let x = 0;
      let y = 0;
      for (let e: HTMLElement | null = el; e; e = e.offsetParent as HTMLElement | null) {
        x += e.offsetLeft;
        y += e.offsetTop;
      }
      const w = el.offsetWidth;
      const h = el.offsetHeight;
      if (!w && !h) return;
      const route = (narrow && el.dataset.lineM) || el.dataset.line || "";
      const pts: THREE.Vector3[] = [];
      for (const spec of route.split(";")) {
        const [fx, fy, z] = spec.split(",").map(Number);
        if (!Number.isNaN(fx)) pts.push(new THREE.Vector3(x + fx * w, -(y + fy * h), z || 0));
      }
      if (pts.length < 2) return;
      const curve = new THREE.CatmullRomCurve3(pts, false, "centripetal", 0.5);
      const length = curve.getLength();
      const segments = Math.min(3000, Math.max(48, Math.round(length / 7)));
      const tube = new THREE.Mesh(new THREE.TubeGeometry(curve, segments, this.radius, this.radial, false), this.lineMat);
      tube.frustumCulled = false;
      const caps = [0, 1].map(() => {
        const m = new THREE.Mesh(this.cap, this.lineMat);
        m.scale.setScalar(this.radius);
        return m;
      });
      caps[0].position.copy(curve.getPointAt(0));
      // How far down the page the stroke has reached by each point along it.
      const samples: Stroke["samples"] = [];
      let reach = -Infinity;
      const N = Math.min(1200, segments);
      for (let k = 0; k <= N; k++) {
        const u = k / N;
        reach = Math.max(reach, -curve.getPointAt(u).y);
        samples.push({ u, reach });
      }
      this.scene.add(tube, ...caps);
      this.strokes.push({ curve, tube, caps, samples, segments, length, u: keep.get(this.strokes.length) ?? 0 });
    });
  }

  update(f: Frame) {
    // Graphite by day; at night the strokes are chalk so they still read.
    const night = document.documentElement.dataset.theme === "dark";
    this.lineMat.color.lerp(night ? CHALK : GRAPHITE, 1 - Math.exp(-f.dt * 6));
    pixelCamera(f.vw, f.vh, this.camera);
    this.camera.position.set(f.vw / 2, -(f.scrollY + f.vh / 2), this.camera.position.z);

    // The pencil works a little below the middle of the screen; whatever is in the
    // first screen gets drawn as the page opens. Nothing starts under the loader.
    const open = !!window.__eraseLoaded && !window.__erasePT;
    const tipY = f.reduced ? Infinity : open ? Math.max(f.scrollY + f.vh * 0.7, f.vh * 0.92) : -Infinity;
    let active: Stroke | null = null;
    let drawing = 0;
    for (const s of this.strokes) {
      const before = s.u;
      let target = 0;
      for (const p of s.samples) {
        if (p.reach > tipY) break;
        target = p.u;
      }
      if (f.reduced) s.u = target;
      else {
        // A hand's pace (about 1400 px a second) while it keeps up; if you scroll
        // faster it hurries, so the pencil never drops out of view.
        const gap = Math.abs(target - s.u) * s.length;
        const step = (target - s.u) * (1 - Math.exp(-f.dt * 7));
        const cap = (Math.max(1400, gap * 5) / s.length) * f.dt;
        s.u += Math.max(-cap * 3, Math.min(cap, step));
      }
      const drawn = Math.floor(s.u * s.segments);
      (s.tube.geometry as THREE.BufferGeometry).setDrawRange(0, drawn * this.radial * 6);
      s.caps[1].position.copy(s.curve.getPointAt(Math.max(0.0005, s.u)));
      s.caps[0].visible = s.caps[1].visible = drawn > 0;
      if (!active && s.u > 0.002 && s.u < 0.998) active = s;
      drawing = Math.max(drawing, ((s.u - before) * s.length) / Math.max(f.dt, 1e-3));
    }
    // Lead on paper, as fast as the line is growing (drawing forward only).
    if (drawing > 30 && !f.reduced) sound.write(drawing);

    // The pencil rides whichever stroke is being drawn, and lifts away between them.
    if (active) this.last = { stroke: active, u: active.u };
    this.lift += ((active ? 0 : 1) - this.lift) * (1 - Math.exp(-f.dt * 5));
    this.pencil.visible = !!this.last && this.lift < 0.98 && !f.reduced;
    if (this.pencil.visible && this.last) {
      const { stroke, u } = this.last;
      const end = stroke.curve.getPointAt(Math.max(0.0005, Math.min(0.9995, u)));
      const t = stroke.curve.getTangentAt(Math.min(0.999, Math.max(0.001, u)));
      const axis = new THREE.Vector3(t.x * 0.35 - 0.5, t.y * 0.35 - 0.62, -0.95).normalize();
      this.pencil.quaternion.setFromUnitVectors(new THREE.Vector3(1, 0, 0), axis);
      this.pencil.rotateX(f.time * 0.4);
      const reach = 1.55 * this.pencil.scale.x;
      this.pencil.position.copy(end).addScaledVector(axis, -reach);
      this.pencil.position.z += this.lift * 400;
      this.pencil.position.x += this.lift * 200;
    }
  }

  warm(r: THREE.WebGLRenderer) {
    return warmScene(r, this.scene, this.camera);
  }

  render(r: THREE.WebGLRenderer, f: Frame) {
    const { vw, vh } = f;
    let hide: DOMRect | null = null;
    for (const el of this.hides) {
      const b = el.getBoundingClientRect();
      if (b.bottom > 0 && b.top < vh && b.width > 0) hide = b;
    }
    if (!hide) {
      r.render(this.scene, this.camera);
      return;
    }
    // Draw around the box: the bands above and below it, and either side.
    const t = Math.max(0, hide.top);
    const btm = Math.min(vh, hide.bottom);
    const bands = [
      [0, 0, vw, t],
      [0, btm, vw, vh - btm],
      [0, t, Math.max(0, hide.left), btm - t],
      [hide.right, t, vw - hide.right, btm - t],
    ];
    r.setScissorTest(true);
    for (const [x, y, w, h] of bands) {
      if (w < 1 || h < 1) continue;
      r.setScissor(x, vh - y - h, w, h);
      r.render(this.scene, this.camera);
    }
    r.setScissorTest(false);
  }

  dispose() {
    this.clear();
    this.cap.dispose();
    this.lineMat.dispose();
  }
}
