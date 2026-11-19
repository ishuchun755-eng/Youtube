import { THREE, mesh, G, toon, glow, ink, canvasTex, redraw, FONT, makePerson, clamp, lerp, ss } from './engine.js';

export const scene = new THREE.Scene();
scene.background = new THREE.Color(0x070818);
scene.fog = new THREE.FogExp2(0x0a0b26, 0.035);

const rnd = (() => { let s = 7; return () => (s = (s * 16807) % 2147483647) / 2147483647; })();
const pick = a => a[Math.floor(rnd() * a.length)];

function shadowSun(color, inten, pos, size = 14) {
  const l = new THREE.DirectionalLight(color, inten); l.position.copy(pos); l.castShadow = true;
  l.shadow.mapSize.set(2048, 2048); l.shadow.bias = -0.0004; l.shadow.normalBias = 0.04;
  Object.assign(l.shadow.camera, { left: -size, right: size, top: size, bottom: -size, near: 0.5, far: 80 });
  return l;
}
function dust(n, box, color = 0xbfc8ff, size = 0.035) {
  const g = new THREE.BufferGeometry(); const p = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) { p[i * 3] = box[0] + rnd() * (box[3] - box[0]); p[i * 3 + 1] = box[1] + rnd() * (box[4] - box[1]); p[i * 3 + 2] = box[2] + rnd() * (box[5] - box[2]); }
  g.setAttribute('position', new THREE.BufferAttribute(p, 3));
  const m = new THREE.PointsMaterial({ color, size: size * 0.7, transparent: true, opacity: 0.45, depthWrite: false, blending: THREE.AdditiveBlending });
  const pts = new THREE.Points(g, m); pts.userData.base = p.slice(); pts.userData.box = box; return pts;
}
function moveDust(pts, run) {
  const a = pts.geometry.attributes.position.array, b = pts.userData.base, bx = pts.userData.box;
  for (let i = 0; i < a.length; i += 3) {
    a[i] = b[i] + Math.sin(run * 0.3 + i) * 0.15;
    const h = bx[4] - bx[1];
    a[i + 1] = bx[1] + ((b[i + 1] - bx[1] - run * 0.12 * (0.5 + (i % 7) / 7)) % h + h) % h;
    a[i + 2] = b[i + 2] + Math.cos(run * 0.25 + i) * 0.15;
  }
  pts.geometry.attributes.position.needsUpdate = true;
}

// ---------------------------------------------------------------- phone
export function makePhone() {
  const g = new THREE.Group();
  mesh(G.rbox(0.36, 0.72, 0.05, 0.02), 0x15151c, 0, 0, 0, g, { th: 0.008 });
  const tex = canvasTex(360, 720, () => {});
  const scr = new THREE.Mesh(G.plane(0.33, 0.67), new THREE.MeshBasicMaterial({ map: tex, toneMapped: false })); scr.position.z = 0.027; g.add(scr);
  g.userData = { tex, state: '' };
  g.userData.show = (state, a = {}) => {
    const key = state + JSON.stringify(a); if (g.userData.state === key) return; g.userData.state = key;
    redraw(tex, (c, w, h) => {
      if (state === 'off') { c.fillStyle = '#020204'; c.fillRect(0, 0, w, h); return; }
      const gr = c.createLinearGradient(0, 0, 0, h);
      if (state === 'call') { gr.addColorStop(0, '#1d0b3a'); gr.addColorStop(1, '#05030c'); }
      else { gr.addColorStop(0, '#2a3a9a'); gr.addColorStop(1, '#5b1f8a'); }
      c.fillStyle = gr; c.fillRect(0, 0, w, h);
      c.textAlign = 'center'; c.fillStyle = '#fff';
      if (state === 'time') {
        c.font = `92px ${FONT}`; c.fillText(a.time, w / 2, 250);
        c.font = `26px ${FONT}`; c.globalAlpha = .8; c.fillText(a.date || 'Payshanba, 19-noyabr', w / 2, 300); c.globalAlpha = 1;
        if (a.glitch) { c.fillStyle = 'rgba(255,40,80,.85)'; c.fillRect(0, 230 + (a.g || 0), w, 8); }
      } else if (state === 'call') {
        c.font = `24px ${FONT}`; c.globalAlpha = .7; c.fillText('Kiruvchi qo\'ng\'iroq', w / 2, 120); c.globalAlpha = 1;
        c.font = `40px ${FONT}`; c.fillText("NOMA'LUM", w / 2, 210); c.fillText('RAQAM', w / 2, 258);
        c.beginPath(); c.arc(w / 2, 390, 70, 0, 7); c.fillStyle = '#3a2a66'; c.fill(); c.font = `80px ${FONT}`; c.fillStyle = '#fff'; c.fillText('?', w / 2, 418);
        c.beginPath(); c.arc(90, 600, 40, 0, 7); c.fillStyle = '#e53950'; c.fill(); c.beginPath(); c.arc(270, 600, 40, 0, 7); c.fillStyle = '#2ecc71'; c.fill();
      }
    });
  };
  g.userData.show('time', { time: '08:00' });
  return g;
}

