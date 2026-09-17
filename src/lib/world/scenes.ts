import type { ShapeId } from "./shapes";

/**
 * A scene is a pose of the whole world: what the dust forms, where the camera is,
 * day or night. Sections on a page name a scene; scrolling blends between them.
 */
export type Scene = {
  shape: ShapeId;
  cam: [number, number, number];
  look: [number, number, number];
  /** Object rotation (radians) applied to the target shape. */
  rot: [number, number, number];
  /** Extra continuous rotation around y, rad/s. */
  spin: number;
  scale: number;
  /** 0 = paper and charcoal, 1 = night and light. */
  night: number;
  /** How hard dust is pulled home. */
  spring: number;
  /** Curl-noise turbulence. */
  turb: number;
  /** 0 → 1: let go of the shape entirely. */
  scatter: number;
  size: number;
  /** Share of the brand blue in the dust. */
  accent: number;
  /** Share of grains drawn: quiet sections thin the dust out behind reading. */
  density: number;
};

const base: Scene = {
  shape: "cloud",
  cam: [0, 0, 10],
  look: [0, 0, 0],
  rot: [0, 0, 0],
  spin: 0,
  scale: 1,
  night: 0,
  spring: 16,
  turb: 0.35,
  scatter: 0,
  size: 1,
  accent: 0.15,
  density: 1,
};

const s = (o: Partial<Scene>): Scene => ({ ...base, ...o });

export const scenes = {
  /** The generic website, floating in the dark hero window. */
  template: s({ shape: "template", scale: 0.74, cam: [0.3, -0.75, 9.4], look: [0.3, -0.55, 0], rot: [-0.08, 0.18, 0.02], night: 1, spring: 22, turb: 0.12, size: 1, accent: 0.12 }),
  /** Blown apart and flown through. */
  dust: s({ shape: "cloud", cam: [0, 0, 5.5], rot: [0, 0.6, 0], spin: 0.05, night: 1, spring: 2, turb: 1.4, scatter: 0.55, size: 1.25, accent: 0.3 }),
  /** Dust gathers into one idea. */
  form: s({ shape: "form", cam: [-2.4, 0.2, 9], look: [-2.4, 0, 0], rot: [0.5, 0, 0.3], spin: 0.12, night: 0, spring: 14, turb: 0.4, size: 1, accent: 0.2 }),
  /** The ring the work floats inside. */
  work: s({ shape: "ring", cam: [0, 1.6, 9.5], look: [0, -0.2, 0], rot: [0.12, 0, 0], spin: 0.06, night: 1, spring: 10, turb: 0.45, size: 1.1, accent: 0.45 }),
  "svc-0": s({ shape: "sphere", cam: [-2.8, 0, 9.5], look: [-2.8, 0, 0], spin: 0.15, spring: 18, turb: 0.25 }),
  "svc-1": s({ shape: "grid", cam: [-2.8, 2.2, 9.5], look: [-2.8, 0, 0], rot: [0.35, 0.5, 0], spin: 0.08, spring: 18, turb: 0.2 }),
  "svc-2": s({ shape: "bloom", cam: [-2.8, 2.6, 8.5], look: [-2.8, 0, 0], rot: [0.25, 0, 0], spin: 0.1, spring: 18, turb: 0.25 }),
  "svc-3": s({ shape: "knot", scale: 0.85, cam: [-2.8, 0, 9.5], look: [-2.8, 0, 0], rot: [0.3, 0, 0], spin: 0.18, spring: 18, turb: 0.2, accent: 0.3 }),
  "svc-4": s({ shape: "lattice", cam: [-2.8, 1.2, 9.5], look: [-2.8, 0, 0], scale: 0.85, rot: [0.5, 0.6, 0], spin: 0.12, spring: 18, turb: 0.15 }),
  "svc-5": s({ shape: "helix", cam: [-2.8, 0, 9.5], look: [-2.8, 0, 0], rot: [0, 0, -0.2], scale: 0.72, spin: 0.25, spring: 18, turb: 0.2 }),
  process: s({ shape: "path", scale: 0.82, cam: [0, -0.7, 10], look: [0, -0.5, 0], rot: [0.15, -0.1, 0], spring: 16, turb: 0.3, accent: 0.25 }),
  cta: s({ shape: "vortex", scale: 0.72, cam: [0, 1.2, 8.5], look: [0, -0.2, 0], rot: [0.2, 0, 0], spin: 0.6, night: 1, spring: 12, turb: 0.35, size: 1.1, accent: 0.55 }),
  wordmark: s({ shape: "wordmark", scale: 1.3, cam: [0, 0, 9.5], night: 1, spring: 20, turb: 0.15, accent: 0.35 }),
  quiet: s({ shape: "cloud", cam: [0, 0, 10], spin: 0.02, spring: 3, turb: 0.5, size: 0.8, accent: 0.12, density: 0.16 }),
  quietNight: s({ shape: "cloud", cam: [0, 0, 10], spin: 0.02, night: 1, spring: 3, turb: 0.5, size: 0.9, accent: 0.3, density: 0.45 }),
  studio: s({ shape: "form", cam: [-2.6, 0, 9], look: [-2.6, 0, 0], rot: [0.5, 0, 0.3], spin: 0.1, spring: 14, turb: 0.4 }),
  contact: s({ shape: "vortex", scale: 0.7, cam: [-2.8, 1, 9], look: [-2.8, -0.2, 0], rot: [0.2, 0, 0], spin: 0.5, spring: 12, turb: 0.35, accent: 0.3 }),
  line: s({ shape: "line", cam: [0, 0, 8], night: 1, spring: 30, turb: 0.05, accent: 0.2 }),
} satisfies Record<string, Scene>;

export type SceneId = keyof typeof scenes;
