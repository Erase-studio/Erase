import * as THREE from "three";

/**
 * A small rigid-body solver for a floating clump of tools. Every body is a chain
 * of spheres (good enough for erasers and pencils); a soft pull keeps the clump
 * together, collisions spin things realistically, and the cursor is a moving
 * sphere that shoves its way through.
 */

export type Body = {
  p: THREE.Vector3;
  v: THREE.Vector3;
  q: THREE.Quaternion;
  w: THREE.Vector3;
  s: number;
  kind: "eraser" | "sleeved" | "pencil";
  local: THREE.Vector3[];
  r: number;
  bound: number;
  invM: number;
  invI: number;
  home: THREE.Vector3;
};

const tmp = new THREE.Vector3();
const tmp2 = new THREE.Vector3();
const n = new THREE.Vector3();
const ra = new THREE.Vector3();
const rb = new THREE.Vector3();
const va = new THREE.Vector3();
const vb = new THREE.Vector3();
const J = new THREE.Vector3();
const dq = new THREE.Quaternion();

export function makeBody(kind: Body["kind"], s: number, rnd: () => number): Body {
  const local: THREE.Vector3[] = [];
  let r: number;
  let len: number;
  if (kind === "pencil") {
    r = 0.14 * s;
    len = 3.1 * s;
    const k = 9;
    for (let i = 0; i < k; i++) local.push(new THREE.Vector3((i / (k - 1) - 0.5) * (len - 2 * r), 0, 0));
  } else {
    r = 0.2 * s;
    len = 1 * s;
    for (const x of [-0.3, 0, 0.3]) local.push(new THREE.Vector3(x * s, 0, 0));
  }
  const mass = kind === "pencil" ? 0.8 * s : 1 * s * s;
  const q = new THREE.Quaternion().setFromEuler(new THREE.Euler(rnd() * 6.28, rnd() * 6.28, rnd() * 6.28));
  return {
    p: new THREE.Vector3(),
    v: new THREE.Vector3(),
    q,
    w: new THREE.Vector3(),
    s,
    kind,
    local,
    r,
    bound: len / 2 + r,
    invM: 1 / mass,
    invI: 12 / (mass * len * len),
    home: new THREE.Vector3(),
  };
}

export class Clump {
  bodies: Body[];
  /** Pull toward the middle, per axis: wide, not tall, shallow. */
  pull = new THREE.Vector3(0.22, 0.85, 2.6);
  strength = 0;
  mouse = new THREE.Vector3(1e4, 1e4, 0);
  mouseV = new THREE.Vector3();
  mouseR = 1.3;
  /** Impacts from the last step, loudest first is up to the listener. */
  hits: { v: number; x: number; kind: Body["kind"] }[] = [];
  private world: THREE.Vector3[][];

  constructor(bodies: Body[]) {
    this.bodies = bodies;
    this.world = bodies.map((b) => b.local.map(() => new THREE.Vector3()));
  }

  /** Throws everything outward from a point, e.g. on click. */
  burst(at: THREE.Vector3, power = 14, radius = 5) {
    for (const b of this.bodies) {
      tmp.subVectors(b.p, at);
      const d = tmp.length();
      if (d > radius) continue;
      const k = (1 - d / radius) * power;
      b.v.addScaledVector(tmp.normalize(), k);
      b.w.add(tmp2.set(Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5).multiplyScalar(k * 1.5));
    }
  }

  step(dt: number, time: number) {
    const sub = 3;
    const h = dt / sub;
    this.hits.length = 0;
    for (let s = 0; s < sub; s++) this.substep(h, time);
  }

