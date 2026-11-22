// Doni Story ep1 — «Что будет, если застрять в буран при −40?»
import { THREE, camera, draw, frameOut, og, W, H, clamp, lerp, ss, ease, at, G, setOpacity, look, M, sph, cyl, rbox } from './comic.js';
import * as S from './sets.js';
import * as PR from './props.js';
import { makeDoni, pose, face, POSES, mixPose, cycle, blinkAt } from './doni.js';
const TL = await (await fetch('timeline.json')).json(); const SEN = TL.S;
let ENV = null; try { ENV = await (await fetch('env.json')).json(); } catch (e) { }
const PRE = 1.2, FPS = 30;
const T0 = i => SEN[i].t0 + PRE, T1 = i => SEN[i].t1 + PRE;
export const DUR = T1(SEN.length - 1) + 4.0; window.DUR = DUR; window.FRAMES = Math.ceil(DUR * FPS);
const X = S.OFF.steppe[0], IX = S.OFF.info[0];
const V = (x, y, z) => new THREE.Vector3(x, y, z);
const scene = S.scene;
const D = makeDoni(); scene.add(D);
// ---------- props on INFO stage ----------
const INFO = S.INFO; const props = {};
const add = (k, o, x = 0, y = .5, z = 0) => { props[k] = o; at(o, x, y, z, INFO); o.visible = false; return o; };
add('phone', PR.makePhone()); add('brain', PR.makeBrain()); add('bolt1', PR.makeBolt()); add('bolt2', PR.makeBolt('#ff8a3a'));
add('heart', PR.makeHeart()); add('hemo', PR.makeHemo()); add('body', PR.makeBody()); add('thermo', PR.makeThermo()); add('cookies', PR.makeCookies());
add('gauge', PR.makeGauge()); add('jacket', PR.makeJacketItem()); add('beanie', PR.makeBeanie()); add('bag', PR.makeBag()); add('clock', PR.makeClock());
add('bottle', PR.makeBottle()); add('shovel', PR.makeShovel()); add('pbank', PR.makePowerbank()); add('water', PR.makeWater()); add('can', PR.makeCan());
add('cross', PR.makeCross()); add('check', PR.makeCheck());
const O2s = [], COs = []; for (let i = 0; i < 4; i++) { O2s.push(add('o2' + i, PR.makeO2())); COs.push(add('co' + i, PR.makeCO())); }
const winds = []; for (let i = 0; i < 7; i++) { const a = PR.makeArrow('#5d8fd6', 3.2, .07); a.rotation.z = -Math.PI / 2; winds.push(add('w' + i, a)); }
// mini diorama for "what is buran": flat steppe disc + tiny car + tiny trees (for contrast)
const dio = add('dio', new THREE.Group()); { const c = S.makeCar(); c.scale.setScalar(.24); c.userData.set({ lights: true }); at(c, .2, .08, 0, dio); c.rotation.y = .9;
  at(cyl(1.25, 1.25, .08, '#f3f7fb', 40), 0, .04, 0, dio); at(rbox(.5, .02, 2.4, .01, '#5b5f66', { cast: false }), .2, .085, 0, dio);
  for (let i = 0; i < 4; i++) { at(cyl(.015, .02, .5, '#6b5444', 6), -.6, .3, -.9 + i * .6, dio); }
  for (let i = 0; i < 6; i++) { const m = sph(.18, '#f3f7fb', { cast: false }); m.scale.set(1.6, .35, 1); at(m, Math.cos(i) * .9, .08, Math.sin(i * 1.7) * .8, dio); } }
// cutaway car on info stage
const cut = S.makeCar(); cut.userData.set({ cut: true }); at(cut, 0, 0, 0, INFO); cut.visible = false;
const gas = []; for (let i = 0; i < 26; i++) { const m = sph(.12, '#6f737b', { opacity: .55, noEdge: true, cast: false }); INFO.add(m); gas.push(m); m.visible = false; }
// phone in hand (in-world small phone used inside the car)
const handPhone = PR.makePhone(); D.userData.J.handR.add(handPhone); handPhone.position.set(0, -.11, .035); handPhone.rotation.set(-1.2, 0, 0); handPhone.scale.setScalar(.2); handPhone.visible = false;
// breath puffs
const puffs = []; for (let i = 0; i < 6; i++) { const p = sph(.05, '#ffffff', { opacity: .35, noEdge: true, cast: false }); scene.add(p); p.visible = false; puffs.push(p); }

// ---------- helpers ----------
function resetAll() {
  for (const k in props) props[k].visible = false; cut.visible = false; gas.forEach(g => g.visible = false); handPhone.visible = false; puffs.forEach(p => p.visible = false);
  S.plow.visible = false; S.rescue.visible = false; S.steps.visible = false; S.studioTV.visible = false; S.truck.position.set(0, -50, 0);
  scene.add(D); D.position.set(0, 0, 0); D.rotation.set(0, 0, 0); D.scale.setScalar(1); D.visible = true; D.userData.setJacket(false); D.userData.setBeanie(false);
  pose(D, POSES.idle); face(D, {}); look.vignette = .18; S.weather(0, 0, 0, 0, 0, 0); S.pozemka(0, 0, 0, 0);
  for (const k in props) { props[k].position.set(0, .5, 0); props[k].rotation.set(0, 0, 0); props[k].scale.setScalar(1); }
}
const ditch = { pos: [6.4, -.62, -20], rot: [.06, .3, -.12] };
function carDitch(st = {}) { S.car.position.set(...ditch.pos); S.car.rotation.set(...ditch.rot); S.car.userData.set({ fuel: .5, ...st }); }
function carRoad(z, st = {}) { S.car.position.set(1.8, 0, z); S.car.rotation.set(0, 0, 0); S.car.userData.set({ ...st }); }
function inCar(p, f, t) { S.car.add(D); D.position.set(.4, .33, -.02); D.rotation.set(0, 0, 0); D.scale.setScalar(.62); pose(D, p); face(D, { blink: blinkAt(t), ...f }); D.userData.setJacket(true); }
function cw(x, y, z) { scene.updateMatrixWorld(true); return S.car.localToWorld(V(x, y, z)); } // car-local -> world
// interior cameras (car-local)
const IC = {
  face: [[-.45, 1.25, .78], [.4, 1.12, -.05], 50], side: [[-.5, 1.22, .05], [.4, 1.12, -.05], 55], wide: [[-.35, 1.32, -1.15], [.25, 1.02, .6], 64],
  wind: [[-.15, 1.35, -.75], [.45, 1.0, 2.5], 55], dash: [[.1, 1.25, -.1], [.4, 1.05, .68], 42], hands: [[-.3, 1.3, .45], [.4, .95, .12], 48] };
function icam(name, push = 0) { const [p, l, f] = IC[name]; const P = cw(...p), Lk = cw(...l); P.lerp(Lk, push); return { pos: P, look: Lk, fov: f }; }
function talkPose(t, base = 'talk', alt = 'open') { const k = (Math.sin(t * 1.3) + 1) / 2; return mixPose(POSES[base], POSES[alt], ss(.2, .8, k)); }
function mouthAt(t) { if (ENV) { const i = Math.floor((t - PRE) * 60); const v = ENV.v[i] || 0; return clamp(v * 1.6); } const s = sentAt(t); if (!s) return 0; return clamp(.25 + .45 * Math.abs(Math.sin(t * 13) * Math.sin(t * 7.3))); }
function sentAt(t) { for (const s of SEN) if (t >= s.t0 + PRE && t <= s.t1 + PRE) return s; return null; }
function studio(t, p, f = {}, camk = 0) { S.setEnv('studio'); S.aimSun(0, 1, 0, 7, [-5, 10, 9]); D.position.set(0, 0, .2);
  pose(D, p); face(D, { mouth: mouthAt(t), blink: blinkAt(t), ...f }); D.rotation.y = Math.sin(t * .4) * .08; }
const camStudio = { med: () => ({ pos: V(.6, 1.6, 4.4), look: V(.15, 1.45, 0), fov: 30 }), close: () => ({ pos: V(.35, 1.75, 2.3), look: V(0, 1.68, 0), fov: 26 }),
  wide: () => ({ pos: V(1.2, 1.9, 7.5), look: V(0, 1.4, 0), fov: 34 }), left: () => ({ pos: V(-1.6, 1.6, 3.6), look: V(.2, 1.5, 0), fov: 30 }) };
