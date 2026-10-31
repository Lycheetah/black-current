// Shared PBR materials. Every hull surface uses the same plating set with box-projected UVs,
// so ships, stations and wrecks read as one built world.
import * as THREE from 'three';
import { createPlatingTextures, createWindowTexture, createGlowTexture } from './textures.js';

/** Recompute UVs by projecting along each face's dominant normal axis; tile = world units per texture. */
export function boxUV(geometry, tile) {
  const g = geometry.index ? geometry.toNonIndexed() : geometry;
  g.computeVertexNormals();
  const p = g.attributes.position, n = g.attributes.normal;
  const uv = new Float32Array(p.count * 2);
  for (let i = 0; i < p.count; i++) {
    const ax = Math.abs(n.getX(i)), ay = Math.abs(n.getY(i)), az = Math.abs(n.getZ(i));
    let u, v;
    if (ax >= ay && ax >= az) { u = p.getZ(i); v = p.getY(i); }
    else if (ay >= az) { u = p.getX(i); v = p.getZ(i); }
    else { u = p.getX(i); v = p.getY(i); }
    uv[i * 2] = u / tile; uv[i * 2 + 1] = v / tile;
  }
  g.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  return g;
}

export const ACCENTS = {
  green: 0x6dffa0, gold: 0xffd27a, red: 0xff5a5a, violet: 0xb77cff, purple: 0xb77cff, cyan: 0x65f5ff,
  blue: 0x6aa8ff, white: 0xeaf4ff, amber: 0xffa94d, magenta: 0xff6ad5, teal: 0x4fe0c8, black: 0x8a7cff,
  silver: 0xd8e2f0, orange: 0xff9440, pink: 0xff8fd0,
};
export const accentColor = (name) => ACCENTS[name] ?? 0x65f5ff;

export function createMaterials(renderer) {
  const plate = createPlatingTextures(1024, 7);
  const aniso = Math.min(8, renderer.capabilities.getMaxAnisotropy());
  for (const t of Object.values(plate)) t.anisotropy = aniso;
  const windows = createWindowTexture();
  const hullLights = createWindowTexture(512, 17, 0.9);
  const glow = createGlowTexture();

  const hull = (color, metal = 0.72, rough = 1.0) => new THREE.MeshStandardMaterial({
    color, map: plate.map, roughnessMap: plate.rough, bumpMap: plate.bump, bumpScale: 0.6,
    metalness: metal, roughness: rough,
  });

  return {
    textures: { plate, windows, glow, hullLights },
    hullLight: hull(0xc9ced6),
    hullDark: hull(0x4a4f58, 0.8),
    hullVanta: hull(0x1c1e24, 0.85, 0.9),
    gold: new THREE.MeshStandardMaterial({ color: 0xd9a84a, metalness: 1, roughness: 0.28, bumpMap: plate.bump, bumpScale: 0.4 }),
    ferric: hull(0x7a5a46, 0.6),
    rock: new THREE.MeshStandardMaterial({ color: 0x6a5e54, metalness: 0.05, roughness: 0.95, flatShading: true }),
    windowsMat: new THREE.MeshStandardMaterial({
      color: 0x2b2f36, map: plate.map, metalness: 0.7, roughness: 0.6,
      emissive: 0xffffff, emissiveMap: windows, emissiveIntensity: 1.6,
    }),
    glowCyan: new THREE.MeshBasicMaterial({ color: new THREE.Color(0x65f5ff).multiplyScalar(2.2), toneMapped: false }),
    glowGold: new THREE.MeshBasicMaterial({ color: new THREE.Color(0xffc56b).multiplyScalar(2.2), toneMapped: false }),
    glowRed: new THREE.MeshBasicMaterial({ color: new THREE.Color(0xff4a4a).multiplyScalar(2.5), toneMapped: false }),
    glowGreen: new THREE.MeshBasicMaterial({ color: new THREE.Color(0x5dff8a).multiplyScalar(2.5), toneMapped: false }),
    glowRail: new THREE.MeshBasicMaterial({ color: new THREE.Color(0x65f5ff).multiplyScalar(0.9), toneMapped: false }),
    glowWhite: new THREE.MeshBasicMaterial({ color: new THREE.Color(0xffffff).multiplyScalar(3), toneMapped: false }),
    accentGlow(name, k = 2.2) {
      return new THREE.MeshBasicMaterial({ color: new THREE.Color(accentColor(name)).multiplyScalar(k), toneMapped: false });
    },
    sprite(color, opacity = 1) {
      return new THREE.SpriteMaterial({ map: glow, color, transparent: true, opacity, blending: THREE.AdditiveBlending, depthWrite: false });
    },
  };
}
