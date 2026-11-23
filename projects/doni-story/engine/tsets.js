import { THREE, camera, draw, frameOut } from './comic.js';
import * as S from './sets.js';
import { makeDoni, pose, face, POSES } from './doni.js';
const D = makeDoni(); S.scene.add(D);
const X = S.OFF.steppe[0];
const shots = [
  () => { S.setEnv('studio'); S.aimSun(0, 1, 0, 8); D.position.set(0, 0, 0); D.rotation.y = 0; pose(D, POSES.talk); face(D, { smile: .5, mouth: .4 });
    camera.fov = 30; camera.position.set(.8, 1.55, 4.6); camera.lookAt(.5, 1.45, 0); S.weather(0, 0, 0, 0, 0, 0); S.pozemka(0, 0, 0, 0); },
  () => { S.setEnv('dusk'); S.car.position.set(1.8, 0, -20); S.car.rotation.y = 0; S.car.userData.set({ lights: true }); S.truck.position.set(1.8, 0, 10); S.aimSun(X + 1.8, 0, -20, 14);
    D.position.set(9999, 0, 0); camera.fov = 35; camera.position.set(X - 4, 2.2, -10); camera.lookAt(X + 1.8, 1, -24); S.weather(1, X, 0, -20, .15, .3); S.pozemka(1, X, -20, .5, .25); },
  () => { S.setEnv('nightburan'); S.car.position.set(6.6, -.7, -20); S.car.rotation.set(.08, .25, -.14); S.car.userData.set({ lights: true, beams: true, snow: .6, bury: .5, hazard: true, t: 0 });
    S.truck.position.set(9999, 0, 0); S.aimSun(X + 6.6, 0, -20, 10); camera.fov = 38; camera.position.set(X + 1, 2.2, -11); camera.lookAt(X + 6.6, .3, -20); S.weather(2, X + 4, 0, -16, 1, 1, 14); S.pozemka(2, X + 4, -16, 1, .6); },
  () => { S.setEnv('night'); S.car.position.set(6.6, -.7, -20); S.car.rotation.set(.08, .25, -.14); S.car.userData.set({ lights: false, snow: .6, bury: .5, fuel: .5, cabin: 1, inside: true });
    D.userData.setJacket(true); D.userData.setBeanie(true); pose(D, POSES.wheel); face(D, { brow: -.6, look: [-.6, .2] });
    S.car.add(D); D.position.set(.4, .33, -.02); D.rotation.set(0, 0, 0); D.scale.setScalar(.62);
    S.scene.updateMatrixWorld(true); const cp = new THREE.Vector3(-.65, 1.2, .35); S.car.localToWorld(cp); const lk = new THREE.Vector3(.4, 1.12, -.15); S.car.localToWorld(lk);
    cp.x += 0; camera.fov = 58; camera.position.copy(cp); camera.lookAt(lk); S.weather(3, 1006, 0, -20, .5, .9, 10); S.pozemka(0, 0, 0, 0); },
  () => { S.setEnv('info'); S.scene.add(D); D.scale.setScalar(1); D.rotation.set(0, 0, 0); D.userData.setJacket(false); D.userData.setBeanie(false); D.position.set(-300 + 1.6, .5, 0); pose(D, POSES.point); face(D, { smile: .3, mouth: .3 });
    S.aimSun(-300, 0, 0, 8); camera.fov = 32; camera.position.set(-300, 2.6, 8); camera.lookAt(-300, 1.2, 0); S.weather(0, 0, 0, 0, 0, 0); },
];
window.renderFrame = (f) => { shots[Math.min(shots.length - 1, Math.floor(f / 30))](); camera.updateProjectionMatrix(); draw(S.scene, { t: f }); return frameOut(); };
window.ready = true;
