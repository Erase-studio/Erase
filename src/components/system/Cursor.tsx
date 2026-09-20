"use client";

import { useEffect, useRef } from "react";

/**
 * The cursor is a drop of ink (metaballs, drawn in one small WebGL pass and
 * inverted onto the page with difference blending).
 *
 *   Drop     a head and a short chain of droplets. Still, they pool into one
 *            round drop; fast, they pull out into a liquid tail and run back.
 *   Press    over anything you can press, the drop runs out and wraps the
 *            target in a liquid ink outline (never over it); buttons lean in.
 *   Lens     over a big headline [data-warp], the drop swells into a lens and
 *            the letters nearest you swell (Mona Sans is variable).
 *   Label    over [data-cursor-label] (posters, the hero heap), a blue tag.
 *   Click    a splash of droplets that fly out and run back together.
 *
 * Fine pointers with WebGL2 only; otherwise the system cursor stays.
 */

type Char = { el: HTMLElement; x: number; y: number; c: number };
type Warp = { el: HTMLElement; chars: Char[]; base: number };
type Ball = { x: number; y: number; r: number; vr: number; tr: number };
type Drop = { x: number; y: number; vx: number; vy: number; r: number; life: number };

const MAX = 24;
const TAIL = 10;
const WARP_R = 170;

const VERT = `#version 300 es
in vec2 p;
void main() { gl_Position = vec4(p, 0.0, 1.0); }`;

const FRAG = `#version 300 es
precision highp float;
uniform vec3 uB[${MAX}];
uniform int uN;
uniform int uP;
uniform float uH;
out vec4 o;
// The first uP balls are ink pooled round a button: drawn as a liquid outline,
// so the button itself is never inverted. The rest (the drop) are solid.
void main() {
  vec2 q = vec2(gl_FragCoord.x, uH - gl_FragCoord.y);
  float fp = 0.0;
  float fd = 0.0;
  for (int i = 0; i < ${MAX}; i++) {
    if (i >= uN) break;
    vec2 d = q - uB[i].xy;
    float r = uB[i].z;
    float v = r * r / (dot(d, d) + 1.0);
    if (i < uP) fp += v; else fd += v;
  }
  float f = fp + fd;
  float w = fwidth(f) * 1.2;
  float fill = smoothstep(1.0 - w, 1.0 + w, f);
  float ring = fill * (1.0 - smoothstep(1.22 - w, 1.22 + w, f));
  float a = mix(ring, fill, smoothstep(0.25, 0.75, fd / max(f, 1e-4)));
  o = vec4(a);
}`;

