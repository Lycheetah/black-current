// Enemy role tethers, EVE style: a pulsing red line from a tackler that pins you, an orange one from a
// webber, and a green flash along a logistics repair. Reads the world (pin and web ids, logiRep events)
// and the ship meshes; writes only its own lines.
import * as THREE from 'three';

const COLORS = { tackle: 0xff4a3a, web: 0xffa040, logi: 0x50ffa0 };

export function createRoleFx(scene) {
  const group = new THREE.Group();
  scene.add(group);
  const pool = [];
  const mkLine = () => {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(6), 3));
    const l = new THREE.Line(g, new THREE.LineBasicMaterial({ transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false }));
    l.frustumCulled = false;
    group.add(l);
    return l;
  };
  let lastSeq = 0;
  const reps = []; // { from, to, t }

  return {
    update(world, meshOf, dt, t) {
      for (const ev of world.events) {
        if (ev.seq <= lastSeq) continue;
        lastSeq = ev.seq;
        if (ev.type === 'logiRep') reps.push({ from: ev.from, to: ev.to, t: 1.2 });
      }
      for (const r of reps) r.t -= dt;
      while (reps.length && reps[0].t <= 0) reps.shift();
      const p = world.entities.find((e) => e.id === world.playerId);
      const links = [];
      if (p && !p.dead && !p.docked) {
        if (p.pinnedBy) links.push([p.pinnedBy, p.id, COLORS.tackle, 0.55 + 0.45 * Math.sin(t * 9)]);
        if (p.webbedBy) links.push([p.webbedBy, p.id, COLORS.web, 0.5 + 0.3 * Math.sin(t * 5)]);
      }
      for (const r of reps) links.push([r.from, r.to, COLORS.logi, Math.min(1, r.t)]);
      let n = 0;
      for (const [a, b, color, alpha] of links) {
        const ma = meshOf(a), mb = meshOf(b);
        if (!ma || !mb) continue;
        const l = pool[n] || (pool[n] = mkLine());
        n++;
        const pos = l.geometry.attributes.position;
        pos.setXYZ(0, ma.position.x, ma.position.y, ma.position.z);
        pos.setXYZ(1, mb.position.x, mb.position.y, mb.position.z);
        pos.needsUpdate = true;
        l.material.color.setHex(color).multiplyScalar(2.5);
        l.material.opacity = alpha;
        l.visible = true;
      }
      for (let i = n; i < pool.length; i++) pool[i].visible = false;
    },
  };
}
