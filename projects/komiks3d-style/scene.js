// Style test: 3D comic look — real shadows, halftone shading, thin ink edges, textures, one continuous camera.
import * as THREE from './three.js';
const W = innerWidth, H = innerHeight, FPS = 30, DUR = 10;
const renderer = new THREE.WebGLRenderer({ antialias: false, preserveDrawingBuffer: true });
renderer.setSize(W, H); renderer.setPixelRatio(1);
renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputColorSpace = THREE.LinearSRGBColorSpace;
document.body.appendChild(renderer.domElement);
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(38, W / H, 0.1, 200);
const rng = (() => { let s = 7; return () => (s = (s * 16807) % 2147483647) / 2147483647; })();

// ---------- materials: every mesh has a lit (toon+shadow) and a flat (albedo) version ----------
const MESHES = [];
const SKY = new THREE.Color('#c3cfd9');
function mats(color, map, opt = {}) {
  const c = new THREE.Color(color);
  const lit = opt.glow ? new THREE.MeshBasicMaterial({ color: c, map }) : new THREE.MeshLambertMaterial({ color: c, map });
  const flat = new THREE.MeshBasicMaterial({ color: c, map });
  if (opt.side) { lit.side = flat.side = opt.side; }
  return { lit, flat };
}
function M(geo, color, opt = {}) {
  const m = mats(color, opt.map, opt);
  const o = new THREE.Mesh(geo, m.lit); o.userData.m = m; o.userData.noEdge = !!opt.noEdge;
  o.castShadow = opt.cast !== false; o.receiveShadow = opt.recv !== false;
  MESHES.push(o); return o;
}
const box = (w, h, d, color, opt) => M(new THREE.BoxGeometry(w, h, d), color, opt);
const cyl = (r1, r2, h, color, seg = 20, opt) => M(new THREE.CylinderGeometry(r1, r2, h, seg), color, opt);
const sph = (r, color, opt) => M(new THREE.SphereGeometry(r, 28, 18), color, opt);
function at(o, x, y, z, parent = scene) { o.position.set(x, y, z); parent.add(o); return o; }

