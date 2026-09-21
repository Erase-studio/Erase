import * as THREE from "three";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";
import { warmScene, type Frame, type Shared, type View } from "./Stage";
import { materials, PALETTE, ERASER } from "./objects";
import { sound } from "@/lib/sound";

/**
 * The pencil case.
 *
 * Six erasers lie in a tray, each worn by the job it does: the strategy one is
 * barely touched, the one that handles launches and care is down to a sliver.
 * Scroll and they lift out, turn, and stand up in a row. Point at a service in
 * the list and its eraser rises and turns its worn face toward you.
 *
 * A deck of cards would be a borrowed metaphor. An eraser worn differently by
 * each kind of work is the studio's own argument, in an object you can read at
 * a glance.
 */

/** How used each one is, in the order the services are listed. */
const WEAR = [0.06, 0.22, 0.34, 0.44, 0.58, 0.76];

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));
const smooth = (v: number) => {
  const t = clamp01(v);
  return t * t * (3 - 2 * t);
};

type Piece = {
  group: THREE.Group;
  rubber: THREE.Mesh;
  /** Where it lies in the tray, and how it lies. */
  rest: THREE.Vector3;
  restRot: THREE.Euler;
  /** Where it stands once it's out. */
  home: THREE.Vector3;
  wear: number;
  lift: number;
  spin: number;
};

export class SuiteView implements View {
  order = 4;
  el: HTMLElement;
  margin = 240;
  private scene = new THREE.Scene();
  private camera = new THREE.PerspectiveCamera(26, 1, 0.1, 60);
  private pieces: Piece[] = [];
  private root = new THREE.Group();
  private p = 0;
  private joined = false;
  private hot = -1;
  private lastHot = -1;
  private disposables: { dispose(): void }[] = [];
  private tmp = new THREE.Vector3();

  constructor(el: HTMLElement, shared: Shared) {
    this.el = el;
    const mats = materials(shared.env, shared.family);
    mats.rubber.color = new THREE.Color("#f2f1ec");
    this.disposables.push(...Object.values(mats));
    this.disposables.push({ dispose: () => mats.sleeve.map?.dispose() });

    const n = WEAR.length;
    for (let i = 0; i < n; i++) {
      const wear = WEAR[i];
      const group = new THREE.Group();
      // Worn short and, at the used end, worn to an angle.
      const len = ERASER.x * (1 - wear * 0.62);
      const geo = new RoundedBoxGeometry(len, ERASER.y, ERASER.z, 4, 0.08);
      const rubber = new THREE.Mesh(geo, mats.rubber);
      // The worn end is rolled over, the way a rubber goes after real use.
      const pos = geo.attributes.position as THREE.BufferAttribute;
      for (let v = 0; v < pos.count; v++) {
        const x = pos.getX(v);
        const t = clamp01((x / (len / 2) + 1) / 2); // 0 at the fresh end, 1 at the worn one
        const bite = smooth((t - 0.55) / 0.45) * wear;
        pos.setY(v, pos.getY(v) * (1 - bite * 0.55));
        pos.setZ(v, pos.getZ(v) * (1 - bite * 0.3));
      }
      geo.computeVertexNormals();
      this.disposables.push(geo);

      // A sleeve on the fresh end, sized to what's left.
      const sg = new RoundedBoxGeometry(len * 0.5, ERASER.y * 1.06, ERASER.z * 1.12, 2, 0.02);
      sg.translate(-len * 0.24, 0, 0);
      const card = new THREE.MeshPhysicalMaterial({ color: 0x141517, roughness: 0.3, clearcoat: 0.8, envMap: shared.env });
      const sleeve = new THREE.Mesh(sg, card);
      this.disposables.push(sg, card);

      // One blue band per eraser, brighter the more it has been used.
      const bandG = new RoundedBoxGeometry(len * 0.1, ERASER.y * 1.08, ERASER.z * 1.14, 2, 0.02);
      bandG.translate(len * 0.04, 0, 0);
      const bandM = new THREE.MeshPhysicalMaterial({ color: PALETTE.blue.clone().multiplyScalar(0.7 + wear * 0.6), roughness: 0.35, clearcoat: 0.7, envMap: shared.env });
      const band = new THREE.Mesh(bandG, bandM);
      this.disposables.push(bandG, bandM);

      group.add(rubber, sleeve, band);
      // Lying in the tray: a loose scatter, all flat.
      const jog = (k: number) => Math.sin(i * 12.9898 + k) * 0.5 + 0.5;
      const rest = new THREE.Vector3((i - (n - 1) / 2) * 0.62 + (jog(1) - 0.5) * 0.5, -0.9 + (jog(3) - 0.5) * 0.06, (jog(2) - 0.5) * 0.9);
      const restRot = new THREE.Euler(Math.PI / 2, (jog(4) - 0.5) * 1.9, (jog(5) - 0.5) * 0.7, "YXZ");
      // Standing, bottoms on one line, so the worn ones are visibly shorter —
      // a bar chart of how much each kind of work gets used.
      const home = new THREE.Vector3((i - (n - 1) / 2) * 1.12, (len - 1) / 2 - 0.05, 0);
      group.position.copy(rest);
      group.rotation.copy(restRot);
      this.root.add(group);
      this.pieces.push({ group, rubber, rest, restRot, home, wear, lift: 0, spin: 0 });
    }

    const key = new THREE.DirectionalLight(0xffffff, 3.2);
    key.position.set(-3, 5, 5);
    const rim = new THREE.DirectionalLight(0xc8d4ff, 2.2);
    rim.position.set(4, 1, -4);
    const fill = new THREE.HemisphereLight(0xffffff, 0x2448ff, 1.1);
    this.scene.add(key, rim, fill, this.root);
    this.camera.position.set(0, 0.3, 7.4);
  }

