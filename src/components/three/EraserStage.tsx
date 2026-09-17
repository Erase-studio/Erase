"use client";

import { useEffect, useRef } from "react";
import { eraserBus } from "@/lib/eraserBus";

/**
 * A fixed, click-through WebGL layer holding one physical eraser and its crumbs.
 * World units are viewport pixels (camera distance is solved so 1 unit = 1px at z=0),
 * so any DOM code can drive it with clientX/clientY. Three.js loads lazily.
 */
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
      const rubber = new THREE.Mesh(
        new RoundedBoxGeometry(1, 0.52, 0.3, 5, 0.09),
        new THREE.MeshPhysicalMaterial({
          color: 0x5cb6e4,
          roughness: 0.78,
          sheen: 0.25,
          sheenColor: new THREE.Color(0xd8f1ff),
          sheenRoughness: 0.9,
        }),
      );
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
      const shadow = new THREE.Mesh(
        new THREE.PlaneGeometry(1, 1),
        new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(shadowCanvas), transparent: true, depthWrite: false }),
      );
      scene.add(shadow);
      scene.add(eraser);

      // ── Crumbs: instanced, with gravity and spin.
      const MAX = 420;
      const crumbGeo = new THREE.IcosahedronGeometry(0.5, 0);
      const crumbMat = new THREE.MeshStandardMaterial({ roughness: 0.85, metalness: 0 });
      const crumbs = new THREE.InstancedMesh(crumbGeo, crumbMat, MAX);
      crumbs.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
      crumbs.frustumCulled = false;
      const palette = [0x79c8ee, 0x8fd3f2, 0x6ab6dc, 0x8b8e94, 0x55585e].map((c) => new THREE.Color(c));
      const parts = Array.from({ length: MAX }, () => ({
        alive: false,
        p: new THREE.Vector3(),
        v: new THREE.Vector3(),
        r: new THREE.Euler(),
        rv: new THREE.Vector3(),
        s: 1,
        life: 0,
      }));
      let cursor = 0;
      const m4 = new THREE.Matrix4();
      const q = new THREE.Quaternion();
      const sv = new THREE.Vector3();
      const zero = new THREE.Matrix4().makeScale(0, 0, 0);
      for (let i = 0; i < MAX; i++) {
        crumbs.setMatrixAt(i, zero);
        crumbs.setColorAt(i, palette[i % palette.length]);
      }
      scene.add(crumbs);

      const toWorld = (x: number, y: number) => new THREE.Vector3(x - W / 2, H / 2 - y, 0);

      // ── State
      const pos = new THREE.Vector3(0, -H, 0);
      const prev = new THREE.Vector3();
      const vel = new THREE.Vector3();
      let vis = 0;
      let wasActive = false;
      let lean = 0;
      let pitch = 0;
      let rubPhase = 0;
      let idleFrames = 0;
      let last = performance.now();
      let raf = 0;

      const html = document.documentElement;
      html.dataset.stage = "ready";

      const frame = (now: number) => {
        raf = requestAnimationFrame(frame);
        const dt = Math.min(0.05, (now - last) / 1000);
        last = now;
        const st = eraserBus.state;
        const active = eraserBus.active();
        const target = toWorld(st.x, st.y);

        if (active && !wasActive && vis < 0.05) pos.copy(target).add(new THREE.Vector3(60, 90, 0));
        wasActive = active;

        prev.copy(pos);
        pos.lerp(target, 1 - Math.exp(-dt * (active ? 22 : 6)));
        vel.subVectors(pos, prev).divideScalar(Math.max(dt, 1e-3));
        vis += ((active ? 1 : 0) - vis) * (1 - Math.exp(-dt * (active ? 14 : 7)));

        const speed = Math.min(vel.length(), 3000);
        rubPhase += dt * (8 + speed * 0.02);
        lean += (THREE.MathUtils.clamp(-vel.x * 0.00035, -0.45, 0.45) - lean) * (1 - Math.exp(-dt * 10));
        pitch += (THREE.MathUtils.clamp(vel.y * 0.0003, -0.35, 0.35) - pitch) * (1 - Math.exp(-dt * 10));

        const L = Math.max(110, Math.min(230, W * 0.125)) * st.size;
        const press = st.pressure * vis;
        eraser.position.set(pos.x, pos.y, 40 - press * 30 + (1 - vis) * 260);
        eraser.scale.setScalar(L * (0.35 + 0.65 * vis));
        // Held at an angle, like mid-rub; leans into the stroke and wobbles with pressure.
        eraser.rotation.set(
          -0.62 + pitch + Math.sin(rubPhase) * 0.05 * press,
          0.5 + lean * 0.6,
          -0.55 + lean + Math.cos(rubPhase * 0.5) * 0.04 * press,
        );
        body.scale.set(1, 1, 1 - press * 0.08);

        shadow.position.set(pos.x + L * 0.22, pos.y - L * 0.3, -20);
        shadow.scale.set(L * (1.5 + (1 - press) * 0.3), L * 0.9, 1);
        (shadow.material as InstanceType<typeof THREE.MeshBasicMaterial>).opacity = 0.55 * vis * (0.6 + press * 0.4);
        eraser.visible = vis > 0.01;
        shadow.visible = eraser.visible;

        // Spawn
        while (st.queue.length) {
          const b = st.queue.shift()!;
          const wp = toWorld(b.x, b.y);
          for (let k = 0; k < b.n; k++) {
            const c = parts[cursor];
            cursor = (cursor + 1) % MAX;
            c.alive = true;
            c.p.set(wp.x + (Math.random() - 0.5) * L * 0.5, wp.y + (Math.random() - 0.5) * L * 0.25, 30 + Math.random() * 40);
            c.v.set(-b.dx * (80 + Math.random() * 220) + (Math.random() - 0.5) * 260, 120 + Math.random() * 260, (Math.random() - 0.2) * 200);
            c.r.set(Math.random() * 6, Math.random() * 6, Math.random() * 6);
            c.rv.set((Math.random() - 0.5) * 14, (Math.random() - 0.5) * 14, (Math.random() - 0.5) * 14);
            c.s = 4 + Math.random() * Math.random() * 12;
            c.life = 1;
          }
        }

        let alive = 0;
        for (let i = 0; i < MAX; i++) {
          const c = parts[i];
          if (!c.alive) continue;
          c.v.y -= 1900 * dt;
          c.v.x *= 1 - dt * 1.5;
          c.p.addScaledVector(c.v, dt);
          c.r.x += c.rv.x * dt;
          c.r.y += c.rv.y * dt;
          c.r.z += c.rv.z * dt;
          c.life -= dt * 0.55;
          if (c.life <= 0 || c.p.y < -H / 2 - 40) {
            c.alive = false;
            crumbs.setMatrixAt(i, zero);
            continue;
          }
          alive++;
          q.setFromEuler(c.r);
          const s = c.s * Math.min(1, c.life * 4);
          sv.set(s, s * 0.7, s * 0.8);
          m4.compose(c.p, q, sv);
          crumbs.setMatrixAt(i, m4);
        }
        crumbs.instanceMatrix.needsUpdate = true;

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