// ---------------------------------------------------------------- shared props
function windowsTex(seed, lit = 0.45) {
  return canvasTex(256, 512, (c, w, h) => {
    c.fillStyle = '#0b0c1c'; c.fillRect(0, 0, w, h);
    let s = seed; const r = () => (s = (s * 9301 + 49297) % 233280) / 233280;
    for (let y = 16; y < h - 20; y += 40) for (let x = 14; x < w - 20; x += 38) {
      const v = r(); c.fillStyle = v < lit ? (v < lit * .3 ? '#ffb86b' : v < lit * .6 ? '#9fd0ff' : '#ff9ad8') : '#151730';
      c.fillRect(x, y, 22, 26);
    }
  });
}
const WTEX = [1, 2, 3, 4].map(i => windowsTex(i * 77));
function building(parent, x, z, w, h, d, col, seed = 0) {
  const t = WTEX[seed % 4];
  const mat = new THREE.MeshToonMaterial({ color: col, map: t, emissiveMap: t, emissive: 0xffffff, emissiveIntensity: 0.9, gradientMap: toon(0xffffff).gradientMap });
  const m = mesh(G.box(w, h, d), mat, x, h / 2, z, parent, { th: 0.04 });
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  mesh(G.box(w + 0.3, 0.3, d + 0.3), 0x1a1830, x, h + 0.15, z, parent, { th: 0.03 });
  return m;
}
function sign(parent, text, x, y, z, w, col = '#ff3ad0', ry = 0, size = 0.6) {
  const tex = canvasTex(512, 128, (c, W, H) => {
    c.fillStyle = 'rgba(0,0,0,0)'; c.fillRect(0, 0, W, H);
    c.font = `78px ${FONT}`; c.textAlign = 'center'; c.textBaseline = 'middle';
    c.shadowColor = col; c.shadowBlur = 18; c.fillStyle = col; c.fillText(text, W / 2, H / 2 + 4); c.fillStyle = '#fff'; c.shadowBlur = 0; c.globalAlpha = .55; c.fillText(text, W / 2, H / 2 + 4);
  });
  const m = new THREE.Mesh(G.plane(w, w / 4), new THREE.MeshBasicMaterial({ map: tex, transparent: true, toneMapped: false, color: new THREE.Color(2.2, 2.2, 2.2) }));
  m.position.set(x, y, z); m.rotation.y = ry; parent.add(m); return m;
}
export function makeCar(col) {
  const g = new THREE.Group();
  mesh(G.rbox(2.1, 0.55, 4.0, 0.15), col, 0, 0.55, 0, g, { th: 0.03 });
  mesh(G.rbox(1.8, 0.5, 2.0, 0.12), 0x9fc4ff, 0, 1.05, -0.2, g, { th: 0.03 });
  mesh(G.rbox(1.84, 0.12, 2.04, 0.05), col, 0, 1.32, -0.2, g, { th: 0.02 });
  for (const [x, z] of [[-1, 1.3], [1, 1.3], [-1, -1.3], [1, -1.3]]) { const w = mesh(G.cyl(0.36, 0.36, 0.28, 18), 0x111116, x, 0.36, z, g, { th: 0.02 }); w.rotation.z = Math.PI / 2; }
  for (const x of [-0.7, 0.7]) {
    const hl = new THREE.Mesh(G.box(0.4, 0.16, 0.05), glow(0xfff1c4, 3)); hl.position.set(x, 0.62, 2.01); g.add(hl);
    const tl = new THREE.Mesh(G.box(0.4, 0.14, 0.05), glow(0xff2040, 2.5)); tl.position.set(x, 0.62, -2.01); g.add(tl);
  }
  const beam = new THREE.Mesh(new THREE.ConeGeometry(1.4, 7, 20, 1, true), new THREE.MeshBasicMaterial({ color: 0xfff0c0, transparent: true, opacity: 0.07, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide }));
  beam.rotation.x = -Math.PI / 2; beam.position.set(0, 0.6, 5.5); g.add(beam);
  return g;
}
function makeBird() {
  const g = new THREE.Group();
  const b = mesh(G.sph(0.22, 16, 12), 0xf4f4ff, 0, 0, 0, g, { th: 0.015 }); b.scale.set(1, 0.8, 1.6);
  mesh(G.sph(0.14, 14, 10), 0xf4f4ff, 0, 0.08, 0.32, g, { th: 0.012 });
  const bk = mesh(G.cone(0.05, 0.16, 8), 0xffb030, 0, 0.06, 0.5, g, { th: 0.01 }); bk.rotation.x = Math.PI / 2;
  const wings = [];
  for (const s of [-1, 1]) { const p = new THREE.Group(); p.position.set(0.12 * s, 0.05, 0); g.add(p); const w = mesh(G.box(0.7, 0.03, 0.32), 0xe0e0f4, 0.36 * s, 0, 0, p, { th: 0.012 }); wings.push({ p, s }); }
  const ring = new THREE.Mesh(G.torus(0.9, 0.015, 8, 48), glow(0x9ad8ff, 2.5)); g.add(ring);
  g.userData = { wings, ring };
  return g;
}

