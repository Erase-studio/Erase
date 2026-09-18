/**
 * The site's sound, synthesized live with Web Audio: no files to download.
 * On by default (browsers start it on the first click or key; the loader's
 * "Enter with sound" is that click). Turning it off is remembered.
 *
 *   Hero    erasers and pencils knock into each other as you shove them.
 *   Paper   crinkle as the template is crumpled, a whoosh when it's thrown,
 *           a rustle as each poster peels.
 *   Dive    a low pad that opens as the window grows, wind and a sub rumble
 *           while the eraser flies, rubber crackle for every template it
 *           rubs out, a squeak through each cliché, and the chord resolving
 *           from minor to major when it reaches the end. Stickers pop.
 *   Rub     friction noise that follows how hard and fast you rub.
 *   Moves   whooshes for page changes and the menu; a tick for switches.
 */

type Listener = (on: boolean) => void;

const KEY = "erase:sound";
// D minor 9 at the start; the F and C lift to F# and C# at the end.
const PAD = [73.42, 110, 174.61, 261.63, 329.63];
const PAD_END = [73.42, 110, 185.0, 277.18, 329.63];

class Sound {
  on = false;
  private listeners = new Set<Listener>();
  private ctx: AudioContext | null = null;
  private master!: GainNode;
  private verb!: GainNode;
  private noise!: AudioBuffer;
  private pad: { osc: OscillatorNode[]; filter: BiquadFilterNode; gain: GainNode } | null = null;
  private wind!: { filter: BiquadFilterNode; gain: GainNode };
  private sub!: GainNode;
  private rubBus!: { filter: BiquadFilterNode; gain: GainNode };
  private peelBus!: { filter: BiquadFilterNode; gain: GainNode; last: number };
  private knockBudget = 8;
  private lastKnockRefill = 0;
  private lastDive = 0;
  private lastRub = 0;
  private resolved = false;
  private crackleBudget = 0;
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
      this.master.gain.setTargetAtTime(0, t, 0.08);
      window.setTimeout(() => !this.on && this.ctx?.suspend(), 400);
    }
  }

  // ─── Graph ────────────────────────────────────────────────────────────────

  private start() {
    if (!this.ctx) this.build();
    const ctx = this.ctx!;
    ctx.resume();
    const t = ctx.currentTime;
    this.master.gain.cancelScheduledValues(t);
    this.master.gain.setTargetAtTime(0.9, t, 0.15);
  }

  private build() {
    const ctx = new AudioContext();
    this.ctx = ctx;
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -18;
    comp.ratio.value = 3;
    comp.connect(ctx.destination);
    this.master = ctx.createGain();
    this.master.gain.value = 0;
    this.master.connect(comp);

    // Two seconds of white noise, shared by wind, crackle and rubbing.
    this.noise = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
    const d = this.noise.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;

    // A room: decaying stereo noise as the impulse response.
    const conv = ctx.createConvolver();
    const len = ctx.sampleRate * 2.6;
    const ir = ctx.createBuffer(2, len, ctx.sampleRate);
    for (let c = 0; c < 2; c++) {
      const ch = ir.getChannelData(c);
      for (let i = 0; i < len; i++) ch[i] = (Math.random() * 2 - 1) * (1 - i / len) ** 3.2;
    }
    conv.buffer = ir;
    this.verb = ctx.createGain();
    this.verb.gain.value = 0.32;
    this.verb.connect(conv).connect(this.master);

    // Pad: detuned pairs through a lowpass that breathes.
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
    PAD.forEach((f, i) => {
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
    this.pad = { osc, filter, gain };

    // Wind: band-passed noise, brighter and louder with speed.
    const wsrc = this.loop();
    const wf = ctx.createBiquadFilter();
    wf.type = "bandpass";
    wf.frequency.value = 400;
    wf.Q.value = 0.7;
    const wg = ctx.createGain();
    wg.gain.value = 0;
    wsrc.connect(wf).connect(wg);
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

    // Rubbing: narrow noise that squeaks when pushed.
    const rsrc = this.loop();
    const rf = ctx.createBiquadFilter();
    rf.type = "bandpass";
    rf.frequency.value = 700;
    rf.Q.value = 2.5;
    const rg = ctx.createGain();
    rg.gain.value = 0;
    rsrc.connect(rf).connect(rg).connect(this.master);
    this.rubBus = { filter: rf, gain: rg };

    // Paper peeling: a darker rustle that brightens with speed.
    this.peelBus = { ...this.bus("bandpass", 900, 1.1), last: 0 };

    // Anything that stops being driven fades out.
    this.watchdog = window.setInterval(() => {
      const now = performance.now();
      const t = ctx.currentTime;
      if (now - this.lastDive > 260 && this.pad) {
        this.pad.gain.gain.setTargetAtTime(0, t, 0.35);
        this.wind.gain.gain.setTargetAtTime(0, t, 0.2);
        this.sub.gain.setTargetAtTime(0, t, 0.3);
      }
      if (now - this.lastRub > 120) this.rubBus.gain.gain.setTargetAtTime(0, t, 0.05);
      if (now - this.peelBus.last > 150) this.peelBus.gain.gain.setTargetAtTime(0, t, 0.1);
    }, 120);
  }

  /** Looping noise through a filter into a silent gain, for textures driven every frame. */
  private bus(type: BiquadFilterType, freq: number, q: number) {
    const ctx = this.ctx!;
    const f = ctx.createBiquadFilter();
    f.type = type;
    f.frequency.value = freq;
    f.Q.value = q;
    const g = ctx.createGain();
    g.gain.value = 0;
    this.loop().connect(f);
    f.connect(g);
    g.connect(this.master);
    g.connect(this.verb);
    return { filter: f, gain: g };
  }

  private loop() {
    const s = this.ctx!.createBufferSource();
    s.buffer = this.noise;
    s.loop = true;
    s.start();
    return s;
  }

  private get live() {
    return this.on && this.ctx && this.ctx.state === "running";
  }

  // ─── The dive ─────────────────────────────────────────────────────────────

  /** Call every frame the dive is on screen. All values 0..1. */
  dive(s: { open: number; flight: number; speed: number; turn: number; end: number }) {
    if (!this.live || !this.pad) return;
    this.lastDive = performance.now();
    const t = this.ctx!.currentTime;
    const pad = this.pad;
    pad.gain.gain.setTargetAtTime(0.1 * (0.3 + 0.7 * s.open) * (1 - s.end * 0.35), t, 0.2);
    pad.filter.frequency.setTargetAtTime(240 + s.open * 380 + s.turn * s.speed * 1400 + s.end * 2200, t, 0.15);
    this.wind.gain.gain.setTargetAtTime(0.26 * s.turn * Math.min(1, 0.15 + s.speed), t, 0.08);
    this.wind.filter.frequency.setTargetAtTime(320 + s.speed * 1800, t, 0.1);
    this.sub.gain.setTargetAtTime(0.18 * s.turn * (0.3 + s.speed * 0.7), t, 0.15);
    // Minor while it flies, major once it's through.
    const res = s.end > 0.5;
    if (res !== this.resolved) {
      this.resolved = res;
      const to = res ? PAD_END : PAD;
      pad.osc.forEach((o, i) => o.frequency.setTargetAtTime(to[i >> 1], t, 0.25));
    }
    this.crackleBudget = Math.min(6, this.crackleBudget + 0.5);
  }

  /** Templates rubbed out this frame: dry rubber crackle, scattered left and right. */
  crackle(n: number) {
    if (!this.live || n <= 0) return;
    const ctx = this.ctx!;
    const count = Math.min(n, Math.floor(this.crackleBudget));
    for (let i = 0; i < count; i++) {
      this.crackleBudget -= 1;
      const at = ctx.currentTime + Math.random() * 0.06;
      const src = ctx.createBufferSource();
      src.buffer = this.noise;
      const hp = ctx.createBiquadFilter();
      hp.type = "highpass";
      hp.frequency.value = 1800 + Math.random() * 3500;
      const g = ctx.createGain();
      const dur = 0.015 + Math.random() * 0.05;
      g.gain.setValueAtTime(0, at);
      g.gain.linearRampToValueAtTime(0.05 + Math.random() * 0.09, at + 0.003);
      g.gain.exponentialRampToValueAtTime(0.0001, at + dur);
      const pan = ctx.createStereoPanner();
      pan.pan.value = Math.random() * 1.6 - 0.8;
      src.connect(hp).connect(g).connect(pan);
      pan.connect(this.master);
      pan.connect(this.verb);
      src.start(at, Math.random() * 1.8, dur + 0.02);
    }
  }

  /** The eraser going through a word: rub-rub-rub. */
  squeak() {
    if (!this.live) return;
    const ctx = this.ctx!;
    const t = ctx.currentTime;
    const src = ctx.createBufferSource();
    src.buffer = this.noise;
    const bp = ctx.createBiquadFilter();
    bp.type = "bandpass";
    bp.Q.value = 6;
    bp.frequency.setValueAtTime(900, t);
    const lfo = ctx.createOscillator();
    lfo.frequency.value = 13;
    const amt = ctx.createGain();
    amt.gain.value = 380;
    lfo.connect(amt).connect(bp.frequency);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(0.5, t + 0.04);
    g.gain.setTargetAtTime(0, t + 0.28, 0.08);
    src.connect(bp).connect(g);
    g.connect(this.master);
    g.connect(this.verb);
    src.start(t, Math.random());
    lfo.start(t);
    src.stop(t + 0.8);
    lfo.stop(t + 0.8);
  }

  /** Arrival: the chord, plucked upward. */
  arrive() {
    if (!this.live) return;
    [293.66, 369.99, 440, 587.33, 659.25, 880].forEach((f, i) => this.pluck(f, i * 0.085, 0.09));
  }

  /** A sticker landing. */
  pop(i: number) {
    if (!this.live) return;
    const ctx = this.ctx!;
    const t = ctx.currentTime + 0.01;
    const o = ctx.createOscillator();
    o.type = "sine";
    const f = [880, 988, 1175, 1319, 1480][i % 5];
    o.frequency.setValueAtTime(f, t);
    o.frequency.exponentialRampToValueAtTime(f * 0.45, t + 0.09);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.07, t + 0.006);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.16);
    const pan = ctx.createStereoPanner();
    pan.pan.value = Math.random() * 1.4 - 0.7;
    o.connect(g).connect(pan);
    pan.connect(this.master);
    pan.connect(this.verb);
    o.start(t);
    o.stop(t + 0.2);
  }

  private pluck(f: number, delay: number, vol: number) {
    const ctx = this.ctx!;
    const t = ctx.currentTime + delay;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + 0.008);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 1.6);
    g.connect(this.master);
    g.connect(this.verb);
    for (const [type, mul, lvl] of [["triangle", 1, 1], ["sine", 2, 0.35]] as const) {
      const o = ctx.createOscillator();
      o.type = type;
      o.frequency.value = f * mul;
      const og = ctx.createGain();
      og.gain.value = lvl;
      o.connect(og).connect(g);
      o.start(t);
      o.stop(t + 1.7);
    }
  }

  // ─── Rubbing and switches ────────────────────────────────────────────────

  /** Call every frame you're rubbing: speed in px/s, pressure 0..1.2. */
  rub(speed: number, pressure: number) {
    if (!this.live) return;
    this.lastRub = performance.now();
    const t = this.ctx!.currentTime;
    const v = Math.min(1, speed / 1600);
    this.rubBus.gain.gain.setTargetAtTime(0.32 * v * pressure, t, 0.03);
    this.rubBus.filter.frequency.setTargetAtTime(420 + v * 900 + pressure * 300, t, 0.04);
  }

  // ─── Objects and paper ────────────────────────────────────────────────────

  /** Two things hitting: rubber goes "thok", a pencil goes "tick". strength 0..1, pan -1..1. */
  knock(strength: number, pan = 0, kind: "rubber" | "wood" = "rubber") {
    if (!this.live) return;
    const now = performance.now();
    this.knockBudget = Math.min(8, this.knockBudget + ((now - this.lastKnockRefill) / 1000) * 28);
    this.lastKnockRefill = now;
    if (this.knockBudget < 1) return;
    this.knockBudget -= 1;
    const ctx = this.ctx!;
    const t = ctx.currentTime + Math.random() * 0.012;
    const s = Math.min(1, strength);
    const out = ctx.createStereoPanner();
    out.pan.value = Math.max(-1, Math.min(1, pan));
    out.connect(this.master);
    out.connect(this.verb);
    const wood = kind === "wood";
    const f = (wood ? 1100 : 210) * (0.8 + Math.random() * 0.45);
    const o = ctx.createOscillator();
    o.type = wood ? "triangle" : "sine";
    o.frequency.setValueAtTime(f * 1.6, t);
    o.frequency.exponentialRampToValueAtTime(f, t + 0.012);
    const g = ctx.createGain();
    const dec = wood ? 0.06 : 0.09;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.02 + s * 0.2, t + 0.002);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dec);
    o.connect(g).connect(out);
    o.start(t);
    o.stop(t + dec + 0.02);
    // The contact itself: a short filtered click.
    const n = ctx.createBufferSource();
    n.buffer = this.noise;
    const bp = ctx.createBiquadFilter();
    bp.type = "bandpass";
    bp.frequency.value = wood ? 3800 : 1300;
    bp.Q.value = 1.4;
    const ng = ctx.createGain();
    ng.gain.setValueAtTime(0.0001, t);
    ng.gain.exponentialRampToValueAtTime(0.03 + s * 0.14, t + 0.001);
    ng.gain.exponentialRampToValueAtTime(0.0001, t + 0.025);
    n.connect(bp).connect(ng).connect(out);
    n.start(t, Math.random() * 1.8, 0.04);
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
    bp.Q.value = 1.1;
    bp.frequency.setValueAtTime(260, t);
    bp.frequency.exponentialRampToValueAtTime(1900, t + dur * 0.55);
    bp.frequency.exponentialRampToValueAtTime(420, t + dur);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.28 * strength, t + dur * 0.5);
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
    for (let i = 0; i < Math.min(n, 6); i++) {
      const t = ctx.currentTime + Math.random() * 0.05;
      const src = ctx.createBufferSource();
      src.buffer = this.noise;
      const bp = ctx.createBiquadFilter();
      bp.type = "bandpass";
      const low = Math.random() < 0.25;
      bp.frequency.value = low ? 700 + Math.random() * 600 : 2200 + Math.random() * 4200;
      bp.Q.value = low ? 1.5 : 2.5;
      const g = ctx.createGain();
      const dur = 0.004 + Math.random() * (low ? 0.03 : 0.016);
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime((low ? 0.12 : 0.07) * (0.5 + Math.random()), t + 0.001);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      const p = ctx.createStereoPanner();
      p.pan.value = Math.random() * 1.2 - 0.6;
      src.connect(bp).connect(g).connect(p);
      p.connect(this.master);
      p.connect(this.verb);
      src.start(t, Math.random() * 1.9, dur + 0.01);
    }
  }

  /** A sheet peeling off the stack: call every frame with how fast (0..1). */
  peel(rate: number) {
    if (!this.live) return;
    const b = this.peelBus;
    b.last = performance.now();
    const t = this.ctx!.currentTime;
    const v = Math.min(1, rate);
    b.gain.gain.setTargetAtTime(0.3 * v, t, 0.05);
    b.filter.frequency.setTargetAtTime(700 + v * 2600, t, 0.06);
    if (v > 0.05) this.crinkle(v * 0.9);
  }

  tick() {
    if (!this.live) return;
    this.pluck(1318.5, 0, 0.03);
  }
}

export const sound = new Sound();
