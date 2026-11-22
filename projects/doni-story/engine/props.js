// Infographic props for the INFO stage
import { THREE, M, rbox, box, cyl, sph, cone, tor, at, G, tex, retex, clamp, lerp, setColor } from './comic.js';
export const P = {};
const font = (g, sz, w = 900) => { g.font = `${w} ${sz}px ${w >= 900 ? 'InterX' : 'InterB'}`; };

// --- phone with live screen ---
export function makePhone() {
  const ph = new THREE.Group(); at(rbox(.7, 1.4, .08, .08, '#1c1d22'), 0, 0, 0, ph);
  const st = tex(360, 720, () => {}); const scr = at(M(new THREE.PlaneGeometry(.64, 1.3), '#ffffff', { map: st, noEdge: true, cast: false, glow: true, glowK: 1.15 }), 0, 0, .045, ph);
  at(rbox(.18, .03, .02, .01, '#000', { cast: false }), 0, .62, .05, ph);
  ph.userData.draw = (mode, o = {}) => retex(st, (g, w, h) => phoneScreen(g, w, h, mode, o)); return ph;
}
export function phoneScreen(g, w, h, mode, o) {
  g.fillStyle = '#121a26'; g.fillRect(0, 0, w, h);
  font(g, 22, 700); g.fillStyle = '#cfd8e3'; g.fillText(o.clock || '18:42', 22, 36);
  const bat = o.bat ?? 50; g.strokeStyle = '#cfd8e3'; g.lineWidth = 2; g.strokeRect(w - 70, 18, 44, 20); g.fillStyle = bat < 15 ? '#ff4d3c' : '#7dd97a'; g.fillRect(w - 67, 21, 38 * bat / 100, 14);
  font(g, 18, 700); g.fillStyle = '#cfd8e3'; g.fillText(bat + '%', w - 128, 35);
  if (mode === 'nosig' || o.nosig) { g.fillStyle = '#ff6a5a'; font(g, 18, 700); g.fillText('✕ Нет сети', 100, 36); }
  if (mode === 'nosig') { g.fillStyle = '#ff6a5a'; font(g, 56); g.textAlign = 'center'; g.fillText('НЕТ', w / 2, h / 2 - 20); g.fillText('СЕТИ', w / 2, h / 2 + 46); g.textAlign = 'left';
    g.strokeStyle = '#ff6a5a'; g.lineWidth = 8; for (let i = 0; i < 4; i++) g.strokeRect(w / 2 - 60 + i * 32, h / 2 + 150 - i * 22, 20, 22 + i * 22); g.beginPath(); g.moveTo(w / 2 - 80, h / 2 + 100); g.lineTo(w / 2 + 80, h / 2 + 190); g.stroke(); }
  if (mode === 'call') { g.textAlign = 'center'; g.fillStyle = '#fff'; font(g, 100); g.fillText('112', w / 2, 250); font(g, 26, 700); g.fillStyle = '#9fb3c8'; g.fillText('Экстренный вызов…', w / 2, 300);
    const k = o.k || 0; for (let i = 0; i < 3; i++) { g.strokeStyle = `rgba(80,220,120,${.9 - ((k * 2 + i / 3) % 1)})`; g.lineWidth = 6; g.beginPath(); g.arc(w / 2, 520, 40 + ((k * 2 + i / 3) % 1) * 90, 0, 7); g.stroke(); }
    g.fillStyle = '#e8473a'; g.beginPath(); g.arc(w / 2, 520, 44, 0, 7); g.fill(); g.textAlign = 'left'; }
  if (mode === 'sms') { g.fillStyle = '#1d2736'; g.fillRect(0, 60, w, 60); font(g, 26, 700); g.fillStyle = '#fff'; g.fillText('SMS → 112', 24, 100);
    const msg = o.text || ''; const n = Math.floor(msg.length * clamp(o.k ?? 1)); const shown = msg.slice(0, n);
    g.fillStyle = '#2f7cf6'; const lines = wrap(g, shown, w - 90, 26); const bh = 30 + lines.length * 34; roundRect(g, 40, 160, w - 60, bh, 22); g.fill();
    g.fillStyle = '#fff'; lines.forEach((l, i) => g.fillText(l, 60, 198 + i * 34));
    if (o.sent) { font(g, 20, 700); g.fillStyle = o.sent === 'ok' ? '#7dd97a' : '#ffb347'; g.fillText(o.sent === 'ok' ? '✓ Доставлено' : '… Отправка', w - 190, 160 + bh + 30); } }
  if (mode === 'notes') { font(g, 30); g.fillStyle = '#ffd36b'; g.fillText('План', 24, 110); font(g, 24, 700); g.fillStyle = '#fff';
    (o.items || []).forEach((it, i) => { g.fillStyle = it[1] ? '#7dd97a' : '#55606e'; g.fillRect(28, 150 + i * 60, 30, 30); g.fillStyle = '#fff'; g.fillText(it[0], 74, 174 + i * 60); }); }
  if (mode === 'photos') { const ph = o.photos || []; ph.forEach((p, i) => { const x = 20 + (i % 2) * 165, y = 80 + Math.floor(i / 2) * 210; g.fillStyle = p.bg; g.fillRect(x, y, 155, 200); drawPeople(g, x, y, 155, 200, p.who); }); }
}
function roundRect(g, x, y, w, h, r) { g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); }
function wrap(g, s, maxW, sz) { font(g, sz, 700); const words = s.split(' '); const out = []; let cur = ''; for (const wd of words) { const t = cur ? cur + ' ' + wd : wd; if (g.measureText(t).width > maxW && cur) { out.push(cur); cur = wd; } else cur = t; } if (cur) out.push(cur); return out; }
function drawPeople(g, x, y, w, h, who) {
  const col = { mom: ['#c0453a', '#e9b48f', '#3a2a24'], kid: ['#e3a64a', '#f0c19c', '#5a3a2a'], girl: ['#7b5ca8', '#efc2a0', '#2a1c18'], friend: ['#3f8a5a', '#d9a27e', '#1d1515'] };
  const list = who.split(','); list.forEach((k, i) => { const [shirt, skin, hair] = col[k]; const cx = x + w * (i + 1) / (list.length + 1), s = k === 'kid' ? .75 : 1;
    g.fillStyle = shirt; g.beginPath(); g.ellipse(cx, y + h - 10, 34 * s, 60 * s, 0, Math.PI, 0); g.fill();
    g.fillStyle = skin; g.beginPath(); g.arc(cx, y + h - 80 * s, 24 * s, 0, 7); g.fill(); g.fillStyle = hair; g.beginPath(); g.arc(cx, y + h - 88 * s, 25 * s, Math.PI, 0); g.fill();
    g.fillStyle = '#222'; g.beginPath(); g.arc(cx - 8 * s, y + h - 80 * s, 3, 0, 7); g.arc(cx + 8 * s, y + h - 80 * s, 3, 0, 7); g.fill();
    g.strokeStyle = '#222'; g.lineWidth = 2.5; g.beginPath(); g.arc(cx, y + h - 72 * s, 8 * s, .2, Math.PI - .2); g.stroke(); });
  if (who.includes('friend')) { g.fillStyle = '#fff'; g.beginPath(); g.arc(x + w - 30, y + h - 26, 16, 0, 7); g.fill(); g.fillStyle = '#222'; g.beginPath(); g.arc(x + w - 30, y + h - 26, 6, 0, 7); g.fill(); }
}

