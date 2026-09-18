import * as THREE from "three";
import { sound } from "@/lib/sound";
import { pixelCamera, type Frame, type Shared, type View } from "./Stage";
import { poster } from "./posters";

const vertex = /* glsl */ `
uniform vec2 uSize;
uniform vec2 uDir;
uniform vec2 uCorner;
uniform float uA;
uniform float uR;
varying vec2 vUv;
varying vec2 vLocal;
varying vec3 vView;
varying float vRoll;

void main() {
  vUv = uv;
  vec3 p = vec3(position.xy * uSize, 0.0);
  vLocal = p.xy;
  // Page curl: everything between the corner and the fold line wraps round a
  // cylinder of radius uR; past half a turn it lies flat on top, face down.
  float s = dot(p.xy - uCorner, uDir);
  float roll = 0.0;
  if (s < uA) {
    float u = uA - s;
    float th = u / uR;
    vec2 onAxis = p.xy + uDir * u;
    if (th < 3.14159265) {
      p.xy = onAxis - uDir * uR * sin(th);
      p.z = uR * (1.0 - cos(th));
    } else {
      p.xy = onAxis + uDir * (u - 3.14159265 * uR);
      p.z = 2.0 * uR;
    }
    roll = min(th, 3.14159265) / 3.14159265;
  }
  vRoll = roll;
  vec4 mv = modelViewMatrix * vec4(p, 1.0);
  vView = mv.xyz;
  gl_Position = projectionMatrix * mv;
}
`;

const fragment = /* glsl */ `
uniform sampler2D uMap;
uniform vec3 uBack;
uniform float uOpacity;
// The sheet above this one: its fold line, radius and direction, for the shadow it casts.
uniform vec4 uAbove;
uniform vec2 uAboveCorner;
uniform float uAboveOn;
varying vec2 vUv;
varying vec2 vLocal;
varying vec3 vView;
varying float vRoll;

void main() {
  vec3 n = normalize(cross(dFdx(vView), dFdy(vView)));
  vec3 L = normalize(vec3(-0.35, 0.55, 0.75));
  vec3 base = gl_FrontFacing ? texture2D(uMap, vUv).rgb : uBack;
  float diff = 0.8 + 0.2 * max(dot(n, L), 0.0);
  // Inside the roll is in its own shade; the crest catches the light.
  diff *= 1.0 - 0.28 * smoothstep(0.15, 0.85, vRoll) * (gl_FrontFacing ? 1.0 : 0.35);
  vec3 V = normalize(-vView);
  float spec = pow(max(dot(reflect(-L, n), V), 0.0), 24.0) * 0.18 * step(0.01, vRoll);
  // Shadow from the sheet above as it lifts away.
  float s = dot(vLocal - uAboveCorner, uAbove.zw);
  float shade = uAboveOn * 0.32 * exp(-max(0.0, s - uAbove.x) / (uAbove.y * 1.4)) * smoothstep(uAbove.x - uAbove.y * 4.0, uAbove.x, s);
  vec3 col = base * diff * (1.0 - shade) + spec;
  gl_FragColor = vec4(col, uOpacity);
  #include <colorspace_fragment>
}
`;

type Sheet = {
  mesh: THREE.Mesh;
  mat: THREE.ShaderMaterial;
  tex: THREE.CanvasTexture;
  tilt: number;
};

/**
 * The work as a stack of printed posters. Each step of scroll peels the top sheet
 * off from its corner, lets it cast a shadow on the next, and throws it away.
 * Hovering the top sheet lifts its corner toward you.
 */
export class StackView implements View {
  order = 2;
  private scene = new THREE.Scene();
  private camera = pixelCamera(1, 1);
  private group = new THREE.Group();
  private sheets: Sheet[] = [];
  private shadow: THREE.Mesh;
  private progress = 0;
  private hover = 0;
  private geo = new THREE.PlaneGeometry(1, 1, 96, 60);
  onActive?: (i: number) => void;
  private active = -1;

