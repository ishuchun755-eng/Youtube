// Doni Story ep1 sets: STUDIO (x=0), STEPPE road (x=1000, road along z), INFO stage (x=-300)
import { THREE, M, rbox, box, cyl, sph, cone, tor, at, G, tex, retex, rig, rnd, clamp, lerp, setColor, setOpacity, look } from './comic.js';
export const scene = new THREE.Scene();
export const L = rig(scene, { sunPos: [-6, 12, 9], shadowSize: 12 });
export const OFF = { studio: [0, 0, 0], steppe: [1000, 0, 0], info: [-300, 0, 0] };
const SNOW = '#f3f7fb', ASPH = '#5b5f66';
// moving shadow camera to follow the action
export function aimSun(x, y, z, size = 12, dir = [-6, 12, 9]) { const s = L.sun; s.target.position.set(x, y, z); s.position.set(x + dir[0], y + dir[1], z + dir[2]);
  const c = s.shadow.camera; c.left = c.bottom = -size; c.right = c.top = size; c.updateProjectionMatrix(); }

// ---------- generic textures ----------
const planks = tex(512, 512, (g, w, h) => { for (let i = 0; i < 8; i++) { const k = rnd() * 16; g.fillStyle = `rgb(${196 + k},${142 + k},${96 + k * .5})`; g.fillRect(i * 64, 0, 64, h);
  g.strokeStyle = 'rgba(80,50,30,.75)'; g.lineWidth = 3; g.beginPath(); g.moveTo(i * 64, 0); g.lineTo(i * 64, h); g.stroke(); const j = rnd() * h; g.beginPath(); g.moveTo(i * 64, j); g.lineTo(i * 64 + 64, j); g.stroke();
  g.strokeStyle = 'rgba(110,70,40,.22)'; g.lineWidth = 1.4; for (let q = 0; q < 4; q++) { const xx = i * 64 + 10 + q * 12; g.beginPath(); g.moveTo(xx, 0); g.bezierCurveTo(xx + 6, h / 3, xx - 6, h * 2 / 3, xx, h); g.stroke(); } } }, [3, 3]);
const wallTex = tex(256, 256, (g, w, h) => { g.fillStyle = '#efe2c8'; g.fillRect(0, 0, w, h); g.strokeStyle = 'rgba(160,120,80,.16)'; g.lineWidth = 6; for (let x = 0; x < w; x += 32) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, h); g.stroke(); } }, [6, 2]);
const roadTex = tex(128, 512, (g, w, h) => { g.fillStyle = ASPH; g.fillRect(0, 0, w, h); for (let i = 0; i < 900; i++) { g.fillStyle = `rgba(${rnd() < .5 ? 40 : 120},${rnd() < .5 ? 40 : 120},${rnd() < .5 ? 50 : 130},.25)`; g.fillRect(rnd() * w, rnd() * h, 2, 2); }
  g.fillStyle = '#f2f2f0'; g.fillRect(w / 2 - 3, 0, 6, h * .5); g.fillRect(4, 0, 5, h); g.fillRect(w - 9, 0, 5, h); }, [1, 60]);

// ================= STUDIO =================
const ST = G(scene, ...OFF.studio);
at(M(new THREE.PlaneGeometry(14, 10).rotateX(-Math.PI / 2), '#ffffff', { map: planks, noEdge: true }), 0, 0, 0, ST);
at(box(14, 6, .3, '#ffffff', { map: wallTex }), 0, 3, -3.2, ST);
at(box(.3, 6, 8, '#e8d6b6'), -6, 3, 0.6, ST);
at(box(14, .25, .12, '#c9a77c'), 0, .12, -3.0, ST); // skirting
// neon-ish sign
const signTex = tex(1024, 300, (g, w, h) => { g.fillStyle = '#1f2a3a'; g.fillRect(0, 0, w, h); g.font = '900 150px InterX'; g.textBaseline = 'middle'; g.fillStyle = '#ffffff'; g.fillText('Doni', 70, h / 2 + 6); g.fillStyle = '#43b8e3'; g.fillText('Story', 470, h / 2 + 6);
  g.strokeStyle = '#43b8e3'; g.lineWidth = 10; g.strokeRect(14, 14, w - 28, h - 28); });
