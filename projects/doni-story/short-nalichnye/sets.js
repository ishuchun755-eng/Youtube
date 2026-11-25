// "7 kun svetsiz" sets: CITY (0), FLAT room (200), KITCHEN (230), BALCONY (260), YARD mahalla (400), SANDAL room (600), MAP (-300), INFO (-600), SHOP (800)
import { THREE, M, rbox, box, cyl, sph, cone, tor, at, G, tex, retex, rig, rnd, clamp, lerp, setColor, setOpacity, look } from './comic.js';
export const scene = new THREE.Scene();
export const L = rig(scene, { sunPos: [-6, 12, 9], shadowSize: 14 });
export const OFF = { city: [0, 0, 0], flat: [200, 0, 0], kitchen: [230, 0, 0], balcony: [260, 0, 0], yard: [400, 0, 0], sandal: [600, 0, 0], map: [-300, 0, 0], info: [-600, 0, 0], shop: [800, 0, 0] };
export const SNOW = '#f3f7fb';
export function aimSun(x, y, z, size = 14, dir = [-6, 12, 9]) { const s = L.sun; s.target.position.set(x, y, z); s.position.set(x + dir[0], y + dir[1], z + dir[2]);
  const c = s.shadow.camera; c.left = c.bottom = -size; c.right = c.top = size; c.updateProjectionMatrix(); }
const R = (() => { let s = 11; return () => (s = (s * 16807) % 2147483647) / 2147483647; })();
// shared practical lights (moved per shot)
export const lights = {
  candle: new THREE.PointLight('#ffb35c', 0, 7, 1.6), candle2: new THREE.PointLight('#ffb35c', 0, 7, 1.6),
  fire: new THREE.PointLight('#ff8a3a', 0, 12, 1.5), lamp: new THREE.PointLight('#ffd9a0', 0, 30, 1.2), lamp2: new THREE.PointLight('#ffd9a0', 0, 30, 1.2),
  flash: new THREE.SpotLight('#f4f8ff', 0, 14, .45, .5, 1.2) };
for (const k in lights) { scene.add(lights[k]); }
scene.add(lights.flash.target);
export function lightsOff() { for (const k in lights) lights[k].intensity = 0; }

// ================= generic textures =================
const facadeCache = new Map();
function facadeDraw(seed, cols, rows, mode) { // mode: {lit:0..1, candle:0..1, wall}
  return (g, w, h) => { let s = seed; const r = () => (s = (s * 16807) % 2147483647) / 2147483647;
    g.fillStyle = mode.wall || '#d9d2c4'; g.fillRect(0, 0, w, h);
    g.fillStyle = 'rgba(0,0,0,.07)'; for (let y = 0; y < rows; y++) g.fillRect(0, (y + 1) * h / rows - 3, w, 3);
    for (let x = 1; x < 3; x++) g.fillRect(x * w / 3 - 2, 0, 4, h);
    const cw = w / cols, rh = h / rows;
    for (let y = 0; y < rows; y++) for (let x = 0; x < cols; x++) { const v = r(), v2 = r();
      const wx = x * cw + cw * .22, wy = y * rh + rh * .2, ww = cw * .56, wh = rh * .55;
      g.fillStyle = '#efe9df'; g.fillRect(wx - 4, wy - 4, ww + 8, wh + 8);
      let c = '#2b3550';
      if (v < mode.lit) c = v2 < .5 ? '#ffd27a' : '#ffe6a8'; else if (v2 < mode.candle) c = '#c9782f';
      g.fillStyle = c; g.fillRect(wx, wy, ww, wh); g.fillStyle = '#efe9df'; g.fillRect(wx + ww / 2 - 2, wy, 4, wh); g.fillRect(wx, wy + wh * .35, ww, 3);
      if (y % 3 === 1 && x % 2 === 0) { g.fillStyle = 'rgba(80,70,60,.35)'; g.fillRect(wx - 8, wy + wh + 2, ww + 16, 10); } } };
}
// emissive-only window layer (alpha) so walls don't glow
function glowDraw(seed, cols, rows, mode) {
  return (g, w, h) => { let s = seed; const r = () => (s = (s * 16807) % 2147483647) / 2147483647; g.clearRect(0, 0, w, h);
    const cw = w / cols, rh = h / rows;
    for (let y = 0; y < rows; y++) for (let x = 0; x < cols; x++) { const v = r(), v2 = r();
      const wx = x * cw + cw * .22, wy = y * rh + rh * .2, ww = cw * .56, wh = rh * .55; let c = null;
      if (v < mode.lit) c = v2 < .5 ? '#ffcf70' : '#ffe2a0'; else if (v2 < mode.candle) c = '#ff9a3a';
      if (c) { g.fillStyle = c; g.fillRect(wx, wy, ww, wh); g.fillStyle = 'rgba(0,0,0,0)'; } } };
}
export const buildings = [];
function makeBlock(parent, x, z, wz, floors, rot, wall) {
  const b = G(parent, x, 0, z); b.rotation.y = rot; const h = floors * 2.9 + .6, d = 10, cols = Math.round(wz / 3), rows = floors;
  at(box(wz, h, d, wall || '#d9d2c4'), 0, h / 2, 0, b);
  const seed = Math.floor(R() * 1e6); const mode = { lit: 1, candle: 0, wall };
  const ft = tex(512, Math.round(512 * h / wz), facadeDraw(seed, cols, rows, mode)); const gt = tex(512, Math.round(512 * h / wz), glowDraw(seed, cols, rows, mode));
  const fac = at(M(new THREE.PlaneGeometry(wz, h - .6), '#ffffff', { map: ft, noEdge: true }), 0, h / 2 + .3, d / 2 + .02, b);
  const gl = at(M(new THREE.PlaneGeometry(wz, h - .6), '#ffffff', { map: gt, noEdge: true, cast: false, glow: true, glowK: 1.4 }), 0, h / 2 + .3, d / 2 + .04, b);
  for (const m of [gl.userData.m.lit, gl.userData.m.flat]) { m.transparent = true; m.alphaTest = .2; }
  // back facade too (for map/flyovers)
  at(M(new THREE.PlaneGeometry(wz, h - .6), '#ffffff', { map: ft, noEdge: true }), 0, h / 2 + .3, -d / 2 - .02, b).rotation.y = Math.PI;
  // roof snow + parapet
  at(rbox(wz + .3, .35, d + .3, .15, SNOW), 0, h + .1, 0, b);
  // entrance canopies
  for (let i = -1; i <= 1; i += 2) { at(rbox(2.2, .15, 1.2, .05, '#bfb6a6'), i * wz / 4, 2.6, d / 2 + .6, b); at(rbox(2.2, .2, 1.2, .08, SNOW), i * wz / 4, 2.75, d / 2 + .6, b); at(box(1.2, 2.2, .1, '#6b4a36'), i * wz / 4, 1.1, d / 2 + .06, b); }
  const rec = { g: b, ft, gt, mode, key: '' }; buildings.push(rec); return rec;
}
export function setCity(lit, candle = 0) { const key = lit.toFixed(2) + candle.toFixed(2);
  for (const b of buildings) { if (b.key === key) continue; b.key = key; b.mode.lit = lit; b.mode.candle = candle; retex(b.ft); retex(b.gt); } }

// ================= CITY =================
export const CITY = G(scene, ...OFF.city);
const roadTex = tex(256, 1024, (g, w, h) => { g.fillStyle = '#e9eef4'; g.fillRect(0, 0, w, h);
  for (const x of [.3, .7]) { g.fillStyle = '#8b939e'; g.fillRect(w * x - 22, 0, 44, h); g.fillStyle = 'rgba(255,255,255,.55)'; for (let i = 0; i < 80; i++) g.fillRect(w * x - 22 + R() * 44, R() * h, 3 + R() * 6, 10 + R() * 30); }
  g.fillStyle = 'rgba(150,160,175,.35)'; for (let i = 0; i < 600; i++) g.fillRect(R() * w, R() * h, 2, 2); }, [1, 12]);