// ---------- canvas textures ----------
function tex(w, h, draw, rep = [1, 1]) {
  const cv = document.createElement('canvas'); cv.width = w; cv.height = h; const g = cv.getContext('2d'); draw(g, w, h);
  const t = new THREE.CanvasTexture(cv); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(...rep); t.anisotropy = 4; t.colorSpace = THREE.SRGBColorSpace; return t;
}
const brick = tex(256, 256, (g, w, h) => {
  g.fillStyle = '#8f8a84'; g.fillRect(0, 0, w, h);
  for (let r = 0; r < 8; r++) for (let c = -1; c < 5; c++) {
    const x = c * 64 + (r % 2) * 32, y = r * 32; const k = rng() * 30;
    g.fillStyle = `rgb(${150 + k},${96 + k * .6},${70 + k * .4})`; g.fillRect(x + 3, y + 3, 58, 26);
    g.strokeStyle = 'rgba(40,30,30,.55)'; g.lineWidth = 2; g.strokeRect(x + 3, y + 3, 58, 26);
  }
}, [3, 1]);
const planks = tex(512, 512, (g, w, h) => {
  for (let i = 0; i < 8; i++) { const k = rng() * 18; g.fillStyle = `rgb(${206 + k},${150 + k},${98 + k * .5})`; g.fillRect(i * 64, 0, 64, h);
    g.strokeStyle = 'rgba(90,55,30,.7)'; g.lineWidth = 2.5; g.beginPath(); g.moveTo(i * 64, 0); g.lineTo(i * 64, h); g.stroke();
    const j = rng() * h; g.beginPath(); g.moveTo(i * 64, j); g.lineTo(i * 64 + 64, j); g.stroke();
    g.strokeStyle = 'rgba(120,75,40,.25)'; g.lineWidth = 1.2; for (let q = 0; q < 4; q++) { g.beginPath(); const xx = i * 64 + 10 + q * 12; g.moveTo(xx, 0); g.bezierCurveTo(xx + 6, h / 3, xx - 6, h * 2 / 3, xx, h); g.stroke(); } }
}, [2, 2]);
const wallp = tex(256, 256, (g, w, h) => {
  g.fillStyle = '#efd9b4'; g.fillRect(0, 0, w, h); g.fillStyle = 'rgba(190,140,90,.22)';
  for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) { g.beginPath(); g.arc(x * 32 + (y % 2) * 16, y * 32, 3, 0, 7); g.fill(); }
}, [3, 2]);
const rug = tex(512, 340, (g, w, h) => {
  g.fillStyle = '#9d2b2b'; g.fillRect(0, 0, w, h); g.fillStyle = '#1f3d6b'; g.fillRect(22, 22, w - 44, h - 44);
  g.fillStyle = '#b8352f'; g.fillRect(48, 48, w - 96, h - 96);
  const cx = w / 2, cy = h / 2;
  for (let k = 5; k > 0; k--) { g.fillStyle = ['#e6b450', '#1f3d6b', '#f0e2c0', '#7a1f22', '#e6b450'][k - 1]; g.beginPath(); g.moveTo(cx - k * 30, cy); g.lineTo(cx, cy - k * 20); g.lineTo(cx + k * 30, cy); g.lineTo(cx, cy + k * 20); g.fill(); }
  g.fillStyle = '#e6b450'; for (let i = 0; i < 22; i++) { g.fillRect(30 + i * 21, 30, 8, 8); g.fillRect(30 + i * 21, h - 38, 8, 8); }
  g.strokeStyle = '#f0e2c0'; g.lineWidth = 3; g.strokeRect(36, 36, w - 72, h - 72);
});
const picture = tex(256, 200, (g, w, h) => {
  g.fillStyle = '#f3e8d2'; g.fillRect(0, 0, w, h); g.fillStyle = '#9dbbd1'; g.fillRect(0, 0, w, 110);
  g.fillStyle = '#7d93a8'; g.beginPath(); g.moveTo(0, 120); g.lineTo(70, 40); g.lineTo(140, 120); g.lineTo(190, 60); g.lineTo(256, 120); g.fill();
  g.fillStyle = '#fff'; g.beginPath(); g.moveTo(52, 60); g.lineTo(70, 40); g.lineTo(88, 60); g.fill();
  g.fillStyle = '#e39a3a'; g.beginPath(); g.arc(200, 40, 18, 0, 7); g.fill(); g.fillStyle = '#6d8a52'; g.fillRect(0, 120, w, 80);
});
function dialTex(txt, hot) { return tex(256, 256, (g) => {
  g.fillStyle = '#f7f4ee'; g.beginPath(); g.arc(128, 128, 124, 0, 7); g.fill(); g.lineWidth = 14;
  g.strokeStyle = '#4a86c5'; g.beginPath(); g.arc(128, 128, 96, Math.PI * .75, Math.PI * 1.5); g.stroke();
  g.strokeStyle = '#e0543f'; g.beginPath(); g.arc(128, 128, 96, Math.PI * 1.5, Math.PI * 2.25); g.stroke();
  g.strokeStyle = '#333'; g.lineWidth = 3; for (let i = 0; i <= 10; i++) { const a = Math.PI * .75 + i * Math.PI * 1.5 / 10; g.beginPath(); g.moveTo(128 + Math.cos(a) * 78, 128 + Math.sin(a) * 78); g.lineTo(128 + Math.cos(a) * 88, 128 + Math.sin(a) * 88); g.stroke(); }
  const a = hot ? Math.PI * 1.95 : Math.PI * 1.05; g.lineWidth = 7; g.beginPath(); g.moveTo(128, 128); g.lineTo(128 + Math.cos(a) * 82, 128 + Math.sin(a) * 82); g.stroke();
  g.fillStyle = '#333'; g.beginPath(); g.arc(128, 128, 9, 0, 7); g.fill();
  g.font = 'bold 44px InterX'; g.textAlign = 'center'; g.fillStyle = hot ? '#d0402c' : '#2f6fb0'; g.fillText(txt, 128, 200);
  g.strokeStyle = '#222'; g.lineWidth = 6; g.beginPath(); g.arc(128, 128, 124, 0, 7); g.stroke(); }); }

