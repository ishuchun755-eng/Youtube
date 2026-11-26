// «Agar butun O'zbekistonda 7 kun svet o'chsa» — comic-3D, synced to timeline.json
import { THREE, camera, draw, frameOut, og, W, H, clamp, lerp, ss, ease, at, G, setOpacity, setColor, look, M, sph, cyl, rbox, box, cone } from './comic.js';
import * as S from './sets.js';
import * as PR from './props.js';
import { makePerson, pose, face, POSES, mixPose, cycle, blinkAt } from './odam.js';
const TL = await (await fetch('timeline6.json')).json(); const SEN = TL.S;
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
// ===== SHORT 6: «Лифт сорвался» =====
let OV = null;
const EX = 1000, FL = 3.0;
const E = G(scene, EX, 0, 0);
const mkTex = (w, h, fn) => { const cv = document.createElement('canvas'); cv.width = w; cv.height = h; fn(cv.getContext('2d'), w, h); const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; return t; };
// shaft: back wall, side walls, floor slabs + numbers, rails
at(box(4.6, 66, .2, '#7d848e'), 0, 31, -1.4, E); at(box(.2, 66, 3, '#6d747e'), -2.3, 31, 0, E); at(box(.2, 66, 3, '#6d747e'), 2.3, 31, 0, E); at(box(4.6, .4, 3, '#4a4f58'), 0, -.2, 0, E);
for (let i = 1; i <= 20; i++) { const y = (i - 1) * FL; at(box(4.6, .25, .3, '#5c636d'), 0, y, -1.25, E);
  const tx = mkTex(128, 96, (g, w, h) => { g.fillStyle = '#f3f3f3'; g.fillRect(0, 0, w, h); g.fillStyle = '#15121a'; g.font = '900 72px InterX'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(String(i), w / 2, h / 2 + 4); });
  at(M(new THREE.PlaneGeometry(.6, .45), '#ffffff', { map: tx, noEdge: true, cast: false }), -1.7, y + 2.2, -1.28, E); }
