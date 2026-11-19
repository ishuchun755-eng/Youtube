import { THREE, renderer, renderComposite, post, clamp, ss, eout, ein, back, lerp, noise1, blinkAt, talkAt, FONT } from './engine.js';
import { scene, SETS, showSet, ROOM, STREET, SHOP, LIB, HALL, makePhone } from './sets.js';

const SENT = await (await fetch('sentences.json')).json();
export const PRE = 2.5;
const VOICE_END = SENT[SENT.length - 1].end;
export const DUR = +(PRE + VOICE_END + 5.5).toFixed(2);
const S = i => SENT[i].start; const E = i => SENT[i].end;
const qfrac = i => { const tx = SENT[i].text; const k = tx.indexOf('"'); return k > 3 ? k / tx.length : 0; };

// ---------------------------------------------------------------- speakers
const JL = [16, 17, 31, 32, 33, 36, 37, 42, 45, 54, 55, 64], OL = [35, 38, 39, 40, 41, 43, 46, 56, 57, 61, 62, 65, 66, 70, 71];
function speaking(list, v) { for (const i of list) { const a = S(i) + (E(i) - S(i)) * qfrac(i); if (v >= a && v <= E(i)) return true; } return false; }

// ---------------------------------------------------------------- freeze / run time (voice time v)
const UNFREEZE = 55.5;
const FROZEN = [[24.0, UNFREEZE], [64.41, 9999]];
const isFrozen = v => FROZEN.some(([a, b]) => v >= a && v < b);
function runAt(v) { let r = 0, last = -PRE; for (const [a, b] of FROZEN) { if (v <= a) return r + (v - last); r += a - last; if (v < b) return r; last = b; } return r + (v - last); }
function freezeVis(v) {
  if (!isFrozen(v)) { const d = v - UNFREEZE; return d > 0 && d < 0.5 ? (1 - d / 0.5) * 0.6 : 0; }
  let base = v >= 177.3 ? 0.2 : 0.32;
  for (const [a] of FROZEN) { const d = v - a; if (d >= 0 && d < 1.2) base = Math.max(base, 1 - d / 1.2 * (1 - base)); }
  return base;
}

// ---------------------------------------------------------------- helpers
function reset(p, opt = {}) {
  const st = p.userData.state;
  Object.assign(st, { sit: 0, walk: 0, walkAmt: 0, armUp: [0, 0], armOut: [0.08, 0.08], yaw: 0, headYaw: 0, headPitch: 0, talk: 0, blink: 0, brow: 0, eyeS: 1, look: [0, 0], lean: 0, frozen: false }, opt);
  p.visible = true; return st;
}
const V3 = (x, y, z) => new THREE.Vector3(x, y, z);
function camPath(lt, d, p0, p1, l0, l1, f0 = 35, f1 = f0, ease = ss) {
  const k = ease(lt / d);
  return { pos: p0.clone().lerp(p1, k), look: l0.clone().lerp(l1 || l0, k), fov: lerp(f0, f1, k) };
}
const hand = (amt = 1) => ({ shake: amt });

// ---------------------------------------------------------------- props created here
const hallPhone = makePhone(); HALL.g.add(hallPhone); hallPhone.scale.setScalar(0.45);
const bill = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.14, 0.01), new THREE.MeshBasicMaterial({ color: 0x5abf6a })); STREET.g.add(bill);
const bag = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.4, 0.2), new THREE.MeshToonMaterial({ color: 0xc08a50 })); STREET.g.add(bag);

// ---------------------------------------------------------------- shots
// each: [startV, set, fn(ctx, lt, d, v) -> camera {pos, look, fov, shake}]
const SH = [];
const shot = (t0, set, fn) => SH.push({ t0, set, fn });