at(M(new THREE.PlaneGeometry(400, 400).rotateX(-Math.PI / 2), SNOW, { noEdge: true }), 0, 0, -100, CITY);
at(M(new THREE.PlaneGeometry(10, 240).rotateX(-Math.PI / 2), '#ffffff', { map: roadTex, noEdge: true, cast: false }), 0, .02, -80, CITY);
at(M(new THREE.PlaneGeometry(240, 10).rotateX(-Math.PI / 2).rotateY(0), '#ffffff', { map: roadTex, noEdge: true, cast: false }), 0, .021, -40, CITY).rotation.y = Math.PI / 2;
// curbs + snowbanks
for (const s of [-1, 1]) for (let z = 30; z > -200; z -= 3.2) { if (Math.abs(z + 40) < 7) continue; const m = at(sph(1, SNOW, {}, 12, 8), s * (5.6 + R() * .3), 0, z, CITY); m.scale.set(.9 + R() * .4, .45 + R() * .25, 1.8 + R() * .5); }
// blocks both sides
const walls = ['#d9d2c4', '#e3d8c3', '#cfd6dc', '#e6d1bd', '#d5cfc6'];
for (const s of [-1, 1]) for (let i = 0; i < 9; i++) { const z = 14 - i * 26; if (Math.abs(z + 40) < 12) continue; makeBlock(CITY, s * 15, z, 22, 9, s > 0 ? -Math.PI / 2 : Math.PI / 2, walls[(i + (s > 0 ? 2 : 0)) % 5]); }
// far blocks across the cross street + backdrop
for (let i = -3; i <= 3; i++) makeBlock(CITY, i * 26, -230, 22, 9 + (i % 2), 0, walls[(i + 7) % 5]);
// street lamps
export const lamps = [];
for (const s of [-1, 1]) for (let z = 20; z > -200; z -= 18) { const l = G(CITY, s * 6.6, 0, z + (s > 0 ? 9 : 0)); at(cyl(.08, .1, 6.5, '#4a4f58', 8), 0, 3.25, 0, l);
  const arm = at(cyl(.05, .05, 1.4, '#4a4f58', 6), -s * .6, 6.4, 0, l); arm.rotation.z = Math.PI / 2;
  const head = at(rbox(.6, .16, .3, .06, '#3b3f47'), -s * 1.2, 6.35, 0, l); const bulb = at(sph(.16, '#ffd58a', { glow: true, glowK: 1.5, cast: false }), -s * 1.2, 6.22, 0, l); bulb.scale.set(1.5, .5, .9);
  lamps.push({ g: l, bulb }); }
export function setLamps(on) { for (const l of lamps) { l.bulb.userData.glow = on; setColor(l.bulb, on ? '#ffd58a' : '#4a4f58'); } }
// traffic lights at the crossing
export const tlights = [];
for (const [x, z, r] of [[5.8, -33.5, 0], [-5.8, -46.5, Math.PI]]) { const t = G(CITY, x, 0, z); t.rotation.y = r; at(cyl(.09, .09, 4.4, '#30343b', 8), 0, 2.2, 0, t);
  const bx = at(rbox(.45, 1.3, .4, .08, '#22252b'), 0, 4.6, 0, t); at(rbox(.5, .1, .45, .04, SNOW), 0, 5.3, 0, t);
  const bulbs = ['#ff3b30', '#ffcc00', '#34c759'].map((c, i) => at(sph(.13, c, { glow: true, cast: false }), 0, 5.0 - i * .38, .2, t)); tlights.push(bulbs); }
export function setTraffic(state) { // 'off' | 'red' | 'green' | 'blink'
  const cols = ['#ff3b30', '#ffcc00', '#34c759'];
  for (const b of tlights) b.forEach((m, i) => { const on = state === 'red' ? i === 0 : state === 'green' ? i === 2 : state === 'blink' ? i === 1 : false; setColor(m, on ? cols[i] : '#2c2f35'); }); }
// cars
export function makeCar(color = '#c0453a') { const c = new THREE.Group();
  at(rbox(1.8, .55, 4.2, .2, color), 0, .55, 0, c); at(rbox(1.6, .55, 2.2, .22, color), 0, 1.05, -.2, c);
  at(rbox(1.62, .42, 2.0, .15, '#2c3a4e', { cast: false }), 0, 1.08, -.2, c);
  at(rbox(1.7, .18, 2.3, .12, SNOW), 0, 1.38, -.2, c); at(rbox(1.75, .1, 1.1, .05, SNOW), 0, .86, 1.45, c);
  for (const [x, z] of [[-.85, 1.35], [.85, 1.35], [-.85, -1.35], [.85, -1.35]]) { const w = at(cyl(.34, .34, .24, '#1d1e22', 16), x, .34, z, c); w.rotation.z = Math.PI / 2; }
  const hl = [-.6, .6].map(x => at(sph(.13, '#fff6d8', { glow: true, cast: false }), x, .6, 2.1, c)); const tl = [-.65, .65].map(x => at(box(.3, .12, .05, '#ff3b30', { glow: true, cast: false }), x, .65, -2.11, c));
  c.userData.lights = on => { hl.forEach(m => setColor(m, on ? '#fff6d8' : '#cfd2d6')); tl.forEach(m => setColor(m, on ? '#ff3b30' : '#6a2a2a')); }; return c; }
export const cars = [];
const carC = ['#c0453a', '#f2f2f2', '#2d5fa0', '#30343b', '#e3a64a', '#9aa3ad', '#3f8a5a', '#f2f2f2'];
for (let i = 0; i < 16; i++) { const c = makeCar(carC[i % 8]); CITY.add(c); cars.push(c); c.position.set(i % 2 ? 2.4 : -2.4, 0, 10 - i * 6); c.rotation.y = i % 2 ? Math.PI : 0; }
// parked & snowed-in cars at curbs
for (let i = 0; i < 8; i++) { const c = makeCar(carC[(i + 3) % 8]); CITY.add(c); c.position.set((i % 2 ? 1 : -1) * 4.3, 0, 4 - i * 14); c.userData.lights(false); at(rbox(1.9, .5, 4.3, .25, SNOW), 0, 1.25, 0, c); }
// bare trees with snow
function tree(parent, x, z, s = 1) { const t = G(parent, x, 0, z); t.scale.setScalar(s);
  const br = (p, len, r, d) => { const c = at(cyl(r * .7, r, len, '#5a4636', 6), 0, len / 2, 0, p); const tip = G(p, 0, len, 0);
    if (d > 0) for (let i = 0; i < 3; i++) { const q = G(tip); q.rotation.set((R() - .5) * 1.4, R() * 6, (R() - .5) * 1.4 + (i - 1) * .5); br(q, len * .7, r * .62, d - 1); }
    else at(sph(r * 3, SNOW, { cast: false }, 8, 6), 0, 0, 0, tip).scale.set(1, .5, 1); };
  br(t, 2.2, .16, 4); return t; }