// ---------- lights ----------
const hemi = new THREE.HemisphereLight('#ffffff', '#c9d2de', 0.55); scene.add(hemi);
const sun = new THREE.DirectionalLight('#fff4e6', 2.4); sun.position.set(-9, 14, 10); sun.castShadow = true;
sun.shadow.mapSize.set(4096, 4096); Object.assign(sun.shadow.camera, { left: -16, right: 16, top: 16, bottom: -16, near: 1, far: 50 });
sun.shadow.bias = -0.0006; sun.shadow.normalBias = 0.02; scene.add(sun); scene.add(sun.target);
const warm = new THREE.PointLight('#ffb070', 6, 9, 1.6); warm.position.set(-1.6, 1.6, -1.0); scene.add(warm);

// ---------- ground + garden ----------
const SNOW = '#eef3f8';
at(M(new THREE.PlaneGeometry(120, 120).rotateX(-Math.PI / 2), SNOW, { cast: false, noEdge: true }), 0, 0, 0);
for (let i = 0; i < 26; i++) { const a = rng() * 6.28, r = 7 + rng() * 14; const s = sph(1, SNOW, { cast: false }); s.scale.set(1.2 + rng() * 2, .25 + rng() * .3, 1 + rng() * 1.5);
  if (Math.abs(Math.cos(a) * r) < 6 && Math.sin(a) * r > 0) continue; at(s, Math.cos(a) * r, 0, Math.sin(a) * r - 4); }
// brick garden wall behind
const gw = box(30, 1.6, .5, '#ffffff', { map: brick }); brick.repeat.set(12, 1); at(gw, 0, .8, -9);
at(box(30.3, .22, .7, SNOW), 0, 1.7, -9);
// bare trees (recursive branches)
function branch(parent, len, rad, depth) {
  const g = new THREE.Group(); const c = cyl(rad * .6, rad, len, '#5b4a42', 7); c.position.y = len / 2; g.add(c);
  if (depth > 0) { const n = depth > 2 ? 3 : 2; for (let i = 0; i < n; i++) { const ch = branch(g, len * (.62 + rng() * .15), rad * .6, depth - 1);
    ch.position.y = len * (.55 + rng() * .45); ch.rotation.set((rng() - .5) * 1.4, rng() * 6.28, (rng() * .5 + .35) * (i % 2 ? 1 : -1)); g.add(ch); } }
  else if (rng() < .6) { const s = box(len * .8, .03, .05, SNOW, { cast: false }); s.position.y = len * .6; g.add(s); }
  return g;
}
const trees = [[-7, -11], [5.5, -12], [11, -8], [-12, -6], [9.5, 4], [-3, -13]];
for (const [x, z] of trees) { const t = branch(scene, 2.4 + rng(), .2, 4); at(t, x, 0, z); }
// pines
function pine(x, z, s) { const g = new THREE.Group(); g.add(at(cyl(.12, .16, .8, '#5b4a42', 8), 0, .4, 0, g));
  for (let k = 0; k < 3; k++) { at(M(new THREE.ConeGeometry(1.1 - k * .28, 1.2, 9), '#2f6b5a'), 0, .9 + k * .6, 0, g); at(M(new THREE.ConeGeometry(.9 - k * .26, .5, 9), SNOW), 0, 1.25 + k * .6, 0, g); }
  g.scale.setScalar(s); g.rotation.y = rng() * 6; return at(g, x, 0, z); }
