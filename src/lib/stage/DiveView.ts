import * as THREE from "three";
import type { Frame, Shared, View } from "./Stage";
import { eraserGeometry, materials, PALETTE, sleeveGeometry } from "./objects";
import { clicheAtlas, stickerAtlas } from "./diveArt";
import { sound } from "@/lib/sound";

/**
 * The dive. A small window in the page opens onto a dark world with one
 * character in it: an eraser with a face. Scroll and the window fills the
 * screen, the eraser turns and flies down a tunnel built from generic website
 * wireframes, rubbing out every one it passes (and the clichés hanging in the
 * way). At the far end it turns back to look at you, surrounded by stickers.
 *
 * The window is a view offset of a full-screen camera, so growing the box
 * reveals more of the same world instead of scaling it.
 */

const L = 108; // tunnel length
const TX = 3.4; // tunnel half width
const TY = 2.4; // tunnel half height
const SPAN = 2.4; // how far behind the eraser a panel takes to vanish
const ERZ = 0.141; // front face of the eraser, just proud of the rubber

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));
const smooth = (v: number) => {
  const t = clamp01(v);
  return t * t * (3 - 2 * t);
};
const band = (p: number, a: number, b: number) => smooth((p - a) / (b - a));

/** Where the eraser flies: straight down the tunnel, wiping side to side. */
function path(f: number, out: THREE.Vector3) {
  const e = f < 0.5 ? 2 * f * f : 1 - (-2 * f + 2) ** 2 / 2;
  const sway = Math.sin(f * Math.PI);
  return out.set(Math.sin(f * Math.PI * 7) * 1.0 * sway, Math.sin(f * Math.PI * 5 + 0.6) * 0.5 * sway, -L * e);
}

export class DiveView implements View {
  order = 5;
  private scene = new THREE.Scene();
  private camera = new THREE.PerspectiveCamera(32, 1, 0.1, 120);
  private section: HTMLElement;
  private countEl: HTMLElement | null;
  private p = 0;
  private hero = new THREE.Group(); // the character
  private body = new THREE.Group(); // squash & stretch lives here
  private eyes: THREE.Mesh[] = [];
  private tunnel = new THREE.Group();
  private barUniforms = { uZ: { value: 10 }, uSpan: { value: SPAN }, uBuild: { value: 0 } };
  private words: { mesh: THREE.Mesh; mat: THREE.ShaderMaterial; z: number; x: number; y: number; w: number; h: number; hit: boolean }[] = [];
  private stickers: { mesh: THREE.Mesh; home: THREE.Vector3; off: THREE.Vector3; vel: THREE.Vector3; spin: number; delay: number; s: number; shown: boolean }[] = [];
  private stickerGroup = new THREE.Group();
  private panelZ: Float32Array;
  private rowStep = 3.2;
  private builtRows = 0;
  private lastCount = -1;
  private arrived = false;
  private look = new THREE.Vector2();
  private blinkAt = 2;
  private blink = 0;
  private yaw = 0;
  private camPos = new THREE.Vector3(0, 0.15, 7.2);
  private camLook = new THREE.Vector3();
  private disposables: { dispose(): void }[] = [];
  private tmp = new THREE.Vector3();
  private tmp2 = new THREE.Vector3();
  private prev = new THREE.Vector3();
  private vel = new THREE.Vector3();
  private rig = new THREE.Group();
  private streaks: THREE.InstancedMesh | null = null;
  private streakData: { x: number; y: number; z: number; len: number; sp: number }[] = [];
  private warp = 0; // how hard you're scrolling, 0..1
  private flightPrev = 0;
  private sm = new THREE.Matrix4();
  private sq = new THREE.Quaternion();
  private ss = new THREE.Vector3();
  private sp = new THREE.Vector3();
  private fogColor = new THREE.Color();
  private bgDark = PALETTE.graphite.clone();
  private bgEnd = PALETTE.blue.clone();

  constructor(
    public el: HTMLElement,
    shared: Shared,
  ) {
    this.section = el.closest("section") ?? el;
    this.countEl = el.querySelector("[data-count]");
    const coarse = window.matchMedia("(pointer: coarse)").matches;
    this.scene.fog = new THREE.Fog(this.bgDark.clone(), 6, 30);

    this.buildHero(shared);
    this.panelZ = this.buildTunnel(coarse);
    this.buildCrumbs(coarse);
    this.buildStreaks(coarse);
    this.buildWords(shared);
    this.buildStickers();

    const key = new THREE.DirectionalLight(0xffffff, 2.6);
    key.position.set(-3, 5, 6);
    const rim = new THREE.DirectionalLight(0x7d93ff, 3);
    rim.position.set(4, 2, -6);
    const fill = new THREE.HemisphereLight(0xdfe4ff, 0x16181f, 0.6);
    // The lights ride with the eraser so it's lit the same all the way down.
    this.rig.add(key, rim, fill, key.target, rim.target);
    this.scene.add(this.rig, this.hero, this.tunnel, this.stickerGroup);
  }

