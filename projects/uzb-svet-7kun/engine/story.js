// «Agar butun O'zbekistonda 7 kun svet o'chsa» — comic-3D, synced to timeline.json
import { THREE, camera, draw, frameOut, og, W, H, clamp, lerp, ss, ease, at, G, setOpacity, setColor, look, M, sph, cyl, rbox, box, cone } from './comic.js';
import * as S from './sets.js';
import * as PR from './props.js';
import { makePerson, pose, face, POSES, mixPose, cycle, blinkAt } from './odam.js';
const TL = await (await fetch('timeline.json')).json(); const SEN = TL.S;
const PRE = 1.2, FPS = 30;
const T0 = i => SEN[i].t0 + PRE, T1 = i => SEN[i].t1 + PRE;
export const DUR = T1(SEN.length - 1) + 4.0; window.DUR = DUR; window.FRAMES = Math.ceil(DUR * FPS);
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
// 0: city at night, alive
B(0, (t, lt, k, s) => { cityCam(t); S.setCity(.78, 0); S.setLamps(true); S.setTraffic('green'); S.setShop(true); S.weather(t, 0, 0, -10, .45);
  S.cars.forEach((c, i) => { c.userData.lights(true); c.position.z = 10 - i * 6 + (i % 2 ? -1 : 1) * ((t * 4) % 6); });
  if (s >= 1) pq("−15°C", W * .2, 300, T0(1), { bg: C2.blue, size: 100, rot: -4 }); if (s >= 2) pq('23:47', W * .8, 300, T0(2), { bg: '#fff', size: 90 });
  return { pos: V(0, 14 - lt * .35, 24 - lt * 1.6), look: V(0, 5, -40), fov: 42 }; });
// 3: in the flat, power on: tea + phone video
B(3, (t, lt, k, s) => { const on = s < 4 || (s === 4 && t < T0(4) + .9); flatPower(on); S.drawView(on ? .8 : 0, on ? 0 : .05); S.flameA.visible = !on;
  heroSofa(); pose(hero, SITPHONE); face(hero, { smile: on ? .4 : 0, mouth: on ? 0 : .7, raise: on ? 0 : 1, blink: blinkAt(t), look: on ? [0, -.6] : [.4, .3] });
  phone.visible = true; phoneDraw(on ? 'video' : 'flash'); if (!on) { S.lights.candle.position.set(FX - 2.0, 1.1, .1); S.lights.candle.color.set('#e8f0ff'); S.lights.candle.intensity = 2.2 * Math.PI; }
  if (s === 5) pq('CHIQ!', W * .72, 300, T0(4) + .9, { bg: C2.red, fg: '#fff', size: 110, rot: -6 });
  return { pos: V(FX + .6 - k * .4, 1.55, 2.6 - k * .5), look: V(FX - 2.0, 1.05, -.3), fov: 40 }; });
// 6: hero in the dark, phone flashlight, shrug
B(6, (t, lt, k, s) => { flatPower(false); S.drawView(0, .06); heroSofa(); pose(hero, mixPose(POSES.sit, { ...POSES.sit, ...POSES.shrug, hipsY: -.38 }, ss(0, .5, lt) * (1 - ss(2.5, 3, lt)))); face(hero, { smile: .3, blink: blinkAt(t), brow: .2 });
  phone.visible = true; phoneDraw('flash'); flashFrom(phone, V(1, .3, .4)); S.lights.flash.intensity = 14 * Math.PI;
  return { pos: V(FX - .3, 1.4, 1.6), look: V(FX - 2.3, 1.15, -.2), fov: 38 }; });
// 9: city goes dark (flyover) + 12: map of Uzbekistan switching off
B(9, (t, lt, k, s) => { cityCam(t); S.setEnv('blackout'); const kk = ss(0, 2.5, lt); S.setCity(.78 * (1 - kk), .06 * kk); S.setLamps(kk < .5); S.setTraffic(kk < .6 ? 'green' : 'off'); S.setShop(kk < .7); S.weather(t, 0, 0, -30, .45);
  S.cars.forEach(c => c.userData.lights(true)); S.towerLight.visible = kk < .8;
  if (s >= 10) pq('ERTAGA HAM', W * .3, 300, T0(10), { bg: '#fff' }); if (s >= 11) pq('INDINGA HAM', W * .7, 420, T0(11), { bg: '#fff', rot: 2 });
  return { pos: V(-8 + lt * .8, 30 + lt * .4, 10 - lt), look: V(4, 4, -70), fov: 46 }; });
B(12, (t, lt, k, s) => { S.setEnv('space'); S.aimSun(MX, 0, 0, 12); S.setMapLights(ss(.3, 3.2, lt));
  pq("BUTUN O'ZBEKISTON", W / 2, 230, T0(12) + .3, { bg: C2.red, fg: '#fff', size: 70 });
  return { pos: V(MX + Math.sin(lt * .05) * 2, 14 - k * 2, 9.5 - k * 2), look: V(MX, 0, -.5), fov: 40 }; });
// 13: title over dark snowy city
B(13, (t, lt, k, s) => { cityCam(t); S.setEnv('blackout'); S.setCity(0, .07); S.setLamps(false); S.setTraffic('off'); S.setShop(false); S.weather(t, 0, 0, -18, .55); S.towerLight.visible = false;
  S.cars.forEach((c, i) => { c.userData.lights(i % 3 === 0); });
  title = s <= 14 ? ss(T0(13), T0(13) + .6, t) : 0; if (s >= 14) pq('+ 5 QOIDA', W / 2, H / 2 + 300, T0(14), { size: 70, bg: C2.red, fg: '#fff', abs: 1 });
  return { pos: V(0, 3.2 + lt * .05, 18 - lt * .6), look: V(0, 4.5, -40), fov: 44 }; });
