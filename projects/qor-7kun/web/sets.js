import { THREE, mesh, G, toon, glow, ink, canvasTex, redraw, FONT, makePerson, clamp, lerp, ss } from './engine.js';

export const scene = new THREE.Scene();
scene.background = new THREE.Color(0x101a36);
scene.fog = new THREE.Fog(0x101a36, 12, 70);
const rnd = (() => { let s = 7; return () => (s = (s * 16807) % 2147483647) / 2147483647; })();
const GM = toon(0xffffff).gradientMap;
export const roadX = z => 5 * Math.sin(z / 38) + 2 * Math.sin(z / 13);

// ---------------------------------------------------------------- lights (global)
const hemi = new THREE.HemisphereLight(0x8aa6ff, 0x2a3350, 0.9); scene.add(hemi);
const moon = new THREE.DirectionalLight(0xbcd0ff, 1.2); moon.castShadow = true;
moon.shadow.mapSize.set(2048, 2048); moon.shadow.bias = -0.0005; moon.shadow.normalBias = 0.04;
Object.assign(moon.shadow.camera, { left: -18, right: 18, top: 18, bottom: -18, near: 0.5, far: 120 });
scene.add(moon); scene.add(moon.target);
export function aimMoon(x, z) { moon.position.set(x - 20, 40, z + 18); moon.target.position.set(x, 0, z); }

// ---------------------------------------------------------------- instanced outline helper
const ioMat = th => new THREE.ShaderMaterial({ side: THREE.BackSide, uniforms: { th: { value: th } },
  vertexShader: `uniform float th; void main(){ vec3 p = position + normal*th; gl_Position = projectionMatrix*modelViewMatrix*instanceMatrix*vec4(p,1.); }`,
  fragmentShader: `void main(){ gl_FragColor = vec4(0.02,0.015,0.04,1.); }` });
function inst(geo, mat, mats, parent, th = 0.04, cast = true) {
  const m = new THREE.InstancedMesh(geo, mat, mats.length); mats.forEach((M, i) => m.setMatrixAt(i, M)); m.castShadow = cast; m.receiveShadow = true; parent.add(m);
  if (th) { const o = new THREE.InstancedMesh(geo, ioMat(th), mats.length); mats.forEach((M, i) => o.setMatrixAt(i, M)); parent.add(o); }
  return m;
}
const M4 = (x, y, z, s = 1, sy = s, ry = 0, rx = 0) => new THREE.Matrix4().compose(new THREE.Vector3(x, y, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(rx, ry, 0)), new THREE.Vector3(s, sy, s));

// ---------------------------------------------------------------- snow ground texture
const snowTex = canvasTex(512, 512, (c, w, h) => {
  c.fillStyle = '#e9f0fb'; c.fillRect(0, 0, w, h);
  for (let i = 0; i < 2600; i++) { const v = 215 + Math.random() * 40; c.fillStyle = `rgba(${v - 20},${v - 8},${v + 10},0.35)`; c.fillRect(Math.random() * w, Math.random() * h, 2 + Math.random() * 3, 2); }
  for (let i = 0; i < 260; i++) { c.fillStyle = 'rgba(255,255,255,0.9)'; c.fillRect(Math.random() * w, Math.random() * h, 2, 2); }
});
snowTex.wrapS = snowTex.wrapT = THREE.RepeatWrapping; snowTex.repeat.set(40, 40);
const SNOW = toon(0xffffff, { map: snowTex });
const SNOWM = toon(0xeef3fc);

// ---------------------------------------------------------------- trees
function forest(parent, pts) {
  const trunk = [], tiers = [[], [], []], caps = [[], [], []];
  for (const [x, z, s, r] of pts) {
    trunk.push(M4(x, 0.6 * s, z, s, s, r));
    for (let k = 0; k < 3; k++) {
      const y = (1.4 + k * 1.25) * s, rad = (1.9 - k * 0.5) * s;
      tiers[k].push(M4(x, y, z, rad, s * 1.0, r));
      caps[k].push(M4(x, y + 0.35 * s, z, rad * 0.78, s * 0.75, r + 0.3));
    }
  }
  inst(G.cyl(0.18, 0.25, 1.2, 8), toon(0x4a3326), trunk, parent, 0.03);
  const cone = new THREE.ConeGeometry(1, 2.0, 9); cone.translate(0, 0.6, 0);
  const capG = new THREE.ConeGeometry(1, 1.2, 9); capG.translate(0, 0.9, 0);
  for (let k = 0; k < 3; k++) { inst(cone, toon(0x1d4636), tiers[k], parent, 0.05); inst(capG, SNOWM, caps[k], parent, 0.035, false); }
}

// ---------------------------------------------------------------- falling snow (shared by sets)
const flakeTex = canvasTex(32, 32, (c, w, h) => { const g = c.createRadialGradient(16, 16, 0, 16, 16, 16); g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(1, 'rgba(255,255,255,0)'); c.fillStyle = g; c.fillRect(0, 0, w, h); });
const NF = 6000; const fb = new Float32Array(NF * 4); for (let i = 0; i < NF; i++) { fb[i * 4] = rnd(); fb[i * 4 + 1] = rnd(); fb[i * 4 + 2] = rnd(); fb[i * 4 + 3] = rnd(); }
const fgeo = new THREE.BufferGeometry(); const fpos = new Float32Array(NF * 3); fgeo.setAttribute('position', new THREE.BufferAttribute(fpos, 3));
const flakes = new THREE.Points(fgeo, new THREE.PointsMaterial({ size: 0.07, map: flakeTex, transparent: true, depthWrite: false, color: 0xffffff, sizeAttenuation: true, fog: false }));
flakes.frustumCulled = false; scene.add(flakes);
export function snowfall(t, cx, cy, cz, amt = 1, wind = 1) {
  const n = Math.floor(NF * clamp(amt)); const B = 26, HH = 14;
  for (let i = 0; i < NF; i++) {
    if (i >= n) { fpos[i * 3 + 1] = -999; continue; }
    const sp = 0.9 + fb[i * 4 + 3] * 0.8;
    const y = ((fb[i * 4 + 1] * HH - t * sp * 1.1) % HH + HH) % HH;
    const x = ((fb[i * 4] * B + t * wind * sp * 1.2 + Math.sin(t * 1.3 + i) * 0.25 - cx) % B + B) % B - B / 2 + cx;
    const z = ((fb[i * 4 + 2] * B + Math.cos(t * 0.9 + i) * 0.25 - cz) % B + B) % B - B / 2 + cz;
    fpos[i * 3] = x; fpos[i * 3 + 1] = cy - 4 + y; fpos[i * 3 + 2] = z;
  }
  fgeo.attributes.position.needsUpdate = true;
  flakes.material.size = 0.07 * (wind > 2 ? 1.3 : 1);
}

