import { THREE, camera, draw, frameOut, og, W, H, look } from './comic.js';
import * as S from './sets.js';
import { makePerson, pose, face, POSES, mixPose } from './odam.js';
const V = (x, y, z) => new THREE.Vector3(x, y, z);
const hero = makePerson({ hair: 'short', c: { shirt: '#5d6672', shirtD: '#4d5560', jeans: '#3f5f8f' } }); S.scene.add(hero);
const ona = makePerson({ hair: 'scarf', dress: '#7b5ca8', c: { shirt: '#7b5ca8', shirtD: '#6a4d95', scarf: '#e8e2d6', scarfD: '#c0453a' } }); S.scene.add(ona);
const bobo = makePerson({ hair: 'doppi', beard: 'full', robe: '#2b4a7a', robeD: '#e6b450', c: { hair: '#c9c9c9', beard: '#ececec', shirt: '#2b4a7a' } }); S.scene.add(bobo);
const kid = makePerson({ hair: 'short', scale: .62, c: { shirt: '#e3a64a', shirtD: '#c98f3a', jacket: '#e0473c' } }); S.scene.add(kid); kid.userData.setJacket(true); kid.userData.setBeanie(true);
const shots = [
  () => { S.setEnv('night'); S.setCity(.75, 0); S.setLamps(true); S.setTraffic('green'); S.setShop(true); S.weather(1, 0, 0, -10, .5); S.aimSun(0, 0, -20, 30);
    hero.visible = false; return [V(0, 12, 22), V(0, 6, -40), 40]; },
  () => { S.setEnv('blackout'); S.setCity(0, .08); S.setLamps(false); S.setTraffic('off'); S.setShop(false); S.weather(1, 0, 0, -10, .5); S.aimSun(0, 0, -20, 30); return [V(0, 12, 22), V(0, 6, -40), 40]; },
  () => { S.setEnv('indoorPower'); S.setFlatPower(true); S.drawView(.8); S.lightsOff(); hero.visible = true; hero.position.set(200 - 2.4, 0, -.2); hero.rotation.y = Math.PI / 2; pose(hero, POSES.sit); face(hero, { smile: .4 }); S.aimSun(200, 0, 0, 6, [2, 8, 6]);
    return [V(201.8, 1.7, 3.6), V(199.3, 1.0, -.6), 42]; },
  () => { S.setEnv('indoorDark'); S.setFlatPower(false); S.drawView(0, .1); S.lightsOff(); const L = S.lights.candle; L.position.set(199.05, .9, .2); L.intensity = 4 * Math.PI; setFrost(.7);
    pose(hero, POSES.hug); face(hero, { brow: -.6, mouth: .2 }); hero.userData.setJacket(true); hero.userData.setBeanie(true); S.breath(1, V(198.0, 1.62, -.2), V(1, .1, 0));
    return [V(201.8, 1.7, 3.6), V(199.3, 1.0, -.6), 42]; },
  () => { S.setEnv('indoorDark', { hemi: .2 }); S.lightsOff(); S.flames.forEach(f => f.visible = true); S.coCloud.visible = true; const L = S.lights.candle; L.color.set('#7fb2ff'); L.position.set(230.3, 1.3, -1.6); L.intensity = 3 * Math.PI;
    hero.position.set(230.2, 0, -.6); hero.rotation.y = Math.PI; pose(hero, POSES.hug); hero.visible = true; return [V(231.9, 2.0, 2.1), V(230.0, 1.0, -1.4), 50]; },
  () => { S.setEnv('day'); S.lightsOff(); S.aimSun(400, 0, 0, 14); hero.position.set(401.5, 0, -1.8); hero.rotation.y = -1.2; pose(hero, POSES.idle); hero.userData.setJacket(true);
    bobo.position.set(403.2, 0, -1.2); bobo.rotation.y = -2.6; pose(bobo, POSES.talk); kid.position.set(-1.5 + 400, 0, 2.5); pose(kid, POSES.wave); S.animSmoke(2); S.plov.visible = true;
    ona.position.set(396.2, 0, -2.4); ona.rotation.y = .6; pose(ona, POSES.idle);
    return [V(399, 2.6, 7.4), V(400.5, 1.0, -2.5), 44]; },
  () => { S.setEnv('indoorDark', { hemi: .14 }); S.lightsOff(); const L = S.lights.candle; L.color.set('#ffb35c'); L.position.set(600, 1.2, 0); L.intensity = 6 * Math.PI;
    for (const [p, x, z, r] of [[hero, 0, 1.55, Math.PI], [bobo, 0, -1.55, 0], [ona, 1.55, 0, -Math.PI / 2], [kid, -1.5, 0, Math.PI / 2]]) { p.position.set(600 + x, -.05, z); p.rotation.y = r; pose(p, { ...POSES.sit, legL: [-1.5, 0, .05], legR: [-1.5, 0, -.05], kneeL: 0, kneeR: 0 }); }
    hero.userData.setJacket(false); hero.userData.setBeanie(false); face(bobo, { mouth: .5, smile: .3 });
    return [V(602.0, 2.0, 2.6), V(600, .7, 0), 46]; },
  () => { S.setEnv('space'); S.lightsOff(); for (const p of [hero, ona, bobo, kid]) p.visible = false; S.setMapLights(.45); S.aimSun(-300, 0, 0, 12);
    return [V(-300, 13, 9), V(-300, 0, -.5), 40]; },
  () => { S.setEnv('indoorDark', { hemi: .2 }); const L = S.lights.candle; L.color.set('#ffb35c'); L.position.set(801.7, 1.6, 1.2); L.intensity = 9 * Math.PI; S.termScreen.visible = true;
    return [V(803.5, 1.9, 4.6), V(801, 1.1, .2), 44]; },
];
function setFrost(a) { for (const m of [S.frost.userData.m.lit, S.frost.userData.m.flat]) m.opacity = a; }
window.renderFrame = f => { const [p, l, fov] = shots[f % shots.length](); camera.position.copy(p); camera.fov = fov; camera.lookAt(l); camera.updateProjectionMatrix(); draw(S.scene, { t: f }); og.clearRect(0, 0, W, H); return frameOut(); };
window.ready = true;
