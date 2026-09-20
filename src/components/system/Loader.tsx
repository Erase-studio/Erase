"use client";

import { useEffect, useRef, useState } from "react";
import { whenStageReady } from "@/lib/stage/store";
import { sound } from "@/lib/sound";

declare global {
  interface Window {
    __eraseLoaded?: boolean;
  }
}

/**
 * The loader is ink. Drops fall onto a blank page and pool; the pool rises as
 * the site loads (the count flips colour as the ink passes it), and its
 * surface reaches up toward your pointer. When the page is full, the name
 * surfaces in it. On the way in (the click that lets sound start) all of the
 * ink draws itself together into one drop under your pointer, which is where
 * the cursor lives, and the site is there around it. Later visits in the same
 * session get the short version with no question; reduced motion skips it.
 */

type Phase = "idle" | "fill" | "gate" | "exit" | "done";
type Drop = { x: number; y: number; vx: number; vy: number; r: number };

const MAXD = 20;

const VERT = `#version 300 es
in vec2 p;
void main() { gl_Position = vec4(p, 0.0, 1.0); }`;

const FRAG = `#version 300 es
precision highp float;
uniform vec2 uRes;
uniform float uT;
uniform float uSurf;   // surface height, px from the top
uniform float uAmp;    // wave height
uniform vec3 uReach;   // x, height, width of the bulge toward the pointer
uniform float uMode;   // 0 pool, 1 drawing together
uniform vec3 uC;       // centre and radius of the gathering drop
uniform vec3 uD[${MAXD}];
uniform int uN;
uniform vec3 uInk;
uniform float uDpr;
out vec4 o;

float smin(float a, float b, float k) {
  float h = clamp(0.5 + 0.5 * (b - a) / k, 0.0, 1.0);
  return mix(b, a, h) - k * h * (1.0 - h);
}

void main() {
  vec2 q = vec2(gl_FragCoord.x, uRes.y - gl_FragCoord.y) / uDpr;
  float d;
  if (uMode < 0.5) {
    float s = uSurf
      + sin(q.x * 0.0061 + uT * 1.3) * uAmp
      + sin(q.x * 0.0173 - uT * 2.1) * uAmp * 0.45
      + sin(q.x * 0.041 + uT * 3.4) * uAmp * 0.18;
    float g = (q.x - uReach.x) / uReach.z;
    s -= uReach.y * exp(-g * g);
    d = (s - q.y) * 0.8;
  } else {
    vec2 v = q - uC.xy;
    float a = atan(v.y, v.x);
    float r = uC.z * (1.0 + 0.03 * sin(a * 5.0 + uT * 5.0) + 0.018 * sin(a * 9.0 - uT * 7.0));
    d = length(v) - r;
  }
  for (int i = 0; i < ${MAXD}; i++) {
    if (i >= uN) break;
    d = smin(d, length(q - uD[i].xy) - uD[i].z, 28.0);
  }
  float a = clamp(0.5 - d * uDpr, 0.0, 1.0);
  o = vec4(uInk * a, a);
}`;

