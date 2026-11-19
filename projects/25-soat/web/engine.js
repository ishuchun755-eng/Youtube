import * as THREE from './three.js';
export { THREE };
export const W = 1920, H = 1080;

// ---------------------------------------------------------------- renderer + post
export const renderer = new THREE.WebGLRenderer({ antialias: false, preserveDrawingBuffer: true });
renderer.setSize(W, H); renderer.setPixelRatio(1);
renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputColorSpace = THREE.SRGBColorSpace;
document.body.appendChild(renderer.domElement);

const rtMain = new THREE.WebGLRenderTarget(W, H, { samples: 4, type: THREE.HalfFloatType });
const BW = 480, BH = 270;
const rtA = new THREE.WebGLRenderTarget(BW, BH, { type: THREE.HalfFloatType });
const rtB = new THREE.WebGLRenderTarget(BW, BH, { type: THREE.HalfFloatType });
const quadCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
const quadGeo = new THREE.PlaneGeometry(2, 2);
function pass(frag, uniforms) {
  const m = new THREE.ShaderMaterial({ uniforms, vertexShader: 'varying vec2 vUv; void main(){vUv=uv; gl_Position=vec4(position,1.);}', fragmentShader: frag, depthTest: false, depthWrite: false });
  const s = new THREE.Scene(); s.add(new THREE.Mesh(quadGeo, m)); return { m, s };
}
const pThresh = pass(`uniform sampler2D t; uniform float th; varying vec2 vUv;
 void main(){ vec3 c=texture2D(t,vUv).rgb; float l=max(c.r,max(c.g,c.b)); gl_FragColor=vec4(c*smoothstep(th,th+0.35,l),1.);}`, { t: { value: null }, th: { value: 0.8 } });
const pBlur = pass(`uniform sampler2D t; uniform vec2 d; varying vec2 vUv;
 void main(){ vec3 c=vec3(0.); float w[5]; w[0]=.227;w[1]=.194;w[2]=.121;w[3]=.054;w[4]=.016;
 c+=texture2D(t,vUv).rgb*w[0]; for(int i=1;i<5;i++){ c+=texture2D(t,vUv+d*float(i)).rgb*w[i]; c+=texture2D(t,vUv-d*float(i)).rgb*w[i]; } gl_FragColor=vec4(c,1.);}`,
  { t: { value: null }, d: { value: new THREE.Vector2() } });
export const post = {
  freeze: 0, flash: 0, fade: 0, red: 0, bloom: 0.9, sat: 1.0, tint: new THREE.Color(1, 1, 1), grain: 0.05, vig: 0.55, time: 0, glitch: 0,
};
const pComp = pass(`uniform sampler2D tS, tB; uniform float freeze, flash, fade, red, bloom, sat, grain, vig, time, glitch; uniform vec3 tint; varying vec2 vUv;
 float h(vec2 p){ return fract(sin(dot(p,vec2(12.9898,78.233)))*43758.5453); }
 void main(){
   vec2 uv=vUv;
   if(glitch>0.){ float row=floor(uv.y*40.); float n=h(vec2(row,floor(time*24.))); if(n>1.-glitch*.5) uv.x+= (h(vec2(row,time))-.5)*.08*glitch; }
   float ca = 0.0025*freeze + 0.006*glitch;
   vec2 dir = (uv-.5);
   vec3 c = vec3(texture2D(tS,uv+dir*ca).r, texture2D(tS,uv).g, texture2D(tS,uv-dir*ca).b);
   c += texture2D(tB,uv).rgb*bloom;
   c *= tint;
   float l = dot(c, vec3(.299,.587,.114));
   c = mix(vec3(l), c, sat*(1.-.75*freeze));
   c = mix(c, vec3(l)*vec3(.55,.75,1.25), .55*freeze);
   c = mix(c, c*vec3(1.6,.35,.35) + vec3(.12,0.,0.), red);
   c = c/(1.+c*.15);
   float v = smoothstep(.95, .25, length((vUv-.5)*vec2(1.25,1.)));
   c *= mix(1., v, vig);
   c += (h(vUv*vec2(1920.,1080.)+time*60.)-.5)*grain;
   c = mix(c, vec3(1.), flash);
   c = mix(c, vec3(0.), fade);
   gl_FragColor = vec4(pow(max(c,0.), vec3(1./2.2)), 1.);
 }`, { tS: { value: rtMain.texture }, tB: { value: rtA.texture }, freeze: { value: 0 }, flash: { value: 0 }, fade: { value: 0 }, red: { value: 0 }, bloom: { value: 1 },
  sat: { value: 1 }, grain: { value: .05 }, vig: { value: .55 }, time: { value: 0 }, glitch: { value: 0 }, tint: { value: new THREE.Color(1, 1, 1) } });

