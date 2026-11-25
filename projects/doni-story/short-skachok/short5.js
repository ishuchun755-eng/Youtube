// «Agar butun O'zbekistonda 7 kun svet o'chsa» — comic-3D, synced to timeline.json
import { THREE, camera, draw, frameOut, og, W, H, clamp, lerp, ss, ease, at, G, setOpacity, setColor, look, M, sph, cyl, rbox, box, cone } from './comic.js';
import * as S from './sets.js';
import * as PR from './props.js';
import { makePerson, pose, face, POSES, mixPose, cycle, blinkAt } from './odam.js';
const TL = await (await fetch('timeline5.json')).json(); const SEN = TL.S;
const PRE = 0.25, FPS = 30;
const T0 = i => SEN[i].t0 + PRE, T1 = i => SEN[i].t1 + PRE;
export const DUR = T1(SEN.length - 1) + 1.5; window.DUR = DUR; window.FRAMES = Math.ceil(DUR * FPS);
const V = (x, y, z) => new THREE.Vector3(x, y, z);
const scene = S.scene;
const [FX] = S.OFF.flat, [KX] = S.OFF.kitchen, [BX] = S.OFF.balcony, [YX] = S.OFF.yard, [SX] = S.OFF.sandal, [MX] = S.OFF.map, [IX] = S.OFF.info, [PX] = S.OFF.shop;
const VERT = H > W, OY = VERT ? 340 : 0, QP = new URLSearchParams(location.search);
// ---------- cast ----------
const hero = makePerson({ hair: 'short', c: { shirt: '#5d6672', shirtD: '#4d5560', jeans: '#3f5f8f' } });
const ona = makePerson({ hair: 'scarf', dress: '#7b5ca8', c: { shirt: '#7b5ca8', shirtD: '#6a4d95', scarf: '#e8e2d6', scarfD: '#c0453a' } });
const bobo = makePerson({ hair: 'doppi', beard: 'full', robe: '#2b4a7a', robeD: '#e6b450', c: { hair: '#c9c9c9', beard: '#ececec', shirt: '#2b4a7a' } });
const kid = makePerson({ hair: 'short', scale: .62, c: { shirt: '#e3a64a', shirtD: '#c98f3a', jacket: '#e0473c' } });
const kid2 = makePerson({ hair: 'scarf', scale: .58, dress: '#3f8a5a', c: { shirt: '#3f8a5a', shirtD: '#357a4c', scarf: '#f39a3b', jacket: '#2d5fa0' } });
const kampir = makePerson({ hair: 'scarf', dress: '#6b4a36', c: { shirt: '#6b4a36', shirtD: '#5a3d2c', scarf: '#9aa3ad', scarfD: '#e8e2d6', skin: '#e2ab88' } });
const cast = [hero, ona, bobo, kid, kid2, kampir]; cast.forEach(p => scene.add(p));
// phone in hero's hand with a live Uzbek screen
const phTex = (() => { const cv = document.createElement('canvas'); cv.width = 360; cv.height = 720; const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; t.userData = { cv, g: cv.getContext('2d') }; return t; })();
function phoneDraw(mode, o = {}) { const { g, cv } = phTex.userData, w = cv.width, h = cv.height; g.fillStyle = '#121a26'; g.fillRect(0, 0, w, h);
  g.font = '700 22px InterB'; g.fillStyle = '#cfd8e3'; g.fillText(o.clock || '23:47', 22, 36); const bat = o.bat ?? 40;
  g.strokeStyle = '#cfd8e3'; g.lineWidth = 2; g.strokeRect(w - 70, 18, 44, 20); g.fillStyle = bat < 15 ? '#ff4d3c' : '#7dd97a'; g.fillRect(w - 67, 21, 38 * bat / 100, 14); g.fillText(bat + '%', w - 128, 35);
  if (mode === 'video') { const gr = g.createLinearGradient(0, 120, 0, 420); gr.addColorStop(0, '#e3a64a'); gr.addColorStop(1, '#c0453a'); g.fillStyle = gr; g.fillRect(0, 140, w, 220); g.fillStyle = '#fff'; g.beginPath(); g.moveTo(w / 2 - 25, 220); g.lineTo(w / 2 + 30, 250); g.lineTo(w / 2 - 25, 280); g.fill();
    g.fillStyle = '#2a3446'; for (let i = 0; i < 4; i++) g.fillRect(20, 390 + i * 70, w - 40, 54); }
  if (mode === 'chat') { g.fillStyle = '#1d2736'; g.fillRect(0, 60, w, 60); g.font = '900 26px InterX'; g.fillStyle = '#fff'; g.fillText('Mahalla guruhi', 24, 100);
    const msgs = [['Sizlarda ham o\'chdimi?', 1], ['Ha, bizda ham', 0], ['Bizda ham!', 0], ['Butun shahar o\'chibdi', 0]]; const n = o.n ?? 4;
    g.font = '700 24px InterB'; msgs.slice(0, n).forEach(([m, me], i) => { const tw = g.measureText(m).width + 36; const x = me ? w - tw - 18 : 18, y = 150 + i * 80; g.fillStyle = me ? '#2f7cf6' : '#2a3446'; g.fillRect(x, y, tw, 54); g.fillStyle = '#fff'; g.fillText(m, x + 18, y + 35); }); }
  if (mode === 'nosig') { g.fillStyle = '#ff6a5a'; g.font = '900 54px InterX'; g.textAlign = 'center'; g.fillText('TARMOQ', w / 2, h / 2 - 20); g.fillText("YO'Q", w / 2, h / 2 + 46); g.textAlign = 'left';
    g.strokeStyle = '#ff6a5a'; g.lineWidth = 8; for (let i = 0; i < 4; i++) g.strokeRect(w / 2 - 60 + i * 32, h / 2 + 150 - i * 22, 20, 22 + i * 22); g.beginPath(); g.moveTo(w / 2 - 80, h / 2 + 100); g.lineTo(w / 2 + 80, h / 2 + 190); g.stroke(); }
  if (mode === 'flash') { g.fillStyle = '#20262f'; g.fillRect(0, 60, w, h); g.fillStyle = '#fff'; g.beginPath(); g.arc(w / 2, h / 2, 60, 0, 7); g.fill(); g.font = '900 30px InterX'; g.textAlign = 'center'; g.fillText('FONAR', w / 2, h / 2 + 120); g.textAlign = 'left'; }
  phTex.needsUpdate = true; }
