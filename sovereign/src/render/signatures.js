// Civilisation signature parts: each Pantheon civilisation's visual language from the canon codex,
// built onto a hull so the fourteen families read apart at a glance.
//   ctx: { g, P (hull profile), L, W, H, mats: {hull, trim, accent, accent2, glow}, M, rnd, tile }
import * as THREE from 'three';
import { loftGeometry, finGeometry, ss } from './loft.js';

const glowMat = (hex, k = 2.2) => new THREE.MeshBasicMaterial({ color: new THREE.Color(hex).multiplyScalar(k), toneMapped: false });
const T = (t, L) => (t - 0.5) * L;
const mesh = (geo, mat, x = 0, y = 0, z = 0) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); return m; };

/** Tapered curved horn/hook following a quadratic curve. */
function hook(len, r0, curl, mat) {
  const pts = [];
  for (let i = 0; i <= 12; i++) { const u = i / 12; pts.push(new THREE.Vector3(0, Math.sin(u * curl) * len * 0.35, -u * len)); }
  const curve = new THREE.CatmullRomCurve3(pts);
  const geo = new THREE.TubeGeometry(curve, 24, 1, 8);
  // Taper the tube toward its tip.
  const p = geo.attributes.position, c = new THREE.Vector3();
  for (let i = 0; i < p.count; i++) {
    const seg = Math.floor(i / 9) / 24;
    curve.getPointAt(Math.min(1, seg), c);
    const k = r0 * (1 - seg * 0.92);
    p.setXYZ(i, c.x + (p.getX(i) - c.x) * k, c.y + (p.getY(i) - c.y) * k, c.z + (p.getZ(i) - c.z) * k);
  }
  geo.computeVertexNormals();
  return new THREE.Mesh(geo, mat);
}