// 16: day 1, searching for candles with phone flashlight
B(16, (t, lt, k, s) => { flatPower(false); HUD = ['1-KUN · 23:50', '−15°C']; S.drawView(0, .06);
  put(hero, FX + 2.2, 0, -1.9, Math.PI * .72); const dig = Math.sin(t * 5); pose(hero, { ...POSES.phone, armR: [-1.3, 0, -.2], elbowR: [-.4, 0, 0], armL: [-1.0 + dig * .2, 0, .2], elbowL: [-.6, 0, 0], torso: [.25, 0, 0], head: [-.1, Math.sin(t * 1.5) * .3, 0] });
  phone.visible = true; phoneDraw('flash'); flashFrom(phone, V(0, -.3, -1)); face(hero, { brow: -.5, mouth: .3 });
  if (s >= 18) pq('SHAM QAYERDA?!', W * .3, 300, T0(18) + 1.5, { bg: '#fff', rot: -3 }); if (s >= 20) pq('HECH QACHON!', W * .72, 440, T0(20), { bg: C2.red, fg: '#fff', rot: 3 });
  return { pos: V(FX + .9, 1.6, .4), look: V(FX + 2.5, 1.2, -2.3), fov: 44 }; });
// 21: phone close: battery + chat
B(21, (t, lt, k, s) => { S.setEnv('info'); HUD = ['1-KUN · 00:10', null]; bigPhone.visible = true; bigPhone.rotation.y = Math.sin(t * .7) * .1;
  phoneDraw(s < 23 ? 'video' : 'chat', { clock: '00:10', bat: 40, n: s < 23 ? 0 : s < 24 ? 1 + Math.floor(ss(T0(23), T0(23) + 1.5, t) * 1) : 4 });
  if (s >= 21 && s < 23) pq('ZARYAD 40%', W * .76, 420, T0(21), { bg: '#7dd97a' }); if (s >= 22 && s < 23) pq('INTERNET ✓', W * .24, 420, T0(22), { bg: '#fff' });
  return { pos: V(IX + .4, 1.7, 3.0), look: V(IX, 1.6, 0), fov: 34 }; });
// 25: cell tower loses power
B(25, (t, lt, k, s) => { cityCam(t); S.setEnv('blackout'); S.setCity(0, .07); S.setLamps(false); S.setTraffic('off'); S.setShop(false); S.weather(t, -16, 26, -57, .25, .1, 14); S.setEnv('blackout', { hemi: .5 });
  S.towerLight.visible = s < 27 && Math.sin(t * 4) > -.2;
  if (s >= 26 && s < 27) { const bk = ss(T0(26), T1(26), t); pq(`AKKUMULYATOR ${Math.round(100 - bk * 95)}%`, W * .72, 330, T0(26), { bg: bk > .7 ? C2.red : C2.yel, fg: bk > .7 ? '#fff' : C2.ink }); }
  if (s >= 27) { pq("TARMOQ YO'Q", W / 2, 300, T0(27), { bg: C2.red, fg: '#fff', size: 80, rot: -3 }); }
  return { pos: V(-4 - lt * .3, 30, -40 + lt * .2), look: V(-16, 33, -57), fov: 44 }; });
// 29: kotel — gas yes, heating no
B(29, (t, lt, k, s) => { S.setEnv('indoorDark', { hemi: .22 }); HUD = ['1-KUN · 01:30', '+19°C']; S.drawView(0, .05); candleAt(S.lights.candle, KX + 1.2, 1.4, -1.2, .9);
  setColor(S.kotelLed, '#30343b'); put(hero, KX + .5, 0, -1.1, Math.PI * .75); pose(hero, s >= 31 ? POSES.shrug : POSES.think); face(hero, { brow: -.3, blink: blinkAt(t) });
  if (s >= 30) pq('GAZ ✓', W * .25, 300, T0(30) + 1, { bg: '#7dd97a' }); if (s >= 32) pq('NASOS ⚡ ✗', W * .75, 300, T0(32) + 1, { bg: C2.red, fg: '#fff' }); if (s >= 33) pq("ISITISH YO'Q", W / 2, 460, T0(33), { size: 80 });
  return { pos: V(KX + 1.4, 1.5, .8), look: V(KX + 1.3, 1.4, -2.1), fov: 46 }; });
// 34: tap dry, lift stopped
B(34, (t, lt, k, s) => { if (s < 36) { S.setEnv('indoorDark', { hemi: .25 }); candleAt(S.lights.candle, KX - 1.0, 1.5, -1.3, 1); put(hero, KX - 1.9, 0, -1.3, Math.PI * .8);
    pose(hero, { ...POSES.point, armR: [-1.2, 0, -.1], elbowR: [-.5, 0, 0] }); face(hero, { brow: -.6, mouth: .4 });
    if (s >= 35) pq("5-QAVATDAN YUQORI — SUV YO'Q", W / 2, 260, T0(35), { size: 54 }); return { pos: V(KX - .1, 1.75, -.2), look: V(KX - 1.5, 1.0, -2.05), fov: 44 }; }
  cityCam(t); S.setEnv('blackout'); S.setCity(0, .07); S.setLamps(false); S.weather(t, 0, 0, -10, .4); pq("LIFT ✗", W * .3, 300, T0(36), { bg: C2.red, fg: '#fff', size: 90, rot: -4 });
  if (s >= 37) pq('…KIMDIR ICHIDA QOLDI', W * .64, 440, T0(37), { bg: '#fff' });
  return { pos: V(4, 2.0, 2 - lt * .3), look: V(14, 9, -10), fov: 44 }; });
// 38: day 2 morning, cold room, frost, breath
B(38, (t, lt, k, s) => { S.setEnv('indoorDay', { tint: [.9, .96, 1.08] }); S.aimSun(FX, 0, 0, 6, [-2, 6, -8]); S.drawView(0, 0); setFrost(ss(T0(38), T0(39) + 2, t) * .9); HUD = ['2-KUN · 08:00', null];
  heroSofa(); pose(hero, mixPose(SITHUG, shiver(t), .5)); S.blanket.visible = true; hero.userData.setBeanie(s >= 40); face(hero, { brow: -.7, blink: blinkAt(t), mouth: .15 });
  S.breath(t, V(FX - 2.15, 1.55, -.2), V(1, .15, 0)); const temp = Math.round(lerp(11, 9, k)); pq(`UYDA +${temp}°C`, W * .74, 300, T0(39), { bg: C2.blue, size: 80 });
  if (s >= 41) pq('−1–2°C / SOAT', W * .74, 440, T0(41), { bg: '#fff' });
  return s < 40 ? { pos: V(FX + 1.4, 1.8, 3.0), look: V(FX - 1.4, 1.2, -1.2), fov: 44 } : { pos: V(FX - .6, 1.4, 1.3), look: V(FX - 2.3, 1.25, -.2), fov: 38 }; });
