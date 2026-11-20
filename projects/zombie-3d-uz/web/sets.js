import { THREE, mesh, G, toon, glow, ink, canvasTex, redraw, FONT, makePerson, clamp, lerp, ss } from './engine.js';

export const scene = new THREE.Scene();
scene.background = new THREE.Color(0x9cc8ff);
scene.fog = new THREE.Fog(0x9cc8ff, 30, 140);

const rnd = (() => { let s = 11; return () => (s = (s * 16807) % 2147483647) / 2147483647; })();
const pick = a => a[Math.floor(rnd() * a.length)];
const GM = toon(0xffffff).gradientMap;

function sun(color, inten, pos, size = 20) {
  const l = new THREE.DirectionalLight(color, inten); l.position.copy(pos); l.castShadow = true;
  l.shadow.mapSize.set(2048, 2048); l.shadow.bias = -0.0004; l.shadow.normalBias = 0.04;
  Object.assign(l.shadow.camera, { left: -size, right: size, top: size, bottom: -size, near: 0.5, far: 120 });
  return l;
}
function label(text, w, h, bg, fg, size = 0.8, font = 90) {
  const tex = canvasTex(1024, Math.round(1024 * h / w), (c, W, H) => {
    c.fillStyle = bg; c.fillRect(0, 0, W, H);
    let fs = font; c.font = `${fs}px ${FONT}`; while (c.measureText(text).width > W * 0.9 && fs > 10) { fs -= 4; c.font = `${fs}px ${FONT}`; } c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillStyle = fg; c.fillText(text, W / 2, H / 2 + 4);
  });
  return new THREE.Mesh(G.plane(w, h), new THREE.MeshBasicMaterial({ map: tex, toneMapped: false, color: new THREE.Color(size, size, size) }));
}
const PCOL = [0xe8463a, 0xf2c94c, 0x3a7bff, 0x5ae8a0, 0xff7ad0, 0xff9a3a, 0xffffff, 0x7a4ae8];
// ---- product textures (fictional brands)
function prodTex(kind, bg, fg, name, sub) {
  const cyl = kind === 'can' || kind === 'bottle';
  return canvasTex(cyl ? 512 : 256, 256, (c, w, h) => {
    c.fillStyle = bg; c.fillRect(0, 0, w, h);
    const reps = cyl ? [w * 0.25, w * 0.75] : [w / 2];
    if (kind === 'bottle') { c.fillStyle = 'rgba(255,255,255,0.35)'; c.fillRect(0, 0, w, 50); }
    if (kind === 'can') { c.fillStyle = '#d8d8de'; c.fillRect(0, 0, w, 22); c.fillRect(0, h - 22, w, 22); }
    if (!cyl) { c.fillStyle = 'rgba(255,255,255,0.18)'; c.beginPath(); c.arc(w * 0.75, h * 0.3, 70, 0, 7); c.fill(); }
    for (const cx of reps) {
      const bw = cyl ? 220 : w - 28;
      c.fillStyle = '#ffffff'; c.fillRect(cx - bw / 2, h * 0.36, bw, 72);
      let fs = 52; c.font = `${fs}px ${FONT}`; while (c.measureText(name).width > bw - 14) { fs -= 2; c.font = `${fs}px ${FONT}`; }
      c.fillStyle = fg; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(name, cx, h * 0.36 + 38);
      c.fillStyle = kind === 'milk' ? fg : '#ffffff'; c.font = `26px ${FONT}`; c.fillText(sub, cx, h * 0.8);
    }
  });
}
const KINDS = {
  can: { geo: () => G.cyl(0.11, 0.11, 0.24, 16), y: 0.12, step: 0.26, v: [['#c8282a', '#c8282a', 'LOVIYA', 'konserva'], ['#2a8a3a', '#2a8a3a', "NO'XAT", 'konserva'], ['#e8a020', '#c86a10', 'MAKKA', 'shirin'], ['#3a5ac8', '#3a5ac8', 'BALIQ', 'tuna']] },
  bottle: { geo: () => G.cyl(0.085, 0.09, 0.38, 14), y: 0.19, step: 0.22, v: [['#7ac8f0', '#1a6ab8', 'TOZA SUV', '1.5 L'], ['#8a1a1a', '#c8282a', 'KOLA', '1 L'], ['#f0a020', '#e86a10', 'SHARBAT', 'apelsin'], ['#5ad08a', '#1a8a4a', 'LIMONAD', '1 L']] },
  box: { geo: () => G.box(0.3, 0.42, 0.14), y: 0.21, step: 0.33, v: [['#e8b830', '#c8582a', 'YORMA', 'nonushta'], ['#c8462a', '#c8462a', 'GURUCH', '1 kg'], ['#3a7ad8', '#2a4ab8', 'MAKARON', 'spagetti'], ['#7a4ae8', '#5a2ac8', 'PECHENYE', 'shokoladli']] },
  milk: { geo: () => G.box(0.18, 0.34, 0.18), y: 0.17, step: 0.22, v: [['#f4f4f8', '#2a6ad8', 'SUT', '3.2%'], ['#f4f4f8', '#d84a8a', 'KEFIR', '1 L'], ['#fff4c8', '#c88a10', 'QATIQ', 'tabiiy'], ['#e8f0ff', '#3a8a5a', 'AYRON', '0.5 L']] },
  snack: { geo: () => G.box(0.32, 0.36, 0.12), y: 0.18, step: 0.34, v: [['#e8302a', '#e8302a', 'CHIPS', 'pishloqli'], ['#2a2a30', '#e8b830', 'SHOKOLAD', 'qora'], ['#f07ad0', '#c83aa0', 'KONFET', 'mevali'], ['#f2c94c', '#c87a10', 'KREKER', 'tuzli']] },
};
const TEXC = {};
function kindMat(kind, vi) {
  const k = kind + vi; if (TEXC[k]) return TEXC[k];
  const [bg, fg, name, sub] = KINDS[kind].v[vi];
  return TEXC[k] = new THREE.MeshToonMaterial({ gradientMap: GM, map: prodTex(kind, bg, fg, name, sub) });
}
const tagTex = canvasTex(512, 32, (c, w, h) => { c.fillStyle = '#f4f4f4'; c.fillRect(0, 0, w, h); for (let x = 6; x < w; x += 64) { c.fillStyle = '#f2d02a'; c.fillRect(x, 3, 46, 26); c.fillStyle = '#c8282a'; c.font = `15px ${FONT}`; c.textAlign = 'center'; c.fillText(((5 + (x * 7) % 40) * 1000).toLocaleString('ru').replace(/\s/g, ' '), x + 23, 22); } });
tagTex.wrapS = THREE.RepeatWrapping;
// shelf run along z, centered x,z, length L
function shelfRun(parent, x, z, L, kind = 'box') {
  const H = 2.2, D = 1.1, K = KINDS[kind];
  mesh(G.box(D, 0.15, L), 0xdfe3ea, x, 0.08, z, parent, { th: 0.02 });
  mesh(G.box(0.12, H, L), 0xb8bec8, x, H / 2, z, parent, { th: 0.02 });
  const tm = new THREE.MeshToonMaterial({ gradientMap: GM, map: tagTex.clone() }); tm.map.wrapS = THREE.RepeatWrapping; tm.map.repeat.set(L / 2.5, 1); tm.map.needsUpdate = true;
  for (let r = 1; r <= 4; r++) {
    mesh(G.box(D, 0.05, L), 0xe8ecf2, x, r * H / 4.6, z, parent, { ink: false });
    for (const s of [-1, 1]) { const tg = new THREE.Mesh(G.plane(L, 0.07), tm); tg.position.set(x + s * (D / 2 + 0.005), r * H / 4.6 - 0.03, z); tg.rotation.y = s * Math.PI / 2; parent.add(tg); }
  }
  for (const zz of [-L / 2, L / 2]) mesh(G.box(D + 0.05, H, 0.08), 0xc8ced8, x, H / 2, z + zz, parent, { th: 0.015 });
  const n = Math.floor((L - 0.3) / K.step);
  const groups = [];
  const slots = [];
  for (const side of [-1, 1]) for (let r = 0; r < 4; r++) {
    const vi = Math.floor(rnd() * 4);
    const inst = new THREE.InstancedMesh(K.geo(), kindMat(kind, vi), n * (kind === 'bottle' || kind === 'can' || kind === 'milk' ? 2 : 1));
    inst.castShadow = true; inst.receiveShadow = true;
    const m4 = new THREE.Matrix4(); let k = 0;
    const rows = inst.count / n;
    for (let d = 0; d < rows; d++) for (let i = 0; i < n; i++) {
      const pos = [x + side * (0.22 + d * 0.24), r * H / 4.6 + 0.025 + K.y, z - L / 2 + 0.25 + i * K.step];
      const rot = side > 0 ? Math.PI / 2 : -Math.PI / 2;
      m4.makeRotationY(rot).setPosition(...pos); inst.setMatrixAt(k, m4); slots.push({ inst, k, pos, rot, keep: rnd() }); k++;
    }
    parent.add(inst); groups.push(inst);
  }
  let lastF = -1; const m4 = new THREE.Matrix4();
  return {
    groups, setFill(f) {
      if (Math.abs(f - lastF) < 0.01) return; lastF = f;
      for (const s of slots) { if (s.keep > f) m4.makeScale(0, 0, 0); else m4.makeRotationY(s.rot).setPosition(...s.pos); s.inst.setMatrixAt(s.k, m4); }
      for (const gI of groups) gI.instanceMatrix.needsUpdate = true;
    }
  };
}
// cardboard box material
const cardTex = (txt) => canvasTex(256, 256, (c, w, h) => {
  c.fillStyle = '#c89a62'; c.fillRect(0, 0, w, h); c.fillStyle = 'rgba(0,0,0,0.06)'; for (let i = 0; i < 30; i++) c.fillRect(0, i * 9, w, 2);
  c.fillStyle = '#d8c8a0'; c.fillRect(w / 2 - 22, 0, 44, h); c.strokeStyle = '#6a4a2a'; c.lineWidth = 4; c.strokeRect(10, 10, w - 20, h - 20);
  c.fillStyle = '#5a3a1a'; c.font = `34px ${FONT}`; c.textAlign = 'center'; c.fillText(txt, w / 2, 90);
  c.font = `20px ${FONT}`; c.fillText('MEGA MART', w / 2, 200); c.beginPath(); c.moveTo(40, 160); c.lineTo(60, 130); c.lineTo(80, 160); c.fill(); c.beginPath(); c.moveTo(176, 160); c.lineTo(196, 130); c.lineTo(216, 160); c.fill();
});
export const CARD = ['KONSERVA', 'SUV', 'GURUCH', 'UN', 'SHAKAR'].map(t => new THREE.MeshToonMaterial({ gradientMap: GM, map: cardTex(t) }));