for (const x of [-1.25, 1.25]) at(box(.12, 66, .12, '#3a3d44'), x, 31, -.9, E);
// cabin
const cab = G(E, 0, 0, 0); const CW = 2.0, CH = 2.5, CD = 2.2, CC = '#c9ccd2';
at(box(CW, .1, CD, '#8a8f98'), 0, 0, 0, cab); at(box(CW, .1, CD, CC), 0, CH, 0, cab); at(box(CW, CH, .08, CC), 0, CH / 2, -CD / 2, cab); at(box(.08, CH, CD, CC), -CW / 2, CH / 2, 0, cab); at(box(.08, CH, CD, CC), CW / 2, CH / 2, 0, cab);
const cabLamp = at(box(.8, .04, .4, '#fff6dc', { glow: true, glowK: 1.4, cast: false }), 0, CH - .06, 0, cab);
const ind = mkTex(160, 80, () => {}); const indM = at(M(new THREE.PlaneGeometry(.4, .2), '#ffffff', { map: ind, noEdge: true, cast: false, glow: true, glowK: 1 }), .55, CH - .35, -CD / 2 + .05, cab);
function setInd(txt, col = '#ff5a4a') { const cv = ind.image, g = cv.getContext('2d'); g.fillStyle = '#121418'; g.fillRect(0, 0, cv.width, cv.height); g.fillStyle = col; g.font = '900 60px InterX'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(txt, cv.width / 2, cv.height / 2 + 3); ind.needsUpdate = true; }
const cabL = new THREE.PointLight('#fff1d6', 0, 6, 1.4); at(cabL, 0, CH - .3, .3, cab); scene.add(new THREE.Object3D());
const shoes = []; for (const x of [-1.25, 1.25]) shoes.push(at(box(.18, .35, .25, '#e3a64a'), x, .3, -.9, cab));
const sparksE = G(cab, 0, .3, -.9); for (let i = 0; i < 24; i++) at(sph(.03, '#ffe27a', { glow: true, glowK: 3, cast: false, noEdge: true }, 6, 4), 0, 0, 0, sparksE);
function sparkAnim(t) { sparksE.visible = true; sparksE.children.forEach((s, i) => { const side = i % 2 ? 1.25 : -1.25, p = (t * 4 + i / 24) % 1, a = i * 2.3; s.position.set(side + Math.cos(a) * p * .5, p * 1.2 - p * p * 1.6, .1 + Math.sin(a) * p * .3); s.scale.setScalar(1.3 - p); }); }
// cables (4) from cabin top up the shaft; broken stubs
const cables = []; for (let i = 0; i < 4; i++) { const c = at(cyl(.025, .025, 1, '#2a2c31', 6), -.3 + i * .2, 0, 0, E); cables.push(c); }
function setCables(cabY, topY, hl = -1) { cables.forEach((c, i) => { const y0 = cabY + CH, len = Math.max(.01, topY - y0); c.visible = len > .02; c.scale.y = len; c.position.y = y0 + len / 2; setColor(c, i === hl ? '#ffd33d' : '#2a2c31'); }); }
const UP = 63;
// hero helpers
const JUMPP = { ...POSES.idle, legL: [-.9, 0, .05], legR: [-.9, 0, -.05], kneeL: 1.5, kneeR: 1.5, torso: [.3, 0, 0], armL: [.5, 0, -.3], armR: [.5, 0, .3] };
const COVER = { ...POSES.idle, armL: [-2.7, 0, -.5], elbowL: [-1.9, 0, 0], armR: [-2.7, 0, .5], elbowR: [-1.9, 0, 0] };
function heroIn(cy, dy = 0, ry = 0) { put(hero, EX, cy + .05 + dy, .15, ry); hero.userData.setJacket(true); hero.userData.setBeanie(true); }
function lie(cy, cover) { put(hero, EX, cy + .16, .9, 0); hero.rotation.set(-Math.PI / 2, 0, 0); hero.userData.setJacket(true); hero.userData.setBeanie(true); pose(hero, cover ? COVER : POSES.idle); }
function shaft(cy, on = true) { S.setEnv('indoorDark', { hemi: .35, bg: '#141820' }); cab.position.y = cy; cabL.intensity = on ? 5 * Math.PI : 0; setColor(cabLamp, on ? '#fff6dc' : '#3a3d44'); }
function hook(t, txt) { if (t < 2.4) pq(txt, W / 2, 150, .05, { bg: C2.red, fg: '#fff', size: 84, rot: -3, abs: 1 }); }
function streaks(t, a) { if (a <= 0) return; og.save(); og.globalAlpha = .55 * a; og.strokeStyle = '#ffffff'; og.lineWidth = 4; for (let i = 0; i < 26; i++) { const x = (i * 197.3) % W, y = ((i * 311.7 + t * 3200) % (H + 400)) - 200; og.beginPath(); og.moveTo(x, y); og.lineTo(x, y - 160 - (i % 5) * 40); og.stroke(); } og.restore(); }
function bars(t, t0) { const k = ss(t0, t0 + .8, t), k2 = ss(t0 + 2.2, t0 + 2.9, t); const x0 = 140, y = 1010, wmax = W - 280; og.save();
  og.fillStyle = 'rgba(21,18,26,.85)'; og.fillRect(x0 - 40, y - 120, wmax + 80, 330); og.font = '900 40px InterX'; og.fillStyle = '#fff'; og.fillText('КАБИНА', x0, y - 60); og.fillText('ТВОЙ ПРЫЖОК', x0, y + 70);
  og.fillStyle = C2.red; og.fillRect(x0, y - 40, wmax * k, 60); og.fillStyle = C2.yel; og.fillRect(x0, y + 90, wmax * (10 / 120) * k2, 60);
  og.fillStyle = '#fff'; og.font = '900 46px InterX'; if (k > .9) og.fillText('120 км/ч', x0 + wmax - 210, y - 60); if (k2 > .9) og.fillText('10 км/ч', x0 + wmax * (10 / 120) + 30, y + 135); og.restore(); }
const fallY = (u) => (19 * FL) * (1 - u * u); // u 0..1 from top floor to bottom
let SHAKE = 0;
// 0: cable snaps at floor 20
B(0, (t, lt, k, s) => { const snap = t > .9; const u = snap ? clamp((t - .9) / 7) : 0; const cy = fallY(u * .12); shaft(cy); setInd('20');
  setCables(cy, snap ? cy + CH + 1.5 + (t - .9) * 6 : UP); heroIn(cy); pose(hero, snap ? POSES.worried : POSES.phone); face(hero, { brow: snap ? -1 : 0, raise: snap ? 1 : 0, mouth: snap ? .8 : 0 });
  hook(t, 'ЛИФТ СОРВАЛСЯ'); if (snap) SHAKE = .06;
  return { pos: V(EX + 2.6, cy + 2.0, 4.2), look: V(EX, cy + 1.8, 0), fov: 46 }; });