pine(7.5, 1, 1.3); pine(-8.5, 2.5, 1.1); pine(-10, -3, 1.5); pine(8.5, -4, 1.0);
// fence
for (let i = 0; i < 14; i++) { at(box(.12, .9, .12, '#7a5a44'), -6.5 + i, .45, 6.2); }
at(box(13.2, .1, .06, '#7a5a44'), 0, .65, 6.2); at(box(13.2, .1, .06, '#7a5a44'), 0, .3, 6.2);
for (let i = 0; i < 14; i++) at(box(.18, .06, .18, SNOW), -6.5 + i, .93, 6.2);
// snowman
const sm = new THREE.Group(); at(sph(.55, '#f6f8fb'), 0, .5, 0, sm); at(sph(.4, '#f6f8fb'), 0, 1.25, 0, sm); at(sph(.28, '#f6f8fb'), 0, 1.8, 0, sm);
at(cyl(.24, .24, .35, '#2b3340'), 0, 2.2, 0, sm); at(cyl(.36, .36, .04, '#2b3340'), 0, 2.03, 0, sm); at(cyl(.29, .29, .1, '#e0573c'), 0, 1.58, 0, sm);
const nose = M(new THREE.ConeGeometry(.05, .3, 8), '#ec7a2a'); nose.rotation.x = Math.PI / 2; at(nose, 0, 1.8, .38, sm);
for (const s of [-1, 1]) { at(sph(.035, '#222'), s * .1, 1.88, .24, sm); const arm = cyl(.025, .03, .8, '#5b4a42', 6); arm.rotation.z = s * 1.0; at(arm, s * .6, 1.4, 0, sm); }
for (let i = 0; i < 3; i++) at(sph(.04, '#222'), 0, 1.15 + i * .15, .39 - Math.abs(i - 1) * .02, sm);
sm.rotation.y = .5; at(sm, -3.8, 0, 4.6);
// firewood stack
for (let r = 0; r < 3; r++) for (let i = 0; i < 6 - r; i++) { const l = cyl(.16, .16, 1.1, '#9a6a45', 12); l.rotation.x = Math.PI / 2; at(l, 3.9 + i * .33 + r * .16, .17 + r * .3, -1.2); }
for (let i = 0; i < 6; i++) { const end = cyl(.13, .13, .02, '#e2bf8a', 12, { cast: false }); end.rotation.x = Math.PI / 2; at(end, 3.9 + i * .33, .17, -.64); }

// ---------- cutaway house ----------
const HW = 3, HD = 2.6, HH = 3, T = .3; // half-width, half-depth, height, wall thickness
const house = new THREE.Group(); scene.add(house);
const WALL = '#e9cf9f', CUT = '#8b6b55';
at(box(HW * 2 + T * 2, .35, HD * 2 + T * 2, '#b9a48c'), 0, .17, 0, house); // foundation
at(box(HW * 2, .04, HD * 2, '#ffffff', { map: planks }), 0, .37, 0, house);
// back wall with window hole: build from pieces
const bw = (w, h, x, y) => { const o = box(w, h, T, '#ffffff', { map: wallp }); at(o, x, y, -HD - T / 2, house); };
bw(2.6, HH, -1.7, HH / 2 + .35); bw(1.4, HH, 2.3, HH / 2 + .35); bw(2, 1.2, .6, .95); bw(2, .8, .6, HH - .05);
// window
const win = new THREE.Group(); at(box(2, .1, .4, '#f4f1ea'), 0, -.55, .1, win); at(box(2, .1, .35, '#f4f1ea'), 0, .55, 0, win);
at(box(.1, 1.2, .35, '#f4f1ea'), -1, 0, 0, win); at(box(.1, 1.2, .35, '#f4f1ea'), 1, 0, 0, win); at(box(.06, 1.1, .3, '#f4f1ea'), 0, 0, 0, win); at(box(2, .06, .3, '#f4f1ea'), 0, 0, 0, win);
const glass = M(new THREE.PlaneGeometry(1.9, 1.1), '#d8e6ef', { noEdge: true, cast: false }); glass.material.transparent = true; glass.userData.m.lit.opacity = glass.userData.m.flat.opacity = .45; glass.userData.m.lit.transparent = glass.userData.m.flat.transparent = true; at(glass, 0, 0, -.05, win);
at(win, .6, 2.15, -HD - T / 2, house);
// left wall (exterior visible from outside-left) — full
const lw = box(T, HH, HD * 2 + T * 2, '#ffffff', { map: wallp }); at(lw, -HW - T / 2, HH / 2 + .35, 0, house);
// front wall: left part only (cutaway), exterior colour; cut face darker
at(box(1.6, HH, T, WALL), -HW + .8, HH / 2 + .35, HD + T / 2, house);
at(box(.04, HH, T + .02, CUT, { cast: false }), -HW + 1.62, HH / 2 + .35, HD + T / 2, house);
// right wall: cut low (like a section) showing thickness
at(box(T, .9, HD * 2 + T * 2, WALL), HW + T / 2, .8, 0, house);
// ceiling with insulation layer, cut at front
at(box(HW * 2 + T * 2, .16, HD * 2 + T * 2, '#f2ead9'), 0, HH + .43, 0, house);
at(box(HW * 2 + T * 2, .3, HD * 2 + T * 2, '#e6c34a'), 0, HH + .66, 0, house);
// roof: two slabs, back slab full, front slab short (cut)
const rp = (len, side) => { const s = box(HW * 2 + 1.2, .18, len, '#7c5546'); s.rotation.x = side * .6; const sn = box(HW * 2 + 1.3, .12, len + .1, SNOW); sn.position.y = .15; s.add(sn); return s; };
const rb = rp(3.6, -1); at(rb, 0, HH + 1.85, -1.5, house);
// beams visible in the cut attic
for (let i = -2; i <= 2; i++) { const b = box(.14, .14, 3.3, '#8d6a50'); b.rotation.x = -.6; at(b, i * 1.4, HH + 1.65, -1.25, house); }
// gable end on left side (triangle)
const tri = new THREE.Shape(); tri.moveTo(-HD - T, 0); tri.lineTo(HD + T, 0); tri.lineTo(0, 2.0); tri.lineTo(-HD - T, 0);
const gab = M(new THREE.ExtrudeGeometry(tri, { depth: T, bevelEnabled: false }), WALL); gab.rotation.y = Math.PI / 2; at(gab, -HW - T, HH + .35, 0, house);
// outside wall thermometer (left wall exterior)
const thermOut = M(new THREE.CircleGeometry(.32, 40), '#ffffff', { map: dialTex('-15°', false), cast: false }); thermOut.rotation.y = -Math.PI / 2; at(thermOut, -HW - T - .03, 2.2, 1.2, house);
at(box(.06, .7, .7, '#e0ddd5'), -HW - T - .02, 2.2, 1.2, house).visible = false;