export function makeCart(parent, x = 0, z = 0, ry = 0) {
  const g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = ry;
  const wire = toon(0xc8d0dc);
  mesh(G.box(0.62, 0.5, 0.95), new THREE.MeshToonMaterial({ color: 0xc8d0dc, gradientMap: GM, transparent: true, opacity: 0.55 }), 0, 0.75, 0, g, { th: 0.012 });
  mesh(G.box(0.62, 0.04, 0.95), wire, 0, 0.5, 0, g, { th: 0.01 });
  mesh(G.box(0.66, 0.06, 0.06), 0xe0402a, 0, 1.08, -0.5, g, { th: 0.01 });
  for (const [a, b] of [[-0.26, 0.4], [0.26, 0.4], [-0.26, -0.4], [0.26, -0.4]]) { mesh(G.cyl(0.02, 0.02, 0.45, 6), wire, a, 0.27, b, g, { ink: false }); const w = mesh(G.cyl(0.06, 0.06, 0.04, 10), 0x222228, a, 0.06, b, g, { th: 0.008 }); w.rotation.z = Math.PI / 2; }
  if (parent) parent.add(g); return g;
}
export function makeCar(col) {
  const g = new THREE.Group();
  mesh(G.rbox(2.1, 0.55, 4.0, 0.15), col, 0, 0.55, 0, g, { th: 0.03 });
  mesh(G.rbox(1.8, 0.5, 2.0, 0.12), 0x9fc4ff, 0, 1.05, -0.2, g, { th: 0.03 });
  mesh(G.rbox(1.84, 0.12, 2.04, 0.05), col, 0, 1.32, -0.2, g, { th: 0.02 });
  for (const [x, z] of [[-1, 1.3], [1, 1.3], [-1, -1.3], [1, -1.3]]) { const w = mesh(G.cyl(0.36, 0.36, 0.28, 18), 0x111116, x, 0.36, z, g, { th: 0.02 }); w.rotation.z = Math.PI / 2; }
  return g;
}
export function makeTruck() {
  const g = new THREE.Group();
  const box = mesh(G.rbox(2.5, 2.6, 5.2, 0.08), 0xf2f2f6, 0, 2.0, -1.2, g, { th: 0.035 });
  const lt = label('EXPRESS', 4.6, 0.9, '#f2f2f6', '#e0402a', 1, 150); lt.position.set(1.26, 2.2, -1.2); lt.rotation.y = Math.PI / 2; g.add(lt);
  const lt2 = lt.clone(); lt2.position.x = -1.26; lt2.rotation.y = -Math.PI / 2; g.add(lt2);
  mesh(G.rbox(2.4, 1.8, 1.9, 0.15), 0x2a6ad8, 0, 1.45, 2.4, g, { th: 0.03 });
  mesh(G.rbox(2.2, 0.75, 0.1, 0.04), 0x9fd0ff, 0, 1.9, 3.36, g, { th: 0.015 });
  for (const s of [-1, 1]) mesh(G.box(0.06, 0.6, 1.0), 0x9fd0ff, 1.21 * s, 1.85, 2.45, g, { ink: false });
  mesh(G.box(2.5, 0.4, 7.2), 0x2a2a30, 0, 0.6, -0.2, g, { ink: false });
  for (const [x, z] of [[-1.1, 2.4], [1.1, 2.4], [-1.1, -2.2], [1.1, -2.2], [-1.1, -3.1], [1.1, -3.1]]) { const w = mesh(G.cyl(0.48, 0.48, 0.34, 18), 0x111116, x, 0.48, z, g, { th: 0.02 }); w.rotation.z = Math.PI / 2; }
  const hls = [];
  for (const x of [-0.8, 0.8]) { const hl = new THREE.Mesh(G.box(0.4, 0.22, 0.05), glow(0xfff1c4, 3)); hl.position.set(x, 0.95, 3.36); g.add(hl); hls.push(hl); }
  const beam = new THREE.Mesh(new THREE.ConeGeometry(1.6, 9, 20, 1, true), new THREE.MeshBasicMaterial({ color: 0xfff0c0, transparent: true, opacity: 0.0, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide }));
  beam.rotation.x = -Math.PI / 2; beam.position.set(0, 0.95, 7.8); g.add(beam);
  g.userData = { beam, hls };
  return g;
}