  // ─── The character ────────────────────────────────────────────────────────

  private buildHero(shared: Shared) {
    const mats = materials(shared.env, shared.family);
    mats.rubber.color = new THREE.Color("#f2f1ec");
    const eg = eraserGeometry();
    const sg = sleeveGeometry();
    const rubber = new THREE.Mesh(eg, mats.rubber);
    // The label only on the broad sides; plain card on the ends and edges.
    const card = new THREE.MeshPhysicalMaterial({ color: 0x141517, roughness: 0.3, clearcoat: 0.8, clearcoatRoughness: 0.2, envMap: shared.env });
    const sleeve = new THREE.Mesh(sg, [card, card, card, card, mats.sleeve, mats.sleeve]);
    // Face on the bare rubber, front side: two pencil-dot eyes and a small smile.
    const ink = new THREE.MeshStandardMaterial({ color: 0x141517, roughness: 0.4 });
    const eyeG = new THREE.SphereGeometry(1, 16, 12);
    for (const ex of [-0.355, -0.205]) {
      const e = new THREE.Mesh(eyeG, ink);
      e.scale.set(0.03, 0.052, 0.014);
      e.position.set(ex, 0.055, ERZ);
      e.userData.home = e.position.clone();
      this.eyes.push(e);
    }
    const smile = new THREE.Mesh(new THREE.TorusGeometry(0.042, 0.009, 6, 18, Math.PI), ink);
    smile.rotation.z = Math.PI;
    smile.position.set(-0.28, -0.045, ERZ - 0.004);
    smile.scale.z = 0.4;
    const cheekMat = new THREE.MeshBasicMaterial({ color: PALETTE.blue, transparent: true, opacity: 0.55 });
    const cheekG = new THREE.CircleGeometry(1, 20);
    const cheeks = [-0.42, -0.14].map((cx) => {
      const c = new THREE.Mesh(cheekG, cheekMat);
      c.scale.set(0.028, 0.016, 1);
      c.position.set(cx, -0.03, ERZ + 0.002);
      return c;
    });
    this.body.add(rubber, sleeve, ...this.eyes, smile, ...cheeks);
    // Centre the face a little: the head is the bare rubber on the left.
    this.body.position.x = 0.12;
    this.hero.add(this.body);
    this.hero.scale.setScalar(1.45);
    this.disposables.push(eg, sg, eyeG, smile.geometry, cheekG, ink, cheekMat, card, ...Object.values(mats));
    this.disposables.push({ dispose: () => mats.sleeve.map?.dispose() });
  }

  // ─── The tunnel of templates ──────────────────────────────────────────────

  /** A generic landing page, as bars in a 0..1 box: [u0, v0, u1, v1]. */
  private static page(): number[][] {
    const bars: number[][] = [];
    const rect = (a: number, b: number, c: number, d: number) => bars.push([a, b, c, b], [c, b, c, d], [c, d, a, d], [a, d, a, b]);
    rect(0, 0, 1, 1); // the page
    bars.push([0, 0.86, 1, 0.86]); // nav bar
    bars.push([0.06, 0.93, 0.16, 0.93], [0.62, 0.93, 0.7, 0.93], [0.74, 0.93, 0.82, 0.93], [0.86, 0.93, 0.94, 0.93]);
    bars.push([0.08, 0.72, 0.56, 0.72], [0.08, 0.64, 0.44, 0.64]); // headline
    rect(0.08, 0.48, 0.24, 0.54); // "Get started"
    rect(0.64, 0.48, 0.92, 0.78); // hero image…
    bars.push([0.64, 0.48, 0.92, 0.78], [0.64, 0.78, 0.92, 0.48]); // …the placeholder cross
    for (const u of [0.08, 0.375, 0.67]) {
      rect(u, 0.08, u + 0.25, 0.38); // three cards
      bars.push([u + 0.04, 0.3, u + 0.18, 0.3]);
    }
    return bars;
  }