// ---------- interior ----------
// stove (pechka) back-left corner
const stove = new THREE.Group();
at(box(1.1, 1.3, .9, '#4b3a3a'), 0, .65, 0, stove); at(box(1.2, .1, 1.0, '#2f2a2b'), 0, 1.33, 0, stove); at(box(1.2, .14, 1.0, '#2f2a2b'), 0, .07, 0, stove);
const door = box(.6, .5, .05, '#2a2425'); at(door, 0, .6, .46, stove);
const fire = box(.48, .38, .02, '#ff9a2e', { glow: true, cast: false, noEdge: true }); at(fire, 0, .6, .49, stove);
const fireIn = box(.3, .2, .03, '#ffe08a', { glow: true, cast: false, noEdge: true }); at(fireIn, 0, .55, .5, stove);
for (let i = 0; i < 4; i++) at(box(.5, .03, .06, '#2a2425', { cast: false }), 0, .45 + i * .1, .515, stove);
const pipe = cyl(.13, .13, 3.3, '#3a3434', 16); at(pipe, .2, 2.95, -.1, stove);
at(cyl(.17, .17, .12, '#3a3434', 16), .2, 1.45, -.1, stove);
at(stove, -2.1, .37, -1.8, house);
// chimney outside on roof
const chim = cyl(.16, .16, 1.0, '#3a3434', 16); at(chim, -1.9, HH + 2.5, -1.9, house);
// tea kettle on stove
at(sph(.17, '#d65b3b'), -2.0, 1.95, -1.8, house).scale.y = .8;
// sofa
const sofa = new THREE.Group(); at(box(2.2, .45, .9, '#3f6d8f'), 0, .32, 0, sofa); at(box(2.2, .7, .25, '#3f6d8f'), 0, .8, -.33, sofa);
at(box(.25, .55, .9, '#365f7d'), -1.1, .55, 0, sofa); at(box(.25, .55, .9, '#365f7d'), 1.1, .55, 0, sofa);
at(box(.9, .14, .7, '#4a7ea3'), -.48, .6, .06, sofa); at(box(.9, .14, .7, '#4a7ea3'), .48, .6, .06, sofa);
at(box(.45, .4, .14, '#e3a64a'), .65, .85, -.15, sofa).rotation.z = .2;
for (const x of [-1, 1]) for (const z of [-.35, .35]) at(cyl(.04, .03, .1, '#2f2a2b', 8), x, .05, z, sofa);
sofa.rotation.y = 0; at(sofa, 1.2, .37, -1.75, house);
// armchair
const ac = new THREE.Group(); at(box(.9, .4, .85, '#d07a3c'), 0, .3, 0, ac); at(box(.9, .7, .2, '#c46e33'), 0, .75, -.33, ac);
at(box(.18, .45, .85, '#c46e33'), -.45, .5, 0, ac); at(box(.18, .45, .85, '#c46e33'), .45, .5, 0, ac);
ac.rotation.y = .9; at(ac, -1.9, .37, .6, house);
// rug + table
at(M(new THREE.PlaneGeometry(2.8, 1.85).rotateX(-Math.PI / 2), '#ffffff', { map: rug, cast: false, noEdge: true }), .3, .4, -.2, house);
const tb = new THREE.Group(); at(box(1.1, .07, .6, '#9a6440'), 0, .45, 0, tb); for (const x of [-.48, .48]) for (const z of [-.24, .24]) at(box(.06, .42, .06, '#7a4c30'), x, .21, z, tb);
at(cyl(.06, .05, .12, '#ffffff', 12), -.2, .55, 0, tb); at(cyl(.05, .05, .02, '#a0522d', 12, { cast: false }), -.2, .6, 0, tb);
at(tb, .9, .37, -.4, house);
// sleeping cat on rug
const cat = new THREE.Group(); const cb = sph(.24, '#5c5552'); cb.scale.set(1.35, .7, 1); at(cb, 0, .17, 0, cat);
at(sph(.14, '#5c5552'), .3, .2, .08, cat); for (const s of [-1, 1]) { const e = M(new THREE.ConeGeometry(.05, .1, 6), '#5c5552'); at(e, .32 + s * .05, .33, .12 + s * .03, cat); }
const tail = M(new THREE.TorusGeometry(.2, .04, 8, 20, 3), '#5c5552'); tail.rotation.x = Math.PI / 2; at(tail, -.05, .07, .1, cat);
cat.rotation.y = -.4; at(cat, -.6, .4, .5, house);
// wall picture, lamp, inside thermometer
const pic = new THREE.Group(); at(box(.95, .75, .05, '#6b4a33'), 0, 0, 0, pic); at(M(new THREE.PlaneGeometry(.82, .62), '#ffffff', { map: picture, cast: false, noEdge: true }), 0, 0, .03, pic);
at(pic, 2.15, 2.25, -HD + .03, house);
const lamp = new THREE.Group(); at(cyl(.18, .22, .05, '#2f2a2b', 16), 0, .025, 0, lamp); at(cyl(.025, .025, 1.5, '#2f2a2b', 8), 0, .78, 0, lamp);
at(cyl(.18, .32, .35, '#f1d48a', 20), 0, 1.6, 0, lamp); at(lamp, 2.55, .37, -.6, house);
const thermIn = M(new THREE.CircleGeometry(.26, 40), '#ffffff', { map: dialTex('+22°', true), cast: false }); thermIn.rotation.y = Math.PI / 2; at(thermIn, -HW + .02, 2.3, -.5, house);
// shelf with jars on left wall
at(box(.3, .05, 1.2, '#8d6a50'), -HW + .15, 1.75, 1.2, house);
for (let i = 0; i < 3; i++) at(cyl(.08, .08, .22, ['#d65b3b', '#e3a64a', '#5f8f6a'][i], 12), -HW + .17, 1.89, .8 + i * .38, house);