// TITLE (pre-roll)
shot(-PRE, 'ROOM', (c, lt, d) => {
  c.tod = 'night'; c.phoneGlow = 1.5; c.phoneState = ['time', { time: '25:00', glitch: true, g: Math.sin(lt * 40) * 30 }]; c.clockSec = 3 * 3600 - 30;
  reset(ROOM.J, { sit: 1, lean: -1.45, blink: 1 }); ROOM.J.position.set(-2.6, 0.06, -2.85);
  c.overlay = 'title';
  return camPath(lt, d, V3(0.6, 1.5, 0.4), V3(-0.55, 1.05, -1.95), V3(-1.45, 0.6, -2.9), V3(-1.45, 0.62, -2.9), 40, 34);
});
// s0 morning wake
shot(0, 'ROOM', (c, lt, d, v) => {
  c.tod = 'morning'; c.clockSec = 8 * 3600 + v;
  const st = reset(ROOM.J, { sit: 1 }); ROOM.J.position.set(-2.6, 0.06, -2.85);
  const k = clamp(lt / 1.6); st.lean = lerp(-1.45, 0, ss(k)); st.armUp = [lerp(0, 2.6, ss((lt - 1.4) / 1)) * (lt < 3.4 ? 1 : 1 - ss((lt - 3.4) / 0.8)), 0]; st.armUp[1] = st.armUp[0];
  st.blink = lt < 1.8 ? 1 : blinkAt(v); st.talk = lt > 2 && lt < 3 ? 0.6 : 0;
  return camPath(lt, d, V3(1.6, 1.9, 2.6), V3(1.0, 1.75, 1.9), V3(-2.4, 1.0, -2.4), V3(-2.5, 1.35, -2.5), 38);
});
function phoneInsert(c, lt, d, state, push = 0.25) {
  ROOM.J.visible = false; ROOM.phone.position.set(-2.4, 0.86, -1.6); ROOM.phone.rotation.set(-Math.PI / 2 + 0.35, 0, 0.1);
  c.phoneState = state;
  return camPath(lt, d, V3(-2.38, 1.5, -0.95), V3(-2.39, 1.42 - push * 0.3, -1.1 - push * 0.4), V3(-2.4, 0.9, -1.6), null, 28, 24);
}
shot(S(1) - 0.1, 'ROOM', (c, lt, d) => { c.tod = 'morning'; return phoneInsert(c, lt, d, ['time', { time: '08:00' }]); });
shot(S(2) - 0.1, 'ROOM', (c, lt, d, v) => {
  c.tod = 'morning'; const st = reset(ROOM.J, { sit: 1, brow: 0.8, look: [0.3, -0.8], headPitch: 0.25, armUp: [0, 0.9], blink: blinkAt(v) }); ROOM.J.position.set(-2.6, 0.06, -2.85);
  return camPath(lt, d, V3(-1.7, 1.75, -1.3), V3(-1.85, 1.72, -1.6), V3(-2.58, 1.6, -2.75), null, 32);
});
// s3 flashback night: phone dies at 03:00
shot(S(3) - 0.1, 'ROOM', (c, lt, d, v) => {
  c.tod = 'night'; c.overlay = 'kecha'; c.clockSec = 3 * 3600 - 3 + lt;
  reset(ROOM.J, { sit: 1, lean: -1.45, blink: 1 }); ROOM.J.position.set(-2.6, 0.06, -2.85);
  ROOM.phone.position.set(-1.45, 0.625, -2.9); ROOM.phone.rotation.set(-Math.PI / 2, 0, 0);
  const k = lt / d; c.phoneState = k < 0.3 ? ['time', { time: '02:59', date: 'Kecha' }] : k < 0.62 ? ['time', { time: '03:00', date: 'Kecha' }] : ['off'];
  c.phoneGlow = k < 0.62 ? 1.6 : 0; c.flashSmall = Math.abs(k - 0.62) < 0.02 ? 0.25 : 0;
  return camPath(lt, d, V3(-1.2, 1.25, -2.0), V3(-1.3, 1.0, -2.35), V3(-1.48, 0.63, -2.9), V3(-1.5, 0.64, -2.9), 34, 30);
});
shot(S(4) - 0.1, 'ROOM', (c, lt, d) => { c.tod = 'morning'; return phoneInsert(c, lt, d, ['time', { time: '03:01', glitch: lt > 1.5, g: Math.sin(lt * 33) * 40 }], 0.5); });
shot(S(5) - 0.1, 'ROOM', (c, lt, d, v) => {
  c.tod = 'morning'; const st = reset(ROOM.J, { sit: 1, blink: blinkAt(v) }); ROOM.J.position.set(-2.6, 0.06, -2.85);
  const k = Math.sin(clamp(lt / 1.4) * Math.PI); st.armOut = [0.08 + k * 0.9, 0.08 + k * 0.9]; st.armUp = [k * 0.3, k * 0.3]; st.headYaw = 0.2 * k; st.brow = -0.3;
  return camPath(lt, d, V3(-1.0, 1.6, -0.7), V3(-1.2, 1.62, -1.0), V3(-2.6, 1.4, -2.8), null, 34);
});
// s6 night wake up suddenly
shot(S(6) - 0.1, 'ROOM', (c, lt, d, v) => {
  c.tod = 'night'; c.clockSec = 3 * 3600 - (S(7) + 0.3 - v); c.phoneState = ['off'];
  const st = reset(ROOM.J, { sit: 1 }); ROOM.J.position.set(-2.6, 0.06, -2.85);
  const k = eout(clamp((lt - 0.5) / 0.45)); st.lean = lerp(-1.45, 0.05, k); st.blink = lt < 0.5 ? 1 : 0; st.eyeS = 1 + 0.25 * k; st.brow = k;
  return camPath(lt, d, V3(-0.9, 1.3, -1.4), V3(-1.1, 1.45, -1.6), V3(-2.5, 0.95, -2.8), V3(-2.6, 1.45, -2.8), 38, 34);
});
shot(S(7) - 0.12, 'ROOM', (c, lt, d, v) => {
  c.tod = 'night'; c.clockSec = Math.min(3 * 3600, 3 * 3600 - (S(7) + 0.3 - v));
  return camPath(lt, d, V3(2.6, 2.35, -2.2), V3(2.6, 2.35, -2.5), V3(2.6, 2.35, -3.48), null, 30, 26);
});
// s8 freeze wide orbit
shot(S(8) - 0.1, 'ROOM', (c, lt, d, v) => {
  c.tod = 'night'; c.clockSec = 3 * 3600 + 1;
  const st = reset(ROOM.J, { sit: 1, eyeS: 1.2, brow: 1 }); ROOM.J.position.set(-2.6, 0.06, -2.85);
  st.headYaw = Math.sin(lt * 1.5) * 0.6; st.look = [Math.sin(lt * 1.5), 0];
  const a = lerp(0.2, 0.9, ss(lt / d));
  return { pos: V3(-1 + Math.sin(a) * 4.0, 2.2, -1.5 + Math.cos(a) * 3.6), look: V3(-1.6, 1.1, -2.2), fov: 40 };
});
shot(S(9) - 0.1, 'ROOM', (c, lt, d) => { c.tod = 'night'; c.clockSec = 3 * 3600 + 1; return camPath(lt, d, V3(2.45, 2.3, -2.6), V3(2.55, 2.33, -2.9), V3(2.6, 2.35, -3.48), null, 28, 24); });
shot(S(10) - 0.1, 'ROOM', (c, lt, d) => { c.tod = 'night'; return camPath(lt, d, V3(-0.6, 1.4, 0.4), V3(-0.3, 1.6, 0.0), V3(0.3, 3.0, -1.2), null, 40, 36); });
shot(S(11) - 0.1, 'ROOM', (c, lt, d) => { c.tod = 'night'; ROOM.J.visible = false; return camPath(lt, d, V3(0.5, 1.8, -1.2), V3(0.5, 1.8, -2.9), V3(0.5, 0.6, -12), null, 40, 34); });
shot(S(12) - 0.1, 'ROOM', (c, lt, d, v) => {
  c.tod = 'night'; const st = reset(ROOM.J, { eyeS: 1.15, blink: blinkAt(v) });
  const k = clamp(lt / d); ROOM.J.position.set(lerp(-1.6, 0.4, k), 0, lerp(-2.0, 0.6, k)); st.yaw = 0.6; st.walk = lt * 1.6; st.walkAmt = 0.9;
  st.armUp = [0, 1.5 + Math.sin(lt * 10) * 0.25]; st.armOut = [0.1, 0.5];
  return camPath(lt, d, V3(1.6, 1.6, 2.6), V3(2.0, 1.6, 3.2), V3(-1.0, 1.3, -1.2), V3(0.4, 1.4, 0.6), 36);
});
// STREET
const Sx = STREET;
shot(S(13) - 0.1, 'STREET', (c, lt, d, v) => {
  const st = reset(Sx.J, { blink: blinkAt(v) }); const k = clamp(lt / d); Sx.J.position.set(-6, 0.28, lerp(-8.0, -6.0, k)); st.walk = lt * 1.6; st.walkAmt = 1; Sx.S.visible = false;
  return camPath(lt, d, V3(-3.2, 1.7, -2.4), V3(-3.6, 1.8, -2.8), V3(-6, 1.5, -7.6), V3(-6, 1.5, -6.4), 34);
});
shot(S(14) - 0.1, 'STREET', (c, lt, d, v) => {
  const st = reset(Sx.J, { eyeS: 1.15, blink: blinkAt(v) }); Sx.J.position.set(-5.5, 0.28, -5.6); st.headYaw = Math.sin(lt) * 0.5; Sx.S.visible = false;
  return camPath(lt, d, V3(-14, 2.2, 6), V3(-9, 9, 13), V3(-2, 1.2, -4), V3(2, 1, -4), 42, 40);
});
shot(S(15) - 0.1, 'STREET', (c, lt, d, v) => {
  const st = reset(Sx.J, { headPitch: -0.55, look: [0, 1], eyeS: 1.2, brow: 0.8, blink: blinkAt(v) }); Sx.J.position.set(-1.2, 0.28, -4.4); st.yaw = 2.5; Sx.S.visible = false;
  return camPath(lt, d, V3(-2.0, 1.4, -2.6), V3(-0.6, 3.2, 2.2), V3(-1.2, 2.2, -4.4), V3(1, 8, -1.5), 40, 32);
});
shot(S(16) - 0.1, 'STREET', (c, lt, d, v) => {
  const st = reset(Sx.J, { brow: 1, eyeS: 1.15, blink: blinkAt(v) }); Sx.J.position.set(-2.0, 0.28, -5.4); st.yaw = -1.2;
  st.talk = talkAt(v, speaking(JL, v)); st.armUp = [0, 1.4 + Math.sin(lt * 9) * 0.3]; st.armOut = [0.1, 0.2]; Sx.S.visible = false;
  return camPath(lt, d, V3(-0.2, 1.85, -2.7), V3(-0.5, 1.85, -3.0), V3(-2.1, 1.88, -5.5), V3(-2.2, 1.9, -5.6), 32, 30);
});
// SHOP
shot(S(18) - 0.1, 'SHOP', (c, lt, d, v) => {
  const st = reset(SHOP.J, { blink: blinkAt(v), eyeS: 1.1 }); const k = clamp(lt / d); SHOP.J.position.set(0.3, 0, lerp(4.4, 2.2, k)); st.yaw = Math.PI; st.walk = lt * 1.6; st.walkAmt = 1;
  return camPath(lt, d, V3(-3.5, 2.6, 0.0), V3(-3.2, 2.5, 0.3), V3(0.3, 1.3, 3.2), V3(0.3, 1.3, 2.6), 42);
});
shot(S(19) - 0.1, 'SHOP', (c, lt, d, v) => {
  const st = reset(SHOP.J, { blink: blinkAt(v), brow: lt > 2.2 ? 0.9 : 0.2 }); SHOP.J.position.set(-2.4, 0, -3.3); st.yaw = Math.PI;
  const press = (lt % 1.0) < 0.25 && lt < 2.6; st.armUp = [0, 2.2 + (press ? 0.2 : 0)]; st.headPitch = -0.3;
  c.tvStatic = (lt > 0.4 && lt < 0.55) || (lt > 1.4 && lt < 1.52) || (lt > 2.3 && lt < 2.36) ? 0.7 : 0;
  return camPath(lt, d, V3(-4.9, 2.3, -0.4), V3(-4.7, 2.3, -0.7), V3(-2.45, 1.9, -3.9), null, 44, 40);
});
// money + food
shot(S(20) - 0.1, 'STREET', (c, lt, d, v) => {
  const st = reset(Sx.J, { blink: blinkAt(v) }); Sx.S.visible = false;
  const car = Sx.cars[1].c; const cx = car.position.x;
  Sx.J.position.set(cx + 0.4, 0.28, -4.4); st.yaw = Math.PI; const k = lt / d;
  st.armUp = [0, k < 0.45 ? 1.3 : 0.9]; st.lean = k < 0.45 ? 0.25 : 0;
  bill.visible = k > 0.3 && k < 0.6; bag.visible = k >= 0.6; const hp = V3(cx + 0.75, 1.15, -4.0);
  bill.position.copy(hp); bag.position.set(cx + 0.75, 0.95, -3.8); st.brow = k > 0.6 ? -0.2 : 0.4;
  return camPath(lt, d, V3(cx - 2.6, 1.8, -6.6), V3(cx - 2.2, 1.75, -6.3), V3(cx + 0.4, 1.3, -3.9), null, 36);
});
// 03:01 resume
shot(S(21) - 0.1, 'STREET', (c, lt, d, v) => {
  const st = reset(Sx.J, { blink: blinkAt(v) }); Sx.S.visible = false; bill.visible = false; bag.visible = true;
  Sx.J.position.set(-4, 0.28, -5.0); st.yaw = 0.3; const after = v > UNFREEZE;
  st.eyeS = after ? 1.3 : 1; st.brow = after ? 1 : 0; st.armUp = after ? [0.8, 0.8] : [0, 0.9]; st.lean = after ? -0.12 : 0;
  bag.position.set(-3.65, 0.95, -4.6);
  if (v > UNFREEZE - 1.2 && v < UNFREEZE) c.overlay = 'clock301';
  return camPath(lt, d, V3(-0.8, 1.6, -1.2), V3(-1.4, 1.7, -1.8), V3(-3.8, 1.4, -4.8), V3(-4, 1.6, -5.0), 42, 38, x => ss(x));
});
shot(S(22) - 0.1, 'STREET', (c, lt, d, v) => {
  const st = reset(Sx.J, { blink: blinkAt(v) }); Sx.S.visible = false; bag.visible = false;
  Sx.J.position.set(lerp(-2, -9, lt / d), 0.28, -6.4); st.yaw = -Math.PI / 2; st.walk = lt * 1.4; st.walkAmt = 0.9; st.headPitch = 0.1;
  if (lt > d * 0.55) c.overlay = 'h25';
  return camPath(lt, d, V3(-2, 1.4, -1.5), V3(-6, 7.5, 6), V3(-4, 1.3, -6.4), V3(-6, 3, -6), 40, 44);
});
// MONTAGE
shot(S(23) - 0.1, 'STREET', (c, lt, d, v) => {
  const st = reset(Sx.J, { blink: blinkAt(v), brow: -0.4 }); Sx.S.visible = false;
  Sx.J.position.set(-6 + lt * 0.6, 0.28, 0.6); st.yaw = lt * 2.2; st.armOut = [1.2, 1.2]; st.walk = lt; st.walkAmt = 0.3;
  const a = lt * 0.35;
  return { pos: V3(-6 + lt * 0.6 + Math.sin(a) * 5, 2.4, 0.6 + Math.cos(a) * 5), look: V3(-6 + lt * 0.6, 1.2, 0.6), fov: 40 };
});
shot(S(24) - 0.1, 'LIB', (c, lt, d, v) => {
  const st = reset(LIB.J, { sit: 1, blink: blinkAt(v), headPitch: 0.35, look: [0, -1] }); LIB.J.position.set(0.05, -0.18, -0.7); st.armUp = [1.0, 1.0]; st.armOut = [0.25, 0.25];
  c.stackN = Math.floor(clamp(lt / d) * 9);
  return camPath(lt, d, V3(2.8, 2.0, 3.2), V3(2.0, 1.8, 2.5), V3(0, 1.15, -0.2), V3(0, 1.2, -0.3), 38, 34);
});
shot(S(25) - 0.1, 'LIB', (c, lt, d, v) => {
  const st = reset(LIB.J, { sit: 1, blink: blinkAt(v), headPitch: 0.45, look: [0.4, -1] }); LIB.J.position.set(0.05, -0.18, -0.7); st.armUp = [0.9, 1.1 + Math.sin(lt * 14) * 0.08]; st.armOut = [0.2, 0.1];
  c.stackN = 9;
  return camPath(lt, d, V3(1.6, 1.7, 2.0), V3(1.4, 1.6, 1.8), V3(0.3, 1.05, 0.1), null, 34, 32);
});
shot(S(26) - 0.1, 'LIB', (c, lt, d, v) => {
  const st = reset(LIB.J, { blink: blinkAt(v), brow: -0.4 }); LIB.J.position.set(1.6, 0, 1.5); st.yaw = -0.3; st.armOut = [0.5, 0.5]; st.armUp = [0.3, 0.3];
  c.stackN = 9;
  return camPath(lt, d, V3(-1.2, 3.3, 0.8), V3(-1.6, 1.8, 4.8), V3(-0.2, 3.6, -4.9), V3(1.5, 1.4, 1.4), 40, 38);
});
// STRANGER encounter
const SP = V3(24, 0.28, -5.0);
shot(S(27) - 0.1, 'STREET', (c, lt, d, v) => {
  const st = reset(Sx.J, { blink: blinkAt(v) }); const k = clamp(lt / (d * 0.75));
  Sx.J.position.set(lerp(8, 14, k), 0.28, -5.2); st.yaw = Math.PI / 2; st.walk = lt * 1.4; st.walkAmt = 1 - ss((lt - d * 0.7) / 0.5);
  reset(Sx.S, { yaw: Math.PI / 2 }); Sx.S.position.copy(SP); Sx.S.userData.state.frozen = true;
  return camPath(lt, d, V3(4, 1.7, -3.8), V3(9, 1.7, -4.2), V3(14, 1.6, -5.2), V3(20, 1.8, -5), 38, 34);
});
shot(S(28) - 0.1, 'STREET', (c, lt, d, v) => {
  const st = reset(Sx.J, { eyeS: 1.25, brow: 1, blink: blinkAt(v) }); Sx.J.position.set(14, 0.28, -5.2); st.yaw = Math.PI / 2;
  reset(Sx.S, { yaw: Math.PI / 2 }); Sx.S.position.copy(SP);
  const k = ss(lt / d); // dolly zoom
  const dist = lerp(2.0, 5.0, k), fov = 2 * Math.atan(1.3 / dist) * 180 / Math.PI;
  return { pos: V3(14 - dist, 1.72, -5.0), look: V3(24, 1.6, -5.0), fov: Math.max(12, fov * 0.6) };
});
shot(S(30) - 0.1, 'STREET', (c, lt, d, v) => {
  const st = reset(Sx.J, { blink: blinkAt(v), eyeS: 1.15 }); const k = clamp(lt / d); Sx.J.position.set(lerp(14, 21.4, k), 0.28, -5.2); st.yaw = Math.PI / 2; st.walk = lt * 2.6; st.walkAmt = 1.35; st.lean = 0.15;
  reset(Sx.S, { yaw: Math.PI / 2 }); Sx.S.position.copy(SP);
  return camPath(lt, d, V3(14, 1.4, -1.8), V3(20.5, 1.5, -1.6), V3(15, 1.3, -5.2), V3(22, 1.4, -5.2), 38);
});
function dlg(c, lt, d, v, who) {
  const sj = reset(Sx.J, { yaw: Math.PI / 2, blink: blinkAt(v), brow: 0.6, eyeS: 1.1 }); Sx.J.position.set(22.2, 0.28, -5.0);
  const ss_ = reset(Sx.S, { yaw: -Math.PI / 2, blink: blinkAt(v, 2) * 0.6, brow: -0.3 }); Sx.S.position.copy(SP);
  sj.talk = talkAt(v, speaking(JL, v)); ss_.talk = talkAt(v, speaking(OL, v));
  const n = noise1(v * 0.3) * 0.05;
  if (who === 'J') return camPath(lt, d, V3(24.6, 1.95, -4.1), V3(24.5, 1.95, -4.2), V3(22.2, 1.7 + n, -5.0), null, 30, 28);
  if (who === 'S') return camPath(lt, d, V3(21.6, 1.85, -4.0), V3(21.7, 1.85, -4.1), V3(24, 1.85 + n, -5.0), null, 30, 27);
  return camPath(lt, d, V3(23.1, 1.6, -1.6), V3(23.1, 1.65, -2.0), V3(23.1, 1.4, -5.0), null, 34);
}
shot(S(31) - 0.1, 'STREET', (c, lt, d, v) => dlg(c, lt, d, v, 'J'));
shot(S(34) - 0.1, 'STREET', (c, lt, d, v) => { const r = dlg(c, lt, d, v, 'S'); const st = Sx.S.userData.state; st.yaw = lerp(Math.PI / 2, -Math.PI / 2, ss(lt / 1.2)); return r; });
for (const [i, who] of [[36, 'J'], [38, 'S'], [39, 'S'], [42, 'J'], [43, 'S'], [44, 'J'], [46, 'S']]) shot(S(i) - 0.1, 'STREET', (c, lt, d, v) => dlg(c, lt, d, v, who));
shot(S(40) + 0.4, 'STREET', (c, lt, d, v) => dlg(c, lt, d, v, 'W'));
SH.sort((a, b) => a.t0 - b.t0);
// HALL
const H = HALL; const SPH = V3(-5.6, 0, 2.6);
shot(S(47) - 0.1, 'HALL', (c, lt, d, v) => {
  const k = clamp(lt / d);
  const sj = reset(H.J, { yaw: Math.PI, blink: blinkAt(v), eyeS: 1.1 }); H.J.position.set(lerp(1.2, 0.2, k), 0, lerp(8.5, 4.5, k)); sj.walk = lt * 1.5; sj.walkAmt = 1;
  const ss_ = reset(H.S, { yaw: Math.PI }); H.S.position.set(lerp(-0.2, -1.0, k), 0, lerp(8.0, 4.0, k)); ss_.walk = lt * 1.5 + 0.5; ss_.walkAmt = 1;
  return camPath(lt, d, V3(2.0, 1.5, 0.5), V3(1.4, 1.6, 1.4), V3(0.4, 1.4, 6.5), V3(-0.3, 1.5, 4.4), 40);
});
shot(S(48) - 0.1, 'HALL', (c, lt, d) => { H.J.visible = false; H.S.visible = false; return camPath(lt, d, V3(-6.2, 2.4, -5.5), V3(-6.2, 2.6, 0.5), V3(-8.8, 2.4, -4.8), V3(-8.8, 2.6, 1.5), 40, 36); });
shot(S(49) - 0.1, 'HALL', (c, lt, d, v) => {
  const k = clamp(lt / (d * 0.8)); const sj = reset(H.J, { blink: blinkAt(v) }); H.J.position.set(-7.4, 0, lerp(-2.5, 1.2, k)); sj.yaw = k < 1 ? 0 : -Math.PI / 2; sj.walk = lt * 1.4; sj.walkAmt = 1 - ss((lt - d * 0.75) / 0.4);
  sj.yaw = lerp(0, -Math.PI / 2, ss((lt - d * 0.7) / 0.5)); H.S.visible = false;
  return camPath(lt, d, V3(-4.6, 1.8, 3.5), V3(-4.8, 1.8, 3.8), V3(-7.4, 1.5, 0), V3(-7.8, 1.9, 1.2), 38, 34);
});
shot(S(50) - 0.1, 'HALL', (c, lt, d) => { H.J.visible = false; H.S.visible = false; return camPath(lt, d, V3(-7.3, 2.65, 1.2), V3(-7.8, 2.65, 1.2), V3(-8.8, 2.65, 1.2), null, 34, 30); });
shot(S(51) - 0.1, 'HALL', (c, lt, d, v) => {
  H.J.visible = false; H.S.visible = false;
  const full = 'JASUR  •  25-SOATGA KIRGAN SANA: 19-NOYABR'; const n = Math.floor(clamp((v - S(51) - 0.6) / 4.5) * full.length); c.capText = full.slice(0, n); c.capKey = n;
  return camPath(lt, d, V3(-6.6, 2.35, 1.2), V3(-7.0, 2.2, 1.2), V3(-8.8, 2.35, 1.2), V3(-8.8, 2.15, 1.2), 36, 34);
});
const CAPF = 'JASUR  •  25-SOATGA KIRGAN SANA: 19-NOYABR';
shot(S(53) - 0.1, 'HALL', (c, lt, d, v) => {
  const sj = reset(H.J, { yaw: -Math.PI / 2, eyeS: 1.3, brow: 1, blink: blinkAt(v) }); H.J.position.set(-7.4, 0, 1.2);
  sj.yaw = lerp(-Math.PI / 2, 0.7, ss((lt - 1.2) / 0.6)); sj.talk = talkAt(v, speaking(JL, v)); sj.lean = -0.05;
  reset(H.S, { yaw: -Math.PI / 2 }); H.S.position.copy(SPH); c.capText = CAPF; c.capKey = 'full';
  H.S.visible = false; return camPath(lt, d, V3(-5.7, 1.8, 2.5), V3(-6.0, 1.78, 2.3), V3(-7.4, 1.6, 1.2), null, 32, 28);
});
function hallDlgS(c, lt, d, v, push = 0) {
  const sj = reset(H.J, { yaw: 0.7, eyeS: 1.2, brow: 1, blink: blinkAt(v) }); H.J.position.set(-7.4, 0, 1.2);
  const so = reset(H.S, { yaw: -2.3, blink: blinkAt(v, 3) * 0.5, brow: -0.4 }); H.S.position.copy(SPH); so.talk = talkAt(v, speaking(OL, v));
  c.capText = CAPF; c.capKey = 'full';
  return camPath(lt, d, V3(-6.8, 1.95, 1.0), V3(-6.8 + push * 0.3, 1.95, 1.0 + push * 0.4), V3(-5.6, 1.85, 2.6), null, 30, 30 - push * 6);
}
shot(S(56) - 0.1, 'HALL', (c, lt, d, v) => hallDlgS(c, lt, d, v, 0.5));
shot(S(58) - 0.1, 'HALL', (c, lt, d, v) => {
  const r = hallDlgS(c, lt, d, v, 0); const so = H.S.userData.state; so.yaw = -Math.PI / 2 - 0.2; so.armUp = [0, lerp(0, 1.5, ss(lt / 0.8))]; so.armOut = [0.08, 0.15];
  return camPath(lt, d, V3(-5.4, 1.9, 5.8), V3(-5.6, 1.9, 5.5), V3(-7.2, 1.6, 2.0), null, 38);
});
shot(S(59) - 0.1, 'HALL', (c, lt, d) => { H.J.visible = false; H.S.visible = false; c.capText = CAPF; c.capKey = 'full'; c.sepiaZoom = true; return camPath(lt, d, V3(-6.9, 2.6, 3.1), V3(-7.4, 2.6, 3.1), V3(-8.8, 2.6, 3.1), null, 34, 31); });
shot(S(61) - 0.1, 'HALL', (c, lt, d, v) => hallDlgS(c, lt, d, v, 1));
shot(S(63) - 0.1, 'HALL', (c, lt, d, v) => {
  const sj = reset(H.J, { yaw: 0.7, eyeS: 1.3, brow: 1, blink: blinkAt(v) }); H.J.position.set(-7.4 + ss(lt / 1.2) * 0.8, 0, 1.2 - ss(lt / 1.2) * 0.4); sj.lean = -0.1; sj.talk = talkAt(v, speaking(JL, v));
  sj.walk = lt * 1.5; sj.walkAmt = lt < 1.2 ? 0.6 : 0;
  reset(H.S, { yaw: -2.3 }); H.S.position.copy(SPH); c.capText = CAPF; c.capKey = 'full';
  return camPath(lt, d, V3(-4.4, 1.85, 3.6), V3(-4.6, 1.85, 3.4), V3(-6.9, 1.7, 1.0), null, 32, 30);
});
shot(S(65) - 0.1, 'HALL', (c, lt, d, v) => { const r = hallDlgS(c, lt, d, v, 0); c.eyeGlow = 1; return camPath(lt, d, V3(-6.6, 1.9, 1.2), V3(-6.1, 1.88, 1.8), V3(-5.6, 1.85, 2.6), null, 32, 24); });
// siren + countdown
shot(S(67) - 0.1, 'HALL', (c, lt, d, v) => {
  reset(H.J, { yaw: 0.2, eyeS: 1.3, brow: 1 }); H.J.position.set(-6.6, 0, 0.8); reset(H.S, { yaw: -2.6 }); H.S.position.copy(SPH);
  return camPath(lt, d, V3(4, 3.8, 7), V3(3, 3.5, 6), V3(-3, 2.5, -2), null, 44);
});
shot(S(68) - 0.1, 'HALL', (c, lt, d, v) => {
  H.J.visible = true; reset(H.J, { yaw: Math.PI, eyeS: 1.3, brow: 1, headPitch: -0.3 }); H.J.position.set(-1.0, 0, 1.0); reset(H.S, { yaw: Math.PI }); H.S.position.set(1.2, 0, 1.6);
  return camPath(lt, d, V3(0.2, 1.8, 6.5), V3(0, 2.6, 3.5), V3(0, 3.0, -6), V3(0, 4.2, -7.6), 42, 36);
});
shot(S(69) - 0.1, 'HALL', (c, lt, d, v) => {
  const sj = reset(H.J, { yaw: -0.9, eyeS: 1.3, brow: 1, blink: blinkAt(v) }); H.J.position.set(-1.0, 0, 1.0);
  const so = reset(H.S, { yaw: 2.2 }); H.S.position.set(-0.2, 0, 0.4); so.armUp = [0, 1.2]; so.armOut = [0.08, -0.2]; so.talk = talkAt(v, speaking(OL, v)); so.brow = 1;
  return camPath(lt, d, V3(-3.4, 1.8, 2.6), V3(-3.0, 1.75, 2.4), V3(-0.6, 1.6, 0.7), null, 34, 31);
});
shot(S(72) - 0.1, 'HALL', (c, lt, d, v) => {
  const sj = reset(H.J, { yaw: 0, eyeS: 1.2, brow: 1 }); H.J.position.set(-0.6, 0, lerp(1.2, 4.0, clamp(lt / d))); sj.walk = lt * 2.8; sj.walkAmt = 1.35; sj.lean = 0.15;
  reset(H.S, { yaw: 0 }); H.S.position.set(-0.2, 0, 0.2);
  return camPath(lt, d, V3(-0.6, 1.5, 8.5), V3(-0.6, 1.5, 8.2), V3(-0.6, 1.3, 2.5), V3(-0.6, 1.3, 4.0), 36);
});
shot(S(73) - 0.1, 'HALL', (c, lt, d, v) => {
  const sj = reset(H.J, { yaw: 0, eyeS: 1.35, brow: 1, blink: 0 }); H.J.position.set(-0.6, 0, 4.2); sj.lean = lerp(0.15, -0.2, eout(lt / 0.3)); sj.armOut = [0.4, 0.4];
  reset(H.S, { yaw: 0 }); H.S.position.set(-0.2, 0, 0.2);
  return camPath(lt, d, V3(-0.6, 1.75, 6.6), V3(-0.6, 1.75, 6.2), V3(-0.6, 1.6, 4.2), null, 32, 30);
});
shot(S(74) - 0.1, 'HALL', (c, lt, d, v) => {
  const sj = reset(H.J, { yaw: Math.PI, headPitch: -0.25 }); H.J.position.set(-0.6, 0, 4.2); reset(H.S, { yaw: 0 }); H.S.position.set(-0.2, 0, 0.2);
  return camPath(lt, d, V3(-0.9, 2.0, 6.0), V3(-0.8, 2.4, 5.0), V3(0, 3.8, -7.6), V3(0, 4.3, -7.6), 40, 32);
});
shot(S(75) - 0.1, 'HALL', (c, lt, d, v) => {
  const sj = reset(H.J, { eyeS: 1.3, brow: 1 }); H.J.position.set(-0.6, 0, 4.2); sj.yaw = lerp(Math.PI, 0.1, ss(lt / 0.8)); H.S.visible = false;
  return camPath(lt, d, V3(-0.4, 1.75, 6.4), V3(-0.4, 1.75, 6.2), V3(-0.6, 1.65, 4.2), null, 30);
});
shot(S(76) - 0.1, 'HALL', (c, lt, d, v) => {
  reset(H.J, { yaw: Math.PI, eyeS: 1.3, brow: 1 }); H.J.position.set(-0.6, 0, 4.2); H.S.visible = false;
  c.dissolve = v - S(76) + 0.3; c.sPos = V3(-0.2, 0, 0.2);
  return camPath(lt, d, V3(-1.6, 1.7, 6.8), V3(-1.2, 1.6, 6.0), V3(-0.3, 1.2, 0.5), null, 36, 32);
});
// phone
shot(S(77) - 0.1, 'HALL', (c, lt, d, v) => {
  const sj = reset(H.J, { yaw: Math.PI, headPitch: 0.35, look: [0, -1], eyeS: 1.2, brow: 1 }); H.J.position.set(-0.6, 0, 4.2); sj.armUp = [0, 1.1]; sj.armOut = [0.08, -0.15]; H.S.visible = false;
  hallPhone.visible = true; const vib = Math.sin(v * 70) * 0.02 * ((v % 0.8) < 0.5 ? 1 : 0);
  hallPhone.position.set(-0.72 + vib, 1.18, 3.75); hallPhone.rotation.set(-0.6, 0, 0); c.hallPhoneState = ['call'];
  return camPath(lt, d, V3(0.4, 2.12, 4.85), V3(0.32, 2.05, 4.75), V3(-0.72, 1.18, 3.75), null, 34, 31);
});
shot(S(78) - 0.1, 'HALL', (c, lt, d, v) => {
  H.J.visible = false; H.S.visible = false; hallPhone.visible = true; hallPhone.position.set(-0.7, 1.55, 3.7); hallPhone.rotation.set(0, 0, 0); c.hallPhoneState = ['call'];
  const vib = Math.sin(v * 70) * 0.01 * ((v % 0.8) < 0.5 ? 1 : 0);
  return camPath(lt, d, V3(-0.7 + vib, 1.55, 4.65), V3(-0.7, 1.55, 4.5), V3(-0.7, 1.55, 3.7), null, 32, 30);
});
shot(S(79) - 0.1, 'HALL', (c, lt, d, v) => {
  const sj = reset(H.J, { yaw: 0, eyeS: 1.35, brow: 1, blink: blinkAt(v) * 0.5, headPitch: 0.15, look: [0, -0.6] }); H.J.position.set(-0.6, 0, 4.2); H.S.visible = false;
  sj.armUp = [0, 1.15]; sj.armOut = [0.08, -0.12];
  hallPhone.visible = true; hallPhone.position.set(-0.68, 1.33, 4.58); hallPhone.rotation.set(0.45, Math.PI, 0); c.hallPhoneState = ['call'];
  if (v > S(79) + (E(79) - S(79)) * qfrac(79)) c.glitch = 0.12 + 0.12 * Math.sin(v * 7);
  return camPath(lt, d, V3(-0.55, 1.6, 7.4), V3(-0.58, 1.6, 5.6), V3(-0.6, 1.5, 4.2), null, 32, 30);
});
shot(VOICE_END + 0.25, 'HALL', (c, lt) => { c.overlay = 'end'; c.blackout = 1; return { pos: V3(0, 2, 6), look: V3(0, 2, 0), fov: 40 }; });
SH.sort((a, b) => a.t0 - b.t0);