const sign = at(rbox(3.3, 1.05, .1, .05, '#1f2a3a'), 0, 3.55, -3.0, ST); at(M(new THREE.PlaneGeometry(3.2, .95), '#ffffff', { map: signTex, noEdge: true, cast: false, glow: true, glowK: 1.15 }), 0, 3.55, -2.94, ST);
// window with snow outside
const winTex = tex(512, 512, (g, w, h) => { const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, '#9fb7cf'); gr.addColorStop(1, '#dfe8f0'); g.fillStyle = gr; g.fillRect(0, 0, w, h);
  g.fillStyle = '#ffffff'; g.fillRect(0, h * .72, w, h); g.fillStyle = '#7b8a9a'; for (let i = 0; i < 6; i++) { const x = 40 + i * 85; g.fillRect(x, h * .45, 30, h * .27); g.fillRect(x - 12, h * .45, 54, 8); }
  for (let i = 0; i < 180; i++) { g.fillStyle = 'rgba(255,255,255,.9)'; g.beginPath(); g.arc(rnd() * w, rnd() * h, 2 + rnd() * 3, 0, 7); g.fill(); } });
const win = G(ST, -3.7, 2.6, -3.04); at(M(new THREE.PlaneGeometry(2, 1.7), '#ffffff', { map: winTex, noEdge: true, cast: false }), 0, 0, 0, win);
for (const [w, h, x, y] of [[2.2, .12, 0, .9], [2.2, .16, 0, -.9], [.12, 1.9, -1.05, 0], [.12, 1.9, 1.05, 0], [.07, 1.7, 0, 0], [2, .07, 0, 0]]) at(rbox(w, h, .14, .02, '#f7f4ee'), x, y, .04, win);
// shelf + props
const shelf = G(ST, 3.6, 0, -2.75);
at(rbox(1.6, .08, .45, .02, '#8d6a50'), 0, 1.2, 0, shelf); at(rbox(1.6, .08, .45, .02, '#8d6a50'), 0, 2.1, 0, shelf);
for (const x of [-.78, .78]) at(rbox(.06, 2.2, .45, .02, '#7a5a44'), x, 1.1, 0, shelf);
const bookC = ['#c0453a', '#3f6d8f', '#e3a64a', '#5f8f6a', '#7b5ca8', '#d9d2c3'];
for (let i = 0; i < 9; i++) at(rbox(.1, .32 + (i % 3) * .05, .3, .01, bookC[i % 6]), -.6 + i * .12, 1.42 + (i % 3) * .025, 0, shelf);
const globe = G(shelf, .35, 2.14, 0); at(cyl(.08, .1, .05, '#3a3434', 12), 0, .03, 0, globe); at(sph(.17, '#4f8fc0'), 0, .27, 0, globe);
at(sph(.09, '#6aa36a'), .06, .32, .1, globe).scale.set(1.2, .8, .6);
at(cyl(.12, .09, .22, '#c66b3d', 14), -.4, 2.25, 0, shelf); for (let i = 0; i < 7; i++) { const lf = cone(.05, .35, '#4d8a55', 6); lf.rotation.set((rnd() - .5) * .9, 0, (rnd() - .5) * .9); at(lf, -.4 + (rnd() - .5) * .12, 2.5, (rnd() - .5) * .1, shelf); }
// big plant + floor lamp + desk-stool
const pot = G(ST, -5.0, 0, -2.2); at(cyl(.32, .25, .6, '#e9e2d6', 18), 0, .3, 0, pot);
for (let i = 0; i < 9; i++) { const l = M(new THREE.SphereGeometry(.28, 12, 8), '#3f8a5a'); l.scale.set(.5, 1.3, .2); l.rotation.set((rnd() - .5) * 1.2, rnd() * 6, (rnd() - .5) * 1.2); at(l, (rnd() - .5) * .4, 1.0 + rnd() * .6, (rnd() - .5) * .4, pot); }
const lamp = G(ST, 5.2, 0, -1.6); at(cyl(.22, .26, .05, '#2f2a2b', 16), 0, .03, 0, lamp); at(cyl(.025, .025, 1.9, '#2f2a2b', 8), 0, .98, 0, lamp);
at(cyl(.2, .36, .4, '#f1d48a', 20), 0, 2.0, 0, lamp);
// wall TV for maps/graphics
export const tvTex = tex(1280, 720, (g, w, h) => { g.fillStyle = '#16202d'; g.fillRect(0, 0, w, h); });
const tv = G(ST, 3.6, 3.0, -3.0); at(rbox(2.3, 1.35, .08, .03, '#1d1d22'), 0, 0, 0, tv);
export const tvScreen = at(M(new THREE.PlaneGeometry(2.16, 1.22), '#ffffff', { map: tvTex, noEdge: true, cast: false, glow: true, glowK: 1.2 }), 0, 0, .045, tv);
tv.visible = false; export const studioTV = tv;
// rug under Doni
const rugTex = tex(512, 340, (g, w, h) => { g.fillStyle = '#9d2b2b'; g.fillRect(0, 0, w, h); g.fillStyle = '#1f3d6b'; g.fillRect(22, 22, w - 44, h - 44); g.fillStyle = '#b8352f'; g.fillRect(48, 48, w - 96, h - 96);
  for (let k = 5; k > 0; k--) { g.fillStyle = ['#e6b450', '#1f3d6b', '#f0e2c0', '#7a1f22', '#e6b450'][k - 1]; g.beginPath(); g.moveTo(w / 2 - k * 30, h / 2); g.lineTo(w / 2, h / 2 - k * 20); g.lineTo(w / 2 + k * 30, h / 2); g.lineTo(w / 2, h / 2 + k * 20); g.fill(); }
  g.fillStyle = '#e6b450'; for (let i = 0; i < 22; i++) { g.fillRect(30 + i * 21, 30, 8, 8); g.fillRect(30 + i * 21, h - 38, 8, 8); } });