const phone = new THREE.Group(); at(rbox(.7, 1.4, .08, .08, '#1c1d22'), 0, 0, 0, phone); const phScr = at(M(new THREE.PlaneGeometry(.64, 1.3), '#ffffff', { map: phTex, noEdge: true, cast: false, glow: true, glowK: 1.1 }), 0, 0, .045, phone);
hero.userData.J.handR.add(phone); phone.position.set(0, -.11, .035); phone.rotation.set(-1.2, 0, 0); phone.scale.setScalar(.2);
const bigPhone = new THREE.Group(); at(rbox(.7, 1.4, .08, .08, '#1c1d22'), 0, 0, 0, bigPhone); at(M(new THREE.PlaneGeometry(.64, 1.3), '#ffffff', { map: phTex, noEdge: true, cast: false, glow: true, glowK: 1.1 }), 0, 0, .045, bigPhone);
at(bigPhone, 0, 1.6, 0, S.INFO); bigPhone.scale.setScalar(1.25);
// thermos for kampir scene
const thermos = new THREE.Group(); at(cyl(.06, .06, .3, '#c0453a', 14), 0, -.15, 0, thermos); at(cyl(.05, .05, .06, '#2a2c31', 12), 0, .03, 0, thermos); hero.userData.J.handL.add(thermos); thermos.position.set(0, -.1, .04);
// bucket of snow (balcony)
const bucket = new THREE.Group(); at(cyl(.2, .16, .32, '#9aa3ad', 18), 0, .16, 0, bucket); at(sph(.2, S.SNOW, {}, 14, 8), 0, .3, 0, bucket).scale.set(1, .4, 1); scene.add(bucket);
// ---------- INFO props ----------
const props = {}; const add = (k, o, x = 0, y = .5, z = 0) => { props[k] = o; at(o, x, y, z, S.INFO); o.visible = false; return o; };
const COs = []; for (let i = 0; i < 6; i++) COs.push(add('co' + i, PR.makeCO()));
add('thermo', PR.makeThermo()); add('body', PR.makeBody()); add('pbank', PR.makePowerbank()); add('water', PR.makeWater()); add('can', PR.makeCan()); add('cross', PR.makeCross()); add('check', PR.makeCheck());
add('bolt', PR.makeBolt()); add('bolt2', PR.makeBolt('#ff8a3a'));
const fonar = add('fonar', new THREE.Group()); at(cyl(.09, .09, .5, '#2f3238', 14), 0, 0, 0, fonar).rotation.z = Math.PI / 2; at(cyl(.13, .09, .14, '#2f3238', 14), .3, 0, 0, fonar).rotation.z = Math.PI / 2; at(cyl(.12, .12, .02, '#fff6d8', 14, { glow: true, glowK: 2, cast: false }), .38, 0, 0, fonar).rotation.z = Math.PI / 2;
const batt = add('batt', new THREE.Group()); for (let i = 0; i < 4; i++) { at(cyl(.05, .05, .24, '#e3a64a', 12), -.18 + i * .12, .12, 0, batt); at(cyl(.05, .05, .06, '#2a2c31', 12), -.18 + i * .12, .03, 0, batt); }
const cash = add('cash', new THREE.Group()); for (let i = 0; i < 5; i++) at(rbox(.5, .02, .26, .01, i % 2 ? '#6fb38a' : '#5fa37a'), (i % 2) * .02, .02 + i * .025, 0, cash);
const radioI = add('radio', new THREE.Group()); at(rbox(.6, .36, .2, .06, '#6b4a36'), 0, .18, 0, radioI); at(cyl(.1, .1, .02, '#2a2c31', 16), -.14, .18, .1, radioI).rotation.x = Math.PI / 2; at(cyl(.008, .008, .7, '#c9ccd2', 4), .22, .6, 0, radioI).rotation.z = -.4;
const cloudM = add('cloud', new THREE.Group()); for (let i = 0; i < 9; i++) at(sph(.4 + (i % 3) * .1, '#9aa0aa', { cast: false }), Math.cos(i * .7) * .8, Math.sin(i * 1.3) * .25, Math.sin(i) * .2, cloudM);
// ---------- helpers ----------
function resetAll() {
  for (const k in props) { props[k].visible = false; props[k].position.set(0, .5, 0); props[k].rotation.set(0, 0, 0); props[k].scale.setScalar(1); }
  bigPhone.visible = false; phone.visible = false; thermos.visible = false; bucket.visible = false;
  for (const p of cast) { p.visible = false; p.position.set(0, -50, 0); p.rotation.set(0, 0, 0); pose(p, POSES.idle); face(p, {}); p.userData.setJacket(false); p.userData.setBeanie(false); }
  S.lightsOff(); S.lights.candle.color.set('#ffb35c'); look.vignette = .2; S.weather(0, 0, 0, 0, 0);
  S.flames.forEach(f => f.visible = false); S.coCloud.visible = false; S.manqal.visible = false; S.pipeIce.visible = false; S.spray.visible = false; S.sparks.visible = false; S.winQuilt.visible = false;
  S.blanket.visible = false; S.fortochka.rotation.y = 0; S.kDoor.rotation.y = 0; S.fDoor.rotation.y = 0; S.fridgeDoor.rotation.y = 0; S.plov.visible = false; S.meat.position.set(.8, .25, .3);
  setFrost(0); S.breathG.children.forEach(c => c.visible = false); S.setFlatPower(false); S.flameA.visible = false; S.flameB.visible = true; S.flameC.visible = true;
  S.setMapLights(0); S.termScreen.visible = true; setColor(S.kotelLed, '#5aff8a'); S.towerLight.visible = true;
}
function setFrost(a) { for (const m of [S.frost.userData.m.lit, S.frost.userData.m.flat]) m.opacity = a; }
function put(p, x, y, z, ry = 0) { p.visible = true; p.position.set(x, y, z); p.rotation.y = ry; return p; }
const SIT = POSES.sit, SITHUG = { ...POSES.sit, armL: [-.9, 0, -.25], elbowL: [-1.4, 0, 0], armR: [-.9, 0, .25], elbowR: [-1.4, 0, 0], torso: [.18, 0, 0], head: [.12, 0, 0] };
const SITPHONE = { ...POSES.sit, armR: [-.6, 0, .1], elbowR: [-1.7, .2, 0], handR: [.5, 0, 0], head: [.35, 0, 0] };
const FLOORSIT = { ...POSES.sit, legL: [-1.5, 0, .05], legR: [-1.5, 0, -.05], kneeL: 0, kneeR: 0 };
const shiver = (t, a = 1) => ({ torso: [.15 + Math.sin(t * 40) * .02 * a, Math.sin(t * 37) * .03 * a, 0] });
const heroSofa = () => put(hero, FX - 2.4, .05, -.2, Math.PI / 2);
function flatPower(on) { S.setEnv(on ? 'indoorPower' : 'indoorDark'); S.setFlatPower(on); S.aimSun(FX, 0, 0, 6, [2, 8, 6]); }
function candleAt(L, x, y, z, k = 1) { L.position.set(x, y, z); L.intensity = (4.5 + Math.sin(performance.now() * 0) * 0) * Math.PI * k; }
function flashFrom(obj, fwd) { scene.updateMatrixWorld(true); const p = obj.getWorldPosition(V(0, 0, 0)); const f = S.lights.flash; f.position.copy(p); f.target.position.copy(p).add(fwd); f.intensity = 30 * Math.PI; }
function cityCam(t) { S.setEnv('night'); S.aimSun(0, 0, -30, 40); }
// ---------- overlays ----------
const C2 = { ink: '#15121a', yel: '#ffd33d', red: '#e8473a', white: '#ffffff', blue: '#7cc4ff' };
function plate(text, x, y, o = {}) {
  let sz = o.size || 64; const k = o.k ?? 1; if (k <= 0) return;
  if (VERT && !o.abs) { y += OY; og.save(); og.font = `900 ${sz}px InterX`; const ls = String(text).split('\n'); let w0 = Math.max(...ls.map(l => og.measureText(l).width)) + sz * .8; og.restore();
    if (w0 > W - 60) { sz *= (W - 60) / w0; w0 = W - 60; } x = clamp(x, 30 + w0 / 2, W - 30 - w0 / 2); }
  og.save(); og.translate(x, y); const sc = k < 1 ? ease(k) * (1.12 - .12 * k) : 1; og.scale(sc, sc); og.rotate((o.rot || 0) * Math.PI / 180);
  og.font = `900 ${sz}px InterX`; const lines = String(text).split('\n'); const w = Math.max(...lines.map(l => og.measureText(l).width)) + sz * .8, h = lines.length * sz * 1.1 + sz * .5;
  og.fillStyle = C2.ink; og.fillRect(-w / 2 + 10, -h / 2 + 10, w, h); og.fillStyle = o.bg || C2.yel; og.fillRect(-w / 2, -h / 2, w, h);
  og.lineWidth = 6; og.strokeStyle = C2.ink; og.strokeRect(-w / 2, -h / 2, w, h);
  og.fillStyle = o.fg || C2.ink; og.textAlign = 'center'; og.textBaseline = 'middle'; lines.forEach((l, i) => og.fillText(l, 0, (i - (lines.length - 1) / 2) * sz * 1.1 + sz * .05));
  og.restore(); }