for (const s of [-1, 1]) for (let z = 26; z > -190; z -= 13) tree(CITY, s * 8.4, z + R() * 3, .9 + R() * .3);
// cell tower on roof of left block near crossing
export const tower = G(CITY, -16, 26.7, -57);
for (const [x, z] of [[-.6, -.6], [.6, -.6], [-.6, .6], [.6, .6]]) { const l = at(cyl(.09, .09, 12, '#e6e8eb', 6), x * (1 - .0), 6, z, tower); l.rotation.set(-z * .07, 0, x * .07); }
for (let y = 1; y < 12; y += 1.4) at(tor(.62 - y * .03, .05, '#e6e8eb', Math.PI * 2), 0, y, 0, tower).rotation.x = Math.PI / 2;
for (let i = 0; i < 3; i++) { const p = at(rbox(.35, 1.4, .14, .04, '#ffffff'), Math.sin(i * 2.1) * .6, 10.5, Math.cos(i * 2.1) * .6, tower); p.rotation.y = i * 2.1; }
export const towerLight = at(sph(.3, '#ff3b30', { glow: true, glowK: 2, cast: false }), 0, 12.2, 0, tower);
// shop on ground floor (right side) + ATM
export const shopFront = G(CITY, 7.4, 0, -14); shopFront.rotation.y = -Math.PI / 2;
const shopSignTex = tex(1024, 200, (g, w, h) => { g.fillStyle = '#1f6b4a'; g.fillRect(0, 0, w, h); g.font = '900 120px InterX'; g.fillStyle = '#fff'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText("ПРОДУКТЫ", w / 2, h / 2 + 6); });
at(rbox(6.4, 3.4, .3, .05, '#bfb6a6'), 0, 1.7, 0, shopFront);
export const shopSign = at(M(new THREE.PlaneGeometry(5.6, 1.1), '#ffffff', { map: shopSignTex, noEdge: true, cast: false, glow: true, glowK: 1.2 }), 0, 3.0, .17, shopFront);
export const shopWin = at(M(new THREE.PlaneGeometry(3.4, 1.8), '#ffe2a0', { noEdge: true, cast: false, glow: true }), -1.0, 1.35, .17, shopFront);
at(box(1.1, 2.1, .1, '#3a4a5a'), 1.9, 1.05, .17, shopFront);
const atmTex = tex(256, 128, (g, w, h) => { g.fillStyle = '#1d5fae'; g.fillRect(0, 0, w, h); g.fillStyle = '#fff'; g.font = '900 34px InterX'; g.textAlign = 'center'; g.fillText("БАНКОМАТ", w / 2, 80); });
export const atm = G(CITY, 7.6, 0, -24); atm.rotation.y = -Math.PI / 2; at(rbox(1.0, 2.0, .6, .06, '#c9ccd2'), 0, 1.0, 0, atm);
at(M(new THREE.PlaneGeometry(.8, .4), '#ffffff', { map: atmTex, noEdge: true, cast: false }), 0, 1.8, .31, atm);
export const atmScreen = at(M(new THREE.PlaneGeometry(.5, .35), '#7fc8ff', { noEdge: true, cast: false, glow: true }), 0, 1.3, .31, atm);
export function setShop(on) { shopSign.userData.glow = on; setColor(shopSign, on ? '#ffffff' : '#555a60'); setColor(shopWin, on ? '#ffe2a0' : '#2b3550'); setColor(atmScreen, on ? '#7fc8ff' : '#15181d'); }

// ================= FLAT (living room) =================
export const FLAT = G(scene, ...OFF.flat);
const wallp = tex(256, 256, (g, w, h) => { g.fillStyle = '#e8dcc4'; g.fillRect(0, 0, w, h); g.fillStyle = 'rgba(170,130,90,.18)';
  for (let y = 0; y < h; y += 64) for (let x = 0; x < w; x += 64) { g.beginPath(); g.ellipse(x + 32 + (y / 64 % 2) * 32, y + 32, 10, 16, 0, 0, 7); g.fill(); } }, [5, 2]);
const floorTex = tex(512, 512, (g, w, h) => { for (let i = 0; i < 8; i++) { const k = R() * 14; g.fillStyle = `rgb(${150 + k},${102 + k},${70 + k * .5})`; g.fillRect(i * 64, 0, 64, h); g.strokeStyle = 'rgba(60,35,20,.6)'; g.lineWidth = 3; g.strokeRect(i * 64, 0, 64, h); } }, [3, 3]);
export const gilamTex = tex(512, 768, (g, w, h) => { g.fillStyle = '#7a1f22'; g.fillRect(0, 0, w, h); g.fillStyle = '#1f3d6b'; g.fillRect(26, 26, w - 52, h - 52); g.fillStyle = '#9d2b2b'; g.fillRect(52, 52, w - 104, h - 104);
  for (let k = 6; k > 0; k--) { g.fillStyle = ['#e6b450', '#1f3d6b', '#f0e2c0', '#7a1f22', '#e6b450', '#2b5b3a'][k - 1]; g.beginPath(); g.moveTo(w / 2 - k * 30, h / 2); g.lineTo(w / 2, h / 2 - k * 46); g.lineTo(w / 2 + k * 30, h / 2); g.lineTo(w / 2, h / 2 + k * 46); g.fill(); }
  g.fillStyle = '#e6b450'; for (let i = 0; i < 18; i++) { g.fillRect(34 + i * 25, 34, 9, 9); g.fillRect(34 + i * 25, h - 43, 9, 9); }
  for (const [x, y] of [[.25, .2], [.75, .2], [.25, .8], [.75, .8]]) { g.fillStyle = '#f0e2c0'; g.beginPath(); g.arc(w * x, h * y, 30, 0, 7); g.fill(); g.fillStyle = '#1f3d6b'; g.beginPath(); g.arc(w * x, h * y, 16, 0, 7); g.fill(); } });
// outside night view (city across, windows lit/unlit)
export const viewTex = tex(1024, 512, (g, w, h) => {});
export function drawView(lit, candle = 0, snow = 1) { retex(viewTex, (g, w, h) => { const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, '#16223a'); gr.addColorStop(1, '#2c3c5c'); g.fillStyle = gr; g.fillRect(0, 0, w, h);
  let s = 77; const r = () => (s = (s * 16807) % 2147483647) / 2147483647;
  for (let b = 0; b < 7; b++) { const bx = b * 150 - 20 + r() * 30, bw = 120 + r() * 30, bh = 260 + r() * 160; g.fillStyle = b % 2 ? '#3a4560' : '#323c55'; g.fillRect(bx, h - bh, bw, bh);
    for (let y = h - bh + 14; y < h - 20; y += 26) for (let x = bx + 10; x < bx + bw - 14; x += 22) { const v = r(), v2 = r(); g.fillStyle = v < lit ? '#ffd27a' : v2 < candle ? '#c9782f' : '#1f2840'; g.fillRect(x, y, 12, 14); } }
  g.fillStyle = '#e9eef4'; g.fillRect(0, h - 30, w, 30);
  for (let i = 0; i < 260 * snow; i++) { g.fillStyle = 'rgba(255,255,255,.85)'; g.beginPath(); g.arc(r() * w, r() * h, 1.5 + r() * 2.5, 0, 7); g.fill(); } }); }