  private buildTunnel(coarse: boolean): Float32Array {
    const layout = DiveView.page();
    const step = coarse ? 4.6 : 3.2;
    this.rowStep = step;
    const rows = Math.floor((L + 14) / step);
    // Panel frames: origin, width axis, height axis, normal, size.
    type P = { o: THREE.Vector3; u: THREE.Vector3; v: THREE.Vector3; n: THREE.Vector3; w: number; h: number };
    const panels: P[] = [];
    const W = 2.7;
    const H = 1.8;
    for (let r = 0; r < rows; r++) {
      const z = 4 - r * step;
      const j = (r % 2) * 0.6;
      const per = coarse ? [0] : [-1, 1];
      for (const k of per) {
        // Walls: width runs along the tunnel, height up the wall.
        const y = coarse ? -H / 2 : k * 1.05 - H / 2 + (k > 0 ? j * 0.3 : 0);
        panels.push({ o: new THREE.Vector3(-TX, y, z - j), u: new THREE.Vector3(0, 0, -1), v: new THREE.Vector3(0, 1, 0), n: new THREE.Vector3(1, 0, 0), w: W, h: H });
        panels.push({ o: new THREE.Vector3(TX, y, z - W - j * 0.5), u: new THREE.Vector3(0, 0, 1), v: new THREE.Vector3(0, 1, 0), n: new THREE.Vector3(-1, 0, 0), w: W, h: H });
        // Floor and ceiling: width across, height along the tunnel.
        const x = coarse ? -W / 2 : k * 1.5 - W / 2;
        panels.push({ o: new THREE.Vector3(x, -TY, z - j * 0.4), u: new THREE.Vector3(1, 0, 0), v: new THREE.Vector3(0, 0, -1), n: new THREE.Vector3(0, 1, 0), w: W, h: H });
        panels.push({ o: new THREE.Vector3(x + 0.3, TY, z - H - j), u: new THREE.Vector3(1, 0, 0), v: new THREE.Vector3(0, 0, 1), n: new THREE.Vector3(0, -1, 0), w: W, h: H });
      }
    }
    const count = panels.length * layout.length;
    const box = new THREE.BoxGeometry(1, 1, 1);
    const aPanel = new Float32Array(count * 4);
    const mat = new THREE.MeshBasicMaterial({ toneMapped: false });
    mat.onBeforeCompile = (s) => {
      Object.assign(s.uniforms, this.barUniforms);
      s.vertexShader = s.vertexShader
        .replace("#include <common>", "#include <common>\nattribute vec4 aPanel;\nuniform float uZ;\nuniform float uSpan;\nuniform float uBuild;")
        .replace(
          "#include <project_vertex>",
          /* glsl */ `
          vec4 mvPosition = instanceMatrix * vec4(transformed, 1.0);
          vec3 ctr = (instanceMatrix * vec4(0.0, 0.0, 0.0, 1.0)).xyz;
          float e = smoothstep(0.0, 1.0, (aPanel.z - uZ) / uSpan);
          // Drawn in front to back as the eraser sets off.
          float built = smoothstep(0.0, 1.0, (uBuild - (4.0 - aPanel.z)) / 5.0);
          float h = aPanel.w;
          float h2 = fract(sin(dot(ctr, vec3(12.9898, 78.233, 37.719))) * 43758.5453);
          // Rubbed out: each bar shrinks, spins off the wall and drifts past you.
          vec3 away = normalize(vec3(ctr.xy, 0.0) + 0.001) * (0.4 + h2 * 1.2) + vec3(0.0, -0.6 * h, 1.2 + h2 * 2.2);
          mvPosition.xyz = ctr + (mvPosition.xyz - ctr) * (1.0 - e) * built + away * e;
          mvPosition = modelViewMatrix * mvPosition;
          gl_Position = projectionMatrix * mvPosition;`,
        );
    };
    const mesh = new THREE.InstancedMesh(box, mat, count);
    const m = new THREE.Matrix4();
    const a = new THREE.Vector3();
    const b = new THREE.Vector3();
    const d = new THREE.Vector3();
    const yAxis = new THREE.Vector3();
    const col = new THREE.Color();
    const zs = new Float32Array(panels.length);
    let seed = 11;
    const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
    let i = 0;
    panels.forEach((P, pi) => {
      const centre = P.o.clone().addScaledVector(P.u, P.w / 2).addScaledVector(P.v, P.h / 2);
      zs[pi] = centre.z;
      const blue = rnd() < 0.28;
      const bright = 0.3 + rnd() * 0.5;
      const h = rnd();
      layout.forEach(([u0, v0, u1, v1], li) => {
        a.copy(P.o).addScaledVector(P.u, u0 * P.w).addScaledVector(P.v, v0 * P.h);
        b.copy(P.o).addScaledVector(P.u, u1 * P.w).addScaledVector(P.v, v1 * P.h);
        d.subVectors(b, a);
        const len = d.length();
        d.normalize();
        yAxis.crossVectors(P.n, d).normalize();
        const t = li < 4 ? 0.034 : li === 5 || li === 6 ? 0.05 : 0.022;
        m.makeBasis(d, yAxis, P.n);
        m.scale(this.tmp.set(len + t, t, 0.02));
        m.setPosition(a.add(b).multiplyScalar(0.5));
        mesh.setMatrixAt(i, m);
        if (blue) col.copy(PALETTE.blue).multiplyScalar(1.3);
        else col.setRGB(bright, bright, bright * 1.04);
        mesh.setColorAt(i, col);
        aPanel.set([centre.x, centre.y, centre.z, h], i * 4);
        i++;
      });
    });
    box.setAttribute("aPanel", new THREE.InstancedBufferAttribute(aPanel, 4));
    mesh.frustumCulled = false;
    this.tunnel.add(mesh);
    this.disposables.push(box, mat);
    return zs;
  }