export function renderComposite(scene, camera) {
  renderer.setRenderTarget(rtMain); renderer.render(scene, camera);
  pThresh.m.uniforms.t.value = rtMain.texture; renderer.setRenderTarget(rtA); renderer.render(pThresh.s, quadCam);
  for (let i = 0; i < 2; i++) {
    pBlur.m.uniforms.t.value = rtA.texture; pBlur.m.uniforms.d.value.set(1.6 / BW, 0); renderer.setRenderTarget(rtB); renderer.render(pBlur.s, quadCam);
    pBlur.m.uniforms.t.value = rtB.texture; pBlur.m.uniforms.d.value.set(0, 1.6 / BH); renderer.setRenderTarget(rtA); renderer.render(pBlur.s, quadCam);
  }
  const u = pComp.m.uniforms;
  for (const k of ['freeze', 'flash', 'fade', 'red', 'bloom', 'sat', 'grain', 'vig', 'time', 'glitch']) u[k].value = post[k];
  u.tint.value.copy(post.tint);
  renderer.setRenderTarget(null); renderer.render(pComp.s, quadCam);
}

// ---------------------------------------------------------------- materials
const gm = new Uint8Array([70, 150, 255]); const grad = new THREE.DataTexture(gm, 3, 1, THREE.RedFormat);
grad.needsUpdate = true; grad.minFilter = grad.magFilter = THREE.NearestFilter;
const _mc = new Map();
export function toon(color, opts = {}) {
  const key = color + JSON.stringify(opts);
  if (!opts.map && _mc.has(key)) return _mc.get(key);
  const m = new THREE.MeshToonMaterial({ color, gradientMap: grad, ...opts });
  if (!opts.map) _mc.set(key, m);
  return m;
}
export function glow(color, intensity = 2) { return new THREE.MeshBasicMaterial({ color: new THREE.Color(color).multiplyScalar(intensity), toneMapped: false }); }

const outlineMat = new THREE.ShaderMaterial({
  uniforms: { th: { value: 0.025 } }, side: THREE.BackSide,
  vertexShader: `uniform float th; void main(){ vec3 p = position + normal*th; gl_Position = projectionMatrix*modelViewMatrix*vec4(p,1.); }`,
  fragmentShader: `void main(){ gl_FragColor = vec4(0.02,0.015,0.04,1.); }`,
});
const _om = new Map();
function outlineMatFor(th) { if (!_om.has(th)) { const m = outlineMat.clone(); m.uniforms.th.value = th; _om.set(th, m); } return _om.get(th); }
export function ink(mesh, th = 0.025) {
  const o = new THREE.Mesh(mesh.geometry, outlineMatFor(th)); o.castShadow = false; o.receiveShadow = false; o.userData.outline = true;
  mesh.add(o); return mesh;
}
export function mesh(geo, mat, x = 0, y = 0, z = 0, parent = null, opt = {}) {
  const m = new THREE.Mesh(geo, typeof mat === 'number' || typeof mat === 'string' ? toon(mat) : mat);
  m.position.set(x, y, z); m.castShadow = opt.cast !== false; m.receiveShadow = opt.recv !== false;
  if (opt.ink !== false) ink(m, opt.th ?? 0.025);
  if (parent) parent.add(m);
  return m;
}
export const G = {
  box: (w, h, d) => new THREE.BoxGeometry(w, h, d),
  rbox: (w, h, d, r = 0.05) => roundedBox(w, h, d, r),
  sph: (r, a = 24, b = 18) => new THREE.SphereGeometry(r, a, b),
  cyl: (rt, rb, h, s = 24, open = false) => new THREE.CylinderGeometry(rt, rb, h, s, 1, open),
  cap: (r, l) => new THREE.CapsuleGeometry(r, l, 6, 16),
  cone: (r, h, s = 24) => new THREE.ConeGeometry(r, h, s),
  plane: (w, h) => new THREE.PlaneGeometry(w, h),
  torus: (r, t, a = 12, b = 32) => new THREE.TorusGeometry(r, t, a, b),
};
function roundedBox(w, h, d, r) {
  const s = new THREE.Shape(); const x = -w / 2, y = -h / 2;
  s.moveTo(x + r, y); s.lineTo(x + w - r, y); s.quadraticCurveTo(x + w, y, x + w, y + r); s.lineTo(x + w, y + h - r); s.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  s.lineTo(x + r, y + h); s.quadraticCurveTo(x, y + h, x, y + h - r); s.lineTo(x, y + r); s.quadraticCurveTo(x, y, x + r, y);
  const g = new THREE.ExtrudeGeometry(s, { depth: d - 2 * r, bevelEnabled: true, bevelThickness: r, bevelSize: r * 0.6, bevelSegments: 3, curveSegments: 6 });
  g.translate(0, 0, -(d - 2 * r) / 2); g.computeVertexNormals(); return g;
}