// ---------------------------------------------------------------- overlay (2D)
const ov = document.createElement('canvas'); ov.width = 1920; ov.height = 1080; const oc = ov.getContext('2d');
function txt(s, x, y, size, col = '#fff', glowC = null, align = 'center', alpha = 1) {
  oc.save(); oc.globalAlpha = alpha; oc.font = `${size}px ${FONT}`; oc.textAlign = align; oc.textBaseline = 'middle';
  if (glowC) { oc.shadowColor = glowC; oc.shadowBlur = size * 0.4; }
  oc.fillStyle = col; oc.fillText(s, x, y); oc.restore();
}
function drawOverlay(c, v, lt) {
  oc.clearRect(0, 0, 1920, 1080); oc.drawImage(renderer.domElement, 0, 0);
  if (c.overlay === 'title') {
    const a = clamp(lt / 0.5) * (1 - clamp((lt - 2.0) / 0.5));
    const gx = (Math.floor(v * 20) % 7 === 0) ? 10 : 0;
    txt("HECH KIM KO'RMAYDIGAN", 960, 430, 64, '#ffffff', '#8a5aff', 'center', a);
    txt('25-SOAT', 960 + gx, 560, 200, '#c59bff', '#9b5cff', 'center', a);
    if (gx) txt('25-SOAT', 960 - gx, 560, 200, 'rgba(80,220,255,.5)', null, 'center', a * 0.6);
  }
  if (c.overlay === 'kecha') txt('KECHA TUNDA', 90, 90, 40, '#c8d4ff', '#5a7aff', 'left', clamp(lt / 0.4));
  if (c.overlay === 'clock301') { const k = clamp(lt); txt('03:00 → 03:01', 960, 140, 70, '#ffffff', '#5ad8ff', 'center', 0.9); }
  if (c.overlay === 'h25') { const k = clamp((v - (S(22) + (E(22) - S(22)) * 0.55)) / 0.6); txt('24 + 1 = 25', 960, 200, 110, '#e0d0ff', '#9b5cff', 'center', k); }
  if (c.overlay === 'end') {
    oc.fillStyle = '#000'; oc.fillRect(0, 0, 1920, 1080);
    const k = lt;
    txt('TAMOM', 960, 420, 150, '#c59bff', '#9b5cff', 'center', clamp(k / 0.6));
    txt('Sizningcha, Jasur aslida kim?', 960, 600, 54, '#ffffff', null, 'center', clamp((k - 1.0) / 0.5));
    txt('Izohlarda yozing  •  Obuna bo\'ling', 960, 690, 44, '#c8c8e8', null, 'center', clamp((k - 1.6) / 0.5));
  }
}

