import * as THREE from "three";
import { pixelCamera, type Frame, type Shared, type View } from "./Stage";
import { materials, PALETTE, pencilBodyGeometry, pencilTipGeometry } from "./objects";

/**
 * One graphite line through the whole page, drawn by a pencil as you scroll.
 * Its route is set in the markup: any element with data-line="x,y[,z]" adds a
 * point at that fraction of its box (z in px, toward the viewer).
 */
const GRAPHITE = new THREE.Color("#23252a");
const CHALK = new THREE.Color("#d9d7d0");

export class LineView implements View {
  full = true;
  order = 10;
  el: HTMLElement;
  private scene = new THREE.Scene();
  private camera = pixelCamera(1, 1);
  private tube: THREE.Mesh | null = null;
  private caps: THREE.Mesh[] = [];
  private samples: { u: number; reach: number }[] = [];
  private curve: THREE.CatmullRomCurve3 | null = null;
  private segments = 0;
  private radial = 10;
  private u = 0;
  private pencil = new THREE.Group();
  private lineMat: THREE.MeshPhysicalMaterial;
  private geos: THREE.BufferGeometry[] = [];
  private radius = 6;
  private lift = 1;
  private length = 1;
  /** Boxes the line must not be drawn over (windows onto other scenes). */
  private hides: HTMLElement[] = [];

  constructor(el: HTMLElement, shared: Shared) {
    this.el = el;
    this.lineMat = new THREE.MeshPhysicalMaterial({
      color: (document.documentElement.dataset.theme === "dark" ? CHALK : GRAPHITE).clone(),
      metalness: 0.72,
      roughness: 0.34,
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
    const cap = new THREE.SphereGeometry(1, 16, 12);
    this.geos.push(cap);
    for (let i = 0; i < 2; i++) {
      const m = new THREE.Mesh(cap, this.lineMat);
      this.caps.push(m);
      this.scene.add(m);
    }
  }

  /** Re-read the route from the page. Call after layout changes; reset on a new page. */
  measure(reset = false) {
    if (reset) this.u = 0;
    const pts: THREE.Vector3[] = [];
    this.hides = [...document.querySelectorAll<HTMLElement>("[data-line-hide]")];
    const narrow = window.innerWidth < 700;
    this.radius = narrow ? 3.5 : 6;
    this.pencil.scale.setScalar(narrow ? 58 : 96);
    document.querySelectorAll<HTMLElement>("[data-line]").forEach((el) => {
      // Layout boxes, not painted ones: entrance animations mustn't bend the route.
      let x = 0;
      let y = 0;
      for (let e: HTMLElement | null = el; e; e = e.offsetParent as HTMLElement | null) {
        x += e.offsetLeft;
        y += e.offsetTop;
      }
      const w = el.offsetWidth;
      const h = el.offsetHeight;
      if (!w && !h) return;
      // Phones can have their own route (data-line-m) that keeps to the margins.
      const route = (narrow && el.dataset.lineM) || el.dataset.line || "";
      for (const spec of route.split(";")) {
        const [fx, fy, z] = spec.split(",").map(Number);
        if (Number.isNaN(fx)) continue;
        pts.push(new THREE.Vector3(x + fx * w, -(y + fy * h), z || 0));
      }
    });
    if (this.tube) {
      this.scene.remove(this.tube);
      this.tube.geometry.dispose();
      this.tube = null;
    }
    if (pts.length < 2) {
      this.curve = null;
      return;
    }
    this.curve = new THREE.CatmullRomCurve3(pts, false, "centripetal", 0.5);
    const len = this.curve.getLength();
    this.length = len;
    this.segments = Math.min(5000, Math.max(64, Math.round(len / 7)));
    const geo = new THREE.TubeGeometry(this.curve, this.segments, this.radius, this.radial, false);
    this.tube = new THREE.Mesh(geo, this.lineMat);
    this.tube.frustumCulled = false;
    this.scene.add(this.tube);
    // How far down the page the line has reached by each point along it.
    this.samples = [];
    let reach = -Infinity;
    const N = Math.min(2000, this.segments);
    for (let k = 0; k <= N; k++) {
      const u = k / N;
      reach = Math.max(reach, -this.curve.getPointAt(u).y);
      this.samples.push({ u, reach });
    }
    this.caps.forEach((c) => c.scale.setScalar(this.radius));
    this.caps[0].position.copy(this.curve.getPointAt(0));
  }

  update(f: Frame) {
    // Graphite by day; at night the line is drawn in chalk so it still reads.
    const night = document.documentElement.dataset.theme === "dark";
    this.lineMat.color.lerp(night ? CHALK : GRAPHITE, 1 - Math.exp(-f.dt * 6));
    pixelCamera(f.vw, f.vh, this.camera);
    this.camera.position.set(f.vw / 2, -(f.scrollY + f.vh / 2), this.camera.position.z);
    if (!this.curve || !this.tube) return;

    // The pencil stays a little below the middle of the screen; whatever is in the
    // first screen gets drawn as the page opens. Nothing starts under the loader.
    const open = !!window.__eraseLoaded && !window.__erasePT;
    const tipY = f.reduced ? Infinity : open ? Math.max(f.scrollY + f.vh * 0.68, f.vh * 0.92) : -Infinity;
    let target = 0;
    for (const s of this.samples) {
      if (s.reach > tipY) break;
      target = s.u;
    }
    if (f.reduced) this.u = target;
    else {
      // Eased, but never faster than a hand: about 1600 px of line a second.
      const len = this.length;
      const step = (target - this.u) * (1 - Math.exp(-f.dt * 7));
      const cap = (1600 / len) * f.dt;
      this.u += Math.max(-cap * 3, Math.min(cap, step));
    }
    const drawn = Math.floor(this.u * this.segments);
    (this.tube.geometry as THREE.BufferGeometry).setDrawRange(0, drawn * this.radial * 6);

    const end = this.curve.getPointAt(Math.max(0.0005, this.u));
    this.caps[1].position.copy(end);
    this.caps[0].visible = this.caps[1].visible = drawn > 0;

    // The pencil: tip on the end of the line, body leaning back toward you.
    const done = this.u > 0.998 || this.u < 0.002;
    this.lift += ((done ? 1 : 0) - this.lift) * (1 - Math.exp(-f.dt * 5));
    this.pencil.visible = this.lift < 0.98 && !f.reduced;
    if (this.pencil.visible) {
      const t = this.curve.getTangentAt(Math.min(0.999, Math.max(0.001, this.u)));
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
    r.compile(this.scene, this.camera);
    this.scene.traverse((o) => {
      const m = (o as THREE.Mesh).material as THREE.Material & { map?: THREE.Texture; uniforms?: Record<string, { value: unknown }> };
      if (m?.map) r.initTexture(m.map);
      const t = m?.uniforms?.uMap?.value;
      if (t instanceof THREE.Texture) r.initTexture(t);
    });
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
    this.tube?.geometry.dispose();
    this.geos.forEach((g) => g.dispose());
    this.lineMat.dispose();
  }
}
