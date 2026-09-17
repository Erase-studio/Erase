/**
 * The one 3D eraser that lives across the whole site.
 * Anything that wants it on screen calls point() every frame it's in use, in
 * viewport pixels. Stop calling and it lifts off the page. crumbs() sheds rubber.
 */

type CrumbBurst = { x: number; y: number; n: number; dx: number };

const state = {
  x: 0,
  y: 0,
  t: -1e9,
  pressure: 0,
  size: 1,
  queue: [] as CrumbBurst[],
};

export const eraserBus = {
  state,
  point(x: number, y: number, pressure = 0.6, size = 1) {
    state.x = x;
    state.y = y;
    state.t = performance.now();
    state.pressure = pressure;
    state.size = size;
  },
  crumbs(x: number, y: number, n = 3, dx = 0) {
    if (state.queue.length < 80) state.queue.push({ x, y, n, dx });
  },
  /**
   * Ride the edge of a full-viewport slanted band, where the edge sits at a% on
   * the top and (a − 25)% on the bottom. Scrubs up and down as it travels.
   */
  band(a: number, size = 1.5) {
    if (typeof window === "undefined" || a < -2 || a > 122) return;
    const f = 0.5 + 0.36 * Math.sin(a * 0.32);
    const x = ((a - 25 * f) / 100) * window.innerWidth;
    const y = f * window.innerHeight;
    const dx = x - state.x;
    this.point(x, y, 1, size);
    if (Math.abs(dx) > 1) this.crumbs(x, y, 2, Math.sign(dx));
  },
  active() {
    return performance.now() - state.t < 150;
  },
  ready() {
    return typeof document !== "undefined" && document.documentElement.dataset.stage === "ready";
  },
};
