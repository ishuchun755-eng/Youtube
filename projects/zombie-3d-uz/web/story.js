import { THREE, renderer, renderComposite, post, clamp, ss, eout, ein, back, lerp, noise1, blinkAt, FONT, mesh, G, glow } from './engine.js';
import { scene, SETS, showSet, place, LOT, STORE, BACK, ROAD, CAST, ZOMBIES, zpose, makePhone, makeBat } from './sets.js';

const TL = await (await fetch('timeline.json')).json();
const SENT = TL.S, GAP = TL.GAP, CUT = TL.CUT;
export const PRE = 2.5;
const VEND = SENT[SENT.length - 1].end;
export const DUR = +(PRE + VEND + 4.5).toFixed(2);
const S = i => SENT[i].start, E = i => SENT[i].end;
const PH = CUT; // phone break start (timeline)
const V3 = (x, y, z) => new THREE.Vector3(x, y, z);
const OFF = { LOT: 0, STORE: 200, BACK: 400, ROAD: 600 };
const C = CAST;
const ALL = [...Object.values(CAST), ...ZOMBIES];

// ---------------------------------------------------------------- props
const phone = makePhone(); scene.add(phone); phone.scale.setScalar(0.5);
const phHand = mesh(G.sph(0.16, 16, 12), 0xf0c49c, 0, -0.34, -0.09, phone, { th: 0.01 }); phHand.scale.set(1.2, 1.4, 0.6);
const bat = makeBat(); C.jacket.userData.parts.arms[1].sh.add(bat); bat.position.set(0, -0.62, 0.05); bat.rotation.x = 0.4;
const bite = new THREE.Mesh(G.torus(0.07, 0.022, 8, 18), glow(0xc81818, 1)); bite.material = new THREE.MeshBasicMaterial({ color: 0xa01010 });
const biteStaff = bite.clone();
C.teen1.userData.parts.arms[0].sh.add(bite); bite.position.set(0.09, -0.45, 0); bite.rotation.y = Math.PI / 2;
C.staff.userData.parts.arms[0].sh.add(biteStaff); biteStaff.position.set(0.09, -0.52, 0); biteStaff.rotation.y = Math.PI / 2;

// ---------------------------------------------------------------- helpers
let SHX = 0, SHZ = 0;
function reset(p, set, x, z, yaw = 0, opt = {}) {
  place(p, set, x + SHX, 0, z + SHZ, yaw);
  const st = p.userData.state;
  Object.assign(st, { sit: 0, walk: 0, walkAmt: 0, armUp: [0, 0], armOut: [0.08, 0.08], headYaw: 0, headPitch: 0, talk: 0, blink: 0, brow: 0, eyeS: 1, look: [0, 0], lean: 0, frozen: false }, opt);
  st.yaw = yaw; return st;
}
function walk(p, set, a, b, k, speed = 1.4, run = false, t = 0) {
  const x = lerp(a[0], b[0], k), z = lerp(a[1], b[1], k);
  const yaw = Math.atan2(b[0] - a[0], b[1] - a[1]);
  const st = reset(p, set, x, z, yaw);
  st.walk = t * speed; st.walkAmt = k > 0 && k < 1 ? (run ? 1.1 : 0.7) : 0; st.lean = run ? 0.18 : 0.04;
  if (run) st.armOut = [0.2, 0.2];
  return st;
}
function crowd(set, n, x0, x1, z0, z1, t, yaw = 0, wk = 0, seed = 0, dz = 0) {
  for (let i = 0; i < n; i++) {
    const z = ZOMBIES[(i + seed) % ZOMBIES.length]; const a = (i * 0.618 + seed * 0.13) % 1, b = (i * 0.383 + 0.21 + seed * 0.07) % 1;
    const zz = z0 + (z1 - z0) * b + dz * wk;
    place(z, set, x0 + (x1 - x0) * a + Math.sin(i * 3.1) * 0.3 + SHX, 0, zz + SHZ, yaw + Math.sin(i * 1.7) * 0.35); zpose(z, t + i, wk ? t * 1.3 + i : 0);
  }
}
function cam(lt, d, p0, p1, l0, l1, f0 = 38, f1 = f0, e = ss) { const k = e(clamp(lt / d)); return { pos: p0.clone().lerp(p1, k), look: l0.clone().lerp(l1 || l0, k), fov: lerp(f0, f1, k) }; }
const k01 = (v, a, b) => clamp((v - a) / (b - a));
function group(set, spots, t) { for (const [n, x, z, yaw, o] of spots) { const st = reset(C[n], set, x, z, yaw, o || {}); st.blink = blinkAt(t, x * 3 + z); } }

// ---------------------------------------------------------------- shots
const SH = []; let CURSH = [0, 0]; const shot = (t0, set, fn) => SH.push({ t0, set, fn, sh: CURSH });