at(M(new THREE.PlaneGeometry(3.4, 2.2).rotateX(-Math.PI / 2), '#ffffff', { map: rugTex, noEdge: true, cast: false }), 0, .01, .2, ST);

// ================= CAR =================
export function makeCar(o = {}) {
  const car = new THREE.Group(); const body = o.color || '#e6ebef', dark = '#2b3038', glassC = '#8fb1cc';
  const P = car.userData.P = {};
  const hull = G(car); P.hull = hull;
  at(rbox(1.78, .62, 1.25, .16, body), 0, .64, 1.58, hull);            // hood block
  at(rbox(1.78, .62, .95, .16, body), 0, .64, -1.73, hull);            // trunk block
  P.right = []; for (const s of [1, -1]) { const d = at(rbox(.08, .62, 2.3, .03, body), s * .85, .64, -.12, hull); if (s < 0) P.right.push(d); } // doors
  at(box(1.66, .06, 2.3, '#3b3f47'), 0, .36, -.12, hull);              // floor
  at(rbox(1.84, .2, .3, .08, '#c9cfd5'), 0, .42, 2.22, hull); at(rbox(1.84, .2, .3, .08, '#c9cfd5'), 0, .42, -2.2, hull); // bumpers
  for (const s of [1, -1]) { const dl = at(box(.02, .03, 2.0, '#9aa3ad', { cast: false }), s * .892, .62, -.12, hull); if (s < 0) P.right.push(dl); } // door line
  for (const s of [1, -1]) for (const z of [.5, -.62]) { const hd = at(rbox(.04, .05, .18, .02, '#9aa3ad', { cast: false }), s * .9, .82, z, hull); if (s < 0) P.right.push(hd); } // handles
  // cabin
  const roofY = 1.45; at(rbox(1.56, .07, 1.2, .03, body), 0, roofY, -.22, hull); P.roof = hull.children[hull.children.length - 1];
  const glassM = { opacity: .35, noEdge: true, cast: false, side: THREE.DoubleSide };
  const ws = at(M(new THREE.PlaneGeometry(1.5, .82), glassC, glassM), 0, 1.2, .67, hull); ws.rotation.x = -.93; P.windshield = ws;
  const rw = at(M(new THREE.PlaneGeometry(1.5, .72), glassC, glassM), 0, 1.2, -1.07, hull); rw.rotation.x = .87;
  for (const s of [1, -1]) { const sw = at(M(new THREE.PlaneGeometry(2.0, .44), glassC, glassM), s * .83, 1.18, -.2, hull); sw.rotation.y = Math.PI / 2; if (s < 0) P.right.push(sw); }
  for (const s of [1, -1]) { // pillars
    const a = at(rbox(.07, .9, .07, .02, body), s * .78, 1.2, .67, hull); a.rotation.x = -.93;
    const c2 = at(rbox(.07, .8, .07, .02, body), s * .78, 1.2, -1.07, hull); c2.rotation.x = .87;
    const bp = at(rbox(.07, .5, .1, .02, body), s * .8, 1.2, -.22, hull);
    const bl = at(rbox(.06, .06, 2.1, .02, body), s * .8, .96, -.2, hull); if (s < 0) P.right.push(bp, bl); }
  // wheels
  P.wheels = [];
  for (const s of [1, -1]) for (const z of [1.35, -1.35]) { const w = G(hull, s * .8, .33, z); const t = cyl(.33, .33, .26, '#1f2126', 24); t.rotation.z = Math.PI / 2; w.add(t);
    const hub = cyl(.19, .19, .27, '#aeb6bf', 16); hub.rotation.z = Math.PI / 2; w.add(hub); for (let i = 0; i < 5; i++) { const sp = box(.28, .03, .03, '#7c858f', { cast: false }); sp.position.x = s * .14; sp.rotation.x = i * 1.256; w.add(sp); } P.wheels.push(w); }
  // lights
  P.head = []; P.tail = []; P.hazard = [];
  for (const s of [1, -1]) { P.head.push(at(rbox(.36, .14, .05, .03, '#fff6d8', { glow: true }), s * .58, .74, 2.21, hull));
    P.tail.push(at(rbox(.3, .14, .05, .03, '#d8342c', { glow: true }), s * .62, .74, -2.2, hull));
    P.hazard.push(at(rbox(.12, .08, .05, .02, '#ff9a1f', { glow: true }), s * .82, .62, 2.2, hull), at(rbox(.1, .08, .05, .02, '#ff9a1f', { glow: true }), s * .86, .74, -2.19, hull)); }
  at(rbox(.6, .2, .04, .02, '#f4f4f0', { cast: false }), 0, .48, 2.38, hull); // plate
  // headlight beams (soft cones, flat only)
  P.beams = [];
  for (const s of [1, -1]) { const b = M(new THREE.ConeGeometry(1.6, 9, 20, 1, true), '#fff4c8', { opacity: .16, noEdge: true, cast: false, recv: false, glow: true, glowK: 1.5, side: THREE.DoubleSide });
    b.rotation.x = -Math.PI / 2 + .06; b.position.set(s * .58, .7, 2.2 + 4.5); hull.add(b); b.visible = false; P.beams.push(b); }
  // exhaust, antenna, scarf
  P.pipe = at(cyl(.045, .045, .3, '#4a4d52', 10), -.5, .24, -2.3, hull); P.pipe.rotation.x = Math.PI / 2;
  P.antenna = at(cyl(.008, .012, .55, '#222', 6), .3, roofY + .27, -.7, hull);
  const scarf = P.scarf = G(hull, .3, roofY + .48, -.7); scarf.visible = false;
  for (let i = 0; i < 6; i++) { const seg = at(box(.05, .1, .14, '#e0402c', { cast: false }), 0, -i * .015, -.07 - i * .13, scarf); seg.userData.i = i; }
  // interior
  const I = G(car); P.int = I;
  at(rbox(1.62, .32, .42, .06, '#2d3036'), 0, .98, .86, I);            // dashboard
  const wheel = G(I, .4, 1.06, .56); wheel.rotation.x = -.45; at(tor(.18, .025, '#1f2126'), 0, 0, 0, wheel); at(cyl(.05, .05, .06, '#1f2126', 12), 0, 0, 0, wheel).rotation.x = Math.PI / 2;
  at(box(.34, .03, .03, '#1f2126'), 0, 0, 0, wheel); P.steer = wheel;
  const gaugeTex = car.userData.gaugeTex = tex(256, 128, (g, w, h) => {});
  P.gauge = at(M(new THREE.PlaneGeometry(.36, .16), '#ffffff', { map: gaugeTex, noEdge: true, cast: false, glow: true, glowK: 1.1 }), .4, 1.1, .68, I); P.gauge.rotation.x = -.5;
  for (const s of [1, -1]) { at(rbox(.55, .14, .55, .05, '#3c4048'), s * .4, .58, -.05, I); const bk = at(rbox(.55, .7, .14, .06, '#3c4048'), s * .4, .95, -.36, I); bk.rotation.x = -.14;
    at(rbox(.3, .18, .1, .04, '#3c4048'), s * .4, 1.36, -.42, I); }
  at(rbox(1.5, .14, .55, .05, '#3c4048'), 0, .58, -1.0, I); at(rbox(1.5, .6, .14, .05, '#3c4048'), 0, .92, -1.3, I);
  // snow cover parts
  const sn = G(car); P.snow = sn;
  P.roofSnow = at(rbox(1.5, .16, 1.15, .07, SNOW), 0, roofY + .1, -.22, sn); P.hoodSnow = at(rbox(1.7, .12, 1.15, .06, SNOW), 0, .99, 1.6, sn); P.trunkSnow = at(rbox(1.7, .12, .85, .06, SNOW), 0, .99, -1.72, sn);
  P.mound = at(sph(1, SNOW, { cast: false }), 0, 0, 0, sn); P.mound.scale.set(1.5, .6, 2.9); P.mound.position.y = -.1;
  P.drift = at(sph(1, SNOW, { cast: false }), -1.1, 0, -.2, sn); P.drift.scale.set(.8, .5, 2.5);
  // snow pressed against windows (seen from inside)
  P.winSnow = [];
  const wsn = (w, h, x, y, z, rx, ry) => { const m = at(M(new THREE.PlaneGeometry(w, h), '#c3cfdd', { noEdge: true, cast: false, side: THREE.DoubleSide }), x, y, z, hull); m.rotation.set(rx, ry, 0); m.visible = false; P.winSnow.push(m); return m; };
  wsn(1.5, .82, 0, 1.21, .70, -.93, 0); wsn(1.5, .72, 0, 1.21, -1.10, .87, 0); for (const s2 of [1, -1]) wsn(2.0, .44, s2 * .86, 1.18, -.2, 0, Math.PI / 2);
  P.cabin = new THREE.PointLight('#ffe2b0', 0, 3.5, 1.2); P.cabin.position.set(0, 1.35, -.2); car.add(P.cabin);
  car.userData.set = (c = {}) => {
    P.cabin.intensity = (c.cabin || 0) * 4 * Math.PI;
    P.head.forEach(m => m.visible = c.lights !== false); P.beams.forEach(b => b.visible = !!c.beams);
    P.tail.forEach(m => m.visible = true);
    const hz = c.hazard ? (Math.floor((c.t || 0) * 2.4) % 2 === 0) : false; P.hazard.forEach(m => m.visible = hz);
    const sAmt = c.snow || 0; P.roofSnow.visible = sAmt > .05; P.roofSnow.scale.y = .4 + sAmt * 1.6; P.hoodSnow.visible = P.trunkSnow.visible = sAmt > .1; P.hoodSnow.scale.y = P.trunkSnow.scale.y = .4 + sAmt * 2;
    const bury = c.bury || 0; P.mound.visible = bury > .02 && !c.inside; P.mound.scale.set(1.35 + bury * .4, .2 + bury * 1.0, 2.6 + bury * .4); P.drift.visible = bury > .02 && !c.inside;
    P.winSnow.forEach((m, i) => { m.visible = !!c.inside && bury > .05; m.scale.y = clamp(bury * (i === 0 ? 1.1 : 1.6)); m.position.y = 1.21 - (1 - m.scale.y) * .3; }); P.drift.scale.set(.6 + bury * .5, .2 + bury * .9, 2.4);
    P.scarf.visible = !!c.scarf; if (c.scarf) P.scarf.children.forEach(seg => { const i = seg.userData.i; seg.position.x = Math.sin((c.t || 0) * 9 - i * .9) * .04 * i; seg.rotation.y = Math.sin((c.t || 0) * 9 - i * .9) * .3; });
    P.wheels.forEach(w => w.rotation.x = (c.spin || 0));
    P.int.visible = c.interior !== false; P.right.forEach(m => m.visible = !c.cut);
    const fuel = c.fuel ?? .5;
    retex(gaugeTex, (g, w, h) => { g.fillStyle = '#10151c'; g.fillRect(0, 0, w, h); g.strokeStyle = '#3a4656'; g.lineWidth = 4; g.strokeRect(2, 2, w - 4, h - 4);
      g.font = '700 22px InterB'; g.fillStyle = '#9fb3c8'; g.fillText('E', 20, 112); g.fillText('F', 222, 112);
      g.strokeStyle = '#2b3542'; g.lineWidth = 14; g.beginPath(); g.arc(128, 120, 90, Math.PI * 1.1, Math.PI * 1.9); g.stroke();
      g.strokeStyle = fuel < .2 ? '#ff5a3c' : '#ffb347'; g.beginPath(); g.arc(128, 120, 90, Math.PI * 1.1, Math.PI * (1.1 + .8 * fuel)); g.stroke();
      g.font = '900 26px InterX'; g.fillStyle = (c.temp ?? -40) < 0 ? '#7cc4ff' : '#ffb347'; g.fillText(`${c.temp ?? -40}°C`, 92, 64); });
  };
  car.userData.set({});
  return car;
}