// ---------------------------------------------------------------- props
function label(text, w, h, bg, fg, font = 90) {
  const tex = canvasTex(512, Math.round(512 * h / w), (c, W, H) => { c.fillStyle = bg; c.fillRect(0, 0, W, H); c.font = `${font}px ${FONT}`; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillStyle = fg; c.fillText(text, W / 2, H / 2 + 4); });
  return new THREE.Mesh(G.plane(w, h), new THREE.MeshBasicMaterial({ map: tex, toneMapped: false }));
}
const puffMat = new THREE.MeshToonMaterial({ color: 0xc8ccd6, gradientMap: GM, transparent: true, opacity: 0.6, depthWrite: false });
export function makeCar() {
  const g = new THREE.Group(); const body = new THREE.Group(); g.add(body);
  const col = 0x9a1f2a;
  mesh(G.rbox(1.9, 0.62, 4.5, 0.16), col, 0, 0.62, 0, body, { th: 0.03 });
  mesh(G.rbox(1.72, 0.6, 2.3, 0.18), 0x7c9bbd, 0, 1.18, -0.25, body, { th: 0.03 });
  mesh(G.rbox(1.76, 0.1, 2.0, 0.05), col, 0, 1.5, -0.3, body, { th: 0.02 });
  for (const s of [-1, 1]) mesh(G.box(0.06, 0.08, 4.3), 0x1a1a20, 0.95 * s, 0.75, 0, body, { ink: false });
  const wheels = [];
  for (const [x, z] of [[-0.88, 1.45], [0.88, 1.45], [-0.88, -1.45], [0.88, -1.45]]) { const w = mesh(G.cyl(0.36, 0.36, 0.26, 18), 0x111116, x, 0.36, z, body, { th: 0.02 }); w.rotation.z = Math.PI / 2; wheels.push(w); mesh(G.cyl(0.18, 0.18, 0.28, 12), 0x9aa0aa, x, 0.36, z, body, { ink: false }).rotation.z = Math.PI / 2; }
  const hls = []; for (const x of [-0.62, 0.62]) { const h = new THREE.Mesh(G.rbox(0.42, 0.16, 0.06, 0.03), glow(0xfff4d0, 3)); h.position.set(x, 0.72, 2.25); body.add(h); hls.push(h); }
  const tls = []; for (const x of [-0.65, 0.65]) { const h = new THREE.Mesh(G.rbox(0.36, 0.14, 0.06, 0.03), glow(0xff2020, 1.6)); h.position.set(x, 0.78, -2.25); body.add(h); tls.push(h); }
  const beams = []; const spots = [];
  for (const x of [-0.62, 0.62]) {
    const b = new THREE.Mesh(new THREE.ConeGeometry(1.5, 12, 20, 1, true), new THREE.MeshBasicMaterial({ color: 0xfff0c8, transparent: true, opacity: 0.07, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, fog: false }));
    b.rotation.x = -Math.PI / 2; b.position.set(x, 0.72, 8.3); body.add(b); beams.push(b);
    const sp = new THREE.SpotLight(0xfff0d0, 40, 30, 0.45, 0.5, 1.2); sp.position.set(x, 0.75, 2.3); sp.target.position.set(x * 2, 0, 12); body.add(sp); body.add(sp.target); spots.push(sp);
  }
  const plate = label('01 A 777 AA', 0.52, 0.12, '#ffffff', '#111', 60); plate.position.set(0, 0.5, -2.27); plate.rotation.y = Math.PI; body.add(plate);
  const pipe = mesh(G.cyl(0.05, 0.05, 0.3, 10), 0x55555c, -0.55, 0.28, -2.3, body, { th: 0.01 }); pipe.rotation.x = Math.PI / 2;
  const puffs = []; for (let i = 0; i < 10; i++) { const p = new THREE.Mesh(G.sph(0.18, 10, 8), puffMat); body.add(p); puffs.push(p); }
  // snow layers
  const roofSnow = mesh(G.rbox(1.7, 0.3, 2.0, 0.14), SNOWM, 0, 1.62, -0.3, body, { th: 0.02 });
  const hoodSnow = mesh(G.rbox(1.75, 0.22, 1.2, 0.1), SNOWM, 0, 0.98, 1.6, body, { th: 0.02 });
  const trunkSnow = mesh(G.rbox(1.75, 0.2, 0.8, 0.1), SNOWM, 0, 0.98, -1.9, body, { th: 0.02 });
  const pipeSnow = mesh(G.sph(0.45, 14, 10), SNOWM, -0.55, 0.2, -2.55, g, { th: 0.02 }); pipeSnow.scale.set(1.3, 0.9, 1);
  // driver door pivot (front-left)
  const door = new THREE.Group(); door.position.set(-0.95, 0, 0.75); body.add(door);
  mesh(G.box(0.08, 0.55, 1.15), col, 0, 0.66, -0.58, door, { th: 0.02 });
  mesh(G.box(0.06, 0.45, 1.0), 0x7c9bbd, 0, 1.15, -0.62, door, { th: 0.015 });
  const mounds = [];
  for (const [x, z, s] of [[-1.3, 1.6, 1], [1.3, 1.2, 1.1], [-1.4, -1.3, 1.2], [1.4, -1.5, 1], [0, 2.7, 1.2], [0, -2.8, 1.1], [1.6, 0, 0.9], [-1.6, 0, 0.9]]) {
    const m = mesh(G.sph(1, 16, 10), SNOWM, x, 0, z, g, { th: 0.03 }); m.userData.s = s; mounds.push(m);
  }
  const cabLight = new THREE.PointLight(0xffc98a, 0, 3, 1.5); cabLight.position.set(0, 1.2, 0); body.add(cabLight);
  g.userData = { body, hls, tls, beams, spots, puffs, roofSnow, hoodSnow, trunkSnow, pipeSnow, door, mounds, wheels, cabLight,
    set(c, t) {
      const on = c.lightsOn !== false && c.engineOn !== false;
      for (const h of hls) h.material.color.setRGB(on ? 3 : 0.15, on ? 2.9 : 0.15, on ? 2.5 : 0.15);
      for (const b of beams) b.visible = on; for (const s of spots) s.intensity = on ? 40 : 0;
      for (const h of tls) h.material.color.setRGB(on ? 1.8 : 0.25, 0.1, 0.1);
      const sn = c.carSnow || 0;
      roofSnow.scale.set(1, 0.1 + sn * 1.6, 1); roofSnow.visible = sn > 0.02; hoodSnow.visible = trunkSnow.visible = sn > 0.02;
      hoodSnow.scale.set(1, 0.1 + sn * 1.8, 1); trunkSnow.scale.set(1, 0.1 + sn * 1.8, 1);
      pipeSnow.visible = !!c.pipeSnow; pipeSnow.scale.setScalar(c.pipeSnow || 0.01);
      door.rotation.y = -(c.doorOpen || 0) * 1.1;
      const bury = c.bury || 0;
      for (const m of mounds) { m.visible = bury > 0.02; m.scale.set(1.1 * m.userData.s, (0.5 + bury * 0.6) * m.userData.s, 1.3 * m.userData.s); }
      body.position.y = -bury * 0.35; body.rotation.x = (c.carPitch || 0);
      body.rotation.z = (c.carRoll || 0);
      cabLight.intensity = c.cabLight ? 1.2 : 0;
      for (const [i, p] of puffs.entries()) {
        if (!c.engineOn) { p.visible = false; continue; }
        const k = ((t * 0.6 + i / puffs.length) % 1); p.visible = true;
        p.position.set(-0.55 + Math.sin(i * 2) * 0.1 * k + k * 0.4, 0.3 + k * 1.6, -2.5 - k * 1.2); p.scale.setScalar(0.4 + k * 2.2); p.material.opacity = 0.5 * (1 - k);
      }
    } };
  return g;
}
export function makeWolf() {
  const g = new THREE.Group(); const fur = 0x6a6e78, light = 0x9aa0ac;
  const b = mesh(G.cap(0.28, 0.8), fur, 0, 0.75, 0, g, { th: 0.02 }); b.rotation.x = Math.PI / 2;
  const head = new THREE.Group(); head.position.set(0, 1.0, 0.72); g.add(head);
  mesh(G.sph(0.26, 16, 12), fur, 0, 0, 0, head, { th: 0.02 });
  const sn = mesh(G.cone(0.13, 0.36, 12), light, 0, -0.06, 0.3, head, { th: 0.015 }); sn.rotation.x = Math.PI / 2;
  mesh(G.sph(0.045, 8, 6), 0x111111, 0, -0.04, 0.48, head, { ink: false });
  for (const s of [-1, 1]) { const e = mesh(G.cone(0.08, 0.2, 8), fur, 0.14 * s, 0.24, -0.02, head, { th: 0.012 }); e.rotation.z = -0.2 * s; }
  const eyes = []; for (const s of [-1, 1]) { const e = new THREE.Mesh(G.sph(0.045, 10, 8), glow(0x8aff6a, 3)); e.position.set(0.1 * s, 0.06, 0.2); head.add(e); eyes.push(e); }
  const legs = []; for (const [x, z] of [[-0.17, 0.42], [0.17, 0.42], [-0.17, -0.42], [0.17, -0.42]]) { const l = new THREE.Group(); l.position.set(x, 0.62, z); g.add(l); mesh(G.cap(0.07, 0.5), fur, 0, -0.32, 0, l, { th: 0.012 }); legs.push(l); }
  const tail = mesh(G.cap(0.08, 0.5), fur, 0, 0.85, -0.75, g, { th: 0.012 }); tail.rotation.x = -0.9;
  g.userData = { head, eyes, legs, set(t, walk = 0) { for (const [i, l] of legs.entries()) l.rotation.x = Math.sin(t * 7 + (i % 2 ? 0 : Math.PI) + (i > 1 ? Math.PI : 0)) * 0.5 * walk; head.rotation.y = Math.sin(t * 0.7) * 0.2; } };
  return g;
}
export function makeFire() {
  const g = new THREE.Group();
  const tire = mesh(G.torus(0.42, 0.18, 12, 24), 0x141416, 0, 0.2, 0, g, { th: 0.02 }); tire.rotation.x = Math.PI / 2;
  for (let i = 0; i < 7; i++) { const st = mesh(G.cyl(0.04, 0.05, 1.0, 6), 0x3a2a20, Math.cos(i) * 0.3, 0.15, Math.sin(i * 1.7) * 0.3, g, { th: 0.01 }); st.rotation.set(Math.PI / 2, 0, i); }
  const flames = []; for (let i = 0; i < 6; i++) { const f = new THREE.Mesh(G.cone(0.22, 0.9, 10), glow(i % 2 ? 0xffa030 : 0xff5a10, 2.4)); g.add(f); flames.push(f); }
  const core = new THREE.Mesh(G.cone(0.3, 0.6, 10), glow(0xffe08a, 3)); core.position.y = 0.45; g.add(core);
  const light = new THREE.PointLight(0xff8a3a, 0, 14, 1.6); light.position.y = 1.2; g.add(light);
  const smokeMat = new THREE.MeshToonMaterial({ color: 0x1c1c22, gradientMap: GM, transparent: true, opacity: 0.85, depthWrite: false });
  const smoke = []; for (let i = 0; i < 26; i++) { const s = new THREE.Mesh(G.sph(0.5, 12, 10), smokeMat.clone()); g.add(s); smoke.push(s); }
  g.userData = { set(t, amt = 1, smokeAmt = 1) {
    for (const [i, f] of flames.entries()) { const a = i / 6 * Math.PI * 2; f.position.set(Math.cos(a) * 0.22, 0.5 + Math.sin(t * 9 + i) * 0.06, Math.sin(a) * 0.22); f.scale.set(amt, amt * (0.8 + 0.5 * Math.abs(Math.sin(t * 7 + i * 1.7))), amt); f.visible = amt > 0.02; }
    core.scale.setScalar(Math.max(0.01, amt)); core.visible = amt > 0.02; light.intensity = 25 * amt * (0.85 + 0.15 * Math.sin(t * 13));
    for (const [i, s] of smoke.entries()) { const k = ((t * 0.12 + i / smoke.length) % 1); s.visible = smokeAmt > 0.02 && k < smokeAmt + 0.02; s.position.set(Math.sin(i * 1.9) * 0.3 + k * 4.0, 1.0 + k * 16, Math.cos(i * 2.3) * 0.3 + k * 1.5); s.scale.setScalar(0.6 + k * 3.0); s.material.opacity = 0.85 * (1 - k * 0.7); }
  } };
  return g;
}
export function makeSled() {
  const g = new THREE.Group();
  mesh(G.rbox(0.9, 0.45, 2.0, 0.12), 0xe0501e, 0, 0.6, 0, g, { th: 0.02 });
  mesh(G.rbox(0.8, 0.25, 0.9, 0.08), 0x222228, 0, 0.9, -0.3, g, { th: 0.015 });
  const ws = mesh(G.box(0.7, 0.35, 0.04), 0x9fd0ff, 0, 1.05, 0.55, g, { th: 0.01 }); ws.rotation.x = -0.5;
  for (const s of [-1, 1]) { mesh(G.box(0.1, 0.06, 2.2), 0x333338, 0.45 * s, 0.12, 0.1, g, { th: 0.01 }); }
  mesh(G.box(0.8, 0.25, 1.4), 0x1a1a20, 0, 0.3, -0.3, g, { th: 0.015 });
  const hl = new THREE.Mesh(G.rbox(0.3, 0.12, 0.05, 0.02), glow(0xfff4d0, 3)); hl.position.set(0, 0.72, 1.01); g.add(hl);
  const beam = new THREE.Mesh(new THREE.ConeGeometry(1.0, 8, 16, 1, true), new THREE.MeshBasicMaterial({ color: 0xfff0c8, transparent: true, opacity: 0.08, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, fog: false }));
  beam.rotation.x = -Math.PI / 2; beam.position.set(0, 0.72, 5.0); g.add(beam);
  const rider = makePerson({ top: 0xff6a1a, pants: 0x1a1a22, puffer: true, scale: 0.72 }); rider.position.set(0, 0.55, -0.35); g.add(rider);
  const helm = mesh(G.sph(0.34, 16, 12), 0xf2f2f2, 0, 0.02, -0.02, rider.userData.parts.head, { th: 0.015 }); helm.scale.set(1, 1, 1.05);
  const visor = new THREE.Mesh(G.sph(0.3, 16, 10, 0, Math.PI, Math.PI * 0.35, Math.PI * 0.3), toon(0x223040)); visor.position.set(0, 0.0, 0.08); visor.rotation.y = -Math.PI / 2; rider.userData.parts.head.add(visor);
  const st = rider.userData.state; st.sit = 1; st.armUp = [1.1, 1.1]; st.armOut = [0.25, 0.25];
  g.userData = { rider, set(t) { rider.userData.apply(t); } };
  return g;
}
// phone with canvas screen
export function makePhone() {
  const g = new THREE.Group();
  mesh(G.rbox(0.36, 0.72, 0.04, 0.04), 0x15151a, 0, 0, 0, g, { th: 0.008 });
  const tex = canvasTex(256, 512, () => {}); const scr = new THREE.Mesh(G.plane(0.32, 0.66), new THREE.MeshBasicMaterial({ map: tex, toneMapped: false })); scr.position.z = 0.022; g.add(scr);
  let last = '';
  g.userData.show = (mode, v = 0) => {
    const key = mode + ':' + Math.round(v * 20); if (key === last) return; last = key;
    redraw(tex, (c, w, h) => {
      c.fillStyle = mode === 'off' ? '#050506' : '#0e1622'; c.fillRect(0, 0, w, h); if (mode === 'off') return;
      c.fillStyle = '#fff'; c.font = `22px ${FONT}`; c.textAlign = 'left'; c.fillText('22:14', 16, 30);
      const bars = mode === 'bar' ? 1 : mode === 'nav' ? 3 : 0;
      for (let i = 0; i < 4; i++) { c.fillStyle = i < bars ? '#fff' : 'rgba(255,255,255,0.25)'; c.fillRect(170 + i * 12, 30 - 6 - i * 5, 8, 6 + i * 5); }
      if (mode === 'nav') {
        c.fillStyle = '#26313f'; c.fillRect(0, 48, w, h - 48);
        c.strokeStyle = '#3a4a5c'; c.lineWidth = 10; for (let i = 0; i < 6; i++) { c.beginPath(); c.moveTo(-20, 100 + i * 80); c.lineTo(w + 20, 60 + i * 90); c.stroke(); }
        c.strokeStyle = '#2f9bff'; c.lineWidth = 14; c.lineCap = 'round'; c.beginPath(); c.moveTo(128, 470); c.bezierCurveTo(140, 380, 60, 300, 120, 200); c.bezierCurveTo(160, 140, 110, 100, 130, 60); c.stroke();
        c.fillStyle = '#fff'; c.beginPath(); c.moveTo(128, 400); c.lineTo(108, 440); c.lineTo(148, 440); c.fill();
        c.fillStyle = '#1a7a3a'; c.fillRect(0, 48, w, 70); c.fillStyle = '#fff'; c.font = `24px ${FONT}`; c.textAlign = 'center'; c.fillText('↑ 4 km  o\'rmon yo\'li', w / 2, 92);
        c.fillStyle = v < 0.1 ? '#ff3a3a' : '#fff'; c.font = `22px ${FONT}`; c.textAlign = 'right'; c.fillText(Math.max(1, Math.round(v * 100)) + '%', w - 14, 30);
      } else if (mode === 'low') {
        c.fillStyle = '#ff3a3a'; c.font = `120px ${FONT}`; c.textAlign = 'center'; c.fillText('1%', w / 2, 300);
        c.strokeStyle = '#ff3a3a'; c.lineWidth = 8; c.strokeRect(78, 340, 100, 46); c.fillRect(82, 344, 8, 38);
      } else if (mode === 'nosig') {
        c.fillStyle = '#fff'; c.font = `34px ${FONT}`; c.textAlign = 'center'; c.fillText('ALOQA', w / 2, 230); c.fillText("YO'Q", w / 2, 275);
        c.fillStyle = '#ffd040'; c.font = `26px ${FONT}`; c.fillText('Zaryad: ' + Math.round(v * 100) + '%', w / 2, 360);
        c.textAlign = 'right'; c.fillStyle = '#fff'; c.font = `22px ${FONT}`; c.fillText(Math.round(v * 100) + '%', w - 14, 30);
      } else if (mode === 'bar' || mode === 'sms') {
        c.fillStyle = '#1b2533'; c.fillRect(10, 70, w - 20, 230);
        c.fillStyle = '#fff'; c.font = `21px ${FONT}`; c.textAlign = 'left';
        ['Yordam! O\'rmonda', 'qolib ketdik.', 'Uch kishimiz.', 'Qishloq yo\'li.'].forEach((l, i) => c.fillText(l, 22, 110 + i * 40));
        c.fillStyle = '#ff3a3a'; c.textAlign = 'right'; c.fillText('3%', w - 14, 30);
        if (mode === 'sms') { c.fillStyle = '#2f9bff'; c.fillRect(30, 360, w - 60, 64); c.fillStyle = '#fff'; c.textAlign = 'center'; c.font = `26px ${FONT}`; c.fillText('Yuborilmoqda' + '...'.slice(0, 1 + Math.floor(v * 20) % 3), w / 2, 402); }
      }
    });
  };
  g.userData.show('nav', 0.3);
  return g;
}