// ---------- heat ribbons (grow along path) ----------
const RIB = [];
function ribbon(pts, delay) {
  const curve = new THREE.CatmullRomCurve3(pts.map(p => new THREE.Vector3(...p)));
  const geo = new THREE.TubeGeometry(curve, 120, .07, 10, false);
  const r = M(geo, '#f39a3b', { cast: true }); house.add(r); r.userData.delay = delay; r.userData.n = geo.index.count; RIB.push(r);
  const head = M(new THREE.ConeGeometry(.15, .3, 14), '#f39a3b'); house.add(head); r.userData.head = head; r.userData.curve = curve;
}
ribbon([[-2.1, 1.9, -1.6], [-1.9, 2.7, -1.2], [-1.0, 2.9, -.6], [.2, 2.5, -.1], [1.0, 1.6, .3], [1.4, 1.0, .5]], 0);
ribbon([[-1.9, 1.9, -1.5], [-1.4, 2.5, -1.6], [-.3, 2.6, -1.4], [1.0, 2.2, -1.0], [2.1, 1.7, -.4]], .35);
ribbon([[-2.2, 1.9, -1.4], [-2.4, 2.6, -.6], [-2.2, 2.3, .3], [-1.6, 1.4, .8], [-1.2, 1.0, .9]], .7);