// ---------------------------------------------------------------- cast
const ZC = [[0x6a8a4a, 0x5a6a7a, 0x3a3a4a], [0x7a9a5a, 0x8a4a3a, 0x2a3040], [0x6a8a5a, 0xc8b8a0, 0x4a3a2a], [0x5a7a4a, 0x3a5a8a, 0x2a2a2a], [0x7a8a5a, 0x8a8a3a, 0x3a3020], [0x6a9060, 0xa04a6a, 0x2a2a3a]];
export const CAST = {
  sardor: makePerson({ top: 0x18a3a0, puffer: true, beanie: 0xf07a1a, hair: 0x2a1a10, skin: 0xf0c49c, pants: 0x2a3550 }),
  mom: makePerson({ top: 0xd8506a, hair: 0x3a2010, longHair: true, skin: 0xe8b890, pants: 0x3a3a5a }),
  girl: makePerson({ top: 0xf2c94c, hair: 0x5a3010, pony: true, skin: 0xf0c8a0, pants: 0x4a6ad8, scale: 0.48 }),
  old: makePerson({ top: 0x8a7a6a, hair: 0xd8d8de, beard: true, skin: 0xe0b090, pants: 0x4a4038 }),
  teen1: makePerson({ top: 0x3a9a4a, hair: 0x1a1210, skin: 0xc8946a, pants: 0x222a3a, scale: 0.68 }),
  teen2: makePerson({ top: 0x4a5ad8, hair: 0x4a2a10, skin: 0xd8a47c, pants: 0x2a2a3a, scale: 0.66 }),
  staff: makePerson({ top: 0xf4f4f4, vest: 0xd83a2a, hair: 0x1a1210, skin: 0xd9a47c, pants: 0x2a2a34 }),
  jacket: makePerson({ top: 0x1a1a22, coat: false, hair: 0x101010, skin: 0xe0b48c, pants: 0x18181e }),
};
CAST.zteen = makePerson({ zombie: true, top: 0x3a9a4a, hair: 0x1a1210, skin: 0x7a9a5a, pants: 0x222a3a, scale: 0.68, blood: true });
export function makeBat() { const b = new THREE.Group(); mesh(G.cyl(0.035, 0.06, 0.9, 10), 0xb8bcc8, 0, -0.45, 0, b, { th: 0.01 }); return b; }
export function makePhone() {
  const g = new THREE.Group();
  mesh(G.rbox(0.36, 0.72, 0.05, 0.02), 0x15151c, 0, 0, 0, g, { th: 0.008 });
  const tex = canvasTex(360, 720, () => {});
  const scr = new THREE.Mesh(G.plane(0.33, 0.67), new THREE.MeshBasicMaterial({ map: tex, toneMapped: false })); scr.position.z = 0.027; g.add(scr);
  g.userData = { tex, state: '' };
  g.userData.show = (state, a = {}) => {
    const key = state + JSON.stringify(a); if (g.userData.state === key) return; g.userData.state = key;
    redraw(tex, (c, w, h) => {
      const gr = c.createLinearGradient(0, 0, 0, h);
      if (state === 'call') { gr.addColorStop(0, '#1d3a2a'); gr.addColorStop(1, '#05140c'); } else { gr.addColorStop(0, '#2a3a9a'); gr.addColorStop(1, '#5b1f8a'); }
      c.fillStyle = gr; c.fillRect(0, 0, w, h); c.textAlign = 'center'; c.fillStyle = '#fff';
      if (state === 'nosig') {
        c.font = `90px ${FONT}`; c.fillText('12:47', w / 2, 230);
        c.fillStyle = 'rgba(0,0,0,.35)'; c.fillRect(30, 330, w - 60, 140); c.fillStyle = '#ff5a5a'; c.font = `40px ${FONT}`; c.fillText("ALOQA YO'Q", w / 2, 395); c.fillStyle = '#fff'; c.font = `24px ${FONT}`; c.fillText('Tarmoq topilmadi', w / 2, 440);
        for (let i = 0; i < 4; i++) { c.fillStyle = 'rgba(255,255,255,.35)'; c.fillRect(30 + i * 14, 40 - i * 6, 10, 10 + i * 6); } c.strokeStyle = '#ff5a5a'; c.lineWidth = 5; c.beginPath(); c.moveTo(26, 22); c.lineTo(88, 54); c.stroke();
      } else if (state === 'call') {
        c.font = `26px ${FONT}`; c.globalAlpha = .75; c.fillText(a.talk ? "Qo'ng'iroq  " + a.talk : "Kiruvchi qo'ng'iroq", w / 2, 120); c.globalAlpha = 1;
        c.font = `42px ${FONT}`; c.fillText("NOMA'LUM", w / 2, 210); c.fillText('RAQAM', w / 2, 260);
        c.beginPath(); c.arc(w / 2, 400, 72, 0, 7); c.fillStyle = '#2a5a3a'; c.fill(); c.font = `84px ${FONT}`; c.fillStyle = '#fff'; c.fillText('?', w / 2, 430);
        if (!a.talk) { c.beginPath(); c.arc(90, 610, 42, 0, 7); c.fillStyle = '#e53950'; c.fill(); c.beginPath(); c.arc(270, 610, 42, 0, 7); c.fillStyle = '#2ecc71'; c.fill(); }
        else { c.beginPath(); c.arc(w / 2, 610, 42, 0, 7); c.fillStyle = '#e53950'; c.fill(); }
      }
    });
  };
  g.userData.show('nosig');
  return g;
}
export const ZOMBIES = [];
for (let i = 0; i < 36; i++) {
  const c = ZC[i % ZC.length];
  const z = makePerson({ zombie: true, skin: c[0], top: c[1], pants: c[2], hair: pick([0x1a1210, 0x3a2a1a, 0x5a5a5a, 0x2a1a0a]), blood: rnd() < 0.6, scale: 0.7 + rnd() * 0.08 });
  z.userData.seed = rnd() * 10; ZOMBIES.push(z);
}
export function zpose(z, t, walk = 0) {
  const st = z.userData.state, sd = z.userData.seed;
  Object.assign(st, { armUp: [1.35 + Math.sin(t * 2 + sd) * 0.12, 1.25 + Math.sin(t * 2.3 + sd) * 0.12], armOut: [0.15, 0.15], lean: 0.18, headPitch: 0.15 + Math.sin(t * 1.3 + sd) * 0.08, headYaw: Math.sin(t * 0.8 + sd) * 0.25, talk: 0.5 + 0.5 * Math.sin(t * 3 + sd), eyeS: 1, brow: -1, blink: 0 });
  st.walk = walk; st.walkAmt = walk ? 0.7 : 0;
}