// --- brain ---
export function makeBrain() { const b = new THREE.Group(); const pink = '#f0a3a8';
  for (const s of [1, -1]) { const h = at(sph(.55, pink), s * .28, 0, 0, b); h.scale.set(.55, .75, 1);
    for (let i = 0; i < 7; i++) { const g = tor(.28 + (i % 3) * .06, .035, '#d8848b', Math.PI * 1.3); g.rotation.set(Math.PI / 2 * (i % 2), s * .4 + i * .7, i); at(g, s * .32, (i - 3) * .09, (i % 3 - 1) * .2, b); } }
  at(cyl(.12, .08, .4, '#e8939a', 12), 0, -.5, -.1, b); return b; }
// --- lightning bolt (flat extruded) ---
export function makeBolt(color = '#ffcf3a') { const sh = new THREE.Shape(); sh.moveTo(0, .5); sh.lineTo(-.22, .02); sh.lineTo(-.02, .04); sh.lineTo(-.14, -.5); sh.lineTo(.22, .08); sh.lineTo(.02, .06); sh.lineTo(.14, .5); sh.lineTo(0, .5);
  return M(new THREE.ExtrudeGeometry(sh, { depth: .08, bevelEnabled: true, bevelSize: .015, bevelThickness: .015, bevelSegments: 1 }), color); }
