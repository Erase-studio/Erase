import * as THREE from "three";

/**
 * The room everything on this site is lit by.
 *
 * three's own RoomEnvironment builds a scene of two dozen boxes and renders it
 * through the PMREM chain, which cost about 0.7 s of blocked main thread every
 * time the stage woke up — by a distance the most expensive thing the site did.
 * This is the same room written down instead of built: a 64×32 equirectangular
 * sketch of a soft white ceiling box, grey walls and a dark floor, blurred into
 * a light probe. Same look on a clearcoat eraser, a fraction of the work.
 */

const W = 64;
const H = 32;

/** A soft round light at (u, v) of the sphere, in lat/long space. */
function lamp(u: number, v: number, cu: number, cv: number, r: number) {
  // Wrap the long way round so a lamp near the seam still reads as round.
  let du = Math.abs(u - cu);
  if (du > 0.5) du = 1 - du;
  // Longitude bunches up at the poles; widen it so lamps stay circular.
  du *= Math.max(0.25, Math.sin(v * Math.PI));
  const d = Math.hypot(du, (v - cv) * 0.9) / r;
  return Math.exp(-d * d * 2.4);
}

export function studioEnvironment(pmrem: THREE.PMREMGenerator) {
  const data = new Float32Array(W * H * 4);
  for (let y = 0; y < H; y++) {
    const v = (y + 0.5) / H; // 0 underfoot, 1 overhead
    for (let x = 0; x < W; x++) {
      const u = (x + 0.5) / W;
      // Floor to ceiling: a dark deck, a grey horizon, a bright lid.
      const room = v < 0.5 ? 0.05 + v * 0.5 : 0.3 + (v - 0.5) * 1.5;
      // The key: a big softbox high and to the left, the way the pencil lies.
      const key = lamp(u, v, 0.66, 0.9, 0.34) * 5.2;
      // A cool bounce off the far wall, so the shadow side isn't dead.
      const fill = lamp(u, v, 0.16, 0.56, 0.4) * 0.5;
      const lit = room + key + fill;
      const i = (y * W + x) * 4;
      // Warm in the light, faintly blue in the shade: paper under a lamp.
      data[i] = lit * 1.02;
      data[i + 1] = lit;
      data[i + 2] = lit * (1.0 + 0.1 / (1 + key));
      data[i + 3] = 1;
    }
  }
  const tex = new THREE.DataTexture(data, W, H, THREE.RGBAFormat, THREE.FloatType);
  tex.mapping = THREE.EquirectangularReflectionMapping;
  tex.magFilter = THREE.LinearFilter;
  tex.minFilter = THREE.LinearFilter;
  tex.needsUpdate = true;
  const rt = pmrem.fromEquirectangular(tex);
  tex.dispose();
  return rt.texture;
}