drawView(1, 0);
function room(parent, w, d, hgt, wallMap, opts = {}) {
  at(M(new THREE.PlaneGeometry(w, d).rotateX(-Math.PI / 2), '#ffffff', { map: floorTex, noEdge: true }), 0, 0, 0, parent);
  at(box(w, hgt, .2, '#ffffff', { map: wallMap }), 0, hgt / 2, -d / 2, parent);
  at(box(.2, hgt, d, '#ffffff', { map: wallMap }), -w / 2, hgt / 2, 0, parent);
  at(box(.2, hgt, d, '#ffffff', { map: wallMap }), w / 2, hgt / 2, 0, parent);
  at(box(w, .2, d, '#efe6d6'), 0, hgt + .1, 0, parent).userData.ceil = 1;
  at(box(w, .14, .05, '#8d6a50'), 0, .07, -d / 2 + .12, parent);
}
room(FLAT, 7, 6, 2.9, wallp);
// window on back wall (cut look: frame + view + frost layer)
export const flatWin = G(FLAT, -1.2, 1.6, -2.88);
at(M(new THREE.PlaneGeometry(1.9, 1.5), '#ffffff', { map: viewTex, noEdge: true, cast: false, glow: true, glowK: .8 }), 0, 0, 0, flatWin);
export const frostTex = tex(512, 512, (g, w, h) => { g.clearRect(0, 0, w, h); const gr = g.createRadialGradient(w / 2, h / 2, w * .15, w / 2, h / 2, w * .72); gr.addColorStop(0, 'rgba(235,245,255,0)'); gr.addColorStop(1, 'rgba(235,245,255,.95)'); g.fillStyle = gr; g.fillRect(0, 0, w, h);
  g.strokeStyle = 'rgba(255,255,255,.9)'; g.lineWidth = 2; for (let i = 0; i < 70; i++) { let x = R() < .5 ? R() * w : (R() < .5 ? 0 : w), y = R() < .5 ? (R() < .5 ? 0 : h) : R() * h; g.beginPath(); g.moveTo(x, y);
    for (let k = 0; k < 6; k++) { const a = Math.atan2(h / 2 - y, w / 2 - x) + (R() - .5) * 1.6; const l = 12 + R() * 22; x += Math.cos(a) * l; y += Math.sin(a) * l; g.lineTo(x, y);
      const a2 = a + (R() < .5 ? .8 : -.8); g.moveTo(x + Math.cos(a2) * 10, y + Math.sin(a2) * 10); g.lineTo(x, y); } g.stroke(); } });
export const frost = at(M(new THREE.PlaneGeometry(1.9, 1.5), '#ffffff', { map: frostTex, noEdge: true, cast: false }), 0, 0, .03, flatWin);
for (const m of [frost.userData.m.lit, frost.userData.m.flat]) { m.transparent = true; m.opacity = 0; m.depthWrite = false; }
for (const [w, h, x, y] of [[2.1, .1, 0, .8], [2.1, .14, 0, -.8], [.1, 1.7, -1, 0], [.1, 1.7, 1, 0], [.07, 1.5, 0, 0]]) at(rbox(w, h, .12, .02, '#f7f4ee'), x, y, .05, flatWin);
at(rbox(2.3, .06, .3, .02, '#f7f4ee'), 0, -.86, .12, flatWin);
// radiator under window
export const radiator = G(FLAT, -1.2, .45, -2.72); for (let i = 0; i < 10; i++) at(rbox(.12, .55, .12, .04, '#f2f2f2'), -.6 + i * .135, 0, 0, radiator);
// gilam on side wall, sofa, tv, table, clock, shelf
at(M(new THREE.PlaneGeometry(1.8, 2.5), '#ffffff', { map: gilamTex, noEdge: true }), -3.38, 1.55, -.2, FLAT).rotation.y = Math.PI / 2;
export const sofa = G(FLAT, -2.5, 0, -.2); sofa.rotation.y = Math.PI / 2;
at(rbox(2.6, .45, .95, .14, '#5a6fa0'), 0, .35, 0, sofa); at(rbox(2.6, .7, .28, .12, '#4f6390'), 0, .85, -.36, sofa); for (const x of [-1.35, 1.35]) at(rbox(.25, .6, .95, .1, '#4f6390'), x, .5, 0, sofa);
export const blanket = at(rbox(1.4, .14, 1.0, .07, '#c0453a'), .3, .64, .05, sofa); blanket.visible = false;
const tvG = G(FLAT, 1.0, 0, -2.6); tvG.rotation.y = 0; at(rbox(1.6, .5, .45, .04, '#6b4a36'), 0, .25, 0, tvG); at(rbox(1.5, .85, .07, .03, '#1d1d22'), 0, .98, 0, tvG);
export const tvScreen = at(M(new THREE.PlaneGeometry(1.4, .76), '#5fa8e6', { noEdge: true, cast: false, glow: true }), 0, .98, .04, tvG);
const ctab = G(FLAT, -1, 0, .4); at(cyl(.55, .55, .06, '#8d6a50', 24), 0, .45, 0, ctab); at(cyl(.06, .08, .45, '#6b4a36', 8), 0, .22, 0, ctab);
export const choynak = G(ctab, -.15, .48, 0); at(sph(.13, '#2d5fa0'), 0, .1, 0, choynak).scale.set(1, .9, 1); at(cyl(.04, .04, .05, '#2d5fa0', 10), 0, .22, 0, choynak); const sp = at(cyl(.02, .035, .18, '#2d5fa0', 8), .15, .1, 0, choynak); sp.rotation.z = -1.0;
for (const x of [.15, .3]) { const p = G(ctab, x, .48, .1 - x * .3); at(cyl(.06, .04, .07, '#f2f2f2', 14), 0, .035, 0, p); at(tor(.06, .008, '#2d5fa0'), 0, .06, 0, p).rotation.x = Math.PI / 2; }
export const candle = G(ctab, .05, .48, -.2); at(cyl(.035, .035, .16, '#f4efe2', 12), 0, .08, 0, candle); export const flameA = at(sph(.03, '#ffcf70', { glow: true, glowK: 2.5, cast: false, noEdge: true }), 0, .2, 0, candle); flameA.scale.set(1, 1.8, 1);
export const clock = G(FLAT, 1.0, 2.2, -2.88); at(cyl(.28, .28, .05, '#f7f4ee', 24), 0, 0, 0, clock).rotation.x = Math.PI / 2; at(tor(.28, .02, '#3a3434'), 0, 0, .02, clock);
export const hands = [at(box(.02, .18, .01, '#1d1d22'), 0, .07, .04, clock), at(box(.015, .24, .01, '#1d1d22'), 0, .1, .045, clock)];
const shelfF = G(FLAT, 2.6, 0, -2.7); at(rbox(1.2, 1.8, .4, .03, '#8d6a50'), 0, .9, 0, shelfF); for (let i = 0; i < 6; i++) at(rbox(.12, .32, .26, .01, ['#c0453a', '#3f6d8f', '#e3a64a', '#5f8f6a'][i % 4]), -.4 + i * .15, 1.38, .02, shelfF);
export const ceilLamp = at(sph(.22, '#fff1d0', { glow: true, glowK: 1.4, cast: false }), 0, 2.7, -.3, FLAT); ceilLamp.scale.set(1.4, .6, 1.4);
export function setFlatPower(on) { ceilLamp.userData.glow = on; setColor(ceilLamp, on ? '#fff1d0' : '#d8d2c8'); setColor(tvScreen, on ? '#5fa8e6' : '#111216'); }

// ================= KITCHEN =================
export const KIT = G(scene, ...OFF.kitchen);
const tiles = tex(256, 256, (g, w, h) => { g.fillStyle = '#e9efe9'; g.fillRect(0, 0, w, h); g.strokeStyle = '#c7d0c8'; g.lineWidth = 3; for (let i = 0; i <= 8; i++) { g.beginPath(); g.moveTo(i * 32, 0); g.lineTo(i * 32, h); g.moveTo(0, i * 32); g.lineTo(w, i * 32); g.stroke(); } }, [5, 2]);
room(KIT, 5, 4.5, 2.7, tiles);
// counter + stove
at(rbox(3.2, .88, .62, .03, '#f2f2f2'), -.6, .44, -1.9, KIT); at(rbox(3.3, .05, .66, .02, '#8d6a50'), -.6, .9, -1.9, KIT);
export const stove = G(KIT, .3, 0, -1.92); at(rbox(.6, .88, .6, .04, '#f4f4f4'), 0, .44, 0, stove); at(box(.58, .02, .58, '#2a2c31'), 0, .89, 0, stove);
at(rbox(.5, .4, .02, .02, '#2a2c31', { cast: false }), 0, .45, .31, stove);
export const flames = [];
for (const [x, z] of [[-.14, -.14], [.14, -.14], [-.14, .14], [.14, .14]]) { at(cyl(.07, .07, .02, '#55585e', 14), x, .91, z, stove); const f = G(stove, x, .93, z);
  for (let i = 0; i < 8; i++) { const c = at(cone(.018, .07, '#5aa8ff', 6, { glow: true, glowK: 2.2, cast: false, noEdge: true }), Math.cos(i * .785) * .06, .03, Math.sin(i * .785) * .06, f); }
  f.visible = false; flames.push(f); }