function camLerp(a, b, k) { return { pos: a.pos.clone().lerp(b.pos, k), look: a.look.clone().lerp(b.look, k), fov: lerp(a.fov, b.fov, k) }; }
function info(t) { S.setEnv('info'); S.aimSun(IX, 0, 0, 7, [-5, 10, 9]); }
const IV = (x, y, z) => V(IX + x, y, z);
function pop(o, lt, d = .35) { const k = ss(0, d, lt); o.visible = k > 0; o.scale.multiplyScalar(k < 1 ? (k * (1.15 - .15 * k)) : 1); return k; }
function gasFlow(t, from, to, n = 26, spread = .3) { gas.forEach((g, i) => { if (i >= n) return; const k = ((t * .25 + i / n) % 1); g.visible = true; g.position.lerpVectors(from, to, k); g.position.y += Math.sin(k * 3 + i) * .15; g.position.x += Math.sin(i * 7.1) * spread; g.position.z += Math.cos(i * 3.3) * spread; g.scale.setScalar(.6 + k * 1.4); }); }
function breath(t, at, k = 1) { puffs.forEach((p, i) => { const ph = ((t * .5 + i / puffs.length) % 1); p.visible = k > 0 && ph < .7; p.position.copy(at).add(V(0, ph * .25, ph * .35)); p.scale.setScalar(.3 + ph * 1.4); setOpacity(p, (.35 - ph * .45) * k); }); }

// ---------- 2D overlay ----------
const C2 = { ink: '#15121a', yel: '#ffd33d', red: '#e8473a', blue: '#2f7cf6', white: '#fffdf6' };
function plate(text, x, y, o = {}) {
  const sz = o.size || 64, k = o.k ?? 1; if (k <= 0) return; og.save(); og.translate(x, y); const sc = k < 1 ? ease(k) * (1.12 - .12 * k) : 1; og.scale(sc, sc); og.rotate((o.rot || 0) * Math.PI / 180);
  og.font = `900 ${sz}px InterX`; const lines = String(text).split('\n'); const w = Math.max(...lines.map(l => og.measureText(l).width)) + sz * .8, h = lines.length * sz * 1.1 + sz * .5;
  og.fillStyle = C2.ink; og.fillRect(-w / 2 + 10, -h / 2 + 10, w, h); og.fillStyle = o.bg || C2.yel; og.fillRect(-w / 2, -h / 2, w, h);
  og.lineWidth = 6; og.strokeStyle = C2.ink; og.strokeRect(-w / 2, -h / 2, w, h);
  og.fillStyle = o.fg || C2.ink; og.textAlign = 'center'; og.textBaseline = 'middle'; lines.forEach((l, i) => og.fillText(l, 0, (i - (lines.length - 1) / 2) * sz * 1.1 + sz * .05));
  og.restore(); }
function ruleCard(n, text, k) { if (k <= 0) return; plate(`ПРАВИЛО №${n}`, W / 2, 230, { k, size: 54, bg: C2.red, fg: '#fff', rot: -2 }); plate(text, W / 2, 340, { k: clamp(k * 1.2 - .1), size: 62, rot: 1 }); }
function hud(t, label, temp) { og.save(); og.font = '900 40px InterX'; const w = og.measureText(label).width + 40;
  og.fillStyle = C2.ink; og.fillRect(46, 46, w, 64); og.fillStyle = C2.white; og.fillRect(40, 40, w, 64); og.lineWidth = 5; og.strokeStyle = C2.ink; og.strokeRect(40, 40, w, 64);
  og.fillStyle = C2.ink; og.textBaseline = 'middle'; og.fillText(label, 60, 74);
  if (temp) { og.font = '900 40px InterX'; const tw = og.measureText(temp).width + 40; const x = 40 + w + 18; og.fillStyle = C2.ink; og.fillRect(x + 6, 46, tw, 64); og.fillStyle = '#7cc4ff'; og.fillRect(x, 40, tw, 64); og.strokeRect(x, 40, tw, 64); og.fillStyle = C2.ink; og.fillText(temp, x + 20, 74); }
  og.restore(); }
function meters(fuel, bat) { // right-top bars
  og.save(); const items = [['⛽', fuel, '#ffb347'], ['🔋', bat, '#7dd97a']]; items.forEach(([ic, v, col], i) => { if (v == null) return; const x = W - 200 + i * 90, y = 44;
    og.fillStyle = C2.ink; og.fillRect(x + 5, y + 5, 60, 170); og.fillStyle = C2.white; og.fillRect(x, y, 60, 170); og.lineWidth = 5; og.strokeStyle = C2.ink; og.strokeRect(x, y, 60, 170);
    og.fillStyle = v < .2 ? C2.red : col; og.fillRect(x + 8, y + 8 + 124 * (1 - v), 44, 124 * v); og.font = '32px sans-serif'; og.textAlign = 'center'; og.fillText(ic, x + 30, y + 160); });
  og.restore(); }
function captions(t) { const s = sentAt(t); if (!s) return; const words = s.text.split(' '); const tot = s.text.length; const prog = clamp((t - (s.t0 + PRE)) / (s.t1 - s.t0));
  og.save(); og.font = '900 54px InterX'; og.textBaseline = 'middle'; og.textAlign = 'left';
  const lines = []; let cur = []; let cw2 = 0; for (const w of words) { const ww = og.measureText(w + ' ').width; if (cw2 + ww > W * .78 && cur.length) { lines.push(cur); cur = []; cw2 = 0; } cur.push(w); cw2 += ww; } if (cur.length) lines.push(cur);
  let acc = 0; const y0 = H - 110 - (lines.length - 1) * 64;
  lines.forEach((ln, li) => { const lw = og.measureText(ln.join(' ')).width; let x = W / 2 - lw / 2; const y = y0 + li * 64;
    for (const w of ln) { const wk = (acc + w.length / 2) / tot; acc += w.length + 1; const on = prog >= wk - .06 && prog < wk + (w.length + 1) / tot + .04;
      og.lineWidth = 12; og.strokeStyle = C2.ink; og.lineJoin = 'round'; og.strokeText(w, x, y); og.fillStyle = on ? C2.yel : '#ffffff'; og.fillText(w, x, y); x += og.measureText(w + ' ').width; } });
  og.restore(); }
function titleCard(k, k2) { if (k <= 0) return; og.save(); og.globalAlpha = clamp(k2); og.fillStyle = 'rgba(16,20,30,.55)'; og.fillRect(0, 0, W, H); og.restore();
  plate('Doni Story', W / 2, H / 2 - 120, { k, size: 110, bg: '#1f2a3a', fg: '#fff' }); plate('ЧТО БУДЕТ, ЕСЛИ…', W / 2, H / 2 + 30, { k: clamp(k * 1.3 - .2), size: 52, bg: C2.yel });
  plate('застрять в буран при −40°C?', W / 2, H / 2 + 130, { k: clamp(k * 1.3 - .35), size: 58, bg: '#fff' }); }

// ---------- BEATS ----------
// each: [firstSentence, fn(t, lt, k, lt2) -> camera]; lt = time since beat start; k = progress over beat
const BEATS = [];
const B = (a, fn) => BEATS.push({ a, fn });
let HUD = null;
// HOOK 0-7
B(0, (t, lt, k, s) => { S.setEnv('nightburan'); carDitch({ lights: true, beams: true, snow: .5, bury: .45, hazard: true, t }); S.aimSun(X + 6, 0, -20, 10);
  const c = cw(0, .6, 0); S.weather(t, c.x - 3, 0, c.z + 4, 1, 1, 14); S.pozemka(t, c.x - 3, c.z + 4, 1, .7);
  if (s < 2) return { pos: V(X + 1.5, 2.6 - lt * .05, -8 - lt * .3), look: V(X + 6.3, .2, -20), fov: 40 };
  if (s < 4) return { pos: V(X - 6 + lt * .4, 9, -2), look: V(X + 4, 0, -22), fov: 42 };
  if (s < 5) return { pos: cw(1.4, 1.1, 7.5 - lt * .15), look: cw(0, .6, 0), fov: 40 };
  if (s < 7) { inCar(POSES.phone, { brow: -.7, look: [.2, -.5] }, t); handPhone.visible = true; handPhone.userData.draw('nosig', { bat: 50 }); 
    return icam('face', .1 + lt * .02); }
  return { pos: V(X + 12, 5, 6), look: V(X + 6, .5, -20), fov: 36 }; });