  constructor(
    public el: HTMLElement,
    private slot: HTMLElement,
    slugs: string[],
    shared: Shared,
  ) {
    slugs.forEach((slug, i) => {
      const tex = new THREE.CanvasTexture(poster(slug, shared.family));
      tex.colorSpace = THREE.SRGBColorSpace;
      tex.anisotropy = 8;
      const mat = new THREE.ShaderMaterial({
        vertexShader: vertex,
        fragmentShader: fragment,
        side: THREE.DoubleSide,
        transparent: true,
        toneMapped: false,
        uniforms: {
          uMap: { value: tex },
          uBack: { value: new THREE.Color("#e9e7e1") },
          uSize: { value: new THREE.Vector2(1, 1) },
          uDir: { value: new THREE.Vector2(0.84, 0.54).normalize() },
          uCorner: { value: new THREE.Vector2() },
          uA: { value: 0 },
          uR: { value: 60 },
          uOpacity: { value: 1 },
          uAbove: { value: new THREE.Vector4(0, 60, 0.84, 0.54) },
          uAboveCorner: { value: new THREE.Vector2() },
          uAboveOn: { value: 0 },
        },
      });
      const mesh = new THREE.Mesh(this.geo, mat);
      mesh.renderOrder = slugs.length - i;
      mesh.frustumCulled = false;
      this.group.add(mesh);
      this.sheets.push({ mesh, mat, tex, tilt: (i % 2 ? 1 : -1) * (0.008 + i * 0.006) });
    });

    // A soft shadow under the whole stack.
    const sc = document.createElement("canvas");
    sc.width = 256;
    sc.height = 160;
    const x = sc.getContext("2d")!;
    x.filter = "blur(18px)";
    x.fillStyle = "rgba(15,16,18,0.5)";
    x.fillRect(40, 40, 176, 80);
    this.shadow = new THREE.Mesh(
      new THREE.PlaneGeometry(1, 1),
      new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(sc), transparent: true, depthWrite: false, toneMapped: false }),
    );
    this.shadow.renderOrder = -1;
    this.group.add(this.shadow);
    this.scene.add(this.group);
  }

  update(f: Frame) {
    const { rect } = f;
    pixelCamera(rect.width, rect.height, this.camera);
    const s = this.slot.getBoundingClientRect();
    const cx = s.left + s.width / 2 - (rect.left + rect.width / 2);
    const cy = -(s.top + s.height / 2 - (rect.top + rect.height / 2));
    const w = s.width;
    const h = s.height;

    const sec = this.el.parentElement!.getBoundingClientRect();
    const raw = Math.min(1, Math.max(0, -sec.top / Math.max(1, sec.height - f.vh)));
    const was = this.progress;
    this.progress += (raw - this.progress) * (f.reduced ? 1 : 1 - Math.exp(-f.dt * 6));
    const n = this.sheets.length;
    const moved = (Math.abs(this.progress - was) * (n - 1)) / Math.max(f.dt, 1e-3);
    const t = this.progress * (n - 1) * 1.02;

    // The whole stack leans back a touch and turns toward the pointer.
    const px = f.pointer.x;
    const py = f.pointer.y;
    const over = px >= s.left && px <= s.right && py >= s.top && py <= s.bottom;
    const hoverWas = this.hover;
    this.hover += ((over ? 1 : 0) - this.hover) * (1 - Math.exp(-f.dt * 6));
    if (!f.reduced) {
      const lift = Math.abs(this.hover - hoverWas) / Math.max(f.dt, 1e-3);
      const rate = moved * 0.9 + lift * 0.12;
      if (rate > 0.02) sound.peel(rate);
    }
    const lookX = over ? ((px - s.left) / w - 0.5) : 0;
    const lookY = over ? ((py - s.top) / h - 0.5) : 0;
    this.group.position.set(cx, cy, 0);
    this.group.rotation.x += (-0.2 + lookY * 0.12 - this.group.rotation.x) * (1 - Math.exp(-f.dt * 5));
    this.group.rotation.y += (0.1 + lookX * 0.16 - this.group.rotation.y) * (1 - Math.exp(-f.dt * 5));

    const R = Math.min(w, h) * 0.09;
    const diag = Math.hypot(w, h);
    // Peel from the bottom-left corner so the sheet folds away from the copy.
    const corner = new THREE.Vector2(-w / 2, -h / 2);
    let active = n - 1;
    let prevA = 0;
    let prevR = R;
    let prevOn = 0;
    this.sheets.forEach((sh, i) => {
      // The last poster stays: it's the bottom of the pile.
      const local = i === n - 1 ? 0 : Math.min(1, Math.max(0, t - i));
      // The copy switches once the sheet on top is half gone.
      if (local < 0.5 && active === n - 1) active = i;
      const u = sh.mat.uniforms;
      u.uSize.value.set(w, h);
      u.uCorner.value.copy(corner);
      u.uAboveCorner.value.copy(corner);
      const peel = Math.min(1, local / 0.8);
      const eased = peel * peel * (3 - 2 * peel);
      const r = R * (1 + eased * 1.4);
      // Only the top sheet answers the pointer.
      const lift = local === 0 && i === active ? this.hover * Math.min(w, h) * 0.12 : 0;
      u.uA.value = eased * (diag + Math.PI * r + 80) + lift;
      u.uR.value = r;
      // After the peel, it's thrown up and away.
      const away = Math.max(0, (local - 0.55) / 0.45);
      const ea = away * away;
      sh.mesh.position.set(ea * w * 0.9, ea * h * 0.7, (n - i) * 2 + ea * 160);
      sh.mesh.rotation.set(0, 0, sh.tilt - ea * 0.5);
      u.uOpacity.value = 1 - Math.min(1, away * 1.4);
      sh.mesh.visible = away < 1;
      // The shadow this sheet receives comes from the one on top of it.
      u.uAbove.value.set(prevA, prevR, u.uDir.value.x, u.uDir.value.y);
      u.uAboveOn.value = prevOn;
      prevA = u.uA.value;
      prevR = r;
      prevOn = local > 0 && local < 1 ? 1 - away : lift > 0 ? this.hover * 0.6 : 0;
    });
    this.shadow.scale.set(w * 1.18, h * 1.2, 1);
    this.shadow.position.set(16, -22, -6);

    if (active !== this.active) {
      this.active = active;
      this.onActive?.(active);
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

  render(r: THREE.WebGLRenderer) {
    r.render(this.scene, this.camera);
  }

  dispose() {
    this.geo.dispose();
    this.sheets.forEach((s) => {
      s.mat.dispose();
      s.tex.dispose();
    });
    this.shadow.geometry.dispose();
    (this.shadow.material as THREE.MeshBasicMaterial).map?.dispose();
    (this.shadow.material as THREE.Material).dispose();
  }
}