// ---------- smoke + snow ----------
const smoke = []; for (let i = 0; i < 6; i++) { const s = sph(.25, '#d9dde2', { cast: false }); scene.add(s); smoke.push(s); }
const SN = 2500, sg = new THREE.BufferGeometry(), sp = new Float32Array(SN * 3), seed = [];
for (let i = 0; i < SN; i++) seed.push([rng() * 30 - 15, rng() * 14, rng() * 30 - 15, rng()]);
sg.setAttribute('position', new THREE.BufferAttribute(sp, 3));
const snow = new THREE.Points(sg, new THREE.PointsMaterial({ color: '#ffffff', size: 0.05, transparent: true, opacity: .9 })); scene.add(snow);

// ---------- passes + composite ----------
const rtOpt = { minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter, samples: 4 };
const rtLit = new THREE.WebGLRenderTarget(W, H, { ...rtOpt, type: THREE.HalfFloatType }), rtFlat = new THREE.WebGLRenderTarget(W, H, rtOpt);
const rtN = new THREE.WebGLRenderTarget(W, H, { minFilter: THREE.NearestFilter, magFilter: THREE.NearestFilter });
rtN.depthTexture = new THREE.DepthTexture(W, H); rtN.depthTexture.type = THREE.UnsignedIntType;
const normMat = new THREE.MeshNormalMaterial();
const comp = new THREE.ShaderMaterial({
  uniforms: { tLit: { value: rtLit.texture }, tFlat: { value: rtFlat.texture }, tN: { value: rtN.texture }, tD: { value: rtN.depthTexture },
    res: { value: new THREE.Vector2(W, H) }, near: { value: .1 }, far: { value: 200 }, ink: { value: new THREE.Color('#2b2630') }, shadeTint: { value: new THREE.Color('#5d6f8f') } },
  vertexShader: 'varying vec2 vUv; void main(){ vUv=uv; gl_Position=vec4(position.xy,0.,1.); }',
  fragmentShader: `
  uniform sampler2D tLit,tFlat,tN,tD; uniform vec2 res; uniform float near,far; uniform vec3 ink,shadeTint; varying vec2 vUv;
  float lin(vec2 uv){ float z=texture2D(tD,uv).x; return near*far/(far - z*(far-near)); }
  float lum(vec3 c){ return dot(c,vec3(.299,.587,.114)); }
  void main(){
    vec3 lit=texture2D(tLit,vUv).rgb, alb=texture2D(tFlat,vUv).rgb;
    float sh = clamp(lum(lit)/max(lum(alb),1e-3), 0., 1.6);   // lighting factor
    // banded toon light + halftone in mid/low
    float l = sh>1.0 ? 1.0 : (sh>0.8 ? 0.93 : 0.8);
    vec2 p = gl_FragCoord.xy; float s=.7071; vec2 q = mat2(s,-s,s,s)*p/7.0; vec2 cell=fract(q)-.5;
    float rad = clamp((0.98-sh)*1.1, 0., .55);
    float dotm = 1.0 - smoothstep(rad-.06, rad+.06, length(cell));
    vec3 col = alb*l;
    col = mix(col, col*mix(vec3(1.), shadeTint*1.25, .55), dotm*step(sh,.97)*.85);
    col += alb*min(max(sh-1.0,0.),1.)*.12;
    // ink edges from depth + normal
    vec2 px = 1.6/res; float d0=lin(vUv);
    float dd=0.; vec3 n0=texture2D(tN,vUv).rgb; float nd=0.;
    for(int i=0;i<4;i++){ vec2 o = i==0?vec2(px.x,0.):i==1?vec2(-px.x,0.):i==2?vec2(0.,px.y):vec2(0.,-px.y);
      dd = max(dd, abs(lin(vUv+o)-d0)/d0); vec3 n1=texture2D(tN,vUv+o).rgb; nd=max(nd, length(n1-n0)); }
    float e = max(smoothstep(.035,.07,dd), smoothstep(.35,.55,nd)*step(.001, n0.r+n0.g+n0.b));
    col = mix(col, ink, e*.92);
    // paper grain + gentle grade
    float g = fract(sin(dot(p,vec2(12.9898,78.233)))*43758.5453);
    col *= .975 + g*.035; col = mix(vec3(lum(col)), col, .92);
    gl_FragColor = vec4(pow(max(col,0.), vec3(1./2.2)),1.);
  }` });