// ---------------------------------------------------------------- LOT (origin 0): parking lot + store front
export const LOT = (() => {
  const g = new THREE.Group(); scene.add(g);
  mesh(G.box(160, 0.2, 140), 0x5a5e68, 0, -0.1, 20, g, { ink: false });
  for (let i = -6; i <= 6; i++) for (const zz of [6, 18]) mesh(G.box(0.12, 0.01, 5), 0xf0f0f0, i * 3.2, 0.01, zz, g, { ink: false });
  mesh(G.box(160, 0.22, 6), 0x9a9aa4, 0, 0, -6.5, g, { ink: false }); // sidewalk
  // store building
  const B = new THREE.Group(); B.position.z = -10; g.add(B);
  mesh(G.box(44, 9, 24), 0xe8e2d6, 0, 4.5, -12, B, { th: 0.04 });
  mesh(G.box(44.4, 1.2, 24.4), 0x2a5ad8, 0, 9.2, -12, B, { th: 0.03 });
  const sg = label('MEGA MART', 14, 2.6, '#2a5ad8', '#ffffff', 1.2, 200); sg.position.set(0, 7.3, 0.12); B.add(sg);
  const sgBack = mesh(G.box(14.4, 3.0, 0.2), 0x1a3a9a, 0, 7.3, 0.0, B, { th: 0.02 });
  // glass front with interior glow
  const glassMat = new THREE.MeshBasicMaterial({ color: 0xbfe4ff, toneMapped: false });
  const interior = new THREE.Mesh(G.plane(30, 4.6), glassMat); interior.position.set(0, 2.4, 0.06); B.add(interior);
  for (let x = -15; x <= 15; x += 2.5) mesh(G.box(0.18, 4.8, 0.2), 0x3a3f4a, x, 2.4, 0.1, B, { th: 0.01 });
  mesh(G.box(30.4, 0.25, 0.3), 0x3a3f4a, 0, 4.85, 0.1, B, { th: 0.01 });
  // interior silhouettes behind glass (shelves)
  const shelfS = new THREE.Mesh(G.plane(30, 2.0), new THREE.MeshBasicMaterial({ color: 0x8aa8c8, toneMapped: false, transparent: true, opacity: 0.6 })); shelfS.position.set(0, 1.1, 0.07); B.add(shelfS);
  const doorL = mesh(G.box(1.5, 3.2, 0.08), new THREE.MeshBasicMaterial({ color: 0x8ab8e0, transparent: true, opacity: 0.85 }), -0.78, 1.6, 0.3, B, { th: 0.01 });
  const doorR = mesh(G.box(1.5, 3.2, 0.08), new THREE.MeshBasicMaterial({ color: 0x8ab8e0, transparent: true, opacity: 0.85 }), 0.78, 1.6, 0.3, B, { th: 0.01 });
  // lamp posts
  const lamps = [];
  for (const [x, z] of [[-12, 4], [12, 4], [-12, 22], [12, 22], [0, 30]]) {
    mesh(G.cyl(0.12, 0.16, 7, 10), 0x3a3f4a, x, 3.5, z, g, { th: 0.015 });
    mesh(G.box(1.4, 0.2, 0.5), 0x3a3f4a, x, 7, z, g, { th: 0.015 });
    const bulb = new THREE.Mesh(G.box(1.1, 0.06, 0.35), glow(0xfff2c8, 2)); bulb.position.set(x, 6.88, z); g.add(bulb); lamps.push(bulb);
  }
  // cars
  const cars = [];
  for (const [x, z, ry, c] of [[-9.6, 6, 0.05, 0xd83a3a], [-3.2, 18, 3.1, 0x3a7ad8], [6.4, 6, -0.1, 0xf2c94c], [12.8, 18, 3.2, 0xffffff], [-16, 18, 2.9, 0x4ab06a], [3.2, 18, 0.3, 0x7a4ae8], [16, 6, 0.0, 0x2a2a34], [-6.4, 26, 1.2, 0xe88a3a]]) {
    const car = makeCar(c); car.position.set(x, 0, z); car.rotation.y = ry; g.add(car); cars.push(car);
  }
  const truck = makeTruck(); truck.position.set(-20, 0, 2); truck.rotation.y = Math.PI / 2 * 0; g.add(truck);
  // trees + far houses for horizon
  for (let i = 0; i < 22; i++) {
    const x = -70 + i * 6.5 + rnd() * 2, z = 52 + rnd() * 10;
    mesh(G.cyl(0.25, 0.3, 2.4, 8), 0x6a4a2a, x, 1.2, z, g, { th: 0.02 });
    mesh(G.sph(1.8 + rnd(), 14, 10), 0x3a8a4a, x, 3.4, z, g, { th: 0.03 });
  }
  // sky objects
  const sunM = new THREE.Mesh(G.sph(5, 24, 16), glow(0xfff4c8, 1.6)); sunM.position.set(-40, 50, -120); g.add(sunM);
  const moon = new THREE.Mesh(G.sph(3.5, 24, 16), glow(0xe8f0ff, 1.3)); moon.position.set(30, 40, -110); g.add(moon);
  const stars = new THREE.Points(new THREE.BufferGeometry().setAttribute('position', new THREE.Float32BufferAttribute(Array.from({ length: 900 }, (_, i) => i % 3 === 1 ? 20 + rnd() * 80 : i % 3 === 0 ? -150 + rnd() * 300 : -130 + rnd() * 30), 3)), new THREE.PointsMaterial({ color: 0xffffff, size: 0.6 }));
  g.add(stars);
  const hemi = new THREE.HemisphereLight(0xd8ecff, 0x6a6a70, 1.6); g.add(hemi);
  const sl = sun(0xfff0d8, 2.6, new THREE.Vector3(-14, 30, 18), 34); sl.target.position.set(0, 0, 8); g.add(sl, sl.target);
  return {
    g, B, cars, truck, doorL, doorR, interior,
    update(t, c) {
      const night = c.tod === 'night', dusk = c.tod === 'dusk';
      scene.background.set(night ? 0x0d1430 : dusk ? 0xf0a878 : 0x9cc8ff); scene.fog.color.copy(scene.background);
      scene.fog.near = 30; scene.fog.far = night ? 90 : 160;
      hemi.intensity = night ? 0.75 : dusk ? 1.2 : 1.6; hemi.color.set(night ? 0x6a7ab8 : dusk ? 0xffc8a8 : 0xd8ecff);
      sl.intensity = night ? 0.55 : dusk ? 1.8 : 2.6; sl.color.set(night ? 0x8aa0ff : dusk ? 0xffa868 : 0xfff0d8);
      sunM.visible = !night; moon.visible = night; stars.visible = night;
      for (const l of lamps) l.material.color.setRGB(...(night ? [3, 2.7, 2] : [0.6, 0.6, 0.55]));
      glassMat.color.set(c.storeDark ? 0x2a3040 : night ? 0xd8ecff : 0xbfe4ff);
      const o = c.doorOpen ?? 0; doorL.position.x = -0.78 - o * 1.4; doorR.position.x = 0.78 + o * 1.4;
      truck.userData.beam.material.opacity = c.truckLights ? 0.09 : 0;
    },
  };
})();

