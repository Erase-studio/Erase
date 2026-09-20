/**
 * Water on a dark surface. The pointer drags a wave across a height field
 * (the classic two-step wave equation, ping-ponged between three sheets), and
 * the surface is lit by its own slope so the crests catch the light and the
 * troughs go black. Nothing happens until something moves over it.
 *
 * Runs at a quarter of the screen and sleeps a few seconds after the last
 * movement, so an idle page costs nothing.
 */

const VERT = `#version 300 es
in vec2 p;
out vec2 uv;
void main() {
  uv = p * 0.5 + 0.5;
  gl_Position = vec4(p, 0.0, 1.0);
}`;

/** One step of the wave, plus whatever the pointer just drew across it. */
const SIM = `#version 300 es
precision highp float;
in vec2 uv;
uniform sampler2D uCur;
uniform sampler2D uPrev;
uniform vec2 uTexel;
uniform vec4 uStroke; // from, to
uniform float uPush;
uniform float uRadius;
out vec4 o;

float seg(vec2 p, vec2 a, vec2 b) {
  vec2 ab = b - a;
  float t = clamp(dot(p - a, ab) / max(dot(ab, ab), 1e-6), 0.0, 1.0);
  return length(p - (a + ab * t));
}

void main() {
  float p = texture(uPrev, uv).r;
  float s =
    texture(uCur, uv + vec2(uTexel.x, 0.0)).r +
    texture(uCur, uv - vec2(uTexel.x, 0.0)).r +
    texture(uCur, uv + vec2(0.0, uTexel.y)).r +
    texture(uCur, uv - vec2(0.0, uTexel.y)).r;
  float n = (s * 0.5 - p) * 0.9905;
  if (uPush != 0.0) {
    float d = seg(uv, uStroke.xy, uStroke.zw);
    n += uPush * exp(-(d * d) / (uRadius * uRadius));
  }
  o = vec4(clamp(n, -2.0, 2.0), 0.0, 0.0, 1.0);
}`;

/** Light across the slope: crests bright, troughs dark. */
const DRAW = `#version 300 es
precision highp float;
in vec2 uv;
uniform sampler2D uCur;
uniform vec2 uTexel;
uniform vec3 uHi;
uniform vec3 uLo;
uniform float uGain;
uniform float uMax;
out vec4 o;

void main() {
  float l = texture(uCur, uv - vec2(uTexel.x, 0.0)).r;
  float r = texture(uCur, uv + vec2(uTexel.x, 0.0)).r;
  float d = texture(uCur, uv - vec2(0.0, uTexel.y)).r;
  float u = texture(uCur, uv + vec2(0.0, uTexel.y)).r;
  // Lit from the top left, like everything else on the site.
  float shade = ((r - l) * 0.8 + (u - d) * 0.5) * uGain;
  float a = clamp(abs(shade), 0.0, uMax);
  vec3 col = shade > 0.0 ? uHi : uLo;
  o = vec4(col * a, a);
}`;

export type RippleOpts = {
  /** Light picked up by a crest. */
  hi?: [number, number, number];
  /** Colour of the far side of a wave. */
  lo?: [number, number, number];
  gain?: number;
  max?: number;
  /** Seconds to keep simulating after the last movement. */
  linger?: number;
};