// truck (fura)
export function makeTruck() {
  const t = new THREE.Group(); const red = '#c8492f';
  at(rbox(2.4, 2.4, 2.1, .25, red), 0, 1.75, 4.6, t); at(rbox(2.2, .8, .1, .06, '#7fa6c4', { opacity: .7, noEdge: true }), 0, 2.3, 5.66, t);
  at(rbox(2.5, .35, .3, .08, '#d9d9d9'), 0, .75, 5.7, t);
  for (const s of [1, -1]) { at(rbox(.4, .2, .05, .04, '#fff6d8', { glow: true }), s * .85, 1.1, 5.66, t); }
  at(rbox(2.55, 2.9, 9, .12, '#e8e9ec'), 0, 2.05, -1.2, t);
  for (const z of [-5.2, 3.0]) for (const s of [1, -1]) at(rbox(.04, 2.6, .12, .02, '#c8cbd0', { cast: false }), s * 1.28, 2.05, z, t);
  at(box(2.6, .25, 9, '#2f3238'), 0, .55, -1.2, t);
  const brake = []; for (const s of [1, -1]) brake.push(at(rbox(.35, .18, .05, .04, '#e0342c', { glow: true }), s * .95, .9, -5.72, t));
  for (const z of [4.4, -3.6, -4.9]) for (const s of [1, -1]) { const w = cyl(.5, .5, .4, '#1f2126', 22); w.rotation.z = Math.PI / 2; at(w, s * 1.05, .5, z, t); }
  t.userData.brake = brake; return t;
}

