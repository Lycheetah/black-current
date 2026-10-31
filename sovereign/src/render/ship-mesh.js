// Procedural capital hull built from a fleet-catalog record.
// Proportions come from class size and a per-race seed, so the 252 hulls read as families.
// Hardpoint nodes sit at the catalog's weapon banks (NODE = HARDPOINT = GUN).
import * as THREE from 'three';
import { boxUV, accentColor } from './materials.js';
import { loftGeometry, finGeometry, ss, bump } from './loft.js';

function seeded(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); }
  return () => ((h = Math.imul(h ^ (h >>> 15), 2246822507) >>> 0) / 4294967296);
}

/** Bank → normalised hull position (x across beam, z along length; -z is the nose). */
export const BANK_LAYOUT = {
  WPN_FL: [-0.24, -0.2], WPN_FR: [0.24, -0.2],
  WPN_ML: [-0.32, 0.06], WPN_MR: [0.32, 0.06],
  WPN_AL: [-0.28, 0.28], WPN_AR: [0.28, 0.28],
};

export const hullLength = (hull) => hull.radius * 5.6;

// Per-civilisation hull doctrine: how the Pantheon's ships differ in silhouette.
const RACE_FORM = {
  savanah: { exp: 2.6, nose: 0.34, wide: 0.2, fins: 2, spire: true, sponsons: false },
  sol_symbiots: { exp: 2.4, nose: 0.3, wide: 0.22, fins: 0, spire: false, sponsons: true },
  chaos: { exp: 4.5, nose: 0.22, wide: 0.24, fins: 4, spire: true, sponsons: false },
  cosmic_darkness: { exp: 5, nose: 0.42, wide: 0.17, fins: 2, spire: false, sponsons: false },
  cosmic_light: { exp: 2.2, nose: 0.38, wide: 0.19, fins: 2, spire: true, sponsons: false },
  blackhole: { exp: 3, nose: 0.26, wide: 0.24, fins: 0, spire: false, sponsons: true },
  hybrid_fused: { exp: 2.8, nose: 0.3, wide: 0.21, fins: 2, spire: false, sponsons: true },
  human_hunters: { exp: 5.5, nose: 0.28, wide: 0.2, fins: 0, spire: false, sponsons: true },
  ai_hunters: { exp: 6, nose: 0.4, wide: 0.16, fins: 2, spire: false, sponsons: false },
  amethyst_angels: { exp: 2.4, nose: 0.36, wide: 0.18, fins: 4, spire: true, sponsons: false },
  techno_angels: { exp: 3.5, nose: 0.4, wide: 0.17, fins: 4, spire: true, sponsons: false },
  ai_gods: { exp: 3, nose: 0.3, wide: 0.22, fins: 2, spire: true, sponsons: true },
  pagan_ai: { exp: 4, nose: 0.25, wide: 0.21, fins: 0, spire: true, sponsons: true },
  ai: { exp: 6, nose: 0.33, wide: 0.18, fins: 2, spire: false, sponsons: false },
};