// --- heart ---
export function makeHeart() { const s = new THREE.Shape(); s.moveTo(0, -.45); s.bezierCurveTo(.5, -.05, .5, .38, .22, .4); s.bezierCurveTo(.08, .42, 0, .3, 0, .22); s.bezierCurveTo(0, .3, -.08, .42, -.22, .4); s.bezierCurveTo(-.5, .38, -.5, -.05, 0, -.45);
  const g = new THREE.ExtrudeGeometry(s, { depth: .18, bevelEnabled: true, bevelSize: .06, bevelThickness: .06, bevelSegments: 3 }); g.center(); return M(g, '#e0473c'); }
// --- molecule: hemoglobin + O2 / CO ---
export function makeHemo() { const h = new THREE.Group(); at(sph(.6, '#d6453b'), 0, 0, 0, h).scale.set(1, .85, .9);
  const sockets = []; for (let i = 0; i < 4; i++) { const a = i * Math.PI / 2 + .6; const s = at(tor(.13, .04, '#8f2a24'), Math.cos(a) * .55, Math.sin(a) * .45, .35, h); sockets.push(s); }
  h.userData.sockets = sockets; return h; }
export function makeO2() { const g = new THREE.Group(); at(sph(.12, '#f2f2f2'), -.1, 0, 0, g); at(sph(.12, '#f2f2f2'), .1, 0, 0, g); return g; }
export function makeCO() { const g = new THREE.Group(); at(sph(.13, '#3b3d44'), -.1, 0, 0, g); at(sph(.12, '#f2f2f2'), .11, 0, 0, g); return g; }
// --- body mannequin (x-ray) with core glow + limbs coloring ---
export function makeBody() { const b = new THREE.Group(); const parts = { core: [], limbs: [] }; const c = '#9ec7e8';
  parts.core.push(at(sph(.22, c), 0, 2.05, 0, b)); parts.core.push(at(rbox(.62, .8, .34, .15, c), 0, 1.45, 0, b)); parts.core.push(at(rbox(.5, .3, .3, .12, c), 0, .98, 0, b));
  for (const s of [1, -1]) { parts.limbs.push(at(cyl(.08, .07, .62, c, 12), s * .42, 1.5, 0, b)); parts.limbs.push(at(cyl(.07, .06, .55, c, 12), s * .48, .95, 0, b)); parts.limbs.push(at(sph(.07, c), s * .5, .62, 0, b));
    parts.limbs.push(at(cyl(.1, .09, .5, c, 12), s * .14, .62, 0, b)); parts.limbs.push(at(cyl(.09, .08, .45, c, 12), s * .14, .18, 0, b)); }
  b.rotation.z = 0; for (const p of parts.limbs) { p.rotation.z = 0; }
  b.children[3].rotation.z = .12; b.children[6].rotation.z = -.12;
  const heart = makeHeart(); heart.scale.setScalar(.25); at(heart, .05, 1.55, .2, b); const brain = makeBrain(); brain.scale.setScalar(.22); at(brain, 0, 2.1, .02, b);
  b.userData.parts = parts; b.userData.setTemp = (k) => { parts.limbs.forEach(p => setColor(p, new THREE.Color('#e8735a').lerp(new THREE.Color('#5d8fd6'), k))); parts.core.forEach(p => setColor(p, new THREE.Color('#f08a6a').lerp(new THREE.Color('#e8735a'), k * .3))); };
  return b; }
// --- thermometer ---
export function makeThermo() { const t = new THREE.Group(); at(cyl(.12, .12, 1.8, '#f4f4f4', 18), 0, 1.0, 0, t); at(sph(.22, '#f4f4f4'), 0, .05, 0, t);
  const bulb = at(sph(.16, '#e0473c'), 0, .05, .02, t); const col = at(cyl(.06, .06, 1, '#e0473c', 12), 0, .55, .06, t);
  for (let i = 0; i < 9; i++) at(box(.12, .015, .01, '#333', { cast: false }), .14, .3 + i * .17, .06, t);
  t.userData.set = (k) => { col.scale.y = clamp(k, .02, 1); col.position.y = .1 + .9 * k * .5 + .05; }; t.userData.set(1); return t; }
