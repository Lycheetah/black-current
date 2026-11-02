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

function beacon(M, pos, color, size) {
  const b = new THREE.Sprite(M.sprite(new THREE.Color(color).getHex(), 0.9));
  b.position.set(pos.x, pos.y, pos.z);
  b.scale.setScalar(size);
  return b;
}
const col = (c, fallback) => (c != null ? new THREE.Color(c).getHex() : fallback);

/** Landmark scenery by its declared build (see sector-schema BUILDS). Builders work in design units and
 * are scaled up by the world scale below; beacons and belts are already in metres. */
const BUILDERS = {
  asterion: (lm, M) => createAsterion(lm.pos, M, { bastion: !!lm.opts?.bastion }),
  pillar_gate: (lm, M) => createPillarGate(lm.pos, M, { yaw: lm.opts?.yaw, inner: col(lm.opts?.inner), outer: col(lm.opts?.outer), sealed: lm.opts?.sealed }),
  breach: (lm, M) => createBreach(lm.pos, M),
  wreckfield: (lm, M) => createWreckfield(lm.pos, M),
  cathedral: (lm, M) => createCathedral(lm.pos, M),
  mirror_well: (lm, M) => createMirrorWell(lm.pos, M),
  bone_ring: (lm, M) => createBoneRing(lm.pos, M),
};

function scenery(sector, M) {
  const parts = [], extra = [];
  for (const lm of Object.values(sector.landmarks)) {
    if (lm.build === 'beacon') extra.push(beacon(M, lm.pos, lm.opts?.color ?? '#ffc56b', lm.opts?.size ?? 60 * WORLD));
    else if (BUILDERS[lm.build]) parts.push(BUILDERS[lm.build](lm, M));
  }
  for (const b of sector.belts) extra.push(createRockField(b.center, b.count, b.spread, b.size[0], b.size[1], M, b.seed ?? 1));
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
  const { parts, extra } = scenery(sector, M);
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
