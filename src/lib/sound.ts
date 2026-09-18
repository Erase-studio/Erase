/**
 * The site's sound, synthesized live with Web Audio: no files to download.
 * On by default (browsers start it on the first click or key; the loader's
 * "Enter with sound" is that click). Turning it off is remembered.
 *
 * Everything is in one key (D major, pentatonic on top), so the whole site
 * plays as one piece of music:
 *
 *   Score   a soft pad that changes chord as you move between sections, with
 *           sparse bell notes; scrolling brightens it and brings more notes.
 *   Hero    every collision is heard when and as hard as it happens, and
 *           sounds like what hit: rubber on rubber is a dull thud, a pencil
 *           is a hollow woody tock (pencil on pencil clacks), a cardboard
 *           sleeve adds a papery tap. Not musical: physical.
 *   Paper   crinkle as the template is crumpled, a soft whoosh when it's
 *           thrown; posters rustle as they peel and flick as they land.
 *   Pencil  a faint graphite-on-paper scratch while the process sheet draws.
 *   Rubber  erasing is soft rubber friction with the odd crumb, never loud.
 *   Dive    its own pad that opens as the window grows; the wireframes ring
 *           in as they're drawn; a warm rising air in flight with soft crumbs
 *           as templates go; a real rub-through hit on every cliché; minor
 *           resolving to major at the end, stickers popping.
 *
 * The mix goes through a warm room reverb, a gentle high-shelf cut (nothing
 * shrill), a glue compressor and a limiter.
 */

type Listener = (on: boolean) => void;
export type SceneName = "hero" | "statement" | "crumple" | "work" | "services" | "process" | "dive" | "end" | "page";

const KEY = "erase:sound";
const hz = (midi: number) => 440 * 2 ** ((midi - 69) / 12);

// D major pentatonic (D E F# A B) from D4 up two octaves: every chord below sits under it.
const PENTA = [62, 64, 66, 69, 71, 74, 76, 78, 81, 83, 86];

/** Pad voicings (MIDI), how bright, how many notes. */
const SCENES: Record<SceneName, { pad: number[]; bright: number; rate: number; level: number }> = {
  hero: { pad: [38, 45, 52, 54, 61], bright: 0.5, rate: 0.5, level: 1 }, // Dmaj9
  statement: { pad: [35, 42, 50, 54, 61], bright: 0.4, rate: 0.35, level: 0.9 }, // Bm(add9)
  crumple: { pad: [31, 38, 47, 54, 61], bright: 0.35, rate: 0.3, level: 0.9 }, // Gmaj7(#11)
  work: { pad: [40, 47, 50, 54, 57], bright: 0.55, rate: 0.55, level: 1 }, // Em11
  services: { pad: [33, 40, 49, 54, 59], bright: 0.5, rate: 0.45, level: 0.9 }, // A6/9
  process: { pad: [38, 45, 50, 54, 57], bright: 0.45, rate: 0.4, level: 0.9 }, // D6
  dive: { pad: [38, 45, 50, 54, 57], bright: 0.3, rate: 0, level: 0 }, // the dive plays its own
  end: { pad: [31, 43, 50, 54, 59], bright: 0.6, rate: 0.5, level: 1 }, // G6/9
  page: { pad: [38, 45, 52, 57, 62], bright: 0.45, rate: 0.35, level: 0.85 }, // Dsus2
};

// The dive's own pad: D minor 9, the F and C lift to F# and C# at the end.
const DIVE = [73.42, 110, 174.61, 261.63, 329.63];
const DIVE_END = [73.42, 110, 185.0, 277.18, 329.63];

type Bus = { filter: BiquadFilterNode; gain: GainNode; last: number };
export type Kind = "eraser" | "sleeved" | "pencil" | null;

class Sound {
  on = false;
  private listeners = new Set<Listener>();
  private ctx: AudioContext | null = null;
  private master!: GainNode;
  private verb!: GainNode;
  private noise!: AudioBuffer;
  // Score
  private bed: { osc: OscillatorNode[][]; filter: BiquadFilterNode; gain: GainNode; sub: OscillatorNode } | null = null;
  private sceneName: SceneName = "hero";
  private motionV = 0;
  private lastNote = 4;
  private nextNoteAt = 0;
  // Dive
  private dpad: { osc: OscillatorNode[]; filter: BiquadFilterNode; gain: GainNode } | null = null;
  private wind!: { filter: BiquadFilterNode; gain: GainNode };
  private sub!: GainNode;
  private lastDive = 0;
  private resolved = false;
  private crackleBudget = 0;
  // Textures
  private rubBus!: Bus;
  private writeBus!: Bus;
  private lastReveal = 0;
  // Rate limits
  private knockBudget = 8;
  private lastKnockRefill = 0;
  private lastHover = 0;
  private watchdog = 0;