// ---------------------------------------------------------------- ROOM (origin 0,0,0)
export const ROOM = (() => {
  const g = new THREE.Group(); scene.add(g);
  const wallC = 0x3b3f78, wallN = 0x2b2c5c;
  mesh(G.box(8, 0.2, 8), 0x5b3f3a, 0, -0.1, 0, g, { ink: false });
  for (let i = -3; i <= 3; i++) mesh(G.box(0.03, 0.01, 8), 0x40292a, i * 1.1, 0.005, 0, g, { ink: false });
  // back wall with window hole x[-0.6,1.6] y[1,2.6]
  mesh(G.box(3.4, 3.4, 0.2), wallC, -2.3, 1.7, -3.6, g, { ink: false });
  mesh(G.box(2.4, 3.4, 0.2), wallC, 2.8, 1.7, -3.6, g, { ink: false });
  mesh(G.box(2.2, 1.0, 0.2), wallC, 0.5, 0.5, -3.6, g, { ink: false });
  mesh(G.box(2.2, 0.8, 0.2), wallC, 0.5, 3.0, -3.6, g, { ink: false });
  mesh(G.box(0.2, 3.4, 8), wallN, -4, 1.7, 0, g, { ink: false });
  mesh(G.box(0.2, 3.4, 8), wallN, 4, 1.7, 0, g, { ink: false });
  mesh(G.box(8, 0.2, 8), 0x23244a, 0, 3.45, 0, g, { ink: false });
  // window frame
  for (const [x, y, w, h] of [[0.5, 1.0, 2.3, 0.1], [0.5, 2.6, 2.3, 0.1], [-0.6, 1.8, 0.1, 1.7], [1.6, 1.8, 0.1, 1.7], [0.5, 1.8, 0.06, 1.6]]) mesh(G.box(w, h, 0.16), 0xd8d8e8, x, y, -3.5, g, { th: 0.015 });
  // curtain
  const cur = mesh(G.box(0.5, 1.9, 0.06), 0x7a3a8a, -0.95, 1.85, -3.42, g, { th: 0.015 });
  // outside: backdrop + road + cars
  const out = new THREE.Group(); g.add(out);
  const skyTexN = canvasTex(1024, 512, (c, w, h) => {
    const gr = c.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, '#0a0b2a'); gr.addColorStop(1, '#3a1d6e'); c.fillStyle = gr; c.fillRect(0, 0, w, h);
    for (let i = 0; i < 90; i++) { c.fillStyle = `rgba(255,255,255,${Math.random() * .8})`; c.fillRect(Math.random() * w, Math.random() * h * .5, 2, 2); }
    let x = 0; while (x < w) { const bw = 30 + Math.random() * 60, bh = 120 + Math.random() * 230; c.fillStyle = '#10112a'; c.fillRect(x, h - bh, bw, bh);
      for (let yy = h - bh + 10; yy < h - 10; yy += 18) for (let xx = x + 6; xx < x + bw - 8; xx += 14) if (Math.random() < .4) { c.fillStyle = pick(['#ffcf7a', '#9fd0ff', '#ff9ad8']); c.fillRect(xx, yy, 6, 8); }
      x += bw + 6; }
  });
  const skyTexM = canvasTex(1024, 512, (c, w, h) => {
    const gr = c.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, '#7fb2ff'); gr.addColorStop(1, '#ffd1a8'); c.fillStyle = gr; c.fillRect(0, 0, w, h);
    let x = 0; while (x < w) { const bw = 30 + Math.random() * 60, bh = 120 + Math.random() * 230; c.fillStyle = '#8f95c4'; c.fillRect(x, h - bh, bw, bh);
      for (let yy = h - bh + 10; yy < h - 10; yy += 18) for (let xx = x + 6; xx < x + bw - 8; xx += 14) { c.fillStyle = '#b8c4ee'; c.fillRect(xx, yy, 6, 8); } x += bw + 6; }
  });
  const sky = new THREE.Mesh(G.plane(40, 20), new THREE.MeshBasicMaterial({ map: skyTexN, toneMapped: false, fog: false })); sky.position.set(0.5, 4, -22); out.add(sky);
  mesh(G.box(40, 0.1, 6), 0x1c1d30, 0.5, -0.5, -12, out, { ink: false });
  const cars = [];
  for (let i = 0; i < 4; i++) { const c = makeCar(pick([0xe8463a, 0x3a7bff, 0xf2c94c, 0xeaeaea])); c.rotation.y = Math.PI / 2 * (i % 2 ? 1 : -1); c.position.set(-10 + i * 6, -0.45, -11 + (i % 2) * 2); c.scale.setScalar(0.8); out.add(c); cars.push(c); }
  // bed
  mesh(G.rbox(1.6, 0.4, 2.4, 0.06), 0x6a4a6a, -2.6, 0.3, -2.3, g);
  mesh(G.rbox(1.5, 0.22, 2.3, 0.08), 0xe8e8f4, -2.6, 0.6, -2.3, g);
  mesh(G.rbox(1.6, 1.0, 0.12, 0.04), 0x6a4a6a, -2.6, 0.75, -3.45, g);
  mesh(G.rbox(0.9, 0.18, 0.45, 0.08), 0xffffff, -2.6, 0.8, -3.1, g);
  const blanket = mesh(G.rbox(1.56, 0.16, 1.5, 0.07), 0x3b6fe0, -2.6, 0.76, -1.75, g);
  // nightstand + phone
  mesh(G.rbox(0.6, 0.6, 0.55, 0.04), 0x8a5a4a, -1.35, 0.3, -3.0, g);
  const lamp = mesh(G.cyl(0.12, 0.2, 0.3, 16), 0x8a5aa8, -1.2, 0.76, -3.1, g, { th: 0.012 });
  const phone = makePhone(); phone.rotation.x = -Math.PI / 2; phone.position.set(-1.45, 0.625, -2.9); phone.scale.setScalar(0.55); g.add(phone);
  // wall clock
  const clockG = new THREE.Group(); clockG.position.set(2.6, 2.35, -3.48); g.add(clockG);
  const cf = canvasTex(256, 256, (c, w, h) => { c.fillStyle = '#f4f1ea'; c.beginPath(); c.arc(128, 128, 124, 0, 7); c.fill(); c.fillStyle = '#1a1830'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.font = `30px ${FONT}`;
    for (let i = 1; i <= 12; i++) { const a = i / 12 * Math.PI * 2 - Math.PI / 2; c.fillText(String(i), 128 + Math.cos(a) * 95, 128 + Math.sin(a) * 95); } });
  mesh(G.cyl(0.42, 0.42, 0.08, 40), 0x1a1830, 0, 0, 0, clockG, { th: 0.015 }).rotation.x = Math.PI / 2;
  const face = new THREE.Mesh(G.plane(0.74, 0.74), new THREE.MeshBasicMaterial({ map: cf })); face.position.z = 0.045; clockG.add(face);
  const hand = (len, wdt, col, z) => { const p = new THREE.Group(); p.position.z = z; const m = new THREE.Mesh(G.box(wdt, len, 0.01), new THREE.MeshBasicMaterial({ color: col })); m.position.y = len / 2 - 0.03; p.add(m); clockG.add(p); return p; };
  const hH = hand(0.2, 0.035, 0x1a1830, 0.05), hM = hand(0.3, 0.025, 0x1a1830, 0.055), hS = hand(0.32, 0.01, 0xe03050, 0.06);
  // fan
  const fan = new THREE.Group(); fan.position.set(0.3, 3.35, -1.2); g.add(fan);
  mesh(G.cyl(0.03, 0.03, 0.35, 8), 0xdddde8, 0, -0.17, 0, fan, { th: 0.01 });
  mesh(G.cyl(0.16, 0.2, 0.18, 20), 0xdddde8, 0, -0.38, 0, fan, { th: 0.012 });
  const blades = new THREE.Group(); blades.position.y = -0.4; fan.add(blades);
  for (let i = 0; i < 4; i++) { const b = mesh(G.box(1.0, 0.025, 0.22), 0xb08a6a, 0.6, 0, 0, null, { th: 0.012 }); const p = new THREE.Group(); p.rotation.y = i * Math.PI / 2; p.add(b); blades.add(p); }
  // desk
  mesh(G.rbox(1.0, 0.08, 1.8, 0.03), 0x8a5a4a, 3.3, 0.78, 0.2, g);
  for (const [x, z] of [[2.9, -0.6], [3.7, -0.6], [2.9, 1.0], [3.7, 1.0]]) mesh(G.box(0.06, 0.78, 0.06), 0x6a4a3a, x, 0.39, z, g, { th: 0.01 });
  for (let i = 0; i < 4; i++) mesh(G.box(0.3, 0.07, 0.42), pick([0xe85a5a, 0x5a8ae8, 0xe8c45a, 0x5ae8a0]), 3.3, 0.86 + i * 0.07, 0.6, g, { th: 0.008 });
  const poster = canvasTex(256, 360, (c, w, h) => { const gr = c.createLinearGradient(0, 0, w, h); gr.addColorStop(0, '#ff3ad0'); gr.addColorStop(1, '#3a3aff'); c.fillStyle = gr; c.fillRect(0, 0, w, h);
    c.fillStyle = '#fff'; c.font = `52px ${FONT}`; c.textAlign = 'center'; c.fillText('KOSMOS', w / 2, 300); c.beginPath(); c.arc(128, 150, 70, 0, 7); c.fillStyle = '#ffd36b'; c.fill(); });
  const pm = new THREE.Mesh(G.plane(0.9, 1.26), new THREE.MeshToonMaterial({ map: poster, gradientMap: toon(0xffffff).gradientMap })); pm.position.set(3.88, 1.9, -1.2); pm.rotation.y = -Math.PI / 2; g.add(pm);
  // lights
  const hemi = new THREE.HemisphereLight(0x9aa6ff, 0x30203a, 0.6); g.add(hemi);
  const sun = shadowSun(0x9fb4ff, 1.2, new THREE.Vector3(1.5, 6, -9), 8); sun.target.position.set(-1, 0, 0); g.add(sun, sun.target);
  const lampL = new THREE.PointLight(0xc070ff, 1.2, 5, 2); lampL.position.set(-1.0, 1.4, -2.6); g.add(lampL);
  const phoneL = new THREE.PointLight(0x7090ff, 0, 2.5, 2); phoneL.position.set(-1.45, 0.9, -2.9); g.add(phoneL);
  const dp = dust(70, [-3.5, 0.3, -3.3, 3.5, 3.2, 2]); g.add(dp);
  const J = makePerson({ top: 0x2f62d8 }); g.add(J);
  return {
    g, J, phone, cars, dp, blades,
    update(t, ctx) {
      const morning = ctx.tod === 'morning';
      sky.material.map = morning ? skyTexM : skyTexN;
      hemi.color.set(morning ? 0xffe6cc : 0x6a78e8); hemi.groundColor.set(morning ? 0x806050 : 0x1a1030); hemi.intensity = morning ? 2.1 : 0.6;
      sun.color.set(morning ? 0xffd2a0 : 0x8fa6ff); sun.intensity = morning ? 3.4 : 1.0;
      lampL.intensity = morning ? 0 : 1.0; phoneL.intensity = ctx.phoneGlow || 0;
      scene.fog.color.set(morning ? 0x8a7aa0 : 0x0a0b26); scene.background.set(morning ? 0x6a6aa0 : 0x070818);
      // clock
      const cs = ctx.clockSec;
      hS.rotation.z = -(cs % 60) / 60 * Math.PI * 2; hM.rotation.z = -((cs / 60) % 60) / 60 * Math.PI * 2; hH.rotation.z = -((cs / 3600) % 12) / 12 * Math.PI * 2;
      blades.rotation.y = ctx.fanAngle;
      cars.forEach((c, i) => { c.position.x = -10 + i * 6 + ((ctx.run * 7 * (i % 2 ? -1 : 1)) % 24 + 24) % 24 - 12; });
      moveDust(dp, ctx.run);
    },
  };
})();

