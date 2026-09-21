"use client";

import type { Sound as Engine, SceneName, Kind } from "./soundEngine";

export type { SceneName, Kind };

/**
 * The switch, without the studio behind it.
 *
 * The score is a thousand lines of synthesis and it can't make a sound until
 * the visitor has touched the page — so none of it is in the first download.
 * This holds the on/off state (which the toggle needs immediately), and the
 * moment there's a real gesture, or someone asks for sound, the engine is
 * fetched and everything routes straight through to it.
 *
 * Calls made before then are dropped, which is exactly what a browser would
 * have done with them anyway.
 */

const KEY = "erase:sound";

let engine: Engine | null = null;
let loading: Promise<Engine> | null = null;
/** The room the visitor is in, kept so the score starts in the right key. */
let lastScene: SceneName | null = null;
const listeners = new Set<(on: boolean) => void>();

let on = false;
if (typeof window !== "undefined") {
  try {
    on = localStorage.getItem(KEY) !== "0";
  } catch {}
}

function load() {
  loading ??= import("./soundEngine").then(({ Sound }) => {
    const e = new Sound();
    engine = e;
    e.subscribe((v) => {
      on = v;
      listeners.forEach((f) => f(v));
    });
    if (lastScene) e.scene(lastScene);
    // If the visitor has already touched the page, this is allowed to start.
    const ua = (navigator as Navigator & { userActivation?: { hasBeenActive: boolean } }).userActivation;
    if (!ua || ua.hasBeenActive) e.wake();
    return e;
  });
  return loading;
}

// Someone who left the sound on gets the engine fetched as soon as the page is
// idle, so it is already listening when their first tap arrives — audio has
// to start inside that tap, and on phones there is no second chance.
// Anyone else only fetches it if they ask for sound.
if (typeof window !== "undefined" && on) {
  const idle = window.requestIdleCallback ?? ((fn: () => void) => window.setTimeout(fn, 1200));
  idle(() => void load(), { timeout: 3000 });
  const early = () => {
    window.removeEventListener("pointerdown", early);
    window.removeEventListener("keydown", early);
    void load();
  };
  window.addEventListener("pointerdown", early, { passive: true });
  window.addEventListener("keydown", early);
}

/** Forward to the engine if it's here; otherwise let it go. */
const to =
  <K extends keyof Engine>(name: K) =>
  (...args: Engine[K] extends (...a: infer A) => unknown ? A : never) => {
    const e = engine;
    if (e) (e[name] as (...a: unknown[]) => unknown)(...args);
  };

export const sound = {
  get on() {
    return on;
  },

  subscribe(fn: (on: boolean) => void) {
    listeners.add(fn);
    fn(on);
    return () => void listeners.delete(fn);
  },

  toggle() {
    // Switched on but silent (the browser was still waiting for a tap): this
    // tap is it. Start the sound instead of turning it off.
    if (on && engine && (!engine.running || performance.now() - engine.wokeAt < 800)) {
      engine.wake();
      return;
    }
    sound.set(!on);
  },

  /** Turning it on is itself a gesture, so this is a fine moment to load. */
  set(next: boolean) {
    if (engine) return engine.set(next);
    on = next;
    try {
      localStorage.setItem(KEY, next ? "1" : "0");
    } catch {}
    listeners.forEach((f) => f(next));
    if (next) void load().then((e) => e.set(true));
  },

  scene(name: SceneName) {
    lastScene = name;
    engine?.scene(name);
  },
  motion: to("motion"),
  impact: to("impact"),
  whoosh: to("whoosh"),
  crinkle: to("crinkle"),
  pageTurn: to("pageTurn"),
  paperFlip: to("paperFlip"),
  write: to("write"),
  strike: to("strike"),
  rub: to("rub"),
  hover: to("hover"),
  press: to("press"),
  tick: to("tick"),
  welcome: to("welcome"),
  arrive: to("arrive"),
  pop: to("pop"),
  dive: to("dive"),
  crackle: to("crackle"),
  reveal: to("reveal"),
  eraseHit: to("eraseHit"),
};