// 42: mistake — gas stove on, door closed, manqal
B(42, (t, lt, k, s) => { S.setEnv('indoorDark', { hemi: .2 }); HUD = ['2-KUN · 10:00', '+9°C']; S.flames.forEach(f => f.visible = s >= 43); S.lights.candle.color.set('#7fb2ff'); candleAt(S.lights.candle, KX + .3, 1.2, -1.6, s >= 43 ? 1 : .3);
  S.kDoor.rotation.y = -ss(T0(43) + 1, T0(43) + 2, t) * 0 + (1 - ss(T0(43) + 1, T0(43) + 2.2, t)) * -1.2; S.manqal.visible = s >= 45; if (s >= 45) { candleAt(S.lights.candle2, KX + 1.2, .6, .2, .8); S.lights.candle2.color.set('#ff7a3a'); }
  put(hero, KX - .2, 0, -.9, Math.PI * .8); pose(hero, s >= 44 ? { ...POSES.open } : POSES.idle); hero.userData.setJacket(true); face(hero, { smile: s === 44 ? .6 : 0, blink: blinkAt(t) });
  if (s === 42) pq('XATO!', W / 2, 260, T0(42) + 1, { bg: C2.red, fg: '#fff', size: 100, rot: -4 });
  if (s >= 44 && s < 45) pq('«ISINIB OLAMIZ»', W * .7, 320, T0(44), { bg: '#fff' });
  return { pos: V(KX + 1.6, 1.9, 1.9), look: V(KX - .3, .9, -1.6), fov: 50 }; });
// 46: CO — invisible gas; molecules
B(46, (t, lt, k, s) => { if (s < 48) { S.setEnv('info'); COs.forEach((c, i) => { c.visible = true; c.position.set(Math.cos(i * 1.05 + t * .4) * 1.2, 1.4 + Math.sin(t + i) * .3, Math.sin(i * 1.05 + t * .4) * .8); c.scale.setScalar(2.2); c.rotation.set(t + i, t * .7, 0); });
    pq('IS GAZI (CO)', W / 2, 230, T0(46), { size: 76, bg: '#9aa0aa' }); if (s >= 47) pq("RANGI YO'Q · HIDI YO'Q", W / 2, 360, T0(47), { size: 56 });
    return { pos: V(IX, 2.0, 4.6), look: V(IX, 1.3, 0), fov: 36 }; }
  S.setEnv('indoorDark', { hemi: .2 }); S.flames.forEach(f => f.visible = true); S.coCloud.visible = true; S.lights.candle.color.set('#7fb2ff'); candleAt(S.lights.candle, KX + .3, 1.2, -1.6, 1);
  const thick = ss(T0(48), T1(51), t); S.coCloud.children.forEach((c, i) => { c.position.copy(c.userData.base).addScaledVector(V(Math.sin(t * .3 + i), Math.cos(t * .2 + i) * .3, 0), .3); setOpacity(c, .12 + thick * .3); });
  put(hero, KX + .2, 0, -.15, 0); const sleep = ss(T0(50), T0(50) + 1.5, t); pose(hero, mixPose(SIT, { ...SIT, torso: [.7, 0, 0], head: [.5, 0, .2], armL: [-1.2, 0, .3], elbowL: [-1.6, 0, 0], armR: [-1.2, 0, -.3], elbowR: [-1.6, 0, 0] }, sleep));
  hero.userData.setJacket(true); const yawn = s === 49 ? ss(T0(49), T0(49) + .8, t) * (1 - ss(T0(49) + 2, T0(49) + 2.6, t)) : 0; face(hero, { mouth: yawn, blink: s >= 49 ? clamp(.4 + sleep * .6 + yawn * .4) : blinkAt(t), brow: -.4 });
  look.vignette = .2 + thick * .9; if (s >= 49 && s < 51) pq('BOSH OG\'RIG\'I · UYQU', W * .7, 300, T0(49), { bg: '#fff' });
  return { pos: V(KX + 1.3 - k * .2, 1.5, 2.0 - k * .2), look: V(KX + .2, .95, 0), fov: 44 }; });
// 52: it's real, every winter
B(52, (t, lt, k, s) => { cityCam(t); S.setEnv('blackout'); S.setCity(0, .05); S.setLamps(false); S.weather(t, 0, 0, -20, .5); S.towerLight.visible = false;
  pq('HAR QISH', W / 2, 260, T0(53), { size: 90, bg: C2.red, fg: '#fff', rot: -3 }); if (s >= 54) pq('KO\'PINCHA — UYQUDA', W / 2, 400, T0(54), { bg: '#fff' });
  return { pos: V(6, 6 + lt * .1, -10 - lt * .3), look: V(16, 10, -24), fov: 40 }; });
// 55: rule 1 — open the fortochka
B(55, (t, lt, k, s) => { S.setEnv('indoorDark', { hemi: .24 }); S.flames.forEach(f => f.visible = s < 56); S.lights.candle.color.set('#7fb2ff'); candleAt(S.lights.candle, KX + .3, 1.2, -1.6, .8);
  S.coCloud.visible = true; const out = ss(T0(56), T0(56) + 3, t); S.coCloud.children.forEach((c, i) => { c.position.copy(c.userData.base).lerp(V(-.7, .4, -1.8), out * .8); setOpacity(c, .35 * (1 - out)); });
  S.fortochka.rotation.y = -ss(T0(56), T0(56) + 1, t) * 1.1; ruleQ = [1, "GAZ PLITA VA MANQAL\nBILAN ISITMA!", t - T0(55)];
  put(hero, KX - .8, 0, -1.2, Math.PI); pose(hero, s >= 56 ? POSES.pointUp : POSES.idle); hero.userData.setJacket(true);
  return { pos: V(KX + 1.2, 1.7, 1.6), look: V(KX - .4, 1.5, -2.0), fov: 46 }; });
