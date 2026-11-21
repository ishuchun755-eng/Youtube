import { THREE, renderer, renderComposite, post, clamp, ss, eout, back, lerp, noise1, blinkAt, FONT } from './engine.js';
import { setEnv, scene, SETS, showSet, place, FOREST, CAR, HILL, CAST, WOLVES, SLEDS, roadX, CRASH, snowfall, aimMoon } from './sets.js';

const TL = await (await fetch('timeline.json')).json();
const SENT = TL.S;
export const PRE = 4.0;
const VEND = SENT[SENT.length - 1].end;
export const DUR = +(PRE + VEND + 6.0).toFixed(2);
const S = i => SENT[i].start, E = i => SENT[i].end;
const V3 = (x, y, z) => new THREE.Vector3(x, y, z);
const OFF = { FOREST: 0, CAR: 300, HILL: 600 };
const C = CAST; const ALL = Object.values(CAST);
const k01 = (v, a, b) => clamp((v - a) / (b - a));

// ---------------------------------------------------------------- helpers
function reset(p, set, x, z, yaw = 0, opt = {}, y = 0) {
  place(p, set, x, y, z, yaw); p.scale.setScalar(opt.scale ?? 0.75); const st = p.userData.state; const o = { ...opt }; delete o.scale;
  Object.assign(st, { sit: 0, walk: 0, walkAmt: 0, armUp: [0, 0], armOut: [0.08, 0.08], headYaw: 0, headPitch: 0, talk: 0, blink: blinkAt(x * 3 + z, x), brow: 0, eyeS: 1, look: [0, 0], lean: 0, frozen: false }, o);
  st.yaw = yaw; return st;
}
const talk = (t, on = true, a = 0.45) => on ? Math.max(0, Math.sin(t * 21) * 0.5 + Math.sin(t * 13.7) * 0.4) * a / 0.45 : 0;
function cam(lt, d, p0, p1, l0, l1, f0 = 38, f1 = f0, e = ss) { const k = e(clamp(lt / d)); return { pos: p0.clone().lerp(p1, k), look: l0.clone().lerp(l1 || l0, k), fov: lerp(f0, f1, k) }; }
function carOnRoad(z) { const car = FOREST.car; car.position.set(roadX(z), 0, z); const dx = roadX(z - 0.5) - roadX(z + 0.5); car.rotation.set(0, Math.PI - Math.atan2(dx, 1), 0); return car; }
const CX = () => FOREST.crashX, CZ = CRASH.z, CYAW = Math.PI - 0.9;
function carCrashed() { const car = FOREST.car; car.position.set(CX(), 0, CZ); car.rotation.set(0, CYAW, 0); return car; }
const Wl = (x, y, z) => { const c = Math.cos(CYAW), s = Math.sin(CYAW); return V3(CX() + x * c + z * s, y, CZ - x * s + z * c); };
// seats in CAR interior
const SEAT = { sardor: [-0.45, 0.28], bekzod: [0.45, 0.28], otabek: [0.0, -1.08] };
function seatAll(t, o = {}, who = ['sardor', 'bekzod', 'otabek']) {
  for (const n of who) { const [x, z] = SEAT[n];
    const st = reset(C[n], CAR, x, z, 0, { sit: 1, armUp: [0.25, 0.25], armOut: [0.14, 0.14], scale: 0.56, ...(o[n] || {}) }, -0.02);
    if (!(o[n] && 'blink' in o[n])) st.blink = blinkAt(t, x * 5 + z); }
}
const HEAD = { sardor: V3(-0.45, 1.2, 0.33), bekzod: V3(0.45, 1.2, 0.33), otabek: V3(0, 1.2, -1.03) };
const IC = { // interior cameras
  wide: [V3(0.3, 1.3, 1.25), V3(0.2, 1.28, 1.2), V3(-0.1, 0.95, -0.6), 64, 60],
  wideL: [V3(-0.3, 1.3, 1.25), V3(-0.2, 1.28, 1.2), V3(0.1, 0.95, -0.6), 64, 60],
  sardor: [V3(0.1, 1.24, 0.98), V3(0.06, 1.23, 0.92), HEAD.sardor, 40, 36],
  bekzod: [V3(-0.12, 1.24, 0.98), V3(-0.08, 1.23, 0.92), HEAD.bekzod, 40, 36],
  otabek: [V3(0.18, 1.27, -0.05), V3(0.15, 1.26, -0.12), HEAD.otabek, 44, 40],
  dash: [V3(-0.28, 1.12, 0.72), V3(-0.3, 1.1, 0.78), V3(-0.45, 0.93, 1.21), 30, 26],
  mount: [V3(-0.05, 1.15, 0.55), V3(0.0, 1.12, 0.7), V3(0.15, 0.98, 1.3), 34, 28],
  wheel: [V3(-0.15, 1.18, 0.55), V3(-0.18, 1.15, 0.62), V3(-0.45, 0.95, 1.05), 38, 34],
  roof: [V3(0.05, 0.95, 0.7), V3(0.05, 0.95, 0.6), V3(0, 1.45, -0.6), 62, 58],
  back: [V3(0.0, 1.32, -0.12), V3(0.0, 1.3, -0.18), V3(0, 0.55, -1.0), 50, 46],
  bekPhone: [V3(0.0, 1.32, 0.42), V3(0.02, 1.3, 0.45), V3(0.38, 1.0, 0.65), 30, 26],
};
const ic = (lt, d, k) => { const a = IC[k]; return cam(lt, d, a[0], a[1], a[2], null, a[3], a[4]); };
// per-day state
const DAYS = [[7, '1-KUN'], [44, '2-KUN'], [58, '3-KUN'], [81, '4-KUN'], [110, '5-KUN'], [135, '6-KUN'], [154, '7-KUN']];
function fuelAt(v) { if (v < S(44)) return 0.5; if (v < S(58)) return 0.42; if (v < S(81)) return 0.31; if (v < S(110)) return 0.2; if (v < S(111) + 1) return 0.03; return 0; }
function battAt(v) { if (v < S(44)) return 0.5; if (v < S(58)) return 0.31; if (v < S(81)) return 0.2; if (v < S(110)) return 0.12; if (v < S(135)) return 0.06; if (v < S(151)) return 0.03; return 0; }
function buryAt(v) { if (v < S(22)) return 0; if (v < S(44)) return 0.25; if (v < S(58)) return 0.4; if (v < S(81)) return 0.5; if (v < S(110)) return 0.62; return 0.72; }
function base(c, v) {
  c.fuel = fuelAt(v); c.bury = buryAt(v); c.carSnow = clamp(c.bury * 1.3); c.temp = v < S(110) ? -27 : -31;
  c.carPitch = v > S(22) ? 0.1 : 0; c.frost = v < S(22) ? 0 : clamp(0.2 + (v - S(22)) / 600);
}
const night = (c, v) => { c.tod = 'night'; };
// hill surface
const hillY = (x, z) => Math.max(0, -18 + 22 * Math.sqrt(Math.max(0, 1 - (x * x + (z + 6) * (z + 6)) / 676)));

// ---------------------------------------------------------------- shots
const SH = []; const shot = (t0, set, fn) => SH.push({ t0, set, fn });
const at = (i, set, fn, o = -0.12) => shot(S(i) + o, set, fn);

// TITLE (PRE): aerial over dusk forest, car tiny
shot(-PRE, 'FOREST', (c, lt, d, v, t) => {
  c.tod = 'dusk'; c.engineOn = true; c.snow = 0.4; c.overlay = 'title'; const z = 40 - (v + PRE) * 5; carOnRoad(z);
  return cam(lt, d, V3(roadX(z) + 30, 30, z + 40), V3(roadX(z) + 16, 18, z + 24), V3(roadX(z), 0, z - 10), V3(roadX(z), 0.5, z - 6), 46, 42);
});
// 0 friends to the wedding
at(0, 'CAR', (c, lt, d, v, t) => { c.tod = 'dusk'; c.engineOn = true; c.mountPhone = ['nav', 0.4]; c.passing = 1;
  seatAll(t, { sardor: { armUp: [1.1, 1.1], armOut: [0.05, 0.05] }, bekzod: { headYaw: -0.3, talk: talk(t, Math.sin(t) > 0, 0.3) }, otabek: { headYaw: 0.25 } });
  return ic(lt, d, 'wide'); }, 0);
at(1, 'CAR', (c, lt, d, v, t) => { c.tod = 'dusk'; c.engineOn = true; c.mountPhone = ['nav', 0.4]; seatAll(t, { sardor: { armUp: [1.1, 1.1] } }); return ic(lt, d, 'mount'); });
at(2, 'CAR', (c, lt, d, v, t) => { c.tod = 'dusk'; c.engineOn = true; c.mountPhone = ['nav', 0.4]; seatAll(t, { sardor: { armUp: [1.1, 1.1] }, bekzod: { headYaw: -0.5, talk: talk(t, v < E(2) - 1), armUp: [1.3, 0.25], armOut: [-0.3, 0.14] } }); return ic(lt, d, 'bekzod'); });
at(3, 'CAR', (c, lt, d, v, t) => { c.tod = 'dusk'; c.engineOn = true; seatAll(t, { sardor: { armUp: [1.1, 1.1], headPitch: 0.15 * Math.sin(lt * 6) * (lt < 1 ? 1 : 0), headYaw: 0.3 } }); return ic(lt, d, 'sardor'); });
at(4, 'FOREST', (c, lt, d, v, t) => { c.tod = 'dusk'; c.engineOn = true; c.snow = 0.6; const z = 30 - lt * 6; carOnRoad(z);
  return { pos: V3(roadX(z + 7) - 1.2, 2.0, z + 7.5), look: V3(roadX(z - 4), 0.9, z - 4), fov: 42 }; });
at(5, 'FOREST', (c, lt, d, v, t) => { c.tod = 'dusk'; c.engineOn = true; c.snow = 0.5; const z = 10 - lt * 6; carOnRoad(z);
  return cam(lt, d, V3(roadX(z) + 6, 6, z + 10), V3(roadX(z) + 12, 40, z + 30), V3(roadX(z), 0.5, z), V3(roadX(z), 0, z - 30), 40, 50); });
at(6, 'FOREST', (c, lt, d, v, t) => { c.tod = 'night'; c.engineOn = true; c.snow = 1; c.wind = 2; const z = -20 - lt * 5; carOnRoad(z); c.overlay = 'temp30';
  return cam(lt, d, V3(roadX(z) + 7, 1.5, z - 6), V3(roadX(z) + 6, 1.6, z - 8), V3(roadX(z), 0.8, z), null, 44, 40); });
// DAY 1
at(7, 'FOREST', (c, lt, d, v, t) => { c.tod = 'dusk'; c.engineOn = true; c.snow = 0.8; const z = -30 - lt * 6; carOnRoad(z);
  return cam(lt, d, V3(roadX(z - 14), 1.2, z - 14), V3(roadX(z - 12), 1.3, z - 12), V3(roadX(z), 0.8, z), null, 40, 40); });
at(8, 'CAR', (c, lt, d, v, t) => { c.tod = 'dusk'; c.engineOn = true; c.mountPhone = ['nav', 0.25]; seatAll(t, { sardor: { armUp: [1.1, 1.1], headYaw: 0.05 } }); return ic(lt, d, 'sardor'); });
at(9, 'CAR', (c, lt, d, v, t) => { c.tod = 'dusk'; c.engineOn = true; c.mountPhone = ['nav', 0.22]; seatAll(t, { sardor: { armUp: [1.1, 1.1] }, bekzod: { headYaw: -0.2 }, otabek: { headYaw: Math.sin(t * 0.7) * 0.4 } }); return ic(lt, d, 'wideL'); });
at(10, 'FOREST', (c, lt, d, v, t) => { c.tod = 'dusk'; c.engineOn = true; c.snow = 0.9; const z = -45 - lt * 5; carOnRoad(z);
  return cam(lt, d, V3(roadX(z - 9) + 0.8, 1.0, z - 9), V3(roadX(z - 8) + 0.6, 1.0, z - 8), V3(roadX(z), 0.8, z), null, 46, 42); });
at(11, 'FOREST', (c, lt, d, v, t) => { c.tod = 'night'; c.engineOn = true; c.snow = 1; c.wind = 2.4; const z = -55 - lt * 5; carOnRoad(z);
  return cam(lt, d, V3(roadX(z) - 6, 2.2, z + 2), V3(roadX(z) - 6, 2.2, z - 2), V3(roadX(z), 0.8, z), V3(roadX(z - 3), 0.8, z - 3), 40, 40); });
at(12, 'FOREST', (c, lt, d, v, t) => { c.tod = 'night'; c.engineOn = true; c.snow = 0.8; const z = -62 - lt * 5; carOnRoad(z);
  return cam(lt, d, V3(roadX(z - 20), 6, z - 24), V3(roadX(z - 20), 5, z - 22), V3(roadX(z), 0.5, z), null, 42, 40); });