// 1–2: inside, falling — jump at the last second? NO.
B(1, (t, lt, k, s) => { const cy = fallY(.2 + lt * .04); shaft(cy); setCables(cy, cy + CH + 4); setInd(String(Math.max(1, 20 - Math.floor(lt * 3))));
  const jump = s >= 2 ? Math.sin(clamp((t - T0(2)) / .7) * Math.PI) * .45 : 0; heroIn(cy, jump); pose(hero, s >= 2 ? JUMPP : POSES.idle); face(hero, { brow: -1, mouth: .5, raise: 1 });
  OV = () => streaks(t, 1); SHAKE = .03;
  pq('ПРЫГНУТЬ\nВ ПОСЛЕДНИЙ МИГ?', W / 2, 100, T0(1) + .1, { size: 64 }); if (s >= 2) pq('НЕТ ✗', W / 2, 700, T0(2), { size: 150, bg: C2.red, fg: '#fff', rot: -4 });
  return { pos: V(EX + .25, cy + 1.25, 2.6), look: V(EX, cy + 1.25, -.4), fov: 58 }; });
// 3–4: speed bars while cabin falls through floors
B(3, (t, lt, k, s) => { const cy = fallY(.35 + lt * .1); shaft(cy); setCables(cy, cy + CH + 6); heroIn(cy); pose(hero, POSES.worried); face(hero, { brow: -1, raise: 1, mouth: .6 });
  OV = () => { streaks(t, .8); bars(t, T0(3) + .2); }; SHAKE = .02;
  return { pos: V(EX + 3.4, cy + 2.0, 5.2), look: V(EX, cy + 1.2, 0), fov: 46 }; });
// 5: impact almost the same
B(5, (t, lt, k, s) => { const u = clamp(.82 + lt * .25); const cy = fallY(u); shaft(cy, lt < .45); setCables(cy, cy + CH + 6); heroIn(cy); pose(hero, POSES.worried);
  const hit = lt > .45; if (hit) { SHAKE = .25 * Math.exp(-(lt - .45) * 5); OV = () => { og.save(); og.globalAlpha = clamp(1 - (lt - .45) * 2.5); og.fillStyle = '#fff'; og.fillRect(0, 0, W, H); og.restore(); }; }
  pq('ПОЧТИ ТОТ ЖЕ УДАР', W / 2, 500, T0(5) + .45, { bg: C2.red, fg: '#fff', size: 66, rot: 2 });
  return { pos: V(EX + 3.0, cy + 1.8, 5.0), look: V(EX, cy + 1.0, 0), fov: 48 }; });
// 6: you don't know when the bottom comes
B(6, (t, lt, k, s) => { const cy = fallY(.5); shaft(cy); cabL.intensity = (1.2 + .8 * Math.sin(t * 23)) * Math.PI; setCables(cy, cy + CH + 6); setInd('??'); heroIn(cy); pose(hero, POSES.worried); face(hero, { look: [Math.sin(t * 2) * .6, .2], brow: -1, raise: 1 });
  OV = () => streaks(t, .6); SHAKE = .02; pq('КОГДА ДНО? 🤷', W / 2, 100, T0(6) + .3, { size: 72 });
  return { pos: V(EX + .2, cy + 1.6, 2.2), look: V(EX, cy + 1.4, -.5), fov: 56 }; });
// 7: what to do?
B(7, (t, lt, k, s) => { const cy = 30; shaft(cy); setCables(cy, cy + CH + 6); heroIn(cy); pose(hero, POSES.think);
  pq('ЧТО ДЕЛАТЬ?', W / 2, 110, T0(7) - .1, { size: 110, bg: C2.yel, rot: -3 });
  return { pos: V(EX + .2, cy + 1.5, 2.3), look: V(EX, cy + 1.3, -.4), fov: 52 }; });