// STUDIO question 8-11
B(8, (t, lt, k, s) => { studio(t, s < 9 ? POSES.think : POSES.worried, { brow: -.5, raise: .4 }); return camLerp(camStudio.med(), camStudio.close(), ss(0, 1, k)); });
// STUDIO intro 12-16
B(12, (t, lt, k, s) => { studio(t, s >= 15 ? POSES.open : talkPose(t), { smile: s >= 15 ? .8 : .3 }); return s < 14 ? camStudio.med() : camLerp(camStudio.wide(), camStudio.med(), ss(0, 1, lt / 3)); });
// DEPARTURE 17-23 (dusk, Astana behind)
B(17, (t, lt, k, s) => { S.setEnv('dusk'); const z = 60 - lt * 9; carRoad(z, { lights: true, spin: t * 8, fuel: .5 }); S.aimSun(X + 1.8, 0, z, 12); HUD = ['18:00', '−22°C'];
  S.pozemka(t, X + 2, z, .25, .12);
  if (s < 19) return { pos: V(X + 9, 3, z - 16), look: V(X + 1.8, 2, z + 30), fov: 38 };
  if (s < 21) { inCar(POSES.wheel, { smile: .5, look: [0, 0] }, t); return icam('side'); }
  if (s < 22) { inCar(POSES.wheel, { smile: .7, mouth: .3 }, t); return icam('face'); }
  return { pos: V(X - 2, 2.2, z - 9), look: V(X + 4, 2, -40), fov: 36 }; });
// cruise 24-26
B(24, (t, lt, k, s) => { S.setEnv('dusk'); const z = -100 - lt * 9; carRoad(z, { lights: true, spin: t * 8 }); S.aimSun(X + 1.8, 0, z, 12); HUD = ['18:30', '−25°C'];
  S.pozemka(t, X + 2, z, .5, .15); S.weather(t, X + 2, 0, z, .1, .3);
  if (s < 25) return { pos: V(X + 5, 1.2, z + 8), look: V(X + 1.8, .8, z), fov: 40 };
  inCar(POSES.wheel, { smile: .6 }, t); return icam(s < 26 ? 'face' : 'wind'); });
// rising 27-32
B(27, (t, lt, k, s) => { S.setEnv(s < 30 ? 'buran' : 'buran', { fog: ['#d3dee8', 2, lerp(60, 14, k)] }); const z = -300 - lt * 6; carRoad(z, { lights: true, spin: t * 6 }); S.aimSun(X + 1.8, 0, z, 12); HUD = ['19:00', '−32°C'];
  const hgt = [.15, .3, .7, 1.4, 2.2, 3][Math.min(5, s - 27)]; S.pozemka(t, X + 2, z, 1, hgt); S.weather(t, X + 2, 0, z, lerp(.2, 1, k), lerp(.4, 1, k));
  if (s < 30) return { pos: V(X + 3.8, .5, z + 4.5), look: V(X + 1.8, .4, z), fov: 42 };
  inCar(POSES.wheel, { brow: -.6, look: [0, .2] }, t); return icam('wind', 0); });
// what is buran 33-37 (info)
B(33, (t, lt, k, s) => { info(t); HUD = null;
  winds.forEach((w, i) => { w.visible = s >= 34; w.rotation.set(0, 0, -Math.PI / 2); w.position.set(-6 + ((t * 3 + i * 1.7) % 4) , .7 + (i % 4) * .5, -1 + (i % 3) * .8); });
  const c = props.dio; c.visible = true; c.position.set(0, .5, 0); c.scale.setScalar(1.4); S.weather(t, IX, 0, 0, s >= 35 ? .6 : 0, 1, 7);
  if (s >= 35 && s < 36) plateQ.push(['20–30 м/с', W * .72, 260, lt]);
  if (s >= 36) plateQ.push(['НИ ЛЕСА · НИ ГОР · НИ ДОМОВ', W / 2, 220, T0(36)]);
  return { pos: IV(0, 2.4, 6 - k * 1.2), look: IV(0, .9, 0), fov: 34 }; });
// visibility & crash 38-44
B(38, (t, lt, k, s) => { S.setEnv('nightburan'); HUD = ['19:20', '−38°C']; S.aimSun(X + 4, 0, -20, 12);
  if (s < 40) { const z = -10 + 20 - lt * 3; carRoad(z, { lights: true, beams: true, spin: t * 3 }); S.weather(t, X + 2, 0, z, 1, 1, 12); S.pozemka(t, X + 2, z, 1, 1.5);
    if (s < 39) { inCar(POSES.wheel, { brow: -.8, look: [0, .3] }, t); return icam('wind'); } inCar(POSES.wheel, { brow: -.9, mouth: .2 }, t); return icam('hands'); }
  if (s < 41) { const lt2 = t - T0(40); S.truck.position.set(1.8, 0, 2 + 12); S.truck.userData.brake.forEach(b => b.visible = true); const z = 4 - lt2 * 1.5; carRoad(z, { lights: true, beams: true });
    S.car.position.x = 1.8 + ss(.3, 1.5, lt2) * 1.5; S.car.rotation.y = ss(.3, 1.2, lt2) * -.3; S.weather(t, X + 2, 0, z, 1, 1, 12); S.pozemka(t, X + 2, z, 1, 1.2); return { pos: V(X + 1.2, 1.9, z - 6), look: V(X + 2, 1.2, z + 8), fov: 44 }; }
  if (s < 42) { const lt2 = t - T0(41), kk = ss(0, 2.2, lt2); S.car.position.set(lerp(3.5, ditch.pos[0], kk), lerp(0, ditch.pos[1], kk), lerp(-17, ditch.pos[2], kk)); S.car.rotation.set(ditch.rot[0] * kk, lerp(-.3, ditch.rot[1], kk), ditch.rot[2] * kk);
    S.car.userData.set({ lights: true, beams: true, spin: t * 2 }); S.weather(t, X + 4, 0, -18, 1, 1, 12); S.pozemka(t, X + 4, -18, 1, .9); return { pos: V(X - 1.5, 3.2, -12), look: V(X + 5, .2, -19), fov: 40 }; }
  carDitch({ lights: true, beams: true, spin: s < 44 ? t * 9 : 0, snow: .1 }); S.weather(t, X + 4, 0, -18, 1, 1, 12); S.pozemka(t, X + 4, -18, 1, .9);
  if (s < 43) { inCar(POSES.wheel, { brow: -.5, mouth: .3 }, t); return icam('face'); }
  if (s < 44) return { pos: cw(1.6, .35, -1.0), look: cw(.8, .3, -1.35), fov: 40 };
  return { pos: V(X + 2.5, 1.6, -12 - lt * .05), look: V(X + 6.4, .1, -20), fov: 38 }; });
// panic 45-47
B(45, (t, lt, k, s) => { S.setEnv('nightburan'); HUD = ['19:25', '−38°C']; carDitch({ lights: true, beams: true, snow: .1, inside: true, cabin: .4 }); S.weather(t, X + 6, 0, -20, .6, 1, 10);
  inCar(mixPose(POSES.worried, POSES.wheel, .3), { brow: -1, mouth: .5 + .3 * Math.sin(t * 9), raise: .6, look: [Math.sin(t * 5) * .8, 0] }, t); D.position.x += Math.sin(t * 30) * .006;
  props.heart.visible = false; heartBeat = 1; return icam('face', .1 + k * .2); });