function ruleCard(n, text, k) { if (k <= 0) return; plate(`${n}-QOIDA`, W / 2, 230, { k, size: 58, bg: C2.red, fg: '#fff', rot: -2 }); plate(text, W / 2, 350, { k: clamp(k * 1.2 - .1), size: 60, rot: 1 }); }
function hud(label, temp) { og.save(); og.translate(0, OY * .55); og.font = '900 40px InterX'; const w = og.measureText(label).width + 40;
  og.fillStyle = C2.ink; og.fillRect(46, 46, w, 64); og.fillStyle = C2.white; og.fillRect(40, 40, w, 64); og.lineWidth = 5; og.strokeStyle = C2.ink; og.strokeRect(40, 40, w, 64);
  og.fillStyle = C2.ink; og.textBaseline = 'middle'; og.fillText(label, 60, 74);
  if (temp) { const tw = og.measureText(temp).width + 40; const x = 40 + w + 18; og.fillStyle = C2.ink; og.fillRect(x + 6, 46, tw, 64); og.fillStyle = C2.blue; og.fillRect(x, 40, tw, 64); og.strokeRect(x, 40, tw, 64); og.fillStyle = C2.ink; og.fillText(temp, x + 20, 74); }
  og.restore(); }
function sentAt(t) { for (const s of SEN) if (t >= s.t0 + PRE - .05 && t < s.t1 + PRE + .25) return s; return null; }
function captions(t) { const s = sentAt(t); if (!s) return; const words = s.text.split(' '); const tot = s.text.length; const prog = clamp((t - (s.t0 + PRE)) / (s.t1 - s.t0));
  og.save(); const CS = VERT ? 66 : 54; og.font = `900 ${CS}px InterX`; og.textBaseline = 'middle'; og.textAlign = 'left';
  const lines = []; let cur = []; let cw2 = 0; for (const w of words) { const ww = og.measureText(w + ' ').width; if (cw2 + ww > W * (VERT ? .88 : .78) && cur.length) { lines.push(cur); cur = []; cw2 = 0; } cur.push(w); cw2 += ww; } if (cur.length) lines.push(cur);
  let acc = 0; const LH = VERT ? CS * 1.18 : 64; const y0 = VERT ? H * .73 : H - 110 - (lines.length - 1) * 64;
  lines.forEach((ln, li) => { const lw = og.measureText(ln.join(' ')).width; let x = W / 2 - lw / 2; const y = y0 + li * LH;
    for (const w of ln) { const wk = (acc + w.length / 2) / tot; acc += w.length + 1; const on = prog >= wk - .06 && prog < wk + (w.length + 1) / tot + .04;
      og.lineWidth = 12; og.strokeStyle = C2.ink; og.lineJoin = 'round'; og.strokeText(w, x, y); og.fillStyle = on ? C2.yel : '#ffffff'; og.fillText(w, x, y); x += og.measureText(w + ' ').width; } });
  og.restore(); }
