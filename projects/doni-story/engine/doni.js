// Doni — rigged comic character (matches reference sheet: curly hair, beard, black "Doni Story" sweatshirt, jeans, black sneakers)
import { THREE, M, rbox, box, cyl, sph, cone, tor, at, G, tex, clamp, lerp } from './comic.js';
export const C = { skin: '#eab38e', skinD: '#e0a283', hair: '#2a201d', beard: '#33261f', shirt: '#2c2d35', shirtD: '#24252c', logo: '#43b8e3',
  jeans: '#4d79ae', cuff: '#6390c4', shoe: '#26262c', sole: '#f3f3f3', eyeW: '#ffffff', iris: '#6b4127', lip: '#9a4a45', jacket: '#3d6f8f' };
const logoTex = tex(256, 160, (g, w, h) => { g.clearRect(0, 0, w, h); g.textAlign = 'left'; g.font = '700 64px InterB'; g.fillStyle = '#ffffff'; g.fillText('Doni', 20, 70); g.fillStyle = C.logo; g.fillText('Story', 20, 136); });
const partSphere = (r, color, ps, pl, ts, tl, o) => M(new THREE.SphereGeometry(r, 32, 20, ps, pl, ts, tl), color, o);

export function makeDoni(opt = {}) {
  const root = new THREE.Group(); const J = {}; root.userData.J = J;
  const hips = J.hips = G(root, 0, .9, 0);
  at(rbox(.37, .2, .23, .07, C.jeans), 0, .0, 0, hips);
  // legs
  for (const s of [1, -1]) {
    const k = s > 0 ? 'L' : 'R';
    const leg = J['leg' + k] = G(hips, s * .1, -.04, 0);
    at(cyl(.088, .076, .44, C.jeans, 18), 0, -.22, 0, leg);
    const knee = J['knee' + k] = G(leg, 0, -.43, 0);
    at(sph(.077, C.jeans, {}, 16, 12), 0, 0, 0, knee);
    at(cyl(.077, .074, .36, C.jeans, 18), 0, -.18, 0, knee);
    at(cyl(.088, .088, .07, C.cuff, 18), 0, -.35, 0, knee);
    const foot = J['foot' + k] = G(knee, 0, -.4, 0);
    at(rbox(.13, .1, .27, .045, C.shoe), 0, -.01, .05, foot);
    at(rbox(.145, .045, .3, .02, C.sole), 0, -.065, .05, foot);
    at(sph(.06, C.sole, {}, 16, 10), 0, -.03, .16, foot).scale.set(1.1, .55, .9);
    for (let i = 0; i < 3; i++) at(box(.08, .012, .015, C.sole, { cast: false }), 0, .045 - i * .005, .02 + i * .04, foot);
  }
  // torso
  const torso = J.torso = G(hips, 0, .04, 0);
  at(rbox(.44, .46, .27, .13, C.shirt), 0, .27, 0, torso); at(sph(.2, C.shirt), 0, .4, 0, torso).scale.set(1.1, .55, .66);
  at(rbox(.43, .07, .25, .03, C.shirtD), 0, .045, 0, torso); // ribbed hem
  const logo = at(M(new THREE.PlaneGeometry(.12, .075), '#ffffff', { map: logoTex, cast: false, noEdge: true, opacity: 1 }), .1, .38, .137, torso);
  logo.userData.m.lit.transparent = logo.userData.m.flat.transparent = true; logo.userData.m.lit.alphaTest = logo.userData.m.flat.alphaTest = .3;
  logo.rotation.y = .12;
  at(tor(.075, .022, C.shirtD), 0, .5, 0, torso).rotation.x = Math.PI / 2;
  // arms
  for (const s of [1, -1]) {
    const k = s > 0 ? 'L' : 'R';
    const arm = J['arm' + k] = G(torso, s * .235, .43, 0);
    at(sph(.08, C.shirt, {}, 16, 12), 0, 0, 0, arm);
    at(cyl(.074, .066, .3, C.shirt, 16), 0, -.15, 0, arm);
    const el = J['elbow' + k] = G(arm, 0, -.3, 0);
    at(sph(.066, C.shirt, {}, 14, 10), 0, 0, 0, el);
    at(cyl(.066, .058, .25, C.shirt, 16), 0, -.12, 0, el);
    at(cyl(.06, .06, .05, C.shirtD, 16), 0, -.255, 0, el);
    const hand = J['hand' + k] = G(el, 0, -.29, 0);
    at(rbox(.085, .095, .045, .02, C.skin), 0, -.02, 0, hand);
    const fing = J['fing' + k] = G(hand, 0, -.065, 0);
    at(rbox(.082, .07, .04, .018, C.skin), 0, -.03, 0, fing);
    const th = at(cyl(.016, .014, .06, C.skin, 8), -s * 0 + s * -.045, -.02, .02, hand); th.rotation.z = s * -.6; th.rotation.x = -.3;
  }
  // neck + head
  at(cyl(.055, .06, .1, C.skin, 14), 0, .53, 0, torso);
  const head = J.head = G(torso, 0, .57, 0);
  const hg = G(head, 0, 0, .0); hg.scale.setScalar(1.32);
  at(sph(.165, C.skin), 0, .15, 0, hg).scale.set(1, 1.1, 1.02);
  // beard: short jawline strap + small chin, no mustache
  const BS = .1675;
  for (const s of [1, -1]) { // sides along jaw up to ears
    const sb = at(partSphere(BS, C.beard, s > 0 ? -.5 : Math.PI + .5 - .95, .95, Math.PI * .5, Math.PI * .34), 0, .15, .0, hg); sb.scale.set(1.0, 1.1, 1.02); }
  const jaw = at(partSphere(BS, C.beard, -.5, Math.PI + 1.0, Math.PI * .74, Math.PI * .26), 0, .15, .002, hg); jaw.scale.set(1.0, 1.1, 1.03);
  at(sph(.05, C.beard), 0, -.0, .118, hg).scale.set(1.45, .62, .5);
  // mouth
  const mouth = J.mouth = at(sph(.034, '#4a1f22', { cast: false }), 0, .035, .158, hg); mouth.scale.set(1, .25, .4);
  const teeth = J.teeth = at(box(.045, .012, .01, '#ffffff', { cast: false, noEdge: true }), 0, .043, .168, hg); teeth.visible = false;
  // nose, ears
  at(sph(.026, C.skinD), 0, .102, .168, hg).scale.set(1, 1.1, 1);
  for (const s of [1, -1]) at(sph(.042, C.skin, {}, 14, 10), s * .163, .13, 0, hg).scale.set(.5, 1, .8);
  // eyes
  J.eyes = []; J.lids = [];
  for (const s of [1, -1]) {
    const e = G(hg, s * .062, .155, .138);
    at(sph(.043, C.eyeW, { cast: false }), 0, 0, 0, e).scale.set(.9, 1.05, .6);
    const pupil = G(e, 0, 0, .022);
    at(sph(.027, C.iris, { cast: false, noEdge: true }), 0, 0, 0, pupil).scale.set(1, 1, .5);
    at(sph(.014, '#120c0b', { cast: false, noEdge: true }), 0, 0, .008, pupil).scale.set(1, 1, .5);
    at(sph(.0075, '#ffffff', { cast: false, noEdge: true, glow: true }), .009, .011, .016, pupil);
    J.eyes.push(pupil);
    const lid = G(e, 0, 0, 0); at(partSphere(.047, C.skin, 0, Math.PI * 2, 0, Math.PI * .5, { cast: false }), 0, 0, 0, lid).scale.set(1, 1.15, .7);
    lid.rotation.x = -1.35; J.lids.push(lid);
    const brow = J['brow' + (s > 0 ? 'L' : 'R')] = at(rbox(.075, .024, .03, .01, C.hair), s * .065, .225, .148, hg);
  }
  // hair: cap + curls + fringe, short faded sides
  at(partSphere(.176, C.hair, 0, Math.PI * 2, 0, Math.PI * .4), 0, .17, -.008, hg).scale.set(1.02, 1.1, 1.04);
  at(partSphere(.171, C.hair, Math.PI / 2 + .95, Math.PI * 2 - 1.9, 0, Math.PI * .6), 0, .15, -.004, hg).scale.set(1.01, 1.1, 1.03); // back/sides
  at(partSphere(.17, C.hair, Math.PI + .5, Math.PI - 1.0, Math.PI * .5, Math.PI * .3), 0, .15, -.004, hg).scale.set(1.01, 1.1, 1.03); // nape
  const rr = (() => { let s = 5; return () => (s = (s * 16807) % 2147483647) / 2147483647; })();
  for (let i = 0; i < 46; i++) {
    const a = rr() * Math.PI * 2, th = rr() * 1.05; const r = .172;
    let x = Math.sin(th) * Math.cos(a) * r, z = Math.sin(th) * Math.sin(a) * r * 1.03, y = Math.cos(th) * r * 1.1 + .17;
    if (z > .1 && y < .27) continue;
    at(sph(.036 + rr() * .016, C.hair, {}, 12, 9), x, y - .005, z, hg).userData.curl = 1;
  }
  for (let i = 0; i < 7; i++) { const x = -.11 + i * .037; at(sph(.042 + (i % 2) * .008, C.hair, {}, 12, 9), x, .275 - Math.abs(x) * .3 + (i % 2) * .01, .125 - Math.abs(x) * .35, hg).userData.curl = 1; }
  root.userData.parts = { hg };
  // jacket (puffer) — optional layer for survival scenes
  const jacket = J.jacket = G(torso, 0, 0, 0); jacket.visible = false;
  for (let i = 0; i < 4; i++) at(rbox(.52 - Math.abs(i - 1.5) * .02, .13, .32, .06, C.jacket), 0, .1 + i * .12, 0, jacket);
  at(rbox(.3, .12, .3, .05, C.jacket), 0, .54, -.02, jacket);
  J.jsleeves = [];
  for (const s of ['L', 'R']) { const a = G(J['arm' + s]); at(cyl(.088, .08, .3, C.jacket, 16), 0, -.15, 0, a); const b = G(J['elbow' + s]); at(cyl(.08, .072, .25, C.jacket, 16), 0, -.12, 0, b); J.jsleeves.push(a, b); a.visible = b.visible = false; }
  const beanie = J.beanie = G(hg, 0, .2, -.005); beanie.visible = false;
  at(partSphere(.19, '#b8463c', 0, Math.PI * 2, 0, Math.PI * .5), 0, 0, 0, beanie).scale.set(1, 1.05, 1.03);
  at(cyl(.192, .192, .06, '#9c3a32', 28), 0, -.0, 0, beanie); at(sph(.045, '#f1e9de'), 0, .2, 0, beanie);
  root.userData.setJacket = on => { jacket.visible = on; J.jsleeves.forEach(x => x.visible = on); };
  root.userData.setBeanie = on => { beanie.visible = on; hg.children.forEach(m => { if (m.userData.curl) m.visible = !on; }); };
  return root;
}

