// Draw-call reduction and cleanup.
//
// mergeStatic(root): every static mesh under root is baked into one mesh per material, in root's space.
// Anything marked userData.dynamic (turrets, exhaust, shields, rotating parts, blinking lights) is left
// alone, with its whole subtree. Sprites, points and lines are never merged.
//
// disposeTree(root): frees geometries and the materials a ship owns when it leaves the scene.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

const _inv = new THREE.Matrix4(), _m = new THREE.Matrix4();

function normalise(geo) {
  let g = geo.index ? geo.toNonIndexed() : geo.clone();
  for (const name of Object.keys(g.attributes)) if (!['position', 'normal', 'uv'].includes(name)) g.deleteAttribute(name);
  if (!g.attributes.normal) g.computeVertexNormals();
  if (!g.attributes.uv) g.setAttribute('uv', new THREE.Float32BufferAttribute(new Float32Array(g.attributes.position.count * 2), 2));
  // Quantized model attributes (KHR_mesh_quantization) are not float; bring everything to float32.
  for (const name of ['position', 'normal', 'uv']) {
    const a = g.attributes[name];
    if (!(a.array instanceof Float32Array) || a.normalized || a.isInterleavedBufferAttribute) {
      const out = new Float32Array(a.count * a.itemSize);
      for (let i = 0; i < a.count; i++) for (let k = 0; k < a.itemSize; k++) out[i * a.itemSize + k] = a.getComponent(i, k);
      g.setAttribute(name, new THREE.BufferAttribute(out, a.itemSize));
    }
  }
  g.morphAttributes = {};
  g.clearGroups();
  return g;
}

export function mergeStatic(root) {
  root.updateMatrixWorld(true);
  _inv.copy(root.matrixWorld).invert();
  const buckets = new Map();
  const victims = [];
  (function walk(o) {
    for (const c of o.children) {
      if (c.userData.dynamic) continue;
      if (c.isMesh && !c.isInstancedMesh && !c.isSkinnedMesh && !Array.isArray(c.material)) {
        const geo = normalise(c.geometry);
        _m.multiplyMatrices(_inv, c.matrixWorld);
        geo.applyMatrix4(_m);
        // A mirrored transform flips winding; flip it back so faces stay outward.
        if (_m.determinant() < 0) {
          const p = geo.attributes.position, n = geo.attributes.normal, u = geo.attributes.uv;
          for (let i = 0; i < p.count; i += 3) for (const a of [p, n, u]) {
            for (let k = 0; k < a.itemSize; k++) { const t = a.getComponent(i + 1, k); a.setComponent(i + 1, k, a.getComponent(i + 2, k)); a.setComponent(i + 2, k, t); }
          }
        }
        const key = c.material.uuid;
        if (!buckets.has(key)) buckets.set(key, { material: c.material, geos: [] });
        buckets.get(key).geos.push(geo);
        victims.push(c);
      }
      walk(c);
    }
  })(root);
  if (!victims.length) return 0;
  for (const v of victims.reverse()) {
    // Deepest first. Keep dynamic or non-mesh children alive by moving them up to the victim's parent.
    for (const child of [...v.children]) { v.parent.attach(child); }
    v.parent.remove(v);
    v.geometry.dispose();
  }
  for (const { material, geos } of buckets.values()) {
    const merged = mergeGeometries(geos, false);
    for (const g of geos) g.dispose();
    if (!merged) continue;
    merged.computeBoundingSphere();
    const mesh = new THREE.Mesh(merged, material);
    mesh.name = 'merged:' + (material.name || material.type);
    root.add(mesh);
  }
  return victims.length;
}

/** Free a removed subtree: all geometries, and materials the subtree owns (userData.owned). */
export function disposeTree(root) {
  root.traverse((o) => {
    if (o.geometry) o.geometry.dispose();
    const mats = Array.isArray(o.material) ? o.material : o.material ? [o.material] : [];
    for (const m of mats) if (m.userData?.owned) m.dispose();
  });
}

export const markDynamic = (...objs) => { for (const o of objs) if (o) o.userData.dynamic = true; return objs[0]; };
export const owned = (mat) => { mat.userData.owned = true; return mat; };