export function Loader() {
  const rootRef = useRef<HTMLDivElement>(null);
  const gate = useRef<((withSound: boolean) => void) | null>(null);
  const [phase, setPhase] = useState<Phase>("idle");

  useEffect(() => {
    const root = rootRef.current!;
    const html = document.documentElement;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let seen = false;
    try {
      seen = sessionStorage.getItem("erase:seen") === "1";
    } catch {}

    const announce = () => {
      if (window.__eraseLoaded) return;
      window.__eraseLoaded = true;
      html.style.overflow = "";
      window.__lenis?.start();
      try {
        sessionStorage.setItem("erase:seen", "1");
      } catch {}
      window.setTimeout(() => {
        window.dispatchEvent(new Event("erase:loaded"));
        window.dispatchEvent(new Event("erase:reveal"));
      }, 0);
    };

    const canvas = root.querySelector<HTMLCanvasElement>(".loader__ink")!;
    const gl = reduced ? null : canvas.getContext("webgl2", { premultipliedAlpha: true, alpha: true, antialias: false });
    // Reduced motion (or no WebGL2): just open the page.
    if (!gl) {
      root.dataset.skip = "true";
      announce();
      return;
    }

    html.style.overflow = "hidden";
    window.__lenis?.stop();
    let cancelled = false;
    let raf = 0;

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
    gl.useProgram(prog);
    gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    const loc = gl.getAttribLocation(prog, "p");
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
    const u = (n: string) => gl.getUniformLocation(prog, n);
    const U = { res: u("uRes"), t: u("uT"), surf: u("uSurf"), amp: u("uAmp"), reach: u("uReach"), mode: u("uMode"), c: u("uC"), d: u("uD"), n: u("uN"), ink: u("uInk"), dpr: u("uDpr") };
    gl.clearColor(0, 0, 0, 0);

    // The ink is the page's text colour: graphite by day, paper at night.
    const [ir, ig, ib] = (getComputedStyle(root).color.match(/\d+/g) ?? ["20", "21", "23"]).map(Number);
    gl.uniform3f(U.ink, ir / 255, ig / 255, ib / 255);

    let W = 0;
    let H = 0;
    let dpr = 1;
    const size = () => {
      W = window.innerWidth;
      H = window.innerHeight;
      dpr = Math.min(2, window.devicePixelRatio || 1);
      canvas.width = Math.round(W * dpr);
      canvas.height = Math.round(H * dpr);
      gl.viewport(0, 0, canvas.width, canvas.height);
      gl.uniform2f(U.res, canvas.width, canvas.height);
      gl.uniform1f(U.dpr, dpr);
    };
    size();
    window.addEventListener("resize", size);

    const pointer = { x: -1e4, y: -1e4, seen: false };
    const onMove = (e: PointerEvent) => {
      pointer.x = e.clientX;
      pointer.y = e.clientY;
      pointer.seen = true;
    };
    window.addEventListener("pointermove", onMove, { passive: true });

    // ─── State ───
    let ready = false;
    Promise.all([document.fonts.ready, whenStageReady()]).then(() => (ready = true));
    const t0 = performance.now();
    const minDur = seen ? 1100 : 2600;
    let shown = 0;
    let level = 0;
    let mode: Phase = "fill";
    let modeT = t0;
    let reach = 0;
    let reachX = W / 2;
    let nextDrop = 0;
    let last = t0;
    const drops: Drop[] = [];
    const gather = { x: W / 2, y: H / 2, fromX: W / 2, fromY: H / 2, fromR: 0 };
    const count = root.querySelector<HTMLElement>(".loader__num")!;
    const data = new Float32Array(MAXD * 3);

    const go = (m: Phase) => {
      mode = m;
      modeT = performance.now();
      setPhase(m);
    };

    /** Everything draws together into one drop, under the pointer. */
    const exit = () => {
      go("exit");
      gather.fromX = W / 2;
      gather.fromY = H / 2;
      gather.fromR = Math.hypot(W, H) * 0.62;
      gather.x = pointer.seen ? pointer.x : W / 2;
      gather.y = pointer.seen ? pointer.y : H * 0.55;
      // A few stray drops left on the page, pulled in behind it.
      drops.length = 0;
      for (let i = 0; i < 9; i++) {
        const a = Math.random() * Math.PI * 2;
        const rr = Math.hypot(W, H) * (0.35 + Math.random() * 0.25);
        drops.push({ x: W / 2 + Math.cos(a) * rr, y: H / 2 + Math.sin(a) * rr * 0.7, vx: 0, vy: 0, r: 6 + Math.random() * 16 });
      }
      sound.whoosh(0.8, 1.1);
      window.setTimeout(announce, 180);
    };

    const step = (now: number) => {
      raf = 0;
      if (cancelled) return;
      const dt = Math.min(1 / 30, (now - last) / 1000);
      last = now;
      const t = (now - t0) / 1000;
      const since = (now - modeT) / 1000;

      if (mode === "fill") {
        // The count follows the real loading, never past it.
        const time = Math.min(1, (now - t0) / minDur);
        const want = ready ? time : Math.min(time, 0.9);
        shown += (want - shown) * (1 - Math.pow(0.9, dt * 60));
        if (want >= 1 && shown > 0.996) shown = 1;
        count.textContent = String(Math.round(shown * 100));
        level += (shown * 1.12 - level) * (1 - Math.pow(0.93, dt * 60));

        // Drops fall onto the page and into the pool.
        if (now > nextDrop && drops.length < MAXD - 2) {
          nextDrop = now + (seen ? 90 : 160) + Math.random() * (seen ? 120 : 260);
          drops.push({ x: W * (0.06 + Math.random() * 0.88), y: -30, vx: 0, vy: 80 + Math.random() * 160, r: 5 + Math.random() * Math.random() * 16 });
        }
        const surf = H * (1 - level);
        for (let i = drops.length - 1; i >= 0; i--) {
          const d = drops[i];
          d.vy += 1500 * dt;
          d.y += d.vy * dt;
          if (d.y - d.r > surf + 30) drops.splice(i, 1);
        }

        // The surface reaches up for a pointer that comes close.
        const gap = surf - pointer.y;
        const lift = pointer.seen && gap > 0 && gap < 260 ? Math.min(gap - 6, (260 - gap) * 0.55) : 0;
        reach += (Math.max(0, lift) - reach) * (1 - Math.pow(0.88, dt * 60));
        reachX += (pointer.x - reachX) * (1 - Math.pow(0.85, dt * 60));

        gl.uniform1f(U.mode, 0);
        gl.uniform1f(U.surf, surf);
        gl.uniform1f(U.amp, 16 * (1 - Math.min(1, level) * 0.6));
        gl.uniform3f(U.reach, reachX, reach, 60 + reach * 0.35);

        if (level > 1.1) {
          drops.length = 0;
          if (seen) exit();
          else go("gate");
        }
      } else if (mode === "gate") {
        gl.uniform1f(U.surf, -80);
        gl.uniform3f(U.reach, 0, 0, 1);
      } else if (mode === "exit") {
        const k = Math.min(1, since / 1.25);
        // Slow to start, quick through the middle, soft at the end.
        const e = k < 0.5 ? 4 * k * k * k : 1 - (-2 * k + 2) ** 3 / 2;
        if (pointer.seen) {
          gather.x += (pointer.x - gather.x) * 0.2;
          gather.y += (pointer.y - gather.y) * 0.2;
        }
        const cx = gather.fromX + (gather.x - gather.fromX) * e;
        const cy = gather.fromY + (gather.y - gather.fromY) * e;
        const r = gather.fromR + ((pointer.seen ? 8 : 0) - gather.fromR) * e;
        gl.uniform1f(U.mode, 1);
        gl.uniform3f(U.c, cx, cy, r);
        for (const d of drops) {
          // Pulled in toward the drop, harder as it tightens.
          const ox = cx - d.x;
          const oy = cy - d.y;
          const dist = Math.hypot(ox, oy) + 1;
          d.vx += (ox / dist) * 2600 * e * dt;
          d.vy += (oy / dist) * 2600 * e * dt;
          d.vx *= 0.92;
          d.vy *= 0.92;
          d.x += d.vx * dt;
          d.y += d.vy * dt;
          d.r *= 1 - 0.6 * dt * e;
        }
        if (k >= 1) {
          setPhase("done");
          return;
        }
      }

      let n = 0;
      for (const d of drops) {
        if (n >= MAXD) break;
        data[n * 3] = d.x;
        data[n * 3 + 1] = d.y;
        data[n * 3 + 2] = d.r;
        n++;
      }
      gl.uniform3fv(U.d, data);
      gl.uniform1i(U.n, n);
      gl.uniform1f(U.t, t);
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
      raf = requestAnimationFrame(step);
    };

    gate.current = (withSound: boolean) => {
      sound.set(withSound);
      if (withSound) sound.welcome();
      exit();
    };

    document.fonts.ready.then(() => {
      if (cancelled) return;
      go("fill");
      raf = requestAnimationFrame(step);
    });

    return () => {
      cancelled = true;
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", size);
      window.removeEventListener("pointermove", onMove);
      html.style.overflow = "";
    };
  }, []);

  if (phase === "done") return null;

  return (
    <div
      ref={rootRef}
      className="loader"
      data-phase={phase}
      role={phase === "gate" ? "dialog" : undefined}
      aria-modal={phase === "gate" ? true : undefined}
      aria-label="Welcome to Erase"
      aria-hidden={phase === "gate" ? undefined : true}
    >
      <canvas className="loader__ink" />

      <div className="loader__ui">
        <p className="loader__corner mono" data-c="tl">
          Erase
        </p>
        <p className="loader__corner mono" data-c="tr">
          Independent design &amp; development studio
        </p>
        <p className="loader__count">
          <span className="loader__num">0</span>
        </p>
        <p className="loader__corner mono" data-c="bl">
          (Loading) Every page starts blank
        </p>
        <p className="loader__corner mono" data-c="br">
          Headphones on. It sounds better.
        </p>
        <p className="loader__word" aria-hidden="true">
          {"Erase".split("").map((c, i) => (
            <span key={i} style={{ "--i": i } as React.CSSProperties}>
              {c}
            </span>
          ))}
        </p>
      </div>

      {phase === "gate" && (
        <div className="loader__gate">
          <button type="button" className="loader__enter" autoFocus onClick={() => gate.current?.(true)}>
            <span className="snd" data-on="true" aria-hidden="true">
              <i />
              <i />
              <i />
              <i />
            </span>
            Enter with sound
          </button>
          <button type="button" className="loader__quiet mono" onClick={() => gate.current?.(false)}>
            or come in quietly
          </button>
        </div>
      )}
    </div>
  );
}