// 57: street — traffic lights off, jam
B(57, (t, lt, k, s) => { S.setEnv('grey'); S.aimSun(0, 0, -40, 30); S.setCity(0, 0); S.setLamps(false); S.setTraffic('off'); S.setShop(false); S.weather(t, 0, 0, -38, .3);
  S.cars.forEach((c, i) => { c.userData.lights(true); c.position.set(i % 2 ? 2.4 : -2.4, 0, -20 - (i >> 1) * 5.5); c.rotation.y = i % 2 ? Math.PI : 0; });
  put(hero, 6.2, 0, -26 + lt * .6, Math.PI); hero.userData.setJacket(true); hero.userData.setBeanie(true); pose(hero, mixPose(POSES.idle, cycle(t), 1));
  if (s >= 59) pq('SVETOFOR ✗', W * .26, 300, T0(59), { bg: C2.red, fg: '#fff' }); if (s >= 60) pq('BENZIN ✗', W * .74, 300, T0(60), { bg: C2.red, fg: '#fff' });
  return { pos: V(9 - lt * .1, 4.2, -16 - lt * .3), look: V(0, 1.2, -40), fov: 46 }; });
// 61: shop — terminal dead, cash only, shelves empty
B(61, (t, lt, k, s) => { if (s === 62) { S.setEnv('grey'); S.aimSun(0, 0, -24, 20); S.setShop(false); put(hero, 6.0, 0, -24, -Math.PI / 2); hero.userData.setJacket(true); hero.userData.setBeanie(true); pose(hero, POSES.shrug);
    pq('BANKOMAT ✗', W * .7, 300, T0(62), { bg: C2.red, fg: '#fff' }); return { pos: V(3.6, 1.8, -21.5), look: V(7.4, 1.4, -24), fov: 40 }; }
  S.setEnv('indoorDark', { hemi: .28 }); candleAt(S.lights.candle, PX + 1.7, 1.6, 1.2, 1.8); S.termScreen.visible = false;
  put(hero, PX + .4, 0, 2.0, Math.PI - .6); hero.userData.setJacket(true); hero.userData.setBeanie(true); pose(hero, s >= 63 && s < 64 ? { ...POSES.talk } : POSES.idle); face(hero, { brow: -.4 });
  put(ona, PX + 2.0, 0, .3, 0); pose(ona, POSES.shrug);
  if (s >= 61 && s < 63) pq('TERMINAL ✗', W * .28, 300, T0(61) + 1, { bg: C2.red, fg: '#fff' }); if (s >= 64 && s < 66) pq('FAQAT NAQD 💵', W / 2, 260, T0(64), { size: 80 });
  if (s >= 66) { pq('SHAM · BATAREYKA · SUV · NON — TUGADI', W / 2, 260, T0(66), { size: 46, bg: '#fff' }); }
  return s >= 66 ? { pos: V(PX - 1, 2.2, 2.8), look: V(PX, 1.2, -2.6), fov: 50 } : { pos: V(PX + 2.9, 1.8, 3.3), look: V(PX + 1.4, 1.3, .6), fov: 44 }; });
// 67: day 3, pipes freeze and burst
B(67, (t, lt, k, s) => { S.setEnv('indoorDay', { tint: [.86, .94, 1.1], hemi: .5 }); S.aimSun(KX, 0, 0, 6, [-2, 6, -8]); HUD = ['3-KUN', '+3°C'];
  S.pipeIce.visible = s >= 69; S.pipeIce.scale.set(1, ss(T0(69), T1(69), t) + .01, 1); if (s >= 70 && t > T0(70) + 1.2) S.animSpray(t);
  if (s >= 70) pq('MUZ KENGAYADI → QUVUR YORILADI', W / 2, 260, T0(70), { size: 52 });
  return s < 69 ? { pos: V(KX - 1.5, 1.8, 2.0), look: V(KX + 1.5, 1.2, -2), fov: 48 } : { pos: V(KX + 1.4, 1.3, -.8), look: V(KX + 2.3, 1.0, -2.0), fov: 40 }; });
// 71: water from snow (balcony)
B(71, (t, lt, k, s) => { S.setEnv('day'); S.aimSun(BX, 0, 0, 8); S.weather(t, BX, 0, 0, .25, .05, 10);
  put(hero, BX - .5, .1, .2, .4); hero.userData.setJacket(true); hero.userData.setBeanie(true); pose(hero, s >= 74 ? POSES.dig : POSES.idle); face(hero, { blink: blinkAt(t) });
  bucket.visible = true; bucket.position.set(BX + .1, .1, .6);
  if (s >= 73 && s < 74) { pq("QORNI YEMA!", W * .3, 300, T0(73), { bg: C2.red, fg: '#fff', rot: -3 }); pq('TANANI SOVUTADI', W * .7, 420, T0(73) + 1, { bg: '#fff' }); }
  if (s >= 74) pq('QOR → IDISH → ERIT → QAYNAT', W / 2, 260, T0(74), { size: 52 });
  return { pos: V(BX + 1.8, 2.3, 3.6), look: V(BX - .2, .9, .2), fov: 44 }; });