  constructor() {
    if (typeof window === "undefined") return;
    try {
      this.on = localStorage.getItem(KEY) !== "0";
    } catch {}
    if (this.on) {
      // Browsers only let audio start from a gesture: wait for the first one.
      const wake = () => {
        window.removeEventListener("pointerdown", wake);
        window.removeEventListener("keydown", wake);
        if (this.on) this.start();
      };
      window.addEventListener("pointerdown", wake);
      window.addEventListener("keydown", wake);
    }
    document.addEventListener("visibilitychange", () => {
      if (!this.ctx) return;
      if (document.hidden) this.ctx.suspend();
      else if (this.on) this.ctx.resume();
    });
  }

  subscribe(fn: Listener) {
    this.listeners.add(fn);
    fn(this.on);
    return () => void this.listeners.delete(fn);
  }

  toggle() {
    this.set(!this.on);
  }

  set(on: boolean) {
    this.on = on;
    try {
      localStorage.setItem(KEY, on ? "1" : "0");
    } catch {}
    this.listeners.forEach((f) => f(on));
    if (on) {
      this.start();
      this.tick();
    } else if (this.ctx) {
      const t = this.ctx.currentTime;
      this.master.gain.cancelScheduledValues(t);
      this.master.gain.setTargetAtTime(0, t, 0.12);
      window.setTimeout(() => !this.on && this.ctx?.suspend(), 600);
    }
  }

  private get live() {
    return this.on && !!this.ctx && this.ctx.state === "running";
  }

  // ─── Graph ────────────────────────────────────────────────────────────────

  private start() {
    if (!this.ctx) this.build();
    const ctx = this.ctx!;
    ctx.resume();
    const t = ctx.currentTime;
    this.master.gain.cancelScheduledValues(t);
    this.master.gain.setTargetAtTime(0.85, t, 0.25);
  }

  private build() {
    const ctx = new AudioContext({ latencyHint: "interactive" });
    this.ctx = ctx;

    // Master: warm shelf, glue, limiter.
    const limiter = ctx.createDynamicsCompressor();
    limiter.threshold.value = -2;
    limiter.knee.value = 0;
    limiter.ratio.value = 20;
    limiter.attack.value = 0.002;
    limiter.release.value = 0.12;
    limiter.connect(ctx.destination);
    const glue = ctx.createDynamicsCompressor();
    glue.threshold.value = -20;
    glue.knee.value = 18;
    glue.ratio.value = 2.5;
    glue.attack.value = 0.012;
    glue.release.value = 0.25;
    glue.connect(limiter);
    const shelf = ctx.createBiquadFilter();
    shelf.type = "highshelf";
    shelf.frequency.value = 5500;
    shelf.gain.value = -6;
    const top = ctx.createBiquadFilter();
    top.type = "lowpass";
    top.frequency.value = 11000;
    shelf.connect(top).connect(glue);
    this.master = ctx.createGain();
    this.master.gain.value = 0;
    this.master.connect(shelf);

    // Noise, shared by every texture.
    this.noise = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
    const nd = this.noise.getChannelData(0);
    for (let i = 0; i < nd.length; i++) nd[i] = Math.random() * 2 - 1;

    // Room: stereo decaying noise that darkens as it fades, after a short pre-delay.
    const conv = ctx.createConvolver();
    const len = Math.floor(ctx.sampleRate * 3.4);
    const pre = Math.floor(ctx.sampleRate * 0.02);
    const ir = ctx.createBuffer(2, len, ctx.sampleRate);
    for (let c = 0; c < 2; c++) {
      const ch = ir.getChannelData(c);
      let y = 0;
      for (let i = pre; i < len; i++) {
        const k = (i - pre) / (len - pre);
        const a = 0.9 - k * 0.78; // the room loses its highs as it rings out
        y += a * (Math.random() * 2 - 1 - y);
        ch[i] = y * (1 - k) ** 2.6;
      }
    }
    conv.buffer = ir;
    const verbIn = ctx.createBiquadFilter();
    verbIn.type = "highpass";
    verbIn.frequency.value = 180;
    this.verb = ctx.createGain();
    this.verb.gain.value = 0.42;
    this.verb.connect(verbIn).connect(conv).connect(this.master);

    this.buildScore();
    this.buildDive();

    // Rubbing: soft, low-mid rubber friction. No squeak, no hiss.
    this.rubBus = { ...this.bus([["highpass", 260, 0.7], ["bandpass", 700, 0.55], ["lowpass", 1600, 0.7]]), last: 0 };
    // Writing: graphite on paper, fine and quiet.
    this.writeBus = { ...this.bus([["bandpass", 2400, 0.8], ["lowpass", 5200, 0.7]]), last: 0 };

    // Anything that stops being driven fades out; the score keeps its own time.
    this.watchdog = window.setInterval(() => this.heartbeat(), 110);
  }

