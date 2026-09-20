"use client";

import { useEffect, useRef, useState } from "react";
import { whenStageReady } from "@/lib/stage/store";
import { startRipples } from "@/lib/ripples";
import { sound } from "@/lib/sound";

declare global {
  interface Window {
    __eraseLoaded?: boolean;
  }
}

/**
 * Black, with one thing in it: the eraser, modelled and lit, turning slowly in
 * the middle of the screen and throwing itself into a full turn now and then.
 * Move the pointer and waves run out across the dark behind it. The count runs
 * in the corner. When the site is ready it squares up to you, label forward,
 * then the page splits across the middle and opens onto the site.
 *
 * three.js loads in the background (the page needs it anyway); until it's here
 * there's just the count, and if WebGL is missing the page simply opens.
 */

type Phase = "idle" | "load" | "gate" | "open" | "done";

export function Loader() {
  const rootRef = useRef<HTMLDivElement>(null);
  const gate = useRef<((withSound: boolean) => void) | null>(null);
  const [phase, setPhase] = useState<Phase>("idle");

  useEffect(() => {
    const root = rootRef.current!;
    const html = document.documentElement;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let seen = false;
    try {
      seen = sessionStorage.getItem("erase:seen") === "1";
    } catch {}

    const announce = () => {
      if (window.__eraseLoaded) return;
      window.__eraseLoaded = true;
      html.style.overflow = "";
      window.__lenis?.start();
      try {
        sessionStorage.setItem("erase:seen", "1");
      } catch {}
      window.setTimeout(() => {
        window.dispatchEvent(new Event("erase:loaded"));
        window.dispatchEvent(new Event("erase:reveal"));
      }, 0);
    };

    if (reduced) {
      announce();
      return;
    }

    html.style.overflow = "hidden";
    window.__lenis?.stop();
    let cancelled = false;
    let raf = 0;
    const timers: number[] = [];
    const after = (ms: number, fn: () => void) => timers.push(window.setTimeout(fn, ms));

    const canvas = root.querySelector<HTMLCanvasElement>(".loader__object")!;
    // Water in the dark: it only moves when you do.
    const water = startRipples(root.querySelector<HTMLCanvasElement>(".loader__water")!, { lo: [0.16, 0.21, 0.5], gain: 2.7, max: 0.3 });
    const digits = [...root.querySelectorAll<HTMLElement>(".loader__dig")];
    const setCount = (v: number) => {
      const s = String(Math.round(v)).padStart(3, "0");
      digits.forEach((d, i) => d.style.setProperty("--d", s[i]));
    };

    // ─── Timeline ───
    let ready = false;
    Promise.all([document.fonts.ready, whenStageReady()]).then(() => (ready = true));
    const t0 = performance.now();
    const minDur = seen ? 900 : 2000;
    let shown = 0;
    let last = t0;
    let started = false;
    let done = false;
    /** Rises to 1 once it's loaded: the eraser squares up to you. */
    let settle = 0;
    const pointer = { x: 0, y: 0, live: false };

    let spin: ((dt: number, time: number, settled: number) => void) | null = null;
    /** A turn of its own when the site is ready. */
    let cheer: (() => void) | null = null;
    let teardown: (() => void) | null = null;

    /** The page splits across the middle and opens. */
    const open = () => {
      setPhase("open");
      sound.whoosh(0.7, 0.9);
      after(120, announce);
      after(1050, () => !cancelled && setPhase("done"));
    };

    const step = (now: number) => {
      raf = 0;
      if (cancelled) return;
      if (!started) {
        started = true;
        setPhase("load");
      }
      const dt = Math.min(1 / 20, (now - last) / 1000);
      last = now;
      const time = Math.min(1, (now - t0) / minDur);
      // The count never runs past what's really loaded, and never sprints to
      // catch up after the browser has been busy: it stays one steady climb.
      const want = ready ? time : Math.min(time, 0.93);
      const rate = Math.min(seen ? 1.1 : 0.62, Math.max(0, want - shown) * 4);
      shown = Math.min(want, shown + rate * dt);
      if (want >= 1 && shown > 0.999) shown = 1;
      setCount(shown * 100);
      if (done) settle = Math.min(1, settle + dt * 1.6);
      spin?.(dt, (now - t0) / 1000, settle);

      if (shown >= 1 && !done) {
        done = true;
        sound.tick();
        cheer?.();
        after(seen ? 520 : 760, () => (seen ? open() : setPhase("gate")));
      }
      raf = requestAnimationFrame(step);
    };

    gate.current = (withSound: boolean) => {
      sound.set(withSound);
      if (withSound) sound.welcome();
      open();
    };

    const onMove = (e: PointerEvent) => {
      pointer.x = (e.clientX / window.innerWidth) * 2 - 1;
      pointer.y = (e.clientY / window.innerHeight) * 2 - 1;
      pointer.live = true;
    };
    window.addEventListener("pointermove", onMove, { passive: true });

    // ─── The eraser, modelled ───
    (async () => {
      try {
        const [THREE, objects] = await Promise.all([import("three"), import("@/lib/stage/objects")]);
        if (cancelled) return;
        const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: "high-performance" });
        renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
        renderer.outputColorSpace = THREE.SRGBColorSpace;
        renderer.toneMapping = THREE.NeutralToneMapping;
        const scene = new THREE.Scene();
        const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 50);
        camera.position.set(0, 0, 4.6);

        const pmrem = new THREE.PMREMGenerator(renderer);
        const { RoomEnvironment } = await import("three/addons/environments/RoomEnvironment.js");
        if (cancelled) return;
        const env = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;

        const mats = objects.materials(env, getComputedStyle(document.body).fontFamily);
        mats.rubber.color = new THREE.Color("#f4f3ee");
        const eg = objects.eraserGeometry();
        const sg = objects.sleeveGeometry();
        // The label is printed on the broad faces only; plain card elsewhere.
        const card = new THREE.MeshPhysicalMaterial({ color: 0x141517, roughness: 0.32, clearcoat: 0.7, clearcoatRoughness: 0.25, envMap: env });
        const rubber = new THREE.Mesh(eg, mats.rubber);
        const sleeve = new THREE.Mesh(sg, [card, card, card, card, mats.sleeve, mats.sleeve]);
        const tool = new THREE.Group();
        tool.add(rubber, sleeve);

        // A face on the bare end of the rubber: two eyes, a smile, a blush.
        const ink = new THREE.MeshStandardMaterial({ color: 0x141517, roughness: 0.42 });
        const eyeG = new THREE.SphereGeometry(1, 18, 14);
        const eyes = [-0.355, -0.205].map((ex) => {
          const eye = new THREE.Mesh(eyeG, ink);
          eye.scale.set(0.032, 0.055, 0.016);
          eye.position.set(ex, 0.055, 0.142);
          tool.add(eye);
          return eye;
        });
        const smileG = new THREE.TorusGeometry(0.045, 0.0095, 8, 20, Math.PI);
        const smile = new THREE.Mesh(smileG, ink);
        smile.rotation.z = Math.PI;
        smile.position.set(-0.28, -0.042, 0.138);
        smile.scale.z = 0.4;
        tool.add(smile);
        const cheekM = new THREE.MeshBasicMaterial({ color: objects.PALETTE.blue, transparent: true, opacity: 0.5 });
        const cheekG = new THREE.CircleGeometry(1, 20);
        for (const cx of [-0.43, -0.13]) {
          const cheek = new THREE.Mesh(cheekG, cheekM);
          cheek.scale.set(0.03, 0.017, 1);
          cheek.position.set(cx, -0.03, 0.143);
          tool.add(cheek);
        }
        // Turn about the middle of the whole thing, not the rubber's middle.
        tool.position.x = -0.12;
        const rig = new THREE.Group();
        rig.add(tool);
        scene.add(rig);

        // A soft shadow beneath, so it isn't floating in nothing.
        const shadowC = document.createElement("canvas");
        shadowC.width = shadowC.height = 128;
        const sx = shadowC.getContext("2d")!;
        const grd = sx.createRadialGradient(64, 64, 0, 64, 64, 64);
        grd.addColorStop(0, "rgba(20,21,23,0.3)");
        grd.addColorStop(1, "rgba(20,21,23,0)");
        sx.fillStyle = grd;
        sx.fillRect(0, 0, 128, 128);
        const shadowT = new THREE.CanvasTexture(shadowC);
        const shadowG = new THREE.PlaneGeometry(3.2, 1.3);
        const shadowM = new THREE.MeshBasicMaterial({ map: shadowT, transparent: true, depthWrite: false });
        const shadow = new THREE.Mesh(shadowG, shadowM);
        shadow.position.set(0, -0.95, -0.25);
        scene.add(shadow);

        // Dust off the floor and a spray of colour off the big turns. One
        // pool of little bits, thrown and left to fall.
        const PN = 90;
        const pGeo = new THREE.BoxGeometry(1, 1, 1);
        const pMat = new THREE.MeshBasicMaterial({ toneMapped: false, transparent: true, depthWrite: false });
        const bits = new THREE.InstancedMesh(pGeo, pMat, PN);
        bits.frustumCulled = false;
        bits.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
        scene.add(bits);
        type Bit = { x: number; y: number; z: number; vx: number; vy: number; vz: number; rx: number; ry: number; rz: number; wx: number; wy: number; wz: number; s: number; life: number; max: number; drag: number; grav: number };
        const pool: Bit[] = Array.from({ length: PN }, () => ({ x: 0, y: 0, z: 0, vx: 0, vy: 0, vz: 0, rx: 0, ry: 0, rz: 0, wx: 0, wy: 0, wz: 0, s: 0, life: 0, max: 1, drag: 2, grav: 6 }));
        let pAt = 0;
        const pMx = new THREE.Matrix4();
        const pQ = new THREE.Quaternion();
        const pE = new THREE.Euler();
        const pV = new THREE.Vector3();
        const pS = new THREE.Vector3();
        const tint = new THREE.Color();
        const rand = (a: number, b: number) => a + Math.random() * (b - a);

        /** Dust: low, wide, grey, gone in a moment. */
        const puff = (n: number, ground: number, scale: number) => {
          for (let i = 0; i < n; i++) {
            const b = pool[pAt];
            const a = rand(0, Math.PI * 2);
            const sp = rand(0.5, 1.9) * scale;
            b.x = Math.cos(a) * rand(0.02, 0.2) * scale;
            b.y = ground + rand(0, 0.05) * scale;
            b.z = Math.sin(a) * rand(0.02, 0.2) * scale;
            b.vx = Math.cos(a) * sp;
            b.vz = Math.sin(a) * sp;
            b.vy = rand(0.3, 1.1) * scale;
            b.wx = rand(-6, 6);
            b.wy = rand(-6, 6);
            b.wz = rand(-6, 6);
            b.rx = rand(0, 6);
            b.ry = rand(0, 6);
            b.rz = rand(0, 6);
            b.s = rand(0.012, 0.03) * scale;
            b.max = b.life = rand(0.35, 0.6);
            b.drag = 4.5;
            b.grav = 3.4;
            tint.set(Math.random() < 0.5 ? "#cfccc4" : "#e6e3da");
            bits.setColorAt(pAt, tint);
            pAt = (pAt + 1) % PN;
          }
          if (bits.instanceColor) bits.instanceColor.needsUpdate = true;
        };

        /** Colour: thrown out from the middle of the turn, and it falls. */
        const spray = (n: number, y: number, scale: number) => {
          for (let i = 0; i < n; i++) {
            const b = pool[pAt];
            const a = rand(0, Math.PI * 2);
            const up = rand(-0.35, 1);
            const sp = rand(1.2, 3.4) * scale;
            b.x = Math.cos(a) * 0.12 * scale;
            b.y = y + rand(-0.06, 0.06) * scale;
            b.z = Math.sin(a) * 0.12 * scale;
            b.vx = Math.cos(a) * sp;
            b.vz = Math.sin(a) * sp * 0.7;
            b.vy = up * sp * 0.9;
            b.wx = rand(-14, 14);
            b.wy = rand(-14, 14);
            b.wz = rand(-14, 14);
            b.rx = rand(0, 6);
            b.ry = rand(0, 6);
            b.rz = rand(0, 6);
            b.s = rand(0.016, 0.036) * scale;
            b.max = b.life = rand(0.6, 1.1);
            b.drag = 1.7;
            b.grav = 7.5;
            const r = Math.random();
            tint.copy(r < 0.42 ? objects.PALETTE.blue : r < 0.62 ? objects.PALETTE.graphite : r < 0.84 ? objects.PALETTE.paper : objects.PALETTE.mist);
            bits.setColorAt(pAt, tint);
            pAt = (pAt + 1) % PN;
          }
          if (bits.instanceColor) bits.instanceColor.needsUpdate = true;
        };

        const stepBits = (dt: number, ground: number) => {
          for (let i = 0; i < PN; i++) {
            const b = pool[i];
            if (b.life <= 0) {
              pMx.makeScale(0, 0, 0);
              bits.setMatrixAt(i, pMx);
              continue;
            }
            b.life -= dt;
            b.vy -= b.grav * dt;
            const d = Math.exp(-b.drag * dt);
            b.vx *= d;
            b.vz *= d;
            b.vy *= d;
            b.x += b.vx * dt;
            b.y += b.vy * dt;
            b.z += b.vz * dt;
            // They settle on the floor rather than falling through it.
            if (b.y < ground) {
              b.y = ground;
              b.vy *= -0.24;
              b.vx *= 0.6;
              b.vz *= 0.6;
              b.wx *= 0.4;
              b.wz *= 0.4;
            }
            b.rx += b.wx * dt;
            b.ry += b.wy * dt;
            b.rz += b.wz * dt;
            const k = Math.max(0, b.life / b.max);
            pE.set(b.rx, b.ry, b.rz);
            pQ.setFromEuler(pE);
            pV.set(b.x, b.y, b.z);
            pS.setScalar(b.s * (0.4 + k * 0.6));
            pMx.compose(pV, pQ, pS);
            bits.setMatrixAt(i, pMx);
          }
          bits.instanceMatrix.needsUpdate = true;
          pMat.opacity = 0.95;
        };

        const key = new THREE.DirectionalLight(0xffffff, 2.9);
        key.position.set(-4, 5, 6);
        const rim = new THREE.DirectionalLight(0x8ea0ff, 2.4);
        rim.position.set(5, -1, -4);
        scene.add(key, rim, new THREE.HemisphereLight(0xe8ecff, 0x101114, 0.5));

        let fit = 1; // how big the object ended up, so the shadow can match
        const size = () => {
          const w = window.innerWidth;
          const h = window.innerHeight;
          renderer.setSize(w, h, false);
          camera.aspect = w / h;
          camera.updateProjectionMatrix();
          // Sized against what the camera can actually see, so it takes up
          // about a third of a wide screen and rather more of a narrow one.
          const visH = 2 * camera.position.z * Math.tan((camera.fov * Math.PI) / 360);
          const visW = visH * camera.aspect;
          const across = camera.aspect < 1 ? 0.66 : 0.34;
          fit = Math.min(visW * across, visH * 0.42) / 1.25;
          rig.scale.setScalar(fit);
          shadow.scale.setScalar(fit * 0.95);
          shadow.position.set(0, -0.62 * fit, -0.25);
        };
        size();
        window.addEventListener("resize", size);

        const rot = { x: 0.12, y: -0.5 };
        // How a kid jumps: a dip to wind up, a shove off the floor, a tuck and
        // a turn in the air, a heavy landing, then a wobble back to standing.
        let stage: "stand" | "dip" | "air" | "land" = "stand";
        let st = 0; // seconds in this stage
        let hopIn = 0.9;
        let hops = 0;
        let y = 0; // height off the floor
        let vy = 0;
        let turn = 0; // where it has got to, in full turns
        let spinFrom = 0;
        let airFor = 0.5;
        let sprayed = false;
        // The body's squash, on a spring so it settles with a wobble.
        let sq = 1;
        let sqV = 0;
        let blinkIn = 1.6;
        let blink = 0;
        let lean = 0;

        // It only ever does the big one: crouch, leap, all the way round.
        const jump = () => {
          if (stage !== "stand") return;
          hops++;
          stage = "dip";
          st = 0;
        };
        canvas.addEventListener("pointerdown", () => jump());
        cheer = () => jump();

        spin = (dt, time, settled) => {
          const ground = -0.62 * fit;

          // ─── the jump ───
          if (stage === "stand") {
            hopIn -= dt;
            if (hopIn <= 0) {
              jump();
              hopIn = 1.9 + Math.random() * 1.6;
            }
          } else if (stage === "dip") {
            st += dt;
            const k = Math.min(1, st / 0.2);
            // Sinking into the crouch, slowest at the bottom.
            sq = 1 - 0.24 * (1 - (1 - k) ** 2);
            sqV = 0;
            if (k >= 1) {
              stage = "air";
              st = 0;
              vy = 4.5;
              airFor = (2 * vy) / 9.2;
              sq = 1.3; // shoves off, stretching
              sqV = 0;
              spinFrom = turn;
              sprayed = false;
              puff(12, ground, fit);
              sound.pop(hops % 4);
            }
          } else if (stage === "air") {
            st += dt;
            vy -= 9.2 * dt;
            y = Math.max(0, y + vy * dt);
            // Stretched going up, gathered at the top, stretched coming down.
            const want = 1 + Math.max(-0.14, Math.min(0.2, vy * 0.055));
            sq += (want - sq) * (1 - Math.pow(0.86, dt * 60));
            if (!sprayed && vy <= 0) {
              sprayed = true;
              spray(26, ground + y * fit + 0.1 * fit, fit);
            }
            if (y <= 0 && vy < 0) {
              y = 0;
              stage = "land";
              st = 0;
              sq = 0.74; // lands heavy
              sqV = 0;
              puff(14, ground, fit);
              sound.pop((hops + 2) % 4);
              turn = spinFrom + 1;
            }
          } else {
            st += dt;
            if (st > 0.5) stage = "stand";
          }

          // The squash springs back, overshooting once or twice: that wobble
          // is what makes it read as rubber rather than a box.
          sqV += (1 - sq) * 260 * dt;
          sqV *= Math.pow(0.055, dt);
          sq += sqV * dt;

          // ─── turning ───
          const airK = stage === "air" ? Math.min(1, st / airFor) : 0;
          // The turn is quickest through the middle of the flight.
          const spun = stage === "air" ? spinFrom + (airK < 0.5 ? 4 * airK ** 3 : 1 - (-2 * airK + 2) ** 3 / 2) : turn;
          const drift = Math.sin(time * 0.35) * 0.4;
          const wantY = -0.5 + drift * (1 - settled) + (pointer.live ? pointer.x * 0.7 : 0);
          const wantX = (pointer.live ? pointer.y * 0.32 : 0) + Math.sin(time * 0.6) * 0.05;
          const aimY = THREE.MathUtils.lerp(wantY, -0.26 + (pointer.live ? pointer.x * 0.18 : 0), settled);
          const aimX = THREE.MathUtils.lerp(wantX, 0.05 + (pointer.live ? pointer.y * 0.08 : 0), settled);
          const kk = 1 - Math.pow(0.92, dt * 60);
          rot.y += (aimY - rot.y) * kk;
          rot.x += (aimX - rot.x) * kk;
          // It tips back as it goes up and forward as it comes down.
          const wantLean = stage === "air" ? Math.max(-0.3, Math.min(0.3, -vy * 0.06)) : stage === "dip" ? 0.1 : 0;
          lean += (wantLean - lean) * (1 - Math.pow(0.85, dt * 60));

          rig.rotation.set(rot.x + lean, rot.y + spun * Math.PI * 2, Math.sin(time * 0.5) * 0.03 * (1 - settled));
          rig.position.y = Math.sin(time * 1.1) * 0.05 * fit + y * fit;
          // Volume stays about the same: taller means narrower.
          const wide = 1 / Math.sqrt(Math.max(0.35, sq));
          rig.scale.set(fit * wide, fit * sq, fit * wide);

          // ─── blink ───
          blinkIn -= dt;
          if (blinkIn <= 0) {
            blink = 0.15;
            blinkIn = 2 + Math.random() * 3.5;
          }
          blink = Math.max(0, blink - dt);
          const shut = blink > 0 ? Math.sin((blink / 0.15) * Math.PI) : 0;
          for (const eye of eyes) eye.scale.y = 0.055 * (1 - shut * 0.9);

          // The shadow tightens and fades as it leaves the floor.
          const off = Math.min(1, y * 1.6);
          shadow.position.y = ground;
          shadow.scale.setScalar(fit * 0.95 * (1 - off * 0.34));
          shadowM.opacity = 0.9 - off * 0.55;

          stepBits(dt, ground);
          renderer.render(scene, camera);
        };
        root.dataset.object = "on";

        teardown = () => {
          window.removeEventListener("resize", size);
          [eg, sg, shadowG, eyeG, smileG, cheekG, pGeo].forEach((g) => g.dispose());
          [card, ink, cheekM, shadowM, shadowT, pMat, env, ...Object.values(mats)].forEach((d) => {
            (d as { map?: { dispose(): void } }).map?.dispose?.();
            d.dispose();
          });
          pmrem.dispose();
          renderer.dispose();
        };
      } catch (err) {
        console.warn("[erase] loader object off:", err);
      }
    })();

    raf = requestAnimationFrame(step);

    return () => {
      cancelled = true;
      cancelAnimationFrame(raf);
      timers.forEach(clearTimeout);
      window.removeEventListener("pointermove", onMove);
      water?.dispose();
      teardown?.();
      html.style.overflow = "";
    };
  }, []);

  if (phase === "done") return null;

  return (
    <div
      ref={rootRef}
      className="loader"
      data-phase={phase}
      role={phase === "gate" ? "dialog" : undefined}
      aria-modal={phase === "gate" ? true : undefined}
      aria-label="Welcome to Erase"
      aria-hidden={phase === "gate" ? undefined : true}
    >
      <div className="loader__half" data-h="t" />
      <div className="loader__half" data-h="b" />

      <canvas className="loader__water" />
      <canvas className="loader__object" />

      <p className="loader__meter mono" aria-hidden="true">
        {[0, 1, 2].map((i) => (
          <span key={i} className="loader__dig" style={{ "--d": 0 } as React.CSSProperties}>
            <i>0</i>
            <i>1</i>
            <i>2</i>
            <i>3</i>
            <i>4</i>
            <i>5</i>
            <i>6</i>
            <i>7</i>
            <i>8</i>
            <i>9</i>
          </span>
        ))}
      </p>

      {phase === "gate" && (
        <p className="loader__gate mono">
          <button type="button" className="loader__pick" autoFocus onClick={() => gate.current?.(true)}>
            Enter with sound
          </button>
          <span aria-hidden="true">·</span>
          <button type="button" className="loader__pick" onClick={() => gate.current?.(false)}>
            Quietly
          </button>
        </p>
      )}
    </div>
  );
}
