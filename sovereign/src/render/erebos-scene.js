// Erebos Reach landmarks, from the canon descriptions: the Cold Cathedral ("a frozen prism nave of black
// ribs, cold cyan glass and distant violet stellar geometry"), the Mirror Well, the Bone Ring kill-zone,
// and a cold primary star in place of Naraka's black sun.
import * as THREE from 'three';
import { boxUV } from './materials.js';

export function createColdStar({ pos, radius }, M) {
  const g = new THREE.Group();
  g.position.set(pos.x, pos.y, pos.z);
  g.add(new THREE.Mesh(new THREE.SphereGeometry(radius, 48, 24), new THREE.MeshBasicMaterial({ color: new THREE.Color(0xdff2ff).multiplyScalar(3), toneMapped: false })));
  for (const [c, k, o] of [[0xbfe6ff, 5, 0.5], [0x8fb8ff, 12, 0.18], [0xb79cff, 24, 0.07]]) {
    const s = new THREE.Sprite(M.sprite(c, o)); s.scale.setScalar(radius * k); g.add(s);
  }
  g.traverse((o) => { o.frustumCulled = false; });
  return { group: g, update() {} };
}

export function createCathedral(pos, M) {
  const g = new THREE.Group();
  g.position.set(pos.x, pos.y, pos.z);
  // Black ribs arching over a long nave.
  for (let i = 0; i < 9; i++) {
    const rib = new THREE.Mesh(new THREE.TorusGeometry(150 - Math.abs(i - 4) * 10, 7, 8, 48, Math.PI), M.hullVanta);
    rib.position.z = (i - 4) * 55;
    g.add(rib);
  }
  const spine = new THREE.Mesh(boxUV(new THREE.BoxGeometry(14, 14, 520), 40), M.hullVanta);
  spine.position.y = 150;
  g.add(spine);
  // Cold cyan glass shards hanging in the nave, violet geometry beyond.
  const glass = new THREE.MeshStandardMaterial({ color: 0x9fe8ff, emissive: 0x2a8fbf, emissiveIntensity: 0.8, metalness: 0.1, roughness: 0.05, transparent: true, opacity: 0.75 });
  for (let i = 0; i < 24; i++) {
    const shard = new THREE.Mesh(new THREE.OctahedronGeometry(10 + (i % 5) * 4, 0), glass);
    shard.position.set(Math.sin(i * 2.3) * 90, 20 + (i % 7) * 15, (i - 12) * 20);
    shard.scale.set(0.5, 2.5, 0.5);
    g.add(shard);
  }
  for (let i = 0; i < 3; i++) {
    const ring = new THREE.Mesh(new THREE.TorusGeometry(220 + i * 40, 1.5, 6, 96), M.accentGlow('violet', 1.6));
    ring.rotation.set(1.2 + i * 0.3, 0.4 * i, 0);
    g.add(ring);
  }
  const choir = new THREE.Sprite(M.sprite(0x9fd8ff, 0.5)); choir.scale.setScalar(260); choir.position.y = 60; g.add(choir);
  return { group: g, update(t) { g.rotation.y = Math.sin(t * 0.02) * 0.05; } };
}

export function createMirrorWell(pos, M) {
  const g = new THREE.Group();
  g.position.set(pos.x, pos.y, pos.z);
  const well = new THREE.Mesh(new THREE.SphereGeometry(60, 32, 16), new THREE.MeshBasicMaterial({ color: 0x000000 }));
  g.add(well);
  const mirror = new THREE.MeshStandardMaterial({ color: 0xdfe8f0, metalness: 1, roughness: 0.04 });
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2;
    const panel = new THREE.Mesh(new THREE.BoxGeometry(70, 110, 3), mirror);
    panel.position.set(Math.cos(a) * 170, Math.sin(i * 1.7) * 20, Math.sin(a) * 170);
    panel.lookAt(0, 0, 0);
    g.add(panel);
  }
  const rim = new THREE.Mesh(new THREE.TorusGeometry(110, 2, 6, 96), M.accentGlow('cyan', 2));
  rim.rotation.x = Math.PI / 2; g.add(rim);
  const halo = new THREE.Sprite(M.sprite(0x9fe8ff, 0.3)); halo.scale.setScalar(320); g.add(halo);
  return { group: g, update(t) { g.rotation.y = t * 0.03; } };
}

export function createBoneRing(pos, M) {
  const g = new THREE.Group();
  g.position.set(pos.x, pos.y, pos.z);
  const bone = new THREE.MeshStandardMaterial({ color: 0xd8ccb0, roughness: 0.8, metalness: 0.05 });
  for (let i = 0; i < 16; i++) {
    const a = (i / 16) * Math.PI * 2, h = 120 + (i % 3) * 60;
    const spire = new THREE.Mesh(new THREE.ConeGeometry(12, h, 6), bone);
    spire.position.set(Math.cos(a) * 260, 0, Math.sin(a) * 260);
    spire.rotation.z = Math.cos(a) * 0.35; spire.rotation.x = -Math.sin(a) * 0.35;
    g.add(spire);
  }
  const ring = new THREE.Mesh(new THREE.TorusGeometry(260, 10, 10, 96), bone);
  ring.rotation.x = Math.PI / 2; g.add(ring);
  const fire = new THREE.Mesh(new THREE.TorusGeometry(260, 1.5, 6, 96), M.accentGlow('orange', 2.2));
  fire.rotation.x = Math.PI / 2; fire.position.y = 12; g.add(fire);
  return { group: g, update() {} };
}