  /** Looping noise through a chain of filters into a silent gain: a texture driven every frame. */
  private bus(chain: [BiquadFilterType, number, number][]) {
    const ctx = this.ctx!;
    let head: AudioNode = this.loop();
    let filter!: BiquadFilterNode;
    chain.forEach(([type, f, q]) => {
      const b = ctx.createBiquadFilter();
      b.type = type;
      b.frequency.value = f;
      b.Q.value = q;
      head.connect(b);
      head = b;
      if (!filter && type === "bandpass") filter = b; // the one the texture steers
    });
    const gain = ctx.createGain();
    gain.gain.value = 0;
    head.connect(gain).connect(this.master);
    return { filter, gain };
  }

  private loop() {
    const s = this.ctx!.createBufferSource();
    s.buffer = this.noise;
    s.loop = true;
    s.start(0, Math.random() * 1.9);
    return s;
  }

  private heartbeat() {
    const ctx = this.ctx!;
    const now = performance.now();
    const t = ctx.currentTime;
    if (now - this.lastDive > 260 && this.dpad) {
      this.dpad.gain.gain.setTargetAtTime(0, t, 0.35);
      this.wind.gain.gain.setTargetAtTime(0, t, 0.2);
      this.sub.gain.setTargetAtTime(0, t, 0.3);
    }
    if (now - this.rubBus.last > 120) this.rubBus.gain.gain.setTargetAtTime(0, t, 0.05);
    if (now - this.writeBus.last > 90) this.writeBus.gain.gain.setTargetAtTime(0, t, 0.04);
    this.motionV *= 0.9;
    this.updateScore();
  }

  // ─── The score ────────────────────────────────────────────────────────────

  private buildScore() {
    const ctx = this.ctx!;
    const filter = ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.value = 700;
    filter.Q.value = 0.5;
    const gain = ctx.createGain();
    gain.gain.value = 0;
    filter.connect(gain);
    gain.connect(this.master);
    gain.connect(this.verb);
    const chord = SCENES.hero.pad;
    // Each voice: a pair of detuned saws (warmth) and a triangle (body), breathing slowly.
    const osc = chord.map((m, i) => {
      const vg = ctx.createGain();
      vg.gain.value = 0.8;
      const lfo = ctx.createOscillator();
      lfo.frequency.value = 0.05 + i * 0.023;
      const la = ctx.createGain();
      la.gain.value = 0.25;
      lfo.connect(la).connect(vg.gain);
      lfo.start();
      vg.connect(filter);
      const pair: OscillatorNode[] = [];
      for (const [type, det, lvl] of [["sawtooth", -9, 0.035], ["sawtooth", 9, 0.035], ["triangle", 0, 0.1]] as const) {
        const o = ctx.createOscillator();
        o.type = type;
        o.frequency.value = hz(m);
        o.detune.value = det;
        const g = ctx.createGain();
        g.gain.value = lvl * (i === 0 ? 1.3 : 1);
        o.connect(g).connect(vg);
        o.start();
        pair.push(o);
      }
      return pair;
    });
    // A little warmth an octave under the root.
    const sub = ctx.createOscillator();
    sub.frequency.value = hz(chord[0] - 12);
    const sg = ctx.createGain();
    sg.gain.value = 0.05;
    sub.connect(sg).connect(gain);
    sub.start();
    this.bed = { osc, filter, gain, sub };
    // Fade the score in.
    gain.gain.setValueAtTime(0, ctx.currentTime);
  }

  /** Which part of the site is on screen. The chord moves there over a second or so. */
  scene(name: SceneName) {
    if (name === this.sceneName) return;
    this.sceneName = name;
    if (!this.bed || !this.ctx) return;
    const t = this.ctx.currentTime;
    const s = SCENES[name];
    this.bed.osc.forEach((pair, i) => pair.forEach((o) => o.frequency.setTargetAtTime(hz(s.pad[i]), t, 0.45)));
    this.bed.sub.frequency.setTargetAtTime(hz(s.pad[0] - 12), t, 0.45);
    // Mark the change with one soft note from the new chord.
    if (this.live && s.rate > 0) this.bell(hz(s.pad[s.pad.length - 1] + 12), 0.03, 0.3, 3.2);
  }

  /** How fast the page is moving, 0..1. Brightens the score and brings more notes. */
  motion(v: number) {
    this.motionV = Math.max(this.motionV, Math.min(1, v));
  }