// ---------------------------------------------------------------- STREET (origin 100)
export const STREET = (() => {
  const O = 100; const g = new THREE.Group(); g.position.x = O; scene.add(g);
  mesh(G.box(140, 0.2, 60), 0x14152a, 0, -0.12, 0, g, { ink: false });
  mesh(G.box(140, 0.05, 9), 0x1f2036, 0, 0, 0, g, { ink: false });
  for (let x = -66; x < 66; x += 4) mesh(G.box(2, 0.02, 0.18), 0xd8c86a, x, 0.04, 0, g, { ink: false });
  for (const z of [-6.2, 6.2]) { mesh(G.box(140, 0.28, 3.4), 0x34365a, 0, 0.14, z, g, { th: 0.02 }); }
  const cols = [0x2a2c5a, 0x3a2a5e, 0x24304e, 0x2e2450, 0x1f2a4a];
  for (let i = 0; i < 16; i++) {
    const x = -64 + i * 8.4; const h = 8 + rnd() * 14;
    building(g, x, -12.5 - rnd() * 2, 7.6, h, 7, pick(cols), i);
    building(g, x + 3, 13 + rnd() * 2, 7.6, 6 + rnd() * 12, 7, pick(cols), i + 1);
  }
  // shop front + apartment door
  mesh(G.box(6, 3.2, 0.3), 0x2d2650, 6, 1.6, -8.5, g, { th: 0.03 });
  const shopWin = new THREE.Mesh(G.plane(4.2, 2.0), glow(0x9ad8ff, 0.9)); shopWin.position.set(6, 1.4, -8.33); g.add(shopWin);
  sign(g, "DO'KON 24/7", 6, 3.6, -8.3, 4.4, '#45e0ff');
  sign(g, 'KAFE', -18, 3.4, -8.6, 2.6, '#ff3ad0');
  sign(g, 'DORIXONA', 24, 3.6, -8.6, 3.6, '#5bff9a');
  mesh(G.box(1.4, 2.4, 0.2), 0x6a3a2a, -6, 1.2, -8.45, g, { th: 0.02 });
  const doorLight = new THREE.Mesh(G.box(0.5, 0.2, 0.2), glow(0xffd090, 2)); doorLight.position.set(-6, 2.7, -8.3); g.add(doorLight);
  // street lights
  const lampPos = [-24, -12, 0, 12, 24, 36];
  for (const x of lampPos) {
    mesh(G.cyl(0.07, 0.1, 5, 10), 0x2a2a3a, x, 2.5, -5.4, g, { th: 0.015 });
    mesh(G.box(1.2, 0.08, 0.08), 0x2a2a3a, x, 4.95, -5.0, g, { th: 0.012 });
    const b = new THREE.Mesh(G.sph(0.16, 12, 10), glow(x % 24 === 0 ? 0xc59bff : 0x8fd8ff, 3.5)); b.position.set(x, 4.85, -4.5); g.add(b);
    const cone = new THREE.Mesh(new THREE.ConeGeometry(2.2, 4.8, 24, 1, true), new THREE.MeshBasicMaterial({ color: x % 24 === 0 ? 0xb080ff : 0x80c8ff, transparent: true, opacity: 0.06, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide }));
    cone.position.set(x, 2.45, -4.5); g.add(cone);
  }
  for (const [x, c] of [[0, 0xb080ff], [12, 0x80c8ff], [24, 0xb080ff], [-12, 0x80c8ff]]) { const l = new THREE.PointLight(c, 22, 14, 1.8); l.position.set(x, 4.5, -4.3); g.add(l); }
  const shopL = new THREE.PointLight(0x45e0ff, 10, 9, 2); shopL.position.set(6, 2.5, -6.5); g.add(shopL);
  g.add(new THREE.HemisphereLight(0x5a66d0, 0x140c22, 0.75));
  const moon = shadowSun(0x9fb0ff, 1.1, new THREE.Vector3(-10, 22, 12), 30); moon.target.position.set(0, 0, 0); g.add(moon, moon.target);
  const moonM = new THREE.Mesh(G.sph(3, 24, 16), glow(0xe8ecff, 1.6)); moonM.position.set(20, 38, -70); g.add(moonM);
  // cars
  const cars = [];
  const carDef = [[-30, -2.2, 1, 0xe8463a], [-8, -2.2, 1, 0xf2c94c], [14, 2.2, -1, 0x3a7bff], [-20, 2.2, -1, 0xeaeaea], [30, -2.2, 1, 0x8a4ae8]];
  for (const [x, z, dir, col] of carDef) { const c = makeCar(col); c.rotation.y = dir > 0 ? Math.PI / 2 : -Math.PI / 2; c.position.set(x, 0, z); g.add(c); cars.push({ c, x, dir }); }
  // pedestrians
  const peds = [];
  const pdef = [[-3, -6.4, 1, 0xd0605a], [3.5, -6.0, -1, 0x6aa86a], [10, -6.6, 1, 0xe0b04a], [16, -6.2, -1, 0x8a6ad0], [-12, -6.3, 1, 0x4ab0c0], [20, 6.3, -1, 0xc06a9a]];
  for (const [x, z, dir, col] of pdef) {
    const p = makePerson({ top: col, hair: pick([0x1a1210, 0x5a3a20, 0x2a2a2a]), skin: pick([0xf0c49c, 0xd9a47c, 0xb07a56]), pants: 0x2a2d40 });
    p.position.set(x, 0.28, z); p.userData.state.yaw = dir > 0 ? Math.PI / 2 : -Math.PI / 2; g.add(p); peds.push({ p, x, dir, ph: rnd() });
  }
  const bird = makeBird(); bird.scale.setScalar(2.2); bird.position.set(1, 8, -1.5); bird.rotation.y = -0.6; g.add(bird);
  const leaves = dust(140, [-30, 0.4, -9, 30, 9, 8], 0xd8b0ff, 0.06); g.add(leaves);
  const J = makePerson({ top: 0x2f62d8 }); g.add(J);
  const S = makePerson({ top: 0x221a33, coat: true, hat: true, beard: true, skin: 0xd9b08c, eye: 0x9b5cff, pants: 0x151320 }); g.add(S);
  return {
    g, O, J, S, bird, cars, peds,
    update(t, ctx) {
      for (const c of cars) c.c.position.x = ((c.x + ctx.run * 9 * c.dir + 70) % 140 + 140) % 140 - 70;
      for (const p of peds) {
        p.p.position.x = p.x + ctx.run * 1.1 * p.dir;
        const s = p.p.userData.state; s.walk = p.ph + ctx.run * 1.6; s.walkAmt = 1; s.frozen = ctx.frozen; p.p.userData.apply(t);
      }
      const flap = Math.sin(ctx.run * 14) * 0.7 + 0.2;
      for (const w of bird.userData.wings) w.p.rotation.z = w.s * (ctx.frozen ? 0.55 : flap);
      const br = ctx.birdRun || 0; bird.position.set(1 + br * 4, 8 + br * 0.8, -1.5 - br * 2);
      bird.userData.ring.visible = ctx.frozen; bird.userData.ring.rotation.set(Math.PI / 2, 0, t);
      bird.userData.ring.scale.setScalar(1 + 0.08 * Math.sin(t * 3));
      moveDust(leaves, ctx.run);
    },
  };
})();

