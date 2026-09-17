"use client";

import { useEffect, useRef } from "react";
import { Flowmap, Mesh, Program, Renderer, Texture, Triangle, Vec2 } from "ogl";
import { gsap, ScrollTrigger } from "@/lib/gsap";
import { eraserBus } from "@/lib/eraserBus";

/**
 * The hero headline, re-drawn in WebGL as wet graphite.
 * - The cursor drags a flowmap through it: letters smear like a thumb through pencil.
 * - Scrolling away dissolves it into graphite dust with a blueline edge: it erases itself.
 * The DOM headline stays in place for layout, selection and assistive tech; only its
 * paint is handed over. Anything unsupported falls back to the plain DOM text.
 */

const vertex = /* glsl */ `
  attribute vec2 uv;
  attribute vec2 position;
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = vec4(position, 0.0, 1.0);
  }
`;

const fragment = /* glsl */ `
  precision highp float;
  uniform sampler2D tMap;
  uniform sampler2D tFlow;
  uniform float uTime;
  uniform float uDissolve;
  uniform float uAspect;
  uniform vec3 uInk;
  uniform vec3 uSmudge;
  uniform vec3 uEdge;
  varying vec2 vUv;

  float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
  float noise(vec2 p) {
    vec2 i = floor(p), f = fract(p);
    float a = hash(i), b = hash(i + vec2(1.0, 0.0)), c = hash(i + vec2(0.0, 1.0)), d = hash(i + vec2(1.0, 1.0));
    vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(a, b, u.x) + (c - a) * u.y * (1.0 - u.x) + (d - b) * u.x * u.y;
  }
  float fbm(vec2 p) {
    float v = 0.0, a = 0.5;
    for (int i = 0; i < 5; i++) { v += a * noise(p); p *= 2.02; a *= 0.5; }
    return v;
  }

  void main() {
    vec3 flow = texture2D(tFlow, vUv).rgb;
    vec2 f = flow.xy;
    float mag = clamp(length(f), 0.0, 1.0);

    // Smear: average taps dragged back along the flow direction.
    float a = 0.0;
    float total = 0.0;
    for (int i = 0; i < 6; i++) {
      float k = float(i) / 5.0;
      float wgt = 1.0 - k * 0.7;
      a += texture2D(tMap, vUv - f * 0.075 * k).a * wgt;
      total += wgt;
    }
    a /= total;

    // Paper tooth: the smeared graphite breaks up a little.
    float grain = noise(vUv * vec2(uAspect, 1.0) * 900.0);
    a *= 1.0 - mag * 0.35 * grain;

    // Dissolve into dust as the section scrolls away.
    float n = fbm(vUv * vec2(uAspect, 1.0) * 5.0 + vec2(0.0, uTime * 0.03));
    n = mix(n, hash(vUv * 1400.0), 0.18);
    float threshold = uDissolve * 1.15;
    float keep = smoothstep(threshold - 0.02, threshold + 0.02, n);
    float edge = (1.0 - smoothstep(threshold, threshold + 0.07, n)) * keep * step(0.001, uDissolve);

    vec3 col = mix(uInk, uSmudge, clamp(mag * 1.6, 0.0, 1.0));
    col = mix(col, uEdge, clamp(edge * 1.4, 0.0, 1.0));
    float alpha = a * keep;
    gl_FragColor = vec4(col * alpha, alpha);
  }
`;

const hex = (h: string) => {
  const n = parseInt(h.slice(1), 16);
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
};