let heartBeat = 0;
// first deadly mistake 48-49 (studio)
B(48, (t, lt, k, s) => { studio(t, s < 49 ? POSES.pointUp : talkPose(t), { brow: .6 }); return camLerp(camStudio.close(), camStudio.med(), ss(0, 1, k)); });
// walk away 50-57
B(50, (t, lt, k, s) => { S.setEnv('nightburan'); HUD = ['19:30', '−38°C']; carDitch({ lights: true, beams: false, snow: .2, hazard: true, t }); S.aimSun(X + 6, 0, -20, 14);
  const c = cw(-1.4, 0, -1.0); D.userData.setJacket(true); D.userData.setBeanie(true);
  const wk = clamp((t - T0(50)) / (T0(52) - T0(50))); const dir = V(-1, 0, .6).normalize(); const dist = wk * 8;
  D.position.set(c.x + dir.x * dist, Math.max(-.6, c.y - .1), c.z + dir.z * dist); D.rotation.y = Math.atan2(dir.x, dir.z) + (s >= 51 ? ss(T0(51) + .8, T0(51) + 1.6, t) * Math.PI : 0);
  pose(D, s < 51 || t < T0(51) + .8 ? mixPose(POSES.idle, cycle(t), 1) : mixPose(POSES.worried, cycle(t * .2), .3)); face(D, { brow: -.8, mouth: s >= 54 ? .4 : 0, blink: blinkAt(t) });
  const fogN = s >= 51 ? lerp(10, 2, ss(T0(51), T0(52), t)) : 10; S.setEnv('nightburan', { fog: ['#34445f', .5, s >= 52 ? 4.5 : fogN + 5] });
  S.weather(t, D.position.x, 0, D.position.z, 1, 1, 9); S.pozemka(t, D.position.x, D.position.z, 1, 1.2);
  if (s >= 56) plateQ.push(['50 МЕТРОВ', W / 2, 250, T0(56)]);
  if (s < 52) return { pos: V(D.position.x + 2.5, 1.8, D.position.z + 3.5), look: V(D.position.x, 1.2, D.position.z), fov: 40 };
  return { pos: V(D.position.x - 1.6 * Math.sin(D.rotation.y), 1.75, D.position.z - 1.6 * Math.cos(D.rotation.y)), look: V(D.position.x, 1.5, D.position.z), fov: 44 }; });
// rule 1 58-59
B(58, (t, lt, k, s) => { S.setEnv('nightburan'); carDitch({ lights: true, beams: true, snow: .25, hazard: true, t, cabin: .6 }); S.weather(t, X + 6, 0, -20, .8, 1, 12); S.pozemka(t, X + 6, -20, 1, .8);
  ruleQ = [1, 'МАШИНА — ТВОЙ ДОМ.\nНЕ УХОДИ ОТ НЕЁ!', t - T0(58)]; return { pos: V(X + 1.5 + k, 2.4, -13), look: V(X + 6.4, .4, -20), fov: 38 }; });
// brain fight/flight 60-65
B(60, (t, lt, k, s) => { info(t); HUD = null; const b = props.brain; b.visible = true; b.position.set(0, 1.5 + Math.sin(t * 2) * .05, 0); b.rotation.y = Math.sin(t * .6) * .4;
  if (s >= 62 && s < 64) { for (const [o, x] of [[props.bolt1, -1.1], [props.bolt2, 1.1]]) { o.visible = true; o.position.set(x, 1.6 + Math.sin(t * 9 + x) * .08, .2); o.rotation.z = x * .2; } plateQ.push(['АДРЕНАЛИН', W * .25, 300, T0(62)]); plateQ.push(['КОРТИЗОЛ', W * .75, 300, T0(62) + .3]); }
  if (s >= 64) { b.visible = false; const ch = props.check, cr = props.cross; ch.visible = true; ch.position.set(-1.2, 1.4, 0); cr.visible = s >= 65; cr.position.set(1.2, 1.4, 0);
    plateQ.push(['СИДИТ И ЖДЁТ', W * .3, 760, T0(64)]); if (s >= 65) plateQ.push(['БЕЖИТ', W * .7, 760, T0(65)]); }
  return { pos: IV(0, 1.8, 5.2 - k * .8), look: IV(0, 1.4, 0), fov: 34 }; });
// breathe 66-68
B(66, (t, lt, k, s) => { S.setEnv('night'); HUD = ['19:40', '−39°C']; carDitch({ lights: true, snow: .3, bury: .2, inside: true, cabin: .8 }); S.weather(t, X + 6, 0, -20, .5, 1, 10);
  const br = (Math.sin(t * 1.2) + 1) / 2; inCar(mixPose(POSES.sit, POSES.hug, .2), { blink: s < 68 ? .85 : blinkAt(t), mouth: s === 67 ? .3 : 0 }, t); D.userData.J.torso.scale.setScalar(1 + br * .03);
  if (s === 67) breath(t, cw(.4, 1.2, .2), 1); return icam(s < 68 ? 'face' : 'side', .05 * k); });
// inventory 69-73
B(69, (t, lt, k, s) => { info(t); const items = [['phone', 69, -2.2], ['gauge', 70, -.75], ['cookies', 71, .75], ['jacket', 72, 2.2]];
  for (const [n, si, x] of items) { if (s < si) continue; const o = props[n]; o.position.set(x, n === 'phone' ? 1.2 : n === 'gauge' ? 1.1 : .5, 0); o.rotation.y = Math.sin(t + x) * .15; pop(o, t - T0(si)); }
  props.phone.userData.draw('nosig', { bat: 50 }); props.phone.scale.multiplyScalar(.8); props.gauge.userData.set(.5);
  if (s >= 73) { scene.add(D); D.position.set(IX + 3.4, .5, .6); D.rotation.y = -.5; pose(D, POSES.hug); face(D, { smile: 1, mouth: .4, blink: .6 }); }
  return { pos: IV(0, 2.3, 6.4), look: IV(0, 1.0, 0), fov: 36 }; });
// 112 + SMS 74-79
B(74, (t, lt, k, s) => { info(t); const ph = props.phone; ph.visible = true; ph.position.set(0, 1.6, 0); ph.rotation.set(0, Math.sin(t * .7) * .1, 0); ph.scale.setScalar(1.25);
  if (s < 76) ph.userData.draw('call', { k: t, bat: 50, nosig: true });
  else ph.userData.draw('sms', { text: 'Трасса Астана–Караганда, ~120 км. Застрял в кювете, живой.', k: s < 77 ? 0 : ss(T0(77), T1(79), t), sent: s >= 79 ? 'wait' : null, bat: 48, nosig: true });
  if (s >= 75 && s < 76) plateQ.push(['ЛЮБОЙ ОПЕРАТОР', W * .74, 420, T0(75)]);
  return { pos: IV(.3, 1.7, 3.2 - k * .4), look: IV(0, 1.6, 0), fov: 34 }; });
// warm 80-81
B(80, (t, lt, k, s) => { S.setEnv('night'); HUD = ['20:00', '−40°C']; carDitch({ lights: true, snow: .35, bury: .25, inside: true, cabin: 1, fuel: .48 }); S.weather(t, X + 6, 0, -20, .5, 1, 10);
  inCar(POSES.sit, { smile: .5, blink: s >= 81 ? .7 : blinkAt(t) }, t); return icam(s < 81 ? 'dash' : 'face'); });
// NO 82-84
B(82, (t, lt, k, s) => { studio(t, s === 82 ? POSES.pointUp : POSES.talk, { brow: .8 }); return s === 82 ? camStudio.close() : camLerp(camStudio.close(), camStudio.left(), ss(0, 1, k)); });
// CO cutaway 85-94
B(85, (t, lt, k, s) => { info(t); HUD = ['22:00', '−40°C']; cut.visible = true; cut.position.set(0, 0, 0); cut.rotation.y = .6;
  const bury = clamp(ss(T0(85), T1(86), t) * .85); cut.userData.set({ cut: true, snow: .6, bury: 0, lights: true, inside: true });
  cut.add(D); D.position.set(.4, .33, -.02); D.scale.setScalar(.62); D.rotation.set(0, 0, 0); D.userData.setJacket(true);
  const sleepy = ss(T0(91), T0(93), t); pose(D, mixPose(POSES.sit, { ...POSES.sit, head: [.5, 0, .3], torso: [.15, 0, 0] }, sleepy)); face(D, { blink: lerp(blinkAt(t), 1, sleepy), mouth: s === 91 ? .9 * ss(0, .5, Math.sin((t - T0(91)) * 2)) : 0 });
  // snow drift build-up (use car mound in inside mode -> shell around lower body)
  const P = cut.userData.P; P.mound.visible = bury > .05; P.mound.scale.set(1.3 + bury * .3, .15 + bury * .65, 2.6); P.drift.visible = false;
  if (s >= 87) { INFO.updateMatrixWorld(true); const pipe = cut.localToWorld(V(-.5, .25, -2.4)).sub(INFO.position); const cab = cut.localToWorld(V(0, 1.0, -.3)).sub(INFO.position); gasFlow(t, pipe, cab, 26, .25); }
  if (s >= 89 && s < 91) plateQ.push(['НЕТ ЦВЕТА · НЕТ ЗАПАХА', W / 2, 220, T0(89)]);
  if (s >= 93) look.vignette = lerp(.18, 1.4, ss(T0(93), T1(94), t));
  if (s >= 87 && s < 91) return { pos: IV(-4.2, 2.0, 2.0), look: IV(0, .7, -.4), fov: 38 };
  if (s >= 91) { scene.updateMatrixWorld(true); const hd = cut.localToWorld(V(.4, 1.15, -.05)); return { pos: hd.clone().add(V(-1.5, .25, .8)), look: hd, fov: 32 }; }
  return { pos: IV(-5.5, 3.0, 4.5 - k * .5), look: IV(0, .6, 0), fov: 36 }; });
