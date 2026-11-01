// Per-sector scenery: sky palette, image lighting, star, landmarks. Built on boot and rebuilt whenever the
// simulation moves the player through a gate, so each sector reads as its own place.
import * as THREE from 'three';
import { createSky, bakeSky } from './sky.js';
import { createBlackSun } from './blacksun.js';
import { createAsterion, createPillarGate, createWreckfield, createRockField, createBreach } from './station.js';
import { createColdStar, createCathedral, createMirrorWell, createBoneRing } from './erebos-scene.js';
import { mergeStatic, disposeTree } from './optimize.js';
import { WORLD } from '../core/scale.js';

const v3 = (p) => new THREE.Vector3(p.x, p.y, p.z);
const LIGHTS = {
  blacksun: { key: 0xffd6a8, keyI: 3.6, rim: 0x8a7cff, card: [1.0, 0.75, 0.45] },
  cold: { key: 0xd8ecff, keyI: 3.2, rim: 0x6f8cff, card: [0.75, 0.88, 1.0] },
};

function beacon(M, pos, color, size = 60) {
  const b = new THREE.Sprite(M.sprite(color, 0.9));
  b.position.set(pos.x, pos.y, pos.z);
  b.scale.setScalar(size * WORLD);
  return b;
}

function narakaScenery(sector, M) {
  const L = sector.landmarks;
  const parts = [createAsterion(L.asterion.pos, M), createPillarGate(L.pillar.pos, M), createWreckfield(L.wreck.pos, M), createBreach(L.breach.pos, M)];
  const extra = [
    createRockField({ x: (L.asterion.pos.x + L.pillar.pos.x) / 2 - 900 * WORLD, y: L.asterion.pos.y - 200 * WORLD, z: (L.asterion.pos.z + L.pillar.pos.z) / 2 }, 260, 1400 * WORLD, 4 * WORLD, 60 * WORLD, M, 11),
    createRockField(L.refinery.pos, 120, 500 * WORLD, 3 * WORLD, 40 * WORLD, M, 23),
    beacon(M, L.observatory.pos, 0xffc56b), beacon(M, L.refinery.pos, 0xffc56b),
  ];
  return { parts, extra };
}

function erebosScenery(sector, M) {
  const L = sector.landmarks;
  const parts = [
    createAsterion(L.bastion.pos, M, { bastion: true }),
    createPillarGate(L.gate.pos, M, { yaw: -0.7, inner: 0x7fd8ff, outer: 0xd8e8ff }),
    createPillarGate(L.aionGate.pos, M, { yaw: 1.2, inner: 0xff7a5a, outer: 0x8a2a2a, sealed: true }),
    createCathedral(L.cathedral.pos, M), createMirrorWell(L.well.pos, M), createBoneRing(L.bone.pos, M),
  ];
  const extra = [
    createRockField(L.nullFoundry.pos, 160, 600 * WORLD, 3 * WORLD, 46 * WORLD, M, 31),
    createRockField({ x: (L.bastion.pos.x + L.gate.pos.x) / 2, y: L.bastion.pos.y - 300 * WORLD, z: (L.bastion.pos.z + L.gate.pos.z) / 2 }, 200, 1600 * WORLD, 4 * WORLD, 50 * WORLD, M, 37),
    beacon(M, L.violetObservatory.pos, 0xb79cff), beacon(M, L.phaseBeacon.pos, 0x7fd8ff, 45), beacon(M, L.nullFoundry.pos, 0xff9a5a),
  ];
  return { parts, extra };
}

export function buildSectorScene(renderer, sector, M, q) {
  const home = sector.landmarks[sector.home].pos;
  const sunDir = v3(sector.blackSun.pos).sub(v3(home)).normalize();
  const lights = LIGHTS[sector.star?.kind] || LIGHTS.blacksun;

  const background = bakeSky(renderer, sunDir, q.sky, sector.sky);
  let environment;
  {
    const envScene = new THREE.Scene();
    const envSky = createSky(sunDir, sector.sky);
    envSky.mesh.scale.setScalar(100);
    envScene.add(envSky.mesh);
    // Bright card in the env so metal catches the star.
    const card = new THREE.Mesh(new THREE.SphereGeometry(6, 16, 8), new THREE.MeshBasicMaterial({ color: new THREE.Color(...lights.card).multiplyScalar(6) }));
    card.position.copy(sunDir).multiplyScalar(80);
    envScene.add(card);
    const pmrem = new THREE.PMREMGenerator(renderer);
    environment = pmrem.fromScene(envScene, 0.02).texture;
    pmrem.dispose();
    disposeTree(envScene);
  }

  const group = new THREE.Group();
  const star = sector.star?.kind === 'cold' ? createColdStar(sector.blackSun, M) : createBlackSun(sector.blackSun, M.textures.glow);
  group.add(star.group);
  const { parts, extra } = sector.id === 'erebos' ? erebosScenery(sector, M) : narakaScenery(sector, M);
  // Landmark builders work in their original units; the world scale makes them station-sized.
  for (const p of parts) { p.group.scale.multiplyScalar(WORLD); group.add(p.group); mergeStatic(p.group); }
  for (const e of extra) group.add(e);

  return {
    group, background, environment, sunDir, lights,
    update(t, camera) {
      star.update(t, camera);
      for (const p of parts) p.update(t, camera);
    },
    dispose() {
      group.removeFromParent();
      disposeTree(group);
      background.dispose?.();
      environment.dispose?.();
    },
  };
}