// boiler (kotel) on wall
export const kotel = G(KIT, 1.7, 1.75, -2.12); at(rbox(.5, .75, .32, .05, '#f7f7f7'), 0, 0, 0, kotel);
export const kotelLed = at(M(new THREE.PlaneGeometry(.18, .08), '#5aff8a', { noEdge: true, cast: false, glow: true }), 0, -.15, .165, kotel);
for (let i = 0; i < 3; i++) at(cyl(.025, .025, .5, '#c9ccd2', 8), -.12 + i * .12, -.6, 0, kotel);
// pipe column (bursts later)
export const pipe = G(KIT, 2.3, 0, -2.0); at(cyl(.05, .05, 2.7, '#d9dde2', 10), 0, 1.35, 0, pipe);
export const pipeIce = at(cyl(.09, .11, .6, '#dff2ff', 10, { opacity: .85 }), 0, 1.0, 0, pipe); pipeIce.visible = false;
// sink with tap
export const tap = G(KIT, -1.4, .92, -2.05); at(cyl(.02, .02, .3, '#c9ccd2', 8), 0, .15, 0, tap); const sp2 = at(cyl(.015, .015, .2, '#c9ccd2', 8), 0, .3, .08, tap); sp2.rotation.x = Math.PI / 2;
at(rbox(.6, .1, .45, .05, '#c9ccd2'), 0, -.02, .12, tap);
// fridge
export const fridge = G(KIT, -2.0, 0, -1.4); fridge.rotation.y = Math.PI / 2; at(rbox(.7, 1.8, .65, .06, '#f4f4f4'), 0, .9, 0, fridge); at(box(.68, .02, .02, '#c9ccd2'), 0, 1.15, .33, fridge);
for (const y of [1.45, .8]) at(cyl(.015, .015, .25, '#c9ccd2', 8), .25, y, .35, fridge);
export const fridgeDoor = G(fridge, -.35, 0, .33); at(rbox(.7, .9, .05, .03, '#f4f4f4'), .35, .55, 0, fridgeDoor);
const kTable = G(KIT, .2, 0, .6); at(rbox(1.2, .05, .8, .02, '#c49a6c'), 0, .75, 0, kTable); for (const [x, z] of [[-.5, -.32], [.5, -.32], [-.5, .32], [.5, .32]]) at(cyl(.03, .03, .75, '#8d6a50', 8), x, .37, z, kTable);
// kitchen door (closable) + window
export const kDoor = G(KIT, -2.45, 0, 1.2); at(box(.06, 2.1, .9, '#c49a6c'), 0, 1.05, -.45, kDoor); at(sph(.04, '#d6b25a'), .05, 1.0, -.8, kDoor);
export const kWin = G(KIT, -.4, 1.75, -2.24); at(M(new THREE.PlaneGeometry(1.2, .9), '#ffffff', { map: viewTex, noEdge: true, cast: false, glow: true, glowK: .7 }), 0, 0, 0, kWin);
for (const [w, h, x, y] of [[1.3, .08, 0, .48], [1.3, .08, 0, -.48], [.08, 1, -.62, 0], [.08, 1, .62, 0], [.05, .9, 0, 0]]) at(rbox(w, h, .1, .02, '#f7f4ee'), x, y, .04, kWin);
export const fortochka = G(kWin, .31, .22, .05); at(rbox(.56, .4, .04, .02, '#f7f4ee'), .0, 0, 0, fortochka);
// CO cloud (spheres, grey translucent)
export const coCloud = G(KIT, .3, 1.6, -.6); for (let i = 0; i < 26; i++) { const c = at(sph(.35 + R() * .3, '#8d939c', { opacity: .28, cast: false, noEdge: true }, 14, 10), (R() - .5) * 3.2, (R() - .5) * 1.0, (R() - .5) * 2.6, coCloud); c.userData.base = c.position.clone(); }
coCloud.visible = false;
export const manqal = G(KIT, 1.2, 0, .2); at(cyl(.3, .22, .3, '#3a3434', 14), 0, .15, 0, manqal); at(cyl(.27, .27, .03, '#c94a24', 14, { glow: true, glowK: 1.6, cast: false }), 0, .29, 0, manqal); manqal.visible = false;

// ================= BALCONY =================
export const BAL = G(scene, ...OFF.balcony);
at(box(5, .2, 2.2, '#c9c2b5'), 0, -.1, 0, BAL); at(rbox(5, .25, 2.2, .1, SNOW), 0, .05, 0, BAL);
at(box(5, 3, .25, '#d9d2c4'), 0, 1.5, -1.2, BAL); at(box(1, 2.2, .1, '#5a6f86', {}), -1.5, 1.1, -1.05, BAL);
for (let x = -2.4; x <= 2.4; x += .3) at(cyl(.02, .02, 1.0, '#4a4f58', 6), x, .55, 1.05, BAL);
at(rbox(5, .08, .12, .03, '#4a4f58'), 0, 1.05, 1.05, BAL); at(rbox(5, .14, .2, .06, SNOW), 0, 1.15, 1.05, BAL);
export const meat = G(BAL, .8, .25, .3); at(rbox(.6, .25, .45, .1, '#d9534f'), 0, .12, 0, meat); at(rbox(.62, .08, .47, .04, SNOW), 0, .28, 0, meat);
export const bags = G(BAL, 1.6, .2, .2); at(sph(.25, '#f2f2f2'), 0, .2, 0, bags).scale.set(1, 1.2, .9); at(sph(.2, '#e3a64a'), .4, .15, .1, bags);
at(M(new THREE.PlaneGeometry(80, 30), '#ffffff', { map: viewTex, noEdge: true, cast: false, glow: true, glowK: .7 }), 0, 6, -28, BAL).rotation.y = Math.PI;

// ================= YARD (mahalla hovli) =================
export const YARD = G(scene, ...OFF.yard);
at(M(new THREE.PlaneGeometry(120, 120).rotateX(-Math.PI / 2), SNOW, { noEdge: true }), 0, 0, 0, YARD);
const brick = tex(256, 256, (g, w, h) => { g.fillStyle = '#d8c3a0'; g.fillRect(0, 0, w, h); g.fillStyle = 'rgba(140,100,60,.25)'; for (let y = 0; y < h; y += 16) for (let x = (y / 16 % 2) * 16; x < w; x += 32) g.fillRect(x, y, 30, 14); }, [4, 2]);
function house(x, z, w, d, rot) { const hs = G(YARD, x, 0, z); hs.rotation.y = rot; at(box(w, 3, d, '#ffffff', { map: brick }), 0, 1.5, 0, hs); at(rbox(w + .5, .5, d + .5, .2, SNOW), 0, 3.2, 0, hs);
  for (let i = 0; i < Math.floor(w / 2.6); i++) { const wx = -w / 2 + 1.6 + i * 2.6; const wi = at(M(new THREE.PlaneGeometry(1, 1.1), '#2b3550', { noEdge: true, cast: false }), wx, 1.7, d / 2 + .02, hs); hs.userData['w' + i] = wi;
    at(rbox(1.2, .1, .16, .03, '#5a86b0'), wx, 1.1, d / 2 + .06, hs); at(rbox(1.2, .1, .16, .03, '#5a86b0'), wx, 2.3, d / 2 + .06, hs); } return hs; }
