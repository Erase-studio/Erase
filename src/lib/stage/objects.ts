import * as THREE from "three";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";

/**
 * The studio's tools, modelled in code: rubber erasers, the black "Erase" sleeve,
 * and hexagonal pencils. Units: an eraser is 1 long.
 */

export const PALETTE = {
  paper: new THREE.Color("#ecebe6"),
  graphite: new THREE.Color("#141517"),
  blue: new THREE.Color("#2448ff"),
  mist: new THREE.Color("#b9bcc4"),
};

export const ERASER = { x: 1, y: 0.44, z: 0.28 };
export const PENCIL = { len: 3.1, r: 0.13 };

export function eraserGeometry() {
  return new RoundedBoxGeometry(ERASER.x, ERASER.y, ERASER.z, 4, 0.08);
}

/** The cardboard sleeve, covering the back 58% of a sleeved eraser. */
export function sleeveGeometry() {
  const g = new RoundedBoxGeometry(ERASER.x * 0.58, ERASER.y * 1.06, ERASER.z * 1.1, 2, 0.02);
  g.translate(ERASER.x * 0.21, 0, 0);
  return g;
}

export function sleeveTexture(family: string) {
  const c = document.createElement("canvas");
  c.width = 512;
  c.height = 256;
  const x = c.getContext("2d")!;
  x.fillStyle = "#141517";
  x.fillRect(0, 0, 512, 256);
  x.fillStyle = "#ecebe6";
  x.textAlign = "center";
  x.textBaseline = "middle";
  x.font = `600 118px ${family}`;
  (x as CanvasRenderingContext2D & { letterSpacing?: string }).letterSpacing = "-6px";
  x.fillText("Erase", 256, 136);
  x.fillStyle = "#2448ff";
  x.fillRect(0, 226, 512, 30);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  return t;
}

/** Hexagonal body along +x, from the ferrule end to where the wood starts. */
export function pencilBodyGeometry() {
  const g = new THREE.CylinderGeometry(PENCIL.r, PENCIL.r, PENCIL.len * 0.84, 6, 1);
  g.rotateZ(-Math.PI / 2);
  g.translate(-PENCIL.len * 0.08, 0, 0);
  return g;
}

/** Sharpened end: bare wood cone, then the graphite point. Vertex-coloured. */
export function pencilTipGeometry() {
  const woodLen = PENCIL.len * 0.12;
  const leadLen = PENCIL.len * 0.04;
  const wood = new THREE.CylinderGeometry(PENCIL.r * 0.3, PENCIL.r, woodLen, 6, 1);
  wood.rotateZ(-Math.PI / 2);
  wood.translate(PENCIL.len * 0.34 + woodLen / 2, 0, 0);
  const lead = new THREE.ConeGeometry(PENCIL.r * 0.3, leadLen, 6, 1);
  lead.rotateZ(-Math.PI / 2);
  lead.translate(PENCIL.len * 0.34 + woodLen + leadLen / 2, 0, 0);
  const paint = (g: THREE.BufferGeometry, c: THREE.Color) => {
    const n = g.attributes.position.count;
    const arr = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) arr.set([c.r, c.g, c.b], i * 3);
    g.setAttribute("color", new THREE.BufferAttribute(arr, 3));
    return g;
  };
  return mergeGeometries([paint(wood, new THREE.Color("#d8b98c")), paint(lead, new THREE.Color("#2a2b2e"))])!;
}

export function materials(env: THREE.Texture, family: string) {
  const rubber = new THREE.MeshPhysicalMaterial({
    roughness: 0.62,
    sheen: 0.4,
    sheenRoughness: 0.8,
    sheenColor: new THREE.Color("#ffffff"),
    envMap: env,
    envMapIntensity: 0.9,
  });
  const sleeve = new THREE.MeshPhysicalMaterial({
    map: sleeveTexture(family),
    roughness: 0.3,
    clearcoat: 0.8,
    clearcoatRoughness: 0.2,
    envMap: env,
    envMapIntensity: 1,
  });
  const lacquer = new THREE.MeshPhysicalMaterial({
    roughness: 0.22,
    clearcoat: 1,
    clearcoatRoughness: 0.12,
    envMap: env,
    envMapIntensity: 1.1,
    flatShading: true,
  });
  const tip = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.55, envMap: env, flatShading: true });
  return { rubber, sleeve, lacquer, tip };
}