// 75: fridge dead, balcony = free freezer
B(75, (t, lt, k, s) => { if (s < 77) { S.setEnv('indoorDay', { tint: [.88, .95, 1.08] }); S.aimSun(KX, 0, 0, 6, [-2, 6, -8]); S.fridgeDoor.rotation.y = -ss(T0(75), T0(75) + 1, t) * 1.6;
    put(hero, KX - .9, 0, -.2, -Math.PI * .45); hero.userData.setJacket(true); pose(hero, POSES.think); face(hero, { brow: -.3 });
    if (s >= 76) pq('BALKON = BEPUL MUZLATGICH', W / 2, 260, T0(76) + 1, { size: 56 }); return { pos: V(KX + .6, 1.6, -1.6), look: V(KX - 1.9, 1.1, -1.1), fov: 46 }; }
  S.setEnv('day'); S.aimSun(BX, 0, 0, 8); S.weather(t, BX, 0, 0, .25, .05, 10); put(hero, BX + .2, .1, .9, Math.PI * .9); hero.userData.setJacket(true); hero.userData.setBeanie(true);
  pose(hero, POSES.dig); S.meat.position.set(.8, .25 + (1 - ss(T0(77), T0(77) + 1.5, t)) * .6, .3); face(hero, { smile: .6 });
  if (s >= 78) pq('QISH — HAM DUSHMAN, HAM DO\'ST', W / 2, 260, T0(78), { size: 52, bg: '#fff' });
  return { pos: V(BX + 2.4, 2.3, 3.2), look: V(BX + .5, .7, .3), fov: 44 }; });
// 79: day 4 — mahalla comes outside
B(79, (t, lt, k, s) => { S.setEnv('day'); S.aimSun(YX, 0, 0, 16); HUD = ['4-KUN', '−8°C']; S.animSmoke(t); S.weather(t, YX, 0, 0, .15, .05, 14);
  put(bobo, YX + 3.0, 0, -1.2, -2.5); pose(bobo, POSES.talk); face(bobo, { mouth: Math.abs(Math.sin(t * 7)) * .5, blink: blinkAt(t, 2) });
  put(hero, YX + 1.4, 0, -.6, 1.4); hero.userData.setJacket(true); hero.userData.setBeanie(true); pose(hero, POSES.idle); face(hero, { smile: .5, blink: blinkAt(t) });
  put(ona, YX - 2.2, 0, -1.6, .8); pose(ona, POSES.talk); put(kampir, YX - 1.2, 0, -2.2, -.6); pose(kampir, POSES.idle);
  put(kid, YX - 2.2 + Math.sin(t) * .5, 0, 3.0, 2.5); kid.userData.setJacket(true); kid.userData.setBeanie(true); pose(kid, mixPose(POSES.idle, cycle(t, 1), .7));
  put(kid2, YX - 4.0, 0, 3.6, 1.0); kid2.userData.setJacket(true); pose(kid2, POSES.wave);
  return { pos: V(YX - 1 + k * 2, 3.2, 8.0 - k * 1.5), look: V(YX, 1.0, -2), fov: 46 }; });
// 83: sandal / tandir / qozon closeups
B(83, (t, lt, k, s) => { if (s === 83) { S.setEnv('indoorDark', { hemi: .2 }); candleAt(S.lights.candle, SX, 1.2, 0, 1.4); return { pos: V(SX + 2.4, 1.6, 2.4), look: V(SX, .5, 0), fov: 40 }; }
  S.setEnv('day'); S.aimSun(YX, 0, 0, 16); S.animSmoke(t); S.plov.visible = s >= 86;
  if (s === 84) { candleAt(S.lights.fire, YX - 4.2, .8, -2.6, .8); put(ona, YX - 3.0, 0, -3.9, -1.2); pose(ona, POSES.point); return { pos: V(YX - 2.6, 1.3, -1.0), look: V(YX - 4.2, .7, -3.4), fov: 38 }; }
  candleAt(S.lights.fire, YX + 3.6, .6, -1.8, .8); put(bobo, YX + 2.5, 0, -1.6, 2.2); pose(bobo, POSES.dig); put(hero, YX + 4.8, 0, -1.4, -2.0); hero.userData.setJacket(true); hero.userData.setBeanie(true); pose(hero, POSES.open);
  if (s >= 86) pq('BUTUN MAHALLA — BITTA OSH', W / 2, 260, T0(86), { size: 56 });
  return { pos: V(YX + 3.4 + Math.sin(lt * .2) * .5, 2.2, .9), look: V(YX + 3.6, .9, -2.6), fov: 40 }; });
// 87: family at the sandal, bobo tells stories
B(87, (t, lt, k, s) => { S.setEnv('indoorDark', { hemi: .14 }); candleAt(S.lights.candle, SX, 1.15, 0, 1.4); S.drawView(0, .04);
  for (const [p, x, z, r] of [[hero, 0, 1.55, Math.PI], [bobo, 0, -1.55, 0], [ona, 1.55, 0, -Math.PI / 2], [kid, -1.5, .5, Math.PI / 2], [kid2, -1.5, -.5, Math.PI / 2]]) { put(p, SX + x, -.05, z, r); pose(p, FLOORSIT); }
  face(bobo, { mouth: Math.abs(Math.sin(t * 6)) * .55, smile: .3, blink: blinkAt(t, 3) }); pose(bobo, { ...FLOORSIT, armL: [-.6, 0, .4], elbowL: [-1.2, 0, 0], armR: [-.5 + Math.sin(t * 2) * .2, 0, -.4], elbowR: [-1.3, 0, 0] });
  face(kid, { smile: .7, mouth: s >= 90 ? .3 : 0 }); face(ona, { smile: .5 });
  if (s >= 88 && s < 89) pq("TELEFON ✗ · TV ✗", W / 2, 260, T0(88), {});
  return s < 89 ? { pos: V(SX + 2.0, 2.0, 2.6), look: V(SX, .7, 0), fov: 46 } : { pos: V(SX + .9, 1.25, .5), look: V(SX, 1.15, -1.5), fov: 38 }; });
// 91: rumours
B(91, (t, lt, k, s) => { S.setEnv('dawn', { sun: 1.2, bg: '#9aa9c4' }); S.aimSun(YX, 0, 0, 16); S.weather(t, YX, 0, 0, .2, .05, 14);
  put(ona, YX - 1.0, 0, 1.6, 1.2); put(kampir, YX + .1, 0, 1.4, -1.6); pose(ona, POSES.talk); pose(kampir, POSES.worried); face(ona, { mouth: Math.abs(Math.sin(t * 9)) * .4, brow: -.5 }); face(kampir, { brow: -.8, mouth: .3 });
  ona.userData.setJacket(false);
  if (s >= 93) pq('«BIR OY KELMAS EKAN»', W * .3, 290, T0(93), { bg: '#c9ccd2', rot: -3 }); if (s >= 94) pq('«HAMMA JOYDA SHUNAQA EMISH»', W * .66, 420, T0(94), { bg: '#c9ccd2', rot: 2 });
  if (s >= 95) pq("QO'RQUV TEZ TARQALADI", W / 2, 580, T0(95), { bg: C2.red, fg: '#fff' });
  return { pos: V(YX - .4, 1.8, 4.6 - k), look: V(YX - .4, 1.4, 1.4), fov: 40 }; });