export const houses = [house(0, -9, 14, 6, 0), house(-9, 0, 10, 5, Math.PI / 2), house(9, 1, 8, 5, -Math.PI / 2)];
// gate
export const gate = G(YARD, 0, 0, 9); for (const x of [-1.6, 1.6]) at(rbox(.4, 3, .4, .05, '#d8c3a0'), x, 1.5, 0, gate);
for (const x of [-.7, .7]) { const d = at(rbox(1.35, 2.5, .1, .03, '#2f6fae'), x, 1.3, 0, gate); for (let i = 0; i < 3; i++) at(rbox(.9, .12, .04, .02, '#e6b450', { cast: false }), x, .6 + i * .7, .06, gate); }
at(rbox(4, .3, .6, .1, SNOW), 0, 3.1, 0, gate);
// tandir (clay dome)
export const tandir = G(YARD, -4.2, 0, -3.5); at(cyl(.85, .95, .5, '#c99a6a', 20), 0, .25, 0, tandir); const dome = at(sph(.85, '#d4a676', {}, 22, 14), 0, .5, 0, tandir); dome.scale.set(1, .95, 1);
at(rbox(1.0, .2, .8, .08, SNOW), 0, 1.25, -.2, tandir).scale.set(.8, 1, .8);
export const tandirGlow = at(cyl(.32, .32, .05, '#ff8a3a', 18, { glow: true, glowK: 2, cast: false }), 0, .62, .66, tandir); tandirGlow.rotation.x = Math.PI / 2 - .5;
// o'choq + qozon + fire
export const ochoq = G(YARD, 3.6, 0, -2.6); at(rbox(1.5, .7, 1.2, .1, '#b98b62'), 0, .35, 0, ochoq);
export const qozon = at(M(new THREE.SphereGeometry(.62, 24, 12, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), '#26272b'), 0, .95, 0, ochoq);
at(tor(.62, .04, '#26272b'), 0, .95, 0, ochoq).rotation.x = Math.PI / 2; export const plov = at(cyl(.58, .58, .04, '#e3a64a', 24), 0, .9, 0, ochoq); plov.visible = false;
export const fire = G(ochoq, 0, .2, .62); for (let i = 0; i < 7; i++) at(cone(.09 + R() * .06, .35 + R() * .2, i % 2 ? '#ffb347' : '#ff6a2a', 7, { glow: true, glowK: 2.2, cast: false, noEdge: true }), (R() - .5) * .5, .15, (R() - .5) * .1, fire);
export const smoke = G(YARD, 3.6, 1.5, -2.6); for (let i = 0; i < 10; i++) { const s = at(sph(.3, '#e7e9ee', { opacity: .55, cast: false, noEdge: true }, 12, 8), 0, 0, 0, smoke); s.userData.i = i; }
export function animSmoke(t, g = smoke, rise = 3.2) { g.children.forEach((s, i) => { const p = ((t * .35 + i / g.children.length) % 1); s.position.set(Math.sin(p * 5 + i) * .3 + p * 1.2, p * rise, Math.cos(p * 4 + i) * .2); s.scale.setScalar(.4 + p * 1.6); setOpacity(s, .55 * (1 - p)); }); }
export const wood = G(YARD, 6, 0, -5); for (let i = 0; i < 14; i++) { const l = at(cyl(.12, .12, 1.2, '#8d6a50', 8), (i % 5) * .26 - .5, .12 + Math.floor(i / 5) * .22, 0, wood); l.rotation.x = Math.PI / 2; }
at(rbox(1.5, .15, 1.3, .07, SNOW), 0, .78, 0, wood);
for (const [x, z] of [[-7, -5], [6.5, 5], [-6, 6]]) tree(YARD, x, z, 1.1);
export const snowballs = G(YARD); for (let i = 0; i < 3; i++) at(sph(.08, SNOW), 0, -10, 0, snowballs);
export const snowman = G(YARD, -3, 0, 4); at(sph(.6, SNOW), 0, .55, 0, snowman); at(sph(.42, SNOW), 0, 1.4, 0, snowman); at(sph(.3, SNOW), 0, 2.0, 0, snowman); at(cone(.05, .3, '#f39a3b', 8), 0, 2.0, .35, snowman).rotation.x = Math.PI / 2;
for (const x of [-.1, .1]) at(sph(.035, '#1d1d22'), x, 2.08, .27, snowman);

// ================= SANDAL room =================
export const SAN = G(scene, ...OFF.sandal);
room(SAN, 6, 5.5, 2.7, wallp);
at(M(new THREE.PlaneGeometry(2.4, 1.6), '#ffffff', { map: gilamTex, noEdge: true }), 0, 1.55, -2.62, SAN);
const korpaTex = tex(512, 512, (g, w, h) => { g.fillStyle = '#b8352f'; g.fillRect(0, 0, w, h); for (let y = 0; y < h; y += 64) for (let x = 0; x < w; x += 64) { g.fillStyle = (x + y) / 64 % 2 ? '#e6b450' : '#2b5b9a'; g.beginPath(); g.arc(x + 32, y + 32, 18, 0, 7); g.fill(); g.fillStyle = '#f0e2c0'; g.beginPath(); g.arc(x + 32, y + 32, 7, 0, 7); g.fill(); }
  g.strokeStyle = '#7a1f22'; g.lineWidth = 10; g.strokeRect(5, 5, w - 10, h - 10); });
export const sandal = G(SAN, 0, 0, 0);
const quilt = at(rbox(2.6, .5, 2.6, .25, '#ffffff', { map: korpaTex }), 0, .4, 0, sandal);
at(rbox(1.3, .06, 1.3, .03, '#8d6a50'), 0, .68, 0, sandal);
for (const [x, z, r] of [[0, 1.75, 0], [0, -1.75, 0], [1.75, 0, Math.PI / 2], [-1.75, 0, Math.PI / 2]]) { const k = at(rbox(2.4, .12, .8, .06, ['#3f6d8f', '#5f8f6a', '#7b5ca8', '#c0453a'][Math.abs(Math.round(x + z * 2)) % 4]), x, .06, z, sandal); k.rotation.y = r; }
export const sCandle = G(sandal, 0, .71, 0); at(cyl(.04, .04, .2, '#f4efe2', 12), 0, .1, 0, sCandle); export const flameB = at(sph(.035, '#ffcf70', { glow: true, glowK: 2.5, cast: false, noEdge: true }), 0, .25, 0, sCandle); flameB.scale.set(1, 1.8, 1);
for (const x of [-.35, .3]) { const p = G(sandal, x, .71, .3); at(cyl(.06, .04, .07, '#f2f2f2', 14), 0, .035, 0, p); at(tor(.06, .008, '#2d5fa0'), 0, .06, 0, p).rotation.x = Math.PI / 2; }
export const radio = G(sandal, .4, .71, -.3); at(rbox(.36, .22, .12, .04, '#6b4a36'), 0, .11, 0, radio); at(cyl(.06, .06, .02, '#2a2c31', 14), -.08, .11, .07, radio).rotation.x = Math.PI / 2; const ant = at(cyl(.006, .006, .45, '#c9ccd2', 4), .14, .4, 0, radio); ant.rotation.z = -.4;
export const sWin = G(SAN, 2.88, 1.6, 0); sWin.rotation.y = -Math.PI / 2; at(M(new THREE.PlaneGeometry(1.4, 1.2), '#ffffff', { map: viewTex, noEdge: true, cast: false, glow: true, glowK: .6 }), 0, 0, 0, sWin);
export const sFrost = at(M(new THREE.PlaneGeometry(1.4, 1.2), '#ffffff', { map: frostTex, noEdge: true, cast: false, opacity: .9 }), 0, 0, .03, sWin);
for (const [w, h, x, y] of [[1.5, .08, 0, .64], [1.5, .1, 0, -.64], [.08, 1.3, -.72, 0], [.08, 1.3, .72, 0], [.05, 1.2, 0, 0]]) at(rbox(w, h, .1, .02, '#f7f4ee'), x, y, .04, sWin);