at(13, 'CAR', (c, lt, d, v, t) => { c.tod = 'night'; c.engineOn = true; c.mountPhone = ['nav', lerp(0.12, 0.02, k01(v, S(13), E(13)))]; seatAll(t, { sardor: { armUp: [1.1, 1.1] } }); return ic(lt, d, 'mount'); });
at(14, 'CAR', (c, lt, d, v, t) => { c.tod = 'night'; c.engineOn = true; c.mountPhone = ['low', 0]; seatAll(t); return cam(lt, d, IC.mount[0], IC.mount[1].clone().add(V3(0, 0, 0.12)), IC.mount[2], null, 30, 22); });
at(15, 'CAR', (c, lt, d, v, t) => { c.tod = 'night'; c.engineOn = true; c.mountPhone = [lt < 0.5 ? 'low' : 'off', 0]; seatAll(t, { sardor: { armUp: [1.1, 1.1], eyeS: lt > 0.5 ? 1.3 : 1, brow: lt > 0.5 ? 0.8 : 0, headYaw: 0.4 } }); return lt < 0.6 ? ic(lt, 0.6, 'mount') : ic(lt - 0.6, d, 'sardor'); });
at(16, 'CAR', (c, lt, d, v, t) => { c.tod = 'night'; c.engineOn = true; c.mountPhone = ['off', 0]; seatAll(t, { sardor: { armUp: [1.1, 1.1], headYaw: 0.5, talk: talk(t, v < E(16)), brow: 0.6 }, bekzod: { headYaw: -0.4 } }); return ic(lt, d, 'wide'); });
at(17, 'CAR', (c, lt, d, v, t) => { c.tod = 'night'; c.engineOn = true; c.handPhone = [V3(0.38, 1.0, 0.65), Math.PI, ['nosig', 0.5]];
  seatAll(t, { sardor: { armUp: [1.1, 1.1] }, bekzod: { armUp: [1.25, 1.25], armOut: [-0.25, 0.25], headPitch: 0.35 } }); return ic(lt, d, 'bekPhone'); });
at(18, 'CAR', (c, lt, d, v, t) => { c.tod = 'night'; c.engineOn = true; const sh = lt < 2.2; seatAll(t, { otabek: { armUp: sh ? [0.3 + Math.sin(t * 9) * 0.25, 0.3 - Math.sin(t * 9) * 0.25] : [0.2, 0.2], armOut: [0.45, 0.45], headPitch: sh ? 0.4 : 0, eyeS: sh ? 1 : 1.4, brow: sh ? 0 : 0.9 } }); return ic(lt, d, 'otabek'); });
at(19, 'FOREST', (c, lt, d, v, t) => { c.tod = 'night'; c.engineOn = true; c.snow = 0.9; const z = -95 - lt * 4; carOnRoad(z);
  return cam(lt, d, V3(roadX(z) + 10, 22, z + 14), V3(roadX(z) + 14, 34, z + 20), V3(roadX(z), 0, z - 3), null, 40, 46); });
at(20, 'FOREST', (c, lt, d, v, t) => { c.tod = 'night'; c.engineOn = true; c.snow = 1; const k = clamp(lt / (S(22) - S(20)));
  const car = FOREST.car; const z0 = CZ + 14; const z = z0 - k * 6; car.position.set(roadX(z) + k * 1.5, 0, z); car.rotation.set(0, Math.PI - k * 0.6 + Math.sin(t * 6) * 0.1 * k, 0); c.shake = 0.3;
  return { pos: V3(roadX(z + 9) - 2, 2.4, z + 9), look: car.position.clone().add(V3(0, 0.6, 0)), fov: 42 }; });
at(21, 'CAR', (c, lt, d, v, t) => { c.tod = 'night'; c.engineOn = true; c.steer = Math.sin(t * 9) * 1.2; c.shake = 0.8; seatAll(t, { sardor: { armUp: [1.1 + Math.sin(t * 9) * 0.2, 1.1 - Math.sin(t * 9) * 0.2], eyeS: 1.4, brow: 0.8, talk: 0.6 }, bekzod: { eyeS: 1.4, armUp: [0.9, 0.9], armOut: [0.6, 0.6] } }); return ic(lt, d, 'wide'); });
at(22, 'FOREST', (c, lt, d, v, t) => { c.tod = 'night'; c.engineOn = true; c.snow = 1; const k = ss(clamp(lt / 1.6));
  const car = FOREST.car; const x0 = roadX(CZ + 8) + 1.5, z0 = CZ + 8;
  car.position.set(lerp(x0, CX(), k), -0.25 * k, lerp(z0, CZ, k)); car.rotation.set(0.12 * k, lerp(Math.PI - 0.6, CYAW, k) - Math.sin(k * 3) * 0.2, -0.08 * k * (1 - k)); c.bury = 0.25 * k; c.carPitch = 0.1 * k; c.shake = lt > 1.4 && lt < 1.9 ? 1 : 0;
  return { pos: V3(CX() - 9, 2.5, CZ - 6), look: car.position.clone().add(V3(0, 0.6, 0)), fov: 40 }; });
at(23, 'FOREST', (c, lt, d, v, t) => { c.tod = 'night'; base(c, v); c.engineOn = true; c.snow = 1; c.doorOpen = ss(lt / 0.8); carCrashed();
  return cam(lt, d, Wl(-5, 1.7, 2.5), Wl(-4.5, 1.65, 2.2), Wl(-0.8, 0.9, 0.4), null, 40, 38); });
at(24, 'CAR', (c, lt, d, v, t) => { c.tod = 'night'; base(c, v); c.engineOn = true; c.cold = true; c.frost = 0.5 + lt * 0.1; c.shake = 0.2;
  seatAll(t, { sardor: { eyeS: 0.6, brow: -0.5, armUp: [0.6, 0.6], armOut: [0.5, 0.5] }, bekzod: { eyeS: 0.6, brow: -0.5, headYaw: 0.4 }, otabek: { eyeS: 0.5, brow: -0.6, armUp: [1.6, 1.6], armOut: [0.2, 0.2] } }); c.breath = [HEAD.sardor, HEAD.bekzod, HEAD.otabek]; return ic(lt, d, 'wide'); });
at(25, 'FOREST', (c, lt, d, v, t) => { c.tod = 'night'; base(c, v); c.engineOn = true; c.snow = 1; c.doorOpen = 1 - ss((lt - 0.3) / 0.25); c.shake = lt > 0.5 && lt < 0.8 ? 0.8 : 0; carCrashed();
  return cam(lt, d, Wl(-4.5, 1.65, 2.2), Wl(-4.2, 1.6, 2.0), Wl(-0.8, 0.9, 0.4), null, 38, 36); });
at(26, 'CAR', (c, lt, d, v, t) => { c.tod = 'night'; base(c, v); c.engineOn = true; seatAll(t); return ic(lt, d, 'dash'); });
at(27, 'CAR', (c, lt, d, v, t) => { c.tod = 'night'; base(c, v); c.engineOn = true; c.cold = true; c.breath = [HEAD.sardor]; seatAll(t, { sardor: { headPitch: 0.2, look: [0.5, -0.3], brow: 0.4 } }); return ic(lt, d, 'sardor'); });
at(28, 'CAR', (c, lt, d, v, t) => { c.tod = 'night'; base(c, v); c.engineOn = true; seatAll(t); return cam(lt, d, IC.dash[0], IC.dash[1], V3(-0.62, 0.95, 1.21), null, 22, 18); });
at(29, 'CAR', (c, lt, d, v, t) => { c.tod = 'night'; base(c, v); c.engineOn = false; c.cold = true; c.frost = 0.3 + k01(v, S(29), E(29)) * 0.6; c.breath = [HEAD.sardor, HEAD.bekzod, HEAD.otabek]; seatAll(t, { sardor: { armUp: [0.7, 0.7], armOut: [0.6, 0.6] }, bekzod: { armUp: [0.7, 0.7], armOut: [0.6, 0.6] } }); return ic(lt, d, 'wideL'); });
at(30, 'CAR', (c, lt, d, v, t) => { c.tod = 'night'; base(c, v); c.engineOn = true; c.fuel = lerp(0.5, 0.0, k01(v, S(30), E(30))); seatAll(t); return cam(lt, d, IC.dash[0], IC.dash[1], V3(-0.62, 0.95, 1.21), null, 22, 18); });
at(31, 'FOREST', (c, lt, d, v, t) => { c.tod = 'night'; base(c, v); c.engineOn = true; c.snow = 0.8; carCrashed(); c.overlay = 'clock15';
  return cam(lt, d, Wl(-3.5, 1.4, -6), Wl(-3, 1.5, -5.5), Wl(-0.4, 0.6, -2.2), null, 40, 36); });
at(32, 'CAR', (c, lt, d, v, t) => { c.tod = 'night'; base(c, v); c.engineOn = true; c.dome = true; seatAll(t, {}, ['sardor', 'bekzod']); c.overlay = 'food'; return ic(lt, d, 'wideL'); });
at(33, 'CAR', (c, lt, d, v, t) => { c.tod = 'night'; base(c, v); c.engineOn = true; c.dome = true; seatAll(t, { sardor: { headYaw: 0.8, headPitch: 0.1 }, bekzod: { headYaw: -0.8 } }); return ic(lt, d, 'wide'); });
at(34, 'FOREST', (c, lt, d, v, t) => { c.tod = 'night'; base(c, v); c.engineOn = false; c.lightsOn = false; c.snow = 0.4; carCrashed();
  return cam(lt, d, Wl(14, 3, 14), Wl(18, 4, 18), Wl(0, 1, 0), Wl(-10, 8, -20), 40, 44); });
// INSERT A — first night, roof
at(35, 'FOREST', (c, lt, d, v, t) => { night(c); base(c, v); c.carSnow = 0.6 + lt * 0.05; c.engineOn = false; c.lightsOn = false; c.cabLight = true; c.snow = 1; carCrashed();
  return cam(lt, d, Wl(7, 2.5, 6), Wl(6, 2.2, 5), Wl(0, 0.9, 0), null, 38, 36); });
at(36, 'CAR', (c, lt, d, v, t) => { night(c); base(c, v); c.dome = true; c.roofSag = k01(v, S(36) + 0.6, E(37)); c.shake = 0.15; seatAll(t, { sardor: { headPitch: -0.5, eyeS: 1.3 }, bekzod: { headPitch: -0.5, eyeS: 1.3 }, otabek: { headPitch: -0.5 } }); return ic(lt, d, 'roof'); });
at(37, 'CAR', (c, lt, d, v, t) => { night(c); base(c, v); c.dome = true; c.roofSag = 0.4 + k01(v, S(37), E(37)) * 0.6; seatAll(t, { sardor: { headPitch: -0.5, eyeS: 1.3 }, bekzod: { headPitch: -0.5, eyeS: 1.3 }, otabek: { headPitch: -0.5, eyeS: 1.3 } }); return ic(lt, d, 'wide'); });
at(38, 'CAR', (c, lt, d, v, t) => { night(c); base(c, v); c.dome = true; c.roofSag = 1; seatAll(t, { bekzod: { headPitch: -0.3, eyeS: 1.4, brow: 0.9, talk: talk(t, v > S(38) + 1.2), armUp: [0.9, 0.9], armOut: [0.5, 0.5] } }); return ic(lt, d, 'bekzod'); });
at(39, 'FOREST', (c, lt, d, v, t) => { night(c); base(c, v); c.engineOn = false; c.lightsOn = false; c.cabLight = true; c.snow = 0.8; c.doorOpen = 0.6; c.carSnow = 0.8; carCrashed();
  const p = Wl(-1.5, 0, 0.6); reset(C.sardor, FOREST, p.x, p.z, CYAW - Math.PI / 2 - 0.4, { armUp: [2.6 + Math.sin(t * 6) * 0.3, 2.4], armOut: [-0.2, 0.3], lean: -0.15 });
  return cam(lt, d, Wl(-5.5, 2.2, 3), Wl(-5, 2.1, 2.6), Wl(-0.6, 1.4, 0.3), null, 40, 38); });
at(40, 'FOREST', (c, lt, d, v, t) => { night(c); base(c, v); c.engineOn = false; c.lightsOn = false; c.cabLight = true; c.snow = 0.8; c.doorOpen = 0.6; c.carSnow = 0.8 * (1 - ss(lt / 0.5)); c.shake = lt < 0.6 ? 0.4 : 0; carCrashed();
  const p = Wl(-1.5, 0, 0.6); reset(C.sardor, FOREST, p.x, p.z, CYAW - Math.PI / 2 - 0.4, { armUp: [2.0, 2.0], armOut: [0.2, 0.3] });
  return cam(lt, d, Wl(-5, 2.1, 2.6), Wl(-4.8, 2.0, 2.4), Wl(-0.6, 1.2, 0.3), null, 38, 36); });
