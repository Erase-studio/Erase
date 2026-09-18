import * as THREE from "three";
import { sound } from "@/lib/sound";
import { pixelCamera, type Frame, type Shared, type View } from "./Stage";
import { drawTemplate } from "./drawTemplate";

const noise = /* glsl */ `
vec3 mod289(vec3 x){return x-floor(x*(1./289.))*289.;}
vec4 mod289(vec4 x){return x-floor(x*(1./289.))*289.;}
vec4 permute(vec4 x){return mod289(((x*34.)+10.)*x);}
vec4 taylorInvSqrt(vec4 r){return 1.79284291400159-.85373472095314*r;}
float snoise(vec3 v){
  const vec2 C=vec2(1./6.,1./3.);const vec4 D=vec4(0.,.5,1.,2.);
  vec3 i=floor(v+dot(v,C.yyy));vec3 x0=v-i+dot(i,C.xxx);
  vec3 g=step(x0.yzx,x0.xyz);vec3 l=1.-g;vec3 i1=min(g.xyz,l.zxy);vec3 i2=max(g.xyz,l.zxy);
  vec3 x1=x0-i1+C.xxx;vec3 x2=x0-i2+C.yyy;vec3 x3=x0-D.yyy;i=mod289(i);
  vec4 p=permute(permute(permute(i.z+vec4(0.,i1.z,i2.z,1.))+i.y+vec4(0.,i1.y,i2.y,1.))+i.x+vec4(0.,i1.x,i2.x,1.));
  float n_=.142857142857;vec3 ns=n_*D.wyz-D.xzx;vec4 j=p-49.*floor(p*ns.z*ns.z);
  vec4 x_=floor(j*ns.z);vec4 y_=floor(j-7.*x_);vec4 x=x_*ns.x+ns.yyyy;vec4 y=y_*ns.x+ns.yyyy;
  vec4 h=1.-abs(x)-abs(y);vec4 b0=vec4(x.xy,y.xy);vec4 b1=vec4(x.zw,y.zw);
  vec4 s0=floor(b0)*2.+1.;vec4 s1=floor(b1)*2.+1.;vec4 sh=-step(h,vec4(0.));
  vec4 a0=b0.xzyw+s0.xzyw*sh.xxyy;vec4 a1=b1.xzyw+s1.xzyw*sh.zzww;
  vec3 p0=vec3(a0.xy,h.x);vec3 p1=vec3(a0.zw,h.y);vec3 p2=vec3(a1.xy,h.z);vec3 p3=vec3(a1.zw,h.w);
  vec4 norm=taylorInvSqrt(vec4(dot(p0,p0),dot(p1,p1),dot(p2,p2),dot(p3,p3)));
  p0*=norm.x;p1*=norm.y;p2*=norm.z;p3*=norm.w;
  vec4 m=max(.5-vec4(dot(x0,x0),dot(x1,x1),dot(x2,x2),dot(x3,x3)),0.);m=m*m;
  return 105.*dot(m*m,vec4(dot(p0,x0),dot(p1,x1),dot(p2,x2),dot(p3,x3)));
}
// Sharp creases: folded noise, several scales.
float creases(vec3 p){
  float a = 1.0 - abs(snoise(p * 1.7));
  float b = 1.0 - abs(snoise(p * 3.9 + 7.1));
  float c = 1.0 - abs(snoise(p * 8.3 - 3.7));
  return a * 0.55 + b * 0.3 + c * 0.15;
}
`;

/**
 * The template, printed on a sheet. Scroll and it creases, folds in on itself,
 * becomes a ball of paper, and gets thrown out of frame. Faceted shading comes
 * from the folded geometry itself (flat normals), so every crease catches light.
 */
export class CrumpleView implements View {
  order = 1;
  private scene = new THREE.Scene();
  private camera = pixelCamera(1, 1);
  private mesh: THREE.Mesh;
  private shadow: THREE.Mesh;
  private uniforms = { uC: { value: 0 }, uW: { value: 100 }, uH: { value: 60 }, uTime: { value: 0 } };
  private tex: THREE.CanvasTexture;
  private progress = 0;

