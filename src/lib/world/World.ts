import * as THREE from "three";
import { GPUComputationRenderer, type Variable } from "three/addons/misc/GPUComputationRenderer.js";
import { buildShape, type ShapeId } from "./shapes";
import { scenes, type Scene, type SceneId } from "./scenes";
import { world } from "./store";
import { backdropFragment, backdropVertex, pointsFragment, pointsVertex, positionShader, velocityShader } from "./shaders";

const rgb = (hex: number) => new THREE.Vector3(((hex >> 16) & 255) / 255, ((hex >> 8) & 255) / 255, (hex & 255) / 255);
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const ease = (t: number) => t * t * (3 - 2 * t);

export type Tier = { size: number; dpr: number };

export function pickTier(): Tier {
  const coarse = window.matchMedia("(pointer: coarse)").matches;
  const dpr = Math.min(window.devicePixelRatio || 1, coarse ? 1.5 : 1.75);
  let gpu = "";
  try {
    const gl = document.createElement("canvas").getContext("webgl2");
    const ext = gl?.getExtension("WEBGL_debug_renderer_info");
    gpu = ext ? String(gl!.getParameter(ext.UNMASKED_RENDERER_WEBGL)) : "";
  } catch {}
  const strong = /nvidia|radeon|apple m\d|apple gpu|rtx|geforce/i.test(gpu) && !coarse;
  return { size: coarse ? 160 : strong ? 384 : 256, dpr };
}

/**
 * The persistent world: GPU-simulated dust that forms whatever the page asks for.
 * One renderer, one camera, two compute passes, one draw call of points.
 */
export class World {
  private renderer: THREE.WebGLRenderer;
  private scene = new THREE.Scene();
  private camera = new THREE.PerspectiveCamera(35, 1, 0.1, 200);
  private gpu: GPUComputationRenderer;
  private posVar: Variable;
  private velVar: Variable;
  private points: THREE.Points;
  private backdrop: THREE.Mesh;
  private targets = new Map<ShapeId, THREE.DataTexture>();
  private family: string;
  private n: number;
  private time = 0;
  private camPos = new THREE.Vector3(0, 0, 10);
  private camLook = new THREE.Vector3();
  private parallax = new THREE.Vector2();
  private ray = new THREE.Raycaster();
  private mouseWorld = new THREE.Vector3();
  private mousePrev = new THREE.Vector3();
  private mouseVel = new THREE.Vector3();
  private trail: THREE.Vector4[] = Array.from({ length: 16 }, () => new THREE.Vector4(0, 0, 0, 0));
  private trailHead = 0;
  private lastTrail = { x: 0, y: 0 };
  private night = -1;
  private w = 1;
  private h = 1;
  private dpr: number;
  private slow = 0;
  private matA = new THREE.Matrix4();
  private matB = new THREE.Matrix4();
  private tmpM = new THREE.Matrix4();
  private viewProj = new THREE.Matrix4();