export function Cursor() {
  const rootRef = useRef<HTMLDivElement>(null);
  const inkRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const fine = window.matchMedia("(hover: hover) and (pointer: fine)");
    if (!fine.matches) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const canvas = inkRef.current!;
    const gl = canvas.getContext("webgl2", { premultipliedAlpha: true, antialias: false, alpha: true });
    if (!gl) return;

    // ─── GL ───
    const sh = (type: number, src: string) => {
      const s = gl.createShader(type)!;
      gl.shaderSource(s, src);
      gl.compileShader(s);
      return s;
    };
    const prog = gl.createProgram()!;
    gl.attachShader(prog, sh(gl.VERTEX_SHADER, VERT));
    gl.attachShader(prog, sh(gl.FRAGMENT_SHADER, FRAG));
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) return;
    gl.useProgram(prog);
    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    const loc = gl.getAttribLocation(prog, "p");
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
    const uB = gl.getUniformLocation(prog, "uB");
    const uN = gl.getUniformLocation(prog, "uN");
    const uH = gl.getUniformLocation(prog, "uH");
    const uP = gl.getUniformLocation(prog, "uP");
    gl.clearColor(0, 0, 0, 0);
    const data = new Float32Array(MAX * 3);

    const root = rootRef.current!;
    const tag = root.querySelector<HTMLElement>(".cur__tag")!;
    const tagText = tag.querySelector("span")!;
    const html = document.documentElement;
    html.classList.add("has-cursor");

    let dpr = 1;
    const size = () => {
      dpr = Math.min(2, window.devicePixelRatio || 1);
      canvas.width = Math.round(window.innerWidth * dpr);
      canvas.height = Math.round(window.innerHeight * dpr);
    };
    size();

    const pos = { x: -500, y: -500 };
    const ball = (): Ball => ({ x: -500, y: -500, r: 0, vr: 0, tr: 0 });
    const head = ball();
    const tail = Array.from({ length: TAIL }, ball);
    // Ink pooled over a pressable target: up to three balls along its width.
    const pool = [ball(), ball(), ball()];
    const drops: Drop[] = [];
    const tg = { x: -500, y: -500 };
    let state = "default";
    let target: HTMLElement | null = null;
    let visible = false;
    let magnet: HTMLElement | null = null;
    let raf = 0;
    let last = performance.now();

    // ─── Letters that swell ───
    const warps = new Map<HTMLElement, Warp>();
    const wrap = (el: HTMLElement): Warp => {
      if (!el.querySelector(".wc")) {
        const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
        const nodes: Text[] = [];
        while (walker.nextNode()) nodes.push(walker.currentNode as Text);
        for (const n of nodes) {
          const text = n.textContent ?? "";
          if (!text.trim()) continue;
          const frag = document.createDocumentFragment();
          for (const ch of text) {
            if (ch === " " || ch === "\n") frag.append(ch);
            else {
              const s = document.createElement("span");
              s.className = "wc";
              s.textContent = ch;
              frag.append(s);
            }
          }
          n.replaceWith(frag);
        }
      }
      const chars = [...el.querySelectorAll<HTMLElement>(".wc")].map((c) => ({ el: c, x: 0, y: 0, c: 0 }));
      const w = { el, chars, base: parseInt(getComputedStyle(el).fontWeight) || 500 };
      warps.set(el, w);
      return w;
    };
    const warpTargets = () => [...document.querySelectorAll<HTMLElement>("[data-warp]")];
    let targets = warpTargets();
    const refresh = window.setInterval(() => (targets = warpTargets()), 1200);

    const stepWarp = () => {
      let moving = false;
      for (const el of targets) {
        const r = el.getBoundingClientRect();
        const near = !reduced && pos.x > r.left - WARP_R && pos.x < r.right + WARP_R && pos.y > r.top - WARP_R && pos.y < r.bottom + WARP_R;
        let w = warps.get(el);
        if (!w && !near) continue;
        if (!w || !w.chars[0]?.el.isConnected) w = wrap(el);
        // Read every position first, then write, so the page lays out once.
        for (const ch of w.chars) {
          const b = ch.el.getBoundingClientRect();
          ch.x = b.left + b.width / 2;
          ch.y = b.top + b.height / 2;
        }
        for (const ch of w.chars) {
          const d = near ? Math.hypot(ch.x - pos.x, ch.y - pos.y) : Infinity;
          const t = d < WARP_R ? (1 - d / WARP_R) ** 2 : 0;
          ch.c += (t - ch.c) * 0.2;
          if (Math.abs(t - ch.c) > 0.002) moving = true;
          if (ch.c < 0.003) {
            if (ch.el.style.fontVariationSettings) ch.el.style.fontVariationSettings = "";
            continue;
          }
          ch.el.style.fontVariationSettings = `"wght" ${Math.min(900, w.base + 360 * ch.c).toFixed(0)}, "wdth" ${(100 + 22 * ch.c).toFixed(1)}`;
        }
      }
      return moving;
    };

    // ─── What the pointer is over ───
    const classify = (t: Element | null) => {
      target = null;
      if (!t) return "default";
      if (t.closest("[data-cursor='hide']")) return "hide";
      if (t.closest("input, textarea, select, [contenteditable='true']")) return "text";
      const lab = t.closest<HTMLElement>("[data-cursor-label]");
      if (lab) {
        tagText.textContent = lab.dataset.cursorLabel ?? "";
        return "label";
      }
      const press = t.closest<HTMLElement>("a[href], button, [role='button'], label, summary");
      if (press) {
        target = press;
        return "press";
      }
      if (t.closest("[data-warp]")) return "lens";
      return "default";
    };
    const look = (t: Element | null) => {
      const s = classify(t);
      if (s !== state) {
        state = s;
        html.dataset.cursor = s;
      }
    };

    const onMove = (e: PointerEvent) => {
      if (e.pointerType !== "mouse") return;
      pos.x = e.clientX;
      pos.y = e.clientY;
      if (!visible) {
        visible = true;
        for (const b of [head, ...tail]) {
          b.x = pos.x;
          b.y = pos.y;
        }
        tg.x = pos.x;
        tg.y = pos.y;
        html.dataset.cursorVisible = "true";
      }
      look(e.target as Element | null);
      // Buttons lean toward the pointer.
      const m = (e.target as Element | null)?.closest?.<HTMLElement>(".pill, .nav__logo, .eb");
      if (m !== magnet) {
        if (magnet) {
          magnet.dataset.magnet = "off";
          magnet.style.translate = "";
        }
        magnet = reduced ? null : (m ?? null);
        if (magnet) magnet.dataset.magnet = "on";
      }
      if (magnet) {
        const r = magnet.getBoundingClientRect();
        const dx = pos.x - (r.left + r.width / 2);
        const dy = pos.y - (r.top + r.height / 2);
        magnet.style.translate = `${(dx * 0.2).toFixed(1)}px ${(dy * 0.3).toFixed(1)}px`;
      }
      wake();
    };

    /** Radius on a soft spring: ink wobbles a little as it settles. */
    const spring = (b: Ball, k: number) => {
      b.vr += (b.tr - b.r) * 0.16 * k;
      b.vr *= Math.pow(0.7, k);
      b.r += b.vr * k;
      if (b.r < 0) b.r = 0;
    };

    const render = () => {
      raf = 0;
      const now = performance.now();
      const dt = Math.min(1 / 30, (now - last) / 1000);
      last = now;
      const k = dt * 60;
      const ease = (a: number) => 1 - Math.pow(1 - a, k);

      // Small targets (pills, icons) get wrapped; big ones (menu links, cards)
      // just get a bigger drop, so you always see where you are.
      let tr: DOMRect | null = null;
      if (state === "press" && target?.isConnected) tr = target.getBoundingClientRect();
      const lasso = !!tr && tr.height <= 64 && tr.width <= 360;

      // Sizes for the state.
      const hidden = !visible || state === "hide" || state === "text";
      head.tr = hidden ? 0 : state === "lens" ? 62 : state === "press" ? (lasso ? 3.5 : 11) : state === "label" ? 4 : 8;
      tail.forEach((b, i) => (b.tr = hidden || state === "lens" || state === "label" ? 0 : (state === "press" ? (lasso ? 0 : 5) : 6) * (1 - i * 0.065)));

      // Head chases the pointer, each droplet chases the one before it.
      const hk = reduced ? 1 : ease(0.5);
      head.x += (pos.x - head.x) * hk;
      head.y += (pos.y - head.y) * hk;
      let lead: Ball = head;
      for (const b of tail) {
        const kk = reduced ? 1 : ease(0.5);
        b.x += (lead.x - b.x) * kk;
        b.y += (lead.y - b.y) * kk;
        lead = b;
      }
      spring(head, k);
      tail.forEach((b) => spring(b, k));

      // Ink pools over what you can press, as wide as the target is.
      if (lasso && tr) {
        const r = tr;
        const rr = Math.min(r.height / 2 + 9, 46);
        const cx = r.left + r.width / 2;
        const cy = r.top + r.height / 2;
        const span = Math.max(0, r.width / 2 - rr * 0.8);
        pool.forEach((b, i) => {
          const x = cx + (i - 1) * span;
          if (b.r < 0.5) {
            // It starts from the drop and runs out to the target.
            b.x = head.x;
            b.y = head.y;
          }
          b.x += (x - b.x) * ease(0.28);
          b.y += (cy - b.y) * ease(0.28);
          b.tr = span < 1 && i !== 1 ? 0 : rr;
        });
      } else pool.forEach((b) => (b.tr = 0));
      pool.forEach((b) => spring(b, k));

      // Splash droplets fly, fall and shrink back into nothing.
      for (let i = drops.length - 1; i >= 0; i--) {
        const d = drops[i];
        d.vy += 1400 * dt;
        d.vx *= Math.pow(0.9, k);
        d.x += d.vx * dt;
        d.y += d.vy * dt;
        d.life -= dt;
        if (d.life <= 0) drops.splice(i, 1);
      }

      tg.x += (pos.x - tg.x) * ease(0.25);
      tg.y += (pos.y - tg.y) * ease(0.25);
      tag.style.transform = `translate3d(${tg.x}px, ${tg.y}px, 0)`;

      // ─── Draw, only inside the box the ink covers ───
      let n = 0;
      let x0 = Infinity;
      let y0 = Infinity;
      let x1 = -Infinity;
      let y1 = -Infinity;
      const put = (x: number, y: number, r: number) => {
        if (r < 0.4 || n >= MAX) return;
        data[n * 3] = x * dpr;
        data[n * 3 + 1] = y * dpr;
        data[n * 3 + 2] = r * dpr;
        n++;
        const m = r * 2.4 + 12;
        x0 = Math.min(x0, x - m);
        y0 = Math.min(y0, y - m);
        x1 = Math.max(x1, x + m);
        y1 = Math.max(y1, y + m);
      };
      pool.forEach((b) => put(b.x, b.y, b.r));
      const np = n;
      put(head.x, head.y, head.r);
      tail.forEach((b) => put(b.x, b.y, b.r));
      drops.forEach((d) => put(d.x, d.y, d.r * Math.min(1, d.life * 3)));

      gl.disable(gl.SCISSOR_TEST);
      gl.viewport(0, 0, canvas.width, canvas.height);
      gl.clear(gl.COLOR_BUFFER_BIT);
      if (n) {
        const sx = Math.max(0, Math.floor(x0 * dpr));
        const sy = Math.max(0, Math.floor(canvas.height - y1 * dpr));
        const sw = Math.min(canvas.width, Math.ceil(x1 * dpr)) - sx;
        const shh = Math.min(canvas.height, Math.ceil(canvas.height - y0 * dpr)) - sy;
        if (sw > 0 && shh > 0) {
          gl.enable(gl.SCISSOR_TEST);
          gl.scissor(sx, sy, sw, shh);
          gl.uniform3fv(uB, data);
          gl.uniform1i(uN, n);
          gl.uniform1i(uP, np);
          gl.uniform1f(uH, canvas.height);
          gl.drawArrays(gl.TRIANGLES, 0, 3);
        }
      }

      const warping = stepWarp();
      const moving =
        Math.abs(pos.x - tail[TAIL - 1].x) + Math.abs(pos.y - tail[TAIL - 1].y) > 0.2 ||
        [head, ...tail, ...pool].some((b) => Math.abs(b.tr - b.r) > 0.05 || Math.abs(b.vr) > 0.02) ||
        drops.length > 0 ||
        state === "press";
      if (warping || moving) wake();
    };
    const wake = () => {
      if (!raf) raf = requestAnimationFrame(render);
    };

    const onLeave = (e: MouseEvent) => {
      if (e.relatedTarget) return;
      visible = false;
      html.dataset.cursorVisible = "false";
      wake();
    };
    const onDown = (e: PointerEvent) => {
      if (e.pointerType !== "mouse") return;
      html.dataset.cursorDown = "true";
      head.vr -= 3;
      if (reduced) return;
      for (let i = 0; i < 7; i++) {
        const a = -Math.PI / 2 + (Math.random() - 0.5) * Math.PI * 1.6;
        const s = 160 + Math.random() * 260;
        drops.push({ x: pos.x, y: pos.y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, r: 2.5 + Math.random() * 3.5, life: 0.35 + Math.random() * 0.3 });
      }
      wake();
    };
    const onUp = () => {
      html.dataset.cursorDown = "false";
      head.vr += 2;
      wake();
    };
    // The page moved under a still pointer: look again at what it's over.
    const onScroll = () => {
      if (!visible) return;
      look(document.elementFromPoint(pos.x, pos.y));
      wake();
    };
    const onResize = () => {
      size();
      wake();
    };

    window.addEventListener("pointermove", onMove, { passive: true });
    window.addEventListener("mouseout", onLeave);
    window.addEventListener("pointerdown", onDown);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onResize);
    return () => {
      html.classList.remove("has-cursor");
      window.clearInterval(refresh);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("mouseout", onLeave);
      window.removeEventListener("pointerdown", onDown);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onResize);
      cancelAnimationFrame(raf);
    };
  }, []);

  // Two layers: the ink inverts the page (difference), so it sits on its own
  // at the top level; the tag is drawn normally.
  return (
    <>
      <canvas ref={inkRef} className="cur-ink" aria-hidden="true" />
      <div ref={rootRef} className="cur" aria-hidden="true">
        <div className="cur__tag">
          <span />
        </div>
      </div>
    </>
  );
}