// 96: battery radio
B(96, (t, lt, k, s) => { S.setEnv('indoorDark', { hemi: .14 }); candleAt(S.lights.candle, SX, 1.15, 0, 1.4);
  for (const [p, x, z, r] of [[hero, 0, 1.55, Math.PI], [bobo, 0, -1.55, 0]]) { put(p, SX + x, -.05, z, r); pose(p, FLOORSIT); } face(bobo, { brow: -.2 });
  pq('BATAREYKALI RADIO = OLTIN', W / 2, 260, T0(96), { size: 56 }); if (s >= 97) pq('RASMIY XABAR', W * .72, 400, T0(97), { bg: '#7dd97a' });
  return { pos: V(SX + 1.0, 1.1, .4), look: V(SX + .4, .85, -.3), fov: 36 }; });
// 98: day 5 — cold inside, hypothermia
B(98, (t, lt, k, s) => { HUD = ['5-KUN · 03:00', '+2°C'];
  if (s < 100) { S.setEnv('indoorDark', { hemi: .14 }); S.drawView(0, .03); setFrost(.95); candleAt(S.lights.candle, FX - 1, .9, .2, .8); S.flameA.visible = true;
    put(kampir, FX - 2.4, .05, -.2, Math.PI / 2); pose(kampir, mixPose(SITHUG, shiver(t), .8)); face(kampir, { brow: -.8, blink: clamp(.3 + blinkAt(t)) }); S.blanket.visible = true;
    S.hands[0].rotation.z = -t * .05; S.hands[1].rotation.z = -t * .6; S.breath(t, V(FX - 2.15, 1.55, -.2), V(1, .15, 0));
    return { pos: V(FX + 1.0 - k * .5, 1.6, 2.4 - k * .6), look: V(FX - 2.0, 1.2, -.6), fov: 42 }; }
  S.setEnv('info'); props.thermo.visible = true; props.thermo.position.set(-.9, .5, 0); props.body.visible = true; props.body.position.set(.8, .5, 0); props.body.rotation.y = Math.sin(t * 40) * (s >= 101 && s < 103 ? .03 : 0);
  const temp = s >= 103 ? 32 : s >= 100 ? 35 : 37; pq(`${temp}°C`, W * .3, 330, T0(100), { bg: temp < 35 ? C2.red : C2.blue, fg: temp < 35 ? '#fff' : C2.ink, size: 90 });
  if (s >= 100 && s < 101) pq('GIPOTERMIYA', W * .7, 300, T0(100) + 1.5, { bg: '#fff' }); if (s >= 101 && s < 103) pq('QALTIRASH = ICHKI PECHKA', W * .66, 300, T0(102), { size: 50 });
  if (s >= 103) pq("QALTIRASH TO'XTASA — XAVF!", W * .64, 300, T0(103), { bg: C2.red, fg: '#fff', size: 50 }); if (s >= 104) pq('UYQU · BEFARQLIK', W * .66, 430, T0(104), { bg: '#fff' });
  return { pos: V(IX, 2.0, 5.2), look: V(IX, 1.3, 0), fov: 36 }; });
// 105: elders & kids at risk; rule 2 — check on neighbours (thermos)
B(105, (t, lt, k, s) => { S.setEnv('indoorDark', { hemi: .18 }); S.drawView(0, .03); setFrost(.95); candleAt(S.lights.candle, FX + .6, 1.5, 1.6, 1.6); S.flameA.visible = true;
  S.fDoor.rotation.y = s >= 107 ? ss(T0(107), T0(107) + 1.2, t) * 1.3 : 0;
  put(kampir, FX + 1.8, 0, .9, -Math.PI / 2 + .5); pose(kampir, mixPose(POSES.hug, shiver(t), .6)); face(kampir, { brow: -.6, smile: s >= 108 ? .5 : 0 });
  if (s >= 107) { put(hero, FX + 3.1 - ss(T0(107) + .8, T0(107) + 2, t) * .6, 0, 1.2, -Math.PI / 2); hero.userData.setJacket(true); hero.userData.setBeanie(true); thermos.visible = true; pose(hero, { ...POSES.idle, armL: [-1.0, 0, .2], elbowL: [-.8, 0, 0] }); face(hero, { smile: .5 });
    ruleQ = [2, "KEKSA QO'SHNILARDAN\nXABAR OL", t - T0(107)]; }
  if (s < 107) pq('KEKSALAR VA BOLALAR', W / 2, 260, T0(105), { bg: C2.red, fg: '#fff' });
  return { pos: V(FX - .6, 1.6, 2.6), look: V(FX + 2.4, 1.2, .8), fov: 44 }; });
// 109: rule 3 — one small room, quilts on windows, hats
B(109, (t, lt, k, s) => { S.setEnv('indoorDark', { hemi: .16 }); candleAt(S.lights.candle, SX, 1.15, 0, 1.4); S.winQuilt.visible = s >= 111;
  for (const [p, x, z, r] of [[hero, 0, 1.55, Math.PI], [bobo, 0, -1.55, 0], [ona, 1.55, 0, -Math.PI / 2], [kid, -1.5, .5, Math.PI / 2], [kid2, -1.5, -.5, Math.PI / 2], [kampir, 1.4, -1.3, -Math.PI * .75]]) { put(p, SX + x, -.05, z, r); pose(p, FLOORSIT); }
  if (s >= 112) { hero.userData.setBeanie(true); kid.userData.setBeanie(true); }
  ruleQ = [3, "HAMMA BITTA XONAGA!", t - T0(109)]; if (s >= 110 && s < 111) pq('KICHIK XONA = ISSIQ', W * .7, 470, T0(110), { bg: '#fff' });
  if (s >= 111 && s < 112) pq('DERAZAGA KO\'RPA', W * .7, 470, T0(111), { bg: '#fff' }); if (s >= 112) pq('BOSH KIYIM!', W * .7, 470, T0(112), { bg: '#fff' });
  return { pos: V(SX - 2.0, 2.2, 2.4), look: V(SX + .6, .8, -.2), fov: 50 }; });