// TITLE
shot(-PRE, 'LOT', (c, lt, d, v, t) => {
  c.tod = 'day'; c.overlay = 'title'; crowd(LOT, 10, -18, 18, 14, 30, t, Math.PI, 0);
  return cam(lt, d, V3(0, 18, 46), V3(0, 9, 34), V3(0, 4, -10), V3(0, 4, -10), 42, 40);
});
// 0 walking into supermarket
shot(0, 'LOT', (c, lt, d, v, t) => {
  c.tod = 'day'; c.doorOpen = 1;
  walk(C.sardor, LOT, [2, 10], [0, -8.6], lt / (d + 0.6), 1.4, false, t);
  return cam(lt, d, V3(5, 1.9, 16), V3(2.2, 1.7, 3), V3(0, 1.6, -6), V3(0, 2, -10), 40, 42);
});
shot(S(1) - 0.2, 'STORE', (c, lt, d, v, t) => {
  c.tod = 'day'; const st = walk(C.sardor, STORE, [-9.5, 2.5], [-9.5, -3.5], lt / (d + 2), 1.3, false, t); st.headYaw = -0.6;
  walk(C.mom, STORE, [-4.5, -8], [-4.5, 0], lt / 12, 1.2, false, t);
  return cam(lt, d, V3(-9.2, 1.7, 6.5), V3(-9.3, 1.6, 2.5), V3(-9.6, 1.3, 0), V3(-9.8, 1.3, -4), 42);
});
shot(S(2) - 0.1, 'STORE', (c, lt, d, v, t) => {
  c.tod = 'day'; const st = reset(C.sardor, STORE, -9.5, -0.8, Math.PI); const k = ss(k01(lt, 0.3, 1.0)); st.headYaw = -0.9 * k; st.eyeS = 1 + 0.4 * k; st.brow = k; st.blink = 0;
  return cam(lt, d, V3(-9.4, 1.6, -3.4), V3(-9.45, 1.58, -2.8), V3(-9.5, 1.55, -0.8), null, 34, 30);
});
shot(S(3) - 0.1, 'LOT', (c, lt, d, v, t) => {
  c.tod = 'day'; crowd(LOT, 16, -16, 12, 4, 24, t, -0.8, 1, 0, -4);
  for (const [i, n] of [[0, 'teen2'], [1, 'old']].entries()) { const st = walk(C[n[1]] || C[n], LOT, [-4 - i * 5, 14], [10 - i * 4, 2], lt / d, 2.4, true, t); st.eyeS = 1.3; }
  return cam(lt, d, V3(18, 4.5, 26), V3(12, 3.4, 24), V3(-2, 1, 10), V3(0, 1, 10), 44, 40);
});
shot(S(4) - 0.1, 'LOT', (c, lt, d, v, t) => {
  c.tod = 'day'; const z = ZOMBIES[2]; place(z, LOT, 0, 0, 10, Math.PI * 0.9); zpose(z, t, 0); z.position.z = 10 - ss(clamp(lt / d)) * 0.8;
  crowd(LOT, 8, -6, 6, 13, 20, t, Math.PI, 1, 5, -2);
  return cam(lt, d, V3(0.3, 1.15, 7.2), V3(0.2, 1.25, 7.6), V3(0, 1.3, 10), null, 40, 30);
});
shot(S(5) - 0.05, 'LOT', (c, lt, d, v, t) => {
  c.tod = 'day'; const z = ZOMBIES[2]; place(z, LOT, 0, 0, 9.4, Math.PI); zpose(z, t * 3, 0); z.userData.state.talk = 1; z.userData.state.headPitch = -0.15;
  c.shake = 0.5; c.flashRed = 1 - clamp(lt / 0.4);
  return cam(lt, d, V3(0, 1.5, 8.0), V3(0, 1.48, 8.4), V3(0, 1.42, 9.4), null, 30, 24);
});
shot(S(6) - 0.1, 'LOT', (c, lt, d, v, t) => {
  c.tod = 'day'; c.doorOpen = 1 - ss(k01(lt, d - 1.0, d));
  walk(C.sardor, LOT, [1, 9], [0, -9.5], clamp(lt / (d - 0.9)), 2.4, true, t);
  crowd(LOT, 10, -8, 8, 12, 22, t, Math.PI, 1, 3, -lt * 0.6);
  return cam(lt, d, V3(1.5, 2.2, 16), V3(0.6, 2, 6), V3(0.5, 1.4, 4), V3(0, 1.8, -10), 40, 38);
});
shot(S(7) - 0.1, 'STORE', (c, lt, d, v, t) => {
  c.tod = 'day'; const st = reset(C.sardor, STORE, 0.5, 19.2, Math.PI); st.lean = -0.1; st.armUp = [0.3, 0.3]; st.blink = Math.min(1, blinkAt(t * 2) + (lt < 0.6 ? 0.6 : 0)); st.headPitch = -0.1;
  return cam(lt, d, V3(0.6, 1.55, 15.8), V3(0.6, 1.55, 16.6), V3(0.5, 1.45, 19.2), null, 36, 32);
});
shot(S(8) - 0.1, 'STORE', (c, lt, d, v, t) => {
  c.tod = 'day'; const st = reset(C.sardor, STORE, 0.5, 19.2, Math.PI); st.eyeS = 1.3; st.brow = 1;
  crowd(STORE, 6, -2.5, 3.5, 21.6, 22.6, t, Math.PI, 0, 4); c.thud = 1;
  return cam(lt, d, V3(0.5, 1.6, 15), V3(0.5, 1.7, 14.2), V3(0.5, 1.6, 20), null, 42, 46);
});
shot(S(9) - 0.1, 'LOT', (c, lt, d, v, t) => {
  c.tod = 'dusk'; c.overlay = 'big30'; crowd(LOT, 30, -20, 20, -2, 26, t, Math.PI, 1, 0, -1);
  return cam(lt, d, V3(-30, 26, 40), V3(-12, 20, 36), V3(0, 2, -6), V3(0, 3, -10), 40);
});
shot(S(10) - 0.1, 'STORE', (c, lt, d, v, t) => {
  c.tod = 'day'; group(STORE, [['sardor', 0.5, 9, Math.PI], ['mom', -1.2, 8.4, 2.6], ['girl', -1.8, 8.8, 2.6], ['old', 2.2, 8.4, -2.6], ['teen1', 3.2, 9.3, -2.4], ['teen2', 4.0, 9.8, -2.4], ['staff', -2.8, 9.8, 2.4], ['jacket', 5.3, 7.6, -2.0]], t);
  return cam(lt, d, V3(1, 5.5, 3), V3(1, 3.2, 4.2), V3(1, 0.8, 9), null, 40, 44);
});
// DAY 1
shot(S(11) - 0.4, 'STORE', (c, lt, d, v, t) => {
  c.tod = 'day'; c.red = 0.6; const st = reset(C.sardor, STORE, 0.5, 14, 0); st.headYaw = 0.3 * Math.sin(lt * 2); st.eyeS = 1.15;
  return cam(lt, d, V3(1.6, 1.6, 17.5), V3(1.0, 1.6, 16.6), V3(0.5, 1.5, 14), null, 36, 32);
});
shot(S(14) - 0.1, 'STORE', (c, lt, d, v, t) => {
  c.tod = 'day'; c.red = 0.5; crowd(STORE, 22, -14, 14, 23, 34, t, 0.4, 1, 0, 0);
  for (let i = 0; i < 22; i++) { const z = ZOMBIES[i]; z.position.x += Math.sin(lt * 0.6 + i) * 0.2 + lt * 0.5; z.userData.state.yaw = Math.PI / 2 + Math.sin(i) * 0.4; }
  const st = reset(C.sardor, STORE, -1.5, 19.6, Math.PI * 0.05); st.eyeS = 1.2;
  return cam(lt, d, V3(-3.5, 1.7, 15.6), V3(-2.5, 1.7, 16.5), V3(0, 1.4, 24), V3(1, 1.4, 26), 44, 40);
});
shot(S(15) - 0.1, 'STORE', (c, lt, d, v, t) => {
  c.tod = 'day'; c.barricade = ss(clamp(lt / d)); c.boxes = 0;
  for (const [n, x, ph] of [['sardor', -2.4, 0], ['staff', 0.2, 1], ['jacket', 2.6, 2], ['teen2', 4.4, 3]]) { const st = reset(C[n], STORE, x + Math.sin(lt * 2 + ph) * 0.3, 18.2 + Math.sin(lt * 3 + ph) * 0.4, 0); st.armUp = [1.1, 1.1]; st.lean = 0.25; st.walk = lt * 1.6 + ph; st.walkAmt = 0.6; }
  crowd(STORE, 10, -6, 6, 22.4, 25, t, Math.PI, 0, 8);
  return cam(lt, d, V3(7, 2.6, 12.5), V3(5, 2.2, 13.5), V3(0, 1.2, 19), null, 44, 40);
});
// lineup 16..21
const LINE = [['mom', -3, 9.8, 0.2], ['girl', -2.4, 10.1, 0.2], ['old', -1.0, 9.6, 0], ['teen1', 0.3, 9.9, 0], ['teen2', 1.0, 10.1, -0.1], ['staff', 2.3, 9.7, -0.15], ['jacket', 4.0, 9.2, -0.4]];
const FOCUS = { 16: [-0.2, 4.6], 17: [-2.7, 1.9], 18: [-1.0, 1.7], 19: [0.65, 2.0], 20: [2.3, 1.8], 21: [4.0, 1.8] };
for (const i of [16, 17, 18, 19, 20, 21]) shot(S(i) - 0.1, 'STORE', (c, lt, d, v, t) => {
  c.tod = 'day'; c.barricade = 1; c.boxes = 0.6;
  for (const [n, x, z, yaw] of LINE) { const st = reset(C[n], STORE, x, z, yaw); st.blink = blinkAt(t, x); st.headYaw = Math.sin(t * 0.5 + x) * 0.15; }
  C.girl.userData.state.headPitch = -0.2; C.jacket.userData.state.brow = -0.8; C.jacket.userData.state.headPitch = 0.1;
  const [fx, dist] = FOCUS[i]; const wide = i === 16;
  return cam(lt, d, V3(fx + 0.4, wide ? 2.2 : 1.45, 9.8 + dist + 0.4), V3(fx - 0.2, wide ? 2.0 : 1.45, 9.8 + dist), V3(fx, wide ? 1.0 : 1.2, 9.6), null, wide ? 46 : 34, wide ? 44 : 30);
});
shot(S(22) - 0.1, 'STORE', (c, lt, d, v, t) => {
  c.tod = 'day'; c.barricade = 1; c.boxes = 0.6; c.phone = ['nosig']; c.phoneAt = [V3(0.5, 1.45, 14.0), 0.0];
  const st = reset(C.sardor, STORE, 0.5, 14.8, Math.PI); st.headPitch = 0.45;
  return cam(lt, d, V3(0.55, 1.62, 13.25), V3(0.52, 1.56, 13.45), V3(0.5, 1.45, 14.0), null, 30, 26);
});
shot(S(23) - 0.1, 'LOT', (c, lt, d, v, t) => {
  c.tod = 'dusk'; c.storeDark = false; crowd(LOT, 36, -21, 21, -7, 20, t, Math.PI, 1, 0, 0);
  return cam(lt, d, V3(0, 34, 40), V3(14, 28, 34), V3(0, 0, -2), V3(0, 0, -4), 44, 42);
});
shot(S(24) - 0.1, 'STORE', (c, lt, d, v, t) => {
  c.tod = 'day'; c.barricade = 1; c.boxes = 1; crowd(STORE, 18, -9, 9, 22, 30, t, Math.PI, 0, 2);
  const st = reset(C.sardor, STORE, 0.5, 17, 0); st.lean = 0.05; st.headPitch = 0.05;
  return cam(lt, d, V3(0.5, 1.75, 12.5), V3(0.5, 1.7, 14), V3(0.5, 1.6, 19), null, 46, 42);
});
// DAY 3
shot(S(25) - 0.4, 'STORE', (c, lt, d, v, t) => {
  c.tod = 'day'; c.barricade = 1; c.boxes = 1; c.food = 0.8;
  group(STORE, [['sardor', -6, 11.5, Math.PI / 2, { armUp: [0.6, 0.6] }], ['mom', -4, 10.8, -2.2], ['girl', -4.2, 11.6, -2.2], ['old', -3.6, 12.4, -1.9], ['teen1', -5.2, 13.6, -2.8], ['teen2', -4.4, 13.5, -2.6], ['staff', -6.9, 13, 2.6], ['jacket', -7.6, 10.2, 1.0]], t);
  return cam(lt, d, V3(-1.5, 3.4, 16.5), V3(-2, 3.0, 15.5), V3(-5.5, 0.9, 12), null, 40, 38);
});
shot(S(27) - 0.1, 'STORE', (c, lt, d, v, t) => {
  c.tod = 'day'; c.food = 0.8;
  return cam(lt, d, V3(-10.6, 1.3, 2), V3(-10.6, 1.2, -4), V3(-11.8, 0.9, 0), V3(-11.8, 0.9, -6), 40, 40, x => x);
});
shot(S(28) - 0.1, 'STORE', (c, lt, d, v, t) => {
  c.tod = 'day'; c.barricade = 1; c.boxes = 1; c.food = lerp(0.75, 0.55, clamp(lt / d));
  for (const [n, x, z, ph] of [['mom', -4.5, -2, 0], ['old', -4.5, 2, 1.5], ['teen2', -9.5, 0, 3]]) { const st = walk(C[n], STORE, [x, z - 2], [x, z + 2], (Math.sin(lt * 0.4 + ph) + 1) / 2, 1.2, false, t); }
  return cam(lt, d, V3(-1.5, 4.6, 6), V3(-7, 4.6, 6), V3(-3, 0.6, -4), V3(-8, 0.6, -4), 46, 46, x => x);
});
// night storage
shot(S(30) - 0.1, 'STORE', (c, lt, d, v, t) => {
  c.tod = 'night'; c.lights = 'off'; c.food = 0.5; c.barricade = 1; c.boxes = 1;
  const st = walk(C.sardor, STORE, [-12, 9], [-15, -18.5], lt / (d + 1.5), 1.1, false, t); st.armUp = [1.0, 0];
  c.flash = 1; c.flashPos = C.sardor.position.clone().add(V3(0, 1.6, -0.8));
  return cam(lt, d, V3(-10.5, 1.9, 13), V3(-12.5, 1.9, 6), V3(-12.5, 1.2, 6), V3(-14.8, 1.4, -18), 44, 40);
});
shot(S(31) - 0.1, 'BACK', (c, lt, d, v, t) => {
  c.empties = 1; c.lights = 'off';
  const st = reset(C.sardor, BACK, -1.2, 4.6, Math.PI * 0.95); st.headPitch = 0.45; st.eyeS = 1.2;
  return cam(lt, d, V3(1.2, 2.6, 4.2), V3(0.8, 2.2, 3.8), V3(0, 0.2, 1), null, 42, 38);
});
shot(S(33) - 0.1, 'BACK', (c, lt, d, v, t) => {
  c.empties = 1; c.handprint = 1;
  const st = reset(C.sardor, BACK, 5.2, 3.4, Math.PI / 2 + 0.4); st.eyeS = 1.35; st.brow = 1;
  return cam(lt, d, V3(5.6, 1.7, 4.6), V3(6.6, 1.65, 4.2), V3(7.8, 1.6, 4), null, 40, 32);
});
shot(S(34) - 0.1, 'BACK', (c, lt, d, v, t) => {
  c.empties = 1; c.handprint = 1; c.knock = 1; c.thud = 1;
  const st = reset(C.sardor, BACK, 5.0, 3.8, Math.PI / 2); st.eyeS = 1.4; st.armUp = [0.4, 0.4]; st.lean = -0.12;
  return cam(lt, d, V3(2.8, 1.6, 5.4), V3(3.4, 1.55, 5.1), V3(6.4, 1.4, 4), null, 40, 36);
});
// DAY 7
CURSH = [10, 3];
shot(S(35) - 0.4, 'STORE', (c, lt, d, v, t) => {
  c.tod = 'day'; c.food = 0.45; c.barricade = 1; c.boxes = 1;
  const s1 = reset(C.teen1, STORE, 0.5, 6.2, 0.4); s1.armUp = [0.2, 0];
  const s2 = reset(C.staff, STORE, -0.6, 7.1, 2.4); s2.headPitch = 0.3;
  const k = ss(k01(lt, 1.6, 2.6)); s1.armUp = [1.1 * k, 0]; s1.armOut = [0.5 * k, 0.08]; s2.eyeS = 1 + 0.35 * k; s2.brow = k;
  return cam(lt, d, V3(-1.8, 1.5, 4.4), V3(-1.2, 1.4, 4.9), V3(0.2, 1.1, 6.6), null, 38, 32);
});
shot(S(37) - 0.1, 'STORE', (c, lt, d, v, t) => {
  c.tod = 'day'; c.food = 0.45; const s1 = reset(C.teen1, STORE, 0.5, 6.2, 0.4); s1.armUp = [1.1, 0]; s1.armOut = [0.5, 0.08]; s1.eyeS = 1.3; s1.brow = 1; s1.headPitch = 0.25;
  return cam(lt, d, V3(1.1, 1.35, 7.6), V3(1.0, 1.3, 7.35), V3(0.4, 1.05, 6.25), null, 32, 28);
});
const RING = (t, a = 1, b = 1, jab = 0) => [['teen1', 0.5, 6.2, 0.4, { armUp: [1.1 * a, 0], armOut: [0.5 * a, 0.08], eyeS: 1.3, brow: 1 }], ['teen2', 1.2, 5.8, -0.2], ['staff', -0.6, 7.1, 2.4], ['jacket', 2.0, 7.6, -2.3, { armUp: [0, 1.6 * b], brow: -1 }], ['sardor', -0.4, 4.8, 0.6], ['old', 1.6, 4.6, -0.6], ['mom', -1.6, 5.4, 1.2], ['girl', -1.9, 6.0, 1.3]];
shot(S(38) - 0.1, 'STORE', (c, lt, d, v, t) => {
  c.tod = 'day'; c.food = 0.45; group(STORE, RING(t, 1, ss(k01(lt, 0.4, 1.4))), t);
  return cam(lt, d, V3(3.6, 1.3, 9.6), V3(3.2, 1.25, 9.0), V3(2.0, 1.5, 7.6), null, 36, 34);
});
shot(S(39) - 0.1, 'STORE', (c, lt, d, v, t) => {
  c.tod = 'day'; c.food = 0.45; group(STORE, RING(t), t); const s1 = C.teen1.userData.state; s1.armUp = [1.3, 1.3]; s1.armOut = [0.2, 0.2]; s1.eyeS = 1.3; s1.talk = 0.5 + 0.5 * Math.sin(t * 14); s1.yaw = 0.9;
  return cam(lt, d, V3(1.9, 1.3, 7.2), V3(1.7, 1.28, 7.0), V3(0.5, 1.05, 6.2), null, 34, 30);
});
shot(S(41) - 0.1, 'STORE', (c, lt, d, v, t) => {
  c.tod = 'day'; c.food = 0.45; group(STORE, RING(t), t); if (v > S(42)) c.overlay = 'choice';
  const a = 0.6 + lt * 0.25;
  return { pos: V3(0.5 + Math.sin(a) * 4.2, 2.2, 6.2 + Math.cos(a) * 4.2), look: V3(0.5, 1.0, 6.2), fov: 44 };
});
shot(S(43) - 0.1, 'STORE', (c, lt, d, v, t) => {
  c.tod = 'day'; c.food = 0.45; const k = ss(k01(lt, 0.9, 1.4)); group(STORE, RING(t).filter(r => r[0] !== 'teen1'), t);
  const zt = C.zteen; place(zt, STORE, lerp(0.5, 1.3, k) + SHX, 0, lerp(6.2, 5.0, k) + SHZ, 2.6); zpose(zt, t * 2, 0); zt.userData.state.lean = 0.3 * k;
  C.old.userData.state.eyeS = 1 + 0.4 * k; C.old.userData.state.armUp = [1.2 * k, 1.2 * k]; C.old.userData.state.lean = -0.25 * k;
  if (lt > 1.2 && lt < 1.6) c.shake = 1;
  return cam(lt, d, V3(4.2, 1.4, 3.2), V3(3.6, 1.35, 3.5), V3(1.2, 1.1, 5.4), null, 40, 34);
});
shot(S(44) - 0.1, 'STORE', (c, lt, d, v, t) => {
  c.tod = 'day'; c.food = 0.45; c.shake = 1.4; c.flashRed = 0.5 * (1 - clamp(lt / 0.5));
  const zt = C.zteen; place(zt, STORE, 1.4 + SHX, 0, 4.8 + SHZ, 2.4); zpose(zt, t * 3, 0);
  const so = reset(C.old, STORE, 1.0, 4.2, 0.6, { armUp: [1.3, 1.3], eyeS: 1.4, lean: -0.3 });
  for (const [n, a, b] of [['mom', [-1.6, 5.4], [-5, 8]], ['teen2', [1.2, 5.8], [5, 9]], ['staff', [-0.6, 7.1], [-2, 1.5]]]) walk(C[n], STORE, a, b, lt / d, 2.6, true, t);
  return cam(lt, d, V3(3.4, 2.0, 1.0), V3(3.0, 1.9, 1.3), V3(0.8, 1.0, 5), null, 46, 44);
});
shot(S(45) - 0.1, 'STORE', (c, lt, d, v, t) => {
  c.tod = 'day'; c.food = 0.45; c.shake = 0.4;
  const k = lt / d; const s = walk(C.sardor, STORE, [-0.6, 5.0], [-3.6, 1.5], k, 2.2, true, t); s.armUp = [0.6, 0]; s.yaw += Math.PI;
  const g = walk(C.girl, STORE, [-1.2, 5.4], [-4.2, 1.9], k, 2.6, true, t); g.armUp = [0, 0.8]; g.yaw += Math.PI;
  const zt = C.zteen; place(zt, STORE, 1.4 + SHX, 0, 4.8 + SHZ, 2.4); zpose(zt, t * 3, 0);
  return cam(lt, d, V3(-5.5, 1.3, -0.5), V3(-6, 1.25, -0.6), V3(-1.8, 0.9, 3.5), V3(-3.6, 0.9, 1.8), 42, 40);
});
shot(S(46) - 0.1, 'STORE', (c, lt, d, v, t) => {
  c.tod = 'day'; c.food = 0.45; const s = reset(C.sardor, STORE, -3.6, 1.5, 0.5); s.headYaw = 0.35; s.brow = -0.6; s.eyeS = 1.1;
  reset(C.girl, STORE, -4.1, 1.2, 0.5, { armUp: [0, 0], headPitch: -0.25 });
  return cam(lt, d, V3(-2.7, 1.6, 3.6), V3(-2.95, 1.58, 3.0), V3(-3.6, 1.5, 1.5), null, 32, 26);
});
// ---------------------------------------------------------------- PHONE BREAK (PH .. PH+GAP)
const RING_AT = PH + 1.2, ANS = PH + 5.0, PV0 = PH + 5.6, PV1 = PV0 + 13.8;
TL.phone = { RING_AT, ANS, PV0, PV1 };
const QUIET = (t) => [['sardor', -3.6, 1.5, 0.5], ['girl', -4.1, 1.2, 0.5], ['mom', -4.6, 3.4, 2.6], ['old', -1.6, 2.6, -2.3], ['teen2', -3.0, 1.4, -0.4], ['staff', -4.9, 2.9, 2.3], ['jacket', -2.0, 1.8, -1.2]];
shot(PH, 'STORE', (c, lt, d, v, t) => {
  c.tod = 'day'; c.food = 0.45; group(STORE, QUIET(t), t);
  const r = v > RING_AT; for (const [n] of QUIET(t)) { const st = C[n].userData.state; if (n !== 'sardor' && r) { st.headYaw = 0; st.eyeS = 1.25; st.brow = 0.6; } }
  C.sardor.userData.state.eyeS = r ? 1.35 : 1; C.sardor.userData.state.headPitch = r ? 0.35 : 0;
  return cam(lt, d, V3(-1.2, 2.8, 6.5), V3(-1.8, 2.3, 5.4), V3(-3.2, 1.1, 1.6), null, 44, 40);
});
shot(PH + 3.0, 'STORE', (c, lt, d, v, t) => {
  c.tod = 'day'; c.food = 0.45; c.phone = ['call', {}]; c.phoneAt = [V3(-3.55, 1.25, 2.1), 0.5 - Math.PI];
  const s = reset(C.sardor, STORE, -3.6, 1.5, 0.5); s.headPitch = 0.5; s.eyeS = 1.35;
  return cam(lt, d, V3(-3.2, 1.7, 2.75), V3(-3.25, 1.65, 2.62), V3(-3.55, 1.25, 2.1), null, 30, 27);
});
shot(ANS, 'STORE', (c, lt, d, v, t) => {
  c.tod = 'day'; c.food = 0.45; group(STORE, QUIET(t), t);
  const s = C.sardor.userData.state; s.armUp = [0, 2.6]; s.armOut = [0.08, 0.55]; s.headYaw = 0.2; s.eyeS = 1.2;
  for (const [n] of QUIET(t)) if (n !== 'sardor') { const st = C[n].userData.state; st.eyeS = 1.25; st.headPitch = 0.05; }
  if (v > PV0) c.overlay = 'sub';
  return cam(lt, d, V3(-1.6, 2.0, 5.6), V3(-2.3, 1.8, 4.6), V3(-3.6, 1.45, 1.5), null, 38, 34);
});
shot(PV1 + 0.1, 'STORE', (c, lt, d, v, t) => {
  c.tod = 'day'; c.food = 0.45; group(STORE, QUIET(t), t);
  const s = C.sardor.userData.state; s.armUp = [0, 2.6 * (1 - ss(clamp(lt / 0.6)))]; s.eyeS = 1.2; s.headYaw = Math.sin(lt * 3) * 0.4;
  for (const [n] of QUIET(t)) if (n !== 'sardor') { const st = C[n].userData.state; st.headYaw = Math.sin(lt * 2 + st.yaw) * 0.5; st.brow = 0.8; }
  return cam(lt, d, V3(-1.2, 2.2, 5.2), V3(-1.0, 2.0, 5.6), V3(-3.2, 1.2, 1.6), null, 46, 46);
});
CURSH = [0, 0];
// DAY 10
shot(S(47) - 0.4, 'BACK', (c, lt, d, v, t) => {
  c.knock = 1; c.handprint = 1; c.thud = 1;
  return cam(lt, d, V3(3.5, 1.6, 6.8), V3(4.2, 1.6, 6.0), V3(7.8, 1.4, 4), null, 42, 38);
});
shot(S(49) - 0.1, 'STORE', (c, lt, d, v, t) => {
  c.tod = 'night'; c.food = 0.35; c.barricade = 1; c.boxes = 1; c.cracks = lerp(0.3, 0.8, clamp((v - S(49)) / 8));
  crowd(STORE, 26, -12, 12, 21.6, 28, t, Math.PI, 0, 1); for (let i = 0; i < 8; i++) { const z = ZOMBIES[(i + 1) % 36]; z.position.z = 21.6 + Math.abs(Math.sin(t * 4 + i)) * 0.2; }
  c.thud = 1;
  return cam(lt, d, V3(-4, 1.4, 13.5), V3(3, 1.6, 13.5), V3(-1, 1.8, 21), V3(1, 1.8, 21), 44, 44, x => x);
});
shot(S(51) - 0.1, 'STORE', (c, lt, d, v, t) => {
  c.tod = 'night'; c.food = 0.35; c.barricade = 1; c.boxes = 1; c.cracks = 0.9; c.shake = 0.25;
  crowd(STORE, 16, -6, 6, 21.6, 25, t, Math.PI, 0, 3);
  return cam(lt, d, V3(0.6, 0.6, 17.2), V3(0.6, 0.7, 17.8), V3(0, 1.4, 21), null, 48, 40);
});
shot(S(52) - 0.1, 'BACK', (c, lt, d, v, t) => {
  c.foodPile = lerp(0.3, 1, clamp(lt / 3)); c.exitOpen = 0;
  const k = clamp(lt / 3); const s = walk(C.sardor, BACK, [-3, -26], [2.4, -34.4], k, 1.3, false, t); s.armUp = [0.9, 0.9];
  if (lt > 3) { const s2 = reset(C.sardor, BACK, 4, -30 + 1.6, Math.PI / 2); s2.headYaw = 0; }
  return lt < 3 ? cam(lt, 3, V3(-4.5, 2.5, -24.6), V3(-3.6, 2.3, -26.8), V3(0, 1, -32), V3(2, 1, -34), 44)
    : cam(lt - 3, d - 3, V3(2.6, 1.8, -25.0), V3(3.2, 1.7, -25.5), V3(5.6, 1.3, -28.4), null, 42, 38);
});
shot(S(53) - 0.1, 'LOT', (c, lt, d, v, t) => {
  c.tod = 'night'; crowd(LOT, 36, -21, 21, 2, 26, t, Math.PI * 0.8, 1, 2, 0);
  return cam(lt, d, V3(18, 9, -8), V3(16, 8.5, -6), V3(0, 0.5, 12), V3(-2, 0.5, 12), 46, 42);
});
shot(S(55) - 0.1, 'BACK', (c, lt, d, v, t) => {
  c.foodPile = 1; const s = reset(C.sardor, BACK, 3.0, -28.2, -2.0, { sit: 1 }); s.headPitch = 0.2; s.blink = blinkAt(t);
  C.sardor.position.y = 0.05;
  return cam(lt, d, V3(-1, 1.4, -26), V3(-0.4, 1.3, -26.4), V3(3, 0.8, -28.4), null, 42, 38);
});
// DAY 15
shot(S(56) - 0.4, 'STORE', (c, lt, d, v, t) => {
  c.tod = 'night'; c.food = 0.3; c.barricade = 1; c.boxes = 1; c.cracks = 0.9;
  const off = v > S(57) + 0.9; c.lights = off ? 'off' : 'on'; if (v > S(57) + 0.75 && v < S(57) + 1.05) c.lights = 'off';
  if (v > S(59)) c.red = 1;
  return cam(lt, d, V3(0.5, 3.4, 15), V3(0.5, 2.6, 9), V3(0.5, 1.5, -10), null, 46, 44);
});
shot(S(60) - 0.1, 'STORE', (c, lt, d, v, t) => {
  c.tod = 'night'; c.food = 0.3; c.lights = 'off'; c.red = 1; c.barricade = 1; c.boxes = 1;
  const s = walk(C.sardor, STORE, [-4.5, 5], [-4.5, -2], lt / (d + 3), 0.8, false, t); s.armUp = [1.0, 0]; s.eyeS = 1.25;
  c.flash = 1; c.flashPos = C.sardor.position.clone().add(V3(0, 1.5, -0.6));
  const z = ZOMBIES[5]; const k = clamp((v - S(61)) / 1.8); place(z, STORE, lerp(-6.6, -2.4, k), 0, -10, Math.PI / 2); zpose(z, t, t * 2); z.visible = v > S(61) - 0.2 && k < 1;
  return cam(lt, d, V3(-4.6, 1.7, 8.5), V3(-4.6, 1.7, 5.5), V3(-4.5, 1.5, -6), V3(-4.5, 1.5, -10), 40, 38);
});
shot(S(62) - 0.1, 'STORE', (c, lt, d, v, t) => {
  c.tod = 'night'; c.food = 0.3; c.lights = 'off'; c.red = 1; c.dock = 0.6;
  const z = ZOMBIES[7]; place(z, STORE, 15.6 - lt * 0.5, 0, -15, -Math.PI / 2); zpose(z, t, t * 1.2);
  return cam(lt, d, V3(10.5, 1.6, -10.5), V3(11.2, 1.6, -11.5), V3(15.5, 1.3, -15), null, 42, 38);
});
shot(S(63) - 0.1, 'STORE', (c, lt, d, v, t) => {
  c.tod = 'night'; c.food = 0.3; c.lights = 'off'; c.red = 1; c.dock = 0.6; c.shake = 0.9; c.flashRed = 0.4 * (1 - clamp(lt / 0.5));
  const z = ZOMBIES[7]; const k = ss(clamp(lt / 0.8)); place(z, STORE, lerp(14.8, 13.4, k), 0, -15, -Math.PI / 2); zpose(z, t * 2, 0); z.userData.state.lean = 0.35;
  const j = reset(C.jacket, STORE, 12.9, -15.1, Math.PI / 2, { armUp: [1.4, 1.4], eyeS: 1.4, lean: -0.3 }); C.jacket.position.x -= k * 0.4;
  return cam(lt, d, V3(11.5, 1.5, -11.8), V3(11.7, 1.45, -12.4), V3(13.4, 1.2, -15), null, 40, 34);
});
shot(S(64) - 0.1, 'STORE', (c, lt, d, v, t) => {
  c.tod = 'night'; c.food = 0.3; c.lights = 'off'; c.red = 1; c.dock = 0.6 * (1 - ss(clamp(lt / 0.9))); if (lt > 0.85 && lt < 1.3) c.shake = 1.2;
  const s = reset(C.sardor, STORE, 15.9, -13.4, Math.PI / 2, { armUp: [2.4, 2.4], lean: 0.1 }); s.eyeS = 1.2; s.brow = -0.6;
  return cam(lt, d, V3(12.6, 1.4, -12.6), V3(12.9, 1.4, -12.8), V3(16, 1.6, -14.4), null, 44, 40);
});
shot(S(65) - 0.1, 'STORE', (c, lt, d, v, t) => {
  c.tod = 'night'; c.food = 0.3; c.lights = 'off'; c.red = 1;
  const k = ss(k01(lt, 0.2, 1.0)); const s = reset(C.sardor, STORE, 15.6, -13.6, Math.PI / 2 + Math.PI * k); s.eyeS = 1.4; s.brow = 1;
  return cam(lt, d, V3(11.5, 1.65, -13.2), V3(12.2, 1.6, -13.4), V3(15.6, 1.4, -13.6), V3(15.6, 1.45, -13.6), 40, 34);
});
// DAY 21
shot(S(66) - 0.4, 'STORE', (c, lt, d, v, t) => {
  c.tod = 'day'; c.food = 0.08; c.barricade = 1; c.boxes = 1; c.cracks = 1;
  reset(C.mom, STORE, -1.2, 3.0, 0.4, { sit: 1, lean: 0.25, headPitch: 0.3 }); C.mom.position.y = 0.06;
  reset(C.girl, STORE, -0.6, 3.1, 0.2, { sit: 1, lean: 0.3, headPitch: 0.35, blink: 0.6 }); C.girl.position.y = 0.04;
  const s = reset(C.sardor, STORE, 0.9, 4.2, -2.2); s.headPitch = 0.35;
  return cam(lt, d, V3(1.8, 2.6, 8.5), V3(1.2, 2.0, 7.4), V3(-0.4, 0.6, 3), null, 42, 38);
});
shot(S(69) - 0.1, 'BACK', (c, lt, d, v, t) => {
  c.foodPile = 0.1; c.exitOpen = ss(k01(lt, 0.4, 1.6));
  const s = reset(C.sardor, BACK, 3.6, -28.4, Math.PI / 2 + 0.25); s.eyeS = 1 + 0.4 * c.exitOpen; s.brow = c.exitOpen;
  return cam(lt, d, V3(-0.8, 1.7, -28.8), V3(0.2, 1.7, -28.6), V3(5.5, 1.4, -28.4), null, 42, 36);
});
shot(S(70) - 0.1, 'BACK', (c, lt, d, v, t) => {
  c.radio = 1; reset(C.jacket, BACK, 0, -63, Math.PI, { armUp: [0, 1.1], headPitch: 0.05 }); BACK.radio.position.set(-0.3, 1.25, -62.6);
  const s = reset(C.sardor, BACK, 0.7, -60.6, -0.2); s.eyeS = 1.3;
  return cam(lt, d, V3(-1.0, 1.7, -59.2), V3(-0.8, 1.65, -59.8), V3(0, 1.4, -63), null, 40, 34);
});
shot(S(71) - 0.1, 'BACK', (c, lt, d, v, t) => {
  c.radio = 1; const j = reset(C.jacket, BACK, 0, -63, Math.PI, { armUp: [0, 1.1] }); j.talk = v > S(72) ? 0.5 + 0.5 * Math.sin(t * 18) : 0; BACK.radio.position.set(-0.3, 1.25, -62.6);
  reset(C.sardor, BACK, 0.7, -60.6, -0.2, { eyeS: 1.1 });
  return cam(lt, d, V3(-0.9, 1.75, -59.4), V3(-0.7, 1.7, -60.0), V3(0.1, 1.4, -63), null, 40, 36);
});
shot(S(74) - 0.1, 'BACK', (c, lt, d, v, t) => {
  c.radio = 1; c.overlay = 'three'; const j = reset(C.jacket, BACK, 0, -63, Math.PI, { armUp: [0, 1.1], brow: -1 }); j.talk = 0.5 + 0.5 * Math.sin(t * 16); BACK.radio.position.set(-0.3, 1.25, -62.6);
  return cam(lt, d, V3(0.5, 1.6, -60.6), V3(0.45, 1.57, -61.0), V3(0, 1.45, -63), null, 38, 34);
});
shot(S(75) - 0.1, 'STORE', (c, lt, d, v, t) => {
  c.tod = 'day'; c.food = 0.05; c.barricade = 1; c.boxes = 1; c.cracks = 1; c.shake = v < S(76) ? 1.3 : 0.6;
  const br = v > S(76) - 0.3; if (br) c.broken = ss(clamp((v - S(76) + 0.3) / 0.5));
  crowd(STORE, 24, -8, 8, br ? 16 - (v - S(76)) * 2.5 : 22, br ? 26 - (v - S(76)) * 2.5 : 28, t, Math.PI, 1, 0, 0);
  if (br && v < S(76) + 0.25) c.flashW = 0.7;
  return cam(lt, d, V3(0.5, 1.8, 7), V3(0.5, 1.6, 6), V3(0.5, 1.6, 20), null, 46, 50);
});
shot(S(77) - 0.1, 'STORE', (c, lt, d, v, t) => {
  c.tod = 'day'; c.food = 0.05; c.broken = 1; crowd(STORE, 20, -6, 6, 14 - lt * 2, 22 - lt * 2, t, Math.PI, 1, 4);
  const s = walk(C.sardor, STORE, [0.5, 8], [0.5, -2], lt / (d + 1), 2.6, true, t); s.yaw = Math.PI; s.eyeS = 1.3;
  return cam(lt, d, V3(0.5, 1.5, -1.5 - lt * 1.4), V3(0.5, 1.5, -3), V3(0.5, 1.4, 7), V3(0.5, 1.4, 3), 44);
});
// DAY 30
shot(S(78) - 0.4, 'BACK', (c, lt, d, v, t) => {
  c.exitOpen = ss(k01(v, S(79), S(79) + 1.2));
  group(BACK, [['sardor', 4.2, -28.6, Math.PI / 2], ['girl', 3.4, -28.0, Math.PI / 2], ['mom', 2.6, -28.9, Math.PI / 2], ['staff', 2.4, -27.5, Math.PI / 2]], t);
  return cam(lt, d, V3(-1.5, 1.9, -27.2), V3(0, 1.8, -27.6), V3(5.6, 1.3, -28.6), null, 44, 40);
});
shot(S(80) - 0.1, 'LOT', (c, lt, d, v, t) => {
  c.tod = 'day'; crowd(LOT, 34, -22, 22, -4, 26, t, Math.PI * 0.7, 1, 1, 0);
  return cam(lt, d, V3(26, 7, -6), V3(24, 6, 6), V3(0, 0.5, 8), V3(-4, 0.5, 10), 48, 46);
});
shot(S(81) - 0.1, 'LOT', (c, lt, d, v, t) => {
  c.tod = 'day'; const k = lt / (d + 4);
  const s = walk(C.sardor, LOT, [21, -6], [6, 2], k, 2.6, true, t); s.armUp = [0, 0.7];
  const g = walk(C.girl, LOT, [21.7, -6.6], [6.7, 1.4], k, 3, true, t); g.armUp = [0.7, 0];
  walk(C.mom, LOT, [22.6, -7.3], [7.6, 0.7], k, 2.6, true, t); walk(C.staff, LOT, [20.4, -7.6], [5.4, 0.4], k, 2.6, true, t);
  crowd(LOT, 14, -10, 14, 8, 26, t, Math.PI, 1, 6);
  const p = C.sardor.position;
  return { pos: V3(p.x + 3.2, 1.3, p.z + 3.6), look: V3(p.x - 0.5, 1.0, p.z), fov: 42 };
});
shot(S(82) - 0.1, 'LOT', (c, lt, d, v, t) => {
  c.tod = 'day'; const z = ZOMBIES[9]; place(z, LOT, 6, 0, 9, Math.PI); zpose(z, t, 0); const k = ss(k01(lt, 0.2, 0.9)); z.userData.state.yaw = Math.PI + k * 2.2;
  crowd(LOT, 14, -6, 14, 12, 26, t, v > S(83) ? 2.4 : Math.PI, v > S(83) ? 1 : 0, 10);
  return cam(lt, d, V3(4.6, 1.6, 6.6), V3(4.8, 1.6, 7.0), V3(6, 1.5, 9), V3(6, 1.5, 12), 34, 46);
});
shot(S(84) - 0.1, 'LOT', (c, lt, d, v, t) => {
  c.tod = 'day'; const k = clamp(lt / (d - 0.2));
  const s = walk(C.sardor, LOT, [-6, 4], [-18.4, 3.6], k, 2.6, true, t);
  walk(C.girl, LOT, [-5.4, 4.6], [-18.0, 4.4], k, 3, true, t); walk(C.mom, LOT, [-5, 3.2], [-18.2, 2.2], k, 2.6, true, t);
  crowd(LOT, 12, -2, 12, 4, 16, t, -Math.PI / 2, 1, 3, 0); for (let i = 0; i < 12; i++) ZOMBIES[(i + 3) % 36].position.x -= lt * 1.1;
  return cam(lt, d, V3(-26, 2.5, 10), V3(-25, 2.4, 9), V3(-12, 1, 3), V3(-17, 1.4, 3), 46, 42);
});
shot(S(85) - 0.1, 'LOT', (c, lt, d, v, t) => {
  c.tod = 'day'; c.truckLights = v > S(85) + 0.8;
  const st = reset(C.staff, LOT, -20.5, 3.6, 0, { sit: 1, armUp: [1.2, 1.2] }); C.staff.position.y = 0.55; st.eyeS = 1.2;
  return cam(lt, d, V3(-19.6, 1.9, 7.8), V3(-19.8, 1.85, 7.4), V3(-20.4, 1.6, 4.0), null, 36, 32);
});
shot(S(86) - 0.1, 'LOT', (c, lt, d, v, t) => {
  c.tod = 'day'; c.truckLights = 1; const k = ein(clamp(lt / d)); LOT.truck.position.set(-20, 0, 2 + k * 30);
  crowd(LOT, 18, -18, -4, -2, 14, t, -1.4, 1, 0, 0);
  return cam(lt, d, V3(-8, 2.2, 22), V3(-10, 2.6, 30), V3(-20, 1.6, 4), V3(-20, 1.6, 28), 46, 40);
});
// ROAD
const roadZ = v => -((v - S(87)) * 9);
shot(S(87) - 0.1, 'ROAD', (c, lt, d, v, t) => {
  c.tod = 'dusk'; c.truckZ = roadZ(v);
  return cam(lt, d, V3(14, 12, c.truckZ - 26), V3(8, 6, c.truckZ - 18), V3(-2.5, 1.5, c.truckZ), null, 44, 40, x => x);
});
// cab interior set (ROAD local x=100), windshield at +z
const K = (x, y, z) => V3(100 + x, y, z);
function cabCast(t) {
  for (const [n, x, o] of [['sardor', -0.6, { sit: 1, armUp: [1.25, 1.25] }], ['girl', 0.05, { sit: 1 }], ['mom', 0.65, { sit: 1 }]]) { const st = reset(C[n], ROAD, 100 + x, 0.35, 0, o); C[n].position.y = 0.7; st.blink = blinkAt(t, x * 5); }
  C.girl.position.y = 0.95;
}
shot(S(88) - 0.1, 'ROAD', (c, lt, d, v, t) => {
  c.tod = 'dusk'; c.truckZ = roadZ(v); c.radioOn = 1; cabCast(t); c.shake = 0.15; C.sardor.userData.state.headYaw = 0.5;
  return cam(lt, d, K(1.05, 2.75, -0.3), K(0.9, 2.7, -0.1), K(-0.1, 2.1, 1.6), null, 52, 48);
});
shot(S(89) - 0.1, 'ROAD', (c, lt, d, v, t) => {
  c.tod = 'dusk'; c.truckZ = roadZ(v); c.radioOn = 1; cabCast(t); c.overlay = 'radio'; c.shake = 0.1;
  return cam(lt, d, K(0.3, 2.35, 0.75), K(0.28, 2.25, 0.95), K(0.25, 2.02, 1.55), null, 38, 32);
});
shot(S(91) - 0.1, 'ROAD', (c, lt, d, v, t) => {
  c.tod = 'dusk'; c.truckZ = roadZ(v); cabCast(t); const g = C.girl.userData.state; g.headYaw = -0.6; g.headPitch = -0.25; g.talk = v > S(91) + 1.1 ? 0.3 + 0.3 * Math.sin(t * 15) : 0; c.shake = 0.12;
  C.sardor.userData.state.headYaw = 0.3;
  return cam(lt, d, K(0.3, 2.3, 1.6), K(0.25, 2.28, 1.55), K(0.0, 2.15, 0.35), null, 50, 46);
});
shot(S(92) - 0.1, 'ROAD', (c, lt, d, v, t) => {
  c.tod = 'dusk'; c.truckZ = roadZ(v); cabCast(t); const s = C.sardor.userData.state; s.brow = -0.7; s.headYaw = 0; c.shake = 0.1;
  return cam(lt, d, K(-0.3, 2.3, 1.6), K(-0.35, 2.28, 1.5), K(-0.6, 2.2, 0.35), null, 42, 36);
});
shot(S(93) - 0.1, 'ROAD', (c, lt, d, v, t) => {
  c.tod = 'dusk'; c.truckZ = roadZ(v); c.shake = 0.12;
  const st = reset(C.staff, ROAD, 100.4, -2.6, 0.3, { sit: 1, armUp: [1.0, 1.25], armOut: [0.5, -0.1], headPitch: 0.4, lean: 0.3 }); C.staff.position.y = 0.36; st.blink = 0.4;
  return v < S(94) ? cam(lt, S(94) - S(93), K(-0.95, 2.05, -0.7), K(-0.8, 2.0, -1.0), K(0.4, 0.95, -2.6), null, 54, 50)
    : cam(v - S(94), 2, K(-0.5, 1.75, -1.4), K(-0.35, 1.7, -1.65), K(0.4, 1.3, -2.55), null, 36, 30);
});
shot(S(95) - 0.1, 'ROAD', (c, lt, d, v, t) => {
  c.tod = 'dusk'; c.truckZ = roadZ(v); if (v > S(98)) c.overlay = 'q';
  return cam(lt, d, V3(-14, 3, c.truckZ - 20), V3(-30, 26, c.truckZ + 30), V3(-2.5, 1.5, c.truckZ), V3(-2.5, 1.5, c.truckZ - 30), 40, 44, x => x);
});
shot(VEND + 0.2, 'ROAD', (c, lt, d, v, t) => { c.tod = 'dusk'; c.truckZ = roadZ(v); c.overlay = 'end'; return { pos: V3(-30, 26, c.truckZ + 30), look: V3(-2.5, 1.5, c.truckZ - 30), fov: 44 }; });