at(41, 'CAR', (c, lt, d, v, t) => { night(c); base(c, v); c.dome = true; c.cold = true; c.breath = [HEAD.sardor]; seatAll(t, { sardor: { armUp: [1.2 + Math.sin(t * 12) * 0.1, 1.2 - Math.sin(t * 12) * 0.1], armOut: [-0.35, -0.35], headPitch: 0.4, brow: 0.7, eyeS: 0.8 } }); return ic(lt, d, 'sardor'); });
at(42, 'CAR', (c, lt, d, v, t) => { night(c); base(c, v); c.cold = true; c.breath = [HEAD.sardor, HEAD.bekzod, HEAD.otabek]; seatAll(t, { sardor: { armUp: [0.7, 0.7], armOut: [0.6, 0.6], blink: 0 }, bekzod: { armUp: [0.7, 0.7], armOut: [0.6, 0.6], headYaw: -0.3 }, otabek: { headYaw: 0.3 } }); return ic(lt, d, 'wide'); });
at(43, 'FOREST', (c, lt, d, v, t) => { night(c); base(c, v); c.engineOn = false; c.lightsOn = false; c.cabLight = true; c.snow = 0.6; carCrashed();
  return cam(lt, d, Wl(4, 6, 8), Wl(10, 18, 20), Wl(0, 0.5, 0), null, 40, 46); });
// DAY 2
at(44, 'FOREST', (c, lt, d, v, t) => { c.tod = 'day'; base(c, v); c.engineOn = true; c.lightsOn = false; c.snow = 0.4; c.pipeSnow = 1; carCrashed();
  return cam(lt, d, Wl(-8, 3, 6), Wl(-7, 2.6, 5), Wl(0, 0.8, 0), null, 40, 38); });
at(45, 'CAR', (c, lt, d, v, t) => { c.tod = 'day'; base(c, v); c.engineOn = true; seatAll(t, { otabek: { armUp: [2.4, 2.4], armOut: [0.1, 0.1], brow: 0.8, eyeS: 0.7, headPitch: 0.2 } }); return ic(lt, d, 'otabek'); });
at(46, 'CAR', (c, lt, d, v, t) => { c.tod = 'day'; base(c, v); c.engineOn = true; seatAll(t, { otabek: { blink: 0.55 + 0.3 * Math.sin(t * 2), headPitch: 0.35 + Math.sin(t * 1.5) * 0.1, headYaw: Math.sin(t) * 0.2 } }); return cam(lt, d, IC.otabek[0], IC.otabek[1], HEAD.otabek, null, 34, 30); });
at(47, 'CAR', (c, lt, d, v, t) => { c.tod = 'day'; base(c, v); c.engineOn = true; seatAll(t, { bekzod: { talk: lt > 0.2 && lt < 1.2 ? 1 : 0, blink: lt > 0.2 && lt < 1.2 ? 0.8 : 0.4, armUp: [lt < 1.2 ? 2 : 0.3, 0.25] } }); return ic(lt, d, 'bekzod'); });
at(48, 'CAR', (c, lt, d, v, t) => { c.tod = 'day'; base(c, v); c.engineOn = true; seatAll(t, { sardor: { eyeS: 1 + 0.4 * ss(lt / 0.6), brow: 0.9 * ss(lt / 0.6), headYaw: lerp(0.3, -0.4, ss(lt / 1.5)) } }); return cam(lt, d, IC.sardor[0], IC.sardor[1].clone().add(V3(-0.05, 0, -0.06)), HEAD.sardor, null, 38, 30); });
at(49, 'FOREST', (c, lt, d, v, t) => { c.tod = 'day'; base(c, v); c.engineOn = true; c.lightsOn = false; c.snow = 0.3; c.pipeSnow = 1; carCrashed();
  return cam(lt, d, Wl(-2.2, 3.6, -6.8), Wl(-1.9, 3.3, -6.2), Wl(-0.55, 0.3, -2.6), null, 34, 30); });
at(50, 'CAR', (c, lt, d, v, t) => { c.tod = 'day'; base(c, v); c.engineOn = true; c.haze = 0.3 + lt * 0.1; seatAll(t, { otabek: { blink: 0.7, headPitch: 0.4 }, bekzod: { blink: 0.6, headPitch: 0.3 } }); return ic(lt, d, 'wideL'); });
at(51, 'CAR', (c, lt, d, v, t) => { c.tod = 'day'; base(c, v); c.engineOn = true; c.haze = 0.5; seatAll(t, { otabek: { blink: 0.8, headPitch: 0.5 }, bekzod: { blink: 0.7, headPitch: 0.4 } }); return ic(lt, d, 'roof'); });
at(52, 'CAR', (c, lt, d, v, t) => { c.tod = 'day'; base(c, v); c.engineOn = true; c.haze = 0.6; seatAll(t, { bekzod: { blink: lerp(0.4, 1, ss(lt / 1.2)), headPitch: lerp(0.1, 0.7, ss(lt / 1.2)), headYaw: 0.3 * ss(lt / 1.2) } }); return ic(lt, d, 'bekzod'); });
at(53, 'CAR', (c, lt, d, v, t) => { c.tod = 'day'; base(c, v); c.engineOn = true; c.haze = 0.7; c.dark = 0.5; seatAll(t, { sardor: { blink: 0.6, headPitch: 0.3 }, bekzod: { blink: 1, headPitch: 0.7 }, otabek: { blink: 1, headPitch: 0.7 } }); return cam(lt, d, IC.wide[0], IC.wide[1], IC.wide[2], null, 64, 50); });
at(54, 'FOREST', (c, lt, d, v, t) => { c.tod = 'day'; base(c, v); c.engineOn = true; c.lightsOn = false; c.snow = 0.4; c.pipeSnow = 1 - k01(v, S(54), S(56) + 0.5) * 0.99; carCrashed();
  const p = Wl(-0.55, 0, -3.3); reset(C.sardor, FOREST, p.x, p.z, CYAW + 0.2, { lean: 0.8, armUp: [1.3 + Math.sin(t * 10) * 0.4, 1.3 - Math.sin(t * 10) * 0.4], armOut: [0.25, 0.25], eyeS: 1.2, brow: 0.7 });
  return cam(lt, d, Wl(-3.2, 1.8, -6.5), Wl(-2.8, 1.6, -6), Wl(-0.55, 0.5, -3), null, 40, 38); });
at(55, 'FOREST', (c, lt, d, v, t) => { c.tod = 'day'; base(c, v); c.engineOn = true; c.lightsOn = false; c.snow = 0.4; c.pipeSnow = 1 - k01(v, S(54), S(56) + 0.5) * 0.99; carCrashed();
  const p = Wl(-0.55, 0, -3.3); reset(C.sardor, FOREST, p.x, p.z, CYAW + 0.2, { lean: 0.8, armUp: [1.3 + Math.sin(t * 10) * 0.4, 1.3 - Math.sin(t * 10) * 0.4], armOut: [0.25, 0.25], eyeS: 0.8, brow: 0.9 });
  return cam(lt, d, Wl(-2.4, 1.9, -5.8), Wl(-2.2, 1.8, -5.5), Wl(-0.55, 0.45, -3.0), null, 36, 32); });
at(56, 'FOREST', (c, lt, d, v, t) => { c.tod = 'day'; base(c, v); c.engineOn = true; c.lightsOn = false; c.snow = 0.4; c.pipeSnow = 0; carCrashed();
  const p = Wl(-0.9, 0, -3.6); reset(C.sardor, FOREST, p.x, p.z, CYAW + Math.PI, { armUp: [0.4, 0.4], armOut: [0.3, 0.3], talk: 0.2 });
  return cam(lt, d, Wl(-3.5, 1.6, -7), Wl(-3, 1.5, -6.6), Wl(-0.5, 0.8, -2.8), null, 40, 38); });
at(57, 'FOREST', (c, lt, d, v, t) => { c.tod = 'day'; base(c, v); c.engineOn = true; c.lightsOn = false; c.snow = 0.3; c.pipeSnow = 0; carCrashed(); c.overlay = 'rule2';
  return cam(lt, d, Wl(-6, 2.5, -4), Wl(-6.5, 3, -2), Wl(0, 0.8, -0.5), null, 40, 40); });
// DAY 3
at(58, 'FOREST', (c, lt, d, v, t) => { c.tod = 'day'; base(c, v); c.engineOn = false; c.lightsOn = false; c.snow = 0.5; carCrashed();
  return cam(lt, d, Wl(9, 4, -6), Wl(8, 3.5, -5), Wl(0, 0.8, 0), null, 40, 38); });
at(59, 'CAR', (c, lt, d, v, t) => { c.tod = 'day'; base(c, v); seatAll(t, { sardor: { headPitch: 0.3, look: [0.4, -0.4] } }); return cam(lt, d, V3(-0.1, 1.05, 0.95), V3(-0.08, 1.02, 0.9), V3(0.05, 0.75, 0.6), null, 30, 26); });
at(60, 'CAR', (c, lt, d, v, t) => { c.tod = 'day'; base(c, v); c.cold = true; c.breath = [HEAD.sardor]; seatAll(t, { sardor: { brow: 0.5, headYaw: 0.2 } }); return ic(lt, d, 'sardor'); });
at(61, 'FOREST', (c, lt, d, v, t) => { c.tod = 'day'; base(c, v); c.engineOn = false; c.lightsOn = false; c.snow = 0.5; c.overlay = 'tip_snow'; carCrashed();
  return cam(lt, d, Wl(-2, 1.2, 4), Wl(-2.2, 0.9, 4.4), Wl(-3, 0.2, 6), null, 40, 36); });
at(62, 'CAR', (c, lt, d, v, t) => { c.tod = 'day'; base(c, v); c.engineOn = true; seatAll(t, { sardor: { armUp: [1.3, 0.3], armOut: [-0.35, 0.14], headYaw: 0.4, headPitch: 0.3 } }); return ic(lt, d, 'wide'); });
at(63, 'CAR', (c, lt, d, v, t) => { c.tod = 'day'; base(c, v); c.engineOn = true; seatAll(t); return cam(lt, d, V3(-0.15, 1.05, 0.95), V3(-0.1, 1.02, 0.9), V3(0.05, 0.78, 0.62), null, 28, 24); });
at(64, 'CAR', (c, lt, d, v, t) => { c.tod = 'day'; base(c, v); c.thermos = false; const who = Math.floor(lt / 1.0) % 3;
  seatAll(t, { sardor: { armUp: who === 0 ? [1.6, 0.25] : [0.25, 0.25], armOut: [-0.3, 0.14], headPitch: who === 0 ? -0.3 : 0 }, bekzod: { armUp: who === 1 ? [1.6, 0.25] : [0.25, 0.25], armOut: [-0.3, 0.14], headPitch: who === 1 ? -0.3 : 0 }, otabek: { armUp: who === 2 ? [1.6, 0.25] : [0.25, 0.25], headPitch: who === 2 ? -0.3 : 0 } }); return ic(lt, d, 'wideL'); });
at(65, 'FOREST', (c, lt, d, v, t) => { night(c); base(c, v); c.engineOn = false; c.lightsOn = lt > 1.0 && lt < 2.2; c.snow = 0.3; carCrashed();
  const fwd = Wl(0, 0, 10);
  WOLVES.forEach((w, i) => { w.visible = c.lightsOn; const p = Wl((i - 1) * 2.2, 0, 10 + (i % 2) * 1.5); w.position.copy(p); w.rotation.y = CYAW + Math.PI + (i - 1) * 0.2; w.userData.set(t, 0); });
  return cam(lt, d, Wl(0.8, 2.6, -6), Wl(0.7, 2.5, -5.6), Wl(0, 0.9, 10), null, 40, 38); });
at(66, 'FOREST', (c, lt, d, v, t) => { night(c); base(c, v); c.engineOn = false; c.lightsOn = false; c.snow = 0.3; carCrashed();
  WOLVES.forEach((w, i) => { w.visible = true; w.position.copy(Wl((i - 1) * 2.2, 0, 10 + (i % 2) * 1.5)); w.rotation.y = CYAW + Math.PI + (i - 1) * 0.2; w.userData.set(t, 0); });
  c.wolfEyesOnly = true;
  return cam(lt, d, Wl(0.3, 1.3, 2.5), Wl(0.3, 1.3, 3.5), Wl(0, 1.0, 10), null, 36, 28); });