function titleCard(k) { if (k <= 0) return; og.save(); og.globalAlpha = clamp(k * 1.5); og.fillStyle = 'rgba(10,14,24,.5)'; og.fillRect(0, 0, W, H); og.restore();
  plate('7 KUN', W / 2, H / 2 - 150, { k, size: 150, bg: '#1f2a3a', fg: '#ffd33d', rot: -2, abs: 1 }); plate('SVETSIZ', W / 2, H / 2 + 20, { k: clamp(k * 1.3 - .2), size: 110, bg: '#fff', rot: 1.5, abs: 1 });
  plate('UY · SHAHAR · TANA · ODAMLAR', W / 2, H / 2 + 165, { k: clamp(k * 1.3 - .4), size: 46, bg: C2.yel, abs: 1 }); }
// ---------- BEATS ----------
const BEATS = []; const B = (a, fn) => BEATS.push({ a, fn });
let HUD = null, plateQ = [], ruleQ = null, title = 0, summary = -1;
const pq = (txt, x, y, ts, o = {}) => plateQ.push([txt, x, y, ts, o]);
// ===== SHORT 5: «Свет дали — сгорел холодильник» =====
let OV = null;
const UNPLUG = { ...POSES.dig, torso: [.6, 0, 0], armR: [-1.4, 0, -.1], elbowR: [-.2, 0, 0] };
function lampOn(on) { S.ceilLamp.userData.glow = on; setColor(S.ceilLamp, on ? '#fff1d0' : '#d8d2c8'); }
function hook(t, txt) { if (t < 2.9) pq(txt, W / 2, 150, .05, { bg: C2.red, fg: '#fff', size: 80, rot: -3, abs: 1 }); }
function graph(t, t0) { // voltage chart drawn on overlay
  const x0 = 120, x1 = W - 120, y0 = 1080, hgt = 360, p = clamp((t - t0) / 3.2); og.save();
  og.fillStyle = 'rgba(21,18,26,.85)'; og.fillRect(x0 - 40, y0 - hgt - 80, x1 - x0 + 80, hgt + 140); og.strokeStyle = '#ffffff33'; og.lineWidth = 2;
  for (const v of [220, 380]) { const y = y0 - (v / 400) * hgt; og.beginPath(); og.moveTo(x0, y); og.lineTo(x1, y); og.stroke(); og.font = '900 34px InterX'; og.fillStyle = v > 300 ? C2.red : '#fff'; og.fillText(v + ' В', x0, y - 12); }
  og.beginPath(); og.lineWidth = 9; og.strokeStyle = C2.yel; og.lineJoin = 'round';
  const n = 120; for (let i = 0; i <= n * p; i++) { const u = i / n; let v = u < .1 ? 0 : 220; if (u > .42 && u < .62) v = 220 + 170 * Math.sin((u - .42) / .2 * Math.PI) * (1 + .15 * Math.sin(u * 90)); const x = x0 + u * (x1 - x0), y = y0 - (v / 400) * hgt; i ? og.lineTo(x, y) : og.moveTo(x, y); }
  og.stroke(); og.restore(); }