// ---------------------------------------------------------------- canvas textures
export function canvasTex(w, h, draw) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  const ctx = c.getContext('2d'); draw(ctx, w, h);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
  t.userData = { c, ctx, draw }; return t;
}
export function redraw(tex, fn) { const { c, ctx } = tex.userData; ctx.clearRect(0, 0, c.width, c.height); fn(ctx, c.width, c.height); tex.needsUpdate = true; }
export const FONT = 'InterX';

// ---------------------------------------------------------------- math
export const clamp = (x, a = 0, b = 1) => Math.max(a, Math.min(b, x));
export const ss = x => { x = clamp(x); return x * x * x * (x * (x * 6 - 15) + 10); };
export const eout = x => { x = clamp(x); return 1 - Math.pow(1 - x, 3); };
export const ein = x => { x = clamp(x); return x * x * x; };
export const back = (x, s = 1.7) => { x = clamp(x) - 1; return x * x * ((s + 1) * x + s) + 1; };
export const lerp = (a, b, t) => a + (b - a) * t;
export const noise1 = t => Math.sin(t * 1.3) * .5 + Math.sin(t * 2.7 + 1.3) * .3 + Math.sin(t * 5.1 + 2.1) * .2;

// ---------------------------------------------------------------- characters
export function makePerson(o = {}) {
  const P = { skin: 0xf0c49c, hair: 0x1a1210, top: 0x2d5fd1, pants: 0x1c2333, shoes: 0x111111, hat: false, coat: false, beard: false, height: 1, eye: 0x111111, ...o };
  const root = new THREE.Group(); root.scale.setScalar(o.scale ?? 0.75); const hips = new THREE.Group(); hips.position.y = 0.95 * P.height; root.add(hips);
  const torso = new THREE.Group(); hips.add(torso);
  if (P.coat) {
    mesh(G.cyl(0.3, 0.46, 1.25, 24), P.top, 0, 0.18, 0, torso);
    mesh(G.cap(0.27, 0.3), P.top, 0, 0.55, 0, torso);
  } else {
    mesh(G.cap(0.28, 0.42), P.top, 0, 0.42, 0, torso);
    mesh(G.cyl(0.13, 0.13, 0.08, 16), P.top, 0, 0.86, 0, torso, { ink: false });
  }
  const neck = new THREE.Group(); neck.position.y = 0.95; torso.add(neck);
  const head = new THREE.Group(); head.position.y = 0.28; neck.add(head);
  mesh(G.sph(0.3, 32, 24), P.skin, 0, 0, 0, head, { th: 0.02 });
  const hair = mesh(new THREE.SphereGeometry(0.315, 32, 16, 0, Math.PI * 2, 0, Math.PI * 0.42), P.hair, 0, 0.02, -0.01, head, { th: 0.02 });
  hair.rotation.x = -0.25;
  if (P.hat) {
    mesh(G.cyl(0.42, 0.42, 0.03, 32), 0x0c0c12, 0, 0.2, 0, head, { th: 0.015 });
    mesh(G.cyl(0.24, 0.27, 0.3, 32), 0x0c0c12, 0, 0.36, 0, head, { th: 0.015 });
    mesh(G.cyl(0.275, 0.275, 0.05, 32), 0x5a2a8a, 0, 0.24, 0, head, { ink: false });
  }
  if (P.beard) mesh(new THREE.SphereGeometry(0.29, 24, 12, Math.PI * 0.15, Math.PI * 0.7, Math.PI * 0.55, Math.PI * 0.4), 0xb8b8c0, 0, -0.02, 0.03, head, { th: 0.015 });
  const eyes = [];
  for (const s of [-1, 1]) {
    const e = new THREE.Group(); e.position.set(0.105 * s, 0.03, 0.255); head.add(e);
    const white = mesh(G.sph(0.07, 20, 16), 0xffffff, 0, 0, 0, e, { th: 0.012 }); white.scale.z = 0.6;
    const pupil = mesh(G.sph(0.038, 16, 12), P.eye, 0, 0, 0.04, e, { ink: false });
    const hl = new THREE.Mesh(G.sph(0.012, 8, 6), glow(0xffffff, 1)); hl.position.set(0.015, 0.018, 0.075); e.add(hl);
    const brow = mesh(G.box(0.11, 0.025, 0.03), P.hair, 0, 0.095, 0.02, e, { ink: false });
    eyes.push({ e, white, pupil, brow, s });
  }
  const mouth = mesh(G.box(0.1, 0.02, 0.03), 0x5a1a22, 0, -0.13, 0.27, head, { ink: false });
  const nose = mesh(G.sph(0.035, 12, 10), P.skin, 0, -0.04, 0.3, head, { ink: false });
  function limb(len, r, color) { const g = new THREE.Group(); mesh(G.cap(r, len), color, 0, -len / 2 - r * .3, 0, g); return g; }
  const arms = [], legs = [];
  for (const s of [-1, 1]) {
    const sh = new THREE.Group(); sh.position.set(0.36 * s, 0.75, 0); torso.add(sh);
    const up = limb(0.42, 0.09, P.top); sh.add(up);
    const hand = mesh(G.sph(0.085, 16, 12), P.skin, 0, -0.62, 0, sh, { th: 0.015 });
    arms.push({ sh, hand, s });
    const hp = new THREE.Group(); hp.position.set(0.15 * s, 0.0, 0); hips.add(hp);
    const lg = limb(0.62, 0.11, P.pants); hp.add(lg);
    const shoe = mesh(G.rbox(0.18, 0.11, 0.3, 0.04), P.shoes, 0, -0.9, 0.05, hp, { th: 0.015 });
    legs.push({ hp, s });
  }
  const st = { sit: 0, walk: 0, walkAmt: 0, armUp: [0, 0], armOut: [0.08, 0.08], yaw: 0, pitch: 0, headYaw: 0, headPitch: 0, talk: 0, blink: 0, brow: 0, eyeS: 1, look: [0, 0], lean: 0, t: 0, frozen: false };
  root.userData.state = st;
  root.userData.apply = function (t) {
    const ph = st.walk * Math.PI * 2, a = st.walkAmt;
    for (const L of legs) L.hp.rotation.x = Math.sin(ph + (L.s > 0 ? 0 : Math.PI)) * 0.55 * a - (st.sit || 0) * 1.5;
    for (const [i, A] of arms.entries()) {
      A.sh.rotation.x = -Math.sin(ph + (A.s > 0 ? 0 : Math.PI)) * 0.45 * a - st.armUp[i];
      A.sh.rotation.z = A.s * st.armOut[i];
    }
    hips.position.y = 0.95 * P.height + Math.abs(Math.sin(ph)) * 0.05 * a + (st.frozen ? 0 : Math.sin(t * 1.7) * 0.006);
    torso.rotation.x = st.lean + (st.frozen ? 0 : Math.sin(t * 1.7) * 0.01);
    root.rotation.y = st.yaw;
    neck.rotation.y = st.headYaw; neck.rotation.x = st.headPitch;
    const bl = st.blink;
    for (const E of eyes) {
      E.white.scale.set(st.eyeS, st.eyeS * Math.max(0.08, 1 - bl), st.eyeS * 0.6);
      E.pupil.visible = bl < 0.6;
      E.pupil.position.set(st.look[0] * 0.025, st.look[1] * 0.02, 0.04);
      E.brow.position.y = 0.095 + st.brow * 0.02 + (st.eyeS - 1) * 0.06;
      E.brow.rotation.z = -E.s * st.brow * 0.35;
    }
    mouth.scale.set(1, 1 + st.talk * 3.5, 1);
  };
  root.userData.parts = { head, hips, arms, legs, torso };
  return root;
}
export function blinkAt(t, seed = 0) { const p = (t + seed * 1.37) % 3.6; return p < 0.13 ? Math.sin(p / 0.13 * Math.PI) : 0; }
export function talkAt(t, active) { return active ? Math.max(0, Math.sin(t * 22) * 0.5 + Math.sin(t * 13.7) * 0.4) : 0; }