at(67, 'FOREST', (c, lt, d, v, t) => { night(c); base(c, v); c.engineOn = false; c.lightsOn = true; c.snow = 0.3; carCrashed();
  const w = WOLVES[1]; w.visible = true; w.position.copy(Wl(0, 0, 9)); w.rotation.y = CYAW + Math.PI; w.userData.set(t, 0);
  return cam(lt, d, Wl(0.5, 1.2, 6.2), Wl(0.4, 1.15, 6.5), Wl(0, 1.0, 9), null, 34, 30); });
at(68, 'FOREST', (c, lt, d, v, t) => { night(c); base(c, v); c.engineOn = false; c.lightsOn = false; c.cabLight = true; c.snow = 0.3; carCrashed();
  WOLVES.forEach((w, i) => { w.visible = true; w.position.copy(Wl((i - 1) * 2.4 - 0.5, 0, 9 + (i % 2) * 1.5)); w.rotation.y = CYAW + Math.PI + (i - 1) * 0.2; w.userData.set(t, 0); });
  return cam(lt, d, Wl(-1.5, 1.0, 12.5), Wl(-1.2, 1.0, 12), Wl(0, 0.8, 0), null, 40, 36); });
// INSERT B — wolves at the car
at(69, 'FOREST', (c, lt, d, v, t) => { night(c); base(c, v); c.engineOn = false; c.lightsOn = false; c.cabLight = true; c.snow = 0.4; carCrashed();
  const w = WOLVES[0]; w.visible = true; const a = lt * 0.5; w.position.copy(Wl(1.8 + Math.sin(a) * 0.5, 0, -3.5 + a * 1.2)); w.rotation.y = CYAW + 0.2; w.userData.set(t, 1);
  return cam(lt, d, Wl(5, 1.6, -6), Wl(4.6, 1.5, -5.5), Wl(1.5, 0.7, -2.5), null, 40, 38); });
at(70, 'FOREST', (c, lt, d, v, t) => { night(c); base(c, v); c.engineOn = false; c.lightsOn = false; c.cabLight = true; c.snow = 0.4; carCrashed();
  WOLVES.forEach((w, i) => { w.visible = i < 2; const a = lt * 0.6 + i * 2.5; w.position.copy(Wl(Math.cos(a) * 3.2, 0, Math.sin(a) * 4.0)); w.rotation.y = CYAW - a + Math.PI; w.userData.set(t, 1); });
  return cam(lt, d, Wl(6, 7, 6), Wl(5, 6.5, 5), Wl(0, 0.5, 0), null, 40, 40); });
at(71, 'FOREST', (c, lt, d, v, t) => { night(c); base(c, v); c.engineOn = false; c.lightsOn = false; c.cabLight = true; c.snow = 0.4; carCrashed();
  const w = WOLVES[0]; w.visible = true; w.position.copy(Wl(-1.7, 0, 0.3)); w.rotation.y = CYAW + Math.PI / 2; w.rotation.x = 0; w.userData.set(t, 0); w.userData.head.position.y = 1.0 + Math.abs(Math.sin(t * 8)) * 0.08;
  return cam(lt, d, Wl(-5.5, 1.6, 3.6), Wl(-5.1, 1.55, 3.3), Wl(-1.5, 0.9, 0.3), null, 36, 32); });
at(72, 'CAR', (c, lt, d, v, t) => { night(c); base(c, v); c.cold = true; c.breath = [HEAD.otabek]; seatAll(t, { otabek: { talk: talk(t, v > S(72) + 1.2, 0.2), eyeS: 1.3, brow: 0.8, headYaw: -0.3 } }); return ic(lt, d, 'otabek'); });
at(73, 'CAR', (c, lt, d, v, t) => { night(c); base(c, v); seatAll(t, { sardor: { armUp: [1.1, 1.25], armOut: [0.05, -0.1], brow: 0.8 } }); return ic(lt, d, 'wheel'); });
at(74, 'FOREST', (c, lt, d, v, t) => { night(c); base(c, v); c.engineOn = false; c.lightsOn = false; c.cabLight = true; c.snow = 0.6; c.shake = 0.5; carCrashed(); c.horn = true;
  WOLVES.forEach((w, i) => { w.visible = true; w.position.copy(Wl((i - 1) * 3, 0, 7 + i)); w.rotation.y = CYAW + Math.PI; w.userData.set(t, 0); });
  return cam(lt, d, Wl(6, 3, 8), Wl(7, 3.5, 9), Wl(0, 0.8, 3), null, 40, 44); });
at(75, 'FOREST', (c, lt, d, v, t) => { night(c); base(c, v); c.engineOn = false; c.lightsOn = true; c.snow = 0.4; c.flashW = lt < 0.15 ? 0.5 : 0; carCrashed();
  WOLVES.forEach((w, i) => { w.visible = true; w.position.copy(Wl((i - 1) * 2.2, 0, 8 + i * 0.8)); w.rotation.y = CYAW + Math.PI; w.userData.set(t, 0); });
  return cam(lt, d, Wl(0.8, 2.4, -5.5), Wl(0.7, 2.3, -5), Wl(0, 0.9, 9), null, 40, 38); });
at(76, 'FOREST', (c, lt, d, v, t) => { night(c); base(c, v); c.engineOn = false; c.lightsOn = true; c.snow = 0.4; carCrashed();
  WOLVES.forEach((w, i) => { w.visible = true; const k = clamp(lt / 2.5); w.position.copy(Wl((i - 1) * 2.2 + (i - 1) * k * 4, 0, 8 + i * 0.8 + k * 16)); w.rotation.y = CYAW + (i - 1) * 0.3; w.userData.set(t, 1.6); });
  return cam(lt, d, Wl(0.8, 2.4, -5), Wl(0.7, 2.3, -4.6), Wl(0, 0.9, 12), null, 38, 36); });
at(77, 'FOREST', (c, lt, d, v, t) => { night(c); base(c, v); c.engineOn = false; c.lightsOn = false; c.cabLight = true; c.snow = 0.5; carCrashed(); c.wolfEyesOnly = true;
  WOLVES.forEach((w, i) => { w.visible = true; w.position.copy(Wl((i - 1) * 6, 0, 22 + i * 2)); w.rotation.y = CYAW + Math.PI; w.userData.set(t, 0); });
  return cam(lt, d, Wl(-0.5, 1.6, -1.5), Wl(-0.4, 1.6, -0.5), Wl(0, 1.0, 22), null, 38, 32); });
at(78, 'CAR', (c, lt, d, v, t) => { night(c); base(c, v); c.cold = true; c.breath = [HEAD.sardor]; seatAll(t, { sardor: { headYaw: 0.2, brow: 0.3 }, bekzod: { blink: 1, headPitch: 0.4, headYaw: 0.4 }, otabek: { blink: 1, headPitch: 0.5 } }); return ic(lt, d, 'wide'); });
at(79, 'FOREST', (c, lt, d, v, t) => { night(c); base(c, v); c.engineOn = false; c.lightsOn = false; c.cabLight = true; c.snow = 0.5; carCrashed(); c.overlay = 'ask';
  return cam(lt, d, Wl(10, 5, 10), Wl(12, 7, 12), Wl(0, 0.5, 0), null, 40, 42); });
// DAY 4
at(81, 'FOREST', (c, lt, d, v, t) => { c.tod = 'day'; base(c, v); c.engineOn = false; c.lightsOn = false; c.snow = 0.7; c.wind = 2; carCrashed();
  return cam(lt, d, Wl(-8, 2.5, -4), Wl(-7, 2.2, -3.5), Wl(0, 0.8, 0), null, 40, 38); });
at(82, 'CAR', (c, lt, d, v, t) => { c.tod = 'day'; base(c, v); c.cold = true; c.breath = [HEAD.otabek]; seatAll(t, { otabek: { brow: -0.6, headPitch: 0.1, armUp: [0.6 + Math.sin(t * 5) * 0.1, 0.6], armOut: [0.5, 0.5] } }); return ic(lt, d, 'otabek'); });
at(83, 'CAR', (c, lt, d, v, t) => { c.tod = 'day'; base(c, v); seatAll(t, { otabek: { brow: -0.8, talk: talk(t, true, 0.6), armUp: [1.3 + Math.sin(t * 4) * 0.3, 0.4], armOut: [0.3, 0.3] }, sardor: { headYaw: 2.2 }, bekzod: { headYaw: -2.2 } }); return ic(lt, d, 'otabek'); });
at(84, 'CAR', (c, lt, d, v, t) => { c.tod = 'day'; base(c, v); seatAll(t, { otabek: { brow: -0.8, talk: talk(t, v < E(84), 0.6), armUp: [1.0, 1.0], armOut: [0.5, 0.5] } }); return ic(lt, d, 'wide'); });
at(85, 'CAR', (c, lt, d, v, t) => { c.tod = 'day'; base(c, v); seatAll(t, { sardor: { headYaw: 1.6, talk: talk(t, true, 0.35), armUp: [1.2, 0.25], armOut: [0.6, 0.14], brow: 0.6 } }); return ic(lt, d, 'sardor'); });
at(86, 'FOREST', (c, lt, d, v, t) => { c.tod = 'day'; c.blizzard = true; base(c, v); c.snow = 1; c.wind = 3; c.engineOn = false; carCrashed();
  const k = clamp(lt / d); reset(C.otabek, FOREST, Wl(-1.6, 0, -0.5).x - k * 6, Wl(-1.6, 0, -0.5).z + k * 7, -2.3, { walk: t * 1.2, walkAmt: 0.8, lean: 0.25, armUp: [0.3, 0.3] });
  return cam(lt, d, V3(CX() + 1, 2.6, CZ - 5), V3(CX() + 0.5, 2.6, CZ - 4.5), V3(CX() - 3, 1.0, CZ + 4), V3(CX() - 6, 1.0, CZ + 8), 42, 40); });
at(87, 'CAR', (c, lt, d, v, t) => { c.tod = 'day'; base(c, v); c.overlay = 'h1'; seatAll(t, { sardor: { headYaw: -1.2, headPitch: 0.1 }, bekzod: { headYaw: 1.0 } }, ['sardor', 'bekzod']); return ic(lt, d, 'wideL'); });
at(88, 'CAR', (c, lt, d, v, t) => { c.tod = 'day'; base(c, v); c.overlay = 'h2'; c.frost = 0.7; seatAll(t, { sardor: { headYaw: -1.0, blink: 0.4 }, bekzod: { headPitch: 0.4, blink: 0.6 } }, ['sardor', 'bekzod']); return ic(lt, d, 'wide'); });
at(89, 'FOREST', (c, lt, d, v, t) => { c.tod = 'day'; c.blizzard = true; base(c, v); c.snow = 1; c.wind = 3; carCrashed(); return cam(lt, d, Wl(-5, 0.8, 3), Wl(-6, 0.9, 4), Wl(-9, 0.2, 8), Wl(-12, 0.2, 12), 40, 40); });
at(90, 'FOREST', (c, lt, d, v, t) => { c.tod = 'day'; c.blizzard = true; base(c, v); c.snow = 1; c.wind = 3; carCrashed();
  const p = Wl(-1.6, 0, 0.0); reset(C.otabek, FOREST, p.x, p.z, CYAW + Math.PI / 2, { armUp: [lt % 0.5 < 0.25 ? 1.6 : 1.3, 0.2], armOut: [0.2, 0.1], lean: 0.2, brow: 0.6 });
  return cam(lt, d, Wl(-4.5, 1.6, 2.5), Wl(-4.2, 1.6, 2.2), Wl(-1.4, 1.1, 0.1), null, 40, 38); });
at(91, 'FOREST', (c, lt, d, v, t) => { c.tod = 'day'; c.blizzard = true; base(c, v); c.snow = 1; c.wind = 3; c.doorOpen = ss(lt / 0.6); carCrashed();
  const p = Wl(-1.9, 0, 0.6); reset(C.otabek, FOREST, p.x, p.z, CYAW + Math.PI / 2, { armUp: [0.5, 0.5], armOut: [0.5, 0.5], lean: 0.25, blink: 0.4, brow: 0.8 });
  return cam(lt, d, Wl(-5, 1.7, 1.5), Wl(-4.6, 1.7, 1.3), Wl(-1.8, 1.2, 0.5), null, 38, 34); });
