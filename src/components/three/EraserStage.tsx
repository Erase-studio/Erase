"use client";

import { useEffect, useRef } from "react";
import { eraserBus } from "@/lib/eraserBus";

/**
 * A fixed, click-through WebGL layer holding one physical eraser and its crumbs.
 * World units are viewport pixels (camera distance is solved so 1 unit = 1px at z=0),
 * so any DOM code can drive it with clientX/clientY. Three.js loads lazily.
 */

type Spring = { x: number; v: number };
const spring = (s: Spring, target: number, w: number, zeta: number, dt: number) => {
  s.v += (w * w * (target - s.x) - 2 * zeta * w * s.v) * dt;
  s.x += s.v * dt;
};

export function EraserStage() {
  const hostRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) return;
    let disposed = false;
    let cleanup = () => {};

    (async () => {
      const THREE = await import("three");
      const { RoundedBoxGeometry } = await import("three/addons/geometries/RoundedBoxGeometry.js");
      const { RoomEnvironment } = await import("three/addons/environments/RoomEnvironment.js");
      const { mergeVertices } = await import("three/addons/utils/BufferGeometryUtils.js");
      if (disposed) return;

      const host = hostRef.current!;
      let renderer: InstanceType<typeof THREE.WebGLRenderer>;
      try {
        renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: "high-performance" });
      } catch {
        return;
      }
      const coarse = window.matchMedia("(pointer: coarse)").matches;
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, coarse ? 1.5 : 1.75));
      renderer.outputColorSpace = THREE.SRGBColorSpace;
      // Neutral keeps the brand blue from washing out the way ACES does.
      renderer.toneMapping = THREE.NeutralToneMapping;
      renderer.toneMappingExposure = 0.95;
      renderer.setClearColor(0x000000, 0);
      host.appendChild(renderer.domElement);

      const scene = new THREE.Scene();
      const pmrem = new THREE.PMREMGenerator(renderer);
      scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
      const key = new THREE.DirectionalLight(0xffffff, 1.6);
      key.position.set(-0.6, 1, 1.2);
      scene.add(key);

      const DIST = 1400;
      const camera = new THREE.PerspectiveCamera(30, 1, 10, 6000);
      camera.position.z = DIST;
      let W = 0;
      let H = 0;
      const resize = () => {
        W = window.innerWidth;
        H = window.innerHeight;
        renderer.setSize(W, H);
        camera.aspect = W / H;
        camera.fov = (2 * Math.atan(H / 2 / DIST) * 180) / Math.PI;
        camera.updateProjectionMatrix();
      };
      resize();
      window.addEventListener("resize", resize);

      // ── The eraser: blue rubber, graphite sleeve with the wordmark, soft shadow.
      const eraser = new THREE.Group();
      const body = new THREE.Group();
      eraser.add(body);
      const wear = { value: 0 };
      const rubberMat = new THREE.MeshPhysicalMaterial({
        color: 0x5cb6e4,
        roughness: 0.78,
        sheen: 0.25,
        sheenColor: new THREE.Color(0xd8f1ff),
        sheenRoughness: 0.9,
      });
      // The working end picks up graphite the more it rubs.
      rubberMat.onBeforeCompile = (shader) => {
        shader.uniforms.uWear = wear;
        shader.vertexShader = shader.vertexShader
          .replace("#include <common>", "#include <common>\nvarying vec3 vLocal;")
          .replace("#include <begin_vertex>", "#include <begin_vertex>\nvLocal = position;");
        shader.fragmentShader = shader.fragmentShader
          .replace(
            "#include <common>",
            `#include <common>
            uniform float uWear;
            varying vec3 vLocal;
            float wHash(vec3 p) { return fract(sin(dot(p, vec3(12.9898, 78.233, 37.719))) * 43758.5453); }`,
          )
          .replace(
            "#include <color_fragment>",
            `#include <color_fragment>
            float tip = smoothstep(-0.12, -0.5, vLocal.x);
            float grit = wHash(floor(vLocal * 70.0));
            float dirt = uWear * tip * (0.45 + 0.55 * grit);
            diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.19, 0.2, 0.22), clamp(dirt, 0.0, 0.8));`,
          );
      };
      const rubber = new THREE.Mesh(new RoundedBoxGeometry(1, 0.52, 0.3, 5, 0.09), rubberMat);
      body.add(rubber);
      // Hold it by the rubber end: the tip sits on the pointer, the sleeve trails.
      body.position.x = 0.42;
      const sleeve = new THREE.Mesh(
        new RoundedBoxGeometry(0.6, 0.545, 0.325, 4, 0.025),
        new THREE.MeshPhysicalMaterial({ color: 0x141518, roughness: 0.32, metalness: 0.15, clearcoat: 0.7, clearcoatRoughness: 0.25 }),
      );
      sleeve.position.x = 0.23;
      body.add(sleeve);

      const labelCanvas = document.createElement("canvas");
      labelCanvas.width = 512;
      labelCanvas.height = 256;
      const lc = labelCanvas.getContext("2d")!;
      await document.fonts.ready;
      const family = getComputedStyle(document.body).fontFamily;
      lc.fillStyle = "#E9EAEC";
      lc.textAlign = "center";
      lc.textBaseline = "middle";
      lc.font = `800 150px ${family}`;
      (lc as CanvasRenderingContext2D & { letterSpacing?: string }).letterSpacing = "-8px";
      lc.fillText("Erase", 256, 132);
      const labelTex = new THREE.CanvasTexture(labelCanvas);
      labelTex.colorSpace = THREE.SRGBColorSpace;
      labelTex.anisotropy = 4;
      const label = new THREE.Mesh(
        new THREE.PlaneGeometry(0.5, 0.25),
        new THREE.MeshBasicMaterial({ map: labelTex, transparent: true, toneMapped: false }),
      );
      label.position.set(0.23, 0, 0.1635);
      body.add(label);

      const shadowCanvas = document.createElement("canvas");
      shadowCanvas.width = shadowCanvas.height = 128;
      const sc = shadowCanvas.getContext("2d")!;
      const g = sc.createRadialGradient(64, 64, 0, 64, 64, 64);
      g.addColorStop(0, "rgba(0,0,0,0.55)");
      g.addColorStop(1, "rgba(0,0,0,0)");
      sc.fillStyle = g;
      sc.fillRect(0, 0, 128, 128);
      const shadowMat = new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(shadowCanvas), transparent: true, depthWrite: false });
      const shadow = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), shadowMat);
      scene.add(shadow);
      scene.add(eraser);

      // ── Crumbs. Real eraser crumbs are rolled little worms, torn chunks and thin
      // flakes, never two alike. A few hand-made shapes, each instance scaled and
      // coloured differently, is enough to stop the eye finding a pattern.
      const hash3 = (x: number, y: number, z: number, s: number) => {
        const h = Math.sin(x * 12.9898 + y * 78.233 + z * 37.719 + s * 19.19) * 43758.5453;
        return h - Math.floor(h);
      };
      const lumpy = (geo: Parameters<typeof mergeVertices>[0], amp: number, seed: number) => {
        geo.deleteAttribute("uv");
        geo.deleteAttribute("normal");
        const merged = mergeVertices(geo);
        const pos = merged.attributes.position;
        const v = new THREE.Vector3();
        for (let i = 0; i < pos.count; i++) {
          v.fromBufferAttribute(pos, i);
          const n = hash3(Math.round(v.x * 40), Math.round(v.y * 40), Math.round(v.z * 40), seed) - 0.5;
          const n2 = Math.sin(v.x * 7 + seed) * Math.sin(v.y * 5 - seed) * 0.5;
          v.multiplyScalar(1 + (n + n2 * 0.6) * amp);
          pos.setXYZ(i, v.x, v.y, v.z);
        }
        merged.computeVertexNormals();
        return merged;
      };
      const rolled = (bend: number, seed: number) => {
        const geo = new THREE.CapsuleGeometry(0.2, 0.75, 3, 7);
        geo.rotateZ(Math.PI / 2);
        const pos = geo.attributes.position;
        const R = 1 / bend;
        for (let i = 0; i < pos.count; i++) {
          let x = pos.getX(i);
          let y = pos.getY(i);
          let z = pos.getZ(i);
          // Taper the ends, then curl it round like a rolled crumb.
          const taper = 1 - Math.pow(Math.min(1, Math.abs(x) / 0.6), 2) * 0.45;
          y *= taper;
          z *= taper * (0.85 + 0.15 * Math.sin(x * 9 + seed));
          const a = x / R;
          x = (R - y) * Math.sin(a);
          y = R - (R - y) * Math.cos(a);
          pos.setXYZ(i, x, y, z);
        }
        return lumpy(geo, 0.16, seed);
      };
      const chunk = (seed: number) => lumpy(new THREE.IcosahedronGeometry(0.5, 1), 0.34, seed);
      const flake = (seed: number) => {
        const geo = new THREE.IcosahedronGeometry(0.5, 1);
        geo.scale(1.1, 0.32, 0.85);
        return lumpy(geo, 0.28, seed);
      };

      const crumbMat = new THREE.MeshStandardMaterial({ roughness: 0.92, metalness: 0 });
      const kinds = [
        { geo: rolled(1.1, 1), weight: 0.24, flat: false, roll: true },
        { geo: rolled(2.4, 2), weight: 0.16, flat: false, roll: true },
        { geo: chunk(3), weight: 0.2, flat: false, roll: false },
        { geo: chunk(4), weight: 0.16, flat: false, roll: false },
        { geo: flake(5), weight: 0.24, flat: true, roll: false },
      ];
      const PER = 90;
      const zero = new THREE.Matrix4().makeScale(0, 0, 0);
      const meshes = kinds.map((k) => {
        const m = new THREE.InstancedMesh(k.geo, crumbMat, PER);
        m.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
        m.frustumCulled = false;
        for (let i = 0; i < PER; i++) {
          m.setMatrixAt(i, zero);
          m.setColorAt(i, new THREE.Color(0x79c8ee));
        }
        scene.add(m);
        return m;
      });

      type Crumb = {
        alive: boolean;
        p: InstanceType<typeof THREE.Vector3>;
        v: InstanceType<typeof THREE.Vector3>;
        q: InstanceType<typeof THREE.Quaternion>;
        w: InstanceType<typeof THREE.Vector3>;
        sc: InstanceType<typeof THREE.Vector3>;
        size: number;
        grav: number;
        drag: number;
        cling: number;
        flutter: number;
        freq: number;
        phase: number;
        age: number;
        seed: number;
      };
      const crumbs: Crumb[][] = kinds.map(() =>
        Array.from({ length: PER }, () => ({
          alive: false,
          p: new THREE.Vector3(),
          v: new THREE.Vector3(),
          q: new THREE.Quaternion(),
          w: new THREE.Vector3(),
          sc: new THREE.Vector3(1, 1, 1),
          size: 1,
          grav: 2000,
          drag: 0.001,
          cling: 0,
          flutter: 0,
          freq: 0,
          phase: 0,
          age: 0,
          seed: 0,
        })),
      );
      const cursors = kinds.map(() => 0);
      const rubberBlue = new THREE.Color(0x6cbfe8);
      const graphite = new THREE.Color(0x44474d);
      const paperDust = new THREE.Color(0x8e9198);
      const col = new THREE.Color();
      const pickKind = () => {
        let r = Math.random();
        for (let i = 0; i < kinds.length; i++) {
          r -= kinds[i].weight;
          if (r <= 0) return i;
        }
        return 0;
      };

      const toWorld = (x: number, y: number) => new THREE.Vector3(x - W / 2, H / 2 - y, 0);

      // ── State
      const pos = new THREE.Vector3(0, -H, 0);
      const vel = new THREE.Vector3();
      const prevVel = new THREE.Vector3();
      const acc = new THREE.Vector3();
      const tPrev = new THREE.Vector3();
      const tVel = new THREE.Vector3();
      const tmp = new THREE.Vector3();
      const lean: Spring = { x: 0, v: 0 };
      const pitch: Spring = { x: 0, v: 0 };
      const yaw: Spring = { x: 0, v: 0 };
      const squash: Spring = { x: 0, v: 0 };
      const lift: Spring = { x: 300, v: 0 };
      let vis = 0;
      let wasActive = false;
      let dirX = 0;
      let idleFrames = 0;
      let last = performance.now();
      let lastScroll = window.scrollY;
      let raf = 0;
      const m4 = new THREE.Matrix4();
      const dq = new THREE.Quaternion();
      const axis = new THREE.Vector3();
      const drawPos = new THREE.Vector3();

      const html = document.documentElement;
      html.dataset.stage = "ready";

      const spawn = (bx: number, by: number, n: number, dx: number, dy: number, L: number, size: number) => {
        const wp = toWorld(bx, by);
        // Direction of travel in world space (y up).
        let ux = dx;
        let uy = -dy;
        let len = Math.hypot(ux, uy);
        if (len < 1e-3) {
          ux = vel.x;
          uy = vel.y;
          len = Math.hypot(ux, uy);
        }
        if (len < 1e-3) {
          ux = Math.random() < 0.5 ? -1 : 1;
          uy = 0;
          len = 1;
        }
        ux /= len;
        uy /= len;
        const px = -uy;
        const py = ux;
        const speed = Math.min(1600, vel.length());
        wear.value = Math.min(0.85, wear.value + n * 0.0012);

        for (let k = 0; k < n; k++) {
          const kind = pickKind();
          const slot = cursors[kind];
          cursors[kind] = (slot + 1) % PER;
          const c = crumbs[kind][slot];
          const spec = kinds[kind];
          c.alive = true;
          c.age = 0;
          c.seed = Math.random() * 100;
          // Crumbs peel off along the width of the rubber, mostly at the edge it's moving towards.
          const along = (Math.random() - 0.5) * L * 0.42;
          const ahead = (Math.random() - 0.3) * L * 0.16;
          c.p.set(wp.x + px * along + ux * ahead, wp.y + py * along + uy * ahead, 4 + Math.random() * 14);
          // Many tiny, a few big.
          c.size = (1.8 + Math.pow(Math.random(), 2.6) * 10) * Math.sqrt(size);
          const s = c.size;
          if (spec.roll) c.sc.set(s * (1 + Math.random() * 0.7), s * (0.7 + Math.random() * 0.5), s * (0.7 + Math.random() * 0.5));
          else if (spec.flat) c.sc.set(s * (0.9 + Math.random() * 0.6), s * (0.8 + Math.random() * 0.5), s * (0.8 + Math.random() * 0.6));
          else c.sc.set(s * (0.75 + Math.random() * 0.55), s * (0.6 + Math.random() * 0.5), s * (0.65 + Math.random() * 0.5));

          const flick = 50 + Math.pow(Math.random(), 1.6) * 380;
          c.v.set(
            ux * flick * (0.4 + Math.random() * 0.6) + px * (Math.random() - 0.5) * 240 + vel.x * 0.18,
            uy * flick * (0.4 + Math.random() * 0.6) + py * (Math.random() - 0.5) * 240 + vel.y * 0.18 + 20 + Math.random() * 190,
            30 + Math.random() * Math.random() * 320,
          );
          // Some stick to the paper for a moment, rolling under the rubber, before they drop.
          c.cling = Math.random() < 0.38 ? 0.05 + Math.pow(Math.random(), 2) * 0.75 : 0;
          if (c.cling) c.v.multiplyScalar(0.55).setZ(0);
          c.grav = 1750 + Math.random() * 650;
          c.drag = (spec.flat ? 0.0024 : 0.0009) * Math.sqrt(6 / s) * (0.8 + Math.random() * 0.4);
          c.flutter = spec.flat ? 500 + Math.random() * 900 : 0;
          c.freq = 6 + Math.random() * 9;
          c.phase = Math.random() * 6.28;
          axis.set(Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5).normalize();
          c.w.copy(axis).multiplyScalar(3 + Math.random() * (spec.flat ? 10 : 20) + speed * 0.004);
          c.q.setFromEuler(new THREE.Euler(Math.random() * 6.28, Math.random() * 6.28, Math.random() * 6.28));

          const dirt = Math.pow(Math.random(), 1.4);
          if (Math.random() < 0.06) col.copy(paperDust);
          else col.copy(rubberBlue).lerp(graphite, dirt * 0.8);
          col.multiplyScalar(0.82 + Math.random() * 0.3);
          meshes[kind].setColorAt(slot, col);
          meshes[kind].instanceColor!.needsUpdate = true;
        }
      };

      const frame = (now: number) => {
        raf = requestAnimationFrame(frame);
        const dt = Math.min(0.05, (now - last) / 1000);
        last = now;
        const time = now * 0.001;
        const st = eraserBus.state;
        const active = eraserBus.active();
        const target = toWorld(st.x, st.y);
        const scrollDy = window.scrollY - lastScroll;
        lastScroll = window.scrollY;

        if (active && !wasActive && vis < 0.05) {
          // Picked up from somewhere off to the side, not materialised in place.
          pos.copy(target).add(tmp.set(90, 140, 0));
          vel.set(-300, -420, 0);
          tPrev.copy(target);
          tVel.set(0, 0, 0);
          lift.x = 220;
        }
        wasActive = active;

        // Where the hand is heading, and how fast. Jumps (a new owner) carry no velocity.
        if (target.distanceTo(tPrev) > 240) tVel.set(0, 0, 0);
        else tVel.lerp(tmp.subVectors(target, tPrev).divideScalar(Math.max(dt, 1e-3)), 1 - Math.exp(-dt * 20));
        tVel.clampLength(0, 5000);
        tPrev.copy(target);

        // Spring toward the contact point. While rubbing it's stiff and fed the hand's
        // velocity, so it sits exactly on the stroke; at rest it's loose and floats.
        const press = active ? st.pressure : 0;
        const firm = Math.min(1, press * 1.4);
        const w = 9 + 61 * firm;
        const zeta = 0.6 + 0.4 * firm;
        prevVel.copy(vel);
        const steps = Math.ceil(dt / (1 / 240));
        const h = dt / steps;
        for (let i = 0; i < steps; i++) {
          acc.subVectors(target, pos).multiplyScalar(w * w);
          acc.addScaledVector(tmp.copy(tVel).multiplyScalar(firm).sub(vel), 2 * zeta * w);
          vel.addScaledVector(acc, h);
          pos.addScaledVector(vel, h);
        }
        vis += ((active ? 1 : 0) - vis) * (1 - Math.exp(-dt * (active ? 12 : 6)));

        const speed = Math.min(vel.length(), 3000);
        acc.subVectors(vel, prevVel).divideScalar(Math.max(dt, 1e-3));
        // The rubber drags on the paper, so the top leans ahead of the contact point
        // and overshoots a little when the stroke turns.
        spring(lean, THREE.MathUtils.clamp(-vel.x * 0.00034, -0.5, 0.5), 15, 0.42, dt);
        spring(pitch, THREE.MathUtils.clamp(vel.y * 0.0003, -0.38, 0.38), 14, 0.45, dt);
        spring(yaw, THREE.MathUtils.clamp(-acc.x * 0.000018, -0.28, 0.28), 11, 0.5, dt);
        // Reversals squash it: that's where the pressure peaks.
        if (press > 0.3 && Math.abs(vel.x) > 160 && dirX !== 0 && Math.sign(vel.x) !== dirX) squash.v += 3.2 * press;
        if (Math.abs(vel.x) > 60) dirX = Math.sign(vel.x);
        spring(squash, press, 22, 0.35, dt);
        const hover = press < 0.05 ? Math.sin(time * 1.7) * 7 + 18 : 0;
        spring(lift, (1 - vis) * 320 + (1 - Math.min(1, press)) * 28 + hover, 10, 0.7, dt);

        // Stick-slip chatter: a fast, irregular shiver while it's pressed and moving.
        const chat = press * Math.min(1, speed / 900) * 0.03;
        const jx = chat * (Math.sin(time * 83) + 0.6 * Math.sin(time * 131 + 1.7));
        const jz = chat * (Math.cos(time * 97 + 0.4) + 0.5 * Math.sin(time * 151));

        const L = Math.max(110, Math.min(230, W * 0.125)) * st.size;
        const sq = THREE.MathUtils.clamp(squash.x, -0.2, 1.6);
        drawPos.set(pos.x, pos.y, 40 - sq * 28 + lift.x);
        eraser.position.copy(drawPos);
        eraser.scale.setScalar(L * (0.45 + 0.55 * vis));
        eraser.rotation.set(
          -0.62 + pitch.x + jx + (1 - vis) * 0.35,
          0.5 + lean.x * 0.6 + yaw.x,
          -0.55 + lean.x + jz - (1 - vis) * 0.25,
        );
        body.scale.set(1 + sq * 0.025, 1 + sq * 0.015, 1 - sq * 0.1);

        const hgt = Math.max(0, lift.x);
        shadow.position.set(pos.x + L * 0.22 + hgt * 0.35, pos.y - L * 0.3 - hgt * 0.4, -20);
        shadow.scale.set(L * (1.45 + hgt * 0.004), L * (0.85 + hgt * 0.003), 1);
        shadowMat.opacity = 0.6 * vis * Math.max(0.15, 1 - hgt / 260) * (0.65 + Math.min(1, press) * 0.35);
        eraser.visible = vis > 0.01;
        shadow.visible = eraser.visible;

        // Spawn
        while (st.queue.length) {
          const b = st.queue.shift()!;
          spawn(b.x, b.y, b.n, b.dx, b.dy ?? 0, L, st.size);
        }

        let alive = 0;
        const floor = -H / 2 - 80;
        for (let kind = 0; kind < kinds.length; kind++) {
          const list = crumbs[kind];
          const mesh = meshes[kind];
          const roll = kinds[kind].roll;
          for (let i = 0; i < PER; i++) {
            const c = list[i];
            if (!c.alive) continue;
            c.age += dt;
            if (c.cling > 0) {
              // On the paper: friction bleeds the speed off, it rolls, it rides the scroll.
              c.cling -= dt;
              c.v.x *= Math.exp(-dt * 7);
              c.v.y = c.v.y * Math.exp(-dt * 7) - 160 * dt;
              c.p.y += scrollDy;
              const sp = Math.hypot(c.v.x, c.v.y);
              if (roll && sp > 5) c.w.set(-c.v.y, c.v.x, 0).multiplyScalar(1 / (c.size * 0.45));
              else c.w.multiplyScalar(Math.exp(-dt * 6));
              if (c.cling <= 0) {
                c.v.z = 40 + Math.random() * 200;
                c.v.y += 30 + Math.random() * 90;
                axis.set(Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5).normalize();
                c.w.addScaledVector(axis, 4 + Math.random() * 12);
              }
            } else {
              const sp = c.v.length();
              c.v.y -= c.grav * dt;
              // Quadratic air drag: small and flat bits hit terminal speed early.
              const k = Math.min(0.9, c.drag * sp * dt);
              c.v.multiplyScalar(1 - k);
              // Flakes see-saw as they fall; everything drifts a little on the air.
              if (c.flutter) {
                c.phase += dt * c.freq;
                const f = Math.cos(c.phase) * c.flutter * Math.min(1, Math.abs(c.v.y) / 500);
                c.v.x += f * dt;
                c.w.z += f * 0.004 * dt;
              }
              c.v.x += Math.sin(c.p.y * 0.011 + time * 1.3 + c.seed) * 150 * dt;
              c.v.z += Math.cos(c.p.x * 0.009 + time * 0.9 + c.seed) * 40 * dt;
              c.w.multiplyScalar(Math.exp(-dt * 0.3));
            }
            c.p.addScaledVector(c.v, dt);
            const wl = c.w.length();
            if (wl > 1e-4) {
              dq.setFromAxisAngle(axis.copy(c.w).divideScalar(wl), wl * dt);
              c.q.premultiply(dq);
            }
            if (c.p.y < floor || c.p.z > 900 || Math.abs(c.p.x) > W / 2 + 200 || c.age > 7) {
              c.alive = false;
              mesh.setMatrixAt(i, zero);
              continue;
            }
            alive++;
            // Pops into existence over a few frames rather than appearing full size.
            const grow = Math.min(1, 0.35 + c.age * 14);
            m4.compose(c.p, c.q, tmp.copy(c.sc).multiplyScalar(grow));
            mesh.setMatrixAt(i, m4);
          }
          mesh.instanceMatrix.needsUpdate = true;
        }

        // Nothing on screen: render one clear frame, then idle.
        if (!eraser.visible && alive === 0) {
          if (idleFrames++ > 1) return;
        } else idleFrames = 0;
        renderer.render(scene, camera);
      };
      raf = requestAnimationFrame(frame);

      cleanup = () => {
        cancelAnimationFrame(raf);
        window.removeEventListener("resize", resize);
        delete html.dataset.stage;
        kinds.forEach((k) => k.geo.dispose());
        renderer.dispose();
        pmrem.dispose();
        renderer.domElement.remove();
      };
    })();

    return () => {
      disposed = true;
      cleanup();
    };
  }, []);

  return <div ref={hostRef} className="stage3d" aria-hidden="true" />;
}
