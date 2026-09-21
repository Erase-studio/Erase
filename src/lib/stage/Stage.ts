import * as THREE from "three";
import { studioEnvironment } from "./studioEnv";

/**
 * One WebGL canvas laid over the page. Each piece of 3D (the hero objects, the
 * pencil line, the crumpled template, the work stack) is a View bound to a DOM
 * box: every frame the stage reads that box and draws the view exactly inside
 * it, so WebGL and layout move as one. Views off screen cost nothing.
 */

export type Frame = {
  dt: number;
  time: number;
  /** The view's box in viewport CSS px. */
  rect: DOMRect;
  vw: number;
  vh: number;
  scrollY: number;
  /** Pointer in viewport CSS px, and whether it moved recently. */
  pointer: { x: number; y: number; vx: number; vy: number; live: boolean; down: boolean };
  reduced: boolean;
};

export interface View {
  el: HTMLElement;
  /** Draws over the whole viewport instead of its box (the pencil line). */
  full?: boolean;
  /** Draw order: lower first. */
  order?: number;
  /** Extra screen margin (px) before the view counts as visible. */
  margin?: number;
  update(f: Frame): void;
  render(renderer: THREE.WebGLRenderer, f: Frame): void;
  /** Compile shaders and upload textures now, so the first on-screen frame doesn't stall. */
  warm?(renderer: THREE.WebGLRenderer): void | Promise<void>;
  dispose(): void;
}

/**
 * Get a scene ready to be drawn without stopping the page to do it.
 *
 * Compiling a shader is the single longest thing this site asks a browser to
 * do — the dive's tunnel alone used to block the main thread for about a
 * second. compileAsync hands that to the driver in the background where the
 * card supports it, and the textures go up afterwards, one per idle gap.
 */
export async function warmScene(r: THREE.WebGLRenderer, scene: THREE.Scene, camera: THREE.Camera) {
  await r.compileAsync(scene, camera);
  const maps: THREE.Texture[] = [];
  scene.traverse((o) => {
    const m = (o as THREE.Mesh).material as THREE.Material & { map?: THREE.Texture; uniforms?: Record<string, { value: unknown }> };
    if (m?.map) maps.push(m.map);
    const t = m?.uniforms?.uMap?.value;
    if (t instanceof THREE.Texture) maps.push(t);
  });
  // One texture per task, so no single frame pays for all of them. Not idle
  // callbacks: while the page is animating a busy laptop may never be idle,
  // and the scene would still be waiting when you scrolled into it.
  for (const t of maps) {
    await new Promise<void>((done) => window.setTimeout(() => (r.initTexture(t), done()), 0));
  }
}

export type Shared = {
  /**
   * The light probe everything reflects. Null on lean machines: building it
   * costs a phone over a second of blocked main thread, and the direct lights
   * in each scene carry the look well enough without it.
   */
  env: THREE.Texture | null;
  family: string;
  /**
   * True on a machine that should be given less to do: a phone, or anything
   * with few cores or little memory. Views use it to halve their detail rather
   * than drop out entirely — the scene is the same, it just costs less to make.
   */
  lean: boolean;
};

export class Stage {
  renderer: THREE.WebGLRenderer;
  shared: Shared;
  private views: View[] = [];
  /** Built, still compiling. Not drawn yet, but already ours to dispose. */
  private pending = new Set<View>();
  private pmrem: THREE.PMREMGenerator;
  private time = 0;
  private pointer = { x: -1e4, y: -1e4, vx: 0, vy: 0, live: false, down: false };
  private lastMove = -1e9;
  private dpr: number;
  private slow = 0;
  private reduced: boolean;