// hemoglobin 95-96
B(95, (t, lt, k, s) => { info(t); look.vignette = .18; const h = props.hemo; h.visible = true; h.position.set(0, 1.5, 0); h.rotation.y = Math.sin(t * .5) * .3;
  const socks = h.userData.sockets; INFO.updateMatrixWorld(true);
  socks.forEach((so, i) => { const target = h.localToWorld(so.position.clone()).sub(INFO.position); const isCO = s >= 96 || i % 2 === 0; const mol = (isCO ? COs : O2s)[i], other = (isCO ? O2s : COs)[i];
    other.visible = s < 96 && !isCO ? false : false; const ka = ss(0, 1.2, lt - i * .3); mol.visible = true; mol.position.lerpVectors(V((i % 2 ? 1 : -1) * 3, 1.5 + (i - 1.5) * .6, .8), target.add(V(0, 0, .15)), ka); });
  O2s.forEach((o, i) => { if (s < 96 && i % 2) { o.visible = true; const kk = ((t * .3 + i * .2) % 1); o.position.set(lerp(2.6, 1.1, kk), 1.5 + (i - 1.5) * .5, .9); } });
  plateQ.push(['× 200', W * .78, 300, T0(95) + 1]); if (s >= 96) plateQ.push(['МОЗГ БЕЗ КИСЛОРОДА', W / 2, 220, T0(96)]);
  return { pos: IV(0, 1.7, 4.2), look: IV(0, 1.5, 0), fov: 34 }; });
// rule 2 dig pipe 97-98
B(97, (t, lt, k, s) => { S.setEnv('nightburan'); HUD = ['23:00', '−40°C']; carDitch({ lights: true, snow: .5, bury: .35, hazard: true, t }); S.aimSun(X + 6, 0, -20, 10);
  const back = cw(-.9, 0, -2.6); D.userData.setJacket(true); D.userData.setBeanie(true); D.position.set(back.x, back.y - .25, back.z); D.rotation.y = S.car.rotation.y + Math.PI * .1;
  const dig = (Math.sin(t * 5) + 1) / 2; pose(D, mixPose(POSES.dig, { ...POSES.dig, armR: [-.5, 0, -.1], torso: [.7, 0, 0] }, dig)); face(D, { brow: -.4, blink: blinkAt(t) });
  S.weather(t, back.x, 0, back.z, .8, 1, 9); S.pozemka(t, back.x, back.z, 1, .8);
  ruleQ = [2, 'КАЖДЫЙ ЧАС ОТКАПЫВАЙ\nВЫХЛОПНУЮ ТРУБУ', t - T0(97)]; return { pos: cw(-3.2, 1.6, -4.6), look: cw(-.6, .5, -2.4), fov: 40 }; });
// rule 3 engine 99-105
B(99, (t, lt, k, s) => { S.setEnv('night'); HUD = ['00:00', '−40°C']; carDitch({ lights: false, snow: .5, bury: .4, inside: true, cabin: .9, fuel: lerp(.5, .45, k), temp: -40 }); S.weather(t, X + 6, 0, -20, .5, 1, 10);
  inCar(POSES.wheel, { brow: .2, mouth: mouthAt(t) * .0, blink: blinkAt(t) }, t);
  ruleQ = [3, 'МОТОР: 10–15 МИНУТ В ЧАС\n+ ПРИОТКРОЙ ОКНО', t - T0(99)];
  if (s >= 100 && s < 102) { const c = props.clock; info; plateQ.push(['15 мин / 1 час', W * .76, 520, T0(100)]); }
  if (s >= 103) plateQ.push(['ПОЛБАКА = НЕСКОЛЬКО СУТОК', W / 2, 520, T0(103)]);
  if (s >= 104) plateQ.push(['ВРЕМЯ = ВАЛЮТА', W / 2, 640, T0(104)]);
  return icam(s < 101 ? 'dash' : s < 103 ? 'side' : 'face'); });
// cold 106-109
B(106, (t, lt, k, s) => { S.setEnv('night', { tint: [.8, .88, 1.08] }); HUD = ['02:00', '−40°C']; carDitch({ lights: false, snow: .55, bury: .45, inside: true, cabin: .9, fuel: .44, temp: -12 }); S.weather(t, X + 6, 0, -20, .4, 1, 10);
  inCar(POSES.hug, { brow: -.6, blink: blinkAt(t) }, t); breath(t, cw(.4, 1.2, .15), 1); if (s >= 108) plateQ.push(['В САЛОНЕ −5°C', W * .72, 300, T0(108)]); return icam(s < 108 ? 'wide' : 'face'); });
// body x-ray 110-114
B(110, (t, lt, k, s) => { info(t); HUD = null; const b = props.body; b.visible = true; b.position.set(0, .5, 0); b.rotation.y = Math.sin(t * .4) * .3; b.userData.setTemp(s < 112 ? 0 : ss(T0(112), T1(113), t));
  if (s >= 111) plateQ.push(['МОЗГ · СЕРДЦЕ · ОРГАНЫ', W / 2, 200, T0(111)]); if (s >= 113) plateQ.push(['ПАЛЬЦЫ МЁРЗНУТ ПЕРВЫМИ', W / 2, 900, T0(113)]);
  return { pos: IV(0, 1.9, 5.2 - k), look: IV(0, 1.6, 0), fov: 34 }; });
// shiver 115-118
B(115, (t, lt, k, s) => { S.setEnv('night'); HUD = ['03:00', '−40°C']; carDitch({ lights: false, snow: .6, bury: .5, inside: true, cabin: .9, fuel: .43 }); S.weather(t, X + 6, 0, -20, .4, 1, 10);
  inCar(POSES.hug, { brow: -.8, mouth: .2, blink: blinkAt(t) }, t); D.position.x += Math.sin(t * 40) * .008; D.position.y += Math.sin(t * 33) * .005; breath(t, cw(.4, 1.2, .15), 1);
  if (s >= 116) plateQ.push(['ДРОЖЬ = ВНУТРЕННЯЯ ПЕЧКА', W / 2, 220, T0(116)]); return icam(s < 117 ? 'face' : 'side'); });
// hypothermia 119-124
B(119, (t, lt, k, s) => { if (s < 122) { info(t); const th = props.thermo; th.visible = true; th.position.set(0, .5, 0); th.userData.set(lerp(.95, .55, ss(T0(119), T1(120), t)));
    plateQ.push([s >= 120 ? '< 32°C' : '37°C', W * .7, 420, s >= 120 ? T0(120) : T0(119)]); if (s >= 121) plateQ.push(['СОНЛИВОСТЬ · БЕЗРАЗЛИЧИЕ', W / 2, 220, T0(121)]); return { pos: IV(.5, 1.4, 3.8), look: IV(0, 1.3, 0), fov: 34 }; }
  studio(t, s < 124 ? POSES.worried : POSES.shrug, { brow: -.8, raise: .8, mouth: mouthAt(t) }); return camLerp(camStudio.med(), camStudio.close(), ss(T0(122), T1(124), t)); });