at(92, 'CAR', (c, lt, d, v, t) => { c.tod = 'day'; base(c, v); c.cold = true; c.breath = [HEAD.otabek]; seatAll(t, { otabek: { armUp: [1.2, 1.2], armOut: [-0.3, -0.3], headPitch: 0.3, blink: 0.4, brow: 0.9, talk: 0.1 } }); c.blueLips = true; return cam(lt, d, IC.otabek[0], IC.otabek[1], HEAD.otabek, null, 34, 28); });
at(93, 'CAR', (c, lt, d, v, t) => { c.tod = 'day'; base(c, v); c.cold = true; c.breath = [HEAD.otabek, HEAD.sardor]; seatAll(t, { sardor: { headYaw: 2.6, armUp: [1.0, 1.0], armOut: [0.4, 0.4] }, otabek: { armUp: [1.3, 1.3], armOut: [-0.2, -0.2], blink: 0.4 } }); return ic(lt, d, 'otabek'); });
at(94, 'CAR', (c, lt, d, v, t) => { c.tod = 'day'; base(c, v); c.overlay = 'tip_warm'; seatAll(t, { sardor: { headYaw: 2.6, armUp: [1.0, 1.0], armOut: [0.4, 0.4] }, otabek: { armUp: [1.3, 1.3], armOut: [-0.2, -0.2], blink: 0.4 } }); return ic(lt, d, 'wide'); });
at(95, 'CAR', (c, lt, d, v, t) => { c.tod = 'day'; base(c, v); c.cold = true; c.breath = [HEAD.otabek]; c.shake = 0.1; seatAll(t, { otabek: { talk: talk(t, true, 0.2), blink: 0.3, brow: 0.9, eyeS: 1.1, headYaw: Math.sin(t * 30) * 0.03 } }); return cam(lt, d, IC.otabek[0], IC.otabek[1], HEAD.otabek, null, 34, 26, x => x); });
// INSERT C — chocolate fight
at(98, 'CAR', (c, lt, d, v, t) => { night(c); base(c, v); c.dome = true; c.choco = 1; seatAll(t, {}, ['sardor', 'bekzod']); return ic(lt, d, 'back'); });
at(99, 'CAR', (c, lt, d, v, t) => { night(c); base(c, v); c.dome = true; c.choco = 1; seatAll(t, { bekzod: { headYaw: -2.4, brow: -0.8, talk: talk(t, true, 0.6), armUp: [1.4, 0.3], armOut: [-0.3, 0.14] } }); return ic(lt, d, 'bekzod'); });
at(100, 'CAR', (c, lt, d, v, t) => { night(c); base(c, v); c.dome = true; c.choco = 1; seatAll(t, { otabek: { brow: -0.9, talk: talk(t, true, 0.6), armUp: [1.6, 0.3], armOut: [0.3, 0.14] } }); return ic(lt, d, 'otabek'); });
at(101, 'CAR', (c, lt, d, v, t) => { night(c); base(c, v); c.dome = true; c.choco = 1; c.shake = 0.15; seatAll(t, { bekzod: { headYaw: -2.2, brow: -0.8, talk: talk(t, true, 0.6) }, otabek: { brow: -0.9, talk: talk(t + 0.3, true, 0.6), armUp: [1.4, 0.3] } }); return ic(lt, d, 'wide'); });
at(102, 'CAR', (c, lt, d, v, t) => { night(c); base(c, v); c.dome = true; c.choco = 1; seatAll(t, { bekzod: { headYaw: -2.2, brow: -0.8 }, otabek: { brow: -0.9 }, sardor: { brow: 0.6 } }); return cam(lt, d, V3(0.6, 1.35, 1.3), V3(0.5, 1.4, 1.2), V3(0, 0.9, -0.5), null, 64, 64); });
at(103, 'CAR', (c, lt, d, v, t) => { night(c); base(c, v); c.dome = true; c.choco = 1; seatAll(t, { sardor: { headYaw: 1.5, armUp: [1.5, 1.5], armOut: [-0.2, -0.2], headPitch: 0.3 } }); return ic(lt, d, 'sardor'); });
at(104, 'CAR', (c, lt, d, v, t) => { night(c); base(c, v); c.dome = true; c.choco = 0; seatAll(t, { sardor: { headYaw: 1.4, talk: talk(t, v < E(106)), brow: 0.4, armUp: [1.1, 0.25] } }); return ic(lt, d, 'sardor'); });
at(105, 'CAR', (c, lt, d, v, t) => { night(c); base(c, v); c.dome = true; c.choco = 0; seatAll(t, { sardor: { headYaw: 1.6, talk: talk(t, v < E(106)), armUp: [1.1, 0.25] }, bekzod: { headYaw: -2.2 }, otabek: { headPitch: 0.2 } }); return ic(lt, d, 'wide'); });
at(107, 'CAR', (c, lt, d, v, t) => { night(c); base(c, v); c.dome = true; seatAll(t, { bekzod: { headPitch: 0.3 }, otabek: { headPitch: 0.3 }, sardor: { headPitch: 0.2 } }); return ic(lt, d, 'wideL'); });
at(108, 'CAR', (c, lt, d, v, t) => { night(c); base(c, v); c.dome = true; c.choco = 1; seatAll(t, {}, ['sardor', 'bekzod']); return cam(lt, d, V3(-0.35, 0.85, -0.45), V3(-0.38, 0.82, -0.55), V3(-0.5, 0.53, -0.95), null, 30, 24); });
at(109, 'CAR', (c, lt, d, v, t) => { night(c); base(c, v); c.dome = true; seatAll(t, { sardor: { headYaw: 0.8, talk: 0.15, brow: 0.2 }, bekzod: { headYaw: -0.8, talk: 0.15 }, otabek: { talk: 0.15 } }); return cam(lt, d, IC.wide[0], IC.wide[1].clone().add(V3(0, 0, -0.1)), IC.wide[2], null, 64, 54); });
// DAY 5
at(110, 'FOREST', (c, lt, d, v, t) => { c.tod = 'day'; base(c, v); c.engineOn = true; c.lightsOn = false; c.snow = 0.5; carCrashed();
  return cam(lt, d, Wl(-5, 2, -7), Wl(-4.5, 1.8, -6.5), Wl(-0.4, 0.6, -2.2), null, 40, 38); });
at(111, 'FOREST', (c, lt, d, v, t) => { c.tod = 'day'; base(c, v); c.engineOn = lt < 1.8; c.lightsOn = false; c.snow = 0.5; c.shake = lt < 1.8 ? 0.3 : 0; carCrashed();
  return cam(lt, d, Wl(-2.2, 3.6, -6.8), Wl(-1.9, 3.3, -6.2), Wl(-0.55, 0.3, -2.6), null, 34, 30); });
at(112, 'CAR', (c, lt, d, v, t) => { c.tod = 'day'; base(c, v); c.engineOn = true; c.fuel = 0; seatAll(t); return cam(lt, d, IC.dash[0], IC.dash[1], V3(-0.62, 0.95, 1.21), null, 22, 18); });
at(113, 'CAR', (c, lt, d, v, t) => { c.tod = 'day'; base(c, v); c.cold = true; c.frost = 0.8; c.breath = [HEAD.sardor, HEAD.bekzod, HEAD.otabek]; seatAll(t, { sardor: { armUp: [0.7, 0.7], armOut: [0.6, 0.6] }, bekzod: { armUp: [0.7, 0.7], armOut: [0.6, 0.6] }, otabek: { armUp: [0.7, 0.7], armOut: [0.6, 0.6] } }); return ic(lt, d, 'wide'); });
at(114, 'CAR', (c, lt, d, v, t) => { c.tod = 'day'; base(c, v); c.cold = true; c.frost = 0.8 + k01(v, S(114), E(114)) * 0.15; seatAll(t); return cam(lt, d, V3(0.4, 1.2, 0.1), V3(0.5, 1.15, 0.2), V3(0.97, 1.03, 0.45), null, 40, 34); });
at(115, 'CAR', (c, lt, d, v, t) => { c.tod = 'day'; base(c, v); c.cold = true; c.frost = 0.9; c.blanket = true; c.breath = [HEAD.sardor, HEAD.otabek]; seatAll(t, { sardor: { armUp: [0.7, 0.7], armOut: [0.6, 0.6], headYaw: 0.4 }, bekzod: { headYaw: -0.4, armUp: [0.7, 0.7], armOut: [0.6, 0.6] }, otabek: { armUp: [0.7, 0.7], armOut: [0.6, 0.6] } }); return ic(lt, d, 'wideL'); });
at(116, 'CAR', (c, lt, d, v, t) => { night(c); base(c, v); c.cold = true; c.frost = 0.9; c.blanket = true; c.dome = true; seatAll(t, { sardor: { armUp: [0.7, 0.7], armOut: [0.6, 0.6] }, bekzod: { armUp: [0.7, 0.7], armOut: [0.6, 0.6] } }); return ic(lt, d, 'wideL'); });
at(117, 'CAR', (c, lt, d, v, t) => { night(c); base(c, v); c.cold = true; c.frost = 0.9; c.blanket = true; c.dome = true; c.breath = [HEAD.sardor, HEAD.bekzod]; seatAll(t, { sardor: { headYaw: 0.6, talk: talk(t, Math.sin(t * 0.8) > 0, 0.25), brow: 0.2 }, bekzod: { headYaw: -0.6, talk: talk(t, Math.sin(t * 0.8) < 0, 0.25) }, otabek: { blink: 0.3 } }); return ic(lt, d, 'wide'); });
at(118, 'CAR', (c, lt, d, v, t) => { night(c); base(c, v); c.cold = true; c.frost = 0.9; c.blanket = true; seatAll(t, { bekzod: { blink: lerp(0.3, 1, ss(lt / 1.5)), headPitch: lerp(0.1, 0.6, ss(lt / 1.5)) } }); return cam(lt, d, IC.bekzod[0], IC.bekzod[1], HEAD.bekzod, null, 36, 28); });
at(119, 'CAR', (c, lt, d, v, t) => { night(c); base(c, v); c.cold = true; c.frost = 0.9; c.blanket = true; c.shake = 0.2; seatAll(t, { sardor: { headYaw: 0.9, talk: talk(t, true, 0.8), brow: 1, eyeS: 1.4, armUp: [1.3, 0.25], armOut: [-0.5, 0.14] }, bekzod: { blink: 1, headPitch: 0.6 } }); return ic(lt, d, 'sardor'); });
at(121, 'CAR', (c, lt, d, v, t) => { night(c); base(c, v); c.cold = true; c.frost = 0.9; c.blanket = true; c.shake = 0.35; seatAll(t, { sardor: { headYaw: 0.9, brow: 1, eyeS: 1.3, armUp: [1.3 + Math.sin(t * 14) * 0.2, 1.3 - Math.sin(t * 14) * 0.2], armOut: [-0.6, 0.0] }, bekzod: { blink: 1, headPitch: 0.6, headYaw: Math.sin(t * 14) * 0.2 } }); return ic(lt, d, 'wide'); });
at(122, 'CAR', (c, lt, d, v, t) => { night(c); base(c, v); c.cold = true; c.frost = 0.9; c.blanket = true; seatAll(t, { bekzod: { blink: lerp(1, 0.35, ss((lt - 0.5) / 0.8)), headPitch: lerp(0.6, 0.2, ss((lt - 0.5) / 1)) } }); return cam(lt, d, IC.bekzod[0], IC.bekzod[1], HEAD.bekzod, null, 32, 28); });
// INSERT D — false hope
const DL = v => { const k = k01(v, S(123), S(131)); const z = CZ - 40 + k * 0; const x = CX() + lerp(60, -60, k); return [x, CZ - 45, 0]; };
at(123, 'FOREST', (c, lt, d, v, t) => { night(c); base(c, v); c.engineOn = false; c.lightsOn = false; c.cabLight = true; c.snow = 0.3; carCrashed(); c.distLight = DL(v);
  return cam(lt, d, Wl(3, 2.5, -4), Wl(3, 2.6, -3.5), V3(CX(), 1, CZ - 45), null, 34, 30); });
at(124, 'CAR', (c, lt, d, v, t) => { night(c); base(c, v); c.blanket = false; c.frost = 0.85; seatAll(t, { sardor: { headYaw: -0.4, eyeS: 1.4, brow: 0.9, lean: -0.1 }, bekzod: { headYaw: -0.6, eyeS: 1.4, brow: 0.9 }, otabek: { eyeS: 1.4, brow: 0.9, headYaw: 0.2 } }); return ic(lt, d, 'wide'); });
at(125, 'CAR', (c, lt, d, v, t) => { night(c); base(c, v); c.frost = 0.85; c.shake = 0.15; seatAll(t, { otabek: { talk: talk(t, true, 0.8), eyeS: 1.4, brow: 1, armUp: [2.2, 0.4] }, bekzod: { talk: talk(t + 1, true, 0.8), eyeS: 1.3, headYaw: -1.0 } }); return ic(lt, d, 'otabek'); });
at(127, 'FOREST', (c, lt, d, v, t) => { night(c); base(c, v); c.engineOn = false; c.lightsOn = Math.floor(lt * 3) % 2 === 0; c.horn = true; c.snow = 0.3; carCrashed(); c.distLight = DL(v);
  return cam(lt, d, Wl(-7, 3, 6), Wl(-6.5, 3, 5.5), Wl(0, 0.8, 0), null, 40, 40); });