  /** Rubber crumbs shed off every panel as it goes. */
  private buildCrumbs(coarse: boolean) {
    const n = coarse ? 700 : 1800;
    const g = new THREE.IcosahedronGeometry(1, 0);
    const aO = new Float32Array(n * 4);
    const aD = new Float32Array(n * 3);
    let seed = 5;
    const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
    for (let i = 0; i < n; i++) {
      const side = Math.floor(rnd() * 4);
      const z = 4 - rnd() * (L + 8);
      const s = rnd() * 2 - 1;
      const x = side < 2 ? (side ? TX : -TX) : s * TX;
      const y = side < 2 ? s * TY : side === 2 ? -TY : TY;
      aO.set([x * 0.97, y * 0.97, z, 0.012 + rnd() ** 3 * 0.05], i * 4);
      aD.set([-x * (0.15 + rnd() * 0.3) + (rnd() - 0.5), -y * (0.15 + rnd() * 0.3) + (rnd() - 0.5), 1 + rnd() * 3], i * 3);
    }
    g.setAttribute("aO", new THREE.InstancedBufferAttribute(aO, 4));
    g.setAttribute("aD", new THREE.InstancedBufferAttribute(aD, 3));
    const mat = new THREE.MeshBasicMaterial({ toneMapped: false });
    mat.onBeforeCompile = (s) => {
      Object.assign(s.uniforms, this.barUniforms);
      s.vertexShader = s.vertexShader
        .replace("#include <common>", "#include <common>\nattribute vec4 aO;\nattribute vec3 aD;\nuniform float uZ;\nuniform float uSpan;")
        .replace(
          "#include <project_vertex>",
          /* glsl */ `
          float e = clamp((aO.z - uZ) / (uSpan * 1.6), 0.0, 1.0);
          float s = sin(3.14159 * e) * aO.w;
          vec3 p = aO.xyz + aD * e * 1.6 + vec3(0.0, -e * e * 1.2, 0.0);
          vec4 mvPosition = modelViewMatrix * vec4(p + transformed * s, 1.0);
          gl_Position = projectionMatrix * mvPosition;`,
        );
    };
    const mesh = new THREE.InstancedMesh(g, mat, n);
    const col = new THREE.Color();
    for (let i = 0; i < n; i++) {
      const r = rnd();
      mesh.setColorAt(i, r < 0.5 ? col.set("#f2f1ec") : r < 0.8 ? col.copy(PALETTE.blue).multiplyScalar(1.4) : col.copy(PALETTE.mist));
    }
    mesh.frustumCulled = false;
    this.tunnel.add(mesh);
    this.disposables.push(g, mat);
  }