// what to do 125-131
B(125, (t, lt, k, s) => { info(t); const it = [['jacket', 126, -2.4], ['beanie', 127, -.8], ['bag', 128, .8], ['cross', 131, 2.4]];
  for (const [n, si, x] of it) { if (s < si) continue; const o = props[n]; o.position.set(x, n === 'cross' ? 1.3 : .5, 0); o.rotation.y = Math.sin(t + x) * .2; pop(o, t - T0(si)); if (n === 'cross') o.scale.multiplyScalar(.6); }
  if (s >= 125 && s < 126) plateQ.push(['ЧТО ДЕЛАТЬ?', W / 2, 260, T0(125)]); if (s >= 130) plateQ.push(['НЕ ДО ПОТА!', W * .75, 280, T0(130)]);
  return { pos: IV(0, 2.4, 6.6), look: IV(0, .9, 0), fov: 36 }; });
// alarm 132-133
B(132, (t, lt, k, s) => { info(t); const c = props.clock; c.visible = true; c.position.set(0, 1.4 + Math.abs(Math.sin(t * 20)) * .04, 0); c.rotation.z = Math.sin(t * 30) * .06; c.userData.hands[1].rotation.z = -t * 2; c.userData.hands[0].rotation.z = -t * .2;
  plateQ.push(['СПАТЬ НЕ БОЛЬШЕ ЧАСА', W / 2, 230, T0(132)]); return { pos: IV(0, 1.6, 3.3), look: IV(0, 1.4, 0), fov: 34 }; });
// morning 1 134-137
B(134, (t, lt, k, s) => { S.setEnv('buran'); HUD = ['1-Й ДЕНЬ', '−36°C']; carDitch({ lights: false, snow: .9, bury: .75 }); S.aimSun(X + 6, 0, -20, 12); S.weather(t, X + 4, 0, -18, .8, .9, 14); S.pozemka(t, X + 4, -18, 1, .9);
  return { pos: V(X - 2 + k * 2, 3.5, -8), look: V(X + 6.4, .3, -20), fov: 38 }; });
// cookies 138-145
B(138, (t, lt, k, s) => { info(t); const c = props.cookies; c.visible = true; c.position.set(0, .55, 0); c.rotation.y = .3; const pcs = c.userData.pieces;
  const split = ss(T0(143), T0(143) + 1, t); pcs.forEach((p, i) => { p.visible = s >= 142; const a = i / 6 * Math.PI * 2; p.position.set(Math.cos(a) * split * .9, .3 + split * .1, Math.sin(a) * split * .6); p.rotation.x = split * .3; });
  if (s >= 141 && s < 142) { scene.add(D); D.position.set(IX + 2.2, .5, .4); D.rotation.y = -.7; pose(D, POSES.point); face(D, { smile: .9, mouth: .7 }); }
  if (s >= 142 && s < 143) props.cross.visible = true, props.cross.position.set(0, 1.3, .5), props.cross.scale.setScalar(.5);
  if (s >= 144) plateQ.push(['ЕДА = ТОПЛИВО', W / 2, 230, T0(144)]);
  return { pos: IV(0, 2.2, 3.4), look: IV(0, .6, 0), fov: 36 }; });
// thirsty 146-149 studio
B(146, (t, lt, k, s) => { studio(t, s === 147 ? POSES.shrug : talkPose(t, 'think', 'talk'), { brow: s === 149 ? -.5 : .1, raise: .6 }); return camLerp(camStudio.med(), camStudio.left(), ss(0, 1, k)); });
// snow energy + bottle 150-154
B(150, (t, lt, k, s) => { info(t); if (s < 153) { const b = props.body; b.visible = true; b.position.set(-.8, .5, 0); b.userData.setTemp(s >= 151 ? ss(T0(151), T1(151), t) * .7 : 0);
    if (s >= 152) plateQ.push(['ГОРСТЬ СНЕГА = ПАРА ГЛОТКОВ', W / 2, 220, T0(152)]); else plateQ.push(['−ЭНЕРГИЯ', W * .7, 360, T0(150) + 1]);
    return { pos: IV(-.4, 1.8, 4.6), look: IV(-.4, 1.4, 0), fov: 34 }; }
  const bt = props.bottle; bt.visible = true; bt.position.set(0, .5, 0); bt.userData.set(ss(T0(153) + 1, T1(154), t)); bt.scale.setScalar(1.6);
  plateQ.push(['СНЕГ → БУТЫЛКА → ПОД КУРТКУ', W / 2, 220, T0(153)]); return { pos: IV(0, 1.6, 3.4), look: IV(0, 1.1, 0), fov: 34 }; });
// loneliness 155-157
B(155, (t, lt, k, s) => { S.setEnv('buran', { expo: .92 }); HUD = ['1-Й ДЕНЬ', '−35°C']; carDitch({ lights: false, snow: .9, bury: .75, inside: true, cabin: .3, fuel: .38 }); S.weather(t, X + 6, 0, -20, .3, .6, 10);
  inCar(POSES.hug, { brow: -.7, blink: blinkAt(t), look: [-.5, -.3] }, t); return icam('wide', k * .1); });
// structure 158-164
B(158, (t, lt, k, s) => { S.setEnv('buran'); carDitch({ lights: false, snow: .9, bury: .75, inside: true, cabin: .4, fuel: .37 }); inCar(POSES.phone, { brow: .2, look: [0, -.6], blink: blinkAt(t) }, t);
  handPhone.visible = true; const items = [['Проверить трубу', s >= 159], ['Прогреть машину', s >= 160], ['Заметка', s >= 161]];
  handPhone.userData.draw('notes', { items, bat: 40, nosig: true }); 
  if (s >= 159) plateQ.push(['✓ ТРУБА', W * .2, 320, T0(159)]); if (s >= 160) plateQ.push(['✓ ПРОГРЕВ', W * .2, 440, T0(160)]); if (s >= 161) plateQ.push(['✓ ЗАМЕТКА', W * .2, 560, T0(161)]);
  if (s >= 164) plateQ.push(['ПОЛЯРНИКИ · СПАСАТЕЛИ · КОСМОНАВТЫ', W / 2, 220, T0(164)]);
  return icam(s < 162 ? 'hands' : 'face'); });
// truck passes 165-169
B(165, (t, lt, k, s) => { S.setEnv('day', { fog: ['#e3eaf1', 20, 220] }); HUD = ['1-Й ДЕНЬ', '−30°C']; carDitch({ lights: false, snow: 1, bury: .8 }); S.aimSun(X + 6, 0, -20, 14);
  const tz = 60 - (t - T0(165)) * 8; S.truck.position.set(-1.8, 0, tz); S.truck.rotation.y = Math.PI; S.truck.userData.brake.forEach(b => b.visible = false);
  const dp = cw(-1.4, 0, .2); D.userData.setJacket(true); D.userData.setBeanie(true); D.position.set(dp.x, dp.y - .1, dp.z); D.rotation.y = -Math.PI / 2;
  if (s >= 168) { pose(D, mixPose(POSES.wave, { ...POSES.wave, armR: [-.2, 0, -2.9] }, (Math.sin(t * 9) + 1) / 2)); face(D, { mouth: .8, brow: -.4 }); } else { pose(D, POSES.idle); face(D, { look: [-1, 0] }); }
  S.pozemka(t, X + 4, -20, .3, .2);
  if (s >= 169) return { pos: V(X - 40, 3, -12), look: V(X + 6, .3, -20), fov: 22 };
  return { pos: V(X + 12, 2.0, -26), look: V(X + 2, 1.2, -18), fov: 40 }; });
// rule 4 visible 170-175
B(170, (t, lt, k, s) => { const night = s >= 172; S.setEnv(night ? 'night' : 'day', night ? {} : { fog: ['#e3eaf1', 20, 220] }); HUD = [night ? '2-Я НОЧЬ' : '1-Й ДЕНЬ', '−33°C']; S.aimSun(X + 6, 0, -20, 12);
  carDitch({ lights: false, snow: 1, bury: .8, scarf: true, t, hazard: night && (t % 6 < 3) });
  ruleQ = [4, 'СДЕЛАЙ СЕБЯ ЗАМЕТНЫМ', t - T0(170)];
  if (s >= 174) { const pat = '··· — — — ···'; plateQ.push([pat, W / 2, 560, T0(174)]); plateQ.push(['SOS', W / 2, 680, T0(174) + .4]); }
  if (s < 172) return { pos: cw(1.6, 2.2, -1.4), look: cw(.3, 1.9, -.7), fov: 40 };
  return { pos: V(X + 1, 2.2, -11 - k), look: V(X + 6.4, .3, -20), fov: 38 }; });
