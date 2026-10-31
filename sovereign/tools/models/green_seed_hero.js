// Green Seed · Savanah Starter Frigate · hero model.
// Codex: black predatory armour folds like layered chitin; gold filigree like vascular structure;
// emerald nodes everywhere; at the centre the great eye; hooked silhouettes, predatory bows.
// Units: metres, nose toward −Z, up +Y. Materials named HULL / TRIM / GOLD / GLOW take the game palette.
import * as THREE from 'three';
import { loftGeometry, ss, bump } from '../../src/render/loft.js';

export const meta = { name: 'green_seed_hero.glb', length: 34, hull: 'savanah_starter' };

export function build() {
  const HULL = new THREE.MeshStandardMaterial({ name: 'HULL', color: 0x2a2b26, metalness: 0.7, roughness: 0.45 });
  const TRIM = new THREE.MeshStandardMaterial({ name: 'TRIM', color: 0x15160f, metalness: 0.8, roughness: 0.5 });
  const GOLD = new THREE.MeshStandardMaterial({ name: 'GOLD', color: 0xd4a347, metalness: 1, roughness: 0.3 });
  const GLOW = new THREE.MeshBasicMaterial({ name: 'GLOW', color: 0x3dff8a });
  const L = 34;
  const ship = new THREE.Group();
  ship.name = 'GreenSeed';
  const add = (geo, mat, x = 0, y = 0, z = 0, name) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); if (name) m.name = name; ship.add(m); return m; };
  const Z = (t) => (t - 0.5) * L;

  // Keel body: a long predatory blade, deep at the shoulders, tapering hard to the bow.
  const width = (t) => 4.2 * Math.pow(ss(0, 0.32, t), 0.75) * (1 - 0.18 * bump(0.62, 0.12, t)) * (1 - 0.25 * ss(0.88, 1, t)) + 0.08;
  const top = (t) => 1.6 * Math.pow(ss(0, 0.4, t), 0.8) * (1 + 0.3 * bump(0.45, 0.15, t));
  const bottom = (t) => 1.9 * Math.pow(ss(0, 0.5, t), 0.9) * (1 - 0.35 * ss(0.75, 1, t));
  const y = (t) => -0.5 * (1 - ss(0, 0.4, t));
  add(loftGeometry({ length: L, width, top, bottom, y, exp: 2.4, segs: 32, rings: 64, tile: 4 }), HULL, 0, 0, 0, 'keel');

  // Layered chitin: overlapping dorsal plates, each a little narrower, sweeping back.
  for (let i = 0; i < 7; i++) {
    const t = 0.2 + i * 0.09, len = L * 0.16;
    const plate = add(loftGeometry({
      length: len,
      width: (u) => width(t) * (0.95 - i * 0.04) * Math.pow(ss(0, 0.45, u), 0.6),
      top: (u) => (0.55 + 0.1 * Math.sin(i)) * ss(0, 0.5, u) * (1 - 0.6 * ss(0.8, 1, u)),
      bottom: () => 0.08, exp: 2.2, segs: 24, rings: 14, tile: 3,
    }), i % 2 ? TRIM : HULL, 0, y(t) + top(t) * 0.86, Z(t) + len * 0.15, 'chitin_' + i);
    plate.rotation.x = -0.06;
    // Gold edge where each plate overlaps the next.
    const edge = add(new THREE.TorusGeometry(width(t + 0.06) * (0.9 - i * 0.04), 0.045, 6, 40, Math.PI), GOLD, 0, y(t) + top(t) * 0.8, Z(t) + len * 0.62, 'chitin_edge_' + i);
    edge.scale.set(1, 0.35, 1);
  }

  // Predatory bow: a central prow blade and two hooked mandibles curving inward.
  add(loftGeometry({ length: 8, width: (u) => 0.35 * ss(0, 1, u), top: (u) => 1.1 * ss(0, 1, u), bottom: (u) => 0.4 * ss(0, 1, u), exp: 6, segs: 4, rings: 10, tile: 3 }), TRIM, 0, 0.2, Z(0.02), 'prow_blade');
  for (const s of [-1, 1]) {
    const pts = [];
    for (let i = 0; i <= 16; i++) {
      const u = i / 16;
      pts.push(new THREE.Vector3(s * (2.6 - 1.6 * u * u), -0.6 + Math.sin(u * 2.4) * 0.9, Z(0.28) - u * 12));
    }
    const curve = new THREE.CatmullRomCurve3(pts);
    const geo = new THREE.TubeGeometry(curve, 32, 1, 10);
    const p = geo.attributes.position, c = new THREE.Vector3();
    for (let k = 0; k < p.count; k++) {
      const seg = Math.floor(k / 11) / 32;
      curve.getPointAt(Math.min(1, seg), c);
      const r = 0.55 * (1 - seg * 0.9);
      p.setXYZ(k, c.x + (p.getX(k) - c.x) * r, c.y + (p.getY(k) - c.y) * r, c.z + (p.getZ(k) - c.z) * r);
    }
    geo.computeVertexNormals();
    add(geo, HULL, 0, 0, 0, s < 0 ? 'mandible_port' : 'mandible_starboard');
    add(new THREE.SphereGeometry(0.22, 12, 8), GLOW, s * 1.0, 0.25, Z(0.28) - 11.6, 'mandible_eye');
  }

  // The great eye: an emerald orb in a gold socket ring, set into the forward dorsal.
  const eyeZ = Z(0.3), eyeY = y(0.3) + top(0.3) + 0.35;
  add(new THREE.SphereGeometry(0.85, 32, 20), GLOW, 0, eyeY, eyeZ, 'great_eye');
  const socket = add(new THREE.TorusGeometry(1.05, 0.16, 12, 48), GOLD, 0, eyeY, eyeZ, 'eye_socket');
  socket.rotation.x = Math.PI / 2 - 0.5;
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    const spur = add(new THREE.ConeGeometry(0.1, 0.9, 5), GOLD, Math.cos(a) * 1.3, eyeY + 0.1, eyeZ + Math.sin(a) * 1.3, 'eye_spur_' + i);
    spur.rotation.set(Math.sin(a) * 1.2, 0, -Math.cos(a) * 1.2);
  }

  // Distributed eyes: emerald nodes down both flanks ("no irreversible action may depend upon one eye").
  for (let i = 0; i < 7; i++) {
    const t = 0.24 + i * 0.085;
    for (const s of [-1, 1]) add(new THREE.SphereGeometry(0.2, 12, 8), GLOW, s * width(t) * 0.97, y(t) + 0.25, Z(t), 'flank_eye');
  }

  // Gold filigree veins branching along the flanks.
  for (const s of [-1, 1]) for (let b = 0; b < 3; b++) {
    const pts = [];
    for (let i = 0; i <= 18; i++) {
      const t = 0.22 + i * 0.035;
      pts.push(new THREE.Vector3(s * width(t) * (0.92 + 0.05 * Math.sin(i * 0.9 + b)), y(t) + top(t) * (0.15 + b * 0.22) + Math.sin(i * 0.7 + b * 2) * 0.12, Z(t)));
    }
    add(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 48, 0.05, 5), GOLD, 0, 0, 0, 'filigree');
  }

  // Hooked fins sweeping back from the aft flanks.
  for (const s of [-1, 1]) {
    const shape = new THREE.Shape();
    shape.moveTo(0, 0); shape.lineTo(5.5, 3.2); shape.quadraticCurveTo(7.2, 4.6, 5.6, 6.4); shape.lineTo(4.8, 4.2); shape.lineTo(0, 5.2); shape.closePath();
    const geo = new THREE.ExtrudeGeometry(shape, { depth: 0.18, bevelEnabled: true, bevelThickness: 0.06, bevelSize: 0.06, bevelSegments: 2 });
    geo.rotateX(Math.PI / 2);
    const fin = add(geo, TRIM, s * width(0.66) * 0.9, y(0.66) + 0.2, Z(0.62), 'hook_fin');
    fin.scale.x = s; fin.rotation.z = s * -0.18;
    add(new THREE.SphereGeometry(0.16, 10, 8), GLOW, s * (width(0.66) * 0.9 + 5.5), y(0.66) + 0.2 - s * 0.0, Z(0.62) + 3.2, 'fin_eye');
  }

  // Drive section: twin pods with gold collars and a central drive.
  for (const s of [-1, 1]) {
    const pod = add(loftGeometry({ length: 9, width: (u) => 1.05 * Math.pow(ss(0, 0.35, u), 0.6), top: (u) => 1.05 * Math.pow(ss(0, 0.35, u), 0.6), bottom: (u) => 1.05 * Math.pow(ss(0, 0.35, u), 0.6), exp: 2.2, segs: 20, rings: 18, tile: 3 }), HULL, s * 2.9, -0.2, Z(0.86), 'drive_pod');
    add(new THREE.TorusGeometry(1.0, 0.14, 8, 32), GOLD, s * 2.9, -0.2, Z(0.86) + 4.4, 'drive_collar');
    const eng = new THREE.Object3D(); eng.name = s < 0 ? 'ENGINE_PORT' : 'ENGINE_STARBOARD';
    eng.position.set(s * 2.9, -0.2, Z(0.86) + 4.6); eng.scale.setScalar(0.85); ship.add(eng);
    pod.rotation.z = s * 0.05;
  }
  const mainEng = new THREE.Object3D(); mainEng.name = 'ENGINE_MAIN';
  mainEng.position.set(0, 0.1, L / 2 + 0.1); mainEng.scale.setScalar(0.7); ship.add(mainEng);

  // Hardpoint nodes on the forward shoulders (the starter's two catalog banks).
  for (const [name, s] of [['NODE_WPN_FL', -1], ['NODE_WPN_FR', 1]]) {
    const n = new THREE.Object3D(); n.name = name;
    n.position.set(s * width(0.37) * 0.55, y(0.37) + top(0.37) + 0.45, Z(0.37));
    ship.add(n);
  }
  return ship;
}
