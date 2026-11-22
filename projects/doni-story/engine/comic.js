// Comic-3D engine v2: lit/flat/normal passes -> toon bands + halftone + ink + grain.
import * as THREE from './three.js';
export { THREE };
export const W = innerWidth, H = innerHeight;
export const renderer = new THREE.WebGLRenderer({ antialias: false, preserveDrawingBuffer: true });
renderer.setSize(W, H); renderer.setPixelRatio(1);
renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputColorSpace = THREE.LinearSRGBColorSpace;
document.body.appendChild(renderer.domElement);
export const camera = new THREE.PerspectiveCamera(35, W / H, 0.05, 400);

let seed = 11; export const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
export const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
export const lerp = (a, b, t) => a + (b - a) * t;
export const ss = (a, b, x) => { const t = clamp((x - a) / (b - a)); return t * t * (3 - 2 * t); };
export const ease = x => x < .5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;

// ---- every mesh carries a lit + flat material; registry per scene ----
export function mats(color, o = {}) {
  const c = new THREE.Color(color);
  const lit = o.glow ? new THREE.MeshBasicMaterial({ color: c.clone().multiplyScalar(o.glowK || 3), map: o.map || null }) : new THREE.MeshLambertMaterial({ color: c, map: o.map || null });
  const flat = new THREE.MeshBasicMaterial({ color: c, map: o.map || null });
  for (const m of [lit, flat]) { if (o.side) m.side = o.side; if (o.opacity != null) { m.transparent = true; m.opacity = o.opacity; m.depthWrite = o.opacity > .9; } }
  return { lit, flat };
}
export function M(geo, color, o = {}) {
  const m = mats(color, o); const mesh = new THREE.Mesh(geo, m.lit);
  mesh.userData.m = m; mesh.userData.noEdge = !!o.noEdge; mesh.userData.glow = !!o.glow; if (o.glow) { mesh.castShadow = false; }
  mesh.castShadow = o.cast !== false; mesh.receiveShadow = o.recv !== false; return mesh;
}
export function setColor(mesh, color) { mesh.userData.m.lit.color.set(color); if (mesh.userData.glow) mesh.userData.m.lit.color.multiplyScalar(3); mesh.userData.m.flat.color.set(color); }
export function setOpacity(mesh, a) { for (const m of [mesh.userData.m.lit, mesh.userData.m.flat]) { m.transparent = true; m.opacity = a; } }
// rounded box via extruded rounded rect with bevel
const rbCache = new Map();
export function rboxGeo(w, h, d, r = .05) {
  const k = [w, h, d, r].map(v => v.toFixed(3)).join(); if (rbCache.has(k)) return rbCache.get(k);
  r = Math.min(r, w / 2 - .001, h / 2 - .001, d / 2 - .001);
  const s = new THREE.Shape(), x = -w / 2 + r, y = -h / 2 + r, ww = w - 2 * r, hh = h - 2 * r, q = r * .0001;
  s.moveTo(x, y); s.lineTo(x + ww, y); s.lineTo(x + ww, y + hh); s.lineTo(x, y + hh); s.lineTo(x, y);
  const g = new THREE.ExtrudeGeometry(s, { depth: Math.max(d - 2 * r, .001), bevelEnabled: true, bevelSize: r, bevelThickness: r, bevelSegments: 3, curveSegments: 4 });
  g.translate(0, 0, -(d - 2 * r) / 2); g.computeVertexNormals(); rbCache.set(k, g); return g;
}
export const rbox = (w, h, d, r, color, o) => M(rboxGeo(w, h, d, r), color, o);
export const box = (w, h, d, color, o) => M(new THREE.BoxGeometry(w, h, d), color, o);
export const cyl = (r1, r2, h, color, seg = 22, o) => M(new THREE.CylinderGeometry(r1, r2, h, seg), color, o);
export const sph = (r, color, o, ws = 28, hs = 18) => M(new THREE.SphereGeometry(r, ws, hs), color, o);
export const cone = (r, h, color, seg = 18, o) => M(new THREE.ConeGeometry(r, h, seg), color, o);
export const tor = (R, r, color, arc = Math.PI * 2, o) => M(new THREE.TorusGeometry(R, r, 10, 28, arc), color, o);
export function at(o, x, y, z, parent) { o.position.set(x, y, z); if (parent) parent.add(o); return o; }
export function G(parent, x = 0, y = 0, z = 0) { const g = new THREE.Group(); g.position.set(x, y, z); if (parent) parent.add(g); return g; }