// ---------------------------------------------------------------- SHOP (origin 200)
export const SHOP = (() => {
  const g = new THREE.Group(); g.position.x = 200; scene.add(g);
  mesh(G.box(12, 0.2, 10), 0xc8c8d8, 0, -0.1, 0, g, { ink: false });
  for (let i = -5; i <= 5; i++) mesh(G.box(0.03, 0.01, 10), 0xa8a8bc, i, 0.005, 0, g, { ink: false });
  mesh(G.box(12, 3.6, 0.2), 0x3a4a8a, 0, 1.8, -4.5, g, { ink: false });
  mesh(G.box(0.2, 3.6, 10), 0x34407a, -6, 1.8, 0, g, { ink: false });
  mesh(G.box(0.2, 3.6, 10), 0x34407a, 6, 1.8, 0, g, { ink: false });
  mesh(G.box(12, 0.2, 10), 0x2a3060, 0, 3.6, 0, g, { ink: false });
  for (const x of [-3, 0, 3]) { const p = new THREE.Mesh(G.box(2, 0.05, 0.4), glow(0xdff4ff, 2)); p.position.set(x, 3.48, 0); g.add(p); }
  mesh(G.box(5.6, 3.6, 0.2), 0x34407a, -3.2, 1.8, 5, g, { ink: false }); mesh(G.box(4.6, 3.6, 0.2), 0x34407a, 3.7, 1.8, 5, g, { ink: false }); mesh(G.box(1.8, 1.0, 0.2), 0x34407a, 0.3, 3.1, 5, g, { ink: false });
  const doorGlow = new THREE.Mesh(G.plane(1.8, 2.6), glow(0x1a2a6a, 1)); doorGlow.position.set(0.3, 1.3, 5.12); doorGlow.rotation.y = Math.PI; g.add(doorGlow);
  // shelves with products (instanced)
  const prodGeo = G.box(0.28, 0.36, 0.22); const prodMat = new THREE.MeshToonMaterial({ gradientMap: toon(0xffffff).gradientMap });
  const shelves = [[-3.2, -1.2], [-3.2, 1.2], [0.2, -1.2]];
  const N = 3 * 2 * 3 * 12; const inst = new THREE.InstancedMesh(prodGeo, prodMat, N); inst.castShadow = true; let k = 0; const m4 = new THREE.Matrix4(); const col = new THREE.Color();
  for (const [sx, sz] of shelves) {
    mesh(G.box(3.6, 1.25, 0.7), 0xe8e8f0, sx, 0.625, sz, g, { th: 0.02 });
    for (const side of [-1, 1]) for (let r = 0; r < 3; r++) for (let i = 0; i < 12; i++) {
      m4.makeTranslation(sx - 1.6 + i * 0.29, 0.25 + r * 0.4, sz + side * 0.42); inst.setMatrixAt(k, m4);
      inst.setColorAt(k, col.set(pick([0xe8463a, 0xf2c94c, 0x3a7bff, 0x5ae8a0, 0xff7ad0, 0xff9a3a]))); k++;
    }
  }
  g.add(inst);
  // fridge
  mesh(G.box(3.2, 2.6, 0.8), 0xdfe6f2, 3.6, 1.3, -4.0, g, { th: 0.02 });
  const fr = new THREE.Mesh(G.plane(2.9, 2.2), glow(0x9fe8ff, 1.1)); fr.position.set(3.6, 1.35, -3.59); g.add(fr);
  for (let r = 0; r < 4; r++) for (let i = 0; i < 9; i++) { const b = new THREE.Mesh(G.cyl(0.07, 0.07, 0.38, 8), toon(pick([0xe83a3a, 0x3ab0e8, 0xf2c94c, 0x3ae86a]))); b.position.set(2.4 + i * 0.3, 0.5 + r * 0.52, -3.75); g.add(b); }
  // counter + cashier
  mesh(G.rbox(2.6, 1.0, 0.9, 0.05), 0x7a4a6a, 3.6, 0.5, 1.8, g);
  const reg = mesh(G.rbox(0.5, 0.35, 0.4, 0.04), 0x2a2a34, 3.2, 1.18, 1.7, g, { th: 0.012 });
  const cashier = makePerson({ top: 0xe85a3a, hair: 0x3a2010, skin: 0xd9a47c }); cashier.position.set(4.0, 0.0, 2.8); cashier.userData.state.yaw = Math.PI * 0.85; g.add(cashier);
  // TV
  const tvTex = canvasTex(320, 180, (c, w, h) => { c.fillStyle = '#050508'; c.fillRect(0, 0, w, h); });
  mesh(G.rbox(1.9, 1.1, 0.1, 0.03), 0x111116, -2.5, 2.7, -4.32, g, { th: 0.015 });
  const tv = new THREE.Mesh(G.plane(1.75, 0.98), new THREE.MeshBasicMaterial({ map: tvTex, toneMapped: false })); tv.position.set(-2.5, 2.7, -4.26); g.add(tv);
  g.add(new THREE.HemisphereLight(0xdfe8ff, 0x605a70, 1.7));
  const l1 = shadowSun(0xe0ecff, 2.2, new THREE.Vector3(2, 8, 5), 8); l1.target.position.set(0, 0, 0); g.add(l1, l1.target);
  const fl = new THREE.PointLight(0x9fe8ff, 6, 6, 2); fl.position.set(3.6, 1.5, -2.8); g.add(fl);
  const J = makePerson({ top: 0x2f62d8 }); g.add(J);
  const sp = dust(140, [-5.5, 0.3, -4, 5.5, 3.4, 4], 0xffffff, 0.03); g.add(sp);
  return {
    g, J, cashier, tvTex,
    update(t, ctx) {
      const s = cashier.userData.state; s.frozen = ctx.frozen; s.armUp = [0.9, 0.2]; cashier.userData.apply(t);
      redraw(tvTex, (c, w, h) => {
        c.fillStyle = '#050508'; c.fillRect(0, 0, w, h);
        if (ctx.tvStatic > 0) { const id = c.createImageData(w, h); for (let i = 0; i < id.data.length; i += 4) { const v = Math.random() * 255 * ctx.tvStatic; id.data[i] = id.data[i + 1] = id.data[i + 2] = v; id.data[i + 3] = 255; } c.putImageData(id, 0, 0); }
      });
      moveDust(sp, ctx.run);
    },
  };
})();