  constructor(
    private host: HTMLElement,
    tier: Tier,
  ) {
    this.dpr = tier.dpr;
    this.family = getComputedStyle(document.body).fontFamily;
    this.renderer = new THREE.WebGLRenderer({ antialias: false, alpha: false, powerPreference: "high-performance", stencil: false, depth: false });
    this.renderer.setPixelRatio(this.dpr);
    this.renderer.autoClear = true;
    host.appendChild(this.renderer.domElement);

    const S = tier.size;
    this.n = S * S;
    this.gpu = new GPUComputationRenderer(S, S, this.renderer);
    if (!this.renderer.capabilities.isWebGL2) this.gpu.setDataType(THREE.HalfFloatType);

    const pos0 = this.gpu.createTexture();
    const vel0 = this.gpu.createTexture();
    const seedCloud = buildShape("cloud", this.n, this.family);
    const pd = pos0.image.data as Float32Array;
    for (let i = 0; i < this.n; i++) {
      pd[i * 4] = seedCloud[i * 4] * 2.2;
      pd[i * 4 + 1] = seedCloud[i * 4 + 1] * 2.2;
      pd[i * 4 + 2] = seedCloud[i * 4 + 2] * 2.2;
      pd[i * 4 + 3] = Math.random();
    }

    this.velVar = this.gpu.addVariable("textureVelocity", velocityShader, vel0);
    this.posVar = this.gpu.addVariable("texturePosition", positionShader, pos0);
    this.gpu.setVariableDependencies(this.velVar, [this.posVar, this.velVar]);
    this.gpu.setVariableDependencies(this.posVar, [this.posVar, this.velVar]);
    const blank = this.target("cloud");
    Object.assign(this.velVar.material.uniforms, {
      tTargetA: { value: blank },
      tTargetB: { value: blank },
      uMatA: { value: new THREE.Matrix4() },
      uMatB: { value: new THREE.Matrix4() },
      uMix: { value: 0 },
      uTime: { value: 0 },
      uDelta: { value: 1 / 60 },
      uSpring: { value: 10 },
      uTurb: { value: 0.3 },
      uScatter: { value: 0 },
      uPulse: { value: 0 },
      uRayO: { value: new THREE.Vector3() },
      uRayD: { value: new THREE.Vector3(0, 0, -1) },
      uMouseV: { value: new THREE.Vector3() },
      uMouseR: { value: 0.6 },
      uMouseF: { value: 0 },
      uViewProj: { value: this.viewProj },
      uTrail: { value: this.trail },
      uAspect: { value: 1 },
    });
    this.posVar.material.uniforms.uDelta = { value: 1 / 60 };
    const err = this.gpu.init();
    if (err) throw new Error(err);

    const geo = new THREE.BufferGeometry();
    const ref = new Float32Array(this.n * 2);
    for (let i = 0; i < this.n; i++) {
      ref[i * 2] = ((i % S) + 0.5) / S;
      ref[i * 2 + 1] = (Math.floor(i / S) + 0.5) / S;
    }
    geo.setAttribute("position", new THREE.BufferAttribute(new Float32Array(this.n * 3), 3));
    geo.setAttribute("ref", new THREE.BufferAttribute(ref, 2));
    this.points = new THREE.Points(
      geo,
      new THREE.ShaderMaterial({
        vertexShader: pointsVertex,
        fragmentShader: pointsFragment,
        transparent: true,
        depthTest: false,
        depthWrite: false,
        uniforms: {
          tPos: { value: null },
          tVel: { value: null },
          uSize: { value: 1 },
          uPixel: { value: this.dpr },
          uFocus: { value: 10 },
          uNight: { value: 0 },
          uAccent: { value: 0.15 },
          uDensity: { value: 1 },
          uInk: { value: rgb(0x0e0f12) },
          uLight: { value: rgb(0xe8ecf4) },
          uBlue: { value: rgb(0x3d63ff) },
        },
      }),
    );
    this.points.frustumCulled = false;

    this.backdrop = new THREE.Mesh(
      new THREE.PlaneGeometry(2, 2),
      new THREE.ShaderMaterial({
        vertexShader: backdropVertex,
        fragmentShader: backdropFragment,
        depthTest: false,
        depthWrite: false,
        uniforms: {
          uNight: { value: 0 },
          uTime: { value: 0 },
          uRes: { value: new THREE.Vector2(1, 1) },
          uPaper: { value: rgb(0xecebe6) },
          uGraphite: { value: rgb(0x0b0c0e) },
          uHaze: { value: rgb(0x3d63ff) },
        },
      }),
    );
    this.backdrop.frustumCulled = false;
    this.backdrop.renderOrder = -1;
    this.scene.add(this.backdrop, this.points);
    this.resize();
  }

  /** Target positions for a shape, built on first use. */
  target(id: ShapeId) {
    let t = this.targets.get(id);
    if (!t) {
      const data = buildShape(id, this.n, this.family);
      const S = Math.sqrt(this.n);
      t = new THREE.DataTexture(data, S, S, THREE.RGBAFormat, THREE.FloatType);
      t.minFilter = t.magFilter = THREE.NearestFilter;
      t.needsUpdate = true;
      this.targets.set(id, t);
    }
    return t;
  }