// ---------------------------------------------------------------- CAST
const P = (o) => makePerson({ puffer: true, ...o });
export const CAST = {
  sardor: P({ top: 0x2f6b4f, beanie: 0x8a8f9a, pants: 0x232838 }),
  bekzod: P({ top: 0x2d5fd1, pants: 0x1f2433, hair: 0x2a1a12 }),
  otabek: P({ top: 0xb8322a, pants: 0x2a2a30, skin: 0xe8b890 }),
  resc1: P({ top: 0xff6a1a, pants: 0x1a1a22, beanie: 0xff6a1a }),
  resc2: P({ top: 0xff6a1a, pants: 0x1a1a22, beanie: 0x2a2a30 }),
};
export const WOLVES = [makeWolf(), makeWolf(), makeWolf()];
export const SLEDS = [makeSled(), makeSled(), makeSled()];

export const CRASH = { z: -120 };
// ---------------------------------------------------------------- FOREST (x 0)
export const FOREST = (() => {
  const g = new THREE.Group(); scene.add(g);
  const ground = mesh(G.plane(500, 500), SNOW, 0, 0, -80, g, { ink: false, cast: false }); ground.rotation.x = -Math.PI / 2;
  // road: strip of trodden snow with ruts
  const segs = 160, z0 = 60, z1 = -260; const pos = [], idx = [];
  for (let i = 0; i <= segs; i++) { const z = lerp(z0, z1, i / segs), x = roadX(z); pos.push(x - 2.6, 0.02, z, x + 2.6, 0.02, z); if (i) { const a = (i - 1) * 2; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); } }
  const rg = new THREE.BufferGeometry(); rg.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); rg.setIndex(idx); rg.computeVertexNormals();
  const road = new THREE.Mesh(rg, toon(0xc9d4e6)); road.receiveShadow = true; g.add(road);
  for (const off of [-0.85, 0.85]) {
    const rp = [], ri = [];
    for (let i = 0; i <= segs; i++) { const z = lerp(z0, z1, i / segs), x = roadX(z) + off; rp.push(x - 0.18, 0.03, z, x + 0.18, 0.03, z); if (i) { const a = (i - 1) * 2; ri.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); } }
    const gg = new THREE.BufferGeometry(); gg.setAttribute('position', new THREE.Float32BufferAttribute(rp, 3)); gg.setIndex(ri); gg.computeVertexNormals();
    const m = new THREE.Mesh(gg, toon(0xa8b6cc)); m.receiveShadow = true; g.add(m);
  }
  // snow banks along road
  const banks = [];
  for (let z = z0; z > z1; z -= 2.2) for (const s of [-1, 1]) banks.push(M4(roadX(z) + s * (3.0 + rnd() * 0.4), 0, z, 1, 0.45 + rnd() * 0.2, rnd() * 3));
  const bankG = G.sph(1, 12, 8); inst(bankG, SNOWM, banks.map(m => m.scale(new THREE.Vector3(1.3, 1, 1.6))), g, 0.03, false);
  // trees
  const pts = [];
  for (let i = 0; i < 1500; i++) {
    const z = lerp(z0 + 20, z1, rnd()); const side = rnd() < 0.5 ? -1 : 1; const d = 4.8 + Math.pow(rnd(), 0.7) * 55;
    const x = roadX(z) + side * d; const kx = roadX(CRASH.z) + 7, kz = CRASH.z;
    if (Math.hypot(x - kx, z - kz) < 19) continue;
    if (x > kx - 18 && x < kx - 4 && z > kz && z < kz + 52) continue;
    if (x > kx + 10 && x < kx + 62 && z > kz - 114 && z < kz - 58) continue;
    pts.push([x, z, 0.9 + rnd() * 0.9, rnd() * 6]);
  }
  forest(g, pts);
  // stars + moon
  const sp = []; for (let i = 0; i < 600; i++) { const a = rnd() * Math.PI * 2, e = 0.15 + rnd() * 1.2; sp.push(Math.cos(a) * Math.cos(e) * 250, Math.sin(e) * 250, Math.sin(a) * Math.cos(e) * 250 - 80); }
  const sg = new THREE.BufferGeometry(); sg.setAttribute('position', new THREE.Float32BufferAttribute(sp, 3));
  const stars = new THREE.Points(sg, new THREE.PointsMaterial({ color: 0xffffff, size: 1.2, sizeAttenuation: false, fog: false })); g.add(stars);
  const moonM = new THREE.Mesh(G.sph(6, 24, 16), new THREE.MeshBasicMaterial({ color: 0xf4f0d8, fog: false })); moonM.position.set(-90, 110, -230); g.add(moonM);
  // the car + crash hollow
  const car = makeCar(); g.add(car);
  const hollow = []; const cx = roadX(CRASH.z) + 7;
  for (let i = 0; i < 10; i++) hollow.push(M4(cx + Math.cos(i) * 5, -0.4, CRASH.z + Math.sin(i * 1.3) * 5, 2.2 + rnd(), 0.6, rnd() * 3));
  inst(G.sph(1, 14, 10), SNOWM, hollow, g, 0.03, false);
  const fire = makeFire(); g.add(fire); fire.position.set(cx - 9, 0, CRASH.z + 9);
  const spare = mesh(G.torus(0.42, 0.18, 12, 24), 0x141416, 0, 0, 0, g, { th: 0.02 }); spare.visible = false;
  for (const w of WOLVES) g.add(w); for (const s of SLEDS) g.add(s);
  const distLight = new THREE.Group(); g.add(distLight);
  for (const x of [-0.6, 0.6]) { const l = new THREE.Mesh(G.sph(0.35, 10, 8), new THREE.MeshBasicMaterial({ color: 0xfff2c8, fog: false })); l.position.x = x; distLight.add(l); }
  const halo = new THREE.Mesh(G.sph(6, 16, 12), new THREE.MeshBasicMaterial({ color: 0xffe8b0, transparent: true, opacity: 0.2, depthWrite: false, depthTest: false, blending: THREE.AdditiveBlending, fog: false })); distLight.add(halo);
  const village = new THREE.Group(); g.add(village); village.position.set(cx + 18, 0, CRASH.z - 70);
  for (let i = 0; i < 16; i++) { const h = new THREE.Group(); h.position.set((i % 4) * 9 + rnd() * 3, 0, Math.floor(i / 4) * -9 + rnd() * 3); village.add(h);
    mesh(G.box(5, 3, 4.5), 0xc8a07a, 0, 1.5, 0, h, { th: 0.04 }); const r = mesh(G.cone(4.2, 2.2, 4), 0x8a3a2a, 0, 4.1, 0, h, { th: 0.04 }); r.rotation.y = Math.PI / 4;
    mesh(G.cone(4.0, 1.0, 4), SNOWM, 0, 4.8, 0, h, { th: 0.03 }).rotation.y = Math.PI / 4;
    for (const x of [-1.2, 1.2]) { const w = new THREE.Mesh(G.plane(0.9, 0.9), glow(0xffc870, 2.2)); w.position.set(x, 1.6, 2.26); h.add(w); } }
  const mapP = new THREE.Mesh(G.plane(0.6, 0.45), new THREE.MeshBasicMaterial({ map: canvasTex(256, 192, (c2, w, h) => { c2.fillStyle = '#f2ead6'; c2.fillRect(0, 0, w, h); c2.strokeStyle = '#7ab070'; c2.lineWidth = 3; for (let i = 0; i < 8; i++) { c2.beginPath(); c2.arc(Math.random() * w, Math.random() * h, 20 + Math.random() * 30, 0, 7); c2.stroke(); } c2.strokeStyle = '#d03030'; c2.setLineDash([8, 6]); c2.lineWidth = 5; c2.beginPath(); c2.moveTo(20, 170); c2.bezierCurveTo(80, 120, 120, 150, 180, 60); c2.stroke(); c2.fillStyle = '#d03030'; c2.beginPath(); c2.arc(180, 60, 9, 0, 7); c2.fill(); }), side: THREE.DoubleSide })); g.add(mapP);
  return { g, car, fire, spare, stars, crashX: cx, distLight, village, mapP,
    update(t, c) {
      const night = c.tod !== 'day';
      stars.visible = night && !c.blizzard; moonM.visible = night && !c.blizzard;
      car.userData.set(c, t);
      fire.visible = !!c.fire; if (c.fire) fire.userData.set(t, c.fire, c.smoke ?? 1);
      distLight.visible = !!c.distLight; if (c.distLight) { distLight.position.set(c.distLight[0], 0.9, c.distLight[1]); distLight.rotation.y = c.distLight[2] || 0; }
      village.visible = !!c.village; spare.visible = !!c.spare; if (c.spare) { spare.position.copy(c.spare[0]); spare.rotation.set(c.spare[1], c.spare[2] || 0, 0); }
      mapP.visible = !!c.map; if (c.map) { mapP.position.copy(c.map[0]); mapP.rotation.set(-0.3, c.map[1], 0); }
    } };
})();
export function setEnv(c) {
      scene.background.set(c.tod === 'day' ? 0xb8c4d6 : c.tod === 'dusk' ? 0x31406e : 0x0c1530);
      scene.fog.color.copy(scene.background); scene.fog.near = c.blizzard ? 4 : 14; scene.fog.far = c.fogFar ?? (c.blizzard ? 26 : c.tod === 'day' ? 90 : 70);
      hemi.intensity = c.tod === 'day' ? 1.5 : c.tod === 'dusk' ? 1.0 : 0.55; hemi.color.set(c.tod === 'day' ? 0xe8eeff : 0x8aa6ff);
      moon.intensity = c.tod === 'day' ? 1.0 : 0.6; moon.color.set(c.tod === 'day' ? 0xffffff : 0xa8c0ff);
}