// Soft exhaust: bright at the nozzle, fading down the plume and toward the silhouette edge.
let exhaustShared = null;
function exhaustMaterial() {
  exhaustShared ??= new THREE.ShaderMaterial({
    uniforms: { uOut: { value: 1 } },
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
    vertexShader: /* glsl */ `
      varying float vV; varying float vEdge;
      void main(){
        vV = uv.y;
        vec3 n = normalize(normalMatrix * normal);
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        vEdge = abs(dot(n, normalize(-mv.xyz)));
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: /* glsl */ `
      varying float vV; varying float vEdge;
      void main(){
        float along = pow(vV, 2.2);
        float core = pow(vEdge, 1.8);
        vec3 col = mix(vec3(0.25, 0.75, 1.0), vec3(0.9, 0.98, 1.0), pow(vV, 6.0));
        gl_FragColor = vec4(col * along * core * 0.8, 1.0);
      }`,
  });
  return exhaustShared;
}

/** Builds the hull profile functions for a hull record; shared by mesh and hardpoint placement. */
export function hullForm(hull) {
  const r = seeded(hull.raceId + ':' + hull.classId);
  const f = RACE_FORM[hull.raceId] || RACE_FORM.savanah;
  const L = hullLength(hull);
  const big = Math.min(1, hull.radius / 22); // 0 small … 1 titan
  const W = L * (f.wide + (r() - 0.5) * 0.03) * (0.85 + big * 0.25);
  const H = L * (0.05 + r() * 0.02 + big * 0.02);
  const K = L * (0.055 + r() * 0.02);
  const nose = f.nose + (r() - 0.5) * 0.06;
  const waist = 0.12 + r() * 0.12;
  const width = (t) => W * Math.pow(Math.min(1, t / nose), 0.72) * (1 - waist * bump(0.6, 0.13, t)) * (1 - 0.22 * ss(0.86, 1, t)) + W * 0.02;
  const top = (t) => H * (0.3 + 0.7 * Math.pow(Math.min(1, t / (nose * 1.4)), 0.8)) * (1 + 0.35 * bump(0.66, 0.14, t));
  const bottom = (t) => K * (0.25 + 0.75 * Math.pow(Math.min(1, t / (nose * 1.7)), 0.9)) * (1 - 0.3 * ss(0.8, 1, t));
  const y = (t) => -H * 0.3 * (1 - ss(0, 0.45, t));
  return { r, f, L, W, H, K, big, width, top, bottom, y, deck: (t) => y(t) + top(t) };
}

/**
 * @param {object} hull fleet-catalog record
 * @param {ReturnType<import('./materials.js').createMaterials>} M
 */
export function buildShipMesh(hull, M, opts = {}) {
  const F = hullForm(hull);
  const { r, f, L, W, H, K, big, width, top, bottom, y } = F;
  const tile = Math.max(6, L * 0.12);
  const accentName = opts.accent || hull.accent;
  const g = new THREE.Group();
  g.name = hull.id;

  const hullMat = M.hullLight.clone();
  hullMat.color.lerp(new THREE.Color(accentColor(accentName)), 0.05);
  // Running lights scattered over the plating, like a crewed capital hull at night.
  hullMat.emissive = new THREE.Color(0xffffff);
  hullMat.emissiveMap = M.textures.hullLights;
  hullMat.emissiveIntensity = 0.9;
  const strakeMat = M.accentGlow(accentName, 2.0);

  // Main hull.
  g.add(new THREE.Mesh(loftGeometry({ length: L, width, top, bottom, y, exp: f.exp, segs: 28, rings: 56, tile }), hullMat));

  // Dorsal carapace: a darker armour layer riding the deck from the shoulders aft.
  const cT0 = 0.2, cT1 = 0.92, cLen = L * (cT1 - cT0);
  const cMap = (u) => cT0 + u * (cT1 - cT0);
  const carapace = new THREE.Mesh(loftGeometry({
    length: cLen,
    width: (u) => width(cMap(u)) * 0.78 * Math.pow(ss(0, 0.18, u), 0.6) * (1 - 0.4 * ss(0.85, 1, u)),
    top: (u) => H * 0.42 * ss(0, 0.2, u) * (1 - 0.6 * ss(0.85, 1, u)),
    bottom: () => H * 0.05,
    y: (u) => y(cMap(u)) + top(cMap(u)) * 0.82,
    exp: f.exp + 1.5, segs: 24, rings: 36, tile,
  }), M.hullDark);
  carapace.position.z = (cT0 + cT1 - 1) * L / 2;
  g.add(carapace);

  // Ventral keel blade.
  const keel = new THREE.Mesh(loftGeometry({
    length: L * 0.6,
    width: (u) => W * 0.12 * ss(0, 0.3, u) * (1 - 0.5 * ss(0.8, 1, u)),
    top: () => K * 0.2,
    bottom: (u) => K * (0.5 + 0.6 * bump(0.55, 0.25, u)) * ss(0, 0.25, u),
    y: () => -bottom(0.55) * 0.75,
    exp: 4, segs: 16, rings: 24, tile,
  }), M.hullDark);
  keel.position.z = L * 0.12;
  g.add(keel);

  // Superstructure and bridge.
  const supLen = L * (0.2 + r() * 0.08);
  const supT = 0.62 + r() * 0.06;
  const supH = H * (0.9 + r() * 0.8 + big * 0.6);
  const sup = new THREE.Mesh(loftGeometry({
    length: supLen,
    width: (u) => W * 0.24 * Math.pow(ss(0, 0.35, u), 0.6) * (1 - 0.15 * u),
    top: (u) => supH * Math.pow(ss(0, 0.45, u), 0.7) * (1 - 0.25 * ss(0.7, 1, u)),
    bottom: () => H * 0.2,
    y: () => F.deck(supT) + H * 0.25,
    exp: f.exp + 1, segs: 20, rings: 20, tile,
  }), hullMat);
  sup.position.z = (supT - 0.5) * L;
  g.add(sup);
  const bridgeY = F.deck(supT) + H * 0.25 + supH * 0.72;
  const bridge = new THREE.Mesh(new THREE.BoxGeometry(W * 0.32, H * 0.08, L * 0.004), M.accentGlow(accentName, 1.5));
  bridge.position.set(0, bridgeY, (supT - 0.5) * L - supLen * 0.18);
  g.add(bridge);
  const lights = new THREE.Mesh(loftGeometry({
    length: supLen * 0.7, width: (u) => W * 0.245 * ss(0, 0.3, u), top: () => H * 0.06, bottom: () => H * 0.06,
    y: () => F.deck(supT) + H * 0.25 + supH * 0.45, exp: 4, segs: 12, rings: 8, tile: tile * 0.5,
  }), M.windowsMat);
  lights.position.z = (supT - 0.5) * L + supLen * 0.08;
  g.add(lights);
  const mastH = supH * (1.2 + r());
  const mast = new THREE.Mesh(new THREE.CylinderGeometry(L * 0.0015, L * 0.003, mastH, 6), M.hullDark);
  mast.position.set(0, bridgeY + mastH / 2, (supT - 0.5) * L + supLen * 0.15);
  g.add(mast);

  // Cathedral spire on the prow for the faith/angel civilisations.
  if (f.spire) {
    const spire = new THREE.Mesh(finGeometry(H * 2.2, L * 0.16, L * 0.02, L * 0.1, L * 0.006, tile), M.gold);
    spire.rotation.z = Math.PI / 2;
    spire.position.set(0, F.deck(0.3), (0.3 - 0.5) * L);
    g.add(spire);
  }

  // Fins / wings.
  const finCount = f.fins;
  for (let i = 0; i < finCount; i++) {
    const side = i % 2 ? -1 : 1, pair = Math.floor(i / 2);
    const t = 0.7 - pair * 0.22;
    const span = W * (0.7 + r() * 0.5) * (pair ? 0.6 : 1);
    const fin = new THREE.Mesh(finGeometry(span, L * 0.2, L * 0.06, L * 0.14, L * 0.006, tile), M.hullDark);
    fin.position.set(side * width(t) * 0.92, y(t) + (pair ? top(t) * 0.5 : 0), (t - 0.5) * L);
    fin.rotation.y = side < 0 ? Math.PI : 0;
    fin.rotation.z = side * (pair ? 0.5 : -0.12);
    if (side < 0) fin.rotation.x = Math.PI;
    g.add(fin);
    const edge = new THREE.Mesh(new THREE.BoxGeometry(L * 0.003, L * 0.003, L * 0.06), strakeMat);
    edge.position.set(span, 0, -L * 0.1 + L * 0.14);
    fin.add(edge);
  }

  // Sponsons with their own drives.
  const engines = [];
  const addEngine = (x, yy, z, R) => {
    const bell = new THREE.Mesh(new THREE.CylinderGeometry(R * 0.85, R * 1.1, R * 1.4, 24, 1, true), M.hullVanta);
    bell.rotation.x = Math.PI / 2; bell.position.set(x, yy, z + R * 0.5);
    const collar = new THREE.Mesh(new THREE.TorusGeometry(R * 1.1, R * 0.12, 8, 24), M.hullDark);
    collar.position.set(x, yy, z + R * 1.2);
    const core = new THREE.Mesh(new THREE.CircleGeometry(R * 0.82, 24), M.accentGlow('cyan', 3));
    core.position.set(x, yy, z + R * 0.3); core.rotation.y = Math.PI;
    const plume = new THREE.Sprite(M.sprite(0x7fe9ff, 0.9));
    plume.position.set(x, yy, z + R * 1.6);
    const flame = new THREE.Mesh(new THREE.CylinderGeometry(R * 0.25, R * 0.8, R * 6, 20, 8, true), exhaustMaterial());
    flame.rotation.x = Math.PI / 2;
    g.add(bell, collar, core, plume, flame);
    engines.push({ plume, flame, core, baseScale: R * 4.5, len: R * 6, z0: z + R * 1.2 });
  };
  const tailW = width(1), tailH = (top(1) + bottom(1)) / 2;
  const mainN = Math.max(1, Math.min(4, Math.round(tailW / tailH)));
  const mainR = Math.min(tailH * 0.85, tailW / (mainN * 1.15));
  for (let i = 0; i < mainN; i++) addEngine((i - (mainN - 1) / 2) * mainR * 2.25, y(1) + (top(1) - bottom(1)) / 2, L / 2, mainR);

  if (f.sponsons) {
    for (const side of [-1, 1]) {
      const sLen = L * 0.42, sW = W * 0.3;
      const sp = new THREE.Mesh(loftGeometry({
        length: sLen,
        width: (u) => sW * Math.pow(ss(0, 0.3, u), 0.7) * (1 - 0.1 * ss(0.85, 1, u)),
        top: (u) => sW * 0.8 * Math.pow(ss(0, 0.35, u), 0.7),
        bottom: (u) => sW * 0.8 * Math.pow(ss(0, 0.35, u), 0.7),
        exp: f.exp, segs: 20, rings: 28, tile,
      }), hullMat);
      const sx = side * (width(0.72) + sW * 0.7), sz = L * 0.5 - sLen / 2 - L * 0.02;
      sp.position.set(sx, y(0.75), sz);
      g.add(sp);
      const pylon = new THREE.Mesh(boxUV(new THREE.BoxGeometry(sW * 1.2, H * 0.25, sLen * 0.4), tile), M.hullDark);
      pylon.position.set(side * (width(0.72) + sW * 0.1), y(0.75), sz);
      g.add(pylon);
      addEngine(sx, y(0.75), L * 0.5 - L * 0.02, sW * 0.62);
    }
  }

  // Flank strakes that follow the hull edge.
  for (const side of [-1, 1]) {
    const pts = [];
    for (let i = 0; i <= 24; i++) {
      const t = 0.18 + (i / 24) * 0.7;
      pts.push(new THREE.Vector3(side * width(t) * 1.005, y(t) + top(t) * 0.08, (t - 0.5) * L));
    }
    g.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 48, L * 0.0018, 5), strakeMat));
  }

  // Hardpoints: node, turret housing and barrels per active bank, seated on the deck.
  const hardpoints = [];
  for (const bank of hull.activeBanks || []) {
    const [nx, nz] = BANK_LAYOUT[bank] || [0, 0];
    const t = nz + 0.5;
    const node = new THREE.Group();
    node.name = bank;
    node.position.set(nx * width(t) * 1.6, F.deck(t) + H * 0.12, nz * L);
    const s = L * (0.022 + big * 0.006);
    const base = new THREE.Mesh(new THREE.CylinderGeometry(s * 1.1, s * 1.35, s * 0.5, 20), M.hullDark);
    node.add(base);
    const housing = new THREE.Mesh(loftGeometry({
      length: s * 2.2, width: (u) => s * 0.95 * Math.pow(ss(0, 0.4, u), 0.5), top: () => s * 0.55, bottom: () => s * 0.1,
      exp: 3.5, segs: 16, rings: 12, tile: tile * 0.3,
    }), hullMat);
    housing.position.set(0, s * 0.3, s * 0.2);
    node.add(housing);
    for (const bx of [-1, 1]) {
      const barrel = new THREE.Mesh(new THREE.CylinderGeometry(s * 0.1, s * 0.14, s * 2.6, 10), M.gold);
      barrel.rotation.x = Math.PI / 2;
      barrel.position.set(bx * s * 0.32, s * 0.55, -s * 1.9);
      node.add(barrel);
    }
    const ring = new THREE.Mesh(new THREE.TorusGeometry(s * 1.25, s * 0.06, 6, 28), strakeMat);
    ring.rotation.x = Math.PI / 2;
    ring.position.y = -s * 0.2;
    node.add(ring);
    g.add(node);
    hardpoints.push(node);
  }

  // Navigation lights: port red, starboard green, white strobe on the mast.
  const nav = [];
  for (const [side, col] of [[-1, 0xff3a3a], [1, 0x3aff7a]]) {
    const s = new THREE.Sprite(M.sprite(col, 1));
    s.position.set(side * width(0.62) * 1.02, y(0.62), (0.62 - 0.5) * L);
    s.scale.setScalar(L * 0.035);
    g.add(s); nav.push(s);
  }
  const strobe = new THREE.Sprite(M.sprite(0xffffff, 1));
  strobe.position.set(0, bridgeY + mastH, mast.position.z);
  strobe.scale.setScalar(L * 0.05);
  g.add(strobe);

  const shield = createShieldBubble(L, W, H, opts.shieldColor ?? 0x65f5ff);
  g.add(shield.mesh);

  g.userData = { length: L, width: W, height: H, engines, hardpoints, nav, strobe, shield };
  return g;
}

// Shield bubble: invisible until struck, then a fresnel ripple spreads from each impact.
const MAX_SHIELD_HITS = 6;
function createShieldBubble(L, W, H, color) {
  const hits = Array.from({ length: MAX_SHIELD_HITS }, () => new THREE.Vector4(0, 0, 0, 99));
  const mat = new THREE.ShaderMaterial({
    uniforms: { uHits: { value: hits }, uColor: { value: new THREE.Color(color) }, uLevel: { value: 1 }, uFlash: { value: 0 } },
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    vertexShader: /* glsl */ `
      varying vec3 vLocal; varying float vFres;
      void main(){
        vLocal = normalize(position);
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        vec3 n = normalize(normalMatrix * normal);
        vFres = 1.0 - abs(dot(n, normalize(-mv.xyz)));
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: /* glsl */ `
      uniform vec4 uHits[${MAX_SHIELD_HITS}]; uniform vec3 uColor; uniform float uLevel; uniform float uFlash;
      varying vec3 vLocal; varying float vFres;
      void main(){
        float a = 0.0;
        for (int i = 0; i < ${MAX_SHIELD_HITS}; i++) {
          float age = uHits[i].w;
          if (age > 1.2) continue;
          float d = acos(clamp(dot(vLocal, normalize(uHits[i].xyz)), -1.0, 1.0));
          float ring = exp(-pow((d - age * 2.4) * 7.0, 2.0)) * (1.0 - age / 1.2);
          float core = exp(-d * 9.0) * exp(-age * 7.0) * 2.0;
          a += ring + core;
        }
        a += pow(vFres, 3.0) * uFlash * 0.6;
        a *= (0.35 + 0.65 * uLevel);
        gl_FragColor = vec4(uColor * a * 1.6, 1.0);
      }`,
  });
  const mesh = new THREE.Mesh(new THREE.SphereGeometry(1, 48, 24), mat);
  mesh.scale.set(W * 0.95 + L * 0.08, H * 3.2 + L * 0.06, L * 0.62);
  let next = 0;
  return {
    mesh,
    /** @param {THREE.Vector3} localDir impact direction in ship space */
    hit(localDir) {
      hits[next].set(localDir.x / mesh.scale.x, localDir.y / mesh.scale.y, localDir.z / mesh.scale.z, 0);
      next = (next + 1) % MAX_SHIELD_HITS;
      mat.uniforms.uFlash.value = 1;
    },
    update(dt, level) {
      for (const h of hits) h.w += dt;
      mat.uniforms.uLevel.value = level;
      mat.uniforms.uFlash.value = Math.max(0, mat.uniforms.uFlash.value - dt * 2.5);
    },
  };
}

const _aimLocal = new THREE.Vector3();
/** Swing each hardpoint housing toward a world-space aim point (or back to the bow). */
export function aimHardpoints(g, aimWorld, dt) {
  for (const node of g.userData.hardpoints) {
    let want = 0;
    if (aimWorld) {
      _aimLocal.copy(aimWorld);
      g.worldToLocal(_aimLocal);
      _aimLocal.sub(node.position);
      want = Math.atan2(-_aimLocal.x, -_aimLocal.z);
    }
    let d = want - node.rotation.y;
    d = Math.atan2(Math.sin(d), Math.cos(d));
    node.rotation.y += d * Math.min(1, dt * 4);
  }
}

/** Per-frame visual state: engine output follows throttle, lights blink. */
export function animateShipMesh(g, throttle, speedFrac, t) {
  const u = g.userData;
  const out = Math.max(0.08, throttle);
  for (const e of u.engines) {
    const flicker = 0.92 + Math.sin(t * 40 + e.baseScale) * 0.04 + Math.random() * 0.04;
    e.plume.scale.setScalar(e.baseScale * (0.6 + out * 1.1) * flicker);
    e.plume.material.opacity = 0.3 + out * 0.4;
    const k = 0.3 + out * 1.6 * flicker;
    e.flame.scale.set(1, k, 1);
    e.flame.position.z = e.z0 + e.len * k * 0.5;
    e.flame.material.opacity = 0.12 + out * 0.4;
  }
  const blink = (t % 1.6) < 0.12 ? 1 : 0.15;
  u.strobe.material.opacity = blink;
  for (const s of u.nav) s.material.opacity = 0.55 + 0.45 * Math.sin(t * 2.2);
}