  constructor(
    public el: HTMLElement,
    private slot: HTMLElement,
    shared: Shared,
  ) {
    const c = document.createElement("canvas");
    c.width = 1600;
    c.height = 1000;
    drawTemplate(c.getContext("2d")!, 1600, 1000, 1);
    this.tex = new THREE.CanvasTexture(c);
    this.tex.colorSpace = THREE.SRGBColorSpace;
    this.tex.anisotropy = 8;

    const geo = new THREE.PlaneGeometry(1, 1, 90, 56);
    const mat = new THREE.MeshStandardMaterial({
      map: this.tex,
      roughness: 0.82,
      side: THREE.DoubleSide,
      flatShading: true,
      envMap: shared.env,
      envMapIntensity: 0.55,
    });
    mat.onBeforeCompile = (s) => {
      Object.assign(s.uniforms, this.uniforms);
      s.vertexShader = s.vertexShader
        .replace(
          "#include <common>",
          `#include <common>
          uniform float uC; uniform float uW; uniform float uH; uniform float uTime;
          ${noise}`,
        )
        .replace(
          "#include <begin_vertex>",
          `// Flat sheet in px.
          vec3 sheet = vec3(position.x * uW, position.y * uH, 0.0);
          vec2 st = position.xy + 0.5;
          vec3 q = vec3(st * vec2(uW / uH, 1.0) * 1.3, 0.0);
          float cr = creases(q);
          float s1 = smoothstep(0.0, 0.55, uC);
          float s2 = smoothstep(0.3, 1.0, uC);
          float m = min(uW, uH);
          // Stage 1: creases rise and the sheet draws in on itself.
          vec3 p1 = sheet;
          p1.xy *= 1.0 - 0.42 * s1 * (0.7 + 0.6 * cr);
          p1.z += (cr - 0.55) * m * 0.34 * s1 + snoise(q * 0.8 + 3.0) * m * 0.18 * s1;
          // Stage 2: wrapped onto a lumpy sphere, the creases pushed in and out.
          float th = st.x * 6.2831853 + snoise(q * 0.5) * 0.9;
          float ph = st.y * 3.1415926;
          vec3 dir = vec3(sin(ph) * cos(th), -cos(ph), sin(ph) * sin(th));
          vec3 p2 = dir * m * 0.21 * (0.82 + 0.34 * cr + 0.12 * snoise(dir * 3.0));
          vec3 transformed = mix(p1, p2, s2);`,
        );
    };
    this.mesh = new THREE.Mesh(geo, mat);
    this.mesh.frustumCulled = false;

    // A soft contact shadow that tightens as the sheet becomes a ball.
    const sc = document.createElement("canvas");
    sc.width = sc.height = 128;
    const x = sc.getContext("2d")!;
    const g = x.createRadialGradient(64, 64, 0, 64, 64, 64);
    g.addColorStop(0, "rgba(20,21,23,0.35)");
    g.addColorStop(1, "rgba(20,21,23,0)");
    x.fillStyle = g;
    x.fillRect(0, 0, 128, 128);
    this.shadow = new THREE.Mesh(
      new THREE.PlaneGeometry(1, 1),
      new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(sc), transparent: true, depthWrite: false, toneMapped: false }),
    );
    this.scene.add(this.shadow, this.mesh);
    const key = new THREE.DirectionalLight(0xffffff, 2.6);
    key.position.set(-0.5, 0.7, 1);
    this.scene.add(key, new THREE.HemisphereLight(0xffffff, 0x8d93a1, 0.8));
  }

  update(f: Frame) {
    const { rect } = f;
    pixelCamera(rect.width, rect.height, this.camera);
    const sec = this.el.parentElement!.getBoundingClientRect();
    const raw = Math.min(1, Math.max(0, -sec.top / Math.max(1, sec.height - f.vh)));
    const was = this.progress;
    this.progress += (raw - this.progress) * (f.reduced ? 1 : 1 - Math.exp(-f.dt * 9));
    const p = this.progress;
    if (!f.reduced) {
      // Crushing (either way) creases the paper; the throw goes whoosh once.
      const crush = Math.abs(Math.min(0.56, Math.max(0.1, p)) - Math.min(0.56, Math.max(0.1, was)));
      if (crush > 0) sound.crinkle(crush * 260);
      if (was < 0.6 && p >= 0.6) sound.whoosh(0.9, 0.8, 0.6);
    }

    const s = this.slot.getBoundingClientRect();
    const cx = s.left + s.width / 2 - (rect.left + rect.width / 2);
    const cy = -(s.top + s.height / 2 - (rect.top + rect.height / 2));
    this.uniforms.uW.value = s.width;
    this.uniforms.uH.value = s.height;
    this.uniforms.uTime.value = f.time;

    // 0 – .1 flat, .1 – .56 crumple, .58 – .82 thrown.
    const c = Math.min(1, Math.max(0, (p - 0.1) / 0.46));
    const eC = c * c * (3 - 2 * c);
    this.uniforms.uC.value = eC;
    const toss = Math.min(1, Math.max(0, (p - 0.58) / 0.24));
    const arc = toss * toss;
    this.mesh.position.set(cx + arc * rect.width * 0.62, cy + Math.sin(toss * Math.PI) * rect.height * 0.28 - arc * rect.height * 0.35, toss * 240);
    this.mesh.rotation.set(-0.35 * (1 - eC) + toss * 3.2, 0.25 * (1 - eC) + eC * 0.9 + toss * 5, eC * 0.6 + toss * 2.4);
    this.mesh.visible = toss < 0.999;

    const ball = Math.min(s.width, s.height) * 0.21;
    const sw = THREE.MathUtils.lerp(s.width * 1.08, ball * 2.6, eC);
    const sh = THREE.MathUtils.lerp(s.height * 1.08, ball * 1.1, eC);
    this.shadow.scale.set(sw, sh, 1);
    this.shadow.position.set(cx + 18 * (1 - eC), cy - 26 - eC * ball * 1.05, -60);
    (this.shadow.material as THREE.MeshBasicMaterial).opacity = (1 - toss) * (0.7 + eC * 0.3);
  }

  warm(r: THREE.WebGLRenderer) {
    r.compile(this.scene, this.camera);
    this.scene.traverse((o) => {
      const m = (o as THREE.Mesh).material as THREE.Material & { map?: THREE.Texture; uniforms?: Record<string, { value: unknown }> };
      if (m?.map) r.initTexture(m.map);
      const t = m?.uniforms?.uMap?.value;
      if (t instanceof THREE.Texture) r.initTexture(t);
    });
  }

  render(r: THREE.WebGLRenderer) {
    r.render(this.scene, this.camera);
  }

  dispose() {
    this.mesh.geometry.dispose();
    (this.mesh.material as THREE.Material).dispose();
    this.tex.dispose();
    this.shadow.geometry.dispose();
    (this.shadow.material as THREE.MeshBasicMaterial).map?.dispose();
    (this.shadow.material as THREE.Material).dispose();
  }
}