// 113: day 7 — dawn, power returns
B(113, (t, lt, k, s) => { cityCam(t); S.setEnv('dawn'); S.aimSun(0, 0, -30, 40, [10, 8, -14]); HUD = ['7-KUN · 07:30', null]; const kk = s >= 115 ? ss(T0(115), T0(116) + 1, t) : 0;
  S.setCity(kk * .8, 0); S.setLamps(kk > .5); S.setTraffic(kk > .7 ? 'green' : 'off'); S.setShop(kk > .6); S.towerLight.visible = kk > .3;
  if (s >= 116) pq('SVET KELDI!', W / 2, 260, T0(116), { size: 110, bg: C2.yel, rot: -4 });
  return { pos: V(0, 6 + lt * .3, 20 - lt * .8), look: V(0, 9, -40), fov: 44 }; });
// 117: surge — sparks, darkness again
B(117, (t, lt, k, s) => { const out = s >= 120 && t > T0(120) + 1.3; flatPower(!out); S.drawView(out ? 0 : .8, 0);
  if (s >= 119 && !out) S.animSparks(t); put(hero, FX + 2.5, 0, -.7, -Math.PI * .75); pose(hero, s >= 120 ? POSES.worried : s >= 117 ? POSES.open : POSES.idle); face(hero, { brow: -.7, mouth: s >= 119 ? .6 : 0, raise: 1 });
  if (out) { S.lights.candle.position.set(FX + 1.5, 1.6, 0); S.lights.candle.color.set('#e8f0ff'); S.lights.candle.intensity = .8 * Math.PI; }
  if (s === 117) pq('SHOSHMA!', W / 2, 260, T0(117), { bg: C2.red, fg: '#fff', size: 100, rot: -3 });
  if (s >= 119) { [['ISITGICH', .2], ['KOTEL', .5], ['CHOYNAK', .8]].forEach(([tx, x], i) => pq(tx + ' ⚡', W * x, 300, T0(119) + i * .6, { bg: '#fff', size: 50 })); }
  if (out) pq('YANA O\'CHDI', W / 2, 460, T0(120) + 1.3, { bg: C2.red, fg: '#fff', size: 80 });
  return { pos: V(FX + .6, 1.5, .9), look: V(FX + 3.0, .9, -1.4), fov: 46 }; });
// 121: rule 4 — unplug everything
B(121, (t, lt, k, s) => { flatPower(false); S.lights.candle.position.set(FX + 2.6, 1.0, -1.0); S.lights.candle.intensity = 3 * Math.PI; S.flameA.visible = true;
  put(hero, FX + 2.6, 0, -1.5, -Math.PI / 2); pose(hero, { ...POSES.dig, torso: [.6, 0, 0], armR: [-1.4, 0, -.1], elbowR: [-.2, 0, 0] }); S.plug.position.z = .04 + ss(T0(121) + 1, T0(121) + 1.6, t) * .25;
  ruleQ = [4, "TEXNIKANI O'CHIR,\nKEYIN SEKIN YOQ", t - T0(121)];
  return { pos: V(FX + .3, 1.7, .5), look: V(FX + 3.0, .7, -1.5), fov: 46 }; });
// 123: summary — kit on the pedestal + 5 rules list
B(123, (t, lt, k, s) => { S.setEnv('info'); summary = t;
  const items = [[props.fonar, -.9, .1], [props.batt, -.3, -.2], [props.pbank, .3, .2], [props.cash, .9, -.1], [props.water, -.6, .7], [props.radio, .5, .7]];
  if (s >= 133) items.forEach(([o, x, z], i) => { const kk = ss(T0(133) + i * .5, T0(133) + i * .5 + .5, t); if (kk <= 0) return; o.visible = true; o.position.set(x, .5 + (1 - kk) * 1.5, z); o.rotation.y = t * .5 + i; o.scale.setScalar(Math.max(.01, kk)); });
  return s >= 133 ? { pos: V(IX, 2.6, 4.2), look: V(IX, .8, 0), fov: 36 } : { pos: V(IX - 2.5, 2.2, 6), look: V(IX - 2.2, 1.6, 0), fov: 40 }; });
// 134: kit costs less than internet
B(134, (t, lt, k, s) => { S.setEnv('info'); const items = [[props.fonar, -.9, .1], [props.batt, -.3, -.2], [props.pbank, .3, .2], [props.cash, .9, -.1], [props.water, -.6, .7], [props.radio, .5, .7]];
  items.forEach(([o, x, z], i) => { o.visible = true; o.position.set(x, .5, z); o.rotation.y = t * .3 + i; });
  if (s >= 134) pq("1 OYLIK INTERNETDAN ARZON", W / 2, 230, T0(134), { size: 56 }); if (s >= 135) pq('OILANGNI ASRAYDI ❤', W / 2, 360, T0(135), { bg: C2.red, fg: '#fff' });
  return { pos: V(IX + Math.sin(lt * .2) * 1.5, 2.3, 3.8), look: V(IX, .8, 0), fov: 38 }; });
// 136: outro — city lit, comments question
B(136, (t, lt, k, s) => { cityCam(t); S.setEnv('night'); S.setCity(.8, 0); S.setLamps(true); S.setTraffic('green'); S.setShop(true); S.weather(t, 0, 0, -20, .45);
  S.cars.forEach((c, i) => { c.userData.lights(true); c.position.set(i % 2 ? 2.4 : -2.4, 0, 10 - i * 6 + (i % 2 ? -1 : 1) * ((t * 4) % 6)); c.rotation.y = i % 2 ? Math.PI : 0; });
  if (s >= 136 && s < 139) pq('SIZDA NECHA SOAT? 👇', W / 2, 260, T0(136) + 1, { size: 70 }); if (s >= 140) pq('LAYK · OBUNA', W / 2, 260, T0(140), { bg: C2.red, fg: '#fff', size: 80 });
  return { pos: V(0, 3 + lt * .9, 14 + lt * 1.1), look: V(0, 6 + lt * .2, -40), fov: 44 }; });