  private substep(h: number, time: number) {
    const B = this.bodies;
    // Forces: soft pull home, a slow drift around the vertical axis, air drag.
    for (const b of B) {
      tmp.set(-b.p.x * this.pull.x, -b.p.y * this.pull.y, -b.p.z * this.pull.z).multiplyScalar(this.strength);
      b.v.addScaledVector(tmp, h);
      b.v.x += -b.p.z * 0.08 * h;
      b.v.z += b.p.x * 0.08 * h;
      b.v.y += Math.sin(time * 0.6 + b.home.x) * 0.06 * h;
      b.v.multiplyScalar(Math.exp(-1.1 * h));
      b.w.multiplyScalar(Math.exp(-1.4 * h));
    }
    // World-space sphere centres.
    for (let i = 0; i < B.length; i++) {
      const b = B[i];
      const W = this.world[i];
      for (let k = 0; k < b.local.length; k++) W[k].copy(b.local[k]).applyQuaternion(b.q).add(b.p);
    }
    // Contacts.
    for (let i = 0; i < B.length; i++) {
      const a = B[i];
      for (let j = i + 1; j < B.length; j++) {
        const b = B[j];
        const reach = a.bound + b.bound;
        if (a.p.distanceToSquared(b.p) > reach * reach) continue;
        const Wa = this.world[i];
        const Wb = this.world[j];
        for (let x = 0; x < Wa.length; x++)
          for (let y = 0; y < Wb.length; y++) this.contact(a, Wa[x], a.r, b, Wb[y], b.r);
      }
      // The cursor.
      const Wa = this.world[i];
      for (let x = 0; x < Wa.length; x++) this.contact(a, Wa[x], a.r, null, this.mouse, this.mouseR);
    }
    // Integrate.
    for (const b of B) {
      b.p.addScaledVector(b.v, h);
      const wl = b.w.length();
      if (wl > 1e-5) {
        dq.setFromAxisAngle(tmp.copy(b.w).divideScalar(wl), wl * h);
        b.q.premultiply(dq).normalize();
      }
    }
  }

  private contact(a: Body, ca: THREE.Vector3, rA: number, b: Body | null, cb: THREE.Vector3, rB: number) {
    n.subVectors(ca, cb);
    const d2 = n.lengthSq();
    const rr = rA + rB;
    if (d2 >= rr * rr || d2 < 1e-10) return;
    const d = Math.sqrt(d2);
    n.divideScalar(d);
    const pen = rr - d;
    const invB = b ? b.invM : 0;
    const share = a.invM / (a.invM + invB);
    // Push apart (position), mostly moving the lighter body.
    a.p.addScaledVector(n, pen * share * 0.8);
    ca.addScaledVector(n, pen * share * 0.8);
    if (b) {
      b.p.addScaledVector(n, -pen * (1 - share) * 0.8);
      cb.addScaledVector(n, -pen * (1 - share) * 0.8);
    }
    // Velocities at the contact point.
    ra.copy(n).multiplyScalar(-rA).add(ca).sub(a.p);
    va.crossVectors(a.w, ra).add(a.v);
    if (b) {
      rb.copy(n).multiplyScalar(rB).add(cb).sub(b.p);
      vb.crossVectors(b.w, rb).add(b.v);
    } else vb.copy(this.mouseV);
    tmp.subVectors(va, vb);
    const vn = tmp.dot(n);
    if (vn >= 0) return;
    if (-vn > (b ? 2.2 : 3) && this.hits.length < 24) this.hits.push({ v: -vn, x: ca.x, kind: b && b.kind === "pencil" ? "pencil" : a.kind });
    const e = b ? 0.25 : 0.55;
    const jn = (-(1 + e) * vn) / (a.invM + invB + a.invI * 0.15 + (b ? b.invI * 0.15 : 0));
    // Friction along the sliding direction, capped by Coulomb.
    tmp2.copy(tmp).addScaledVector(n, -vn);
    const vt = tmp2.length();
    J.copy(n).multiplyScalar(jn);
    if (vt > 1e-4) J.addScaledVector(tmp2.divideScalar(vt), -Math.min(jn * 0.35, vt / (a.invM + invB + 1e-6)));
    a.v.addScaledVector(J, a.invM);
    a.w.add(tmp.crossVectors(ra, J).multiplyScalar(a.invI));
    if (b) {
      b.v.addScaledVector(J, -b.invM);
      b.w.add(tmp.crossVectors(rb, J).multiplyScalar(-b.invI));
    }
  }
}