function timer(t, t0) { const left = Math.max(0, 300 - (t - t0) * 120); const mm = Math.floor(left / 60), ss2 = Math.floor(left % 60);
  plate(`⏱ ${mm}:${String(ss2).padStart(2, '0')}`, W / 2, 760, { k: ss(t0, t0 + .3, t), size: 120, bg: '#fff' }); }
function flatBase(on) { S.setEnv(on ? 'indoorPower' : 'indoorDark', on ? {} : { hemi: .2 }); S.setFlatPower(on); lampOn(on); S.aimSun(FX, 0, 0, 6, [2, 8, 6]); S.drawView(on ? .8 : 0, on ? 0 : .05); }
// 0: power comes back — sparks — fridge dies
B(0, (t, lt, k, s) => { const on = t > .45, burnt = t > 2.4; flatBase(on && !burnt); if (on && !burnt) S.animSparks(t); if (burnt) { S.lights.candle.position.set(FX + 2.6, 1.0, -1.0); S.lights.candle.color.set('#ff8a3a'); S.lights.candle.intensity = (2 + Math.sin(t * 40)) * Math.PI * .5; }
  put(hero, FX + 1.9, 0, -.2, -.8); pose(hero, on ? POSES.open : POSES.idle); face(hero, { brow: -.7, raise: 1, mouth: on ? .7 : 0 });
  hook(t, 'СВЕТ ДАЛИ… 💥'); if (burnt) pq('ХОЛОДИЛЬНИК 🔥', W / 2, 560, 2.4, { bg: C2.red, fg: '#fff', size: 72, rot: 2 });
  return { pos: V(FX + 1.0, 1.4, 1.4), look: V(FX + 2.9, .9, -1.2), fov: 48 }; });