// ---------------------------------------------------------------- LIBRARY (origin 300)
export const LIB = (() => {
  const g = new THREE.Group(); g.position.x = 300; scene.add(g);
  mesh(G.box(14, 0.2, 12), 0x4a2e2a, 0, -0.1, 0, g, { ink: false });
  mesh(G.box(14, 5, 0.2), 0x2a2250, 0, 2.5, -5, g, { ink: false });
  const bookGeo = G.box(0.12, 0.42, 0.3); const bm = new THREE.MeshToonMaterial({ gradientMap: toon(0xffffff).gradientMap });
  const shelfX = [-5, -2.6, 2.6, 5]; const per = 5 * 16; const inst = new THREE.InstancedMesh(bookGeo, bm, shelfX.length * per); let k = 0; const m4 = new THREE.Matrix4(); const col = new THREE.Color();
  for (const sx of shelfX) {
    mesh(G.box(2.2, 4.2, 0.6), 0x5a3a2a, sx, 2.1, -4.5, g, { th: 0.02 });
    for (let r = 0; r < 5; r++) for (let i = 0; i < 16; i++) {
      const h = 0.75 + 0.25 * rnd();
      m4.compose(new THREE.Vector3(sx - 0.95 + i * 0.125, 0.45 + r * 0.8, -4.15), new THREE.Quaternion(), new THREE.Vector3(1, h, 1));
      inst.setMatrixAt(k, m4); inst.setColorAt(k, col.set(pick([0x8a2a2a, 0x2a4a8a, 0x2a6a4a, 0xb08a3a, 0x6a2a6a, 0x1a1a3a]))); k++;
    }
  }
  g.add(inst);
  // desk, lamp, books, papers
  mesh(G.rbox(2.6, 0.1, 1.3, 0.03), 0x7a4a32, 0, 0.82, 0.2, g);
  for (const [x, z] of [[-1.15, -0.35], [1.15, -0.35], [-1.15, 0.75], [1.15, 0.75]]) mesh(G.box(0.08, 0.82, 0.08), 0x5a3a2a, x, 0.41, z, g, { th: 0.01 });
  const lampHead = mesh(G.cyl(0.08, 0.26, 0.2, 16, true), 0x1f5a3a, 0.85, 1.45, -0.1, g, { th: 0.012 });
  mesh(G.cyl(0.02, 0.02, 0.6, 8), 0xc0a060, 0.85, 1.15, -0.1, g, { th: 0.008 });
  const bulb = new THREE.Mesh(G.sph(0.07, 10, 8), glow(0xffe0a0, 1.6));
  mesh(G.rbox(0.7, 0.08, 0.6, 0.03), 0x5a3a2a, 0.05, 0.48, -0.75, g); mesh(G.rbox(0.7, 0.8, 0.08, 0.03), 0x5a3a2a, 0.05, 0.9, -1.05, g);
  for (const [x, z] of [[-0.25, -0.5], [0.35, -0.5], [-0.25, -1.0], [0.35, -1.0]]) mesh(G.box(0.05, 0.48, 0.05), 0x4a2a1a, x, 0.24, z, g, { th: 0.008 }); bulb.position.set(0.85, 1.36, -0.1); g.add(bulb);
  const lampL = new THREE.PointLight(0xffd090, 4, 5, 2); lampL.position.set(0.85, 1.3, -0.1); g.add(lampL);
  const stack = new THREE.Group(); g.add(stack);
  for (let i = 0; i < 9; i++) { const b = mesh(G.box(0.5, 0.09, 0.36), pick([0x8a2a2a, 0x2a4a8a, 0x2a6a4a, 0xb08a3a]), -0.9, 0.92 + i * 0.09, 0.0, stack, { th: 0.008 }); b.rotation.y = (rnd() - .5) * .4; }
  const book = mesh(G.box(0.7, 0.04, 0.45), 0xf4efe0, 0.05, 0.9, 0.45, g, { th: 0.01 });
  const paper = canvasTex(256, 340, (c, w, h) => { c.fillStyle = '#fbf8ef'; c.fillRect(0, 0, w, h); c.fillStyle = '#1a1a3a'; c.font = `34px ${FONT}`; c.fillText('IMTIHON', 30, 56);
    c.strokeStyle = '#8a8ab0'; c.lineWidth = 3; for (let i = 0; i < 8; i++) { c.beginPath(); c.moveTo(30, 100 + i * 28); c.lineTo(226, 100 + i * 28); c.stroke(); }
    c.fillStyle = '#e03050'; c.font = `80px ${FONT}`; c.fillText('5', 180, 320); });
  const pp = new THREE.Mesh(G.plane(0.4, 0.53), new THREE.MeshBasicMaterial({ map: paper })); pp.rotation.x = -Math.PI / 2; pp.rotation.z = 0.2; pp.position.set(0.55, 0.875, 0.55); g.add(pp);
  // certificates wall (montage)
  const cert = (txt) => canvasTex(300, 220, (c, w, h) => { c.fillStyle = '#f7eecf'; c.fillRect(0, 0, w, h); c.strokeStyle = '#c99a3a'; c.lineWidth = 10; c.strokeRect(10, 10, w - 20, h - 20);
    c.fillStyle = '#5a3a1a'; c.font = `30px ${FONT}`; c.textAlign = 'center'; c.fillText(txt, w / 2, 90); c.beginPath(); c.arc(w / 2, 150, 32, 0, 7); c.fillStyle = '#e8b830'; c.fill(); });
  ['SERTIFIKAT', 'DIPLOM', "1-O'RIN", 'OLIMPIADA'].forEach((s, i) => { const m = new THREE.Mesh(G.plane(1.0, 0.73), new THREE.MeshToonMaterial({ map: cert(s), gradientMap: toon(0xffffff).gradientMap })); m.position.set(-1.6 + i * 1.07, 3.6, -4.88); g.add(m); });
  g.add(new THREE.HemisphereLight(0x7a6ad8, 0x1a1020, 0.6));
  const l1 = shadowSun(0x9a9aff, 0.8, new THREE.Vector3(-4, 9, 6), 8); l1.target.position.set(0, 0, 0); g.add(l1, l1.target);
  const J = makePerson({ top: 0x2f62d8 }); g.add(J);
  const dp = dust(160, [-6, 0.3, -4.5, 6, 4.5, 3], 0xffe8c0, 0.03); g.add(dp);
  return { g, J, stack, update(t, ctx) { stack.children.forEach((b, i) => b.visible = i < ctx.stackN); moveDust(dp, ctx.run); } };
})();