// ---- canvas textures ----
export function tex(w, h, draw, rep = [1, 1]) {
  const cv = document.createElement('canvas'); cv.width = w; cv.height = h; const g = cv.getContext('2d'); draw(g, w, h);
  const t = new THREE.CanvasTexture(cv); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(...rep);
  t.anisotropy = 8; t.colorSpace = THREE.SRGBColorSpace; t.userData = { cv, g, draw }; return t;
}
export function retex(t, draw) { const { cv, g } = t.userData; g.clearRect(0, 0, cv.width, cv.height); (draw || t.userData.draw)(g, cv.width, cv.height); t.needsUpdate = true; }

// ---- light rig (per scene) ----
export function rig(scene, o = {}) {
  const hemi = new THREE.HemisphereLight(o.sky || '#ffffff', o.ground || '#c9d2de', (o.hemi ?? .6) * Math.PI); scene.add(hemi);
  const sun = new THREE.DirectionalLight(o.sunColor || '#fff4e6', (o.sun ?? 2.4) * Math.PI); sun.position.set(...(o.sunPos || [-8, 14, 10]));
  sun.castShadow = true; const S = o.shadowSize || 14; sun.shadow.mapSize.set(4096, 4096);
  Object.assign(sun.shadow.camera, { left: -S, right: S, top: S, bottom: -S, near: .5, far: 80 });
  sun.shadow.bias = -0.0005; sun.shadow.normalBias = .02; scene.add(sun); scene.add(sun.target);
  return { hemi, sun };
}

// ---- passes ----
const rtOpt = { minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter, samples: 4 };
const rtLit = new THREE.WebGLRenderTarget(W, H, { ...rtOpt, type: THREE.HalfFloatType });
const rtFlat = new THREE.WebGLRenderTarget(W, H, rtOpt);
const rtN = new THREE.WebGLRenderTarget(W, H, { minFilter: THREE.NearestFilter, magFilter: THREE.NearestFilter });
rtN.depthTexture = new THREE.DepthTexture(W, H); rtN.depthTexture.type = THREE.UnsignedIntType;
const normMat = new THREE.MeshNormalMaterial();
export const look = { ink: new THREE.Color('#1f1b24'), shade: new THREE.Color('#4f6a9a'), dot: 6.5, edge: 1.0, sat: 1.06, contrast: 1.04, night: 0, vignette: .18, grain: .03, expo: 1, tint: new THREE.Color(1, 1, 1) };
const comp = new THREE.ShaderMaterial({
  uniforms: { tLit: { value: rtLit.texture }, tFlat: { value: rtFlat.texture }, tN: { value: rtN.texture }, tD: { value: rtN.depthTexture },
    res: { value: new THREE.Vector2(W, H) }, near: { value: camera.near }, far: { value: camera.far }, ink: { value: look.ink }, shadeTint: { value: look.shade },
    dotS: { value: look.dot }, edgeK: { value: 1 }, sat: { value: 1 }, con: { value: 1 }, vig: { value: .18 }, grain: { value: .03 }, tm: { value: 0 }, fogN: { value: 1e4 }, fogF: { value: 2e4 }, dark: { value: 0 }, expo: { value: 1 }, tint: { value: look.tint } },
  vertexShader: 'varying vec2 vUv; void main(){ vUv=uv; gl_Position=vec4(position.xy,0.,1.); }',
  fragmentShader: `
  uniform sampler2D tLit,tFlat,tN,tD; uniform vec2 res; uniform float near,far,dotS,edgeK,sat,con,vig,grain,tm,dark,expo,fogN,fogF; uniform vec3 ink,shadeTint,tint; varying vec2 vUv;
  float lin(vec2 uv){ float z=texture2D(tD,uv).x; return near*far/(far - z*(far-near)); }
  float lum(vec3 c){ return dot(c,vec3(.299,.587,.114)); }
  void main(){
    vec3 lit=texture2D(tLit,vUv).rgb, alb=texture2D(tFlat,vUv).rgb;
    float sh = clamp(lum(lit)/max(lum(alb),1e-3), 0., 2.5);
    float l = sh>1.0 ? 1.0 : (sh>0.72 ? 0.9 : 0.74);
    vec2 p = gl_FragCoord.xy; float s=.7071; vec2 q = mat2(s,-s,s,s)*p/dotS; vec2 cell=fract(q)-.5;
    float rad = clamp((0.97-sh)*1.0, 0., .52);
    float dotm = 1.0 - smoothstep(rad-.07, rad+.07, length(cell));
    float nl = mix(l, mix(.2,1.08,smoothstep(.25,1.7,sh)), dark); vec3 col = alb*nl*tint*expo;
    col = mix(col, col*mix(vec3(1.), shadeTint*1.2, .6), dotm*step(sh,.96)*.8);
    col += alb*min(max(sh-1.0,0.),1.)*.14;
    vec2 px = 1.25*edgeK/res; float d0=lin(vUv); vec3 n0=texture2D(tN,vUv).rgb; float dd=0., nd=0.;
    for(int i=0;i<8;i++){ float a=float(i)*0.785398; vec2 o=vec2(cos(a),sin(a))*px*(mod(float(i),2.0)<0.5?1.0:1.41);
      dd=max(dd, abs(lin(vUv+o)-d0)/min(d0,lin(vUv+o))); nd=max(nd, length(texture2D(tN,vUv+o).rgb-n0)); }
    float bg = step(.001, n0.r+n0.g+n0.b);
    float e = max(smoothstep(.03,.06,dd), smoothstep(.32,.5,nd)*bg);
    col = pow(max(col,0.), vec3(1./2.2));
    float L=lum(col); col = mix(vec3(L), col, sat); col = (col-.5)*con+.5;
    e *= 1.0 - smoothstep(fogN, fogF, d0)*.9; col = mix(col, ink, e*.95);
    float g = fract(sin(dot(p+tm,vec2(12.9898,78.233)))*43758.5453);
    col *= 1.0 - grain + g*grain*1.6;
    vec2 v=vUv-.5; col *= 1.0 - vig*dot(v,v)*2.2;
    gl_FragColor = vec4(col,1.);
  }` });