// --- cookie pack ---
export function makeCookies() { const g = new THREE.Group(); const pack = at(rbox(.9, .12, .5, .05, '#e3a64a'), 0, .06, 0, g);
  const label = tex(256, 128, (c, w, h) => { c.fillStyle = '#e3a64a'; c.fillRect(0, 0, w, h); c.fillStyle = '#7a3b1e'; font(c, 46); c.fillText('ПЕЧЕНЬЕ', 18, 80); });
  at(M(new THREE.PlaneGeometry(.8, .4).rotateX(-Math.PI / 2), '#ffffff', { map: label, noEdge: true, cast: false }), 0, .125, 0, g);
  const pieces = []; for (let i = 0; i < 6; i++) { const p = at(cyl(.12, .12, .04, '#d79a55', 16), 0, .3, 0, g); for (let j = 0; j < 4; j++) at(sph(.018, '#6b3a1e', { cast: false }), (j - 1.5) * .05, .025, ((j % 2) - .5) * .06, p); p.visible = false; pieces.push(p); }
  g.userData.pack = pack; g.userData.pieces = pieces; return g; }
// --- fuel canister / gauge dial ---
export function makeGauge() { const g = new THREE.Group(); at(cyl(.6, .6, .12, '#2b2f36', 32), 0, 0, 0, g).rotation.x = Math.PI / 2;
  const gt = tex(256, 256, () => {}); const face = at(M(new THREE.CircleGeometry(.54, 40), '#ffffff', { map: gt, noEdge: true, cast: false, glow: true, glowK: 1.1 }), 0, 0, .065, g);
  g.userData.set = (k, label = 'БЕНЗИН') => retex(gt, (c, w, h) => { c.fillStyle = '#10151c'; c.fillRect(0, 0, w, h); c.lineWidth = 18; c.strokeStyle = '#2b3542'; c.beginPath(); c.arc(128, 140, 92, Math.PI * .9, Math.PI * 2.1); c.stroke();
    c.strokeStyle = k < .3 ? '#ff5a3c' : '#ffb347'; c.beginPath(); c.arc(128, 140, 92, Math.PI * .9, Math.PI * (.9 + 1.2 * k)); c.stroke();
    const a = Math.PI * (.9 + 1.2 * k); c.strokeStyle = '#fff'; c.lineWidth = 7; c.beginPath(); c.moveTo(128, 140); c.lineTo(128 + Math.cos(a) * 80, 140 + Math.sin(a) * 80); c.stroke();
    font(c, 30); c.fillStyle = '#cfd8e3'; c.textAlign = 'center'; c.fillText(label, 128, 215); c.fillText('E', 50, 125); c.fillText('F', 206, 125); c.textAlign = 'left'; });
  g.userData.set(.5); return g; }
// --- jacket item ---
export function makeJacketItem() { const g = new THREE.Group(); for (let i = 0; i < 4; i++) at(rbox(.9 - Math.abs(i - 1.5) * .04, .2, .35, .09, '#3d6f8f'), 0, .1 + i * .19, 0, g);
  for (const s of [1, -1]) { const a = at(cyl(.12, .11, .75, '#3d6f8f', 14), s * .55, .38, 0, g); a.rotation.z = s * .35; }
  at(rbox(.5, .14, .35, .06, '#35627f'), 0, .86, 0, g); at(box(.02, .7, .02, '#d0d0d0', { cast: false }), 0, .42, .18, g); return g; }