at(128, 'FOREST', (c, lt, d, v, t) => { night(c); base(c, v); c.engineOn = false; c.lightsOn = false; c.cabLight = true; c.snow = 0.3; carCrashed(); c.distLight = DL(v);
  return cam(lt, d, Wl(1, 1.6, -3), Wl(1, 1.6, -3.2), V3(c.distLight[0], 1, CZ - 45), null, 30, 26); });
at(130, 'FOREST', (c, lt, d, v, t) => { night(c); base(c, v); c.engineOn = false; c.lightsOn = false; c.cabLight = true; c.snow = 0.3; carCrashed(); c.distLight = DL(v);
  return cam(lt, d, Wl(1, 1.6, -3), Wl(1.2, 1.6, -3.2), V3(c.distLight[0], 1, CZ - 45), V3(CX() - 70, 1, CZ - 45), 30, 34); });
at(131, 'FOREST', (c, lt, d, v, t) => { night(c); base(c, v); c.engineOn = false; c.lightsOn = false; c.cabLight = true; c.snow = 0.4; carCrashed();
  return cam(lt, d, Wl(6, 16, 10), Wl(10, 30, 18), Wl(0, 0, 0), Wl(-20, 0, -20), 42, 48); });
at(132, 'CAR', (c, lt, d, v, t) => { night(c); base(c, v); c.frost = 0.9; c.cold = true; c.breath = [HEAD.sardor]; seatAll(t, { sardor: { headPitch: 0.4, blink: 0.4, brow: 0.6, headYaw: -0.3 } }); return ic(lt, d, 'sardor'); });
at(133, 'CAR', (c, lt, d, v, t) => { night(c); base(c, v); c.frost = 0.9; c.blanket = true; seatAll(t, { sardor: { headPitch: 0.4, blink: 0.4 }, bekzod: { headPitch: 0.5, blink: 0.5 }, otabek: { headPitch: 0.5, blink: 0.5 } }); return ic(lt, d, 'wideL'); });
at(134, 'FOREST', (c, lt, d, v, t) => { night(c); base(c, v); c.engineOn = false; c.lightsOn = false; c.cabLight = false; c.snow = 1; carCrashed();
  return cam(lt, d, Wl(-4, 1.5, 6), Wl(-6, 2.5, 9), Wl(0, 0.6, 0), null, 40, 44); });
// DAY 6
at(135, 'FOREST', (c, lt, d, v, t) => { c.tod = 'day'; base(c, v); c.engineOn = false; c.lightsOn = false; c.snow = 0.2; carCrashed();
  return cam(lt, d, Wl(8, 3, 8), Wl(7, 2.6, 7), Wl(0, 0.6, 0), null, 40, 38); });
at(136, 'CAR', (c, lt, d, v, t) => { c.tod = 'day'; base(c, v); c.handPhone = [V3(0.38, 1.0, 0.65), Math.PI, ['bar', 0]]; c.handPhoneMode = 'low3';
  seatAll(t, { bekzod: { armUp: [1.25, 1.25], armOut: [-0.25, 0.25], headPitch: 0.35, blink: 0.3 } }); return ic(lt, d, 'bekPhone'); });
at(137, 'CAR', (c, lt, d, v, t) => { c.tod = 'day'; base(c, v); c.handPhone = [V3(0.38, 1.0, 0.65), Math.PI, ['nosig', 0.03]];
  seatAll(t, { bekzod: { armUp: [1.25, 1.25], armOut: [-0.25, 0.25], headPitch: 0.35, blink: 0.3 } }); return cam(lt, d, IC.bekPhone[0], IC.bekPhone[1].clone().add(V3(0.04, -0.04, 0.12)), IC.bekPhone[2], null, 30, 24); });
at(138, 'CAR', (c, lt, d, v, t) => { c.tod = 'day'; base(c, v); seatAll(t, { sardor: { headPitch: -0.1, look: [0.5, 0.5], brow: 0.5, eyeS: 1.15 } }); return ic(lt, d, 'sardor'); });
at(139, 'HILL', (c, lt, d, v, t) => { c.tod = 'day'; c.snow = 0.3; return cam(lt, d, V3(-30, 6, 40), V3(-26, 8, 34), V3(0, 4, -6), null, 40, 40); });
at(140, 'HILL', (c, lt, d, v, t) => { c.tod = 'day'; c.snow = 0.4; const k = clamp(lt / 6); const z = lerp(14, 6, k), x = 0;
  reset(C.sardor, HILL, x, z, Math.PI, { walk: t * 0.9, walkAmt: 0.9, lean: 0.35, armUp: [0.4, 0.4], armOut: [0.3, 0.3] }, hillY(x, z) - 0.35);
  return { pos: V3(4, hillY(0, z + 6) + 2.2, z + 6), look: V3(0, hillY(x, z) + 0.8, z), fov: 40 }; });
at(142, 'HILL', (c, lt, d, v, t) => { c.tod = 'day'; c.snow = 0.3; const st = reset(C.sardor, HILL, 0, -6, 0.4, { armUp: [lerp(0.3, 2.8, ss(lt / 1.2)), 0.3], armOut: [0.1, 0.2], headPitch: -0.5, eyeS: 1.2 }, 4);
  const hand = new THREE.Vector3(); C.sardor.userData.apply(t); C.sardor.updateMatrixWorld(true); C.sardor.userData.parts.arms[0].hand.getWorldPosition(hand); hand.x -= 600;
  c.hillPhone = [hand.add(V3(0, 0.25, 0)), 0.4 + Math.PI, [v > S(143) - 0.1 ? 'bar' : 'nosig', 0.03]];
  return cam(lt, d, V3(-3.5, 4.6, -1), V3(-3, 4.8, -1.8), V3(0, 5.6, -6), null, 40, 36); });
at(143, 'HILL', (c, lt, d, v, t) => { c.tod = 'day'; c.snow = 0.3; reset(C.sardor, HILL, 0, -6, 0.4, { armUp: [2.8, 0.3], armOut: [0.1, 0.2], headPitch: -0.5, eyeS: 1.3, brow: 0.6 }, 4);
  const hand = new THREE.Vector3(); C.sardor.userData.apply(t); C.sardor.updateMatrixWorld(true); C.sardor.userData.parts.arms[0].hand.getWorldPosition(hand); hand.x -= 600;
  const ph = hand.add(V3(0, 0.25, 0)); const mode = v > S(151) ? 'off' : v > S(148) - 0.1 ? 'sms' : 'bar'; c.hillPhone = [ph, 0.4 + Math.PI, [mode, v]];
  return { pos: ph.clone().add(V3(Math.sin(0.4 + Math.PI) * 0.9, -0.15, Math.cos(0.4 + Math.PI) * 0.9)), look: ph, fov: 30 }; });
at(152, 'HILL', (c, lt, d, v, t) => { c.tod = 'day'; c.snow = 0.4; reset(C.sardor, HILL, 0, -6, 0.4, { armUp: [0.3, 0.3], headPitch: -0.3, blink: 0.3, brow: 0.6 }, 4);
  return cam(lt, d, V3(-8, 6, 2), V3(-14, 10, 8), V3(0, 5, -6), null, 40, 44); });
// DAY 7
at(154, 'FOREST', (c, lt, d, v, t) => { c.tod = 'day'; base(c, v); c.engineOn = false; c.lightsOn = false; c.snow = 0.15; carCrashed();
  return cam(lt, d, Wl(-9, 3, 2), Wl(-8, 2.6, 2), Wl(0, 0.6, 0), null, 40, 38); });
at(155, 'CAR', (c, lt, d, v, t) => { c.tod = 'day'; base(c, v); seatAll(t, { sardor: { brow: -0.6, headYaw: -0.2, look: [0.3, 0] } }); return ic(lt, d, 'sardor'); });
const F = () => FOREST.fire.position;
at(157, 'FOREST', (c, lt, d, v, t) => { c.tod = 'day'; base(c, v); c.engineOn = false; c.lightsOn = false; c.snow = 0.15; carCrashed();
  const k = clamp(lt / d); const p = Wl(-1.5, 0, -2.5).lerp(F().clone().add(V3(1.2, 0, 0)), k);
  reset(C.sardor, FOREST, p.x, p.z, Math.atan2(F().x - p.x, F().z - p.z), { walk: t * 1.1, walkAmt: 0.7, armUp: [1.0, 1.0], armOut: [0.4, 0.4], lean: 0.1 });
  c.spare = [p.clone().add(V3(0, 0.75, 0)).add(V3(Math.sin(Math.atan2(F().x - p.x, F().z - p.z)) * 0.45, 0, Math.cos(Math.atan2(F().x - p.x, F().z - p.z)) * 0.45)), 0, Math.atan2(F().x - p.x, F().z - p.z)];
  return cam(lt, d, F().clone().add(V3(6, 2.5, -3)), F().clone().add(V3(5.5, 2.3, -2.5)), p.clone().add(V3(0, 1, 0)), null, 40, 38); });
at(158, 'FOREST', (c, lt, d, v, t) => { c.tod = 'day'; base(c, v); carCrashed(); c.lightsOn = false; c.engineOn = false; c.fire = 0.001; c.smoke = 0;
  reset(C.sardor, FOREST, F().x + 0.9, F().z + 0.4, -2.0, { lean: 0.6, armUp: [1.2, 1.2], armOut: [0.3, 0.3] });
  return cam(lt, d, F().clone().add(V3(3, 1.8, -2.5)), F().clone().add(V3(2.6, 1.6, -2.2)), F().clone().add(V3(0, 0.4, 0)), null, 36, 34); });
at(159, 'FOREST', (c, lt, d, v, t) => { c.tod = 'day'; base(c, v); carCrashed(); c.lightsOn = false; c.engineOn = false;
  const ph = (v >= S(160) && v < S(160) + 0.6) || (v >= S(161) && v < S(161) + 0.5) || v >= S(163) - 0.15; c.fire = v >= S(163) - 0.15 ? clamp((v - S(163) + 0.15) / 1.0) : ph ? 0.12 : 0.001; c.smoke = 0;
  reset(C.sardor, FOREST, F().x + 0.75, F().z + 0.3, -2.0, { lean: 0.7, armUp: [1.4, 1.4], armOut: [0.1, 0.1], eyeS: 1.1 });
  return cam(lt, d, F().clone().add(V3(2.5, 1.4, -2.5)), F().clone().add(V3(2.3, 1.3, -2.3)), F().clone().add(V3(0.3, 0.4, 0.1)), null, 32, 28); });
at(164, 'FOREST', (c, lt, d, v, t) => { c.tod = 'day'; base(c, v); carCrashed(); c.lightsOn = false; c.engineOn = false; c.fire = 1; c.smoke = clamp(lt / 3);
  reset(C.sardor, FOREST, F().x + 2.2, F().z + 1.5, -2.2, { eyeS: 1.1 });
  return cam(lt, d, F().clone().add(V3(6, 2, 6)), F().clone().add(V3(5, 2.5, 5)), F().clone().add(V3(0, 1.2, 0)), null, 42, 42); });
at(165, 'FOREST', (c, lt, d, v, t) => { c.tod = 'day'; base(c, v); carCrashed(); c.lightsOn = false; c.engineOn = false; c.fire = 1; c.smoke = 1;
  return cam(lt, d, F().clone().add(V3(8, 3, 9)), F().clone().add(V3(7, 7, 8)), F().clone().add(V3(0, 3, 0)), F().clone().add(V3(1, 10, 0)), 44, 48); });
at(166, 'FOREST', (c, lt, d, v, t) => { c.tod = 'day'; base(c, v); carCrashed(); c.lightsOn = false; c.engineOn = false; c.fire = 0.8; c.smoke = 1;
  return cam(lt, d, F().clone().add(V3(30, 20, 30)), F().clone().add(V3(34, 24, 30)), F().clone().add(V3(0, 6, 0)), null, 44, 46); });
at(167, 'FOREST', (c, lt, d, v, t) => { c.tod = 'day'; base(c, v); carCrashed(); c.lightsOn = false; c.engineOn = false; c.fire = 0.7; c.smoke = 1;
  reset(C.sardor, FOREST, F().x + 1.5, F().z + 2, Math.PI + 0.3, { headYaw: lerp(0, 0.6, ss(lt / 1.5)), eyeS: 1.15, brow: 0.5 });
  return cam(lt, d, F().clone().add(V3(1.3, 1.45, 3.8)), F().clone().add(V3(1.35, 1.45, 3.6)), F().clone().add(V3(1.5, 1.25, 2)), null, 36, 32); });