// ---------------------------------------------------------------- CAR interior (x 300)
export const CAR = (() => {
  const g = new THREE.Group(); scene.add(g); g.position.x = 300;
  const seat = 0x2a2c34, trim = 0x3a3c46;
  const no = { ink: false };
  mesh(G.box(1.9, 0.08, 3.4), 0x1c1d22, 0, 0.0, 0, g, no);                    // floor
  const roof = mesh(G.box(1.9, 0.06, 3.4), 0x4a4c56, 0, 1.45, 0, g, no);                   // roof
  for (const s of [-1, 1]) { mesh(G.box(0.06, 0.5, 3.4), trim, 0.95 * s, 0.25, 0, g, no); mesh(G.box(0.06, 0.12, 3.4), trim, 0.95 * s, 1.4, 0, g, no);
    for (const z of [-1.65, -0.2, 1.1]) mesh(G.box(0.06, 0.9, 0.12), trim, 0.95 * s, 0.95, z, g, no); }
  mesh(G.box(1.9, 0.9, 0.06), trim, 0, 0.45, -1.7, g, no); mesh(G.box(1.9, 0.12, 0.06), trim, 0, 1.4, -1.7, g, no);
  // dashboard
  const dash = mesh(G.rbox(1.85, 0.32, 0.5, 0.08), 0x202128, 0, 0.75, 1.45, g, { th: 0.01 });
  const gauge = canvasTex(512, 128, () => {}); const gm = new THREE.Mesh(G.plane(0.7, 0.175), new THREE.MeshBasicMaterial({ map: gauge, toneMapped: false })); gm.position.set(-0.45, 0.93, 1.21); gm.rotation.x = -0.35; gm.rotation.y = Math.PI; g.add(gm);
  gm.rotation.set(-0.35, Math.PI, 0); gm.scale.x = -1;
  let gk = '';
  const wheel = mesh(G.torus(0.19, 0.03, 8, 24), 0x111111, -0.45, 0.95, 1.05, g, { th: 0.008 }); wheel.rotation.x = 0.35;
  mesh(G.cyl(0.03, 0.03, 0.4, 8), 0x111111, -0.45, 0.88, 1.2, g, no).rotation.x = Math.PI / 2 - 0.35;
  // windshield + side windows showing the forest; frost layer
  const outTex = canvasTex(1024, 512, (c, w, h) => {
    const gr = c.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, '#0d1834'); gr.addColorStop(0.62, '#2b3f6e'); gr.addColorStop(0.63, '#b8c8e4'); gr.addColorStop(1, '#e8eefa'); c.fillStyle = gr; c.fillRect(0, 0, w, h);
    for (let i = 0; i < 120; i++) { c.fillStyle = 'rgba(255,255,255,0.8)'; c.fillRect(Math.random() * w, Math.random() * h * 0.5, 2, 2); }
    for (let i = 0; i < 46; i++) { const x = Math.random() * w, s = 40 + Math.random() * 90, y = h * 0.64; c.fillStyle = '#0f2a24'; c.beginPath(); c.moveTo(x, y - s * 2.6); c.lineTo(x - s * 0.55, y); c.lineTo(x + s * 0.55, y); c.fill();
      c.fillStyle = 'rgba(235,242,255,0.9)'; c.beginPath(); c.moveTo(x, y - s * 2.6); c.lineTo(x - s * 0.18, y - s * 1.8); c.lineTo(x + s * 0.18, y - s * 1.8); c.fill(); }
  });
  const winMat = new THREE.MeshBasicMaterial({ map: outTex, toneMapped: false, color: 0x8899bb });
  const ws = new THREE.Mesh(G.plane(1.85, 0.62), winMat); ws.position.set(0, 1.1, 1.66); ws.rotation.x = 0.35; ws.rotation.y = Math.PI; g.add(ws);
  const sides = []; for (const s of [-1, 1]) for (const z of [0.45, -0.95]) { const w = new THREE.Mesh(G.plane(1.3, 0.62), winMat); w.position.set(0.97 * s, 1.03, z); w.rotation.y = -s * Math.PI / 2; g.add(w); sides.push(w); }
  const rear = new THREE.Mesh(G.plane(1.8, 0.55), winMat); rear.position.set(0, 1.05, -1.72); g.add(rear);
  const frostTex = canvasTex(512, 256, (c, w, h) => { const gr = c.createRadialGradient(w / 2, h / 2, h * 0.15, w / 2, h / 2, w * 0.6); gr.addColorStop(0, 'rgba(230,240,255,0.15)'); gr.addColorStop(1, 'rgba(240,248,255,0.95)'); c.fillStyle = gr; c.fillRect(0, 0, w, h);
    c.strokeStyle = 'rgba(255,255,255,0.7)'; c.lineWidth = 1.5; for (let i = 0; i < 160; i++) { const x = Math.random() * w, y = Math.random() < 0.5 ? Math.random() * h * 0.3 : h - Math.random() * h * 0.3; c.beginPath(); c.moveTo(x, y); for (let k = 0; k < 4; k++) c.lineTo(x + (Math.random() - 0.5) * 40, y + (Math.random() - 0.5) * 30); c.stroke(); } });
  const frostMat = new THREE.MeshBasicMaterial({ map: frostTex, transparent: true, opacity: 0, depthWrite: false, toneMapped: false });
  const frosts = [ws, ...sides, rear].map(w => { const f = new THREE.Mesh(w.geometry, frostMat); f.position.copy(w.position); f.rotation.copy(w.rotation); f.translateZ(0.01); g.add(f); return f; });
  // snow covering windows from outside (bury)
  const snowCover = new THREE.MeshBasicMaterial({ color: 0xe8eefa, transparent: true, opacity: 0, toneMapped: false });
  const covers = [ws, ...sides, rear].map(w => { const f = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), snowCover); f.position.copy(w.position); f.rotation.copy(w.rotation); f.translateZ(-0.005); f.scale.set(w.geometry.parameters.width, 0.01, 1); g.add(f); return f; });
  // seats
  for (const x of [-0.45, 0.45]) { mesh(G.rbox(0.6, 0.18, 0.6, 0.06), seat, x, 0.42, 0.35, g, { th: 0.01 }); const b = mesh(G.rbox(0.6, 0.75, 0.16, 0.06), seat, x, 0.82, 0.0, g, { th: 0.01 }); b.rotation.x = -0.15; mesh(G.rbox(0.3, 0.2, 0.12, 0.04), seat, x, 1.28, -0.06, g, { th: 0.008 }); }
  mesh(G.rbox(1.7, 0.18, 0.6, 0.06), seat, 0, 0.42, -1.05, g, { th: 0.01 }); const bb = mesh(G.rbox(1.7, 0.7, 0.16, 0.06), seat, 0, 0.8, -1.4, g, { th: 0.01 }); bb.rotation.x = -0.12;
  mesh(G.rbox(0.25, 0.3, 0.9, 0.04), 0x18191e, 0, 0.45, 0.55, g, { th: 0.01 });
  // props: thermos, bread, chocolate, phone mount
  const thermos = mesh(G.cyl(0.06, 0.06, 0.32, 14), 0x3a6ad8, 0.05, 0.75, 0.6, g, { th: 0.008 });
  const bread = mesh(G.cyl(0.14, 0.14, 0.06, 18), 0xd09a50, 0.6, 0.55, -1.0, g, { th: 0.008 });
  const choco = []; for (let i = 0; i < 3; i++) choco.push(mesh(G.box(0.18, 0.02, 0.08), 0x6a3a20, -0.5 + i * 0.22, 0.53, -0.95, g, { th: 0.005 }));
  const ph = makePhone(); ph.scale.setScalar(0.4); ph.position.set(0.15, 0.98, 1.3); ph.rotation.set(-0.2, Math.PI, 0); g.add(ph);
  const hph = makePhone(); hph.scale.setScalar(0.28); g.add(hph);
  const match = new THREE.Mesh(G.cone(0.03, 0.08, 8), glow(0xffb040, 3)); g.add(match);
  const dome = new THREE.PointLight(0xffc98a, 0, 4, 1.5); dome.position.set(0, 1.35, 0); g.add(dome);
  const dashL = new THREE.PointLight(0x7ab8ff, 0, 2.5, 1.5); dashL.position.set(-0.3, 1.0, 1.2); g.add(dashL);
  const moonFill = new THREE.PointLight(0x9ab4ff, 2.2, 6, 1.2); moonFill.position.set(1.4, 1.6, 0.5); g.add(moonFill);
  const breath = []; for (let i = 0; i < 9; i++) { const b = new THREE.Mesh(G.sph(0.06, 10, 8), new THREE.MeshBasicMaterial({ color: 0xe8f0ff, transparent: true, opacity: 0, depthWrite: false })); g.add(b); breath.push(b); }
  const blanket = mesh(G.rbox(1.6, 0.25, 0.9, 0.12), 0x7a5a3a, 0, 0.75, -0.95, g, { th: 0.01 }); blanket.visible = false;
  return { g, phone: ph, thermos, bread, choco, blanket, hph,
    update(t, c) {
      const fuel = c.fuel ?? 0.5, temp = c.temp ?? -27;
      const key = `${Math.round(fuel * 50)}|${Math.round(temp)}|${c.engineOn ? 1 : 0}`;
      if (key !== gk) { gk = key; redraw(gauge, (x, w, h) => {
        x.fillStyle = '#05070c'; x.fillRect(0, 0, w, h);
        x.strokeStyle = '#3aa0ff'; x.lineWidth = 4; x.beginPath(); x.arc(110, 110, 80, Math.PI, 2 * Math.PI); x.stroke();
        const a = Math.PI + Math.PI * fuel; x.strokeStyle = fuel < 0.15 ? '#ff3a3a' : '#ffffff'; x.lineWidth = 6; x.beginPath(); x.moveTo(110, 110); x.lineTo(110 + Math.cos(a) * 70, 110 + Math.sin(a) * 70); x.stroke();
        x.fillStyle = fuel < 0.15 ? '#ff3a3a' : '#9ad0ff'; x.font = `28px ${FONT}`; x.textAlign = 'center'; x.fillText('⛽', 110, 100);
        x.fillStyle = '#9ad0ff'; x.font = `56px ${FONT}`; x.fillText(`${Math.round(temp)}°C`, 360, 85); x.font = `22px ${FONT}`; x.fillText('TASHQARIDA', 360, 115);
      }); }
      gm.material.color.setScalar(c.engineOn ? 1 : 0.15);
      dashL.intensity = c.engineOn ? 1.0 : 0; dome.intensity = c.dome ? 1.6 : 0;
      moonFill.intensity = c.tod === 'day' ? 4 : 2.2; moonFill.color.set(c.tod === 'day' ? 0xdde6ff : 0x9ab4ff);
      winMat.color.set(c.tod === 'day' ? 0xffffff : 0x8899bb);
      frostMat.opacity = c.frost || 0;
      const bury = c.bury || 0; snowCover.opacity = bury > 0 ? 0.97 : 0;
      for (const f of covers) { f.scale.y = Math.max(0.01, bury * 0.62); f.position.y = (f === covers[0] ? 1.1 : 1.03) - 0.31 + bury * 0.31; }
      ph.visible = !!c.mountPhone; if (c.mountPhone) ph.userData.show(...c.mountPhone);
      thermos.visible = c.thermos !== false; bread.visible = (c.bread ?? 1) > 0; choco.forEach((ch, i) => ch.visible = i < (c.choco ?? 3)); blanket.visible = !!c.blanket;
      wheel.rotation.z = c.steer || 0; roof.position.y = 1.45 - (c.roofSag || 0) * 0.12;
      hph.visible = !!c.handPhone; if (c.handPhone) { hph.position.copy(c.handPhone[0]); hph.rotation.set(-0.3, c.handPhone[1], 0); hph.userData.show(...c.handPhone[2]); }
      match.visible = false;
      // breath vapour from listed heads
      const heads = c.breath || [];
      breath.forEach((b, i) => { const hd = heads[i % Math.max(1, heads.length)]; if (!hd || !c.cold) { b.material.opacity = 0; return; }
        const k = ((t * 0.5 + i * 0.37) % 1); b.position.set(hd.x + 0.12 + k * 0.1, hd.y - 0.08 + k * 0.2, hd.z + 0.15 + k * 0.2); b.scale.setScalar(0.2 + k * 0.6); b.material.opacity = 0.12 * (1 - k) * (k < 0.5 ? 1 : 1); });
    } };
})();

