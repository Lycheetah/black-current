// Minable asteroids and the mining beam. Reads world.mining and the player's mining state.
// Each asteroid is a lumpy rock with glowing veins in its ore's colour; it shrinks as it is mined.
import * as THREE from 'three';
import { ORES } from '../data/ores.js';

function rockGeometry(seed) {
  const g = new THREE.IcosahedronGeometry(1, 3);
  const p = g.attributes.position, v = new THREE.Vector3();
  let s = seed;
  const r = () => ((s = (s * 16807) % 2147483647) / 2147483647);
  const bumps = Array.from({ length: 7 }, () => ({ d: new THREE.Vector3(r() - 0.5, r() - 0.5, r() - 0.5).normalize(), a: 0.12 + r() * 0.25 }));
  for (let i = 0; i < p.count; i++) {
    v.fromBufferAttribute(p, i);
    let k = 1;
    for (const b of bumps) k += b.a * Math.max(0, v.dot(b.d)) ** 3 - b.a * 0.25;
    v.multiplyScalar(k * (0.9 + 0.1 * Math.sin(v.x * 9 + v.y * 7)));
    v.y *= 0.72;
    p.setXYZ(i, v.x, v.y, v.z);
  }
  g.computeVertexNormals();
  return g;
}

export function createOreRocks(scene, M) {
  const group = new THREE.Group();
  scene.add(group);
  const items = new Map();
  const mats = Object.fromEntries(Object.values(ORES).map((o) => [o.id, new THREE.MeshStandardMaterial({
    color: 0x4a4440, roughness: 0.92, metalness: 0.15, emissive: new THREE.Color(o.color), emissiveIntensity: 0.28, flatShading: true,
  })]));
  // Mining beam: a glowing cylinder from the ship to the rock, plus a spark at the impact.
  const beam = new THREE.Mesh(new THREE.CylinderGeometry(1, 1, 1, 10, 1, true), new THREE.MeshBasicMaterial({ color: new THREE.Color(1, 0.6, 0.3).multiplyScalar(3), transparent: true, opacity: 0.7, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false }));
  beam.visible = false;
  const spark = new THREE.Sprite(M.sprite(0xffb070, 1));
  spark.visible = false;
  scene.add(beam, spark);
  const _a = new THREE.Vector3(), _b = new THREE.Vector3(), _mid = new THREE.Vector3(), _up = new THREE.Vector3(0, 1, 0);

  return {
    update(world, shipMesh, t) {
      const live = new Set();
      for (const r of world.mining.rocks) {
        if (r.sector !== world.sector.id) continue;
        live.add(r.id);
        let it = items.get(r.id);
        if (!it) {
          let seed = 7; for (const c of r.id) seed = (seed * 31 + c.charCodeAt(0)) % 2147483647;
          const mesh = new THREE.Mesh(rockGeometry(seed || 11), mats[r.ore]);
          mesh.position.set(r.pos.x, r.pos.y, r.pos.z);
          mesh.rotation.set(r.spin, r.spin * 1.7, r.spin * 0.6);
          const glow = new THREE.Sprite(M.sprite(ORES[r.ore].color, 0.25));
          glow.position.copy(mesh.position);
          group.add(mesh, glow);
          it = { mesh, glow };
          items.set(r.id, it);
        }
        const f = r.amount / r.max;
        it.mesh.visible = it.glow.visible = r.amount > 0;
        it.mesh.scale.setScalar(r.radius * (0.4 + 0.6 * f));
        it.glow.scale.setScalar(r.radius * 2.2 * (0.4 + 0.6 * f));
        it.mesh.rotation.y = r.spin + t * 0.01;
      }
      for (const [id, it] of items) if (!live.has(id)) { group.remove(it.mesh, it.glow); it.mesh.geometry.dispose(); it.glow.material.dispose(); items.delete(id); }
      // The beam while the player mines.
      const p = world.entities.find((e) => e.id === world.playerId);
      const rock = p?.mining ? world.mining.rocks.find((r) => r.id === p.mining.rockId) : null;
      beam.visible = spark.visible = !!(rock && shipMesh);
      if (!beam.visible) return;
      _a.copy(shipMesh.position);
      _b.set(rock.pos.x, rock.pos.y, rock.pos.z);
      const toShip = _a.clone().sub(_b).normalize();
      _b.addScaledVector(toShip, rock.radius * (0.4 + 0.6 * rock.amount / rock.max) * 0.9);
      const len = _a.distanceTo(_b);
      _mid.copy(_a).add(_b).multiplyScalar(0.5);
      beam.position.copy(_mid);
      beam.quaternion.setFromUnitVectors(_up, _b.clone().sub(_a).normalize());
      const pulse = 0.6 + 0.4 * Math.sin(t * 14);
      const w = Math.max(1.5, shipMesh.userData.length * 0.02) * pulse;
      beam.scale.set(w, len, w);
      beam.material.color.setHex(ORES[rock.ore].color).multiplyScalar(3);
      spark.position.copy(_b);
      spark.scale.setScalar(Math.max(20, rock.radius * 0.5) * (0.7 + 0.5 * pulse));
    },
  };
}