// ---- pose + face ----
const Z = { hipsY: 0, hipsRot: [0, 0, 0], torso: [0, 0, 0], head: [0, 0, 0], armL: [0, 0, .12], armR: [0, 0, -.12], elbowL: [0, 0, 0], elbowR: [0, 0, 0],
  handL: [0, 0, 0], handR: [0, 0, 0], fingL: 0, fingR: 0, legL: [0, 0, 0], legR: [0, 0, 0], kneeL: 0, kneeR: 0, footL: 0, footR: 0 };
export const POSES = {
  idle: {},
  talk: { armL: [-.5, 0, .35], elbowL: [-.9, .3, 0], handL: [0, -.6, 0], armR: [-.4, 0, -.3], elbowR: [-1.0, -.3, 0], handR: [0, .6, 0], fingL: -.2, fingR: -.2 },
  open: { armL: [-.3, 0, .7], elbowL: [-1.1, 0, 0], handL: [0, -1.2, .2], armR: [-.3, 0, -.7], elbowR: [-1.1, 0, 0], handR: [0, 1.2, -.2] },
  point: { armL: [-.1, 0, .15], armR: [-1.45, 0, -.35], elbowR: [-.1, 0, 0], fingR: .5, head: [0, -.25, 0] },
  pointUp: { armR: [-2.6, 0, -.3], elbowR: [-.2, 0, 0], fingR: .4, head: [-.15, 0, 0] },
  think: { armL: [-.35, 0, .2], elbowL: [-1.4, -.5, 0], armR: [-.6, 0, -.1], elbowR: [-2.3, .4, 0], handR: [.2, .2, 0], fingR: .8, head: [.05, .12, .06] },
  worried: { armL: [-.4, 0, .2], elbowL: [-1.6, .2, 0], armR: [-.4, 0, -.2], elbowR: [-1.6, -.2, 0], fingL: .6, fingR: .6, head: [.08, 0, 0], torso: [.08, 0, 0] },
  shrug: { armL: [-.2, 0, .5], elbowL: [-1.3, 0, 0], handL: [0, -1.4, 0], armR: [-.2, 0, -.5], elbowR: [-1.3, 0, 0], handR: [0, 1.4, 0], head: [0, 0, .15] },
  hug: { armL: [-.9, 0, -.25], elbowL: [-1.4, 0, 0], armR: [-.9, 0, .25], elbowR: [-1.4, 0, 0], fingL: .8, fingR: .8, torso: [.18, 0, 0], head: [.15, 0, 0] },
  sit: { hipsY: -.38, legL: [-1.5, 0, .05], legR: [-1.5, 0, -.05], kneeL: 1.5, kneeR: 1.5, armL: [-.5, 0, .1], elbowL: [-.9, 0, 0], armR: [-.5, 0, -.1], elbowR: [-.9, 0, 0] },
  wheel: { hipsY: -.38, legL: [-1.4, 0, .05], legR: [-1.4, 0, -.05], kneeL: 1.3, kneeR: 1.3, armL: [-1.1, 0, -.1], elbowL: [-.6, 0, 0], armR: [-1.1, 0, .1], elbowR: [-.6, 0, 0], fingL: .9, fingR: .9 },
  wave: { armR: [-.2, 0, -2.5], elbowR: [-.2, 0, -.5], handR: [0, 0, 0], head: [0, -.1, 0] },
  dig: { torso: [.5, 0, 0], head: [-.3, 0, 0], armL: [-1.2, 0, .1], elbowL: [-.4, 0, 0], armR: [-1.0, 0, -.1], elbowR: [-.6, 0, 0], fingL: 1, fingR: 1, kneeL: .3, kneeR: .3, legL: [-.2, 0, 0], legR: [-.1, 0, 0] },
  phone: { armR: [-.5, 0, .1], elbowR: [-1.9, .2, 0], handR: [.5, 0, 0], armL: [-.1, 0, .15], head: [.35, 0, 0], fingR: .3 },
};
function apply3(obj, v) { obj.rotation.set(v[0], v[1], v[2]); }
export function mixPose(a, b, t) { const A = { ...Z, ...a }, B = { ...Z, ...b }, R = {};
  for (const k in Z) R[k] = Array.isArray(Z[k]) ? Z[k].map((_, i) => lerp(A[k][i], B[k][i], t)) : lerp(A[k], B[k], t); return R; }