let plateQ0 = null;
BEATS.forEach((b, i) => { b.t0 = i === 0 ? 0 : T0(b.a) - .12; });
BEATS.forEach((b, i) => { b.t1 = i < BEATS.length - 1 ? BEATS[i + 1].t0 : DUR; });
function sIdx(t) { let r = 0; for (const s of SEN) if (t >= s.t0 + PRE - .12) r = s.i; return r; }
const RULES = [[124, "GAZ PLITA BILAN ISITMA"], [126, "KEKSALARDAN XABAR OL"], [128, "BITTA XONAGA YIG'ILING"], [130, "TEXNIKANI O'CHIRIB QO'Y"], [132, "ZAXIRA: FONAR, PUL, SUV"]];
export function renderFrame(f) {
  const t = f / FPS; resetAll(); plateQ = []; ruleQ = null; HUD = null; title = 0; summary = -1;
  const b = BEATS.find(b => t >= b.t0 && t < b.t1) || BEATS[BEATS.length - 1];
  const lt = t - b.t0, k = clamp(lt / (b.t1 - b.t0)), s = sIdx(t);
  const cam = b.fn(t, lt, k, s);
  camera.position.copy(cam.pos); camera.fov = VERT ? 2 * Math.atan(Math.tan(cam.fov * Math.PI / 360) * 1.75) * 180 / Math.PI : cam.fov; camera.lookAt(cam.look); camera.updateProjectionMatrix();
  draw(scene, { t: f });
  og.clearRect(0, 0, W, H);
  if (QP.get('clean')) return frameOut();
  if (HUD) hud(HUD[0], HUD[1]);
  for (const [txt, x, y, ts, o] of plateQ) plate(txt, x, y, { size: txt.length > 22 ? 50 : 62, ...o, k: ss(ts, ts + .4, t) });
  if (ruleQ) ruleCard(ruleQ[0], ruleQ[1], ss(0, .45, ruleQ[2]));
  if (title > 0) titleCard(title);
  if (summary >= 0 && s < 133) { plate('5 QOIDA', W / 2, 200, { k: 1, size: 70, bg: C2.red, fg: '#fff' }); RULES.forEach(([si, txt], i) => { if (t >= T0(si) - .1) plate(`${i + 1}. ${txt}`, W / 2, 320 + i * 112, { k: ss(T0(si) - .1, T0(si) + .3, t), size: 50, bg: '#fff' }); }); }
  if (summary >= 0 && s >= 133) plate('ZAXIRA', W / 2, 200, { k: ss(T0(133), T0(133) + .4, t), size: 70, bg: C2.yel });
  captions(t);
  return frameOut();
}
const tCandle = new THREE.Group(); at(cyl(.035, .035, .2, '#f4efe2', 12), 0, .1, 0, tCandle); const tFl = at(sph(.035, '#ffcf70', { glow: true, glowK: 3, cast: false, noEdge: true }), 0, .25, 0, tCandle); tFl.scale.set(1, 1.9, 1); tCandle.visible = false; scene.add(tCandle);
function thumbFrame() {
  const t = 3; resetAll(); look.vignette = .9;
  S.setEnv('indoorDark', { hemi: .03 }); S.setFlatPower(false); S.aimSun(FX, 0, 0, 6, [2, 8, 6]); S.drawView(0, .05); setFrost(.6);
  heroSofa(); hero.userData.setBeanie(true); hero.userData.setJacket(true); S.blanket.visible = true;
  pose(hero, mixPose(SITHUG, { ...SITHUG, head: [-.12, 0, 0], torso: [.05, 0, 0], armL: [-.7, 0, -.3], elbowL: [-1.6, 0, 0], armR: [-.7, 0, .3], elbowR: [-1.6, 0, 0] }, 1)); face(hero, { brow: -1, raise: 1, mouth: .9, look: [0, 0] });
  tCandle.visible = true; tCandle.position.set(FX - 1.75, .82, .12); tCandle.scale.setScalar(.75); S.lights.candle.color.set('#ffa64a'); candleAt(S.lights.candle, FX - 1.6, 1.15, .1, 1.3);
  S.lights.candle2.color.set('#5f86d8'); candleAt(S.lights.candle2, FX - 1.2, 2.2, -2.4, .8);
  camera.position.set(FX + .1, 1.5, -.2); camera.fov = 34; camera.lookAt(FX - 2.4, 1.15, .6); camera.updateProjectionMatrix();
  draw(scene, { t: 90 }); og.clearRect(0, 0, W, H);
  const big = (txt, x, y, sz, bg, fg, rot) => { og.save(); og.translate(x, y); og.rotate(rot * Math.PI / 180); og.font = `900 ${sz}px InterX`; const w = og.measureText(txt).width + sz * .6, h = sz * 1.2;
    og.fillStyle = '#15121a'; og.fillRect(-w / 2 + 14, -h / 2 + 14, w, h); og.fillStyle = bg; og.fillRect(-w / 2, -h / 2, w, h); og.lineWidth = 10; og.strokeStyle = '#15121a'; og.strokeRect(-w / 2, -h / 2, w, h);
    og.fillStyle = fg; og.textAlign = 'center'; og.textBaseline = 'middle'; og.fillText(txt, 0, sz * .05); og.restore(); };
  big('7 KUN', 430, 290, 230, '#e8473a', '#ffffff', -4);
  big('SVETSIZ', 470, 560, 170, '#ffd33d', '#15121a', 2);
  big('−15°C', 330, 830, 120, '#7cc4ff', '#15121a', -3);
  return frameOut(.95);
}
if (QP.get('thumb')) window.renderFrame = thumbFrame; else window.renderFrame = renderFrame;

window.ready = true;