// 8–10: lie flat on the back, impact spread, cover head (top-down)
B(8, (t, lt, k, s) => { const cy = 30; shaft(cy); setCables(cy, cy + CH + 6); lie(cy, s >= 10); face(hero, { brow: -.5, mouth: .2 });
  pq('ЛЕЧЬ НА СПИНУ', W / 2, 330, T0(8) + .2, { size: 70, bg: C2.yel });
  if (s >= 9) OV = () => { og.save(); const a = .35 + .25 * Math.sin(t * 6); og.fillStyle = `rgba(255,90,74,${a})`; og.beginPath(); og.ellipse(W / 2, H * .5, 260, 640, 0, 0, 7); og.fill(); og.restore(); };
  if (s >= 9) pq('УДАР → НА ВСЁ ТЕЛО', W / 2, 460, T0(9) + .2, { size: 54, bg: '#fff' }); if (s >= 10) pq('ЗАКРОЙ ГОЛОВУ 🙌', W / 2, 590, T0(10), { size: 60, bg: C2.red, fg: '#fff' });
  return { pos: V(EX + .05, cy + 2.32, 1.0), look: V(EX, cy, -.2), fov: 72 }; });
// 11: several cables — each holds alone
B(11, (t, lt, k, s) => { const cy = 30; shaft(cy); const hl = Math.floor(lt * 1.2) % 4; setCables(cy, UP, hl); heroIn(cy); pose(hero, POSES.idle);
  pq('НЕСКОЛЬКО ТРОСОВ', W / 2, 330, T0(11) + .3, { size: 64, bg: '#fff' }); pq('КАЖДЫЙ ДЕРЖИТ\nКАБИНУ ОДИН 💪', W / 2, 480, T0(11) + 2.3, { size: 58, bg: C2.yel });
  return { pos: V(EX + 2.6, cy + 1.0 + lt * .5, 4.2), look: V(EX, cy + 4.5, 0), fov: 52 }; });
// 12: safety catchers — sparks, cabin stops
B(12, (t, lt, k, s) => { const v = Math.max(0, 1 - lt / 3); const cy = 12 - (lt < 3 ? lt * 3 - lt * lt * .5 : 4.5); shaft(cy); setCables(cy, cy + CH + 3); heroIn(cy); pose(hero, POSES.worried);
  shoes.forEach(sh => setColor(sh, v > 0 ? '#ff8a3a' : '#e3a64a')); if (v > 0) { sparkAnim(t); SHAKE = .03 * v; }
  pq('ЛОВИТЕЛИ', W / 2, 330, T0(12) + .2, { size: 70, bg: C2.red, fg: '#fff' }); pq('С 1853 ГОДА', W / 2, 460, T0(12) + 2.4, { size: 66, bg: C2.yel });
  return { pos: V(EX + 2.2, cy + .9, 3.0), look: V(EX + .6, cy + .4, -.9), fov: 48 }; });
// 13: almost never falls + outro
B(13, (t, lt, k, s) => { const cy = 7.5; shaft(cy); setCables(cy, UP); heroIn(cy); pose(hero, POSES.open); face(hero, { mouth: .3, raise: .4 }); setInd('3', '#7dff8a');
  pq('ПОЧТИ НИКОГДА ✓', W / 2, 100, T0(13), { size: 74, bg: C2.yel, rot: -2 });
  if (t > T1(13) + .05) { pq('Doni Story', W / 2, 1150, T1(13) + .05, { size: 70, bg: '#fff', abs: 1 }); pq('ПОДПИШИСЬ 🔔', W / 2, 1290, T1(13) + .25, { size: 64, bg: C2.red, fg: '#fff', abs: 1 }); }
  return { pos: V(EX + .3, cy + 1.6, 2.6 - lt * .1), look: V(EX, cy + 1.3, -.4), fov: 52 }; });

BEATS.forEach((b, i) => { b.t0 = i === 0 ? 0 : T0(b.a) - .12; });
BEATS.forEach((b, i) => { b.t1 = i < BEATS.length - 1 ? BEATS[i + 1].t0 : DUR; });
function sIdx(t) { let r = 0; for (const s of SEN) if (t >= s.t0 + PRE - .12) r = s.i; return r; }
export function renderFrame(f) {
  const t = f / FPS; resetAll(); plateQ = []; HUD = null; OV = null; SHAKE = 0; sparksE.visible = false; setInd('20'); hero.rotation.set(0, 0, 0);
  const b = BEATS.find(b => t >= b.t0 && t < b.t1) || BEATS[BEATS.length - 1];
  const lt = t - b.t0, k = clamp(lt / (b.t1 - b.t0)), s = sIdx(t);
  const cam = b.fn(t, lt, k, s);
  if (SHAKE) { cam.pos.x += Math.sin(t * 71) * SHAKE; cam.pos.y += Math.sin(t * 53 + 1) * SHAKE; }
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