export function makeBeanie() { const g = new THREE.Group(); at(M(new THREE.SphereGeometry(.3, 24, 14, 0, Math.PI * 2, 0, Math.PI / 2), '#b8463c'), 0, 0, 0, g); at(cyl(.305, .305, .12, '#9c3a32', 24), 0, .02, 0, g); at(sph(.08, '#f1e9de'), 0, .32, 0, g); return g; }
export function makeBag() { const g = new THREE.Group(); const b = at(sph(.35, '#f2f2f2'), 0, .3, 0, g); b.scale.set(1, 1.1, .8); setColor(b, '#e9eef2'); at(tor(.1, .02, '#e9eef2', Math.PI), -.12, .68, 0, g); at(tor(.1, .02, '#e9eef2', Math.PI), .12, .68, 0, g); return g; }
export function makeClock() { const g = new THREE.Group(); at(cyl(.5, .5, .2, '#e0473c', 32), 0, 0, 0, g).rotation.x = Math.PI / 2;
  const ct = tex(256, 256, (c, w, h) => { c.fillStyle = '#fff'; c.beginPath(); c.arc(128, 128, 124, 0, 7); c.fill(); c.fillStyle = '#222'; for (let i = 0; i < 12; i++) { const a = i * Math.PI / 6; c.fillRect(128 + Math.cos(a) * 100 - 4, 128 + Math.sin(a) * 100 - 4, 8, 8); } });
  at(M(new THREE.CircleGeometry(.44, 32), '#ffffff', { map: ct, noEdge: true, cast: false }), 0, 0, .105, g);
  const hh = at(box(.04, .25, .02, '#222', { cast: false }), 0, .1, .12, g), mh = at(box(.03, .36, .02, '#222', { cast: false }), 0, .15, .125, g);
  const hp = G(g, 0, 0, .12); hp.add(hh); hh.position.set(0, .1, 0); const mp = G(g, 0, 0, .125); mp.add(mh); mh.position.set(0, .15, 0);
  for (const s of [1, -1]) at(sph(.15, '#e0473c'), s * .32, .45, 0, g); g.userData.hands = [hp, mp]; return g; }
export function makeBottle() { const g = new THREE.Group(); const b = at(cyl(.16, .16, .7, '#9fd0ef', 20, { opacity: .55 }), 0, .35, 0, g); at(cyl(.07, .1, .12, '#9fd0ef', 14, { opacity: .55 }), 0, .76, 0, g); at(cyl(.075, .075, .08, '#2f6fe0', 14), 0, .85, 0, g);
  const snow = at(cyl(.14, .14, .5, '#ffffff', 18), 0, .3, 0, g); const water = at(cyl(.14, .14, .3, '#5fb0ea', 18), 0, .17, 0, g); g.userData.set = k => { snow.scale.y = clamp(1 - k, .01, 1); snow.position.y = .05 + .5 * (1 - k) / 2 + .3 * k; water.scale.y = clamp(k * .9, .01, 1); water.position.y = .05 + .15 * k; }; g.userData.set(0); return g; }
export function makeShovel() { const g = new THREE.Group(); at(cyl(.03, .03, 1.1, '#8d6a50', 8), 0, .55, 0, g); at(rbox(.32, .4, .04, .03, '#5a6470'), 0, -.15, 0, g); at(rbox(.22, .05, .05, .02, '#222'), 0, 1.12, 0, g); return g; }
export function makePowerbank() { const g = new THREE.Group(); at(rbox(.3, .55, .1, .04, '#2f3238'), 0, .28, 0, g); for (let i = 0; i < 4; i++) at(box(.05, .02, .01, i < 3 ? '#7dd97a' : '#444', { glow: i < 3 }), -.08 + i * .055, .45, .055, g); return g; }
export function makeWater() { const g = new THREE.Group(); at(cyl(.13, .13, .55, '#5fb0ea', 18, { opacity: .8 }), 0, .28, 0, g); at(cyl(.06, .06, .08, '#fff', 12), 0, .6, 0, g); return g; }
export function makeCan() { const g = new THREE.Group(); at(cyl(.15, .15, .22, '#c0453a', 20), 0, .11, 0, g); at(cyl(.15, .15, .02, '#cfd5dc', 20), 0, .23, 0, g); return g; }
export function makeArrow(color = '#f39a3b', len = 2, r = .06) { const g = new THREE.Group(); const sh = at(cyl(r, r, len, color, 12), 0, len / 2, 0, g); const hd = at(cone(r * 2.6, r * 5, color, 16), 0, len + r * 2.5, 0, g); g.userData = { sh, hd, len }; return g; }
export function makeCross(color = '#e0473c') { const g = new THREE.Group(); for (const r of [.78, -.78]) { const b = at(rbox(1.2, .22, .12, .06, color), 0, 0, 0, g); b.rotation.z = r; } return g; }
export function makeCheck(color = '#3fbf5a') { const g = new THREE.Group(); const a = at(rbox(.5, .2, .12, .06, color), -.22, -.1, 0, g); a.rotation.z = -.8; const b = at(rbox(1.0, .2, .12, .06, color), .2, .12, 0, g); b.rotation.z = .9; return g; }