export function InkTitle({ hostRef }: { hostRef: React.RefObject<HTMLElement | null> }) {
  const canvasHolder = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const host = hostRef.current;
    const holder = canvasHolder.current;
    if (!host || !holder) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) return;

    const probe = document.createElement("canvas").getContext("2d") as CanvasRenderingContext2D & {
      fontStretch?: string;
      letterSpacing?: string;
    };
    if (!probe || !("fontStretch" in probe)) return;

    let renderer: Renderer;
    try {
      renderer = new Renderer({ dpr: Math.min(window.devicePixelRatio, 2), alpha: true, premultipliedAlpha: true });
    } catch {
      return;
    }
    const gl = renderer.gl;
    gl.clearColor(0, 0, 0, 0);
    const canvas = gl.canvas as HTMLCanvasElement;
    canvas.className = "ink-canvas";
    holder.appendChild(canvas);

    const text = document.createElement("canvas");
    const tctx = text.getContext("2d")! as CanvasRenderingContext2D & { fontStretch: string; letterSpacing: string };
    const texture = new Texture(gl, { image: text, generateMipmaps: false });
    const flowmap = new Flowmap(gl, { falloff: 0.22, dissipation: 0.955, alpha: 0.9, size: 256 });

    const program = new Program(gl, {
      vertex,
      fragment,
      uniforms: {
        tMap: { value: texture },
        tFlow: flowmap.uniform,
        uTime: { value: 0 },
        uDissolve: { value: 0 },
        uAspect: { value: 1 },
        uInk: { value: hex("#E9EAEC") },
        uSmudge: { value: hex("#8B8E94") },
        uEdge: { value: hex("#79C8EE") },
      },
      transparent: true,
      depthTest: false,
    });
    const mesh = new Mesh(gl, { geometry: new Triangle(gl), program });

    let w = 0;
    let h = 0;

    // Paint the DOM words into the texture at exactly their laid-out positions.
    const paint = () => {
      const hr = host.getBoundingClientRect();
      w = hr.width;
      h = hr.height;
      renderer.setSize(w, h);
      const dpr = Math.min(window.devicePixelRatio, 2);
      text.width = Math.round(w * dpr);
      text.height = Math.round(h * dpr);
      tctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      tctx.clearRect(0, 0, w, h);
      const words = host.querySelectorAll<HTMLElement>("[data-hero-word]");
      words.forEach((el) => {
        const cs = getComputedStyle(el);
        const size = parseFloat(cs.fontSize);
        const r = el.getBoundingClientRect();
        tctx.font = `${cs.fontWeight} ${size}px ${cs.fontFamily}`;
        tctx.fontStretch = "semi-expanded";
        tctx.letterSpacing = cs.letterSpacing === "normal" ? "0px" : cs.letterSpacing;
        tctx.textBaseline = "alphabetic";
        tctx.fillStyle = "#fff";
        const m = tctx.measureText("Hg");
        const content = m.fontBoundingBoxAscent + m.fontBoundingBoxDescent;
        const lh = parseFloat(cs.lineHeight) || size;
        const baseline = r.top - hr.top + (lh - content) / 2 + m.fontBoundingBoxAscent;
        tctx.fillText(el.textContent ?? "", r.left - hr.left + parseFloat(cs.paddingLeft), baseline);
      });
      texture.image = text;
      texture.needsUpdate = true;
      flowmap.aspect = w / h;
      program.uniforms.uAspect.value = w / h;
    };

    const mouse = new Vec2(-1, -1);
    const velocity = new Vec2();
    let lastT = 0;
    let lastM: Vec2 | null = null;
    let inside = false;
    const client = { x: 0, y: 0 };
    const onEnter = () => (inside = true);
    const onLeave = () => {
      inside = false;
      document.documentElement.dataset.eraser = "";
    };
    const onMove = (e: PointerEvent) => {
      inside = e.pointerType === "mouse";
      client.x = e.clientX;
      client.y = e.clientY;
      const r = host.getBoundingClientRect();
      const x = (e.clientX - r.left) / r.width;
      const y = 1 - (e.clientY - r.top) / r.height;
      const now = performance.now();
      if (lastM) {
        const dt = Math.max(14, now - lastT);
        velocity.set(((x - lastM.x) * 1000) / dt / 12, ((y - lastM.y) * 1000) / dt / 12);
      }
      mouse.set(x, y);
      lastM = new Vec2(x, y);
      lastT = now;
    };
    host.addEventListener("pointermove", onMove);
    host.addEventListener("pointerenter", onEnter);
    host.addEventListener("pointerleave", onLeave);

    let visible = true;
    const io = new IntersectionObserver(([entry]) => (visible = entry.isIntersecting));
    io.observe(host);

    let raf = 0;
    const tick = (t: number) => {
      raf = requestAnimationFrame(tick);
      if (!visible) return;
      if (performance.now() - lastT > 60) velocity.multiply(0.86);
      flowmap.mouse.copy(mouse);
      flowmap.velocity.lerp(velocity, velocity.len() ? 0.35 : 0.1);
      flowmap.update();
      // The 3D eraser is the thing doing the smearing.
      if (inside && program.uniforms.uDissolve.value < 0.3) {
        const speed = velocity.len();
        eraserBus.point(client.x, client.y, Math.min(1, 0.25 + speed * 0.6));
        document.documentElement.dataset.eraser = "on";
        if (speed > 0.35 && Math.random() < 0.5) eraserBus.crumbs(client.x, client.y, 1, Math.sign(velocity.x));
      } else if (program.uniforms.uDissolve.value < 0.3) {
        // Not in use: it rests in the empty corner of the hero, breathing, waiting to be picked up.
        if (document.documentElement.dataset.eraser === "on") document.documentElement.dataset.eraser = "";
        const hr = host.getBoundingClientRect();
        const s = t * 0.001;
        eraserBus.point(
          hr.left + hr.width * (hr.width < 768 ? 0.74 : 0.8) + Math.sin(s * 0.9) * 10,
          hr.top + hr.height * (hr.width < 768 ? 0.24 : 0.3) + Math.sin(s * 1.3) * 14,
          0,
          1.15,
        );
      }
      program.uniforms.uTime.value = t * 0.001;
      renderer.render({ scene: mesh });
    };

    let st: ScrollTrigger | undefined;
    let ro: ResizeObserver | undefined;
    let cancelled = false;

    document.fonts.ready.then(() => {
      if (cancelled) return;
      paint();
      raf = requestAnimationFrame(tick);
      // Hand the paint over on the next frame, once WebGL has drawn once.
      requestAnimationFrame(() => {
        if (cancelled) return;
        host.dataset.ink = "true";
        // A splash of wet ink as it arrives.
        gsap.fromTo(
          mouse,
          { x: 0.05, y: 0.4 },
          {
            x: 0.75,
            y: 0.25,
            duration: 0.9,
            ease: "power2.inOut",
            onUpdate: () => {
              velocity.set(0.9, 0.12);
              lastT = performance.now();
            },
          },
        );
      });
      st = ScrollTrigger.create({
        trigger: host,
        start: "top top",
        end: "bottom top",
        scrub: true,
        onUpdate: (self) => {
          program.uniforms.uDissolve.value = Math.min(1, self.progress * 1.25);
        },
      });
      ro = new ResizeObserver(() => paint());
      ro.observe(host);
    });

    return () => {
      cancelled = true;
      cancelAnimationFrame(raf);
      host.removeEventListener("pointermove", onMove);
      host.removeEventListener("pointerenter", onEnter);
      host.removeEventListener("pointerleave", onLeave);
      document.documentElement.dataset.eraser = "";
      io.disconnect();
      ro?.disconnect();
      st?.kill();
      delete host.dataset.ink;
      canvas.remove();
      gl.getExtension("WEBGL_lose_context")?.loseContext();
    };
  }, [hostRef]);

  return <div ref={canvasHolder} aria-hidden="true" />;
}