// second night 176-182
B(176, (t, lt, k, s) => { S.setEnv('night', { tint: [.6, .72, 1.12] }); HUD = ['2-Я НОЧЬ', '−40°C']; carDitch({ lights: false, snow: 1, bury: .85, inside: true, cabin: .6, fuel: .25 }); S.weather(t, X + 6, 0, -20, .4, .8, 10);
  inCar(POSES.hug, { brow: -1, blink: blinkAt(t), look: [-.3, -.4] }, t); breath(t, cw(.4, 1.2, .15), .8);
  if (s >= 179) plateQ.push(['БЕНЗИН ¼', W * .74, 320, T0(179)]); if (s >= 180) plateQ.push(['ПЕЧЕНЬЕ 0', W * .74, 440, T0(180)]); if (s >= 181) plateQ.push(['ТЕЛЕФОН 12%', W * .74, 560, T0(181)]);
  return icam(s < 179 ? 'wide' : 'face', k * .1); });
// meaning 183-190
B(183, (t, lt, k, s) => { S.setEnv('night', { tint: [.7, .78, 1.08] }); carDitch({ lights: false, snow: 1, bury: .85, inside: true, cabin: .35, fuel: .24 }); inCar(POSES.phone, { brow: -.3, smile: s >= 186 ? .4 : 0, look: [0, -.6], blink: blinkAt(t) }, t);
  handPhone.visible = true; const who = s < 186 ? [] : [{ bg: '#f2d8b8', who: 'mom' }, { bg: '#cfe3f3', who: 'girl' }, { bg: '#f8e2a8', who: 'kid,kid' }, { bg: '#d3ecd5', who: 'friend' }].slice(0, Math.min(4, s - 185));
  handPhone.userData.draw('photos', { photos: who, bat: 12, nosig: true }); 
  if (s >= 186 && s < 190) return icam('hands', .25);
  if (s >= 190) plateQ.push(['ЕСТЬ «ЗАЧЕМ» → НАЙДЁШЬ «КАК»', W / 2, 220, T0(190)]);
  return icam('face'); });
// humor 191-195
B(191, (t, lt, k, s) => { S.setEnv('night', { tint: [.75, .8, 1.05] }); carDitch({ lights: false, snow: 1, bury: .85, inside: true, cabin: .45, fuel: .24 });
  const laugh = s >= 193; inCar(laugh ? POSES.hug : POSES.sit, { smile: laugh ? 1 : .3, mouth: laugh ? .6 + .3 * Math.sin(t * 14) : 0, blink: laugh ? .7 : blinkAt(t) }, t); if (laugh) D.position.y += Math.abs(Math.sin(t * 14)) * .01;
  if (s >= 195) plateQ.push(['СМЕХ ↓ СТРЕСС', W * .74, 300, T0(195)]); return icam(s < 193 ? 'side' : 'face'); });
// morning 3 196-203
B(196, (t, lt, k, s) => { S.setEnv('morning'); HUD = ['3-Й ДЕНЬ', '−28°C']; carDitch({ lights: false, snow: 1, bury: .85 }); S.aimSun(X + 6, 0, -20, 14, [-10, 9, 8]);
  if (s < 199) { inCar(POSES.sit, { blink: s < 198 ? .3 : 0, look: [.6, .2] }, t); return icam('side'); }
  if (s < 201) return { pos: V(X - 3, 4 + k, -6), look: V(X + 6, .4, -20), fov: 42 };
  const dp = cw(-1.4, .4, .3); D.userData.setJacket(true); D.userData.setBeanie(true); D.position.set(dp.x, dp.y - .2, dp.z); D.rotation.y = -Math.PI / 2 - .4; pose(D, { ...POSES.idle, armR: [-2.2, 0, -.6], elbowR: [-1.6, 0, 0], head: [-.15, 0, 0] }); face(D, { blink: .75, brow: -.6, mouth: .2 });
  if (s >= 203) plateQ.push(['СНЕЖНАЯ СЛЕПОТА: ЩУРЬСЯ', W / 2, 220, T0(203)]);
  return { pos: V(dp.x - 2.8, 1.8, dp.z + 1.6), look: V(dp.x, 1.5, dp.z), fov: 34 }; });
// rescue 204-209
B(204, (t, lt, k, s) => { S.setEnv('morning'); HUD = ['3-Й ДЕНЬ', '−27°C']; carDitch({ lights: false, snow: 1, bury: .85 }); S.aimSun(X + 2, 0, -20, 18, [-10, 9, 8]);
  const z = lerp(60, -14, ss(T0(204), T0(208), t)); S.plow.visible = true; S.plow.position.set(1.8, 0, z); S.plow.rotation.y = Math.PI; S.plow.userData.beacon.rotation.y = t * 8; S.plow.userData.beacon.visible = Math.floor(t * 4) % 2 === 0;
  S.rescue.visible = true; S.rescue.position.set(-1.6, 0, z + 12); S.rescue.rotation.y = Math.PI; S.rescue.userData.bar.forEach((b, i) => b.visible = (Math.floor(t * 5) + i) % 2 === 0);
  const dp = cw(-1.4, .4, .3); D.userData.setJacket(true); D.userData.setBeanie(true); D.position.set(dp.x, dp.y - .2, dp.z); D.rotation.y = -Math.PI / 2; pose(D, mixPose(POSES.wave, { ...POSES.wave, armR: [-.2, 0, -2.9] }, (Math.sin(t * 9) + 1) / 2)); face(D, { smile: .9, mouth: .6 });
  if (s >= 207 && s < 208) { info(t); props.phone.visible = true; props.phone.position.set(0, 1.6, 0); props.phone.scale.setScalar(1.2); props.phone.userData.draw('sms', { text: 'Трасса Астана–Караганда, ~120 км. Застрял в кювете, живой.', k: 1, sent: 'ok', bat: 51 }); return { pos: IV(.3, 1.7, 3), look: IV(0, 1.6, 0), fov: 34 }; }
  if (s < 206) return { pos: V(X - 3, 2.5, -24), look: V(X + 1.8, 1.5, z), fov: 40 };
  return { pos: V(X + 10, 3, -30), look: V(X + 3, 1, -16), fov: 40 }; });
// survived 210-212
B(210, (t, lt, k, s) => { S.setEnv('morning'); HUD = null; carDitch({ lights: false, snow: 1, bury: .85 }); S.aimSun(X + 3, 0, -18, 14, [-10, 9, 8]);
  S.rescue.visible = true; S.rescue.position.set(1.6, 0, -16); S.rescue.rotation.y = Math.PI * .9; S.rescue.userData.bar.forEach((b, i) => b.visible = (Math.floor(t * 5) + i) % 2 === 0);
  const dp = V(X + 3.5, 0, -18.5); D.userData.setJacket(true); D.userData.setBeanie(true); D.position.copy(dp); D.rotation.y = .5; pose(D, s >= 212 ? POSES.open : POSES.idle); face(D, { smile: 1, mouth: s >= 211 ? mouthAt(t) : 0 });
  plateQ.push(['ТЫ ВЫЖИЛ!', W / 2, 230, T0(210)]);
  return { pos: V(dp.x + 2.4 - k, 1.6, dp.z + 3.2), look: V(dp.x, 1.4, dp.z), fov: 36 }; });
// 5 rules summary 213-227
const RULES = [[215, 'НЕ УХОДИ ОТ МАШИНЫ'], [218, 'ОТКАПЫВАЙ ТРУБУ КАЖДЫЙ ЧАС'], [221, 'МОТОР 10–15 МИН/ЧАС + ОКНО'], [223, 'СДЕЛАЙ СЕБЯ ЗАМЕТНЫМ'], [225, '112 ИЛИ SMS С МЕСТОМ']];
B(213, (t, lt, k, s) => { studio(t, talkPose(t), { smile: .3 }); D.position.x = -1.6; summary = t; return { pos: V(.4, 1.7, 5.4), look: V(.4, 1.5, 0), fov: 34 }; });
let summary = -1;
// trunk kit 228-231
B(228, (t, lt, k, s) => { info(t); summary = -1; const it = [['jacket', 230, -2.6], ['water', 230.2, -1.3], ['can', 230.4, 0], ['shovel', 230.6, 1.3], ['pbank', 230.8, 2.6]];
  if (s >= 230) for (const [n, si, x] of it) { const o = props[n]; o.position.set(x, n === 'shovel' ? .9 : .5, 0); o.rotation.y = Math.sin(t + x) * .2; pop(o, t - T0(230) - (si - 230) * 2); }
  if (s >= 229 && s < 230) plateQ.push(['ПРОГНОЗ · ТРАССА ЗАКРЫТА = НЕ ЕДЬ', W / 2, 230, T0(229)]);
  if (s < 230) { studio(t, POSES.pointUp, { brow: .5 }); return camStudio.med(); }
  if (s >= 231) plateQ.push(['ДЕШЕВЛЕ, ЧЕМ ЖИЗНЬ', W / 2, 230, T0(231)]);
  return { pos: IV(0, 2.3, 6.8), look: IV(0, .9, 0), fov: 36 }; });