export function startRipples(canvas: HTMLCanvasElement, opts: RippleOpts = {}) {
  const gl = canvas.getContext("webgl2", { premultipliedAlpha: true, alpha: true, antialias: false, depth: false });
  if (!gl) return null;
  if (!gl.getExtension("EXT_color_buffer_float") && !gl.getExtension("EXT_color_buffer_half_float")) return null;
  gl.getExtension("OES_texture_float_linear");

  const build = (src: string) => {
    const prog = gl.createProgram()!;
    for (const [type, code] of [
      [gl.VERTEX_SHADER, VERT],
      [gl.FRAGMENT_SHADER, src],
    ] as const) {
      const sh = gl.createShader(type)!;
      gl.shaderSource(sh, code);
      gl.compileShader(sh);
      gl.attachShader(prog, sh);
    }
    gl.linkProgram(prog);
    return prog;
  };
  const sim = build(SIM);
  const draw = build(DRAW);
  if (!gl.getProgramParameter(sim, gl.LINK_STATUS) || !gl.getProgramParameter(draw, gl.LINK_STATUS)) return null;

  gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  for (const prog of [sim, draw]) {
    const loc = gl.getAttribLocation(prog, "p");
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
  }

  let w = 2;
  let h = 2;
  const sheets = [0, 1, 2].map(() => ({ tex: gl.createTexture()!, fb: gl.createFramebuffer()! }));
  const alloc = () => {
    for (const s of sheets) {
      gl.bindTexture(gl.TEXTURE_2D, s.tex);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA16F, w, h, 0, gl.RGBA, gl.HALF_FLOAT, null);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      gl.bindFramebuffer(gl.FRAMEBUFFER, s.fb);
      gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, s.tex, 0);
      gl.clearColor(0, 0, 0, 1);
      gl.clear(gl.COLOR_BUFFER_BIT);
    }
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  };
  const size = () => {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    w = Math.max(160, Math.min(620, Math.round(window.innerWidth / 2.1)));
    h = Math.max(96, Math.round((w * window.innerHeight) / window.innerWidth));
    alloc();
  };
  size();

  const uSim = {
    cur: gl.getUniformLocation(sim, "uCur"),
    prev: gl.getUniformLocation(sim, "uPrev"),
    texel: gl.getUniformLocation(sim, "uTexel"),
    stroke: gl.getUniformLocation(sim, "uStroke"),
    push: gl.getUniformLocation(sim, "uPush"),
    radius: gl.getUniformLocation(sim, "uRadius"),
  };
  const uDraw = {
    cur: gl.getUniformLocation(draw, "uCur"),
    texel: gl.getUniformLocation(draw, "uTexel"),
    hi: gl.getUniformLocation(draw, "uHi"),
    lo: gl.getUniformLocation(draw, "uLo"),
    gain: gl.getUniformLocation(draw, "uGain"),
    max: gl.getUniformLocation(draw, "uMax"),
  };
  let hi = opts.hi ?? [1, 1, 1];
  let lo = opts.lo ?? [0.32, 0.4, 0.75];
  let gain = opts.gain ?? 2.1;
  let max = opts.max ?? 0.16;
  const linger = (opts.linger ?? 3.5) * 1000;

  let cur = 0;
  let prev = 1;
  const pointer = { x: 0.5, y: 0.5, px: 0.5, py: 0.5, push: 0, radius: 0.014 };
  let awake = 0;
  let raf = 0;
  let last = performance.now();

  const frame = (now: number) => {
    raf = 0;
    awake -= now - last;
    last = now;

    const next = 3 - cur - prev;
    gl.useProgram(sim);
    gl.viewport(0, 0, w, h);
    gl.bindFramebuffer(gl.FRAMEBUFFER, sheets[next].fb);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, sheets[cur].tex);
    gl.uniform1i(uSim.cur, 0);
    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, sheets[prev].tex);
    gl.uniform1i(uSim.prev, 1);
    gl.uniform2f(uSim.texel, 1 / w, 1 / h);
    gl.uniform4f(uSim.stroke, pointer.px, 1 - pointer.py, pointer.x, 1 - pointer.y);
    gl.uniform1f(uSim.push, pointer.push);
    gl.uniform1f(uSim.radius, pointer.radius);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    pointer.push = 0;
    pointer.radius = 0.014;
    pointer.px = pointer.x;
    pointer.py = pointer.y;
    prev = cur;
    cur = next;

    gl.useProgram(draw);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, sheets[cur].tex);
    gl.uniform1i(uDraw.cur, 0);
    gl.uniform2f(uDraw.texel, 1 / w, 1 / h);
    gl.uniform3f(uDraw.hi, hi[0], hi[1], hi[2]);
    gl.uniform3f(uDraw.lo, lo[0], lo[1], lo[2]);
    gl.uniform1f(uDraw.gain, gain);
    gl.uniform1f(uDraw.max, max);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.drawArrays(gl.TRIANGLES, 0, 3);

    if (awake > 0) raf = requestAnimationFrame(frame);
  };
  const wake = (ms = linger) => {
    awake = Math.max(awake, ms);
    if (!raf) {
      last = performance.now();
      raf = requestAnimationFrame(frame);
    }
  };

  const onMove = (e: PointerEvent) => {
    const x = e.clientX / window.innerWidth;
    const y = e.clientY / window.innerHeight;
    const speed = Math.hypot(x - pointer.x, y - pointer.y);
    pointer.x = x;
    pointer.y = y;
    // A slow hand barely disturbs it; a fast one drags a real wake.
    pointer.push = Math.min(0.09, 0.006 + speed * 1.1);
    wake();
  };
  const onDown = (e: PointerEvent) => {
    pointer.x = pointer.px = e.clientX / window.innerWidth;
    pointer.y = pointer.py = e.clientY / window.innerHeight;
    pointer.push = 0.34;
    pointer.radius = 0.01;
    wake();
  };
  const onResize = () => {
    size();
    wake(800);
  };
  window.addEventListener("pointermove", onMove, { passive: true });
  window.addEventListener("pointerdown", onDown, { passive: true });
  window.addEventListener("resize", onResize);

  return {
    /** Re-colour it (the page went from day to night, or back). */
    set(next: RippleOpts) {
      if (next.hi) hi = next.hi;
      if (next.lo) lo = next.lo;
      if (next.gain !== undefined) gain = next.gain;
      if (next.max !== undefined) max = next.max;
      wake(600);
    },
    dispose() {
      cancelAnimationFrame(raf);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerdown", onDown);
      window.removeEventListener("resize", onResize);
    },
  };
}