// 1: why?
B(1, (t, lt, k, s) => { flatBase(false); S.lights.candle.position.set(FX + 1.6, 1.5, .2); S.lights.candle.intensity = 2 * Math.PI;
  put(hero, FX + 2.2, 0, -.5, -.69); pose(hero, POSES.shrug); face(hero, { brow: -1, raise: 1, mouth: .4 });
  pq('ПОЧЕМУ?', W / 2, 560, T0(1) - .1, { size: 130, bg: C2.yel, rot: -3 });
  return { pos: V(FX + .9, 1.6, 1.1), look: V(FX + 2.2, 1.3, -.5), fov: 40 }; });
// 2–3: voltage surge chart
B(2, (t, lt, k, s) => { S.setEnv('info'); const b = props.bolt; b.visible = false; b.position.set(0, 1.6 + Math.sin(t * 3) * .05, 0); b.rotation.y = t * 1.5; b.scale.setScalar(1.6 + (s >= 3 ? .3 * Math.abs(Math.sin(t * 9)) : 0));
  pq('СКАЧОК НАПРЯЖЕНИЯ ⚡', W / 2, 160, T0(2) + .6, { size: 64, bg: C2.red, fg: '#fff' }); OV = () => graph(t, T0(2) + .3);
  if (s >= 3) pq('ВСЁ ВКЛЮЧАЕТСЯ РАЗОМ', W / 2, 290, T0(3) + .3, { size: 54, bg: '#fff' });
  return { pos: V(IX, 1.9, 4.6), look: V(IX, 1.3, 0), fov: 34 }; });