  /**
   * Scroll hard and the dive goes to warp: streaks of light stretch past the
   * camera, longer and brighter the faster you go. They're only there while
   * you're actually pushing, so an unhurried read never sees them.
   */
  private buildStreaks(coarse: boolean) {
    const n = coarse ? 70 : 150;
    const g = new THREE.BoxGeometry(0.014, 0.014, 1);
    const mat = new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false });
    const mesh = new THREE.InstancedMesh(g, mat, n);
    mesh.frustumCulled = false;
    mesh.visible = false;
    const col = new THREE.Color();
    let seed = 91;
    const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
    for (let i = 0; i < n; i++) {
      const a = rnd() * Math.PI * 2;
      const r = 0.7 + rnd() ** 0.7 * 2.6;
      this.streakData.push({ x: Math.cos(a) * r, y: Math.sin(a) * r * 0.72, z: rnd() * 60, len: 0.5 + rnd(), sp: 0.6 + rnd() * 0.8 });
      mesh.setColorAt(i, rnd() < 0.45 ? col.copy(PALETTE.blue).multiplyScalar(1.5) : col.set("#ffffff"));
    }
    this.streaks = mesh;
    this.scene.add(mesh);
    this.disposables.push(g, mat);
  }

  /** Clichés hung across the tunnel. The eraser rubs a hole through each one. */
  private buildWords(shared: Shared) {
    const atlas = clicheAtlas(shared.family);
    const g = new THREE.PlaneGeometry(1, 1);
    this.disposables.push(g, atlas.texture);
    for (let i = 0; i < atlas.rows; i++) {
      const mat = new THREE.ShaderMaterial({
        transparent: true,
        depthWrite: false,
        uniforms: {
          uMap: { value: atlas.texture },
          uRow: { value: i },
          uRows: { value: atlas.rows },
          uE: { value: 0 },
          uHit: { value: new THREE.Vector2(0.5, 0.5) },
          uAspect: { value: atlas.aspect },
          uOpacity: { value: 1 },
          uColor: { value: i % 3 === 1 ? PALETTE.blue.clone().multiplyScalar(1.6) : new THREE.Color("#f2f1ec") },
        },
        vertexShader: /* glsl */ `
          varying vec2 vUv;
          void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
        fragmentShader: /* glsl */ `
          uniform sampler2D uMap; uniform float uRow, uRows, uE, uAspect, uOpacity; uniform vec2 uHit; uniform vec3 uColor;
          varying vec2 vUv;
          float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
          float noise(vec2 p) {
            vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
            return mix(mix(hash(i), hash(i + vec2(1, 0)), f.x), mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), f.x), f.y);
          }
          void main() {
            vec2 uv = vec2(vUv.x, (uRows - 1.0 - uRow + vUv.y) / uRows);
            float a = texture2D(uMap, uv).a;
            // A rubbed hole that grows out from where the eraser went through.
            vec2 d = (vUv - uHit) * vec2(uAspect, 1.0);
            float n = noise(vUv * vec2(uAspect * 3.0, 3.0)) * 0.7 + noise(vUv * vec2(uAspect * 14.0, 14.0)) * 0.3;
            float r = uE * (uAspect * 0.75) - length(d) + (n - 0.5) * 1.1;
            if (r > 0.0) discard;
            // Worn edge: thinner, greyer where the rubber has been.
            float edge = smoothstep(-0.5, 0.0, r);
            gl_FragColor = vec4(mix(uColor, uColor * 0.45, edge), a * uOpacity * (1.0 - edge * 0.6));
            #include <colorspace_fragment>
          }`,
      });
      const mesh = new THREE.Mesh(g, mat);
      const w = TX * 2 * 0.9;
      const z = -9 - i * 12.2;
      const x = (i % 2 ? 1 : -1) * 0.25;
      const y = ((i * 37) % 5) * 0.12 - 0.25;
      mesh.scale.set(w, w / atlas.aspect, 1);
      mesh.position.set(x, y, z);
      mesh.rotation.z = (((i * 53) % 7) - 3) * 0.02;
      mesh.renderOrder = 2;
      this.tunnel.add(mesh);
      this.words.push({ mesh, mat, z, x, y, w, h: w / atlas.aspect, hit: false });
      this.disposables.push(mat);
    }
  }

  /** Die-cut pencil doodles floating round the end of the tunnel. */
  private buildStickers() {
    const atlas = stickerAtlas();
    this.disposables.push(atlas.texture);
    let seed = 3;
    const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
    const n = 16;
    for (let i = 0; i < n; i++) {
      const k = i % atlas.count;
      const g = new THREE.PlaneGeometry(1, 1);
      const uv = g.attributes.uv as THREE.BufferAttribute;
      const cu = (k % atlas.cols) / atlas.cols;
      const cv = 1 - (Math.floor(k / atlas.cols) + 1) / atlas.rows;
      for (let j = 0; j < uv.count; j++) uv.setXY(j, cu + uv.getX(j) / atlas.cols, cv + uv.getY(j) / atlas.rows);
      const mat = new THREE.MeshBasicMaterial({ map: atlas.texture, transparent: true, alphaTest: 0.02, depthWrite: false, fog: false, side: THREE.DoubleSide, toneMapped: false });
      const mesh = new THREE.Mesh(g, mat);
      // A loose ring around the character, some behind, some close to you.
      const a = (i / n) * Math.PI * 2 + rnd() * 0.3;
      const r = 2.1 + rnd() * 1.5;
      const home = new THREE.Vector3(Math.cos(a) * r * 1.45, Math.sin(a) * r * 0.8 + 0.8, (rnd() - 0.6) * 3);
      // Keep the headline above the eraser clear.
      if (home.y > 1.2 && Math.abs(home.x) < 2.6) home.x = Math.sign(home.x || 1) * (2.6 + rnd() * 0.8);
      const s = 0.75 + rnd() * 0.5;
      mesh.renderOrder = 3;
      this.stickerGroup.add(mesh);
      this.stickers.push({ mesh, home, off: new THREE.Vector3(), vel: new THREE.Vector3(), spin: (rnd() - 0.5) * 0.8, delay: rnd() * 0.5, s, shown: false });
      this.disposables.push(g, mat);
    }
    this.stickerGroup.position.z = -L;
  }

  // ─── Per frame ────────────────────────────────────────────────────────────

  update(f: Frame) {
    const { rect, vw, vh, dt, time, pointer } = f;
    // The window is a crop of one full-screen camera.
    this.camera.aspect = vw / vh;
    // Tall screens see wider, so the eraser and the tunnel still fit across.
    const widen = Math.max(1, 1.6 / this.camera.aspect) ** 0.6;
    // At warp the lens opens up, which is what makes it feel fast.
    const punch = 1 + this.warp * 0.22 * this.flightPrev;
    this.camera.fov = (2 * Math.atan(Math.tan(THREE.MathUtils.degToRad(16)) * widen * punch) * 180) / Math.PI;
    this.camera.setViewOffset(vw, vh, rect.left, rect.top, rect.width, rect.height);

    // Progress through the pinned section, eased a little.
    const sr = this.section.getBoundingClientRect();
    const target = f.reduced ? 1 : clamp01(-sr.top / Math.max(1, sr.height - vh));
    // How hard you're scrolling: it runs up fast and eases back down slowly.
    const push = Math.min(1, (Math.abs(target - this.p) / Math.max(dt, 1e-3)) * 2.2);
    this.warp += (push - this.warp) * (1 - Math.exp(-dt * (push > this.warp ? 11 : 2.6)));
    this.p += (target - this.p) * (1 - Math.exp(-dt * 8));
    if (Math.abs(target - this.p) < 1e-4) this.p = target;
    const p = this.p;

    // Phases.
    const toFlight = band(p, 0.26, 0.34); // intro → flight
    const flight = clamp01((p - 0.3) / 0.5);
    const toEnd = band(p, 0.79, 0.88); // flight → finale
    const bg = band(p, 0.8, 0.9);

    // Pointer, smoothed, in -1..1 of the viewport.
    const live = pointer.x > -1e3 && !f.reduced;
    const nx = live ? (pointer.x / vw) * 2 - 1 : 0;
    const ny = live ? -((pointer.y / vh) * 2 - 1) : 0;
    this.look.x += (nx - this.look.x) * (1 - Math.exp(-dt * 4));
    this.look.y += (ny - this.look.y) * (1 - Math.exp(-dt * 4));

    // The eraser's position.
    const pos = path(flight, this.tmp2);
    this.hero.position.copy(pos);
    const idle = f.reduced ? 0 : 1;
    this.hero.position.y += Math.sin(time * 1.7) * 0.07 * idle * (1 - toFlight + toEnd);
    const vel = this.vel.subVectors(pos, this.prev);
    this.rig.position.copy(pos);
    this.prev.copy(pos);

    // Facing: toward you (and your cursor) at both ends, nose first down the tunnel.
    const turn = toFlight * (1 - toEnd);
    const lookYaw = this.look.x * 0.55;
    // Three-quarter view: nose down the tunnel, face still half toward you.
    const flyYaw = -Math.PI / 2 + 0.8 + THREE.MathUtils.clamp(-vel.x * 3, -0.4, 0.4);
    this.yaw = THREE.MathUtils.lerp(lookYaw, flyYaw, turn);
    // A hop as it turns.
    const hop = Math.sin(Math.PI * clamp01((p - 0.26) / 0.08)) + Math.sin(Math.PI * clamp01((p - 0.79) / 0.09));
    this.hero.position.y += hop * 0.28;
    this.hero.rotation.set(
      THREE.MathUtils.lerp(-this.look.y * 0.35, 0, turn),
      this.yaw,
      THREE.MathUtils.lerp(Math.sin(time * 1.1) * 0.05 * idle, THREE.MathUtils.clamp(vel.y * 2, -0.3, 0.3) - vel.x * 2.5, turn),
      "YXZ",
    );
    // Squash and stretch with speed; a rub-rub wobble while it's erasing.
    const speed = Math.min(1, vel.length() / Math.max(dt, 1e-3) / 40);
    const wob = turn * Math.sin(time * 38) * 0.05 * speed;
    const pull = 1 + this.warp * 0.5 * turn;
    this.body.scale.set((1 + speed * 0.22) * pull, (1 - speed * 0.1 + wob) / pull ** 0.5, (1 - speed * 0.1 - wob) / pull ** 0.5);

    // Eyes follow the cursor, and blink now and then.
    if (!f.reduced) {
      this.blinkAt -= dt;
      if (this.blinkAt < 0) {
        this.blink = 0.16;
        this.blinkAt = 2.2 + Math.random() * 3;
      }
      this.blink = Math.max(0, this.blink - dt);
    }
    const shut = this.blink > 0 ? Math.sin((this.blink / 0.16) * Math.PI) : 0;
    for (const e of this.eyes) {
      const h = e.userData.home as THREE.Vector3;
      e.position.set(h.x + this.look.x * 0.022, h.y + this.look.y * 0.016, h.z);
      e.scale.y = 0.052 * (1 - shut * 0.88);
    }

    // The tunnel is drawn ahead of it; everything behind it is rubbed out, and
    // at the end whatever is left goes in one sweep.
    const build = band(p, 0.25, 0.42) * (L + 30);
    this.barUniforms.uBuild.value = build;
    // Each row of wireframes that draws in rings, climbing as the tunnel builds.
    const rows = Math.floor(build / this.rowStep);
    if (rows > this.builtRows && !f.reduced) for (let k = this.builtRows + 1; k <= Math.min(rows, this.builtRows + 2); k++) sound.reveal(k);
    this.builtRows = rows;
    this.barUniforms.uZ.value = THREE.MathUtils.lerp(flight > 0 ? pos.z : 10, -L - 60, band(p, 0.8, 0.87));

    // Clichés: a hole opens where it went through.
    for (const w of this.words) {
      const e = clamp01((w.z - pos.z + 0.4) / 2.2);
      w.mat.uniforms.uE.value = e;
      // Only near words are readable; far ones wait in the fog.
      const dist = this.camPos.z - w.z;
      w.mat.uniforms.uOpacity.value = clamp01((build - (4 - w.z)) / 5) * (1 - smooth((dist - 9) / 9));
      if (e > 0 && !w.hit && !f.reduced) sound.eraseHit();
      w.hit = e > 0;
      if (e > 0 && e < 0.08) w.mat.uniforms.uHit.value.set(clamp01((pos.x - w.x) / w.w + 0.5), clamp01((pos.y - w.y) / w.h + 0.5));
      w.mesh.visible = e < 1;
    }

    // Camera: in front of the eraser at both ends, chasing it through the tunnel.
    const camIntro = this.tmp.set(0, 0.2, 7.4 - band(p, 0.1, 0.26) * 1.2);
    const lookIntro = new THREE.Vector3(0, 0, 0);
    const camFly = new THREE.Vector3(pos.x * 0.5, pos.y * 0.45 + 0.5, pos.z + 5.4);
    const lookFly = new THREE.Vector3(pos.x * 0.8, pos.y * 0.7, pos.z - 6);
    const camEnd = new THREE.Vector3(0, 0.15, pos.z + 6.6);
    const lookEnd = new THREE.Vector3(0, 0.8, pos.z);
    const cam = camIntro.lerp(camFly, toFlight).lerp(camEnd, toEnd);
    const tgt = lookIntro.lerp(lookFly, toFlight).lerp(lookEnd, toEnd);
    // The camera leans toward the cursor.
    cam.x += this.look.x * 0.7;
    cam.y += this.look.y * 0.4;
    this.camPos.lerp(cam, 1 - Math.exp(-dt * 10));
    this.camLook.lerp(tgt, 1 - Math.exp(-dt * 10));
    this.camera.position.copy(this.camPos);
    this.camera.lookAt(this.camLook);
    this.camera.rotateZ(-this.look.x * 0.04 - vel.x * 0.6 * turn);

    // The tunnel slowly rolls as you go, and the dark turns blue at the end.
    this.tunnel.rotation.z = flight * 0.5 + this.warp * 0.22;
    // Breaking out: the walls sweep past you on the way into the blue.
    const burst = band(p, 0.78, 0.9) ** 1.6;
    this.tunnel.scale.set(1 + burst * 2.4, 1 + burst * 2.4, 1);
    this.tunnel.visible = build > 0 && band(p, 0.8, 0.87) < 1;
    this.fogColor.copy(this.bgDark).lerp(this.bgEnd, bg);
    (this.scene.fog as THREE.Fog).color.copy(this.fogColor);

    // Warp streaks: only while you're pushing, and only down the tunnel.
    const streaks = this.streaks!;
    const warpOn = this.warp > 0.04 && flight > 0.01 && !f.reduced && toEnd < 1;
    streaks.visible = warpOn;
    if (warpOn) {
      (streaks.material as THREE.MeshBasicMaterial).opacity = Math.min(0.5, this.warp * 0.62) * smooth(flight * 8) * (1 - toEnd);
      const span = 70;
      for (let i = 0; i < this.streakData.length; i++) {
        const st = this.streakData[i];
        const z = this.camPos.z - 3 - ((st.z + time * st.sp * 16) % span);
        this.sp.set(st.x + pos.x * 0.3, st.y + pos.y * 0.3, z);
        this.ss.set(1, 1, 0.5 + this.warp * st.len * 22);
        this.sm.compose(this.sp, this.sq, this.ss);
        streaks.setMatrixAt(i, this.sm);
      }
      streaks.instanceMatrix.needsUpdate = true;
    }

    // Stickers pop in round it and shy away from the cursor.
    const endIn = clamp01((p - 0.84) / 0.12);
    this.stickerGroup.visible = endIn > 0;
    if (this.stickerGroup.visible) {
      const ray = new THREE.Vector3();
      for (const s of this.stickers) {
        const k = smooth((endIn - s.delay * 0.6) / 0.4);
        if (k > 0 && !s.shown && !f.reduced) sound.pop(this.stickers.indexOf(s));
        s.shown = k > 0;
        const pop = k > 0 && k < 1 ? 1 + Math.sin(k * Math.PI) * 0.25 : 1;
        s.mesh.scale.setScalar(s.s * k * pop);
        // Spring back home; the cursor pushes.
        const world = ray.copy(s.home).add(s.off).add(this.stickerGroup.position);
        world.project(this.camera);
        const sx = (world.x * 0.5 + 0.5) * vw;
        const sy = (-world.y * 0.5 + 0.5) * vh;
        const dx = sx - pointer.x;
        const dy = sy - pointer.y;
        const d2 = dx * dx + dy * dy;
        if (live && d2 < 220 * 220) {
          const push = (1 - Math.sqrt(d2) / 220) * 18;
          const inv = 1 / Math.max(1, Math.sqrt(d2));
          s.vel.x += dx * inv * push * dt;
          s.vel.y -= dy * inv * push * dt;
        }
        s.vel.addScaledVector(s.off, -9 * dt);
        s.vel.multiplyScalar(Math.exp(-dt * 4));
        s.off.addScaledVector(s.vel, dt);
        s.mesh.position.copy(s.home).add(s.off);
        s.mesh.position.y += Math.sin(time * 0.9 + s.delay * 9) * 0.08 * idle;
        s.mesh.rotation.set(Math.sin(time * 0.6 + s.delay * 5) * 0.3 * idle + s.off.y * 0.4, Math.sin(time * 0.5 + s.delay * 7) * 0.4 * idle - s.off.x * 0.4, s.spin + time * s.spin * 0.3 * idle);
      }
    }

    // How many templates are gone (each one crackles as it goes).
    let c = 0;
    if (flight > 0) for (let i = 0; i < this.panelZ.length; i++) if (this.panelZ[i] - pos.z > SPAN * 0.5) c++;
    if (c !== this.lastCount) {
      if (this.lastCount >= 0 && c > this.lastCount) sound.crackle(c - this.lastCount);
      this.lastCount = c;
      if (this.countEl) this.countEl.textContent = String(c).padStart(3, "0");
    }

    this.flightPrev = flight;

    // Sound follows the same timeline.
    if (!f.reduced) {
      sound.dive({ open: band(p, 0, 0.13), flight, speed, turn, end: toEnd });
      if (p > 0.84 && !this.arrived) sound.arrive();
      if (p > 0.84) this.arrived = true;
      else if (p < 0.8) this.arrived = false;
    }
  }

  warm(r: THREE.WebGLRenderer) {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    // Compile with everything visible, then upload the textures.
    const vis = [this.tunnel.visible, this.stickerGroup.visible];
    this.tunnel.visible = this.stickerGroup.visible = true;
    r.compile(this.scene, this.camera);
    [this.tunnel.visible, this.stickerGroup.visible] = vis;
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
    this.disposables.forEach((d) => d.dispose());
  }
}