// ================= MAP of Uzbekistan =================
export const MAP = G(scene, ...OFF.map);
const LL = [[56.0, 45.0], [58.6, 45.6], [59.4, 44.9], [61.1, 44.2], [62.0, 43.5], [64.4, 43.7], [65.6, 43.2], [66.1, 42.6], [66.0, 42.0], [66.6, 41.9], [67.9, 41.2], [68.6, 40.7], [69.2, 41.6], [70.2, 42.1], [70.9, 42.2], [71.0, 41.5], [71.9, 41.4], [72.6, 41.0], [73.1, 40.8], [72.6, 40.4], [71.7, 40.2], [70.9, 40.2], [70.4, 40.4], [70.5, 40.9], [69.6, 40.7], [69.3, 40.2], [68.6, 39.6], [67.6, 39.5], [67.4, 39.0], [68.2, 38.6], [68.4, 38.0], [67.8, 37.2], [67.2, 37.2], [66.5, 37.4], [66.6, 38.0], [65.6, 38.3], [64.2, 38.9], [63.0, 39.5], [62.3, 40.0], [61.9, 41.1], [60.9, 41.3], [60.1, 42.0], [58.7, 42.6], [58.2, 42.0], [57.0, 41.3], [56.0, 41.3]];
const proj = ([lo, la]) => [(lo - 64.5) * .78, -(la - 41.2) * 1.0];
const shp = new THREE.Shape(); LL.forEach((p, i) => { const [x, y] = proj(p); i ? shp.lineTo(x, y) : shp.moveTo(x, y); });
const mg = new THREE.ExtrudeGeometry(shp, { depth: .25, bevelEnabled: true, bevelThickness: .05, bevelSize: .05, bevelSegments: 2 }); mg.rotateX(Math.PI / 2);
export const mapLand = at(M(mg, '#1f3354'), 0, .3, 0, MAP);
at(M(new THREE.PlaneGeometry(80, 60).rotateX(-Math.PI / 2), '#0f1a2c', { noEdge: true }), 0, 0, 0, MAP);
export const CITIES = [['Toshkent', 69.24, 41.3, 1.6], ['Samarqand', 66.96, 39.65, 1.1], ['Buxoro', 64.42, 39.77, 1], ['Namangan', 71.67, 41.0, 1], ['Andijon', 72.34, 40.78, 1], ["Farg'ona", 71.78, 40.38, .9], ['Nukus', 59.6, 42.46, .9], ['Qarshi', 65.79, 38.86, .9], ['Termiz', 67.28, 37.22, .8], ['Urganch', 60.63, 41.55, .9], ['Navoiy', 65.38, 40.1, .8], ['Jizzax', 67.84, 40.12, .8], ['Guliston', 68.78, 40.49, .7], ["Qo'qon", 70.94, 40.53, .8]];
function inside(x, y) { let c = false; const P = LL.map(proj); for (let i = 0, j = P.length - 1; i < P.length; j = i++) { const [xi, yi] = P[i], [xj, yj] = P[j]; if (((yi > y) !== (yj > y)) && (x < (xj - xi) * (y - yi) / (yj - yi) + xi)) c = !c; } return c; }
export const mapDots = [];
CITIES.forEach(([n, lo, la, s]) => { const [x, y] = proj([lo, la]); const d = at(sph(.12 * s, '#ffd27a', { glow: true, glowK: 2.2, cast: false, noEdge: true }, 12, 8), x, .62, y, MAP); d.userData.order = (lo - 56) / 17; d.userData.city = n; mapDots.push(d);
  for (let k = 0; k < 10 * s; k++) { const dx = x + (R() - .5) * .6 * s, dy = y + (R() - .5) * .6 * s; if (!inside(dx, dy)) continue; const m = at(sph(.035, '#ffd27a', { glow: true, glowK: 2, cast: false, noEdge: true }, 6, 4), dx, .6, dy, MAP); m.userData.order = (lo - 56) / 17 + R() * .05; mapDots.push(m); } });
for (let k = 0; k < 220; k++) { const x = (R() - .5) * 15, y = (R() - .5) * 9; if (!inside(x, y)) continue; const m = at(sph(.03, '#ffd27a', { glow: true, glowK: 1.8, cast: false, noEdge: true }, 6, 4), x, .6, y, MAP); m.userData.order = (x + 6.6) / 13.3; mapDots.push(m); }
export function setMapLights(k) { // k 0..1 sweep: dots switch off from west->east... use order
  for (const d of mapDots) { const on = d.userData.order > k * 1.15 - .05; d.visible = on; } }
const starG = new THREE.BufferGeometry(); const sp3 = []; for (let i = 0; i < 900; i++) sp3.push((R() - .5) * 120, 8 + R() * 40, -20 - R() * 40); starG.setAttribute('position', new THREE.Float32BufferAttribute(sp3, 3));
at(new THREE.Points(starG, new THREE.PointsMaterial({ color: '#ffffff', size: .12, fog: false })), 0, 0, 0, MAP);

// ================= INFO stage =================
export const INFO = G(scene, ...OFF.info);
at(M(new THREE.PlaneGeometry(60, 40).rotateX(-Math.PI / 2), '#f3ece0', { noEdge: true }), 0, 0, 0, INFO);
at(M(new THREE.PlaneGeometry(60, 30), '#f3ece0', { noEdge: true }), 0, 15, -8, INFO);
export const pedestal = at(rbox(2.6, .5, 2.6, .12, '#e3d6c0'), 0, .25, 0, INFO);

// ================= SHOP interior =================
export const SHOP = G(scene, ...OFF.shop);
room(SHOP, 8, 6, 3.2, tiles);
for (const x of [-2.5, 0, 2.5]) { const sh = G(SHOP, x, 0, -2.6); at(rbox(2, 2.2, .5, .03, '#c9ccd2'), 0, 1.1, 0, sh); for (let y = 0; y < 4; y++) at(rbox(2, .04, .5, .01, '#e6e8eb'), 0, .28 + y * .5, .25, sh);
  for (let y = 0; y < 4; y++) for (let i = 0; i < 6; i++) { const v = (x + y * 3 + i) % 4; if ((y + i + x) % 3 === 0) continue; at(rbox(.22, .3, .2, .03, ['#c0453a', '#e3a64a', '#3f8a5a', '#2d5fa0'][Math.abs(Math.round(v)) % 4]), -.8 + i * .32, .45 + y * .5, .36, sh); } }
export const counter = G(SHOP, 1.5, 0, 1); at(rbox(2.6, 1.0, .7, .04, '#8d6a50'), 0, .5, 0, counter);
export const terminal = G(counter, -.6, 1.0, .1); at(rbox(.16, .26, .07, .02, '#2a2c31'), 0, .13, 0, terminal); export const termScreen = at(M(new THREE.PlaneGeometry(.12, .09), '#7fc8ff', { noEdge: true, cast: false, glow: true }), 0, .18, .036, terminal);
const naqdTex = tex(512, 160, (g, w, h) => { g.fillStyle = '#fff4c2'; g.fillRect(0, 0, w, h); g.strokeStyle = '#c0453a'; g.lineWidth = 10; g.strokeRect(5, 5, w - 10, h - 10); g.fillStyle = '#c0453a'; g.font = '900 50px InterX'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText("ТОЛЬКО НАЛИЧНЫЕ", w / 2, h / 2 + 4); });
export const naqd = at(M(new THREE.PlaneGeometry(.8, .25), '#ffffff', { map: naqdTex, noEdge: true, cast: false }), .5, 1.25, .36, counter);
export const shopCandle = G(counter, .2, 1.0, 0); at(cyl(.035, .035, .18, '#f4efe2', 12), 0, .09, 0, shopCandle); export const flameC = at(sph(.03, '#ffcf70', { glow: true, glowK: 2.5, cast: false, noEdge: true }), 0, .22, 0, shopCandle); flameC.scale.set(1, 1.8, 1);