  /** The list tells the view which row the pointer is on. */
  setHot(i: number) {
    this.hot = i;
  }

  update(f: Frame) {
    const { rect, vw, vh, dt, time, pointer } = f;
    // Framed on its own box, not on the screen: the row has to fit whatever
    // shape the box is, from a wide desktop strip to a squat phone one.
    const aspect = rect.width / Math.max(1, rect.height);
    this.camera.aspect = aspect;
    const z = this.camera.position.z;
    const tanHalf = Math.max(1.35 / z, 3.9 / (z * aspect));
    this.camera.fov = (2 * Math.atan(tanHalf) * 180) / Math.PI;
    this.camera.clearViewOffset();
    this.camera.updateProjectionMatrix();

    // Out of the tray between the box entering the lower screen and reaching
    // its upper third, so they're all standing by the time you're reading.
    const target = f.reduced ? 1 : clamp01((vh * 0.95 - rect.top) / (vh * 0.6));
    if (!this.joined) {
      this.joined = true;
      this.p = target;
    }
    this.p += (target - this.p) * (1 - Math.exp(-dt * 6));
    const p = this.p;

    if (this.hot !== this.lastHot && this.hot >= 0 && !f.reduced) sound.pop(this.hot);
    this.lastHot = this.hot;

    this.pieces.forEach((q, i) => {
      // They come out of the tray one after another, left to right.
      const out = smooth((p - i * 0.05) / 0.6);
      const want = this.hot === i ? 1 : 0;
      q.lift += (want - q.lift) * (1 - Math.exp(-dt * 9));

      // Position: tray → row, then a little higher when it's the chosen one.
      this.tmp.copy(q.rest).lerp(q.home, out);
      q.group.position.copy(this.tmp);
      q.group.position.y += q.lift * 0.52 + Math.sin(time * 1.1 + i) * 0.02 * out * (f.reduced ? 0 : 1);

      // Rotation: flat in the tray, upright in the row, and turning its worn
      // end toward you when it's picked.
      q.spin += (q.lift * Math.PI * 0.78 - q.spin) * (1 - Math.exp(-dt * 8));
      q.group.rotation.set(
        THREE.MathUtils.lerp(q.restRot.x, -0.08 + q.lift * 0.2, out),
        THREE.MathUtils.lerp(q.restRot.y, q.spin, out),
        THREE.MathUtils.lerp(q.restRot.z, -Math.PI / 2, out),
        "YXZ",
      );
      q.group.scale.setScalar(THREE.MathUtils.lerp(0.9, 1, out) * (1 + q.lift * 0.08));
    });

    // The whole tray leans a little toward the pointer.
    const live = pointer.x > -1e3 && !f.reduced;
    const nx = live ? (pointer.x / vw) * 2 - 1 : 0;
    const ny = live ? -((pointer.y / vh) * 2 - 1) : 0;
    this.root.rotation.y += (nx * 0.16 - this.root.rotation.y) * (1 - Math.exp(-dt * 3));
    this.root.rotation.x += (-ny * 0.1 - this.root.rotation.x) * (1 - Math.exp(-dt * 3));
  }

  warm(r: THREE.WebGLRenderer) {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    return warmScene(r, this.scene, this.camera);
  }

  render(r: THREE.WebGLRenderer) {
    r.render(this.scene, this.camera);
  }

  dispose() {
    this.disposables.forEach((d) => d.dispose());
  }
}