at(169, 'FOREST', (c, lt, d, v, t) => { c.tod = 'day'; base(c, v); carCrashed(); c.lightsOn = false; c.engineOn = false; c.fire = 0.7; c.smoke = 1;
  reset(C.sardor, FOREST, F().x + 1.5, F().z + 2, Math.PI, { eyeS: 1.4, brow: 1, talk: talk(t, v > S(170)) });
  reset(C.bekzod, FOREST, F().x + 2.6, F().z + 1.2, Math.PI, { eyeS: 1.3 }); reset(C.otabek, FOREST, F().x + 0.4, F().z + 1.0, Math.PI, { eyeS: 1.3 });
  return cam(lt, d, F().clone().add(V3(1.5, 1.5, 6)), F().clone().add(V3(1.5, 1.5, 5.5)), F().clone().add(V3(1.5, 1.2, 1.5)), null, 40, 38); });
const sledAt = (i, k) => { const s = SLEDS[i]; s.visible = true; s.position.set(F().x - 3 + (i - 1) * 2.5, 0, F().z + 30 - k * 20 + i * 2.5); s.rotation.y = Math.PI; return s; };
at(171, 'FOREST', (c, lt, d, v, t) => { c.tod = 'day'; base(c, v); carCrashed(); c.lightsOn = false; c.engineOn = false; c.fire = 0.6; c.smoke = 1;
  sledAt(1, clamp(lt / 3) * 0.6).userData.set(t);
  return cam(lt, d, F().clone().add(V3(-4, 1.0, 10)), F().clone().add(V3(-3.8, 1.1, 10.5)), F().clone().add(V3(-3, 0.8, 26)), F().clone().add(V3(-3, 0.8, 20)), 36, 38); });
at(172, 'FOREST', (c, lt, d, v, t) => { c.tod = 'day'; base(c, v); carCrashed(); c.lightsOn = false; c.engineOn = false; c.fire = 0.6; c.smoke = 1;
  for (let i = 0; i < 3; i++) sledAt(i, 0.4 + clamp(lt / 3) * 0.3).userData.set(t);
  return cam(lt, d, F().clone().add(V3(4, 3, 8)), F().clone().add(V3(5, 3.5, 9)), F().clone().add(V3(-3, 0.8, 20)), null, 40, 40); });
at(173, 'FOREST', (c, lt, d, v, t) => { c.tod = 'day'; base(c, v); carCrashed(); c.lightsOn = false; c.engineOn = false; c.fire = 0.6; c.smoke = 1;
  for (let i = 0; i < 3; i++) sledAt(i, 0.75 + clamp(lt / 3) * 0.15).userData.set(t);
  reset(C.sardor, FOREST, F().x + 1.5, F().z + 2, Math.PI, { armUp: [2.6 + Math.sin(t * 8) * 0.3, 2.6 - Math.sin(t * 8) * 0.3], armOut: [0.5, 0.5], talk: talk(t), brow: 0.4 });
  reset(C.bekzod, FOREST, F().x + 2.6, F().z + 1.2, Math.PI, { armUp: [2.4, 0.2], talk: talk(t + 1) }); reset(C.otabek, FOREST, F().x + 0.4, F().z + 1.0, Math.PI, { armUp: [1.8, 1.8], armOut: [0.6, 0.6] });
  return cam(lt, d, F().clone().add(V3(1.5, 1.7, -4.5)), F().clone().add(V3(1.2, 1.8, -4.0)), F().clone().add(V3(0, 1.0, 10)), null, 44, 42); });
const rescScene = (c, v, t) => { c.tod = 'day'; base(c, v); carCrashed(); c.lightsOn = false; c.engineOn = false; c.fire = 0.4; c.smoke = 0.8;
  for (let i = 0; i < 3; i++) { sledAt(i, 0.9).userData.set(t); }
  reset(C.sardor, FOREST, F().x + 1.5, F().z + 3.2, 0, {}); reset(C.bekzod, FOREST, F().x + 2.6, F().z + 3.0, -0.3, {}); reset(C.otabek, FOREST, F().x + 0.4, F().z + 3.0, 0.3, {});
  reset(C.resc1, FOREST, F().x + 1.4, F().z + 5.0, Math.PI, {}); reset(C.resc2, FOREST, F().x + 3.2, F().z + 5.6, Math.PI + 0.4, {}); };
at(174, 'FOREST', (c, lt, d, v, t) => { rescScene(c, v, t); C.resc1.userData.state.talk = talk(t, true, 0.3); C.resc1.userData.state.armUp = [0.9, 0.25];
  return cam(lt, d, F().clone().add(V3(5, 1.8, 2)), F().clone().add(V3(5, 1.8, 2.6)), F().clone().add(V3(1.8, 1.2, 4.2)), null, 40, 38); });
at(175, 'FOREST', (c, lt, d, v, t) => { rescScene(c, v, t); const st = C.resc1.userData.state; st.armUp = [1.3, 1.3]; st.armOut = [-0.3, -0.3]; st.talk = talk(t, v > S(175) + 1); st.headYaw = Math.sin(t * 2) * 0.2 * (v < S(175) + 1.5 ? 1 : 0);
  c.map = [F().clone().add(V3(1.4, 1.05, 4.55)), Math.PI];
  return cam(lt, d, F().clone().add(V3(1.0, 1.55, 2.6)), F().clone().add(V3(1.1, 1.55, 2.9)), F().clone().add(V3(1.4, 1.2, 4.8)), null, 38, 34); });
at(178, 'FOREST', (c, lt, d, v, t) => { rescScene(c, v, t); c.village = v > S(178) + 3.0; if (c.village) c.fogFar = 260; const st = C.sardor.userData.state;
  if (v < S(178) + 3.0) { st.eyeS = 1.5; st.brow = 1; st.talk = 0.5; return cam(lt, 3, F().clone().add(V3(1.9, 1.5, 5.8)), F().clone().add(V3(1.85, 1.5, 5.5)), F().clone().add(V3(1.5, 1.2, 3.2)), null, 36, 30); }
  return cam(lt - 3, 3.5, F().clone().add(V3(4, 3, 0)), F().clone().add(V3(14, 34, 20)), F().clone().add(V3(0, 1, 0)), V3(FOREST.village.position.x + 12, 2, FOREST.village.position.z - 10), 44, 50); });
// 5 RULES
at(179, 'FOREST', (c, lt, d, v, t) => { c.tod = 'dusk'; base(c, v); carCrashed(); c.lightsOn = false; c.engineOn = false; c.village = true; c.fogFar = 260; c.snow = 0.2; c.overlay = 'rules';
  return cam(lt, d, Wl(20, 14, 20), Wl(24, 18, 14), Wl(0, 0, 0), Wl(0, 0, -10), 42, 46); });
at(181, 'FOREST', (c, lt, d, v, t) => { c.tod = 'dusk'; base(c, v); carCrashed(); c.lightsOn = false; c.engineOn = false; c.snow = 0.2; c.overlay = 'rules'; return cam(lt, d, Wl(-8, 3, 6), Wl(-7, 2.5, 5), Wl(0, 0.8, 0), null, 40, 38); });
at(183, 'FOREST', (c, lt, d, v, t) => { c.tod = 'dusk'; base(c, v); carCrashed(); c.lightsOn = false; c.engineOn = true; c.pipeSnow = 0; c.snow = 0.2; c.overlay = 'rules'; return cam(lt, d, Wl(-2.2, 3.6, -6.8), Wl(-1.9, 3.3, -6.2), Wl(-0.55, 0.3, -2.6), null, 34, 30); });
at(184, 'CAR', (c, lt, d, v, t) => { c.tod = 'dusk'; base(c, v); c.engineOn = true; c.overlay = 'rules'; seatAll(t); return ic(lt, d, 'dash'); });
at(185, 'CAR', (c, lt, d, v, t) => { c.tod = 'dusk'; base(c, v); c.engineOn = true; c.overlay = 'rules'; seatAll(t); return cam(lt, d, V3(-0.15, 1.05, 0.95), V3(-0.1, 1.02, 0.9), V3(0.05, 0.78, 0.62), null, 28, 24); });
at(186, 'HILL', (c, lt, d, v, t) => { c.tod = 'dusk'; c.snow = 0.2; c.overlay = 'rules'; reset(C.sardor, HILL, 0, -6, 0.4, { armUp: [2.8, 0.3], armOut: [0.1, 0.2], headPitch: -0.5 }, 4); return cam(lt, d, V3(-3.5, 4.6, -1), V3(-3, 4.8, -1.8), V3(0, 5.6, -6), null, 40, 36); });
at(187, 'FOREST', (c, lt, d, v, t) => { c.tod = 'dusk'; base(c, v); carCrashed(); c.lightsOn = false; c.village = true; c.fogFar = 260; c.snow = 0.2; c.overlay = v > S(188) - 0.1 ? 'share' : null;
  return cam(lt, d, Wl(10, 8, 14), Wl(16, 14, 20), Wl(0, 0, 0), null, 42, 46); });
// ENDING
at(189, 'FOREST', (c, lt, d, v, t) => { c.tod = 'dusk'; base(c, v); carCrashed(); c.lightsOn = false; c.engineOn = false; c.fire = 0.5; c.smoke = 0.4; c.snow = 0.2;
  reset(C.sardor, FOREST, F().x + 1.5, F().z + 2.4, Math.PI + 0.3, { armUp: [0.6, 0.6], armOut: [0.5, 0.5] }); reset(C.bekzod, FOREST, F().x + 2.6, F().z + 1.5, -2.4, { armUp: [0.6, 0.6], armOut: [0.5, 0.5] }); reset(C.otabek, FOREST, F().x + 0.2, F().z + 1.6, 2.4, { armUp: [0.6, 0.6], armOut: [0.5, 0.5] });
  return cam(lt, d, F().clone().add(V3(5, 2, 6)), F().clone().add(V3(4, 2.2, 5)), F().clone().add(V3(1, 1, 1)), null, 40, 38); });
at(191, 'FOREST', (c, lt, d, v, t) => { c.tod = 'dusk'; base(c, v); carCrashed(); c.lightsOn = false; c.engineOn = false; c.fire = 0.5; c.smoke = 0.4; c.snow = 0.2;
  reset(C.sardor, FOREST, F().x + 1.5, F().z + 2.4, Math.PI + 0.3, { armUp: [0.6, 0.6], armOut: [0.5, 0.5], headYaw: 0.3, brow: 0.5 });
  return cam(lt, d, F().clone().add(V3(1.4, 1.45, 0.4)), F().clone().add(V3(1.4, 1.45, 0.7)), F().clone().add(V3(1.5, 1.3, 2.4)), null, 36, 32); });
at(192, 'FOREST', (c, lt, d, v, t) => { night(c); base(c, v); carCrashed(); c.lightsOn = false; c.engineOn = false; c.snow = 0.5; c.overlay = 'q';
  return cam(lt, d, Wl(6, 3, 8), Wl(16, 16, 24), Wl(0, 0.5, 0), null, 40, 48, x => x); });
shot(VEND + 0.2, 'FOREST', (c, lt, d, v, t) => { night(c); c.bury = 0.72; c.carSnow = 0.94; c.carPitch = 0.1; carCrashed(); c.snow = 0.5; c.overlay = 'end'; return { pos: Wl(16, 16, 24), look: Wl(0, 0.5, 0), fov: 48 }; });
// thumbnail (not reached)
shot(900, 'FOREST', (c, lt, d, v, t) => { night(c); c.bury = 0.55; c.carSnow = 0.8; c.carPitch = 0.1; carCrashed(); c.lightsOn = true; c.engineOn = true; c.snow = 1; c.cabLight = true;
  const camP = Wl(-7.5, 1.3, 9.5);
  WOLVES.forEach((w, i) => { w.visible = true; const p = Wl(-1.2 + (i - 1) * 1.9, 0, 8.5 + (i % 2) * 1.6); w.position.copy(p); w.rotation.y = Math.atan2(camP.x - p.x, camP.z - p.z) + (i - 1) * 0.15; w.userData.set(3, 0); });
  return { pos: camP, look: Wl(-0.2, 0.8, 4.5), fov: 44 }; });
SH.sort((a, b) => a.t0 - b.t0);

