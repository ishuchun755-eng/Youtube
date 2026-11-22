import { THREE, camera, draw, rig, M, at, look, frameOut } from './comic.js';
import { makeDoni, pose, face, POSES } from './doni.js';
const scene = new THREE.Scene(); scene.background = new THREE.Color('#f4efe6');
rig(scene, { sunPos: [-5, 9, 8], shadowSize: 6, hemi: .62 });
at(M(new THREE.PlaneGeometry(40, 40).rotateX(-Math.PI / 2), '#f4efe6', { noEdge: true }), 0, 0, 0, scene);
at(M(new THREE.PlaneGeometry(40, 20), '#f4efe6', { noEdge: true }), 0, 10, -3, scene);
const specs = [[-3.0, 0, 'idle', {}], [-1.6, -.6, 'idle', {}], [-.3, -Math.PI / 2, 'idle', {}], [1.0, Math.PI, 'idle', {}],
  [2.4, -.25, 'think', { brow: -.6, mouth: .25, look: [.6, .5] }], [3.8, -.2, 'open', { smile: .8, mouth: .5, raise: .5 }]];
const D = specs.map(([x, ry, p, f]) => { const d = makeDoni(); d.position.x = x; d.rotation.y = ry; pose(d, POSES[p]); face(d, f); scene.add(d); return d; });
window.renderFrame = (fr) => {
  if (fr < 15) { camera.fov = 30; camera.position.set(.4, 1.25, 10.5); camera.lookAt(.4, .95, 0); }
  else if (fr < 45) { camera.fov = 22; camera.position.set(2.4 + .9, 1.8, 2.0); camera.lookAt(2.4, 1.65, 0); }
  else { camera.fov = 22; camera.position.set(-3.0, 1.7, 2.1); camera.lookAt(-3.0, 1.68, 0); }
  camera.updateProjectionMatrix(); draw(scene, { t: fr }); return frameOut();
};
window.ready = true;