// ---------------------------------------------------------------- STORE (origin 200): interior
export const STORE = (() => {
  const g = new THREE.Group(); g.position.x = 200; scene.add(g);
  const floorTex = canvasTex(512, 512, (c, w, h) => { c.fillStyle = '#e4e2dc'; c.fillRect(0, 0, w, h); c.strokeStyle = '#cfccc4'; c.lineWidth = 3; for (let i = 0; i <= 8; i++) { c.beginPath(); c.moveTo(i * 64, 0); c.lineTo(i * 64, h); c.stroke(); c.beginPath(); c.moveTo(0, i * 64); c.lineTo(w, i * 64); c.stroke(); } });
  floorTex.wrapS = floorTex.wrapT = THREE.RepeatWrapping; floorTex.repeat.set(8, 10);
  mesh(G.box(34, 0.2, 42), toon(0xffffff, { map: floorTex }), 0, -0.1, 0, g, { ink: false });
  mesh(G.box(34, 6.4, 0.3), 0xe8e4da, 0, 3.2, -21, g, { ink: false });
  mesh(G.box(0.3, 6.4, 42), 0xdcd6c8, -17, 3.2, 0, g, { ink: false });
  mesh(G.box(0.3, 6.4, 42), 0xdcd6c8, 17, 3.2, 0, g, { ink: false });
  mesh(G.box(34, 0.3, 42), 0xf4f2ee, 0, 6.4, 0, g, { ink: false });
  mesh(G.box(34, 0.6, 0.32), 0x2a5ad8, 0, 5.0, -20.8, g, { ink: false });
  // front glass wall at z=21
  const glassM = new THREE.MeshBasicMaterial({ color: 0xcfeaff, transparent: true, opacity: 0.16, depthWrite: false });
  const glass = new THREE.Mesh(G.plane(34, 5.2), glassM); glass.position.set(0, 2.6, 21); g.add(glass);
  for (let x = -17; x <= 17; x += 2.5) mesh(G.box(0.18, 5.2, 0.22), 0x3a3f4a, x, 2.6, 21, g, { th: 0.01 });
  mesh(G.box(34, 0.3, 0.3), 0x3a3f4a, 0, 5.2, 21, g, { th: 0.01 }); mesh(G.box(34, 1.2, 0.3), 0xe8e4da, 0, 5.8, 21, g, { ink: false });
  const crackTex = canvasTex(1024, 512, (c, w, h) => {
    c.clearRect(0, 0, w, h); c.strokeStyle = 'rgba(255,255,255,0.9)'; c.lineWidth = 2.5;
    for (const [cx, cy] of [[300, 250], [560, 200], [760, 300]]) for (let k = 0; k < 14; k++) { const a = k / 14 * 6.28 + Math.random() * 0.3; c.beginPath(); c.moveTo(cx, cy); let x = cx, y = cy; for (let s = 0; s < 6; s++) { x += Math.cos(a + (Math.random() - .5) * .6) * 28; y += Math.sin(a + (Math.random() - .5) * .6) * 28; c.lineTo(x, y); } c.stroke(); }
    for (const [cx, cy] of [[300, 250], [560, 200], [760, 300]]) for (let r = 30; r < 120; r += 35) { c.beginPath(); c.arc(cx, cy, r, 0, 6.28); c.stroke(); }
  });
  const cracks = new THREE.Mesh(G.plane(14, 7), new THREE.MeshBasicMaterial({ map: crackTex, transparent: true, depthWrite: false, toneMapped: false })); cracks.position.set(0, 2.6, 20.94); cracks.rotation.y = Math.PI; g.add(cracks);
  const doorM = new THREE.MeshBasicMaterial({ color: 0xbfe0ff, transparent: true, opacity: 0.3, depthWrite: false });
  // outside ground + backdrop
  mesh(G.box(120, 0.2, 60), 0x5a5e68, 0, -0.12, 52, g, { ink: false });
  for (let i = -6; i <= 6; i++) mesh(G.box(0.12, 0.01, 5), 0xf0f0f0, i * 3.2, 0.01, 34, g, { ink: false });
  const outCars = [];
  for (const [x, z, c] of [[-9, 34, 0xd83a3a], [5, 34, 0xf2c94c], [12, 40, 0x3a7ad8], [-4, 44, 0xffffff]]) { const car = makeCar(c); car.position.set(x, 0, z); car.rotation.y = rnd() * 0.4; g.add(car); outCars.push(car); }
  for (let i = 0; i < 14; i++) { const x = -40 + i * 6, z = 70; mesh(G.sph(2.5, 12, 8), 0x3a8a4a, x, 3, z, g, { th: 0.03 }); }
  // aisles
  const aisles = [];
  [['can', -12], ['bottle', -7], ['box', -2], ['milk', 3], ['snack', 8]].forEach(([k, x]) => aisles.push(shelfRun(g, x, -5, 18, k)));
  // aisle hanging signs
  const names = ['KONSERVA', 'ICHIMLIK', 'YORMA', 'SUT', 'SHIRINLIK'];
  [-9.5, -4.5, 0.5, 5.5, 10.5].forEach((x, i) => { const s = label(names[i], 2.6, 0.6, '#2a5ad8', '#ffffff', 1.1, 110); s.position.set(x, 4.6, 4.2); g.add(s); const s2 = s.clone(); s2.rotation.y = Math.PI; s2.position.z = 4.18; g.add(s2); });
  // freezers on back wall
  const frGlow = [];
  for (const x of [-12, -6, 0, 6, 12]) { mesh(G.box(5.4, 2.4, 1.0), 0xe8eef6, x, 1.2, -20.2, g, { th: 0.02 }); const f = new THREE.Mesh(G.plane(5.0, 1.9), glow(0xbfeaff, 1.1)); f.position.set(x, 1.3, -19.68); g.add(f); frGlow.push(f); }
  // produce stand right side
  mesh(G.box(3, 0.9, 10), 0x9a6a3a, 14, 0.45, -4, g, { th: 0.02 });
  const fruits = new THREE.InstancedMesh(G.sph(0.14, 10, 8), new THREE.MeshToonMaterial({ gradientMap: GM }), 300); { const m4 = new THREE.Matrix4(), col = new THREE.Color(); for (let i = 0; i < 300; i++) { m4.makeTranslation(12.7 + rnd() * 2.6, 0.98 + rnd() * 0.1, -8.8 + rnd() * 9.6); fruits.setMatrixAt(i, m4); fruits.setColorAt(i, col.set(pick([0xe8463a, 0xf2c94c, 0x5ab84a, 0xff9a3a]))); } } g.add(fruits);
  // checkouts near entrance
  const regs = [];
  for (const x of [-11, -6, -1, 4]) {
    mesh(G.rbox(1.0, 1.0, 3.2, 0.05), 0x3a3f4a, x, 0.5, 12.5, g, { th: 0.02 });
    mesh(G.box(0.9, 0.04, 2.4), 0x1a1a1a, x, 1.02, 12.3, g, { ink: false });
    regs.push(mesh(G.rbox(0.45, 0.35, 0.4, 0.04), 0x2a2a34, x + 0.2, 1.2, 13.6, g, { th: 0.012 }));
    const lamp = new THREE.Mesh(G.cyl(0.1, 0.1, 0.25, 10), glow(0x5ae86a, 2)); lamp.position.set(x - 0.4, 2.0, 13.9); g.add(lamp);
    mesh(G.cyl(0.03, 0.03, 0.9, 6), 0x3a3f4a, x - 0.4, 1.45, 13.9, g, { ink: false });
  }
  // carts: parked row + barricade set
  const parked = []; for (let i = 0; i < 6; i++) parked.push(makeCart(g, 11 + i * 0.25, 16 + i * 0.05, Math.PI / 2));
  const barricade = []; for (let i = 0; i < 14; i++) { const ct = makeCart(g, -4 + (i % 7) * 1.2, 19.8 - Math.floor(i / 7) * 1.1, (rnd() - .5) * 0.5 + Math.PI); barricade.push(ct); }
  const boxesBar = []; for (let i = 0; i < 10; i++) boxesBar.push(mesh(G.box(0.8, 0.6, 0.6), pick(CARD), -4.5 + (i % 5) * 2, 1.5 + Math.floor(i / 5) * 0.62, 19.9, g, { th: 0.015 }));
  // ceiling light panels
  const panels = [];
  for (let x = -12; x <= 12; x += 6) for (let z = -16; z <= 16; z += 6) { const p = new THREE.Mesh(G.box(3, 0.06, 0.5), glow(0xffffff, 2.2)); p.position.set(x, 6.22, z); g.add(p); panels.push(p); }
  // red emergency lights
  const reds = [];
  for (const [x, z] of [[-16.7, -10], [16.7, -10], [-16.7, 8], [16.7, 8], [0, -20.7]]) { const r = new THREE.Mesh(G.box(0.4, 0.25, 0.3), glow(0xff2020, 2)); r.position.set(x, 5.2, z); g.add(r); reds.push(r); }
  const redL = new THREE.PointLight(0xff2a2a, 0, 40, 1.4); redL.position.set(0, 5, -4); g.add(redL);
  const redL2 = new THREE.PointLight(0xff2a2a, 0, 30, 1.4); redL2.position.set(0, 4, 14); g.add(redL2);
  for (const [t, bg, fg, x, z, ry] of [['AKSIYA -50%', '#e8302a', '#ffffff', -16.82, -2, Math.PI / 2], ['HAR KUNI ARZON', '#f2c94c', '#2a5ad8', -16.82, 10, Math.PI / 2], ['YANGI HOSIL', '#3a9a4a', '#ffffff', 16.82, 0, -Math.PI / 2], ['XUSH KELIBSIZ!', '#2a5ad8', '#ffffff', 0, -20.82, 0]]) { const ps = label(t, 5, 1.2, bg, fg, 1.15, 140); ps.position.set(x, 3.6, z); ps.rotation.y = ry; g.add(ps); }
  const wet = new THREE.Group(); wet.position.set(-4.5, 0, 6); wet.rotation.y = 0.6; g.add(wet);
  for (const s2 of [-1, 1]) { const pnl = mesh(G.box(0.5, 0.75, 0.03), 0xf2d02a, 0, 0.36, s2 * 0.12, wet, { th: 0.01 }); pnl.rotation.x = s2 * 0.3; }
  const wl = label("HO'L POL!", 0.45, 0.2, '#f2d02a', '#1a1a1a', 1, 150); wl.position.set(0, 0.45, 0.25); wl.rotation.x = -0.3; wet.add(wl);
  // spilled items on floor (shown later days)
  const spill = []; for (let i = 0; i < 26; i++) { const kk = pick(['can', 'box', 'bottle', 'snack']); const m = new THREE.Mesh(KINDS[kk].geo(), kindMat(kk, Math.floor(rnd() * 4))); m.position.set(-12 + rnd() * 22, 0.1, -12 + rnd() * 16); m.rotation.set(Math.PI / 2, rnd() * 6, 0); m.castShadow = true; g.add(m); spill.push(m); }
  // loading dock door (side wall, back right)
  const dockHole = new THREE.Mesh(G.plane(4, 3.6), new THREE.MeshBasicMaterial({ color: 0x0a0c14 })); dockHole.position.set(16.84, 1.8, -15); dockHole.rotation.y = -Math.PI / 2; g.add(dockHole);
  const dock = new THREE.Group(); dock.position.set(16.75, 3.6, -15); g.add(dock);
  mesh(G.box(0.1, 3.6, 4), 0x8a8e98, 0, -1.8, 0, dock, { th: 0.02 });
  for (let y = 0.3; y < 3.6; y += 0.35) mesh(G.box(0.12, 0.04, 4), 0x6a6e78, -0.03, -3.6 + y, 0, dock, { ink: false });
  const exitS = label('CHIQISH', 1.6, 0.5, '#1a8a3a', '#ffffff', 2, 150); exitS.position.set(16.8, 3.95, -15); exitS.rotation.y = -Math.PI / 2; g.add(exitS);
  // storage door on back wall
  mesh(G.box(2, 3, 0.2), 0x9a7a5a, -15, 1.5, -20.8, g, { th: 0.02 });
  const sl2 = label('OMBOR', 1.6, 0.45, '#3a3f4a', '#ffffff', 1.4, 140); sl2.position.set(-15, 3.35, -20.82); g.add(sl2);
  // office window up high above back
  const offW = new THREE.Mesh(G.plane(6, 1.5), glow(0xfff0c8, 0.9)); offW.position.set(10, 4.9, -20.82); g.add(offW);
  // lighting
  const hemi = new THREE.HemisphereLight(0xffffff, 0x9a948a, 1.7); g.add(hemi);
  const key = sun(0xfff8ee, 1.8, new THREE.Vector3(6, 14, 10), 24); key.target.position.set(0, 0, 0); g.add(key, key.target);
  const outL = sun(0xfff0d8, 1.2, new THREE.Vector3(-10, 20, 50), 30); outL.target.position.set(0, 0, 30); outL.castShadow = false; g.add(outL, outL.target);
  const fl = new THREE.PointLight(0xffffff, 0, 14, 1.6); g.add(fl); // flashlight
  return {
    g, aisles, barricade, boxesBar, cracks, glass, outCars, fl, spill, dock,
    update(t, c) {
      const on = c.lights !== 'off';
      const night = c.tod === 'night';
      scene.background.set(night ? 0x0d1430 : 0x9cc8ff); scene.fog.color.set(night ? 0x0d1430 : 0xcfe0f0); scene.fog.near = 25; scene.fog.far = night ? 70 : 140;
      hemi.intensity = on ? (night ? 1.35 : 1.7) : 0.32; hemi.color.set(on ? 0xffffff : 0x8a90c8);
      key.intensity = on ? (night ? 1.4 : 1.8) : 0.08;
      outL.intensity = night ? 0.25 : 1.2;
      for (const p of panels) p.material.color.setRGB(...(on ? [2.2, 2.2, 2.1] : [0.15, 0.15, 0.16]));
      for (const f of frGlow) f.material.color.setRGB(...(on ? [1.0, 1.25, 1.4] : [0.05, 0.06, 0.08]));
      const rp = c.red ? 0.5 + 0.5 * Math.sin(t * 6) : 0;
      for (const r of reds) r.material.color.setRGB(c.red ? 1 + 2.5 * rp : 0.5, 0.08, 0.08);
      redL.intensity = c.red ? 30 * rp : 0; redL2.intensity = c.red ? 20 * rp : 0;
      for (const a of aisles) a.setFill(c.food ?? 1);
      spill.forEach((m, i) => m.visible = (c.food ?? 1) < 0.85 && i < (1 - (c.food ?? 1)) * 40);
      const bn = c.barricade ?? 0; barricade.forEach((b, i) => b.visible = i < bn * barricade.length); boxesBar.forEach((b, i) => b.visible = bn >= 1 && i < (c.boxes ?? 0) * boxesBar.length);
      cracks.visible = !!c.cracks; cracks.material.opacity = c.cracks || 0;
      dock.scale.y = 1 - (c.dock ?? 0) * 0.92;
      glass.visible = !c.broken; if (c.broken) { cracks.visible = false; barricade.forEach((b, i) => { b.rotation.x = (i % 3 - 1) * 0.6 + 1.2 * Math.min(1, c.broken); b.position.y = 0.3; }); boxesBar.forEach((b, i) => { b.position.y = 0.3; b.rotation.z = i; }); }
      fl.intensity = c.flash ? 25 : 0; if (c.flashPos) fl.position.copy(c.flashPos);
    },
  };
})();

