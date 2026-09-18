import * as THREE from "three";
import type { Frame, Shared, View } from "./Stage";
import { Clump, makeBody, type Body } from "./clump";
import { eraserGeometry, materials, PALETTE, pencilBodyGeometry, pencilTipGeometry, sleeveGeometry } from "./objects";
import { sound } from "@/lib/sound";

/**
 * A floating clump of the studio's tools inside a dark window. Push through it with
 * the cursor; click to scatter it. It flies together when the page first opens.
 */
export class HeroView implements View {
  order = 0;
  private scene = new THREE.Scene();
  private camera = new THREE.PerspectiveCamera(26, 1, 0.1, 100);
  private clump: Clump;
  private meshes: { rubber: THREE.InstancedMesh; sleeve: THREE.InstancedMesh; body: THREE.InstancedMesh; tip: THREE.InstancedMesh };
  private started = false;
  private startT = 0;
  private ray = new THREE.Raycaster();
  private plane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0);
  private hit = new THREE.Vector3();
  private lastHit = new THREE.Vector3();
  private wasDown = false;
  private m = new THREE.Matrix4();
  private one = new THREE.Vector3(1, 1, 1);
  private geos: THREE.BufferGeometry[];
  private mats: ReturnType<typeof materials>;

  constructor(
    public el: HTMLElement,
    shared: Shared,
    opts: { count?: number; startNow?: boolean } = {},
  ) {
    const coarse = window.matchMedia("(pointer: coarse)").matches;
    const count = opts.count ?? (coarse ? 40 : 84);
    let seed = 7;
    const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);

    // A mix of plain rubbers, sleeved erasers and pencils.
    const bodies: Body[] = [];
    const rubberColors: THREE.Color[] = [];
    const pencilColors: THREE.Color[] = [];
    const pick = (): THREE.Color => {
      const r = rnd();
      return r < 0.36 ? PALETTE.blue : r < 0.72 ? PALETTE.paper : r < 0.92 ? PALETTE.graphite : PALETTE.mist;
    };
    for (let i = 0; i < count; i++) {
      const r = rnd();
      const kind: Body["kind"] = r < 0.42 ? "eraser" : r < 0.72 ? "sleeved" : "pencil";
      const b = makeBody(kind, kind === "pencil" ? 1.25 + rnd() * 0.2 : 1.35 + rnd() * 0.55, rnd);
      const a = rnd() * Math.PI * 2;
      const rad = 18 + rnd() * 10;
      b.p.set(Math.cos(a) * rad, Math.sin(a) * rad * 0.6, (rnd() - 0.5) * 6);
      b.home.set(rnd() * 10, 0, 0);
      bodies.push(b);
      if (kind === "pencil") pencilColors.push(rnd() < 0.5 ? PALETTE.blue : rnd() < 0.6 ? PALETTE.graphite : PALETTE.paper);
      else rubberColors.push(kind === "sleeved" && rnd() < 0.5 ? PALETTE.paper : pick());
    }
    this.clump = new Clump(bodies);

    const mats = materials(shared.env, shared.family);
    this.mats = mats;
    const eg = eraserGeometry();
    const sg = sleeveGeometry();
    const pb = pencilBodyGeometry();
    const pt = pencilTipGeometry();
    this.geos = [eg, sg, pb, pt];
    const nRubber = bodies.filter((b) => b.kind !== "pencil").length;
    const nSleeve = bodies.filter((b) => b.kind === "sleeved").length;
    const nPencil = bodies.filter((b) => b.kind === "pencil").length;
    this.meshes = {
      rubber: new THREE.InstancedMesh(eg, mats.rubber, nRubber),
      sleeve: new THREE.InstancedMesh(sg, mats.sleeve, Math.max(1, nSleeve)),
      body: new THREE.InstancedMesh(pb, mats.lacquer, Math.max(1, nPencil)),
      tip: new THREE.InstancedMesh(pt, mats.tip, Math.max(1, nPencil)),
    };
    rubberColors.forEach((c, i) => this.meshes.rubber.setColorAt(i, c));
    pencilColors.forEach((c, i) => this.meshes.body.setColorAt(i, c));
    for (const mesh of Object.values(this.meshes)) {
      mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
      mesh.frustumCulled = false;
      this.scene.add(mesh);
    }

    // Studio light: a soft key from the top left, a cool rim from behind.
    const key = new THREE.DirectionalLight(0xffffff, 2.4);
    key.position.set(-5, 7, 9);
    const rim = new THREE.DirectionalLight(0x7d93ff, 2.2);
    rim.position.set(6, -3, -8);
    const fill = new THREE.HemisphereLight(0xdfe4ff, 0x0b0c0e, 0.35);
    this.scene.add(key, rim, fill);
    this.camera.position.set(0, 0, 15);

    if (opts.startNow) this.start();
  }

  start() {
    if (this.started) return;
    this.started = true;
    this.startT = performance.now();
    sound.whoosh(1.1, 1.3);
  }

  update(f: Frame) {
    const { rect } = f;
    this.camera.aspect = rect.width / rect.height;
    // Narrow windows: step back so the clump still fits.
    this.camera.position.z = 15 * Math.max(1, 1.9 / this.camera.aspect) ** 0.8;
    this.camera.updateProjectionMatrix();

    const c = this.clump;
    if (this.started) {
      const t = Math.min(1, (performance.now() - this.startT) / 1400);
      c.strength = 0.35 + t * 0.75;
    }

    // The cursor as a sphere on the z = 0 plane.
    const p = f.pointer;
    const inside = p.x >= rect.left && p.x <= rect.right && p.y >= rect.top && p.y <= rect.bottom;
    if (inside && !f.reduced) {
      const nx = ((p.x - rect.left) / rect.width) * 2 - 1;
      const ny = -((p.y - rect.top) / rect.height) * 2 + 1;
      this.ray.setFromCamera(new THREE.Vector2(nx, ny), this.camera);
      this.ray.ray.intersectPlane(this.plane, this.hit);
      c.mouseV.subVectors(this.hit, this.lastHit).divideScalar(f.dt).clampLength(0, 40);
      if (c.mouse.x > 1e3) c.mouseV.set(0, 0, 0);
      this.lastHit.copy(this.hit);
      c.mouse.copy(this.hit);
      if (p.down && !this.wasDown) {
        c.burst(this.hit);
        sound.whoosh(0.7, 0.45, this.hit.x / 8);
      }
      this.wasDown = p.down;
    } else {
      c.mouse.set(1e4, 1e4, 0);
      c.mouseV.set(0, 0, 0);
      this.wasDown = false;
    }

    if (!f.reduced) {
      c.step(f.dt, f.time);
      // The three hardest knocks of the frame, panned to where they happened.
      if (c.hits.length) {
        c.hits.sort((a, b) => b.v - a.v);
        for (const h of c.hits.slice(0, 3)) sound.knock(h.v / 12, h.x / 8, h.kind === "pencil" ? "wood" : "rubber");
      }
    }
    else if (!this.settled) {
      // Reduced motion: assemble the clump instantly, then hold still.
      c.strength = 1.8;
      for (let i = 0; i < 420; i++) c.step(1 / 60, i / 60);
      this.settled = true;
    }

    let ri = 0;
    let si = 0;
    let pi = 0;
    for (const b of c.bodies) {
      this.m.compose(b.p, b.q, this.one.setScalar(b.s));
      if (b.kind === "pencil") {
        this.meshes.body.setMatrixAt(pi, this.m);
        this.meshes.tip.setMatrixAt(pi, this.m);
        pi++;
      } else {
        this.meshes.rubber.setMatrixAt(ri++, this.m);
        if (b.kind === "sleeved") this.meshes.sleeve.setMatrixAt(si++, this.m);
      }
    }
    for (const mesh of Object.values(this.meshes)) mesh.instanceMatrix.needsUpdate = true;
  }

  private settled = false;

  warm(r: THREE.WebGLRenderer) {
    r.compile(this.scene, this.camera);
    this.scene.traverse((o) => {
      const m = (o as THREE.Mesh).material as THREE.Material & { map?: THREE.Texture; uniforms?: Record<string, { value: unknown }> };
      if (m?.map) r.initTexture(m.map);
      const t = m?.uniforms?.uMap?.value;
      if (t instanceof THREE.Texture) r.initTexture(t);
    });
  }

  render(r: THREE.WebGLRenderer) {
    r.render(this.scene, this.camera);
  }

  dispose() {
    this.geos.forEach((g) => g.dispose());
    Object.values(this.mats).forEach((m) => {
      (m as THREE.MeshStandardMaterial).map?.dispose();
      m.dispose();
    });
  }
}
