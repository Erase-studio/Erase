/* GLSL for the dust world. */

export const noise = /* glsl */ `
vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec4 mod289(vec4 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec4 permute(vec4 x) { return mod289(((x * 34.0) + 10.0) * x); }
vec4 taylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }
float snoise(vec3 v) {
  const vec2 C = vec2(1.0 / 6.0, 1.0 / 3.0);
  const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);
  vec3 i = floor(v + dot(v, C.yyy));
  vec3 x0 = v - i + dot(i, C.xxx);
  vec3 g = step(x0.yzx, x0.xyz);
  vec3 l = 1.0 - g;
  vec3 i1 = min(g.xyz, l.zxy);
  vec3 i2 = max(g.xyz, l.zxy);
  vec3 x1 = x0 - i1 + C.xxx;
  vec3 x2 = x0 - i2 + C.yyy;
  vec3 x3 = x0 - D.yyy;
  i = mod289(i);
  vec4 p = permute(permute(permute(i.z + vec4(0.0, i1.z, i2.z, 1.0)) + i.y + vec4(0.0, i1.y, i2.y, 1.0)) + i.x + vec4(0.0, i1.x, i2.x, 1.0));
  float n_ = 0.142857142857;
  vec3 ns = n_ * D.wyz - D.xzx;
  vec4 j = p - 49.0 * floor(p * ns.z * ns.z);
  vec4 x_ = floor(j * ns.z);
  vec4 y_ = floor(j - 7.0 * x_);
  vec4 x = x_ * ns.x + ns.yyyy;
  vec4 y = y_ * ns.x + ns.yyyy;
  vec4 h = 1.0 - abs(x) - abs(y);
  vec4 b0 = vec4(x.xy, y.xy);
  vec4 b1 = vec4(x.zw, y.zw);
  vec4 s0 = floor(b0) * 2.0 + 1.0;
  vec4 s1 = floor(b1) * 2.0 + 1.0;
  vec4 sh = -step(h, vec4(0.0));
  vec4 a0 = b0.xzyw + s0.xzyw * sh.xxyy;
  vec4 a1 = b1.xzyw + s1.xzyw * sh.zzww;
  vec3 p0 = vec3(a0.xy, h.x);
  vec3 p1 = vec3(a0.zw, h.y);
  vec3 p2 = vec3(a1.xy, h.z);
  vec3 p3 = vec3(a1.zw, h.w);
  vec4 norm = taylorInvSqrt(vec4(dot(p0, p0), dot(p1, p1), dot(p2, p2), dot(p3, p3)));
  p0 *= norm.x; p1 *= norm.y; p2 *= norm.z; p3 *= norm.w;
  vec4 m = max(0.5 - vec4(dot(x0, x0), dot(x1, x1), dot(x2, x2), dot(x3, x3)), 0.0);
  m = m * m;
  return 105.0 * dot(m * m, vec4(dot(p0, x0), dot(p1, x1), dot(p2, x2), dot(p3, x3)));
}
// Cheap curl: gradients of three offset noise fields, crossed.
vec3 curl(vec3 p) {
  const float e = 0.1;
  vec3 dx = vec3(e, 0.0, 0.0), dy = vec3(0.0, e, 0.0), dz = vec3(0.0, 0.0, e);
  vec3 q = p + vec3(31.4, 17.7, 5.3);
  vec3 s = p + vec3(-11.2, 43.1, 27.9);
  float a = snoise(p + dy) - snoise(p - dy);
  float b = snoise(p + dz) - snoise(p - dz);
  float c = snoise(q + dz) - snoise(q - dz);
  float d = snoise(q + dx) - snoise(q - dx);
  float f = snoise(s + dx) - snoise(s - dx);
  float g = snoise(s + dy) - snoise(s - dy);
  return vec3(a - b, c - d, f - g) / (2.0 * e);
}
`;