// ---------------------------------------------------------------- main frame
const camera = new THREE.PerspectiveCamera(35, 16 / 9, 0.05, 400);
const OFF = { ROOM: 0, STREET: 100, SHOP: 200, LIB: 300, HALL: 400 };
const eyeMats = [];
for (const p of [STREET.S, HALL.S]) p.traverse(o => { if (o.material && o.material.color && o.material.color.getHex && o.material.color.getHex() === 0x9b5cff) eyeMats.push(o); });

window.renderFrame = (fi) => {
  const t = fi / 30, v = t - PRE;
  let cur = SH[0], idx = 0; for (let i = 0; i < SH.length; i++) if (v >= SH[i].t0) { cur = SH[i]; idx = i; }
  const nxt = SH[idx + 1] ? SH[idx + 1].t0 : DUR;
  const lt = v - cur.t0, d = nxt - cur.t0;
  const frozen = isFrozen(v), run = runAt(v);
  const c = { tod: 'night', run, frozen, birdRun: Math.max(0, run - runAt(UNFREEZE)), clockSec: 3 * 3600 + 1, fanAngle: run * 9, phoneGlow: 0, phoneState: null, tvStatic: 0, stackN: 0, siren: v >= S(67) ? 1 : 0,
    capText: '', capKey: 'none', scrMode: 'idle', scrKey: 'idle', count: 10, dissolve: -1, sPos: V3(0, 0, 0), hallPhoneState: null, overlay: null, glitch: 0, flashSmall: 0, blackout: 0 };
  // screen state
  if (v >= S(68) + 3.0) { c.scrMode = 'count'; c.count = Math.min(10, Math.max(0, 10 - Math.floor(v - (S(68) + 3.0)))); c.scrKey = 'c' + c.count; }
  const tCtrl = S(74) + (E(74) - S(74)) * 0.45;
  if (v >= tCtrl) { c.scrMode = 'ctrl'; c.scrKey = 'ctrl'; }
  hallPhone.visible = false; bill.visible = false; bag.visible = false;
  showSet(cur.set);
  const cam = cur.fn(c, lt, d, v);
  // apply sets
  for (const [k, s] of Object.entries(SETS)) if (s.g.visible) s.update(t, c);
  for (const p of [ROOM.J, STREET.J, SHOP.J, LIB.J, HALL.J, STREET.S, HALL.S]) if (p.visible) { const st = p.userData.state; if (st.blink === 0 && !st._noBlink) { } p.userData.apply(t); }
  if (c.phoneState) ROOM.phone.userData.show(...c.phoneState);
  if (c.hallPhoneState) hallPhone.userData.show(...c.hallPhoneState);
  if (!c.phoneState && cur.set === 'ROOM') ROOM.phone.userData.show('off');
  for (const m of eyeMats) m.material.color.setRGB(0.6 + c.eyeGlow * 1.5 || 0.6, 0.36, 1.0 + (c.eyeGlow || 0) * 1.5);
  // camera
  const off = OFF[cur.set];
  const sh = 0.012;
  camera.position.set(cam.pos.x + off + noise1(v * 0.9) * sh, cam.pos.y + noise1(v * 1.1 + 3) * sh, cam.pos.z + noise1(v * 0.7 + 7) * sh);
  camera.fov = cam.fov; camera.updateProjectionMatrix();
  camera.lookAt(cam.look.x + off + noise1(v * 0.6 + 11) * sh * 2, cam.look.y + noise1(v * 0.8 + 5) * sh * 2, cam.look.z);
  // post
  post.time = t; post.freeze = freezeVis(v); post.glitch = c.glitch;
  const tc = v - cur.t0; post.flash = Math.max(c.flashSmall, (v > UNFREEZE && v < UNFREEZE + 0.25) ? 0.7 * (1 - (v - UNFREEZE) / 0.25) : 0, (v > 24 && v < 24.25) ? 0.8 * (1 - (v - 24) / 0.25) : 0);
  if (v > tCtrl && v < tCtrl + 0.6) post.glitch = Math.max(post.glitch, 1 - (v - tCtrl) / 0.6);
  post.red = c.siren ? 0.22 + 0.18 * Math.sin(t * 8) : 0;
  post.fade = Math.max(c.blackout, idx > 0 && lt < 0.1 ? (1 - lt / 0.1) * 0.6 : 0, v < -PRE + 0.4 ? 1 - (v + PRE) / 0.4 : 0, (v > VOICE_END - 0.6 && v < VOICE_END + 0.3) ? clamp((v - VOICE_END + 0.6) / 0.8) : 0);
  scene.fog.density = cur.set === 'STREET' ? 0.018 : cur.set === 'HALL' ? 0.03 : 0.035;
  post.tint.set(cur.set === 'ROOM' && c.tod === 'morning' ? 0xfff0e0 : 0xe8e4ff);
  renderComposite(scene, camera);
  drawOverlay(c, v, lt);
  return ov.toDataURL('image/jpeg', 0.92);
};
window.DUR = DUR;
window.ready = true;