// ================= STEPPE =================
const SP = G(scene, ...OFF.steppe);
// ground with roadside ditch profile across x (road at x=0, ditch at x 4.5..9)
function ditchY(x) { const ax = Math.abs(x); if (ax < 4.2) return .0; if (ax < 6.5) return -ss2((ax - 4.2) / 2.3) * 1.1; if (ax < 9) return -1.1 + ss2((ax - 6.5) / 2.5) * 1.1; return Math.sin(x * .07) * .3 * clamp((ax - 9) / 20); }
function ss2(t) { t = clamp(t); return t * t * (3 - 2 * t); }
{ const g = new THREE.PlaneGeometry(400, 1600, 200, 40); g.rotateX(-Math.PI / 2); const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) p.setY(i, ditchY(p.getX(i)) - .02); g.computeVertexNormals();
  at(M(g, SNOW, { noEdge: true, cast: false }), 0, 0, 0, SP); }
const road = at(M(new THREE.PlaneGeometry(8, 1600).rotateX(-Math.PI / 2), '#ffffff', { map: roadTex, noEdge: true, cast: false }), 0, .01, 0, SP);
export const roadSnow = at(M(new THREE.PlaneGeometry(8.2, 1600).rotateX(-Math.PI / 2), SNOW, { noEdge: true, cast: false, opacity: 0 }), 0, .02, 0, SP);
// snow ridges along road edges
for (const s of [1, -1]) { const r = at(cyl(.35, .35, 1600, SNOW, 10, { cast: false }), s * 4.4, .0, 0, SP); r.rotation.x = Math.PI / 2; r.scale.set(1, 1, .5); }
// power poles + wires along road
const poles = [];
for (let z = -780; z <= 780; z += 45) { const p = G(SP, -11, 0, z); at(cyl(.12, .15, 8, '#6b5444', 8), 0, 4, 0, p); const cb = at(box(2.2, .14, .14, '#6b5444'), 0, 7.4, 0, p); for (const x of [-.9, .9]) at(cyl(.05, .05, .2, '#e8e8e8', 6), x, 7.55, 0, p); poles.push(p); }
for (const x of [-.9, .9]) { const w = at(cyl(.02, .02, 1560, '#2a2a2e', 4, { cast: false }), -11 + x, 7.4, 0, SP); w.rotation.x = Math.PI / 2; }
// road sign "КАРАГАНДА 210"
const signT = tex(512, 256, (g, w, h) => { g.fillStyle = '#1d6f4f'; g.fillRect(0, 0, w, h); g.strokeStyle = '#fff'; g.lineWidth = 10; g.strokeRect(12, 12, w - 24, h - 24);
  g.fillStyle = '#fff'; g.font = '900 64px InterX'; g.fillText('Қарағанды', 40, 110); g.font = '900 46px InterX'; g.fillText('Караганда', 40, 175); g.font = '900 80px InterX'; g.fillText('210', 360, 200); });
