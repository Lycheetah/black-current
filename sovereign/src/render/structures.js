// Architecture and role structures: the large-scale parts that make a silhouette.
// Architectures (per civilisation) add their defining structure; roles (per class) add what the job needs:
// flight decks, cargo, a spinal gun, broadside galleries, titan superstructure.
//   ctx: { g, P, L, W, H, M, mats: {hull, trim, gold, glow}, rnd, tile, loft }
import * as THREE from 'three';
import { loftGeometry, finGeometry, ss } from './loft.js';

const T = (t, L) => (t - 0.5) * L;
const mesh = (geo, mat, x = 0, y = 0, z = 0) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); return m; };
const _glowCache = new Map();
// Shared per colour and strength across every ship that uses it.
const glow = (hex, k = 2.2) => {
  const key = hex + ':' + k;
  if (!_glowCache.has(key)) _glowCache.set(key, new THREE.MeshBasicMaterial({ color: new THREE.Color(hex).multiplyScalar(k), toneMapped: false }));
  return _glowCache.get(key);
};
const _cargo = new Map();
const cargoMat = (hex) => { if (!_cargo.has(hex)) _cargo.set(hex, new THREE.MeshStandardMaterial({ color: hex, metalness: 0.3, roughness: 0.7 })); return _cargo.get(hex); };
const pod = (len, r, exp, tile) => loftGeometry({ length: len, width: (u) => r * Math.pow(ss(0, 0.3, u), 0.6) * (1 - 0.15 * ss(0.85, 1, u)), top: (u) => r * Math.pow(ss(0, 0.3, u), 0.6), bottom: (u) => r * Math.pow(ss(0, 0.3, u), 0.6), exp, segs: 18, rings: 20, tile });

export const ARCH_STRUCTURES = {
  // Cosmic Light: the spine runs through a great open halo ring held by four spokes.
  halo({ g, P, L, W, H, mats }) {
    const R = W * 1.9, z = T(0.55, L);
    const ring = mesh(new THREE.TorusGeometry(R, L * 0.018, 12, 96), mats.hull, 0, 0, z);
    g.add(ring);
    g.add(mesh(new THREE.TorusGeometry(R, L * 0.004, 6, 96), glow(0xffd27a, 2.4), 0, 0, z + L * 0.015));
    for (let i = 0; i < 4; i++) {
      const a = (i / 4) * Math.PI * 2 + Math.PI / 4;
      const spoke = mesh(new THREE.BoxGeometry(R, L * 0.012, L * 0.02), mats.trim, Math.cos(a) * R / 2, Math.sin(a) * R / 2, z);
      spoke.rotation.z = a; g.add(spoke);
    }
  },
  // Hybrid Fused: a second, different hull stitched alongside, offset and shorter.
  twin({ g, P, L, W, H, mats, tile }) {
    const side = mesh(loftGeometry({ length: L * 0.72, width: (u) => W * 0.42 * Math.pow(ss(0, 0.35, u), 0.6), top: (u) => H * 1.3 * Math.pow(ss(0, 0.35, u), 0.7), bottom: (u) => H * 0.9 * Math.pow(ss(0, 0.35, u), 0.7), exp: 5, segs: 20, rings: 28, tile }), mats.trim, W * 1.05, -H * 0.2, L * 0.1);
    g.add(side);
    for (let i = 0; i < 6; i++) {
      const t = 0.3 + i * 0.09;
      g.add(mesh(new THREE.BoxGeometry(W * 0.6, H * 0.12, L * 0.012), mats.bone, W * 0.55, P.y(t) + H * 0.1, T(t, L)));
    }
  },
  // AI Gods: two outer prongs reaching past the bow, joined by a crossbar.
  trident({ g, P, L, W, H, mats, tile }) {
    for (const s of [-1, 1]) {
      const prong = mesh(loftGeometry({ length: L * 0.85, width: (u) => W * 0.22 * Math.pow(ss(0, 0.5, u), 0.8), top: (u) => H * 0.6 * Math.pow(ss(0, 0.5, u), 0.8), bottom: (u) => H * 0.5 * Math.pow(ss(0, 0.5, u), 0.8), exp: 3, segs: 16, rings: 24, tile }), mats.hull, s * W * 1.15, 0, -L * 0.1);
      g.add(prong);
      g.add(mesh(new THREE.BoxGeometry(L * 0.003, L * 0.003, L * 0.5), mats.gold, s * W * 1.15, H * 0.62, -L * 0.1));
    }
    g.add(mesh(new THREE.BoxGeometry(W * 2.5, H * 0.5, L * 0.06), mats.trim, 0, 0, T(0.62, L)));
  },
  // Cosmic Darkness: a dorsal blade fin over the wing.
  wing({ g, P, L, W, H, mats }) {
    const fin = new THREE.Mesh(finGeometry(H * 3, L * 0.3, L * 0.06, L * 0.25, L * 0.004), mats.trim);
    fin.rotation.z = Math.PI / 2; fin.position.set(0, P.deck(0.6), T(0.62, L));
    g.add(fin);
  },
  // Blackhole: claw arms reaching around the central mass.
  maw({ g, P, L, W, H, mats }) {
    for (const s of [-1, 1]) {
      const arm = mesh(new THREE.TorusGeometry(W * 1.5, L * 0.014, 8, 48, Math.PI * 0.9), mats.trim, 0, 0, T(0.5, L));
      arm.rotation.set(0, s * Math.PI / 2, s * 0.5); g.add(arm);
    }
  },
  // Pagan AI: battlement teeth along both walls.
  fortress({ g, P, L, W, H, mats }) {
    for (const s of [-1, 1]) for (let i = 0; i < 9; i++) {
      const t = 0.12 + i * 0.09;
      g.add(mesh(new THREE.BoxGeometry(W * 0.16, H * 0.5, L * 0.035), mats.trim, s * P.width(t) * 0.88, P.deck(t) + H * 0.2, T(t, L)));
    }
  },
  // AI: the core is a frame; cubes hang in an open lattice around it.
  lattice({ g, P, L, W, H, mats, rnd }) {
    const bar = new THREE.BoxGeometry(L * 0.01, L * 0.01, L * 0.9);
    for (const [x, y] of [[-1, -1], [-1, 1], [1, -1], [1, 1]]) g.add(mesh(bar, mats.trim, x * W * 1.4, y * H * 2, 0));
    for (let i = 0; i < 10; i++) {
      const s = H * (0.8 + rnd() * 1.2);
      g.add(mesh(new THREE.BoxGeometry(s, s, s), rnd() < 0.5 ? mats.hull : mats.trim, (rnd() < 0.5 ? -1 : 1) * W * 1.4, (rnd() < 0.5 ? -1 : 1) * H * 2, T(0.1 + rnd() * 0.8, L)));
    }
  },
};