// ================= weather (falling snow) =================
const SN = 6000; const flakeG = new THREE.BufferGeometry(); const fp = new Float32Array(SN * 6); const fseed = [];
for (let i = 0; i < SN; i++) fseed.push([R(), R(), R(), R()]);
flakeG.setAttribute('position', new THREE.BufferAttribute(fp, 3));
export const flakes = new THREE.LineSegments(flakeG, new THREE.LineBasicMaterial({ color: '#ffffff', transparent: true, opacity: .9, fog: false })); scene.add(flakes); flakes.frustumCulled = false;
export function weather(t, cx, cy, cz, amt, wind = .1, Rr = 18) {
  flakes.visible = amt > 0; if (!amt) return; const n = Math.floor(SN * amt); flakeG.setDrawRange(0, n * 2);
  const vx = .5 + wind * 20, vy = 1.1, len = .06 + wind * .3;
  for (let i = 0; i < n; i++) { const [a, b, c, d] = fseed[i]; const sp = .7 + d * .6;
    let x = ((a * 2 * Rr + t * vx * sp) % (2 * Rr)) - Rr, y = ((b * 16 - t * vy * sp) % 16 + 16) % 16 - 2, z = (c * 2 - 1) * Rr;
    x += Math.sin(t * 1.3 + d * 30) * .4; const o = i * 6;
    fp[o] = cx + x; fp[o + 1] = cy + y; fp[o + 2] = cz + z; fp[o + 3] = cx + x - len * (vx / 20 + .05); fp[o + 4] = cy + y + len + .04; fp[o + 5] = cz + z; }
  flakeG.attributes.position.needsUpdate = true;
}
// breath puffs
export const breathG = G(scene); for (let i = 0; i < 6; i++) at(sph(.06, '#ffffff', { opacity: .5, cast: false, noEdge: true }, 10, 8), 0, -50, 0, breathG);
export function breath(t, pos, dir = new THREE.Vector3(0, .1, 1)) { breathG.children.forEach((s, i) => { const p = ((t * .6 + i / 6) % 1); const on = p < .7; s.visible = on;
  s.position.copy(pos).addScaledVector(dir, p * .5); s.position.y += p * .12; s.scale.setScalar(.5 + p * 2.2); setOpacity(s, .45 * (1 - p / .7)); }); }

// ================= env presets =================
const ENV = {
  night: { bg: '#18233a', fog: ['#1f2c46', 20, 140], hemi: .42, sun: .35, sunColor: '#9bb4ff', night: 1, expo: 1.05, tint: [.8, .88, 1.1] },
  blackout: { bg: '#0f1626', fog: ['#151e33', 14, 110], hemi: .3, sun: .28, sunColor: '#8aa4e8', night: 1, expo: 1.0, tint: [.72, .82, 1.12] },
  dawn: { bg: '#b8c6dc', fog: ['#d6deea', 30, 220], hemi: .6, sun: 1.8, sunColor: '#ffd2a8', night: 0, expo: 1, tint: [1, .97, .97] },
  day: { bg: '#c6d6e6', fog: ['#dfe7f0', 40, 260], hemi: .62, sun: 2.0, sunColor: '#fff4e6', night: 0, expo: 1, tint: [1, 1, 1] },
  grey: { bg: '#b9c3cf', fog: ['#cdd5de', 25, 180], hemi: .7, sun: 1.0, night: 0, expo: 1, tint: [.97, .99, 1.02] },
  indoorDay: { bg: '#cfd8e2', fog: null, hemi: .55, sun: 1.3, sunColor: '#e8eefc', night: 0, expo: 1, tint: [.96, .98, 1.03] },
  indoorDark: { bg: '#0d1220', fog: null, hemi: .16, sun: .12, sunColor: '#8aa4e8', night: 1, expo: 1.05, tint: [.8, .85, 1.08] },
  indoorPower: { bg: '#e8dcc4', fog: null, hemi: .62, sun: 1.6, sunColor: '#fff1d6', night: 0, expo: 1, tint: [1, 1, 1] },
  space: { bg: '#060a14', fog: null, hemi: .4, sun: .9, sunColor: '#a9c0ff', night: 1, expo: 1.05, tint: [.85, .9, 1.1] },
  info: { bg: '#f3ece0', fog: null, hemi: .65, sun: 2.2, night: 0, expo: 1, tint: [1, 1, 1] },
};
export function setEnv(name, over = {}) { const e = { ...ENV[name], ...over };
  scene.background = new THREE.Color(e.bg); scene.fog = e.fog ? new THREE.Fog(e.fog[0], e.fog[1], e.fog[2]) : null;
  L.hemi.intensity = e.hemi * Math.PI; L.sun.intensity = e.sun * Math.PI; L.sun.color.set(e.sunColor || '#fff4e6');
  look.night = e.night; look.expo = e.expo; look.tint.setRGB(...e.tint); return e; }

// ---- extra flat details: entry door (right wall), wall socket with plugs ----
export const fDoor = G(FLAT, 3.38, 0, 1.6); { const d = at(box(.06, 2.1, .9, '#8d6a50'), 0, 1.05, -.45, fDoor); at(sph(.04, '#d6b25a'), -.05, 1.0, -.8, fDoor); }
export const socket = G(FLAT, 3.38, .35, -1.6); socket.rotation.y = -Math.PI / 2; at(rbox(.16, .16, .03, .02, '#f2f2f2'), 0, 0, 0, socket);
export const plug = G(socket, 0, 0, .04); at(rbox(.08, .1, .08, .02, '#2a2c31'), 0, 0, .03, plug); { const c = at(cyl(.012, .012, 1.2, '#2a2c31', 6), 0, -.5, .06, plug); }
export const sparks = G(socket, 0, 0, .1); for (let i = 0; i < 12; i++) at(sph(.02, '#ffe27a', { glow: true, glowK: 3, cast: false, noEdge: true }, 6, 4), 0, 0, 0, sparks); sparks.visible = false;
export function animSparks(t) { sparks.visible = true; sparks.children.forEach((s, i) => { const p = ((t * 3 + i / 12) % 1); const a = i * 2.4; s.position.set(Math.cos(a) * p * .5, Math.sin(a) * p * .4 - p * p * .4, p * .3); s.scale.setScalar(1.4 - p); }); }
// quilt hung over the sandal-room window
export const winQuilt = at(rbox(1.7, 1.5, .06, .03, '#2b5b9a'), 0, 0, .1, sWin); winQuilt.visible = false;
// water spray from burst pipe
export const spray = G(pipe, 0, 1.0, .08); for (let i = 0; i < 24; i++) at(sph(.025, '#9fd0ef', { cast: false, noEdge: true }, 6, 4), 0, 0, 0, spray); spray.visible = false;
export function animSpray(t) { spray.visible = true; spray.children.forEach((s, i) => { const p = ((t * 2 + i / 24) % 1); const a = (i * 1.7) % 1.2 - .6; s.position.set(Math.sin(a) * p * .9, -p * p * 1.0 + p * .2, Math.cos(a) * p * .9); }); }