export const roadSign = G(SP, 5.5, 0, -40); at(cyl(.06, .06, 2.6, '#9aa3ad', 8), -.9, 1.3, 0, roadSign); at(cyl(.06, .06, 2.6, '#9aa3ad', 8), .9, 1.3, 0, roadSign);
at(rbox(2.5, 1.3, .06, .03, '#1d6f4f'), 0, 2.6, 0, roadSign); at(M(new THREE.PlaneGeometry(2.4, 1.2), '#ffffff', { map: signT, noEdge: true, cast: false }), 0, 2.6, .035, roadSign);
// km posts
for (let z = -600; z <= 600; z += 100) { const k = G(SP, 4.9, 0, z); at(rbox(.18, .9, .12, .03, '#f4f4f4'), 0, .45, 0, k); at(box(.19, .2, .13, '#1d1d1d', { cast: false }), 0, .75, 0, k); }
// Astana skyline cutout far away (seen behind in departure shot)
const sky = G(SP, 0, 0, 520);
const skyM = '#8ea2b8';
at(cyl(.9, 1.6, 60, skyM, 10, { cast: false }), 0, 30, 0, sky); at(sph(5, '#e4b649', { cast: false }), 0, 64, 0, sky); at(cyl(1.2, 1.2, 8, skyM, 10, { cast: false }), 0, 70, 0, sky); // Baiterek-like
for (let i = 0; i < 16; i++) { const h = 20 + rnd() * 50, x = (i - 8) * 14 + (rnd() - .5) * 6; if (Math.abs(x) < 8) continue; at(box(7 + rnd() * 5, h, 6, skyM, { cast: false }), x, h / 2, rnd() * 10, sky); }
at(cone(9, 26, skyM, 4, { cast: false }), 48, 13, 6, sky).rotation.y = .78; // pyramid-like
// cars on road
export const car = makeCar(); SP.add(car);
export const truck = makeTruck(); SP.add(truck);
// snowplow + rescue
export function makePlow() { const t = new THREE.Group(); const o = '#e8861f';
  at(rbox(2.3, 2.2, 2.2, .2, o), 0, 1.7, 1.2, t); at(rbox(2.1, .7, .1, .05, '#7fa6c4', { opacity: .7, noEdge: true }), 0, 2.2, 2.31, t);
  at(rbox(2.4, 1.5, 4.2, .15, '#d0d3d8'), 0, 1.4, -2.0, t); const blade = at(rbox(3.4, 1.0, .25, .1, '#f2c230'), 0, .6, 3.0, t); blade.rotation.y = .25;
  for (let i = 0; i < 6; i++) at(box(.4, .99, .26, i % 2 ? '#222' : '#f2c230', { cast: false }), -1.4 + i * .55, .6, 3.02, t).rotation.y = .25;
  for (const z of [1.2, -1.2, -2.8]) for (const s of [1, -1]) { const w = cyl(.5, .5, .4, '#1f2126', 20); w.rotation.z = Math.PI / 2; at(w, s * 1.05, .5, z, t); }
  const bc = t.userData.beacon = at(cyl(.15, .15, .2, '#ffa21f', 14, { glow: true }), 0, 2.95, 1.2, t);
  t.userData.headl = [-1, 1].map(s => at(rbox(.35, .18, .05, .04, '#fff6d8', { glow: true }), s * .8, 1.2, 2.31, t)); return t; }