// ---------------------------------------------------------------- overlay
const ov = document.createElement('canvas'); ov.width = 1920; ov.height = 1080; const oc = ov.getContext('2d');
function txt(s, x, y, size, col = '#fff', align = 'center', alpha = 1, stroke = 0) {
  oc.save(); oc.globalAlpha = clamp(alpha); oc.font = `${size}px ${FONT}`; oc.textAlign = align; oc.textBaseline = 'middle';
  if (stroke) { oc.lineWidth = stroke; oc.strokeStyle = '#0a0a12'; oc.lineJoin = 'round'; oc.strokeText(s, x, y); }
  oc.fillStyle = col; oc.fillText(s, x, y); oc.restore();
}
function rrect(x, y, w, h, r, fill, alpha = 1, line = 0) { oc.save(); oc.globalAlpha = clamp(alpha); oc.beginPath(); oc.roundRect(x, y, w, h, r); oc.fillStyle = fill; oc.fill(); if (line) { oc.lineWidth = line; oc.strokeStyle = '#0a0a12'; oc.stroke(); } oc.restore(); }
const bk = (x, s = 1.8) => back(x, s);
function meter(x, label, f, col, icon) {
  const y0 = 170, y1 = 520; rrect(x - 32, y0 - 10, 64, y1 - y0 + 20, 30, 'rgba(14,18,30,0.85)', 1, 4);
  rrect(x - 20, y1 - (y1 - y0) * f, 40, (y1 - y0) * f + 0.01, 18, f > 0.15 ? col : '#e8463a');
  txt(icon, x, y0 - 45, 40); txt(label, x, y1 + 42, 24, '#fff', 'center', 1, 6); txt(Math.round(f * 100) + '%', x, y1 + 76, 28, '#fff', 'center', 1, 6);
}
function hud(v) {
  let cur = null; for (const dd of DAYS) if (v >= S(dd[0]) - 0.4) cur = dd;
  if (!cur || v > S(179) - 0.2) return;
  const lt = v - (S(cur[0]) - 0.4);
  if (lt < 1.3) { const a = 1 - clamp((lt - 1.0) / 0.3); rrect(0, 0, 1920, 1080, 0, 'rgba(6,10,20,0.55)', a); const q = bk(clamp(lt / 0.3), 2.2); txt(cur[1], 960, 520, Math.max(1, 230 * q), '#ffffff', 'center', a, 16); return; }
  const q = bk(clamp((lt - 1.3) / 0.3)); if (q <= 0) return;
  oc.font = `50px ${FONT}`; const tw = oc.measureText(cur[1]).width;
  rrect(40, 36, (tw + 70) * q, 84, 42, '#2a6ad8', 1, 5); if (q > 0.8) txt(cur[1], 75, 80, 50, '#fff', 'left');
  rrect(40, 135, 230 * q, 64, 32, 'rgba(14,18,30,0.85)', 1, 4); if (q > 0.8) txt((v < S(110) ? '-27' : '-31') + '°C ❄', 155, 168, 38, '#9ad0ff');
  meter(1850, 'BENZIN', fuelAt(v), '#f2c94c', '⛽'); meter(1730, 'ZARYAD', battAt(v), '#5ae86a', '🔋');
}
function captions(v) {
  let cur = null; for (const s of SENT) if (s.start - 0.05 <= v && v <= s.end + 0.25) cur = s; if (!cur) return;
  const words = cur.text.replace(/"/g, '').split(' '); const a = cur.start, b = cur.end;
  const tot = words.reduce((x, w) => x + w.length + 1, 0); let acc = 0; const st = words.map(w => { const r = a + (b - a) * acc / tot; acc += w.length + 1; return r; });
  oc.font = `50px ${FONT}`; const lines = []; let ln = [];
  for (let i = 0; i < words.length; i++) { const tryL = [...ln, i].map(j => words[j]).join(' '); if (ln.length && oc.measureText(tryL).width > 1400) { lines.push(ln); ln = [i]; } else ln.push(i); }
  lines.push(ln); const y0 = 990 - (lines.length - 1) * 64;
  lines.forEach((L, li) => { const ws = L.map(i => oc.measureText(words[i] + ' ').width); let x = 960 - ws.reduce((p, q) => p + q, 0) / 2;
    L.forEach((i, k) => { const act = st[i] <= v && v < (i + 1 < words.length ? st[i + 1] : b + 0.25); txt(words[i], x, y0 + li * 64, 50, act ? '#ffd628' : '#ffffff', 'left', 1, 9); x += ws[k]; }); });
}
function card(lt, title, sub, col = '#2a6ad8', y = 200) { const q = bk(clamp(lt / 0.35)); rrect(960 - 520 * q, y - 70, 1040 * q, sub ? 170 : 120, 30, 'rgba(10,14,26,0.86)', 1, 5); rrect(960 - 520 * q, y - 70, 18, sub ? 170 : 120, 9, col, q); if (q > 0.85) { txt(title, 960, y - 12 + (sub ? 0 : 0), 54, '#fff'); if (sub) txt(sub, 960, y + 56, 34, '#ffd628'); } }
const RULES = [[181, '1', "MASHINADAN UZOQQA KETMANG", '🚗'], [183, '2', 'TUTUN QUVURINI TOZALANG', '💨'], [184, '3', 'MOTOR: SOATIGA 15 DAQIQA + OYNA', '⏱'], [185, '4', 'QORNI YEMANG — ERITIB ICHING', '💧'], [186, '5', 'SMS YUBORING, BALAND JOY TOPING', '📶']];
function drawOverlay(c, v, lt) {
  oc.clearRect(0, 0, 1920, 1080); oc.drawImage(renderer.domElement, 0, 0);
  const o = c.overlay;
  if (o === 'title') { const T0 = v + PRE; const a = clamp(T0 / 0.5) * (1 - clamp((T0 - 3.4) / 0.5)); const q = bk(clamp(T0 / 0.45));
    txt('7 KUN', 960, 420, 230 * q + 1, '#ffffff', 'center', a, 18); txt('QOR ICHIDA', 960, 590, 130 * q + 1, '#9ad8ff', 'center', a, 14); txt('−30°C  ❄  o\'rmonda qolib ketdik', 960, 700, 44, '#fff', 'center', a * clamp((T0 - 0.8) / 0.5), 8); }
  if (o === 'temp30') card(lt, '−30°C', null, '#3aa0ff', 160);
  if (o === 'clock15') card(lt, '⏱  HAR SOATDA 15 DAQIQA', 'motor → isinish → o\'chirish', '#f2c94c');
  if (o === 'food') card(lt, '🍞 2   🍫 3   🫖 1   🥜 1', 'uch kishiga...', '#f2c94c');
  if (o === 'rule2') card(lt, '✅  OYNA SAL OCHIQ + QUVUR TOZA', 'is gazi — rangsiz va hidsiz!', '#5ae86a');
  if (o === 'tip_snow') card(lt, '❌  QORNI YEMANG', 'tana issiqligini o\'g\'irlaydi', '#e8463a');
  if (o === 'tip_warm') card(lt, '❌  ISSIQ SUVGA SOLMANG', 'faqat tana issiqligi bilan', '#e8463a');
  if (o === 'h1') card(lt, '⏳  1 SOAT', null, '#2a6ad8', 160);
  if (o === 'h2') card(lt, '⏳  2 SOAT', null, '#2a6ad8', 160);
  if (o === 'ask') { const q = bk(clamp(lt / 0.4)); txt('🐺  SIZ NIMA QILARDINGIZ?', 960, 360, 92 * q + 1, '#ffd628', 'center', q, 12); if (v > S(80) - 0.2) { const q2 = bk(clamp((v - S(80) + 0.2) / 0.4)); txt('💬  IZOHDA YOZING!', 960, 500, 70 * q2 + 1, '#fff', 'center', q2, 10); } }
  if (o === 'rules') { const q = bk(clamp((v - S(179)) / 0.4)); txt('QISHDA YO\'LDA QOLSANGIZ:', 960, 90, 64 * q + 1, '#ffd628', 'center', q, 10); txt('5 TA QOIDA', 960, 170, 52 * q + 1, '#fff', 'center', q, 8);
    RULES.forEach(([si, n, tx, ic], i) => { if (v < S(si) - 0.15) return; const k = bk(clamp((v - S(si) + 0.15) / 0.35)); const y = 260 + i * 100; rrect(480 - 400 * (1 - k), y - 40, 960, 80, 40, 'rgba(10,14,26,0.86)', k, 4); txt(n, 530, y, 46, '#ffd628', 'center', k); txt(ic + '  ' + tx, 580, y, 40, '#fff', 'left', k); }); }
  if (o === 'share') { const q = bk(clamp(lt / 0.4)); txt('📲  YAQINLARINGIZGA YUBORING', 960, 300, 84 * q + 1, '#fff', 'center', q, 12); }
  if (o === 'q') { const a = clamp(lt / 0.6); rrect(0, 0, 1920, 1080, 0, '#000', a * 0.5); txt('SIZ NECHA KUN', 960, 380, 110, '#ffffff', 'center', a, 12); txt('CHIDAGAN BO\'LARDINGIZ?', 960, 510, 100, '#9ad8ff', 'center', clamp((lt - 0.4) / 0.6), 12); }
  if (o === 'end') { rrect(0, 0, 1920, 1080, 0, '#000', clamp(lt / 0.6) * 0.75);
    txt('IZOHLARDA YOZING', 960, 440, 110, '#ffffff', 'center', clamp((lt - 0.3) / 0.5), 12);
    txt('Birinchi bo\'lib nima qilgan bo\'lardingiz?', 960, 570, 56, '#ffd628', 'center', clamp((lt - 0.8) / 0.5), 8);
    rrect(760, 650, 400, 90, 45, '#e8302a', clamp((lt - 1.3) / 0.5), 5); txt("OBUNA BO'LING", 960, 696, 44, '#fff', 'center', clamp((lt - 1.3) / 0.5)); }
  if (c.dark) rrect(0, 0, 1920, 1080, 0, '#000', c.dark);
  if (!location.search.includes('clean') && v > -0.2) { hud(v); if (o !== 'end') captions(v); }
}

// ---------------------------------------------------------------- frame
const camera = new THREE.PerspectiveCamera(38, 16 / 9, 0.05, 700);
window.renderFrame = (fi) => {
  const t = fi / 30, v = t - PRE;
  let cur = SH[0], idx = 0; for (let i = 0; i < SH.length; i++) if (v >= SH[i].t0) { cur = SH[i]; idx = i; }
  const nxt = SH[idx + 1] ? SH[idx + 1].t0 : DUR; const lt = v - cur.t0, d = Math.min(nxt, DUR) - cur.t0;
  for (const p of ALL) p.visible = false; for (const w of WOLVES) { w.visible = false; w.userData.head.position.y = 1.0; } for (const s of SLEDS) s.visible = false;
  const c = { tod: 'night' };
  showSet(cur.set);
  const cm = cur.fn(c, lt, d, v, t);
  setEnv(c);
  for (const s of Object.values(SETS)) if (s.g.visible) s.update(t, c);
  for (const w of WOLVES) for (const ch of w.children) ch.visible = !c.wolfEyesOnly || ch === w.userData.head;
  if (c.wolfEyesOnly) for (const w of WOLVES) w.userData.head.children.forEach(ch => { ch.visible = w.userData.eyes.includes(ch); });
  else for (const w of WOLVES) w.userData.head.children.forEach(ch => { ch.visible = true; });
  for (const p of ALL) if (p.visible) p.userData.apply(t);
  const off = OFF[cur.set], sh = 0.008 + (c.shake || 0) * 0.04;
  const f = 1 + (c.shake || 0) * 6;
  camera.position.set(cm.pos.x + off + noise1(t * 0.9 * f) * sh, cm.pos.y + noise1(t * 1.1 * f + 3) * sh, cm.pos.z + noise1(t * 0.7 * f + 7) * sh);
  camera.fov = cm.fov; camera.updateProjectionMatrix(); camera.lookAt(cm.look.x + off, cm.look.y, cm.look.z);
  aimMoon(cm.look.x + off, cm.look.z);
  const outdoor = cur.set !== 'CAR';
  snowfall(t, camera.position.x, camera.position.y, camera.position.z, outdoor ? (c.snow ?? 0.6) : 0, c.wind ?? 1);
  if (cur.set === 'CAR') { scene.fog.near = 50; scene.fog.far = 200; }
  post.time = t; post.vig = 0.45; post.grain = 0.035; post.bloom = 0.6; post.freeze = 0; post.glitch = 0; post.red = 0; post.flash = c.flashW || 0;
  post.sat = c.haze ? 1 - c.haze * 0.6 : 1.0;
  post.tint.set(c.tod === 'night' ? 0xd6e0ff : c.tod === 'dusk' ? 0xf0e6ff : 0xf4f8ff); if (c.haze) post.tint.lerp(new THREE.Color(0xc8c8b8), c.haze * 0.6);
  post.fade = Math.max(idx > 0 && lt < 0.08 ? (1 - lt / 0.08) * 0.45 : 0, v < -PRE + 0.4 ? 1 - (v + PRE) / 0.4 : 0, (v > DUR - PRE - 0.8 && v < 800) ? clamp((v - (DUR - PRE - 0.8)) / 0.8) : 0);
  renderComposite(scene, camera);
  drawOverlay(c, v, lt);
  return ov.toDataURL('image/jpeg', 0.92);
};
window.TL = TL; window.DUR = DUR; window.PRE = PRE;
window.ready = true;