  constructor(host: HTMLElement) {
    this.reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const coarse = window.matchMedia("(pointer: coarse)").matches;
    this.dpr = Math.min(window.devicePixelRatio || 1, coarse ? 1.5 : 2);
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: "high-performance" });
    this.renderer.setPixelRatio(this.dpr);
    this.renderer.setClearColor(0x000000, 0);
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.NeutralToneMapping;
    this.renderer.toneMappingExposure = 1;
    this.renderer.autoClear = false;
    host.appendChild(this.renderer.domElement);
    this.pmrem = new THREE.PMREMGenerator(this.renderer);
    const n = navigator as Navigator & { deviceMemory?: number };
    const lean = coarse || (n.hardwareConcurrency ?? 8) <= 4 || (n.deviceMemory ?? 8) <= 4;
    this.shared = {
      env: lean ? null : studioEnvironment(this.pmrem),
      family: getComputedStyle(document.body).fontFamily,
      lean,
    };
    this.resize();
    window.addEventListener("pointermove", this.onMove, { passive: true });
    window.addEventListener("pointerdown", this.onDown);
    window.addEventListener("pointerup", this.onUp);
  }

  private onMove = (e: PointerEvent) => {
    const dx = e.clientX - this.pointer.x;
    const dy = e.clientY - this.pointer.y;
    if (this.pointer.x > -1e3) {
      this.pointer.vx = dx;
      this.pointer.vy = dy;
    }
    this.pointer.x = e.clientX;
    this.pointer.y = e.clientY;
    this.lastMove = performance.now();
  };
  private onDown = () => (this.pointer.down = true);
  private onUp = () => (this.pointer.down = false);

  /**
   * A view joins the draw list once it is warm. Until then it is off screen
   * anyway — that's the only moment we ever build one — so waiting costs
   * nothing and saves a stalled frame.
   */
  add(v: View) {
    this.pending.add(v);
    const join = () => {
      if (!this.pending.delete(v)) return; // removed while warming
      this.views.push(v);
      this.views.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
    };
    const warmed = v.warm?.(this.renderer);
    if (warmed) warmed.then(join, join);
    else join();
  }

  remove(v: View) {
    this.pending.delete(v);
    this.views = this.views.filter((x) => x !== v);
    v.dispose();
  }

  clear() {
    this.views.forEach((v) => v.dispose());
    this.pending.forEach((v) => v.dispose());
    this.views = [];
    this.pending.clear();
  }

  resize() {
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }

  frame(dtRaw: number) {
    const dt = Math.min(1 / 30, Math.max(1 / 240, dtRaw));
    this.time += dt;
    const vw = window.innerWidth;
    const vh = window.innerHeight;

    // If frames keep running long, render fewer pixels.
    this.slow = dtRaw > 1 / 42 ? this.slow + dtRaw : Math.max(0, this.slow - dtRaw);
    if (this.slow > 1.2 && this.dpr > 1) {
      this.dpr = Math.max(1, this.dpr * 0.8);
      this.renderer.setPixelRatio(this.dpr);
      this.resize();
      this.slow = 0;
    }

    this.pointer.live = performance.now() - this.lastMove < 250;
    if (!this.pointer.live) {
      this.pointer.vx *= 0.8;
      this.pointer.vy *= 0.8;
    }

    const r = this.renderer;
    r.setScissorTest(false);
    r.setViewport(0, 0, vw, vh);
    r.clear(true, true, true);

    for (const v of this.views) {
      const rect = v.el.getBoundingClientRect();
      const m = v.margin ?? 100;
      if (!v.full && (rect.bottom < -m || rect.top > vh + m || rect.width < 1 || !v.el.isConnected)) continue;
      const f: Frame = { dt, time: this.time, rect, vw, vh, scrollY: window.scrollY, pointer: this.pointer, reduced: this.reduced };
      v.update(f);
      if (v.full) {
        r.setScissorTest(false);
        r.setViewport(0, 0, vw, vh);
      } else {
        // Viewport is the whole box (even the part off screen); scissor keeps it inside.
        const y = vh - rect.bottom;
        r.setViewport(rect.left, y, rect.width, rect.height);
        const sx = Math.max(0, rect.left);
        const sy = Math.max(0, y);
        const sw = Math.min(vw, rect.right) - sx;
        const sh = Math.min(vh, vh - rect.top) - sy;
        if (sw <= 0 || sh <= 0) continue;
        r.setScissor(sx, sy, sw, sh);
        r.setScissorTest(true);
      }
      r.clearDepth();
      v.render(r, f);
    }
  }

  dispose() {
    window.removeEventListener("pointermove", this.onMove);
    window.removeEventListener("pointerdown", this.onDown);
    window.removeEventListener("pointerup", this.onUp);
    this.clear();
    this.shared.env?.dispose();
    this.pmrem.dispose();
    this.renderer.dispose();
    this.renderer.domElement.remove();
  }
}

/** A perspective camera where 1 world unit is 1 CSS pixel on the z = 0 plane. */
export function pixelCamera(w: number, h: number, cam?: THREE.PerspectiveCamera, dist = 1600) {
  const c = cam ?? new THREE.PerspectiveCamera(30, 1, 1, 10000);
  c.aspect = w / h;
  c.fov = (2 * Math.atan(h / 2 / dist) * 180) / Math.PI;
  c.position.set(0, 0, dist);
  c.near = 10;
  c.far = dist * 4;
  c.updateProjectionMatrix();
  return c;
}
