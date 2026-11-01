// Wrecks: a destroyed ship keeps its own hull as a burnt, slowly tumbling wreck with embers, until it
// is looted and breaks up. Wrecks with no hull to adopt get a debris cluster. Reads world.wrecks only.
import * as THREE from 'three';
import { disposeTree } from './optimize.js';

export function createWrecks(scene, M) {
  const burnt = new THREE.MeshStandardMaterial({ color: 0x2b2624, metalness: 0.55, roughness: 0.85, emissive: 0x1a0600, emissiveIntensity: 1 });
  const items = new Map();
  const pending = new Map();

  function strip(mesh) {
    const drop = [];
    mesh.traverse((o) => {
      if (o.isPoints || o.isSprite || o.isLine) { drop.push(o); return; }
      if (o.isMesh) {
        const additive = (Array.isArray(o.material) ? o.material : [o.material]).some((m) => m.blending === THREE.AdditiveBlending || m.transparent);
        if (additive) { drop.push(o); return; }
        const mats = Array.isArray(o.material) ? o.material : [o.material];
        for (const m of mats) if (m.userData?.owned) m.dispose();
        o.material = burnt;
      }
    });
    for (const o of drop) { o.removeFromParent(); o.geometry?.dispose?.(); }
  }

  function debris(w) {
    const g = new THREE.Group();
    let s = w.id.length * 97 + 13;
    const r = () => ((s = (s * 16807) % 2147483647) / 2147483647);
    for (let i = 0; i < 7; i++) {
      const k = w.radius * (0.25 + r() * 0.5);
      const m = new THREE.Mesh(new THREE.BoxGeometry(k, k * 0.3, k * (0.6 + r())), burnt);
      m.position.set((r() - 0.5) * w.radius * 2, (r() - 0.5) * w.radius, (r() - 0.5) * w.radius * 2);
      m.rotation.set(r() * 3, r() * 3, r() * 3);
      g.add(m);
    }
    return g;
  }

  function build(w, mesh) {
    const root = new THREE.Group();
    const body = mesh || debris(w);
    if (mesh) { strip(mesh); body.position.set(0, 0, 0); }
    root.add(body);
    const embers = [];
    for (let i = 0; i < 3; i++) {
      const e = new THREE.Sprite(M.sprite(0xff7a3a, 0.8));
      e.position.set((Math.random() - 0.5) * w.radius, (Math.random() - 0.5) * w.radius * 0.4, (Math.random() - 0.5) * w.radius * 1.4);
      e.scale.setScalar(w.radius * 0.5);
      root.add(e); embers.push(e);
    }
    if (mesh) root.quaternion.copy(mesh.quaternion), body.quaternion.identity();
    scene.add(root);
    return { root, body, embers, phase: Math.random() * 6 };
  }

  return {
    /** A destroyed ship's mesh: keep it for its wreck (true) or let the caller dispose it (false). */
    adopt(world, shipId, mesh) {
      const w = world.wrecks.find((x) => x.shipId === shipId && !items.has(x.id));
      if (!w) return false;
      scene.remove(mesh);
      items.set(w.id, build(w, mesh));
      return true;
    },
    update(world, dt, t) {
      const live = new Set();
      for (const w of world.wrecks) {
        if (w.sector !== world.sector.id) continue;
        live.add(w.id);
        let it = items.get(w.id);
        if (!it) { it = build(w, null); items.set(w.id, it); }
        it.root.position.set(w.pos.x, w.pos.y, w.pos.z);
        it.body.rotation.x += w.spin * dt * 0.3; it.body.rotation.z += w.spin * dt;
        const fade = w.looted ? Math.min(1, w.ttl / 60) : 1;
        it.embers.forEach((e, i) => { e.material.opacity = (w.looted ? 0.15 : 0.55) * fade * (0.6 + 0.4 * Math.sin(t * (2 + i) + it.phase)); });
        it.body.scale.setScalar(w.looted ? 0.6 + 0.4 * fade : 1);
      }
      for (const [id, it] of items) if (!live.has(id)) { scene.remove(it.root); for (const e of it.embers) e.material.dispose(); disposeTree(it.body); items.delete(id); }
    },
  };
}