// 4: what burns
B(4, (t, lt, k, s) => { flatBase(false); S.animSparks(t * 1.3); S.lights.candle.position.set(FX + 2.6, 1.0, -1.0); S.lights.candle.color.set('#ffb35c'); S.lights.candle.intensity = (2.5 + Math.sin(t * 35)) * Math.PI * .6;
  ['ХОЛОДИЛЬНИК', 'ТЕЛЕВИЗОР', 'РОУТЕР', 'ЗАРЯДКИ'].forEach((w, i) => pq(w + ' ✗', i % 2 ? W * .7 : W * .3, 480 + (i >> 1) * 120, T0(4) + .2 + i * .7, { size: 52, bg: C2.red, fg: '#fff', rot: i % 2 ? 2 : -2 }));
  return { pos: V(FX - .2 + lt * .1, 1.5, 1.6), look: V(FX + 1.6, .9, -2.0), fov: 50 }; });
// 5: rule — unplug everything
B(5, (t, lt, k, s) => { flatBase(false); S.lights.candle.position.set(FX + 2.6, 1.0, -1.0); S.lights.candle.color.set('#ffb35c'); S.lights.candle.intensity = 3 * Math.PI; S.flameA.visible = true;
  put(hero, FX + 2.6, 0, -1.5, -Math.PI / 2); pose(hero, UNPLUG); S.plug.position.z = .04 + ss(T0(5) + 2.0, T0(5) + 2.6, t) * .3;
  pq('ПРАВИЛО', W / 2, 470, T0(5) + .1, { bg: C2.red, fg: '#fff', size: 60, rot: -2 }); pq('СВЕТ ПРОПАЛ →\nВЫДЕРНИ ВСЁ 🔌', W / 2, 620, T0(5) + .9, { size: 62 });
  return { pos: V(FX + .9, 1.5, .1), look: V(FX + 3.2, .6, -1.6), fov: 44 }; });
// 6: leave one lamp switched on
B(6, (t, lt, k, s) => { flatBase(false); S.lights.candle.position.set(FX + 1, 1.5, .5); S.lights.candle.intensity = 1.8 * Math.PI;
  put(hero, FX + .05, 0, .95, .2); pose(hero, POSES.pointUp); face(hero, { raise: .5 });
  pq('💡 ОДНА ЛАМПА —\nВКЛЮЧЕНА', W / 2, 180, T0(6) + .2, { size: 62, bg: C2.yel });
  return { pos: V(FX + .6, 1.2, 3.0), look: V(FX, 2.0, -.4), fov: 50 }; });