// ---------------------------------------------------------------- HILL (x 600)
export const HILL = (() => {
  const g = new THREE.Group(); scene.add(g); g.position.x = 600;
  const ground = mesh(G.plane(300, 300), SNOW, 0, 0, 0, g, { ink: false, cast: false }); ground.rotation.x = -Math.PI / 2;
  const hill = mesh(G.sph(1, 40, 24), SNOWM, 0, -18, -6, g, { ink: false }); hill.scale.set(26, 22, 26);
  const pts = []; for (let i = 0; i < 500; i++) { const a = rnd() * Math.PI * 2, d = 12 + rnd() * 80; const x = Math.cos(a) * d, z = Math.sin(a) * d - 6; const hgt = Math.max(0, 22 * Math.sqrt(Math.max(0, 1 - (d / 26) ** 2)) - 18); if (d < 22 || (z > 0 && Math.abs(x) < 16)) continue; pts.push([x, z, 0.9 + rnd() * 0.9, rnd() * 6]); }
  forest(g, pts);
  const ph = makePhone(); ph.scale.setScalar(0.45); g.add(ph);
  return { g, phone: ph, topY: 4, update(t, c) { ph.visible = !!c.hillPhone; if (c.hillPhone) { ph.position.copy(c.hillPhone[0]); ph.rotation.set(-0.1, c.hillPhone[1], 0); ph.userData.show(...c.hillPhone[2]); } } };
})();

export const SETS = { FOREST, CAR, HILL };
export function showSet(name) { for (const [k, s] of Object.entries(SETS)) s.g.visible = k === name; }
export function place(p, set, x, y, z, yaw = 0) { set.g.add(p); p.position.set(x, y, z); p.visible = true; p.userData.state.yaw = yaw; return p; }