  private updateScore() {
    if (!this.bed || !this.ctx) return;
    const t = this.ctx.currentTime;
    const s = SCENES[this.sceneName];
    const m = this.motionV;
    this.bed.gain.gain.setTargetAtTime(this.live ? 0.1 * s.level * (0.8 + m * 0.3) : 0, t, 0.8);
    this.bed.filter.frequency.setTargetAtTime(420 + s.bright * 900 + m * 1100, t, 0.4);
    // Bell notes: rare when you're reading, more while you move.
    const now = performance.now();
    if (!this.live || s.rate <= 0 || now < this.nextNoteAt) return;
    const gap = (4200 - m * 2600) / (0.4 + s.rate);
    this.nextNoteAt = now + gap * (0.6 + Math.random() * 0.8);
    // Mostly steps, now and then a leap, like someone noodling on a glockenspiel.
    const step = Math.random() < 0.75 ? (Math.random() < 0.5 ? -1 : 1) * (1 + Math.floor(Math.random() * 2)) : Math.floor(Math.random() * 7) - 3;
    this.lastNote = Math.min(PENTA.length - 1, Math.max(0, this.lastNote + step));
    const pan = Math.random() * 1.2 - 0.6;
    this.bell(hz(PENTA[this.lastNote]), 0.022 + m * 0.018, pan, 3.5);
    // Sometimes a quiet echo a fifth below.
    if (Math.random() < 0.25) this.bell(hz(PENTA[this.lastNote] - 7), 0.012, -pan, 3, 0.18);
  }

  // ─── Instruments ─────────────────────────────────────────────────────────