// 7: lamp lights — wait 5 minutes
B(7, (t, lt, k, s) => { const on = t > T0(7) + .25; S.setEnv(on ? 'indoorPower' : 'indoorDark'); lampOn(on); S.aimSun(FX, 0, 0, 6, [2, 8, 6]); S.drawView(on ? .8 : 0, 0);
  put(hero, FX + .05, 0, .95, .2); pose(hero, POSES.think); face(hero, { look: [0, .3] });
  pq('ЖДИ 5 МИНУТ', W / 2, 180, T0(7) + .5, { bg: C2.red, fg: '#fff', size: 66 }); if (on) OV = () => timer(t, T0(7) + .7);
  return { pos: V(FX + .6, 1.2, 3.0), look: V(FX, 1.9, -.4), fov: 50 }; });
// 8: plug things back one by one
B(8, (t, lt, k, s) => { flatBase(true); S.tvScreen && setColor(S.tvScreen, t > T0(8) + 1.2 ? '#5fa8e6' : '#111216');
  put(hero, FX + 2.6, 0, -1.5, -Math.PI / 2); pose(hero, UNPLUG); S.plug.position.z = .34 - ss(T0(8) + .2, T0(8) + .7, t) * .3;
  ['1. ХОЛОДИЛЬНИК', '2. ТЕЛЕВИЗОР', '3. РОУТЕР'].forEach((w, i) => pq(w + ' ✓', W / 2, 470 + i * 112, T0(8) + .3 + i * .6, { size: 52, bg: i === 0 ? C2.yel : '#fff' }));
  return { pos: V(FX + .9, 1.6, .3), look: V(FX + 2.4, .9, -1.6), fov: 46 }; });
// 9: save + subscribe
B(9, (t, lt, k, s) => { flatBase(true); put(hero, FX + 1.2, 0, -.3, .3); pose(hero, POSES.point); face(hero, { mouth: .3, raise: .5 });
  pq('СОХРАНИ 📌', W / 2, 500, T0(9), { size: 90, bg: C2.yel, rot: -3 });
  if (t > T1(9) + .05) { pq('Doni Story', W / 2, 1150, T1(9) + .05, { size: 70, bg: '#fff', abs: 1 }); pq('ПОДПИШИСЬ 🔔', W / 2, 1290, T1(9) + .25, { size: 64, bg: C2.red, fg: '#fff', abs: 1 }); }
  return { pos: V(FX + .9, 1.5, 2.6 - lt * .15), look: V(FX + 1.2, 1.3, -.3), fov: 40 }; });

BEATS.forEach((b, i) => { b.t0 = i === 0 ? 0 : T0(b.a) - .12; });
BEATS.forEach((b, i) => { b.t1 = i < BEATS.length - 1 ? BEATS[i + 1].t0 : DUR; });
function sIdx(t) { let r = 0; for (const s of SEN) if (t >= s.t0 + PRE - .12) r = s.i; return r; }
export function renderFrame(f) {
  const t = f / FPS; resetAll(); lampOn(false); hero.userData.setJacket(true); hero.userData.setBeanie(true); plateQ = []; HUD = null; OV = null;
  const b = BEATS.find(b => t >= b.t0 && t < b.t1) || BEATS[BEATS.length - 1];
  const lt = t - b.t0, k = clamp(lt / (b.t1 - b.t0)), s = sIdx(t);
  const cam = b.fn(t, lt, k, s);
  camera.position.copy(cam.pos); camera.fov = VERT ? 2 * Math.atan(Math.tan(cam.fov * Math.PI / 360) * 1.75) * 180 / Math.PI : cam.fov; camera.lookAt(cam.look); camera.updateProjectionMatrix();
  draw(scene, { t: f });
  og.clearRect(0, 0, W, H);
  if (OV) OV();
  for (const [txt, x, y, ts, o] of plateQ) plate(txt, x, y, { size: txt.length > 22 ? 50 : 62, ...o, k: ss(ts, ts + .35, t) });
  captions(t);
  return frameOut();
}
window.renderFrame = renderFrame;
window.ready = true;