// ---------------------------------------------------------------- HALL (origin 400)
function portrait(seed, opt = {}) {
  return canvasTex(256, 320, (c, w, h) => {
    let s = seed * 131 + 7; const r = () => (s = (s * 9301 + 49297) % 233280) / 233280;
    const bg = opt.sepia ? '#b89a6a' : ['#5a6a9a', '#7a5a8a', '#5a8a8a', '#8a7a5a', '#6a6a7a'][seed % 5];
    c.fillStyle = bg; c.fillRect(0, 0, w, h);
    const skin = opt.skin || ['#f0c49c', '#d9a47c', '#b07a56', '#e8b48c'][Math.floor(r() * 4)];
    const top = opt.top || ['#a03a3a', '#3a5aa0', '#3a8a5a', '#8a5aa0', '#a07a3a', '#404050'][Math.floor(r() * 6)];
    const hair = opt.hair || ['#1a1210', '#4a2a18', '#2a2a2a', '#8a6a3a', '#b0b0b0'][Math.floor(r() * 5)];
    c.fillStyle = top; c.beginPath(); c.ellipse(w / 2, h + 20, 110, 120, 0, 0, 7); c.fill();
    c.fillStyle = skin; c.beginPath(); c.arc(w / 2, 140, 70, 0, 7); c.fill();
    c.fillStyle = hair; c.beginPath(); c.arc(w / 2, 125, 74, Math.PI, 0); c.fill();
    c.fillStyle = '#fff'; for (const x of [-25, 25]) { c.beginPath(); c.ellipse(w / 2 + x, 145, 13, 15, 0, 0, 7); c.fill(); }
    c.fillStyle = '#111'; for (const x of [-25, 25]) { c.beginPath(); c.arc(w / 2 + x, 147, 7, 0, 7); c.fill(); }
    c.strokeStyle = '#5a1a22'; c.lineWidth = 4; c.beginPath(); c.arc(w / 2, 175, 16, 0.2, Math.PI - 0.2); c.stroke();
    if (opt.sepia) { const id = c.getImageData(0, 0, w, h); for (let i = 0; i < id.data.length; i += 4) { const l = (id.data[i] * .3 + id.data[i + 1] * .59 + id.data[i + 2] * .11); id.data[i] = l * 1.1 + 20; id.data[i + 1] = l * .9 + 10; id.data[i + 2] = l * .7; } c.putImageData(id, 0, 0); }
    c.fillStyle = 'rgba(0,0,0,.55)'; c.fillRect(0, h - 56, w, 56); c.fillStyle = '#fff'; c.font = `22px ${FONT}`; c.textAlign = 'center';
    c.fillText(opt.label || ['ALISHER', 'MALIKA', 'BOBUR', 'NODIRA', 'SHERZOD', 'DILNOZA', 'AZIZ', 'KAMOLA', 'RUSTAM', 'ZARINA'][seed % 10], w / 2, h - 30);
    c.font = `16px ${FONT}`; c.fillText(opt.date || `${1990 + (seed * 7) % 35}-yil`, w / 2, h - 10);
  });
}
export const HALL = (() => {
  const g = new THREE.Group(); g.position.x = 400; scene.add(g);
  mesh(G.box(24, 0.2, 18), 0x2a1e2a, 0, -0.1, 0, g, { ink: false });
  for (let i = -11; i <= 11; i++) mesh(G.box(0.03, 0.01, 18), 0x1e141e, i, 0.005, 0, g, { ink: false });
  mesh(G.box(24, 7, 0.3), 0x2a2448, 0, 3.5, -8, g, { ink: false });
  mesh(G.box(0.3, 7, 18), 0x262040, -9, 3.5, 0, g, { ink: false });
  mesh(G.box(0.3, 7, 18), 0x262040, 9, 3.5, 0, g, { ink: false });
  mesh(G.box(24, 0.3, 18), 0x151225, 0, 7, 0, g, { ink: false });
  for (const x of [-5, 5]) { mesh(G.box(0.6, 7, 0.6), 0x34305a, x, 3.5, -3, g, { th: 0.03 }); mesh(G.box(0.6, 7, 0.6), 0x34305a, x, 3.5, 5.5, g, { th: 0.03 }); }
  const PT = []; for (let i = 0; i < 14; i++) PT.push(portrait(i));
  const frameGeo = G.box(0.86, 1.06, 0.06), picGeo = G.plane(0.74, 0.92);
  const pictures = [];
  function frameAt(x, y, z, ry, tex, big = 1) {
    const f = new THREE.Group(); f.position.set(x, y, z); f.rotation.y = ry; f.scale.setScalar(big); g.add(f);
    mesh(frameGeo, 0x5a3a1a, 0, 0, 0, f, { th: 0.01, cast: false });
    const p = new THREE.Mesh(picGeo, new THREE.MeshToonMaterial({ map: tex, gradientMap: toon(0xffffff).gradientMap, emissiveMap: tex, emissive: 0xffffff, emissiveIntensity: 0.25 })); p.position.z = 0.035; f.add(p);
    pictures.push(f); return f;
  }
  // left wall grid (x=-8.8, facing +x)
  let n = 0;
  for (let r = 0; r < 4; r++) for (let i = 0; i < 14; i++) { const z = -6.8 + i * 1.0 + (r % 2) * 0.3; if (Math.abs(z - 1.2) < 0.6 && r === 1) continue; frameAt(-8.82, 1.4 + r * 1.25, z, Math.PI / 2, PT[(n++ * 5) % 14]); }
  // back wall grid
  for (let r = 0; r < 3; r++) for (let i = 0; i < 18; i++) { const x = -8.2 + i * 0.95; if (Math.abs(x) < 3.4 && r < 3) continue; frameAt(x, 1.5 + r * 1.25, -7.82, 0, PT[(n++ * 3) % 14]); }
  // special: Jasur photos on left wall at eye level
  const jasurTex = portrait(99, { skin: '#f0c49c', top: '#2f62d8', hair: '#1a1210', label: 'JASUR', date: '19-noyabr' });
  const jasurOld = portrait(99, { skin: '#f0c49c', top: '#2f62d8', hair: '#1a1210', label: 'JASUR', date: '19-noyabr, 2009', sepia: true });
  const photoA = frameAt(-8.8, 2.65, 1.2, Math.PI / 2, jasurTex, 1.0);
  const photoB = frameAt(-8.8, 2.65, 3.1, Math.PI / 2, jasurOld, 1.0);
  // caption plates
  const capTex = canvasTex(1600, 160, () => {});
  const cap = new THREE.Mesh(G.plane(2.0, 0.2), new THREE.MeshBasicMaterial({ map: capTex, transparent: true, toneMapped: false })); cap.position.set(-8.75, 1.92, 1.2); cap.rotation.y = Math.PI / 2; g.add(cap);
  // big screen
  const scrTex = canvasTex(1280, 520, () => {});
  mesh(G.box(6.6, 2.9, 0.2), 0x0a0a12, 0, 4.4, -7.75, g, { th: 0.03 });
  const scr = new THREE.Mesh(G.plane(6.3, 2.6), new THREE.MeshBasicMaterial({ map: scrTex, toneMapped: false })); scr.position.set(0, 4.4, -7.63); g.add(scr);
  // lights
  g.add(new THREE.HemisphereLight(0x7a6ae8, 0x180c24, 0.95));
  const key = shadowSun(0xa08aff, 0.9, new THREE.Vector3(6, 12, 8), 12); key.target.position.set(-2, 0, 0); g.add(key, key.target);
  const wallL = new THREE.PointLight(0xc59bff, 16, 12, 1.8); wallL.position.set(-5, 4.5, 1.5); g.add(wallL);
  const scrL = new THREE.PointLight(0x6080ff, 10, 14, 1.8); scrL.position.set(0, 3.5, -5.5); g.add(scrL);
  const sirens = [];
  for (const x of [-7, 7]) {
    const b = new THREE.Mesh(G.sph(0.25, 12, 10), glow(0xff2030, 3)); b.position.set(x, 6.4, -7.5); g.add(b);
    const sl = new THREE.SpotLight(0xff2030, 0, 30, 0.45, 0.5, 1.2); sl.position.set(x, 6.3, -7.3); g.add(sl); g.add(sl.target); sirens.push({ b, sl, x });
  }
  const beams = [];
  for (const x of [-4, 3]) { const c = new THREE.Mesh(new THREE.ConeGeometry(1.8, 7, 24, 1, true), new THREE.MeshBasicMaterial({ color: 0x9a7aff, transparent: true, opacity: 0.05, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide })); c.position.set(x, 3.5, 1); g.add(c); beams.push(c); }
  const dp = dust(200, [-8.5, 0.2, -7.5, 8.5, 6.5, 8], 0xc8b8ff, 0.035); g.add(dp);
  // dissolve particles for stranger
  const dg = new THREE.BufferGeometry(); const NP = 500; const dpos = new Float32Array(NP * 3); const dvel = [];
  for (let i = 0; i < NP; i++) { dvel.push([(rnd() - .5) * 1.5, rnd() * 2.2 + 0.3, (rnd() - .5) * 1.5, rnd() * 1.9]); }
  dg.setAttribute('position', new THREE.BufferAttribute(dpos, 3));
  const dpm = new THREE.PointsMaterial({ color: 0xb080ff, size: 0.07, transparent: true, opacity: 1, depthWrite: false, blending: THREE.AdditiveBlending });
  const dis = new THREE.Points(dg, dpm); dis.frustumCulled = false; g.add(dis);
  const J = makePerson({ top: 0x2f62d8 }); g.add(J);
  const S = makePerson({ top: 0x221a33, coat: true, hat: true, beard: true, skin: 0xd9b08c, eye: 0x9b5cff, pants: 0x151320 }); g.add(S);
  return {
    g, J, S, photoA, photoB, capTex, scrTex,
    update(t, ctx) {
      for (const s of sirens) {
        s.b.visible = ctx.siren > 0; s.sl.intensity = ctx.siren * 60;
        const a = t * 4 + (s.x > 0 ? Math.PI : 0); s.sl.target.position.set(s.x * 0.3 + Math.cos(a) * 6, 0, 1 + Math.sin(a) * 6);
        s.b.material.color.setRGB(3 * (0.5 + 0.5 * Math.sin(t * 8)), 0.1, 0.15);
      }
      wallL.intensity = 16 * (1 - ctx.siren * 0.6);
      moveDust(dp, ctx.run);
      // caption
      if (ctx.capKey !== this._ck) {
        this._ck = ctx.capKey;
        redraw(capTex, (c, w, h) => { c.fillStyle = 'rgba(10,6,20,.85)'; c.fillRect(0, 0, w, h); c.fillStyle = '#ffd46b'; c.font = `50px ${FONT}`; c.textAlign = 'center'; c.textBaseline = 'middle';
          c.fillText(ctx.capText || '', w / 2, h / 2 + 2); });
      }
      if (ctx.scrKey !== this._sk) {
        this._sk = ctx.scrKey;
        redraw(scrTex, (c, w, h) => {
          const red = ctx.scrMode === 'count'; const ctrl = ctx.scrMode === 'ctrl';
          c.fillStyle = red ? '#2a0408' : ctrl ? '#14062a' : '#060818'; c.fillRect(0, 0, w, h);
          c.strokeStyle = red ? '#ff3040' : '#7a5aff'; c.lineWidth = 10; c.strokeRect(14, 14, w - 28, h - 28);
          c.textAlign = 'center'; c.textBaseline = 'middle';
          if (red) {
            c.fillStyle = '#ff4050'; c.font = `58px ${FONT}`; c.fillText('25-SOAT YAKUNLANISHIGA', w / 2, 130);
            c.font = `250px ${FONT}`; c.fillText(String(ctx.count).padStart(2, '0'), w / 2, 330);
            c.font = `44px ${FONT}`; c.fillText('SONIYA QOLDI', w / 2, 470);
          } else if (ctrl) {
            c.fillStyle = '#c59bff'; c.font = `92px ${FONT}`; c.fillText('YANGI NAZORATCHI', w / 2, 210); c.fillText('ANIQLANDI', w / 2, 330);
            c.font = `40px ${FONT}`; c.fillStyle = '#fff'; c.fillText('ID: JASUR', w / 2, 440);
          } else {
            c.fillStyle = '#4a5aaa'; c.font = `120px ${FONT}`; c.fillText('25:00', w / 2, h / 2);
          }
        });
      }
      // dissolve
      const dt = ctx.dissolve;
      dis.visible = dt > 0 && dt < 3;
      if (dis.visible) {
        const sp = ctx.sPos;
        for (let i = 0; i < NP; i++) { const v = dvel[i]; const tt = Math.max(0, dt - v[3] * 0.3);
          dpos[i * 3] = sp.x + v[0] * tt * 0.6 + Math.sin(i) * 0.25; dpos[i * 3 + 1] = v[3] * 0.95 + v[1] * tt * 0.7; dpos[i * 3 + 2] = sp.z + v[2] * tt * 0.6 + Math.cos(i) * 0.2; }
        dg.attributes.position.needsUpdate = true; dpm.opacity = clamp(1.5 - dt * 0.6);
      }
    },
  };
})();

export const SETS = { ROOM, STREET, SHOP, LIB, HALL };
export function showSet(name) { for (const [k, s] of Object.entries(SETS)) s.g.visible = k === name; }