// ---------------------------------------------------------------- BACK (origin 400): storage room, office, tunnel
export const BACK = (() => {
  const g = new THREE.Group(); g.position.x = 400; scene.add(g);
  // storage room x[-8,8] z[-8,8]
  mesh(G.box(16, 0.2, 16), 0x8a8a90, 0, -0.1, 0, g, { ink: false });
  mesh(G.box(16, 4.4, 0.3), 0xb8b0a0, 0, 2.2, -8, g, { ink: false });
  mesh(G.box(0.3, 4.4, 16), 0xa8a090, -8, 2.2, 0, g, { ink: false });
  mesh(G.box(0.3, 4.4, 16), 0xa8a090, 8, 2.2, 0, g, { ink: false });
  mesh(G.box(16, 0.3, 16), 0x8a8478, 0, 4.4, 0, g, { ink: false });
  mesh(G.box(16, 4.4, 0.3), 0xb8b0a0, 0, 2.2, 8, g, { ink: false });
  // metal racks with boxes
  const crates = [];
  for (const x of [-5.5, 5.5]) for (const z of [-5, 0]) {
    for (const y of [0.05, 1.3, 2.55]) mesh(G.box(2.2, 0.08, 3.4), 0x6a7a8a, x, y, z, g, { th: 0.012 });
    for (const [a, b] of [[-1, -1.6], [1, -1.6], [-1, 1.6], [1, 1.6]]) mesh(G.box(0.08, 3.6, 0.08), 0x4a5a6a, x + a, 1.8, z + b, g, { ink: false });
    for (const y of [0.1, 1.35, 2.6]) for (let i = 0; i < 3; i++) crates.push(mesh(G.box(1.8, 0.9, 0.95), pick(CARD), x, y + 0.45, z - 1.1 + i * 1.1, g, { th: 0.015 }));
  }
  // empty boxes on floor
  const empties = []; for (let i = 0; i < 7; i++) { const b = mesh(G.box(0.7, 0.45, 0.55), pick(CARD), -1.5 + rnd() * 3, 0.22, -1 + rnd() * 3, g, { th: 0.012 }); b.rotation.set(rnd() * 0.3, rnd() * 3, rnd() < .4 ? Math.PI / 2 : 0); empties.push(b); }
  for (let i = 0; i < 6; i++) { const cn = mesh(G.cyl(0.1, 0.1, 0.24, 10), 0xc8c8d0, -1 + rnd() * 2.4, 0.1, 0.5 + rnd() * 2, g, { th: 0.008 }); cn.rotation.z = Math.PI / 2; cn.rotation.y = rnd() * 3; empties.push(cn); }
  // door with handprint on right wall
  const door = mesh(G.box(0.15, 2.8, 1.6), 0x7a6a5a, 7.85, 1.4, 4, g, { th: 0.02 });
  const hp = canvasTex(256, 256, (c, w, h) => { c.clearRect(0, 0, w, h); c.fillStyle = 'rgba(150,10,10,0.92)'; c.beginPath(); c.ellipse(128, 160, 45, 55, 0, 0, 6.28); c.fill(); for (const [x, y, a] of [[78, 70, -0.4], [108, 45, -0.15], [140, 42, 0.05], [170, 55, 0.25], [192, 130, 0.9]]) { c.save(); c.translate(x, y); c.rotate(a); c.beginPath(); c.ellipse(0, 0, 13, 38, 0, 0, 6.28); c.fill(); c.restore(); } c.fillRect(120, 200, 10, 50); c.fillRect(150, 200, 7, 35); });
  const hand = new THREE.Mesh(G.plane(0.6, 0.6), new THREE.MeshBasicMaterial({ map: hp, transparent: true })); hand.position.set(7.76, 1.6, 4); hand.rotation.y = -Math.PI / 2; g.add(hand);
  const bulb = new THREE.Mesh(G.sph(0.15, 12, 10), glow(0xffe8b0, 2.5)); bulb.position.set(0, 4.0, 0); g.add(bulb);
  const bl = new THREE.PointLight(0xffe0a8, 14, 22, 1.2); bl.position.set(0, 3.8, 0); bl.castShadow = true; bl.shadow.mapSize.set(1024, 1024); g.add(bl);
  // office at z offset -30 (x[-6,6] z[-36,-24])
  const O = new THREE.Group(); O.position.z = -30; g.add(O);
  mesh(G.box(12, 0.2, 12), 0x6a5a4a, 0, -0.1, 0, O, { ink: false });
  mesh(G.box(12, 4, 0.3), 0xd8d0c0, 0, 2, -6, O, { ink: false });
  mesh(G.box(0.3, 4, 12), 0xc8c0b0, -6, 2, 0, O, { ink: false });
  mesh(G.box(0.3, 4, 12), 0xc8c0b0, 6, 2, 0, O, { ink: false });
  mesh(G.box(12, 0.3, 12), 0xe8e4dc, 0, 4, 0, O, { ink: false });
  mesh(G.box(12, 4, 0.3), 0xd8d0c0, 0, 2, 6, O, { ink: false });
  mesh(G.rbox(3, 0.12, 1.4, 0.03), 0x8a5a3a, -2, 1.0, -3.5, O, { th: 0.015 }); for (const [a, b] of [[-1.4, -0.6], [1.4, -0.6], [-1.4, 0.6], [1.4, 0.6]]) mesh(G.box(0.08, 1, 0.08), 0x5a3a2a, -2 + a, 0.5, -3.5 + b, O, { ink: false });
  mesh(G.rbox(0.7, 0.45, 0.06, 0.02), 0x1a1a22, -2.3, 1.3, -3.8, O, { th: 0.01 });
  const foodPile = []; for (let i = 0; i < 18; i++) foodPile.push(mesh(G.box(0.4, 0.34, 0.3), pick(PCOL), 2 + (i % 6) * 0.42, 0.17 + Math.floor(i / 6) * 0.35, -5.2, O, { th: 0.01 }));
  // emergency exit door
  const exitDoor = new THREE.Group(); exitDoor.position.set(5.84, 0, 1.2); O.add(exitDoor);
  mesh(G.box(0.12, 2.6, 1.5), 0x9a3a2a, 0, 1.3, 0.75, exitDoor, { th: 0.02 });
  mesh(G.box(0.1, 0.1, 1.2), 0xd8d8d8, -0.1, 1.2, 0.75, exitDoor, { th: 0.008 });
  const ex = label('FAVQULODDA CHIQISH', 2.4, 0.42, '#1a8a3a', '#ffffff', 2.2, 80); ex.position.set(5.82, 3.0, 1.95); ex.rotation.y = -Math.PI / 2; O.add(ex);
  const doorLight = new THREE.Mesh(G.plane(1.5, 2.6), glow(0xfff4dc, 2.2)); doorLight.position.set(5.9, 1.3, 1.95); doorLight.rotation.y = -Math.PI / 2; O.add(doorLight);
  const owin = new THREE.Mesh(G.plane(3.2, 1.6), glow(0x9cc8ff, 1.2)); owin.position.set(0, 2.4, -5.83); O.add(owin);
  const ol = new THREE.PointLight(0xfff0d0, 12, 20, 1.2); ol.position.set(0, 3.6, 0); ol.castShadow = true; O.add(ol);
  // tunnel at z offset -60: long corridor along -z
  const T = new THREE.Group(); T.position.z = -60; g.add(T);
  mesh(G.box(4, 0.2, 30), 0x5a5a60, 0, -0.1, -10, T, { ink: false });
  mesh(G.box(0.3, 3.4, 30), 0x6a6a72, -2, 1.7, -10, T, { ink: false }); mesh(G.box(0.3, 3.4, 30), 0x6a6a72, 2, 1.7, -10, T, { ink: false });
  mesh(G.box(4, 0.3, 30), 0x4a4a52, 0, 3.4, -10, T, { ink: false });
  for (const [x, y, r, c] of [[-1.6, 2.8, 0.14, 0x8a6a3a], [-1.6, 2.4, 0.09, 0x3a6a8a], [1.6, 3.0, 0.12, 0x7a7a82]]) { const p = mesh(G.cyl(r, r, 30, 12), c, x, y, -10, T, { th: 0.012 }); p.rotation.x = Math.PI / 2; }
  const tl = []; for (let z = 3; z > -24; z -= 5) { const b = new THREE.Mesh(G.box(0.6, 0.08, 0.2), glow(0xffd890, 2)); b.position.set(0, 3.22, z); T.add(b); const p = new THREE.PointLight(0xffc880, 4, 7, 1.4); p.position.set(0, 3.0, z); T.add(p); tl.push(p); }
  const radio = new THREE.Group(); mesh(G.rbox(0.28, 0.4, 0.12, 0.03), 0x2a2a30, 0, 0, 0, radio, { th: 0.01 }); mesh(G.cyl(0.015, 0.015, 0.3, 6), 0x111111, 0.08, 0.32, 0, radio, { ink: false }); const rl = new THREE.Mesh(G.sph(0.025, 8, 6), glow(0xff3030, 3)); rl.position.set(-0.08, 0.15, 0.065); radio.add(rl);
  g.add(radio);
  g.add(new THREE.HemisphereLight(0xffe8d0, 0x5a5048, 0.9));
  return {
    g, O, T, crates, empties, door, hand, exitDoor, foodPile, radio, doorLight,
    update(t, c) {
      scene.background.set(0x111118); scene.fog.color.set(0x111118); scene.fog.near = 12; scene.fog.far = 45;
      bl.intensity = c.lights === 'off' ? 2 : 14;
      for (const b of empties) b.visible = !!c.empties;
      hand.visible = !!c.handprint;
      door.rotation.y = 0; door.position.x = 7.85 + (c.knock ? Math.sin(t * 40) * 0.015 * (Math.sin(t * 3) > 0.3 ? 1 : 0) : 0);
      const fo = c.foodPile ?? 1; foodPile.forEach((b, i) => b.visible = i < fo * foodPile.length);
      exitDoor.rotation.y = -(c.exitOpen ?? 0) * 1.6; doorLight.visible = (c.exitOpen ?? 0) > 0.05;
      rl.material.color.setRGB(Math.sin(t * 8) > 0 ? 3 : 0.4, 0.1, 0.1); radio.visible = !!c.radio;
    },
  };
})();