// ---------------------------------------------------------------- overlay
const ov = document.createElement('canvas'); ov.width = 1920; ov.height = 1080; const oc = ov.getContext('2d');
function txt(s, x, y, size, col = '#fff', align = 'center', alpha = 1, stroke = 0) {
  oc.save(); oc.globalAlpha = alpha; oc.font = `${size}px ${FONT}`; oc.textAlign = align; oc.textBaseline = 'middle';
  if (stroke) { oc.lineWidth = stroke; oc.strokeStyle = '#0a0a12'; oc.lineJoin = 'round'; oc.strokeText(s, x, y); }
  oc.fillStyle = col; oc.fillText(s, x, y); oc.restore();
}
function rrect(x, y, w, h, r, fill, alpha = 1, line = 0) { oc.save(); oc.globalAlpha = alpha; oc.beginPath(); oc.roundRect(x, y, w, h, r); oc.fillStyle = fill; oc.fill(); if (line) { oc.lineWidth = line; oc.strokeStyle = '#0a0a12'; oc.stroke(); } oc.restore(); }
const DAYS = [[11, '1-KUN', 1], [25, '3-KUN', 0.8], [35, '7-KUN', 0.6], [47, '10-KUN', 0.45], [56, '15-KUN', 0.3], [66, '21-KUN', 0.1], [78, '30-KUN', 0]];
const bk = (x, s = 1.8) => back(x, s);
function hud(v) {
  let cur = null; for (const dd of DAYS) if (v >= S(dd[0]) - 0.4) cur = dd;
  if (!cur || v > VEND || (v > PH && v < PH + GAP)) return;
  const lt = v - (S(cur[0]) - 0.4);
  if (lt < 1.3) {
    const a = 1 - clamp((lt - 1.0) / 0.3); rrect(0, 0, 1920, 1080, 0, 'rgba(10,6,6,0.55)', a);
    const q = bk(clamp(lt / 0.3), 2.2); txt(cur[1], 960, 520, Math.max(1, 230 * q), '#ffffff', 'center', a, 16); return;
  }
  const q = bk(clamp((lt - 1.3) / 0.3)); if (q <= 0) return;
  oc.font = `50px ${FONT}`; const tw = oc.measureText(cur[1]).width;
  rrect(40, 36, (tw + 70) * q, 84, 42, '#c8282a', 1, 5); if (q > 0.8) txt(cur[1], 75, 80, 50, '#fff', 'left');
  const mx = 1855, y0 = 150, y1 = 600; rrect(mx - 32, y0 - 10, 64, y1 - y0 + 20, 30, 'rgba(20,20,30,0.85)', 1, 4);
  const f = cur[2]; rrect(mx - 20, y1 - (y1 - y0) * f, 40, (y1 - y0) * f + 0.01, 18, f > 0.3 ? '#f2c94c' : '#e8463a');
  txt('OVQAT', mx, y1 + 45, 30, '#fff', 'center', 1, 6); txt(Math.round(f * 100) + '%', mx, y1 + 82, 30, '#fff', 'center', 1, 6);
}
function captions(v) {
  if (v > PH && v < PH + GAP) return;
  let cur = null; for (const s of SENT) if (s.start - 0.05 <= v && v <= s.end + 0.25) cur = s; if (!cur) return;
  const words = cur.text.replace(/"/g, '').split(' '); const a = cur.start, b = cur.end;
  const tot = words.reduce((x, w) => x + w.length + 1, 0); let acc = 0; const st = words.map(w => { const r = a + (b - a) * acc / tot; acc += w.length + 1; return r; });
  oc.font = `50px ${FONT}`; const lines = []; let ln = [];
  for (let i = 0; i < words.length; i++) { const tryL = [...ln, i].map(j => words[j]).join(' '); if (ln.length && oc.measureText(tryL).width > 1400) { lines.push(ln); ln = [i]; } else ln.push(i); }
  lines.push(ln); const y0 = 990 - (lines.length - 1) * 64;
  lines.forEach((L, li) => {
    const ws = L.map(i => oc.measureText(words[i] + ' ').width); let x = 960 - ws.reduce((p, q) => p + q, 0) / 2;
    L.forEach((i, k) => { const act = st[i] <= v && v < (i + 1 < words.length ? st[i + 1] : b + 0.25); txt(words[i], x, y0 + li * 64, 50, act ? '#ffd628' : '#ffffff', 'left', 1, 9); x += ws[k]; });
  });
}
function drawOverlay(c, v, lt) {
  oc.clearRect(0, 0, 1920, 1080); oc.drawImage(renderer.domElement, 0, 0);
  if (c.overlay === 'title') {
    const a = clamp(lt / 0.4) * (1 - clamp((lt - 2.0) / 0.5)); const q = bk(clamp(lt / 0.4));
    txt('30 KUN', 960, 420, 200 * q + 1, '#ffffff', 'center', a, 16); txt('ZOMBILAR ICHIDA', 960, 580, 110 * q + 1, '#ff4a3a', 'center', a, 12);
  }
  if (c.overlay === 'big30') { const q = bk(clamp(lt / 0.4)); txt('30 KUN', 960, 300, 180 * q + 1, '#ffffff', 'center', 1 - clamp((lt - 3.2) / 0.4), 14); }
  if (c.overlay === 'choice') { const q = bk(clamp((v - S(42)) / 0.3)); rrect(420 - 300 * (1 - q), 160, 480, 110, 30, '#2a9a4a', q, 6); txt('UNI?', 660 - 300 * (1 - q), 215, 64, '#fff', 'center', q); rrect(1020 + 300 * (1 - q), 160, 480, 110, 30, '#c8282a', q, 6); txt('HAMMANI?', 1260 + 300 * (1 - q), 215, 64, '#fff', 'center', q); }
  if (c.overlay === 'three') { const q = bk(clamp((v - S(74) - 0.8) / 0.3)); txt('FAQAT 3 KISHI', 960, 180, 120 * q + 1, '#ffd628', 'center', q, 12); }
  if (c.overlay === 'radio') { const a = clamp((v - S(89)) / 0.3); rrect(560, 120, 800, 90, 20, 'rgba(10,20,10,0.8)', a, 4); txt('📻  EVAKUATSIYA MARKAZLARI YO\'Q', 960, 165, 40, '#7aff8a', 'center', a); }
  if (c.overlay === 'q') { const q = bk(clamp((v - S(98)) / 0.4)); txt('UNI TASHLAB KETARMIDINGIZ?', 960, 200, 86 * q + 1, '#ffffff', 'center', q, 12); }
  if (c.overlay === 'sub') {
    const tt = v - PV0; const q = bk(clamp(tt / 0.4));
    rrect(560, 70, 800, 120, 60, '#ffffff', q, 6); const pressed = tt > 3.2;
    rrect(1020, 92, 300, 76, 38, pressed ? '#8a8a96' : '#e8302a', q); txt(pressed ? "OBUNA ✓" : "OBUNA BO'LISH", 1170, 131, 34, '#fff', 'center', q);
    txt('ZOMBI HIKOYALAR', 790, 131, 40, '#1a1a22', 'center', q);
    if (tt > 2.4 && tt < 3.6) { const k = clamp((tt - 2.4) / 0.8); const hx = lerp(1500, 1170, ss(k)), hy = lerp(330, 140, ss(k)); oc.save(); oc.font = `90px ${FONT}`; oc.fillText('👆', hx - 30, hy + 60); oc.restore(); }
    if (tt > 4.5) { const q2 = bk(clamp((tt - 4.5) / 0.4)); txt('🔔  IZOH QOLDIRING!', 960, 250, 64 * q2 + 1, '#ffd628', 'center', q2, 10); }
    if (tt > 8.5) { const q3 = bk(clamp((tt - 8.5) / 0.4)); txt('SIZGA OSON — BIZGA MUHIM', 960, 900, 70 * q3 + 1, '#ffffff', 'center', q3, 10); }
  }
  if (c.overlay === 'end') {
    rrect(0, 0, 1920, 1080, 0, '#000', clamp(lt / 0.6) * 0.75);
    txt("IZOHLARDA YOZING", 960, 440, 110, '#ffffff', 'center', clamp((lt - 0.3) / 0.5), 12);
    txt("Siz qancha omon qolgan bo'lardingiz?", 960, 570, 56, '#ffd628', 'center', clamp((lt - 0.8) / 0.5), 8);
    rrect(760, 650, 400, 90, 45, '#e8302a', clamp((lt - 1.3) / 0.5), 5); txt("OBUNA BO'LING", 960, 696, 44, '#fff', 'center', clamp((lt - 1.3) / 0.5));
  }
  hud(v); captions(v);
}

// ---------------------------------------------------------------- frame
const camera = new THREE.PerspectiveCamera(38, 16 / 9, 0.05, 600);
window.renderFrame = (fi) => {
  const t = fi / 30, v = t - PRE;
  let cur = SH[0], idx = 0; for (let i = 0; i < SH.length; i++) if (v >= SH[i].t0) { cur = SH[i]; idx = i; }
  const nxt = SH[idx + 1] ? SH[idx + 1].t0 : DUR; const lt = v - cur.t0, d = nxt - cur.t0;
  for (const p of ALL) p.visible = false; phone.visible = false; LOT.truck.position.set(-20, 0, 2);
  const c = { tod: 'day', lights: 'on' };
  showSet(cur.set);
  SHX = cur.sh[0]; SHZ = cur.sh[1];
  const cm = cur.fn(c, lt, d, v, t);
  cm.pos = cm.pos.clone().add(V3(SHX, 0, SHZ)); cm.look = cm.look.clone().add(V3(SHX, 0, SHZ)); if (c.phoneAt) c.phoneAt = [c.phoneAt[0].clone().add(V3(SHX, 0, SHZ)), c.phoneAt[1]];
  if (c.phone) { const [pos, ry] = c.phoneAt; SETS[cur.set].g.add(phone); phone.position.copy(pos); phone.rotation.set(-0.5, ry + Math.PI, 0); phone.visible = true; phone.userData.show(...c.phone); if (c.phone[0] === 'call') phone.position.x += (Math.sin(t * 60) * 0.004) * (v < ANS ? 1 : 0); }
  for (const s of Object.values(SETS)) if (s.g.visible) s.update(t, c);
  for (const p of ALL) if (p.visible) p.userData.apply(t);
  const off = OFF[cur.set], sh = 0.012 + (c.shake || 0) * 0.05;
  camera.position.set(cm.pos.x + off + noise1(t * 0.9 * (1 + (c.shake || 0) * 6)) * sh, cm.pos.y + noise1(t * 1.1 * (1 + (c.shake || 0) * 6) + 3) * sh, cm.pos.z + noise1(t * 0.7 * (1 + (c.shake || 0) * 6) + 7) * sh);
  camera.fov = cm.fov; camera.updateProjectionMatrix(); camera.lookAt(cm.look.x + off, cm.look.y, cm.look.z);
  post.time = t; post.vig = 0.38; post.grain = 0.035; post.bloom = 0.55; post.sat = 1.05; post.freeze = 0; post.glitch = 0;
  post.red = Math.max(c.flashRed || 0, c.red && cur.set === 'STORE' && c.lights !== 'off' ? 0.08 + 0.08 * Math.sin(t * 7) : 0);
  post.flash = c.flashW || 0;
  post.tint.set(cur.set === 'BACK' ? 0xfff2e4 : c.tod === 'night' ? 0xdfe6ff : c.tod === 'dusk' ? 0xfff0e4 : 0xffffff);
  post.fade = Math.max(idx > 0 && lt < 0.08 ? (1 - lt / 0.08) * 0.5 : 0, v < -PRE + 0.4 ? 1 - (v + PRE) / 0.4 : 0, v > DUR - PRE - 0.8 ? clamp((v - (DUR - PRE - 0.8)) / 0.8) : 0);
  renderComposite(scene, camera);
  drawOverlay(c, v, lt);
  return ov.toDataURL('image/jpeg', 0.92);
};
window.TL = TL; window.DUR = DUR; window.PRE = PRE;
window.ready = true;