export const SIGNATURES = {
  // BLACK / GOLD / EMERALD · PREDATORY HOOKS · DISTRIBUTED EYES · LIVING MACHINE ECOLOGY
  hooks_eyes({ g, P, L, W, H, mats }) {
    for (const s of [-1, 1]) {
      const h = hook(L * 0.28, L * 0.012, 2.4, mats.trim);
      h.position.set(s * P.width(0.18) * 0.9, P.y(0.18), T(0.2, L));
      h.rotation.z = s * 0.5; h.rotation.y = s * -0.12;
      g.add(h);
      const h2 = hook(L * 0.16, L * 0.008, 2.8, mats.gold);
      h2.position.set(s * P.width(0.55) * 1.02, P.y(0.55) - H * 0.2, T(0.55, L)); h2.rotation.z = s * 1.9;
      g.add(h2);
    }
    const eye = glowMat(0x3dff8a, 3);
    for (let i = 0; i < 8; i++) {
      const t = 0.25 + i * 0.075, s = i % 2 ? 1 : -1;
      g.add(mesh(new THREE.SphereGeometry(L * 0.009, 12, 8), eye, s * P.width(t) * 0.98, P.y(t) + P.top(t) * 0.35, T(t, L)));
    }
    g.add(mesh(new THREE.SphereGeometry(L * 0.02, 16, 12), eye, 0, P.deck(0.12) - H * 0.1, T(0.12, L)));
  },
  // WHITE / GOLD / CYAN · FLOWING PROTECTIVE SHELLS · WITNESS FACES · LUMINOUS NEURAL CHANNELS
  shells({ g, P, L, W, H, mats }) {
    for (let i = 0; i < 4; i++) {
      const t = 0.3 + i * 0.13;
      const shell = new THREE.Mesh(new THREE.SphereGeometry(P.width(t) * 1.05, 32, 12, 0, Math.PI * 2, 0, Math.PI * 0.32), mats.hull);
      shell.scale.set(1, 0.45, 0.55); shell.position.set(0, P.y(t) + P.top(t) * 0.2, T(t, L));
      g.add(shell);
    }
    const ch = glowMat(0x7ff3ff, 2.4);
    for (const s of [-1, 0, 1]) {
      const pts = []; for (let i = 0; i <= 20; i++) { const t = 0.2 + i * 0.035; pts.push(new THREE.Vector3(s * P.width(t) * 0.5, P.deck(t) + H * 0.32, T(t, L))); }
      g.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 40, L * 0.0025, 5), ch));
    }
    const face = mesh(new THREE.CircleGeometry(L * 0.03, 24), glowMat(0xfff1c0, 1.6), 0, P.y(0.05) + H * 0.2, T(0.04, L));
    face.rotation.y = Math.PI; g.add(face);
  },
  // PURPLE / YELLOW / ORANGE · FRACTURED BEAST ARMOUR · SPIKES · VISIBLE REBUILDS
  spikes({ g, P, L, W, H, mats, rnd }) {
    for (let i = 0; i < 16; i++) {
      const t = 0.15 + rnd() * 0.75, s = rnd() < 0.5 ? -1 : 1;
      const len = L * (0.04 + rnd() * 0.1);
      const c = mesh(new THREE.ConeGeometry(L * 0.012, len, 5), i % 3 ? mats.trim : mats.gold);
      c.position.set(s * P.width(t) * (0.6 + rnd() * 0.45), P.deck(t) + len * 0.3 * rnd(), T(t, L));
      c.rotation.set((rnd() - 0.5) * 1.2, 0, s * -(0.6 + rnd() * 0.8));
      g.add(c);
    }
    const seam = glowMat(0xffd84a, 2.6);
    for (let i = 0; i < 6; i++) {
      const t = 0.25 + rnd() * 0.6, s = rnd() < 0.5 ? -1 : 1;
      const plate = mesh(new THREE.BoxGeometry(W * 0.3, H * 0.15, L * 0.08), mats.hull, s * P.width(t) * 0.55, P.deck(t) + H * 0.05, T(t, L));
      plate.rotation.set(rnd() * 0.3, rnd() * 0.5, rnd() * 0.3);
      g.add(plate);
      plate.add(mesh(new THREE.BoxGeometry(W * 0.31, H * 0.03, L * 0.004), seam, 0, 0, L * 0.04));
    }
  },
  // VIOLET STARFIELD · SILVER CONSTELLATION LINES · CLOAKED WINGS · FELINE SENSOR FORMS
  cloak_wings({ g, P, L, W, H, mats, M }) {
    for (const s of [-1, 1]) {
      const wing = new THREE.Mesh(finGeometry(W * 2.2, L * 0.5, L * 0.08, L * 0.42, L * 0.004), mats.trim);
      wing.position.set(s * P.width(0.55) * 0.9, P.y(0.55), T(0.5, L));
      wing.rotation.y = s < 0 ? Math.PI : 0; if (s < 0) wing.rotation.x = Math.PI;
      wing.rotation.z = s * -0.08;
      g.add(wing);
      const ear = new THREE.Mesh(finGeometry(H * 1.4, L * 0.06, L * 0.01, L * 0.05, L * 0.004), mats.trim);
      ear.rotation.z = Math.PI / 2 + s * 0.35; ear.position.set(s * W * 0.18, P.deck(0.2), T(0.2, L));
      g.add(ear);
    }
    const star = new THREE.LineBasicMaterial({ color: new THREE.Color(0xdfe8ff).multiplyScalar(1.8), toneMapped: false });
    for (const s of [-1, 1]) {
      const pts = [0.3, 0.42, 0.5, 0.62, 0.7].map((t, i) => new THREE.Vector3(s * (P.width(t) + W * (0.3 + (i % 2) * 0.5)), P.y(t) + H * 0.1, T(t, L)));
      g.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), star));
      for (const p of pts) { const sp = new THREE.Sprite(M.sprite(0xe8eeff, 1)); sp.position.copy(p); sp.scale.setScalar(L * 0.03); g.add(sp); }
    }
  },
  // WHITE / GOLD RADIANCE · SOLAR CORES · OPEN CELESTIAL BLADES · VISIBLE ENERGY FLOW
  halo_blades({ g, P, L, W, H, mats, M }) {
    const z = T(0.78, L), y = P.y(0.78) + P.top(0.78);
    const core = mesh(new THREE.SphereGeometry(H * 0.9, 24, 16), glowMat(0xfff0b0, 2.8), 0, y + H * 0.6, z);
    g.add(core);
    const sp = new THREE.Sprite(M.sprite(0xffd27a, 0.8)); sp.position.copy(core.position); sp.scale.setScalar(H * 8); g.add(sp);
    const halo = mesh(new THREE.TorusGeometry(H * 2.4, L * 0.004, 8, 64), glowMat(0xffd27a, 2), 0, y + H * 0.6, z);
    g.add(halo);
    for (let i = 0; i < 10; i++) {
      const a = (i / 10) * Math.PI * 2;
      const blade = new THREE.Mesh(finGeometry(H * 2.6, L * 0.05, L * 0.01, L * 0.02, L * 0.003), mats.gold);
      blade.position.set(0, y + H * 0.6, z); blade.rotation.set(Math.PI / 2, 0, a);
      g.add(blade);
    }
  },
  // MIDNIGHT ARMOUR · ORANGE ACCRETION FIRE · CENTRAL MASS · GRAVITATIONAL CLAWS
  maw({ g, P, L, W, H, mats, M }) {
    const z = T(0.48, L), y = P.deck(0.48) + H * 0.6;
    g.add(mesh(new THREE.SphereGeometry(H * 1.3, 32, 16), new THREE.MeshBasicMaterial({ color: 0x000000 }), 0, y, z));
    const ring = mesh(new THREE.TorusGeometry(H * 2, H * 0.12, 10, 64), glowMat(0xff8a2a, 3), 0, y, z);
    ring.rotation.x = Math.PI / 2 - 0.3; g.add(ring);
    const sp = new THREE.Sprite(M.sprite(0xff8a2a, 0.6)); sp.position.set(0, y, z); sp.scale.setScalar(H * 7); g.add(sp);
    for (const s of [-1, 1]) for (const k of [0, 1]) {
      const c = hook(L * (0.2 - k * 0.05), L * 0.011, 1.6, mats.trim);
      c.position.set(s * P.width(0.1) * (1.4 + k * 0.6), P.y(0.1) - k * H * 0.5, T(0.12, L));
      c.rotation.set(-0.2, s * 0.35, s * (0.9 + k * 0.4));
      g.add(c);
    }
  },
  // INDUSTRIAL GREY + BONE LATTICE · VIOLET INTERNALS · DELIBERATE ASYMMETRY · STITCHED ALONG THE LENGTH
  stitched({ g, P, L, W, H, mats, rnd }) {
    const s = 1;
    const pod = new THREE.Mesh(loftGeometry({ length: L * 0.5, width: (u) => W * 0.32 * Math.pow(ss(0, 0.3, u), 0.6), top: (u) => W * 0.28 * Math.pow(ss(0, 0.3, u), 0.6), bottom: (u) => W * 0.28 * Math.pow(ss(0, 0.3, u), 0.6), exp: 2.3, segs: 16, rings: 24 }), mats.bone);
    pod.position.set(s * (P.width(0.6) + W * 0.25), P.y(0.6) + H * 0.3, T(0.62, L));
    g.add(pod);
    const stitch = glowMat(0xb46cff, 2.8);
    for (let i = 0; i < 18; i++) {
      const t = 0.12 + i * 0.045;
      g.add(mesh(new THREE.BoxGeometry(W * 0.12, H * 0.05, L * 0.004), stitch, 0, P.deck(t) + H * 0.02, T(t, L)));
    }
    for (let i = 0; i < 5; i++) {
      const t = 0.3 + i * 0.1;
      const rib = mesh(new THREE.TorusGeometry(P.width(t) * 0.9, L * 0.004, 6, 24, Math.PI), mats.bone, 0, P.y(t), T(t, L));
      rib.rotation.y = rnd() * 0.2; g.add(rib);
    }
  },
  // OLIVE INDUSTRIAL PLATE · ORANGE PURSUIT MARKS · OVERSIZED ENGINES · FIELD-SERVICE GEOMETRY
  industrial({ g, P, L, W, H, mats }) {
    for (const s of [-1, 1]) {
      const eng = mesh(new THREE.CylinderGeometry(H * 1.1, H * 1.3, L * 0.32, 20), mats.trim, s * (P.width(0.8) + H * 0.9), P.y(0.8), T(0.8, L));
      eng.rotation.x = Math.PI / 2; g.add(eng);
      const noz = mesh(new THREE.CircleGeometry(H * 1.0, 20), glowMat(0xffa24a, 2.6), s * (P.width(0.8) + H * 0.9), P.y(0.8), T(0.8, L) + L * 0.161);
      g.add(noz);
      for (let i = 0; i < 3; i++) g.add(mesh(new THREE.BoxGeometry(W * 0.25, H * 0.5, L * 0.06), mats.hull, s * P.width(0.35 + i * 0.1) * 0.55, P.deck(0.35 + i * 0.1) + H * 0.25, T(0.35 + i * 0.1, L)));
    }
    const mark = glowMat(0xff7a1a, 1.5);
    for (let i = 0; i < 3; i++) g.add(mesh(new THREE.BoxGeometry(P.width(0.25) * 2.02, H * 0.06, L * 0.012), mark, 0, P.deck(0.24 + i * 0.03), T(0.24 + i * 0.03, L)));
    const mast = mesh(new THREE.CylinderGeometry(L * 0.002, L * 0.002, H * 4, 6), mats.trim, W * 0.15, P.deck(0.5) + H * 2, T(0.5, L)); g.add(mast);
  },
  // MATTE BLACK · RED SENSOR SEAMS · SPEAR FORMS · MINIMAL EXTERNAL SYSTEMS
  spear({ g, P, L, W, H, mats }) {
    const spear = new THREE.Mesh(loftGeometry({ length: L * 0.45, width: (u) => W * 0.22 * ss(0, 1, u), top: (u) => H * 0.4 * ss(0, 1, u), bottom: (u) => H * 0.3 * ss(0, 1, u), exp: 7, segs: 4, rings: 12 }), mats.trim);
    spear.position.set(0, P.y(0.05), -L * 0.6); g.add(spear);
    const seam = glowMat(0xff2a3a, 3);
    for (const s of [-1, 1]) {
      const pts = []; for (let i = 0; i <= 24; i++) { const t = 0.05 + i * 0.038; pts.push(new THREE.Vector3(s * P.width(t) * 1.004, P.y(t) + P.top(t) * 0.5, T(t, L))); }
      g.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 48, L * 0.0016, 4), seam));
    }
    g.add(mesh(new THREE.BoxGeometry(L * 0.0016, H * 0.08, L * 0.5), seam, 0, P.deck(0.4) + H * 0.02, T(0.4, L)));
  },
  // BLACK / GOLD GOTHIC ARMOUR · VIOLET CORES · CATHEDRAL SPIRES · CROWNED MASKS
  cathedral({ g, P, L, W, H, mats, M }) {
    for (let i = 0; i < 7; i++) {
      const t = 0.3 + i * 0.07, h = H * (1.8 + Math.sin(i / 6 * Math.PI) * 2.4);
      for (const s of i % 2 ? [-1, 1] : [0]) {
        const sp = mesh(new THREE.ConeGeometry(H * 0.22, h, 6), mats.gold, s * P.width(t) * 0.45, P.deck(t) + h / 2, T(t, L));
        g.add(sp);
      }
    }
    const v = glowMat(0xb46cff, 3);
    for (const s of [-1, 1]) for (let i = 0; i < 3; i++) g.add(mesh(new THREE.OctahedronGeometry(H * 0.35), v, s * P.width(0.45 + i * 0.12) * 0.98, P.y(0.45 + i * 0.12), T(0.45 + i * 0.12, L)));
    const crown = mesh(new THREE.TorusGeometry(W * 0.22, L * 0.004, 6, 32), mats.gold, 0, P.deck(0.15) + H * 0.3, T(0.15, L));
    crown.rotation.x = Math.PI / 2; g.add(crown);
    for (let i = 0; i < 6; i++) { const a = i / 6 * Math.PI * 2; g.add(mesh(new THREE.ConeGeometry(L * 0.004, H * 0.8, 4), mats.gold, Math.cos(a) * W * 0.22, P.deck(0.15) + H * 0.7, T(0.15, L) + Math.sin(a) * W * 0.22)); }
  },
  // WHITE CRYSTAL FRAME · ICY BLUE FACETS · FEATHER ARRAYS · DISTRIBUTED HALO SYSTEMS
  crystal_feathers({ g, P, L, W, H, mats }) {
    const crystal = new THREE.MeshStandardMaterial({ color: 0xcfefff, metalness: 0.1, roughness: 0.05, emissive: 0x3aa8ff, emissiveIntensity: 0.6, transparent: true, opacity: 0.85 });
    for (const s of [-1, 1]) for (let i = 0; i < 7; i++) {
      const f = new THREE.Mesh(finGeometry(W * (0.8 + i * 0.12), L * 0.05, L * 0.012, L * 0.06 + i * L * 0.012, L * 0.003), crystal);
      f.position.set(s * P.width(0.55) * 0.9, P.y(0.55) + H * 0.2, T(0.5 + i * 0.035, L));
      f.rotation.y = s < 0 ? Math.PI : 0; if (s < 0) f.rotation.x = Math.PI;
      f.rotation.z = s * (0.15 + i * 0.07);
      g.add(f);
    }
    for (let i = 0; i < 5; i++) {
      const t = 0.2 + i * 0.15;
      const shard = mesh(new THREE.OctahedronGeometry(H * 0.6, 0), crystal, 0, P.deck(t) + H * 0.6, T(t, L));
      shard.scale.set(0.5, 1.8, 0.5); g.add(shard);
      const halo = mesh(new THREE.TorusGeometry(H * 0.9, L * 0.0025, 6, 32), glowMat(0x9fe8ff, 2), 0, P.deck(t) + H * 1.9, T(t, L));
      halo.rotation.x = Math.PI / 2; g.add(halo);
    }
  },
  // POLISHED SILVER-WHITE · GOLD BOUNDARIES · RADIAL REACTORS · CENTRAL LIGHT
  radial_crown({ g, P, L, W, H, mats, M }) {
    for (const s of [-1, 1]) for (const t of [0.4, 0.65]) {
      const disc = mesh(new THREE.CylinderGeometry(H * 1.2, H * 1.2, H * 0.3, 32), mats.hull, s * (P.width(t) + H * 0.4), P.y(t), T(t, L));
      disc.rotation.z = Math.PI / 2; g.add(disc);
      const rim = mesh(new THREE.TorusGeometry(H * 1.2, H * 0.08, 6, 32), mats.gold, s * (P.width(t) + H * 0.56), P.y(t), T(t, L));
      rim.rotation.y = Math.PI / 2; g.add(rim);
      const c = mesh(new THREE.CircleGeometry(H * 0.5, 24), glowMat(0xfff4d0, 3), s * (P.width(t) + H * 0.57), P.y(t), T(t, L));
      c.rotation.y = s * Math.PI / 2; g.add(c);
    }
    const y = P.deck(0.62) + H * 3.4;
    const crown = mesh(new THREE.TorusGeometry(W * 0.35, L * 0.006, 8, 64), mats.gold, 0, y, T(0.62, L));
    crown.rotation.x = Math.PI / 2; g.add(crown);
    const light = new THREE.Sprite(M.sprite(0xfff4d0, 0.9)); light.position.set(0, y, T(0.62, L)); light.scale.setScalar(W * 0.9); g.add(light);
    for (let i = 0; i < 12; i++) { const a = i / 12 * Math.PI * 2; g.add(mesh(new THREE.ConeGeometry(L * 0.004, H * (i % 2 ? 0.8 : 1.6), 4), mats.gold, Math.cos(a) * W * 0.35, y + H * 0.5, T(0.62, L) + Math.sin(a) * W * 0.35)); }
  },
  // BONE / BRONZE / CHAINS · HORNED SKULLS · FURNACE CORES · FORTRESS SILHOUETTES
  fortress({ g, P, L, W, H, mats, M }) {
    for (let i = 0; i < 6; i++) {
      const t = 0.25 + i * 0.1;
      const rib = mesh(new THREE.TorusGeometry(P.width(t) * 1.15, L * 0.007, 6, 24, Math.PI), mats.bone, 0, P.y(t), T(t, L));
      g.add(rib);
    }
    for (const s of [-1, 1]) {
      const horn = hook(L * 0.18, L * 0.014, 2.2, mats.bone);
      horn.position.set(s * W * 0.25, P.deck(0.08), T(0.1, L)); horn.rotation.set(-0.6, s * 0.4, s * 0.6);
      g.add(horn);
      for (const t of [0.45, 0.7]) g.add(mesh(new THREE.BoxGeometry(W * 0.22, H * 3, L * 0.06), mats.gold, s * P.width(t) * 0.5, P.deck(t) + H * 1.5, T(t, L)));
    }
    const furnace = mesh(new THREE.SphereGeometry(H * 0.8, 16, 12), glowMat(0xff6a1a, 3), 0, P.deck(0.55) + H * 0.5, T(0.55, L));
    g.add(furnace);
    const sp = new THREE.Sprite(M.sprite(0xff6a1a, 0.7)); sp.position.copy(furnace.position); sp.scale.setScalar(H * 6); g.add(sp);
    for (let i = 0; i < 10; i++) {
      const t = 0.3 + i * 0.05;
      const link = mesh(new THREE.TorusGeometry(H * 0.18, H * 0.05, 4, 10), mats.gold, P.width(t) * 1.02, P.y(t) - H * 0.4, T(t, L));
      link.rotation.y = i % 2 ? Math.PI / 2 : 0; g.add(link);
    }
  },
  // GREY MODULAR BLOCKS · CYAN CIRCUITRY · REPLACEABLE GEOMETRY · NO REQUIRED ANTHROPOMORPHISM
  modules({ g, P, L, W, H, mats, rnd }) {
    const circuit = glowMat(0x4ff0ff, 2.4);
    for (let i = 0; i < 22; i++) {
      const t = 0.15 + rnd() * 0.75, x = (rnd() - 0.5) * 1.6 * P.width(t);
      const s = H * (0.4 + rnd() * 0.9);
      const b = mesh(new THREE.BoxGeometry(s, s * (0.5 + rnd()), s), i % 4 ? mats.hull : mats.trim, x, P.deck(t) + s * 0.4, T(t, L));
      g.add(b);
      if (i % 3 === 0) b.add(mesh(new THREE.BoxGeometry(s * 1.01, s * 0.06, s * 1.01), circuit, 0, s * 0.2, 0));
    }
    for (let i = 0; i < 4; i++) g.add(mesh(new THREE.BoxGeometry(L * 0.0015, H * 0.03, L * 0.6), circuit, (i - 1.5) * W * 0.2, P.deck(0.5) + H * 0.02, T(0.5, L)));
  },
};
