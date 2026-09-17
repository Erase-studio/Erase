import type { SceneId } from "./scenes";

/**
 * Shared, framework-free state between the DOM and the WebGL world.
 * Components write; the world reads once per frame. Nothing here triggers React renders.
 */
export const world = {
  /** Blend from scene a to scene b by mix (0 → 1). */
  a: "quiet" as SceneId,
  b: "quiet" as SceneId,
  mix: 0,
  /** 0 → 1: everything lets go (page transitions, loader). */
  pulse: 0,
  /** Pointer in normalised device coordinates. */
  pointer: { x: 0, y: 0, t: -1e9 },
  /** Current night amount, written by the world for the DOM to follow. */
  night: 0,
  ready: false,
  /** Called by the world when it has drawn its first frame. */
  onReady: new Set<() => void>(),
  /** Called when day/night flips, so the DOM can switch its palette. */
  onNight: new Set<(night: boolean) => void>(),
};

export function setScene(a: SceneId, b: SceneId = a, mix = 0) {
  world.a = a;
  world.b = b;
  world.mix = mix;
}