const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), comp); const qs = new THREE.Scene(); qs.add(quad); const qc = new THREE.Camera();

// ---------- camera path (one continuous move) ----------
const camPts = [[-11, 6.5, 16], [-7, 5.2, 12], [-1.5, 3.9, 8.5], [1.9, 3.0, 5.0], [2.0, 2.8, 3.6], [1.8, 2.7, 3.0]];
const lookPts = [[0, 2.2, 0], [0, 2.1, -.3], [-.2, 1.9, -.8], [-.6, 1.9, -1.0], [-.8, 1.8, -1.0], [-.9, 1.7, -.9]];
const cC = new THREE.CatmullRomCurve3(camPts.map(p => new THREE.Vector3(...p))), cL = new THREE.CatmullRomCurve3(lookPts.map(p => new THREE.Vector3(...p)));
const ease = x => x < .5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;
const sstep = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };

function update(t) {
  const u = ease(Math.min(1, t / 8.5)); camera.position.copy(cC.getPoint(u)); camera.lookAt(cL.getPoint(u));
  camera.fov = 40 + 10 * sstep(.5, 1, u); camera.updateProjectionMatrix();
  for (const r of RIB) { const k = sstep(2.6 + r.userData.delay, 6.2 + r.userData.delay, t); const n = Math.floor(r.userData.n * k / 3) * 3;
    r.geometry.setDrawRange(0, n); r.visible = n > 0; const h = r.userData.head; h.visible = k > .01; const pt = r.userData.curve.getPoint(Math.max(.001, k)), tg = r.userData.curve.getTangent(Math.max(.001, k));
    h.position.copy(pt); h.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), tg); }
  const f = .85 + .15 * Math.sin(t * 17) * Math.sin(t * 5.3); fire.scale.set(1, f, 1); fireIn.scale.set(1, f * .9, 1);
  smoke.forEach((s, i) => { const k = ((t * .25 + i / smoke.length) % 1); s.position.set(-1.9 + k * 3.2 + Math.sin(i * 2.1 + t) * .25, HH + 3.0 + k * 3.5, -1.9 - k * .8 + Math.cos(i * 1.7) * .3); s.scale.set(.5 + k * 1.8, .4 + k * 1.3, .5 + k * 1.6); s.visible = k > .04 && k < .92; });
  for (let i = 0; i < SN; i++) { const [x, y, z, r] = seed[i]; let yy = (y - t * (.6 + r * .5)) % 14; if (yy < 0) yy += 14;
    sp[i * 3] = x + Math.sin(t * .8 + r * 9) * .3; sp[i * 3 + 1] = yy; sp[i * 3 + 2] = z; }
  sg.attributes.position.needsUpdate = true;
}
function draw() {
  scene.background = SKY;
  for (const o of MESHES) o.material = o.userData.m.lit; snow.visible = true;
  renderer.setRenderTarget(rtLit); renderer.render(scene, camera);
  for (const o of MESHES) o.material = o.userData.m.flat;
  renderer.setRenderTarget(rtFlat); renderer.render(scene, camera);
  scene.background = null; renderer.setClearColor(0x000000, 0); snow.visible = false;
  const hid = MESHES.filter(o => o.userData.noEdge && o.visible); hid.forEach(o => o.visible = false);
  scene.overrideMaterial = normMat; renderer.setRenderTarget(rtN); renderer.render(scene, camera); scene.overrideMaterial = null;
  hid.forEach(o => o.visible = true); snow.visible = true;
  renderer.setRenderTarget(null); renderer.render(qs, qc);
}
window.renderFrame = (f) => { update(f / FPS); draw(); return renderer.domElement.toDataURL('image/jpeg', 0.93); };
window.DUR = DUR; window.ready = true;