export function pose(d, p) {
  const J = d.userData.J, P = { ...Z, ...p };
  J.hips.position.y = .9 + P.hipsY; apply3(J.hips, P.hipsRot); apply3(J.torso, P.torso); apply3(J.head, P.head);
  for (const k of ['L', 'R']) { apply3(J['arm' + k], P['arm' + k]); apply3(J['elbow' + k], P['elbow' + k]); apply3(J['hand' + k], P['hand' + k]);
    J['fing' + k].rotation.x = P['fing' + k] * 1.4; apply3(J['leg' + k], P['leg' + k]); J['knee' + k].rotation.x = P['knee' + k]; J['foot' + k].rotation.x = P['foot' + k]; }
}
// walk/run cycle over a base pose
export function cycle(t, run = 0) {
  const ph = t * (run ? 9 : 6), a = Math.sin(ph), k = run ? 1.0 : .55;
  return { hipsY: -Math.abs(Math.cos(ph)) * (run ? .06 : .025), torso: [run ? .25 : .05, a * .08, 0],
    legL: [-a * k, 0, 0], legR: [a * k, 0, 0], kneeL: Math.max(0, Math.sin(ph + 1.4)) * (run ? 1.6 : .8), kneeR: Math.max(0, Math.sin(ph + 1.4 + Math.PI)) * (run ? 1.6 : .8),
    armL: [a * k * .9, 0, .12], armR: [-a * k * .9, 0, -.12], elbowL: [run ? -1.4 : -.3, 0, 0], elbowR: [run ? -1.4 : -.3, 0, 0], fingL: run ? .9 : .2, fingR: run ? .9 : .2 };
}
// face: { brow:-1(worried)..1(angry/serious), raise:0..1, mouth:0..1 open, smile:0..1, blink:0..1, look:[x,y] }
export function face(d, f = {}) {
  const J = d.userData.J; const brow = f.brow || 0, raise = f.raise || 0;
  for (const [s, b] of [[1, J.browL], [-1, J.browR]]) { b.position.y = .225 + raise * .025 - Math.max(0, brow) * .01; b.rotation.z = s * (brow * .35); }
  const op = clamp(f.mouth || 0), sm = clamp(f.smile || 0);
  J.mouth.scale.set(1 + sm * .45 - op * .15, .2 + op * .9 + sm * .25, .4); J.mouth.position.y = .035 - op * .012;
  J.teeth.visible = sm > .35 && op > .1; J.teeth.scale.x = 1 + sm * .3;
  const bl = clamp(f.blink || 0); for (const l of J.lids) l.rotation.x = lerp(-1.35, .05, bl);
  const [lx, ly] = f.look || [0, 0]; for (const e of J.eyes) e.position.set(lx * .012, ly * .01, .022);
}
export const blinkAt = (t, seed = 0) => { const p = (t + seed * 1.7) % 3.7; return p < .12 ? Math.sin(p / .12 * Math.PI) : 0; };