const qs = new THREE.Scene(); qs.add(new THREE.Mesh(new THREE.PlaneGeometry(2, 2), comp)); const qc = new THREE.Camera();
const meshCache = new WeakMap();
function meshesOf(scene) { const a = []; scene.traverse(o => { if (o.isMesh && o.userData.m) a.push(o); }); return a; }
export function draw(scene, opts = {}) {
  const ms = meshesOf(scene); const pts = []; scene.traverse(o => { if (o.isPoints || o.isSprite || o.isLine || o.isLineSegments || o.userData.flatOnly) pts.push(o); });
  const bg = scene.background;
  for (const o of ms) o.material = o.userData.m.lit;
  renderer.setRenderTarget(rtLit); renderer.render(scene, camera);
  for (const o of ms) o.material = o.userData.m.flat;
  renderer.setRenderTarget(rtFlat); renderer.render(scene, camera);
  scene.background = null; renderer.setClearColor(0, 0);
  const hid = [...pts, ...ms.filter(o => o.userData.noEdge)].filter(o => o.visible); hid.forEach(o => o.visible = false);
  scene.overrideMaterial = normMat; renderer.setRenderTarget(rtN); renderer.render(scene, camera); scene.overrideMaterial = null;
  hid.forEach(o => o.visible = true); scene.background = bg;
  const u = comp.uniforms; u.near.value = camera.near; u.far.value = camera.far; u.dotS.value = look.dot; u.edgeK.value = look.edge;
  u.sat.value = look.sat; u.con.value = look.contrast; u.vig.value = look.vignette; u.grain.value = look.grain; u.tm.value = opts.t || 0; u.fogN.value = scene.fog ? scene.fog.near : 1e4; u.fogF.value = scene.fog ? scene.fog.far : 2e4; u.dark.value = look.night; u.expo.value = look.expo;
  renderer.setRenderTarget(null); renderer.render(qs, qc);
}

// ---- 2D overlay canvas (captions, plates) composited on top ----
export const ov = document.createElement('canvas'); ov.width = W; ov.height = H; export const og = ov.getContext('2d');
const out = document.createElement('canvas'); out.width = W; out.height = H; const outg = out.getContext('2d');
export function frameOut(q = .92) { outg.drawImage(renderer.domElement, 0, 0); outg.drawImage(ov, 0, 0); return out.toDataURL('image/jpeg', q); }