  /** A soft FM bell: glassy at first, warm as it rings. */
  private bell(f: number, vol: number, pan = 0, decay = 2.5, delay = 0) {
    const ctx = this.ctx!;
    const t = ctx.currentTime + delay;
    const car = ctx.createOscillator();
    car.frequency.value = f;
    const mod = ctx.createOscillator();
    mod.frequency.value = f * 3.5;
    const idx = ctx.createGain();
    idx.gain.setValueAtTime(f * 1.4, t);
    idx.gain.exponentialRampToValueAtTime(f * 0.05, t + decay * 0.35);
    mod.connect(idx).connect(car.frequency);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + 0.006);
    g.gain.exponentialRampToValueAtTime(0.0001, t + decay);
    const p = ctx.createStereoPanner();
    p.pan.value = pan;
    car.connect(g).connect(p);
    p.connect(this.master);
    p.connect(this.verb);
    car.start(t);
    mod.start(t);
    car.stop(t + decay + 0.05);
    mod.stop(t + decay + 0.05);
  }

  /** Marimba: a few inharmonic modes and a mallet tap. */
  private marimba(f: number, vol: number, pan = 0) {
    const ctx = this.ctx!;
    const t = ctx.currentTime + Math.random() * 0.008;
    const out = ctx.createStereoPanner();
    out.pan.value = pan;
    out.connect(this.master);
    out.connect(this.verb);
    for (const [ratio, lvl, dec] of [[1, 1, 0.55], [3.93, 0.28, 0.14], [10.7, 0.06, 0.05]] as const) {
      const o = ctx.createOscillator();
      o.frequency.value = f * ratio;
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(vol * lvl, t + 0.003);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dec);
      o.connect(g).connect(out);
      o.start(t);
      o.stop(t + dec + 0.02);
    }
    this.tap(t, 2600, vol * 0.4, out);
  }

  /** Felt on wood: a low tuned thud. */
  private thud(f: number, vol: number, pan = 0) {
    const ctx = this.ctx!;
    const t = ctx.currentTime + Math.random() * 0.008;
    const out = ctx.createStereoPanner();
    out.pan.value = pan;
    out.connect(this.master);
    out.connect(this.verb);
    const o = ctx.createOscillator();
    o.frequency.setValueAtTime(f * 1.5, t);
    o.frequency.exponentialRampToValueAtTime(f, t + 0.02);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + 0.004);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.22);
    o.connect(g).connect(out);
    o.start(t);
    o.stop(t + 0.25);
    this.tap(t, 700, vol * 0.6, out);
  }

  /** A short filtered noise click, the contact itself. */
  private tap(t: number, freq: number, vol: number, out: AudioNode) {
    const ctx = this.ctx!;
    const n = ctx.createBufferSource();
    n.buffer = this.noise;
    const lp = ctx.createBiquadFilter();
    lp.type = "lowpass";
    lp.frequency.value = freq;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(Math.max(0.0002, vol), t + 0.001);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.02);
    n.connect(lp).connect(g).connect(out);
    n.start(t, Math.random() * 1.9, 0.03);
  }

  /** The nearest note of the current chord, within a register (MIDI lo..hi). */
  private chordNote(lo: number, hi: number) {
    const pool: number[] = [];
    for (const m of SCENES[this.sceneName].pad) for (let o = -24; o <= 36; o += 12) if (m + o >= lo && m + o <= hi) pool.push(m + o);
    return pool[Math.floor(Math.random() * pool.length)] ?? lo;
  }

  // ─── Objects and paper ────────────────────────────────────────────────────

  /**
   * Two of the hero's objects hitting. `v` is how hard (0..1), `pan` where
   * (-1..1), and the pair decides the sound: a pencil rings like a small
   * hollow stick of wood, rubber just thuds, a cardboard sleeve adds a tap.
   */
  impact(v: number, pan: number, a: Kind, b: Kind) {
    if (!this.live) return;
    const now = performance.now();
    this.knockBudget = Math.min(10, this.knockBudget + ((now - this.lastKnockRefill) / 1000) * 45);
    this.lastKnockRefill = now;
    if (this.knockBudget < 1) return;
    this.knockBudget -= 1;
    const ctx = this.ctx!;
    const t = ctx.currentTime;
    const k = Math.min(1, v);
    const level = 0.02 + 0.26 * k ** 1.4;
    const out = ctx.createStereoPanner();
    out.pan.value = Math.max(-1, Math.min(1, pan));
    out.connect(this.master);
    const send = ctx.createGain();
    send.gain.value = 0.18;
    out.connect(send).connect(this.verb);
    const pencils = (a === "pencil" ? 1 : 0) + (b === "pencil" ? 1 : 0);
    const sleeve = a === "sleeved" || b === "sleeved";
    if (pencils) {
      this.wood(t, level * (pencils === 2 ? 0.9 : 0.75), out);
      // Pencil on pencil: the second stick answers a hair later.
      if (pencils === 2) this.wood(t + 0.006 + Math.random() * 0.01, level * 0.5, out);
    }
    if (pencils < 2) this.rubberThud(t, level * (pencils ? 0.55 : 1), out);
    if (sleeve) this.noiseHit(t, "bandpass", 1500 + Math.random() * 700, 1.3, level * 0.35, 0.012, out);
  }

  /** A pencil: a few inharmonic wood modes that die almost at once, plus the click. */
  private wood(t: number, level: number, out: AudioNode) {
    const ctx = this.ctx!;
    const base = 1100 + Math.random() * 900; // every pencil rings a little differently
    for (const [ratio, lvl, dec] of [[1, 1, 0.05], [2.32, 0.55, 0.032], [3.93, 0.3, 0.02], [5.6, 0.14, 0.012]] as const) {
      const o = ctx.createOscillator();
      o.frequency.value = base * ratio * (1 + (Math.random() - 0.5) * 0.02);
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(level * lvl * 0.5, t + 0.0015);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dec);
      o.connect(g).connect(out);
      o.start(t);
      o.stop(t + dec + 0.01);
    }
    this.noiseHit(t, "highpass", 2500, 0.7, level * 0.6, 0.004, out);
  }

  /** Rubber on rubber: no ring at all, just a soft, low, damped thud. */
  private rubberThud(t: number, level: number, out: AudioNode) {
    const ctx = this.ctx!;
    this.noiseHit(t, "lowpass", 420 + Math.random() * 380, 0.9, level * 0.9, 0.035 + Math.random() * 0.02, out);
    const o = ctx.createOscillator();
    const f = 95 + Math.random() * 60;
    o.frequency.setValueAtTime(f * 1.3, t);
    o.frequency.exponentialRampToValueAtTime(f, t + 0.015);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(level * 0.55, t + 0.003);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.07);
    o.connect(g).connect(out);
    o.start(t);
    o.stop(t + 0.08);
  }

  /** A burst of filtered noise: the raw material of taps, cracks and crumbs. */
  private noiseHit(t: number, type: BiquadFilterType, f: number, q: number, level: number, dur: number, out: AudioNode) {
    const ctx = this.ctx!;
    const n = ctx.createBufferSource();
    n.buffer = this.noise;
    const bf = ctx.createBiquadFilter();
    bf.type = type;
    bf.frequency.value = f;
    bf.Q.value = q;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(Math.max(0.0002, level), t + 0.0012);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    n.connect(bf).connect(g).connect(out);
    n.start(t, Math.random() * 1.9, dur + 0.01);
  }

  /** Air moving: things flying in, being thrown, pages changing. */
  whoosh(strength = 1, dur = 0.7, pan = 0) {
    if (!this.live) return;
    const ctx = this.ctx!;
    const t = ctx.currentTime;
    const src = ctx.createBufferSource();
    src.buffer = this.noise;
    src.loop = true;
    const bp = ctx.createBiquadFilter();
    bp.type = "bandpass";
    bp.Q.value = 0.9;
    bp.frequency.setValueAtTime(220, t);
    bp.frequency.exponentialRampToValueAtTime(850, t + dur * 0.55);
    bp.frequency.exponentialRampToValueAtTime(260, t + dur);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.12 * strength, t + dur * 0.5);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    const p = ctx.createStereoPanner();
    p.pan.setValueAtTime(-pan, t);
    p.pan.linearRampToValueAtTime(pan, t + dur);
    src.connect(bp).connect(g).connect(p);
    p.connect(this.master);
    p.connect(this.verb);
    src.start(t, Math.random());
    src.stop(t + dur + 0.05);
  }

  /** Paper creasing: dry little cracks, about `amount` of them per call. */
  crinkle(amount: number) {
    if (!this.live || amount <= 0) return;
    const ctx = this.ctx!;
    let n = Math.floor(amount);
    if (Math.random() < amount - n) n++;
    for (let i = 0; i < Math.min(n, 5); i++) {
      const t = ctx.currentTime + Math.random() * 0.05;
      const src = ctx.createBufferSource();
      src.buffer = this.noise;
      const bp = ctx.createBiquadFilter();
      bp.type = "bandpass";
      const low = Math.random() < 0.35;
      bp.frequency.value = low ? 500 + Math.random() * 500 : 1300 + Math.random() * 2200;
      bp.Q.value = low ? 1.4 : 2;
      const g = ctx.createGain();
      const dur = 0.005 + Math.random() * (low ? 0.035 : 0.018);
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime((low ? 0.1 : 0.05) * (0.5 + Math.random()), t + 0.001);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      const p = ctx.createStereoPanner();
      p.pan.value = Math.random() * 1.2 - 0.6;
      src.connect(bp).connect(g).connect(p);
      p.connect(this.master);
      p.connect(this.verb);
      src.start(t, Math.random() * 1.9, dur + 0.01);
    }
  }

  /** A poster turning over: the flick of the paper's edge, its soft body, and a note. dir 1 forward, -1 back. */
  pageTurn(dir: 1 | -1) {
    if (!this.live) return;
    const ctx = this.ctx!;
    const t = ctx.currentTime;
    const pan = ctx.createStereoPanner();
    pan.pan.setValueAtTime(-0.35 * dir, t);
    pan.pan.linearRampToValueAtTime(0.35 * dir, t + 0.3);
    pan.connect(this.master);
    pan.connect(this.verb);
    // The body: air moved by the sheet, low and short.
    const body = ctx.createBufferSource();
    body.buffer = this.noise;
    const lp = ctx.createBiquadFilter();
    lp.type = "lowpass";
    lp.frequency.setValueAtTime(380, t);
    lp.frequency.exponentialRampToValueAtTime(900, t + 0.18);
    const bg = ctx.createGain();
    bg.gain.setValueAtTime(0.0001, t);
    bg.gain.exponentialRampToValueAtTime(0.34, t + 0.05);
    bg.gain.exponentialRampToValueAtTime(0.0001, t + 0.3);
    body.connect(lp).connect(bg).connect(pan);
    body.start(t, Math.random() * 1.5, 0.35);
    // The flick: the edge snapping over, a quick papery crack.
    const flick = ctx.createBufferSource();
    flick.buffer = this.noise;
    const bp = ctx.createBiquadFilter();
    bp.type = "bandpass";
    bp.frequency.value = 1600;
    bp.Q.value = 1.1;
    const fg = ctx.createGain();
    const at = t + 0.12;
    fg.gain.setValueAtTime(0.0001, at);
    fg.gain.exponentialRampToValueAtTime(0.22, at + 0.004);
    fg.gain.exponentialRampToValueAtTime(0.0001, at + 0.07);
    flick.connect(bp).connect(fg).connect(pan);
    flick.start(at, Math.random() * 1.5, 0.1);
    // And the next page's note.
    this.bell(hz(this.chordNote(69, 81)), 0.08, 0.25 * dir, 2.4, 0.14);
  }

  /** A poster peeling: call every frame with how fast (0..1). A light paper rustle: sparse, dry crackles. */
  paperFlip(rate: number) {
    if (!this.live || rate <= 0.02) return;
    const ctx = this.ctx!;
    const r = Math.min(1, rate);
    // About 25 tiny cracks a second at full speed, fewer as it slows.
    let n = r * 0.45;
    while (n > 0) {
      if (Math.random() < Math.min(1, n)) {
        const t = ctx.currentTime + Math.random() * 0.015;
        const out = ctx.createStereoPanner();
        out.pan.value = Math.random() * 0.8 - 0.2;
        out.connect(this.master);
        const low = Math.random() < 0.3;
        this.noiseHit(t, "bandpass", low ? 700 + Math.random() * 400 : 1800 + Math.random() * 2200, low ? 1.2 : 1.8, (low ? 0.05 : 0.03) * (0.4 + r * 0.6), low ? 0.03 : 0.012, out);
      }
      n -= 1;
    }
  }

  /** The process sheet's pencil moving (px/s): a faint graphite scratch that follows it. */
  write(speed: number) {
    if (!this.live) return;
    const b = this.writeBus;
    b.last = performance.now();
    const t = this.ctx!.currentTime;
    const v = Math.min(1, speed / 520);
    // The paper's tooth: the level and colour flutter from moment to moment.
    b.gain.gain.setTargetAtTime(0.03 * v * (0.55 + Math.random() * 0.9), t, 0.02);
    b.filter.frequency.setTargetAtTime(1900 + v * 900 + Math.random() * 400, t, 0.03);
  }

  /** Call every frame you're rubbing: speed in px/s, pressure 0..1.2. Soft rubber friction, the odd crumb. */
  rub(speed: number, pressure: number) {
    if (!this.live) return;
    const b = this.rubBus;
    b.last = performance.now();
    const t = this.ctx!.currentTime;
    const v = Math.min(1, speed / 1600);
    b.gain.gain.setTargetAtTime(0.13 * v * pressure * (0.8 + Math.random() * 0.4), t, 0.035);
    b.filter.frequency.setTargetAtTime(520 + v * 380, t, 0.05);
    if (v > 0.2 && Math.random() < v * 0.12) {
      const out = this.ctx!.createStereoPanner();
      out.pan.value = Math.random() * 0.6 - 0.3;
      out.connect(this.master);
      this.noiseHit(t, "bandpass", 1400 + Math.random() * 900, 1.5, 0.012 + Math.random() * 0.012, 0.01, out);
    }
  }

  // ─── Links, buttons, arrivals ────────────────────────────────────────────

  /** Hovering something you can press: a small tuned tap. */
  hover() {
    if (!this.live) return;
    const now = performance.now();
    if (now - this.lastHover < 70) return;
    this.lastHover = now;
    this.bell(hz(this.chordNote(74, 88)), 0.012, Math.random() * 0.6 - 0.3, 0.7);
  }

  /** Pressing it. */
  press() {
    if (!this.live) return;
    this.marimba(hz(this.chordNote(62, 74)), 0.09, 0);
  }

  tick() {
    if (!this.live) return;
    this.bell(hz(81), 0.03, 0, 1.2);
  }

  /** The click on "Enter with sound": the score swells in under an opening chord. */
  welcome() {
    if (!this.ctx) return;
    const go = () => {
      [50, 57, 64, 66, 69, 74].forEach((m, i) => this.bell(hz(m), 0.05 - i * 0.004, i % 2 ? 0.3 : -0.3, 4, i * 0.11));
    };
    if (this.live) go();
    else this.ctx.resume().then(() => this.live && go());
  }

  /** Arrival: the chord, plucked upward (the dive's end, a letter posted). */
  arrive() {
    if (!this.live) return;
    [62, 66, 69, 73, 76, 81].forEach((m, i) => this.bell(hz(m), 0.045, i % 2 ? 0.35 : -0.35, 3.2, i * 0.09));
  }

  /** A sticker landing. */
  pop(i: number) {
    if (!this.live) return;
    const m = PENTA[4 + (i % 6)];
    const ctx = this.ctx!;
    const t = ctx.currentTime + 0.01;
    const o = ctx.createOscillator();
    o.frequency.setValueAtTime(hz(m) * 1.6, t);
    o.frequency.exponentialRampToValueAtTime(hz(m), t + 0.05);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.06, t + 0.005);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.25);
    const p = ctx.createStereoPanner();
    p.pan.value = Math.random() * 1.4 - 0.7;
    o.connect(g).connect(p);
    p.connect(this.master);
    p.connect(this.verb);
    o.start(t);
    o.stop(t + 0.3);
  }

  // ─── The dive ─────────────────────────────────────────────────────────────

  private buildDive() {
    const ctx = this.ctx!;
    const filter = ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.value = 260;
    filter.Q.value = 0.8;
    const gain = ctx.createGain();
    gain.gain.value = 0;
    filter.connect(gain);
    gain.connect(this.master);
    gain.connect(this.verb);
    const osc: OscillatorNode[] = [];
    DIVE.forEach((f, i) => {
      for (const det of [-7, 7]) {
        const o = ctx.createOscillator();
        o.type = i < 2 ? "triangle" : "sawtooth";
        o.frequency.value = f;
        o.detune.value = det;
        const g = ctx.createGain();
        g.gain.value = i < 2 ? 0.16 : 0.05;
        o.connect(g).connect(filter);
        o.start();
        osc.push(o);
      }
    });
    const lfo = ctx.createOscillator();
    lfo.frequency.value = 0.09;
    const lfoAmt = ctx.createGain();
    lfoAmt.gain.value = 90;
    lfo.connect(lfoAmt).connect(filter.frequency);
    lfo.start();
    this.dpad = { osc, filter, gain };

    // Air: low, warm, rising with speed. Never a hiss.
    const wf = ctx.createBiquadFilter();
    wf.type = "lowpass";
    wf.frequency.value = 260;
    wf.Q.value = 0.9;
    const wg = ctx.createGain();
    wg.gain.value = 0;
    this.loop().connect(wf).connect(wg);
    wg.connect(this.master);
    wg.connect(this.verb);
    this.wind = { filter: wf, gain: wg };

    // Sub rumble under the flight.
    const so = ctx.createOscillator();
    so.frequency.value = 36.7;
    this.sub = ctx.createGain();
    this.sub.gain.value = 0;
    so.connect(this.sub).connect(this.master);
    so.start();
  }

  /** Call every frame the dive is on screen. All values 0..1. */
  dive(s: { open: number; flight: number; speed: number; turn: number; end: number }) {
    if (!this.live || !this.dpad) return;
    this.lastDive = performance.now();
    this.scene("dive");
    const t = this.ctx!.currentTime;
    const pad = this.dpad;
    pad.gain.gain.setTargetAtTime(0.1 * (0.3 + 0.7 * s.open) * (1 - s.end * 0.35), t, 0.2);
    pad.filter.frequency.setTargetAtTime(240 + s.open * 380 + s.turn * s.speed * 1300 + s.end * 1900, t, 0.15);
    this.wind.gain.gain.setTargetAtTime(0.16 * s.turn * Math.min(1, 0.2 + s.speed), t, 0.2);
    this.wind.filter.frequency.setTargetAtTime(220 + s.speed * 380, t, 0.25);
    this.sub.gain.setTargetAtTime(0.1 * s.turn * (0.3 + s.speed * 0.7), t, 0.2);
    const res = s.end > 0.5;
    if (res !== this.resolved) {
      this.resolved = res;
      const to = res ? DIVE_END : DIVE;
      pad.osc.forEach((o, i) => o.frequency.setTargetAtTime(to[i >> 1], t, 0.25));
    }
    this.crackleBudget = Math.min(6, this.crackleBudget + 0.5);
  }

  /** Templates rubbed out this frame: a few soft rubber crumbs, scattered left and right. */
  crackle(n: number) {
    if (!this.live || n <= 0) return;
    const ctx = this.ctx!;
    const count = Math.min(n, 3, Math.floor(this.crackleBudget));
    for (let i = 0; i < count; i++) {
      this.crackleBudget -= 1;
      const at = ctx.currentTime + Math.random() * 0.05;
      const out = ctx.createStereoPanner();
      out.pan.value = Math.random() * 1.6 - 0.8;
      out.connect(this.master);
      const send = ctx.createGain();
      send.gain.value = 0.3;
      out.connect(send).connect(this.verb);
      this.noiseHit(at, "lowpass", 1400 + Math.random() * 900, 0.8, 0.02 + Math.random() * 0.025, 0.006 + Math.random() * 0.01, out);
    }
  }

  /** A row of the tunnel's wireframes drawing in: a glassy note that climbs as the rows come. */
  reveal(k: number) {
    if (!this.live) return;
    const now = performance.now();
    if (now - this.lastReveal < 45) return;
    this.lastReveal = now;
    const m = PENTA[k % PENTA.length] + (k >= PENTA.length ? 12 : 0) - 12;
    this.bell(hz(m), 0.022, k % 2 ? 0.45 : -0.45, 1.8);
  }

  /** The eraser hitting a cliché and rubbing a hole through it: thump, rub-through, crumbs, a note. */
  eraseHit() {
    if (!this.live) return;
    const ctx = this.ctx!;
    const t = ctx.currentTime;
    const out = ctx.createStereoPanner();
    out.pan.value = 0;
    out.connect(this.master);
    const send = ctx.createGain();
    send.gain.value = 0.35;
    out.connect(send).connect(this.verb);
    // Thump: the rubber meeting the paper.
    const o = ctx.createOscillator();
    o.frequency.setValueAtTime(90, t);
    o.frequency.exponentialRampToValueAtTime(48, t + 0.12);
    const og = ctx.createGain();
    og.gain.setValueAtTime(0.0001, t);
    og.gain.exponentialRampToValueAtTime(0.3, t + 0.004);
    og.gain.exponentialRampToValueAtTime(0.0001, t + 0.18);
    o.connect(og).connect(out);
    o.start(t);
    o.stop(t + 0.2);
    // Rub-through: a firm stroke of rubber across paper.
    const n = ctx.createBufferSource();
    n.buffer = this.noise;
    const bp = ctx.createBiquadFilter();
    bp.type = "bandpass";
    bp.Q.value = 0.9;
    bp.frequency.setValueAtTime(480, t);
    bp.frequency.exponentialRampToValueAtTime(1100, t + 0.12);
    bp.frequency.exponentialRampToValueAtTime(650, t + 0.3);
    const lp = ctx.createBiquadFilter();
    lp.type = "lowpass";
    lp.frequency.value = 1800;
    const ng = ctx.createGain();
    ng.gain.setValueAtTime(0.0001, t);
    ng.gain.exponentialRampToValueAtTime(0.26, t + 0.02);
    ng.gain.exponentialRampToValueAtTime(0.0001, t + 0.34);
    n.connect(bp).connect(lp).connect(ng).connect(out);
    n.start(t, Math.random(), 0.4);
    // Crumbs falling away.
    for (let i = 0; i < 7; i++) {
      const at = t + 0.08 + Math.random() * 0.3;
      const p = ctx.createStereoPanner();
      p.pan.value = Math.random() * 1.4 - 0.7;
      p.connect(this.master);
      this.noiseHit(at, "bandpass", 1200 + Math.random() * 1600, 1.4, 0.02 + Math.random() * 0.03, 0.008, p);
    }
    // And a note, so it feels like a small win.
    this.bell(hz(this.chordNote(62, 74)), 0.035, 0, 2, 0.05);
  }
}

export const sound = new Sound();