  /** Build shapes ahead of time (during the loader) so no scroll frame pays for it. */
  prepare(ids: SceneId[]) {
    for (const id of ids) this.target(scenes[id].shape);
  }

  resize() {
    this.w = window.innerWidth;
    this.h = window.innerHeight;
    this.renderer.setSize(this.w, this.h, false);
    this.renderer.domElement.style.width = "100%";
    this.renderer.domElement.style.height = "100%";
    this.camera.aspect = this.w / this.h;
    this.camera.updateProjectionMatrix();
    (this.backdrop.material as THREE.ShaderMaterial).uniforms.uRes.value.set(this.w, this.h);
    this.velVar.material.uniforms.uAspect.value = this.w / this.h;
  }

  private pose(m: THREE.Matrix4, s: Scene, fit: number) {
    // Each scene turns on its own clock, so a still scene is always facing front.
    m.makeRotationFromEuler(new THREE.Euler(s.rot[0], s.rot[1] + s.spin * this.time, s.rot[2]));
    m.scale(new THREE.Vector3(s.scale * fit, s.scale * fit, s.scale * fit));
  }

  update(dtRaw: number) {
    const dt = Math.min(1 / 30, Math.max(1 / 240, dtRaw));
    this.time += dt;

    // Frame budget: if we keep missing it, render fewer pixels. Never more than twice.
    this.slow = dtRaw > 1 / 45 ? this.slow + dtRaw : Math.max(0, this.slow - dtRaw * 0.5);
    if (this.slow > 1.5 && this.dpr > 0.8) {
      this.dpr = Math.max(0.75, this.dpr * 0.8);
      this.renderer.setPixelRatio(this.dpr);
      this.resize();
      (this.points.material as THREE.ShaderMaterial).uniforms.uPixel.value = this.dpr;
      this.slow = 0;
    }

    const A = scenes[world.a];
    const B = scenes[world.b];
    const t = Math.min(1, Math.max(0, world.mix));
    const e = ease(t);
    const aspect = this.w / this.h;
    // Narrow screens: shapes shrink to fit instead of cropping.
    const fit = Math.min(1, Math.max(0.42, aspect / 1.55));

    this.pose(this.matA, A, fit);
    this.pose(this.matB, B, fit);

    // Camera eases toward the blended pose; the pointer adds a little parallax.
    const px = world.pointer.x;
    const py = world.pointer.y;
    this.parallax.x += (px - this.parallax.x) * (1 - Math.exp(-dt * 3));
    this.parallax.y += (py - this.parallax.y) * (1 - Math.exp(-dt * 3));
    // Portrait: shapes that sit beside the text on desktop move above it instead.
    const portrait = aspect < 0.9;
    const frame = (sc: Scene) => {
      const side = portrait && Math.abs(sc.look[0]) > 0.5;
      const dx = side ? 0 : 1;
      const dy = side ? -1.7 : 0;
      return {
        cam: [sc.cam[0] * fit * dx, sc.cam[1] + dy, sc.cam[2]],
        look: [sc.look[0] * fit * dx, sc.look[1] + dy, sc.look[2]],
      };
    };
    const fa = frame(A);
    const fb = frame(B);
    const cam = new THREE.Vector3(lerp(fa.cam[0], fb.cam[0], e), lerp(fa.cam[1], fb.cam[1], e), lerp(fa.cam[2], fb.cam[2], e));
    const look = new THREE.Vector3(lerp(fa.look[0], fb.look[0], e), lerp(fa.look[1], fb.look[1], e), lerp(fa.look[2], fb.look[2], e));
    cam.x += this.parallax.x * 0.45;
    cam.y += this.parallax.y * 0.3;
    const k = 1 - Math.exp(-dt * 6);
    this.camPos.lerp(cam, k);
    this.camLook.lerp(look, k);
    this.camera.position.copy(this.camPos);
    this.camera.lookAt(this.camLook);
    this.camera.updateMatrixWorld();
    this.viewProj.multiplyMatrices(this.camera.projectionMatrix, this.camera.matrixWorldInverse);

    // The eraser field follows the pointer along its ray.
    const u = this.velVar.material.uniforms;
    const live = performance.now() - world.pointer.t < 1200;
    this.ray.setFromCamera(new THREE.Vector2(px, py), this.camera);
    u.uRayO.value.copy(this.ray.ray.origin);
    u.uRayD.value.copy(this.ray.ray.direction);
    const dist = this.camPos.distanceTo(this.camLook);
    this.mouseWorld.copy(this.ray.ray.origin).addScaledVector(this.ray.ray.direction, dist);
    const mv = this.tmpV.subVectors(this.mouseWorld, this.mousePrev).divideScalar(dt).clampLength(0, 30);
    this.mousePrev.copy(this.mouseWorld);
    this.mouseVel.lerp(live ? mv : this.zero, 1 - Math.exp(-dt * 12));
    u.uMouseV.value.copy(this.mouseVel);
    const speed = this.mouseVel.length();
    // Resting on the dust barely stirs it; a fast stroke tears a wide gash.
    u.uMouseF.value = live ? 14 + Math.min(speed, 16) * 7 : 0;
    u.uMouseR.value = 0.7 + Math.min(speed, 16) * 0.055;

    // Trail: drop a mark every so often while moving; marks fade over a couple of seconds.
    if (live && Math.hypot(px - this.lastTrail.x, py - this.lastTrail.y) > 0.05) {
      this.trail[this.trailHead].set(px, py, Math.min(1, 0.35 + speed * 0.1), 0.14 + Math.min(speed, 16) * 0.016);
      this.trailHead = (this.trailHead + 1) % this.trail.length;
      this.lastTrail.x = px;
      this.lastTrail.y = py;
    }
    for (const m of this.trail) {
      m.z *= Math.exp(-dt / 2.1);
      if (m.z < 0.01) m.w = 0;
    }

    u.tTargetA.value = this.target(A.shape);
    u.tTargetB.value = this.target(B.shape);
    u.uMatA.value.copy(this.matA);
    u.uMatB.value.copy(this.matB);
    u.uMix.value = A.shape === B.shape ? 1 : t;
    if (A.shape === B.shape) u.tTargetA.value = u.tTargetB.value;
    u.uTime.value = this.time;
    u.uDelta.value = dt;
    u.uSpring.value = lerp(A.spring, B.spring, e);
    u.uTurb.value = lerp(A.turb, B.turb, e);
    u.uScatter.value = lerp(A.scatter, B.scatter, e);
    u.uPulse.value = world.pulse;
    this.posVar.material.uniforms.uDelta.value = dt;
    this.gpu.compute();

    const night = lerp(A.night, B.night, e);
    const pu = (this.points.material as THREE.ShaderMaterial).uniforms;
    pu.tPos.value = this.gpu.getCurrentRenderTarget(this.posVar).texture;
    pu.tVel.value = this.gpu.getCurrentRenderTarget(this.velVar).texture;
    pu.uSize.value = lerp(A.size, B.size, e) * (aspect < 1 ? 1.15 : 1);
    pu.uFocus.value = dist;
    pu.uNight.value = night;
    pu.uAccent.value = lerp(A.accent, B.accent, e);
    pu.uDensity.value = lerp(A.density, B.density, e) * 1.05;
    const bu = (this.backdrop.material as THREE.ShaderMaterial).uniforms;
    bu.uNight.value = night;
    bu.uTime.value = this.time;

    world.night = night;
    const isNight = night > 0.5;
    if (this.night !== (isNight ? 1 : 0)) {
      this.night = isNight ? 1 : 0;
      world.onNight.forEach((f) => f(isNight));
    }

    this.renderer.render(this.scene, this.camera);
    if (!world.ready) {
      world.ready = true;
      world.onReady.forEach((f) => f());
    }
  }

  private tmpV = new THREE.Vector3();
  private zero = new THREE.Vector3();

  dispose() {
    this.targets.forEach((t) => t.dispose());
    this.gpu.dispose();
    this.points.geometry.dispose();
    (this.points.material as THREE.Material).dispose();
    this.backdrop.geometry.dispose();
    (this.backdrop.material as THREE.Material).dispose();
    this.renderer.dispose();
    this.renderer.domElement.remove();
    this.host.replaceChildren();
  }
}