// ---------------------------------------------------------------- ROAD (origin 600): open road + truck interior
export const ROAD = (() => {
  const g = new THREE.Group(); g.position.x = 600; scene.add(g);
  mesh(G.box(200, 0.2, 400), 0x7aa860, 0, -0.12, 0, g, { ink: false });
  mesh(G.box(10, 0.22, 400), 0x4a4e58, 0, -0.1, 0, g, { ink: false });
  const dashes = []; for (let i = 0; i < 60; i++) dashes.push(mesh(G.box(0.2, 0.01, 2.4), 0xf4f4f4, 0, 0.02, -200 + i * 7, g, { ink: false }));
  const props = [];
  for (let i = 0; i < 70; i++) { const s = rnd() < 0.5 ? -1 : 1; const x = s * (9 + rnd() * 40), z = -200 + rnd() * 400; const tr = new THREE.Group(); tr.position.set(x, 0, z); mesh(G.cyl(0.25, 0.3, 2.4, 8), 0x6a4a2a, 0, 1.2, 0, tr, { th: 0.02 }); mesh(G.sph(1.6 + rnd(), 12, 8), pick([0x3a8a4a, 0x4a9a3a, 0x2a7a3a]), 0, 3.4, 0, tr, { th: 0.03 }); g.add(tr); props.push(tr); }
  const wrecks = []; for (const [x, z, c] of [[-3, 40, 0xd83a3a], [7, 90, 0xffffff], [-8, 150, 0x3a7ad8]]) { const car = makeCar(c); car.position.set(x, 0, z); car.rotation.y = 1.2; g.add(car); wrecks.push(car); }
  const truck = makeTruck(); g.add(truck);
  // city silhouette far behind
  for (let i = 0; i < 20; i++) mesh(G.box(6 + rnd() * 6, 10 + rnd() * 30, 6), 0x7a8aa8, -60 + i * 6.5, 10, -260, g, { ink: false });
  const smoke = []; for (let i = 0; i < 5; i++) { const s = mesh(G.sph(4 + rnd() * 3, 12, 8), 0x4a4a52, -40 + i * 18, 30 + rnd() * 10, -255, g, { ink: false }); smoke.push(s); }
  const hemi = new THREE.HemisphereLight(0xfff0e0, 0x6a7a5a, 1.5); g.add(hemi);
  const sl = sun(0xffe0b8, 2.4, new THREE.Vector3(20, 25, 30), 30); g.add(sl, sl.target);
  // cab interior (separate group carried with truck)
  const cab = new THREE.Group(); truck.add(cab);
  mesh(G.box(2.2, 0.1, 1.6), 0x2a2a30, 0, 0.95, 2.4, cab, { ink: false });
  mesh(G.rbox(2.1, 0.5, 0.4, 0.05), 0x1a1a20, 0, 1.25, 3.1, cab, { th: 0.01 });
  const wheel = mesh(G.torus(0.2, 0.03, 8, 24), 0x111111, -0.5, 1.5, 2.85, cab, { th: 0.008 }); wheel.rotation.x = -0.9;
  const cradio = new THREE.Group(); mesh(G.rbox(0.4, 0.14, 0.1, 0.02), 0x111116, 0, 0, 0, cradio, { th: 0.008 }); const crl = new THREE.Mesh(G.plane(0.24, 0.06), glow(0x5ae86a, 2)); crl.position.z = 0.055; cradio.add(crl); cradio.position.set(0.2, 1.4, 3.05); cab.add(cradio);
  // CAB interior set at local x=100
  const K = new THREE.Group(); K.position.x = 100; g.add(K);
  mesh(G.box(2.6, 0.1, 6.4), 0x3a3a42, 0, 0.9, -1.2, K, { ink: false });
  mesh(G.box(0.1, 2.0, 6.4), 0x4a5a8a, -1.3, 1.9, -1.2, K, { ink: false }); mesh(G.box(0.1, 2.0, 6.4), 0x4a5a8a, 1.3, 1.9, -1.2, K, { ink: false });
  mesh(G.box(2.6, 0.1, 6.4), 0x3a4a7a, 0, 2.9, -1.2, K, { ink: false });
  mesh(G.rbox(2.5, 0.45, 0.5, 0.05), 0x1a1a22, 0, 1.45, 1.75, K, { th: 0.01 });
  const kw = mesh(G.torus(0.2, 0.03, 8, 24), 0x111111, -0.55, 1.7, 1.45, K, { th: 0.008 }); kw.rotation.x = -1.0;
  const kr = new THREE.Group(); mesh(G.rbox(0.42, 0.14, 0.1, 0.02), 0x111116, 0, 0, 0, kr, { th: 0.008 }); const krl = new THREE.Mesh(G.plane(0.26, 0.06), glow(0x5ae86a, 2)); krl.position.z = -0.055; krl.rotation.y = Math.PI; kr.add(krl); kr.position.set(0.25, 1.62, 1.55); K.add(kr);
  mesh(G.rbox(2.3, 0.5, 0.6, 0.06), 0x6a3a2a, 0, 1.15, 0.2, K, { th: 0.012 }); mesh(G.rbox(2.3, 0.7, 0.15, 0.05), 0x6a3a2a, 0, 1.6, -0.15, K, { th: 0.012 });
  // windows (bright dusk) front + sides
  const skyM = new THREE.MeshBasicMaterial({ color: new THREE.Color(1.6, 1.15, 0.85), toneMapped: false });
  const wf = new THREE.Mesh(G.plane(2.3, 0.9), skyM); wf.position.set(0, 2.25, 2.0); wf.rotation.y = Math.PI; K.add(wf);
  for (const sx of [-1, 1]) { const w = new THREE.Mesh(G.plane(1.2, 0.75), skyM); w.position.set(sx * 1.24, 2.25, 1.0); w.rotation.y = -sx * Math.PI / 2; K.add(w); }
  mesh(G.box(2.6, 2.0, 0.1), 0x4a5a8a, 0, 1.9, 2.05, K, { ink: false }).visible = false;
  // passing trees silhouettes outside side windows
  const passing = []; for (let i = 0; i < 6; i++) for (const sx of [-1, 1]) { const tr = new THREE.Mesh(G.sph(0.5, 10, 8), new THREE.MeshBasicMaterial({ color: 0x3a5a3a })); tr.position.set(sx * 1.6, 2.3, 0); tr.userData = { sx, ph: i / 6 }; K.add(tr); passing.push(tr); }
  // cargo area divider + dim light
  mesh(G.box(2.6, 1.0, 0.08), 0x2a2a30, 0, 2.4, -0.5, K, { ink: false });
  const cl = new THREE.PointLight(0xffd8a0, 1.6, 6, 1.5); cl.position.set(0, 2.6, -2.5); K.add(cl);
  const kl = new THREE.PointLight(0xffc8a0, 1.8, 6, 1.5); kl.position.set(0, 2.6, 1.3); K.add(kl);
  for (let i = 0; i < 4; i++) mesh(G.box(0.7, 0.5, 0.6), 0xc89a62, -0.8 + (i % 2) * 0.5, 1.2 + Math.floor(i / 2) * 0.5, -3.6, K, { th: 0.012 });
  return {
    g, truck, cab, props, crl, K, krl,
    cabUpdate(t, c) { for (const tr of passing) { const k = ((t * 0.9 + tr.userData.ph) % 1); tr.position.z = 2.2 - k * 3.4; tr.visible = Math.abs(tr.position.z - 1.0) < 0.62; } krl.material.color.setRGB(c.radioOn ? 0.6 : 0.2, c.radioOn ? 3 : 0.6, c.radioOn ? 0.8 : 0.2); },
    update(t, c) {
      const dusk = c.tod === 'dusk';
      scene.background.set(dusk ? 0xf0b088 : 0xa8d0ff); scene.fog.color.copy(scene.background); scene.fog.near = 40; scene.fog.far = 220;
      sl.color.set(dusk ? 0xffa060 : 0xffe0b8); hemi.color.set(dusk ? 0xffc8a8 : 0xfff0e0);
      truck.position.set(c.truckX ?? -2.5, 0, c.truckZ ?? 0); truck.rotation.y = Math.PI;
      sl.position.set(truck.position.x + 20, 25, truck.position.z + 30); sl.target.position.copy(truck.position);
      crl.material.color.setRGB(c.radioOn ? 0.6 : 0.2, c.radioOn ? 3 : 0.6, c.radioOn ? 0.8 : 0.2); this.cabUpdate(t, c);
    },
  };
})();

export const SETS = { LOT, STORE, BACK, ROAD };
export function showSet(name) { for (const [k, s] of Object.entries(SETS)) s.g.visible = k === name; }
export function place(p, set, x, y, z, yaw = 0) { set.g.add(p); p.position.set(x, y, z); p.visible = true; p.userData.state.yaw = yaw; return p; }