export function makeRescue() { const t = new THREE.Group();
  at(rbox(1.9, 1.0, 4.6, .22, '#f2f2f2'), 0, .95, 0, t); at(rbox(1.8, .8, 2.6, .2, '#f2f2f2'), 0, 1.75, -.4, t);
  const stripe = tex(512, 64, (g, w, h) => { g.fillStyle = '#d6322b'; g.fillRect(0, 0, w, h); g.fillStyle = '#fff'; g.font = '900 46px InterX'; g.fillText('СПАСАТЕЛИ  112', 30, 48); });
  for (const s of [1, -1]) { const p = at(M(new THREE.PlaneGeometry(3.6, .38), '#ffffff', { map: stripe, noEdge: true, cast: false }), s * .955, 1.05, 0, t); p.rotation.y = s * Math.PI / 2; }
  at(rbox(1.7, .55, .1, .05, '#7fa6c4', { opacity: .7, noEdge: true }), 0, 1.75, .92, t);
  for (const z of [1.5, -1.5]) for (const s of [1, -1]) { const w = cyl(.38, .38, .3, '#1f2126', 20); w.rotation.z = Math.PI / 2; at(w, s * .9, .4, z, t); }
  t.userData.bar = [at(rbox(.35, .12, .25, .04, '#e0342c', { glow: true }), -.25, 2.22, .2, t), at(rbox(.35, .12, .25, .04, '#2f6fe0', { glow: true }), .25, 2.22, .2, t)];
  return t; }
export const plow = makePlow(); SP.add(plow); plow.visible = false;
export const rescue = makeRescue(); SP.add(rescue); rescue.visible = false;
// footprints trail (for "walk away" scene)
export const steps = G(SP); for (let i = 0; i < 16; i++) { const f = at(M(new THREE.CircleGeometry(.11, 10).rotateX(-Math.PI / 2), '#c9d6e4', { cast: false, noEdge: true }), (i % 2 ? .18 : -.18), 0, -i * .55, steps); f.scale.set(.8, 1, 1.4); } steps.visible = false;