// question 232-235
B(232, (t, lt, k, s) => { studio(t, s < 234 ? POSES.shrug : POSES.point, { raise: .6, smile: .4 }); if (s >= 234) plateQ.push(['ПИШИ В КОММЕНТАРИЯХ 👇', W / 2, 230, T0(234)]); return camLerp(camStudio.med(), camStudio.close(), ss(0, 1, k)); });
// CTA 236-241
B(236, (t, lt, k, s) => { studio(t, s >= 240 ? mixPose(POSES.wave, { ...POSES.wave, armR: [-.2, 0, -2.9] }, (Math.sin(t * 8) + 1) / 2) : talkPose(t), { smile: .8 });
  S.studioTV.visible = s < 238; if (s < 238) drawTV('30 ДНЕЙ\nБЕЗ ТЕЛЕФОНА?');
  if (s >= 238 && s < 240) plateQ.push(['ПОДПИШИСЬ 🔔', W / 2, 230, T0(238)]);
  return s < 238 ? { pos: V(1.6, 1.9, 5.6), look: V(1.6, 2.2, -1), fov: 36 } : camLerp(camStudio.med(), camStudio.wide(), ss(T0(240), DUR, t)); });
function drawTV(txt) { S.retexTV ? 0 : 0; const g = S.tvTex.userData.g, cv = S.tvTex.userData.cv; g.fillStyle = '#16202d'; g.fillRect(0, 0, cv.width, cv.height); g.fillStyle = '#ffd33d'; g.font = '900 120px InterX'; g.textAlign = 'center';
  txt.split('\n').forEach((l, i) => g.fillText(l, cv.width / 2, 300 + i * 150)); g.font = '900 60px InterX'; g.fillStyle = '#43b8e3'; g.fillText('СЛЕДУЮЩЕЕ ВИДЕО', cv.width / 2, 140); g.textAlign = 'left'; S.tvTex.needsUpdate = true; }

let plateQ = [], ruleQ = null;
BEATS.forEach((b, i) => { b.t0 = i === 0 ? 0 : T0(b.a) - .12; });
BEATS.forEach((b, i) => { b.t1 = i < BEATS.length - 1 ? BEATS[i + 1].t0 : DUR; });
function sIdx(t) { let r = 0; for (const s of SEN) if (t >= s.t0 + PRE - .12) r = s.i; return r; }

export function renderFrame(f) {
  const t = f / FPS; resetAll(); plateQ = []; ruleQ = null; HUD = null; heartBeat = 0;
  const b = BEATS.find(b => t >= b.t0 && t < b.t1) || BEATS[BEATS.length - 1];
  const lt = t - b.t0, k = clamp(lt / (b.t1 - b.t0)), s = sIdx(t);
  const cam = b.fn(t, lt, k, s);
  camera.position.copy(cam.pos); camera.fov = cam.fov; camera.lookAt(cam.look); camera.updateProjectionMatrix();
  draw(scene, { t: f });
  // overlay
  og.clearRect(0, 0, W, H);
  if (HUD) hud(t, HUD[0], HUD[1]);
  if (s <= 7) { if (s >= 0) plate('−40°C', W * .2, 300, { k: ss(T0(0), T0(0) + .4, t), size: 110, bg: '#7cc4ff', rot: -4 }); if (s >= 6) plate('БЕНЗИН ½', W * .78, 300, { k: ss(T0(6), T0(6) + .4, t), size: 60 }); if (s >= 7) plate('40 КМ ДО ПОСЁЛКА', W / 2, 520, { k: ss(T0(7), T0(7) + .4, t), size: 64, bg: '#fff' }); }
  if (s >= 13 && s <= 14) plate('5 ПРАВИЛ, КОТОРЫЕ СПАСАЮТ ЖИЗНЬ', W / 2, 230, { k: ss(T0(13), T0(13) + .4, t), size: 58 });
  if (s >= 15 && s <= 16) titleCard(ss(T0(15), T0(15) + .5, t), 1);
  if (s >= 19 && s <= 19) plate('18:00', W * .8, 300, { k: ss(T0(19), T0(19) + .4, t), size: 90, bg: '#fff' });
  if (s === 20) plate('«Ожидается ухудшение погоды»', W / 2, 260, { k: ss(T0(20), T0(20) + .4, t), size: 52, bg: '#fff', rot: -1 });
  if (s === 22 || s === 23) plate('210 КМ ≈ 2,5 ЧАСА', W / 2, 260, { k: ss(T0(22), T0(22) + .4, t), size: 62 });
  if (s === 38) plate('ВИДИМОСТЬ 5 М', W / 2, 260, { k: ss(T0(38), T0(38) + .4, t), size: 70, bg: C2.red, fg: '#fff' });
  if (s >= 48 && s <= 49) plate('ОШИБКА №1', W / 2, 220, { k: ss(T0(48), T0(48) + .4, t), size: 80, bg: C2.red, fg: '#fff', rot: -3 });
  if (s >= 83 && s <= 84) plate('ОШИБКА №2', W / 2, 220, { k: ss(T0(83), T0(83) + .4, t), size: 80, bg: C2.red, fg: '#fff', rot: -3 });
  if (s >= 88 && s <= 89) plate('УГАРНЫЙ ГАЗ (CO)', W / 2, 330, { k: ss(T0(88), T0(88) + .4, t), size: 60, bg: '#9aa0aa' });
  if (s >= 123 && s <= 124) plate('«ПАРАДОКСАЛЬНОЕ РАЗДЕВАНИЕ»', W / 2, 230, { k: ss(T0(123), T0(123) + .4, t), size: 58, bg: '#fff' });
  if (s >= 176 && s <= 178) plate('2-Я НОЧЬ', W / 2, 300, { k: ss(T0(176), T0(176) + .4, t), size: 110, bg: '#1f2a3a', fg: '#fff' });
  if (s >= 134 && s <= 135) plate('1-Й ДЕНЬ', W / 2, 300, { k: ss(T0(134), T0(134) + .4, t), size: 110, bg: '#fff' });
  if (s >= 196 && s <= 197) plate('3-Й ДЕНЬ', W / 2, 300, { k: ss(T0(196), T0(196) + .4, t), size: 110, bg: '#fff' });
  if (s >= 45 && s <= 47) { const p = 1 + .12 * Math.max(0, Math.sin(t * 9)); plate('❤ 140', W * .8, 300, { k: p, size: 70, bg: C2.red, fg: '#fff' }); }
  for (const [txt, x, y, ts] of plateQ) plate(txt, x, y, { k: ss(ts, ts + .4, t), size: txt.length > 22 ? 50 : 62 });
  if (ruleQ) ruleCard(ruleQ[0], ruleQ[1], ss(0, .45, ruleQ[2]));
  if (summary >= 0) { plate('5 ПРАВИЛ', W * .62, 160, { k: 1, size: 70, bg: C2.red, fg: '#fff' }); RULES.forEach(([si, txt], i) => { if (t >= T0(si) - .1) plate(`${i + 1}. ${txt}`, W * .62, 280 + i * 118, { k: ss(T0(si) - .1, T0(si) + .3, t), size: 46, bg: '#fff' }); }); }
  if (s >= 228 && s <= 228) plate('БОНУС', W / 2, 230, { k: ss(T0(228), T0(228) + .4, t), size: 90, bg: C2.yel, rot: -3 });
  captions(t);
  return frameOut();
}
window.renderFrame = renderFrame;
window.ready = true;
