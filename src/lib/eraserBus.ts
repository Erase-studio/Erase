/**
 * The one 3D eraser that lives across the whole site.
 * Anything that wants it on screen calls point() every frame it's in use, in
 * viewport pixels. Stop calling and it lifts off the page. crumbs() sheds rubber.
 */

type CrumbBurst = { x: number; y: number; n: number; dx: number; dy?: number };

const state = {
  x: 0,
  y: 0,
  t: -1e9,
  pressure: 0,
  size: 1,
  queue: [] as CrumbBurst[],
};

/**
 * A scrubbing hand, 0 → 1 across the page: never a clean sine. Two rhythms that
 * drift in and out of phase, so each pass is a slightly different height.
 */
export function scrub(t: number, strokes = 9) {
  const a = t * Math.PI * strokes;
  return 0.5 + 0.34 * Math.sin(a) + 0.07 * Math.sin(a * 0.37 + 1.3) + 0.04 * Math.sin(a * 2.3 + 0.6);
}

export const eraserBus = {
  state,
  point(x: number, y: number, pressure = 0.6, size = 1) {
    state.x = x;
    state.y = y;
    state.t = performance.now();
    state.pressure = pressure;
    state.size = size;
  },
  /** dx/dy: direction the rubber is travelling (any length); 0 means "use its velocity". */
  crumbs(x: number, y: number, n = 3, dx = 0, dy = 0) {
    if (state.queue.length < 80) state.queue.push({ x, y, n, dx, dy });
  },
  /**
   * Ride the edge of a full-viewport slanted band, where the edge sits at a% on
   * the top and (a − 25)% on the bottom. Scrubs up and down as it travels.
   */
  band(a: number, size = 1.5) {
    if (typeof window === "undefined" || a < -2 || a > 122) return;
    const f = scrub(a / 100, 11.5);
    const x = ((a - 25 * f) / 100) * window.innerWidth;
    const y = f * window.innerHeight;
    const dx = x - state.x;
    const dy = y - state.y;
    this.point(x, y, 1, size);
    const d = Math.hypot(dx, dy);
    if (d > 1.5 && d < 400) this.crumbs(x, y, d > 14 ? 2 : 1, dx, dy);
  },
  active() {
    return performance.now() - state.t < 150;
  },
  ready() {
    return typeof document !== "undefined" && document.documentElement.dataset.stage === "ready";
  },
};