// ================= weather =================
const SN = 7000; const flakeG = new THREE.BufferGeometry(); const fp = new Float32Array(SN * 6); const fseed = [];
for (let i = 0; i < SN; i++) fseed.push([rnd(), rnd(), rnd(), rnd()]);
flakeG.setAttribute('position', new THREE.BufferAttribute(fp, 3));
export const flakes = new THREE.LineSegments(flakeG, new THREE.LineBasicMaterial({ color: '#ffffff', transparent: true, opacity: .9, fog: false })); scene.add(flakes); flakes.frustumCulled = false;
// wind: 0 calm falling snow, 1 horizontal blizzard; amt 0..1 number of flakes
export function weather(t, cx, cy, cz, amt, wind, R = 18) {
  flakes.visible = amt > 0; if (!amt) return; const n = Math.floor(SN * amt); flakeG.setDrawRange(0, n * 2);
  const vx = 2 + wind * 26, vy = 1.0 + (1 - wind) * .6, len = .05 + wind * .55;
  for (let i = 0; i < SN; i++) { const [a, b, c, d] = fseed[i]; const sp = .7 + d * .6;
    let x = ((a * 2 * R + t * vx * sp) % (2 * R)) - R, y = ((b * 14 - t * vy * sp) % 14 + 14) % 14 - 2, z = (c * 2 - 1) * R;
    x += Math.sin(t * 2 + d * 30) * .3; const o = i * 6;
    fp[o] = cx + x; fp[o + 1] = cy + y; fp[o + 2] = cz + z; fp[o + 3] = cx + x - len * (vx / 26 + .1); fp[o + 4] = cy + y + len * .25 + .03; fp[o + 5] = cz + z; }
  flakeG.attributes.position.needsUpdate = true;
}
// ground drift streaks (pozemka): low-flying flakes near ground
const DN = 2500; const dG = new THREE.BufferGeometry(); const dp = new Float32Array(DN * 6); const dseed = []; for (let i = 0; i < DN; i++) dseed.push([rnd(), rnd(), rnd(), rnd()]);
dG.setAttribute('position', new THREE.BufferAttribute(dp, 3));
export const drift = new THREE.LineSegments(dG, new THREE.LineBasicMaterial({ color: '#ffffff', transparent: true, opacity: .75, fog: false })); scene.add(drift); drift.frustumCulled = false;
export function pozemka(t, cx, cz, amt, height = .4, R = 16) {
  drift.visible = amt > 0; if (!amt) return; dG.setDrawRange(0, Math.floor(DN * amt) * 2);
  for (let i = 0; i < DN; i++) { const [a, b, c, d] = dseed[i]; const x = ((a * 2 * R + t * (9 + d * 6)) % (2 * R)) - R, z = (c * 2 - 1) * R, y = .02 + b * b * height + Math.sin(t * 5 + d * 40) * .03; const o = i * 6;
    dp[o] = cx + x; dp[o + 1] = y; dp[o + 2] = cz + z; dp[o + 3] = cx + x - .35 - d * .4; dp[o + 4] = y + .02; dp[o + 5] = cz + z; }
  dG.attributes.position.needsUpdate = true;
}

// ================= env presets =================
const ENV = {
  studio: { bg: '#f1ebe0', fog: null, hemi: .62, sun: 2.3, night: 0, expo: 1, tint: [1, 1, 1] },
  day: { bg: '#bcd0e2', fog: ['#d5e1ec', 60, 420], hemi: .6, sun: 2.3, night: 0, expo: 1, tint: [1, 1, 1] },
  dusk: { bg: '#a9b6cf', fog: ['#c3c4d3', 40, 260], hemi: .5, sun: 1.6, sunColor: '#ffc89a', night: 0, expo: .95, tint: [1, .95, .95] },
  buran: { bg: '#cdd8e3', fog: ['#d3dee8', 2, 34], hemi: .7, sun: .8, night: 0, expo: 1, tint: [.96, .99, 1.04] },
  night: { bg: '#1b2740', fog: ['#22304a', 4, 48], hemi: .35, sun: .25, sunColor: '#9bb4ff', night: 1, expo: 1, tint: [.72, .82, 1.1] },
  nightburan: { bg: '#2c3a55', fog: ['#34445f', 1.5, 20], hemi: .4, sun: .2, sunColor: '#9bb4ff', night: 1, expo: 1, tint: [.75, .85, 1.1] },
  morning: { bg: '#9cc4ec', fog: ['#dce9f4', 80, 600], hemi: .6, sun: 2.7, sunColor: '#fff3df', night: 0, expo: 1.03, tint: [1, 1, 1] },
  info: { bg: '#f3ece0', fog: null, hemi: .65, sun: 2.2, night: 0, expo: 1, tint: [1, 1, 1] },
};
export function setEnv(name, over = {}) { const e = { ...ENV[name], ...over };
  scene.background = new THREE.Color(e.bg); scene.fog = e.fog ? new THREE.Fog(e.fog[0], e.fog[1], e.fog[2]) : null;
  L.hemi.intensity = e.hemi * Math.PI; L.sun.intensity = e.sun * Math.PI; L.sun.color.set(e.sunColor || '#fff4e6');
  look.night = e.night; look.expo = e.expo; look.tint.setRGB(...e.tint); return e; }

// ================= INFO stage =================
export const INFO = G(scene, ...OFF.info);
at(M(new THREE.PlaneGeometry(60, 40).rotateX(-Math.PI / 2), '#f3ece0', { noEdge: true }), 0, 0, 0, INFO);
at(M(new THREE.PlaneGeometry(60, 30), '#f3ece0', { noEdge: true }), 0, 15, -8, INFO);
export const pedestal = at(rbox(2.6, .5, 2.6, .12, '#e3d6c0'), 0, .25, 0, INFO);
