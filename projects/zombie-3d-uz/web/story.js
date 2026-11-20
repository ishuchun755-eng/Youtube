import { THREE, renderer, renderComposite, post, clamp } from './engine.js';
import { scene, SETS, showSet, place, LOT, STORE, BACK, ROAD, CAST, ZOMBIES, zpose } from './sets.js';
const V3 = (x, y, z) => new THREE.Vector3(x, y, z);
const OFF = { LOT: 0, STORE: 200, BACK: 400, ROAD: 600 };
const camera = new THREE.PerspectiveCamera(35, 16 / 9, 0.05, 600);
const ALL = [...Object.values(CAST), ...ZOMBIES];
function hideAll() { for (const p of ALL) p.visible = false; }
function crowd(set, n, x0, x1, z0, z1, t, yaw = 0, walk = 0, seed = 0) {
  for (let i = 0; i < n; i++) {
    const z = ZOMBIES[(i + seed) % ZOMBIES.length]; const a = (i * 0.618 + seed * 0.1) % 1, b = (i * 0.383 + 0.2) % 1;
    place(z, set, x0 + (x1 - x0) * a, 0, z0 + (z1 - z0) * b, yaw + Math.sin(i) * 0.3); zpose(z, t, walk ? t * 0.8 + i : 0);
  }
}
// preview shots
const PV = [
  ['LOT', { tod: 'day', doorOpen: 0 }, V3(4, 2.2, 30), V3(0, 3.5, -10), 40, t => { place(CAST.sardor, LOT, 1, 0, 8, Math.PI); crowd(LOT, 14, -14, 14, 10, 24, t, Math.PI); }],
  ['LOT', { tod: 'night' }, V3(-8, 3, 28), V3(0, 3, -10), 42, t => { crowd(LOT, 24, -16, 16, -2, 20, t, Math.PI); }],
  ['STORE', { tod: 'day', lights: 'on', food: 1 }, V3(6, 3.2, 17), V3(-2, 1.6, -6), 45, t => { const c = CAST; place(c.sardor, STORE, 0.5, 0, 10, Math.PI); place(c.mom, STORE, -1, 0, 9, 2.6); place(c.girl, STORE, -1.6, 0, 9.4, 2.6); place(c.old, STORE, 2, 0, 9, -2.6); place(c.teen1, STORE, 3, 0, 10, -2.4); place(c.teen2, STORE, 3.8, 0, 10.4, -2.4); place(c.staff, STORE, -2.5, 0, 10.5, 2.4); place(c.jacket, STORE, 5, 0, 8.5, -2.0); }],
  ['STORE', { tod: 'day', lights: 'on', barricade: 1, boxes: 1, cracks: 0.9 }, V3(1, 1.8, 12), V3(0, 2, 22), 50, t => { crowd(STORE, 20, -10, 10, 22, 30, t, Math.PI); place(CAST.sardor, STORE, 1.5, 0, 16, 0.2); }],
  ['STORE', { tod: 'night', lights: 'off', red: 1, food: 0.3 }, V3(-4.5, 1.7, 8), V3(-4.5, 1.5, -12), 42, t => { place(ZOMBIES[3], STORE, -4.3, 0, -6, 0); zpose(ZOMBIES[3], t, t); place(CAST.sardor, STORE, -4.8, 0, 4, Math.PI); }],
  ['BACK', { empties: 1, handprint: 1, foodPile: 1 }, V3(-3, 1.9, -5.5), V3(4, 1.3, 3), 45, t => { place(CAST.sardor, BACK, 2, 0, 1, Math.PI * 0.6); }],
  ['BACK', { exitOpen: 0.5, foodPile: 1 }, V3(-4, 2.2, -24.5), V3(3, 1.2, -30), 48, t => { place(CAST.sardor, BACK, 2, 0, -29, 1.4); place(CAST.girl, BACK, 1, 0, -28.5, 1.4); }],
  ['BACK', {}, V3(0.3, 1.6, -58), V3(0, 1.5, -75), 50, t => { place(CAST.jacket, BACK, 0, 0, -64, 0); BACK.radio.position.set(0.2, 1.1, -63.6); }],
  ['ROAD', { tod: 'dusk', truckZ: 0 }, V3(-9, 3, -12), V3(-2.5, 1.8, 0), 40, t => { }],
];
window.renderFrame = (fi) => {
  const t = fi / 30; const [set, c, pos, look, fov, fn] = PV[fi % PV.length];
  hideAll(); showSet(set); fn(t);
  for (const s of Object.values(SETS)) if (s.g.visible) s.update(t, c);
  for (const p of ALL) if (p.visible) p.userData.apply(t);
  const off = OFF[set];
  camera.position.set(pos.x + off, pos.y, pos.z); camera.fov = fov; camera.updateProjectionMatrix(); camera.lookAt(look.x + off, look.y, look.z);
  post.time = t; post.vig = 0.35; post.grain = 0.03; post.bloom = 0.6; post.tint.set(0xffffff);
  renderComposite(scene, camera);
  return renderer.domElement.toDataURL('image/jpeg', 0.9);
};
window.ready = true;