export const ROLE_STRUCTURES = {
  frigate({ g, P, L, W, H, mats }) {
    for (const s of [-1, 1]) {
      const wing = new THREE.Mesh(finGeometry(W * 0.9, L * 0.22, L * 0.07, L * 0.16, L * 0.006), mats.trim);
      wing.position.set(s * P.width(0.62) * 0.95, P.y(0.62) - H * 0.1, T(0.6, L));
      wing.rotation.y = s < 0 ? Math.PI : 0; if (s < 0) wing.rotation.x = Math.PI;
      wing.rotation.z = s * 0.1; g.add(wing);
    }
  },
  // Destroyers: a gun rail of turret blisters along the spine.
  destroyer({ g, P, L, W, H, mats }) {
    for (let i = 0; i < 6; i++) {
      const t = 0.22 + i * 0.09;
      g.add(mesh(new THREE.CylinderGeometry(H * 0.45, H * 0.55, H * 0.35, 12), mats.trim, 0, P.deck(t) + H * 0.15, T(t, L)));
      g.add(mesh(new THREE.BoxGeometry(H * 0.12, H * 0.12, L * 0.06), mats.gold, 0, P.deck(t) + H * 0.35, T(t, L) - L * 0.03));
    }
  },
  // Battleships: broadside galleries and an armour belt.
  battleship({ g, P, L, W, H, mats }) {
    for (const s of [-1, 1]) {
      g.add(mesh(new THREE.BoxGeometry(W * 0.12, H * 0.7, L * 0.6), mats.trim, s * P.width(0.55) * 1.02, P.y(0.55), T(0.55, L)));
      for (let i = 0; i < 8; i++) g.add(mesh(new THREE.BoxGeometry(W * 0.2, H * 0.14, L * 0.02), mats.hull, s * (P.width(0.55) * 1.02 + W * 0.08), P.y(0.55) + H * 0.12, T(0.3 + i * 0.065, L)));
    }
  },
  // Carriers: a flight deck over the hull with a lit runway and a hangar mouth.
  carrier({ g, P, L, W, H, mats }) {
    const deckY = P.deck(0.5) + H * 0.6;
    g.add(mesh(new THREE.BoxGeometry(W * 2.2, H * 0.25, L * 0.72), mats.trim, 0, deckY, T(0.55, L)));
    const lamp = glow(0x65f5ff, 2);
    for (let i = 0; i < 12; i++) for (const s of [-1, 1]) g.add(mesh(new THREE.BoxGeometry(W * 0.04, H * 0.05, L * 0.012), lamp, s * W * 0.5, deckY + H * 0.14, T(0.22 + i * 0.055, L)));
    g.add(mesh(new THREE.BoxGeometry(W * 1.4, H * 0.9, L * 0.01), new THREE.MeshBasicMaterial({ color: 0x020305 }), 0, P.y(0.2), T(0.19, L)));
    g.add(mesh(new THREE.BoxGeometry(W * 1.45, H * 0.06, L * 0.012), glow(0xffc56b, 2.2), 0, P.y(0.2) + H * 0.48, T(0.19, L)));
  },
  // Industrials: rows of cargo containers and a crane gantry.
  industrial({ g, P, L, W, H, mats, rnd }) {
    const colours = [0xb5651d, 0x4a6a8a, 0x8a8a3a, 0x7a3a3a];
    for (const s of [-1, 1]) for (let i = 0; i < 6; i++) for (let k = 0; k < 2; k++) {
      const c = cargoMat(colours[(i + k) % 4]);
      g.add(mesh(new THREE.BoxGeometry(W * 0.45, H * 0.6, L * 0.08), c, s * (P.width(0.5) + W * 0.25), P.y(0.5) + (k - 0.5) * H * 0.65, T(0.25 + i * 0.095, L)));
    }
    g.add(mesh(new THREE.BoxGeometry(W * 2.2, H * 0.15, L * 0.02), mats.gold, 0, P.deck(0.4) + H * 1.2, T(0.4, L)));
    for (const s of [-1, 1]) g.add(mesh(new THREE.BoxGeometry(W * 0.06, H * 1.2, L * 0.02), mats.trim, s * W * 1.05, P.deck(0.4) + H * 0.6, T(0.4, L)));
  },
  // Autonomous cores: a crown of sensor spheres.
  core({ g, P, L, W, H, mats }) {
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      g.add(mesh(new THREE.SphereGeometry(H * 0.5, 16, 12), mats.trim, Math.cos(a) * W * 0.7, P.deck(0.55) + H + Math.sin(a) * H * 0.5, T(0.55, L) + Math.sin(a) * W * 0.4));
      g.add(mesh(new THREE.SphereGeometry(H * 0.18, 10, 8), glow(0x65f5ff, 2.5), Math.cos(a) * W * 0.7, P.deck(0.55) + H + Math.sin(a) * H * 0.5 + H * 0.45, T(0.55, L) + Math.sin(a) * W * 0.4));
    }
  },
  // Dreadnoughts: a spinal siege gun running past the bow, ringed with capacitors.
  dreadnought({ g, P, L, W, H, mats }) {
    const len = L * 0.55, z = T(0.15, L) - len * 0.3;
    const barrel = mesh(new THREE.CylinderGeometry(H * 0.45, H * 0.6, len, 20), mats.trim, 0, P.y(0.2), z);
    barrel.rotation.x = Math.PI / 2; g.add(barrel);
    for (let i = 0; i < 5; i++) {
      const ring = mesh(new THREE.TorusGeometry(H * 0.75, H * 0.12, 8, 24), i % 2 ? mats.gold : glow(0x65f5ff, 1.8), 0, P.y(0.2), z - len * 0.35 + i * len * 0.15);
      g.add(ring);
    }
    g.add(mesh(new THREE.CircleGeometry(H * 0.4, 20), glow(0xff8a4a, 2.4), 0, P.y(0.2), z - len / 2 - 0.01)).rotation.y = Math.PI;
  },
  // Titans: a second tier of superstructure, a citadel spire and outrigger drive pylons.
  titan({ g, P, L, W, H, mats, tile }) {
    const tier = mesh(loftGeometry({ length: L * 0.45, width: (u) => W * 0.55 * Math.pow(ss(0, 0.3, u), 0.6), top: (u) => H * 1.6 * Math.pow(ss(0, 0.35, u), 0.7), bottom: () => H * 0.2, exp: 4, segs: 18, rings: 20, tile }), mats.hull, 0, P.deck(0.55) + H * 0.4, T(0.6, L));
    g.add(tier);
    g.add(mesh(new THREE.ConeGeometry(H * 0.5, H * 5, 6), mats.gold, 0, P.deck(0.5) + H * 4.2, T(0.5, L)));
    for (const s of [-1, 1]) {
      g.add(mesh(new THREE.BoxGeometry(W * 1.6, H * 0.3, L * 0.05), mats.trim, s * (P.width(0.82) + W * 0.6), P.y(0.82), T(0.82, L)));
      g.add(mesh(pod(L * 0.3, H * 1.1, 2.4, tile), mats.hull, s * (P.width(0.82) + W * 1.3), P.y(0.82), T(0.82, L)));
    }
  },
};