/** Velocity: spring home, turbulence, the cursor's eraser field, and the trail it leaves. */
export const velocityShader = /* glsl */ `
uniform sampler2D tTargetA;
uniform sampler2D tTargetB;
uniform mat4 uMatA;
uniform mat4 uMatB;
uniform float uMix;
uniform float uTime;
uniform float uDelta;
uniform float uSpring;
uniform float uTurb;
uniform float uScatter;
uniform float uPulse;
uniform vec3 uRayO;
uniform vec3 uRayD;
uniform vec3 uMouseV;
uniform float uMouseR;
uniform float uMouseF;
uniform mat4 uViewProj;
uniform vec4 uTrail[16];
uniform float uAspect;
${noise}

void main() {
  vec2 uv = gl_FragCoord.xy / resolution.xy;
  vec4 p = texture2D(texturePosition, uv);
  vec4 v = texture2D(textureVelocity, uv);
  float seed = p.w;

  // Each grain leaves on its own beat, so a morph pours rather than jumps.
  float m = smoothstep(seed * 0.55, seed * 0.55 + 0.45, uMix);
  vec3 ta = (uMatA * vec4(texture2D(tTargetA, uv).xyz, 1.0)).xyz;
  vec3 tb = (uMatB * vec4(texture2D(tTargetB, uv).xyz, 1.0)).xyz;
  vec3 target = mix(ta, tb, m);
  float travel = sin(m * 3.14159);

  // Where the cursor has been: dust there lets go, then slowly heals.
  vec4 clip = uViewProj * vec4(p.xyz, 1.0);
  vec2 ndc = clip.xy / max(clip.w, 0.001);
  float trail = 0.0;
  for (int i = 0; i < 16; i++) {
    vec4 t = uTrail[i];
    if (t.w <= 0.0) continue;
    vec2 d = (ndc - t.xy) * vec2(uAspect, 1.0);
    trail = max(trail, (1.0 - smoothstep(0.0, t.w, length(d))) * t.z);
  }

  // Torn grains barely remember where home is until the tear heals.
  float hold = uSpring * (1.0 - uScatter) * (1.0 - smoothstep(0.0, 0.35, trail) * 0.97) * (1.0 - uPulse);
  vec3 acc = (target - p.xyz) * hold;

  float amp = uTurb * (0.3 + travel * 2.2 + uScatter * 1.6 + uPulse * 5.0) + trail * 1.1;
  acc += curl(p.xyz * 0.32 + vec3(0.0, uTime * 0.04, seed * 0.5)) * amp;

  // The eraser: a soft cylinder along the cursor ray. It shoves grains outward,
  // drags them with the stroke, and spins them round it like a small storm.
  vec3 w = p.xyz - uRayO;
  vec3 closest = uRayO + uRayD * dot(w, uRayD);
  vec3 away = p.xyz - closest;
  float dist = length(away);
  vec3 dir = away / max(dist, 0.001);
  float f = 1.0 - smoothstep(0.0, uMouseR, dist);
  f *= f;
  float grit = 0.6 + 0.8 * fract(seed * 31.7);
  acc += dir * f * uMouseF * grit;
  acc += uMouseV * f * 5.0 * grit;
  acc += cross(uRayD, dir) * f * uMouseF * 0.6;

  // Critically damped-ish: drag scales with the spring so every scene settles cleanly.
  float drag = 2.0 * sqrt(max(hold, 0.0)) + 1.6 + uScatter * 0.6;
  v.xyz = v.xyz * exp(-drag * uDelta) + acc * uDelta;
  gl_FragColor = vec4(v.xyz, v.w);
}
`;

export const positionShader = /* glsl */ `
uniform float uDelta;
void main() {
  vec2 uv = gl_FragCoord.xy / resolution.xy;
  vec4 p = texture2D(texturePosition, uv);
  vec4 v = texture2D(textureVelocity, uv);
  gl_FragColor = vec4(p.xyz + v.xyz * uDelta, p.w);
}
`;

export const pointsVertex = /* glsl */ `
attribute vec2 ref;
uniform sampler2D tPos;
uniform sampler2D tVel;
uniform float uSize;
uniform float uPixel;
uniform float uFocus;
uniform float uNight;
uniform float uAccent;
uniform float uDensity;
uniform vec3 uInk;
uniform vec3 uLight;
uniform vec3 uBlue;
varying vec3 vColor;
varying float vAlpha;

void main() {
  vec4 p = texture2D(tPos, ref);
  vec3 vel = texture2D(tVel, ref).xyz;
  vec4 mv = viewMatrix * vec4(p.xyz, 1.0);
  gl_Position = projectionMatrix * mv;

  float seed = p.w;
  float depth = -mv.z;
  // Depth of field: grains off the focal plane grow and fade.
  float coc = clamp(abs(depth - uFocus) * 0.16, 0.0, 2.2);
  float grain = 0.55 + pow(fract(seed * 91.7), 3.0) * 1.9;
  float size = uSize * grain * (1.0 + coc * 1.6);

  float speed = length(vel);
  float lit = smoothstep(0.6, 5.0, speed);
  float blue = step(1.0 - uAccent, fract(seed * 13.37)) + lit * 0.6;
  vec3 base = mix(uInk, uLight, uNight);
  vColor = mix(base, uBlue, clamp(blue, 0.0, 1.0));
  // Charcoal on paper needs more body than light in the dark.
  size *= mix(1.45, 1.0, uNight);
  gl_PointSize = clamp(size * uPixel * (10.0 / depth), 1.0, 26.0 * uPixel);
  float a = mix(0.95, 0.9, uNight) / (1.0 + coc * coc * 1.8);
  // Thinning: grains drop out one by one as density falls, so it never pops.
  float keep = 1.0 - smoothstep(uDensity - 0.04, uDensity, fract(seed * 53.17));
  gl_PointSize *= keep;
  vAlpha = a * keep * (0.55 + 0.45 * fract(seed * 7.1));
}
`;

export const pointsFragment = /* glsl */ `
varying vec3 vColor;
varying float vAlpha;
void main() {
  vec2 c = gl_PointCoord - 0.5;
  float d = length(c);
  float a = smoothstep(0.5, 0.18, d) * vAlpha;
  if (a < 0.01) discard;
  gl_FragColor = vec4(vColor, a);
}
`;

/** Backdrop: day is flat paper with a faint vignette; night is deep graphite with a blue haze. */
export const backdropFragment = /* glsl */ `
uniform float uNight;
uniform float uTime;
uniform vec2 uRes;
uniform vec3 uPaper;
uniform vec3 uGraphite;
uniform vec3 uHaze;
varying vec2 vUv;
void main() {
  vec2 uv = vUv;
  vec2 q = (uv - 0.5) * vec2(uRes.x / uRes.y, 1.0);
  float vig = smoothstep(1.2, 0.2, length(q));
  vec3 day = uPaper * (0.94 + 0.06 * vig);
  float glow = smoothstep(0.9, 0.0, length(q - vec2(0.15 * sin(uTime * 0.05), -0.25)));
  vec3 night = uGraphite + uHaze * glow * 0.22;
  night *= 0.7 + 0.3 * vig;
  gl_FragColor = vec4(mix(day, night, uNight), 1.0);
}
`;

export const backdropVertex = /* glsl */ `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = vec4(position.xy, 0.9999, 1.0);
}
`;
