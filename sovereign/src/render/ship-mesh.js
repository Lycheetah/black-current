// Procedural capital hull built from a hull blueprint (src/ships/blueprint.js).
// Hardpoint nodes come from the blueprint and carry the fitted turret (NODE = HARDPOINT = GUN).
import * as THREE from 'three';
import { boxUV, accentColor } from './materials.js';
import { loftGeometry, finGeometry, ss, bump } from './loft.js';
import { hullProfile, nodeLocal } from '../ships/blueprint.js';
import { TURRET_CATALOG } from '../data/ships/weapons.js';

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

/**
 * Build a hull from its blueprint. opts.fit maps node bank → turret id, so the guns you fit are the guns you see.
 * @param {object} bp hull blueprint (src/ships/blueprint.js)
 * @param {ReturnType<import('./materials.js').createMaterials>} M
 * @param {{accent?:string, shieldColor?:number, fit?:Record<string,string>}} [opts]
 */
export function buildShipMesh(bp, M, opts = {}) {
  const P = hullProfile(bp);
  const { L, W, H, K, big, width, top, bottom, y } = P;
  const exp = bp.hull.exp;
  const tile = Math.max(6, L * 0.12);
  const accentName = opts.accent || bp.colors.accent;
  const g = new THREE.Group();
  g.name = bp.id;

  const hullMat = M.hullLight.clone();
  hullMat.color.lerp(new THREE.Color(accentColor(accentName)), bp.colors.tint ?? 0.05);
  // Running lights scattered over the plating, like a crewed capital hull at night.
  hullMat.emissive = new THREE.Color(0xffffff);
  hullMat.emissiveMap = M.textures.hullLights;
  hullMat.emissiveIntensity = 0.9;
  const strakeMat = M.accentGlow(accentName, 2.0);

  // Main hull.
  g.add(new THREE.Mesh(loftGeometry({ length: L, width, top, bottom, y, exp, segs: 28, rings: 56, tile }), hullMat));

  // Dorsal carapace: a darker armour layer riding the deck.
  const c = bp.carapace;
  if (c?.on) {
    const cLen = L * (c.to - c.from);
    const cMap = (u) => c.from + u * (c.to - c.from);
    const carapace = new THREE.Mesh(loftGeometry({
      length: cLen,
      width: (u) => width(cMap(u)) * c.width * Math.pow(ss(0, 0.18, u), 0.6) * (1 - 0.4 * ss(0.85, 1, u)),
      top: (u) => H * c.height * ss(0, 0.2, u) * (1 - 0.6 * ss(0.85, 1, u)),
      bottom: () => H * 0.05,
      y: (u) => y(cMap(u)) + top(cMap(u)) * 0.82,
      exp: exp + 1.5, segs: 24, rings: 36, tile,
    }), M.hullDark);
    carapace.position.z = (c.from + c.to - 1) * L / 2;
    g.add(carapace);
  }

  // Ventral keel blade.
  const kb = bp.keelBlade;
  if (kb?.on) {
    const keel = new THREE.Mesh(loftGeometry({
      length: L * kb.length,
      width: (u) => W * 0.12 * ss(0, 0.3, u) * (1 - 0.5 * ss(0.8, 1, u)),
      top: () => K * 0.2,
      bottom: (u) => K * kb.depth * (0.5 + 0.6 * bump(0.55, 0.25, u)) * ss(0, 0.25, u),
      y: () => -bottom(0.55) * 0.75,
      exp: 4, segs: 16, rings: 24, tile,
    }), M.hullDark);
    keel.position.z = L * 0.12;
    g.add(keel);
  }

  // Superstructure, bridge, lit decks and mast.
  const su = bp.superstructure;
  const supLen = L * su.length, supT = su.at, supH = H * su.height;
  const supBase = P.deck(supT) + H * 0.25;
  const sup = new THREE.Mesh(loftGeometry({
    length: supLen,
    width: (u) => W * su.width * Math.pow(ss(0, 0.35, u), 0.6) * (1 - 0.15 * u),
    top: (u) => supH * Math.pow(ss(0, 0.45, u), 0.7) * (1 - 0.25 * ss(0.7, 1, u)),
    bottom: () => H * 0.2,
    y: () => supBase,
    exp: exp + 1, segs: 20, rings: 20, tile,
  }), hullMat);
  sup.position.z = (supT - 0.5) * L;
  g.add(sup);
  const bridgeY = supBase + supH * 0.72;
  const bridge = new THREE.Mesh(new THREE.BoxGeometry(W * su.width * 1.33, H * 0.08, L * 0.004), M.accentGlow(accentName, 1.5));
  bridge.position.set(0, bridgeY, (supT - 0.5) * L - supLen * 0.18);
  g.add(bridge);
  const lights = new THREE.Mesh(loftGeometry({
    length: supLen * 0.7, width: (u) => W * su.width * 1.02 * ss(0, 0.3, u), top: () => H * 0.06, bottom: () => H * 0.06,
    y: () => supBase + supH * 0.45, exp: 4, segs: 12, rings: 8, tile: tile * 0.5,
  }), M.windowsMat);
  lights.position.z = (supT - 0.5) * L + supLen * 0.08;
  g.add(lights);
  const mastH = supH * (su.mast ?? 1.5);
  const mast = new THREE.Mesh(new THREE.CylinderGeometry(L * 0.0015, L * 0.003, mastH, 6), M.hullDark);
  mast.position.set(0, bridgeY + mastH / 2, (supT - 0.5) * L + supLen * 0.15);
  g.add(mast);

  // Cathedral spire on the prow.
  if (bp.spire?.on) {
    const spire = new THREE.Mesh(finGeometry(H * bp.spire.height, L * 0.16, L * 0.02, L * 0.1, L * 0.006, tile), M.gold);
    spire.rotation.z = Math.PI / 2;
    spire.position.set(0, P.deck(bp.spire.at), (bp.spire.at - 0.5) * L);
    g.add(spire);
  }

  // Fins, mirrored in pairs.
  for (const fin of bp.fins) {
    for (const side of [1, -1]) {
      const t = fin.at;
      const span = W * fin.span;
      const m = new THREE.Mesh(finGeometry(span, L * 0.2, L * 0.06, L * 0.14, L * 0.006, tile), M.hullDark);
      m.position.set(side * width(t) * 0.92, y(t) + top(t) * (fin.lift ?? 0), (t - 0.5) * L);
      m.rotation.y = side < 0 ? Math.PI : 0;
      m.rotation.z = side * fin.angle;
      if (side < 0) m.rotation.x = Math.PI;
      g.add(m);
      const edge = new THREE.Mesh(new THREE.BoxGeometry(L * 0.003, L * 0.003, L * 0.06), strakeMat);
      edge.position.set(span, 0, L * 0.04);
      m.add(edge);
    }
  }

  // Drives.
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
  const mainN = bp.engines.main || Math.max(1, Math.min(4, Math.round(tailW / tailH)));
  const mainR = Math.min(tailH * 0.85, tailW / (mainN * 1.15)) * (bp.engines.scale ?? 1);
  for (let i = 0; i < mainN; i++) addEngine((i - (mainN - 1) / 2) * mainR * 2.25, y(1) + (top(1) - bottom(1)) / 2, L / 2, mainR);

  const sp = bp.sponsons;
  if (sp?.on) {
    for (const side of [-1, 1]) {
      const sLen = L * sp.length, sW = W * sp.width;
      const pod = new THREE.Mesh(loftGeometry({
        length: sLen,
        width: (u) => sW * Math.pow(ss(0, 0.3, u), 0.7) * (1 - 0.1 * ss(0.85, 1, u)),
        top: (u) => sW * 0.8 * Math.pow(ss(0, 0.35, u), 0.7),
        bottom: (u) => sW * 0.8 * Math.pow(ss(0, 0.35, u), 0.7),
        exp, segs: 20, rings: 28, tile,
      }), hullMat);
      const sx = side * (width(sp.at) + sW * 0.7), sz = L * 0.5 - sLen / 2 - L * 0.02;
      pod.position.set(sx, y(sp.at + 0.03), sz);
      g.add(pod);
      const pylon = new THREE.Mesh(boxUV(new THREE.BoxGeometry(sW * 1.2, H * 0.25, sLen * 0.4), tile), M.hullDark);
      pylon.position.set(side * (width(sp.at) + sW * 0.1), y(sp.at + 0.03), sz);
      g.add(pylon);
      addEngine(sx, y(sp.at + 0.03), L * 0.5 - L * 0.02, sW * 0.62);
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

  // Hardpoint nodes, each carrying the turret fitted to it.
  const hardpoints = [];
  for (const node of bp.nodes) {
    const n = buildHardpoint(node, opts.fit?.[node.bank], L, big, hullMat, strakeMat, M, tile);
    const p = nodeLocal(bp, node, P);
    n.position.set(p.x, p.y, p.z);
    g.add(n);
    hardpoints.push(n);
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

  g.userData = { length: L, width: W, height: H, engines, hardpoints, nav, strobe, shield, profile: P, blueprint: bp };
  return g;
}

const SIZE_SCALE = { LIGHT: 0.85, MEDIUM: 1.05, HEAVY: 1.25, CAPITAL: 1.45 };
const BARREL_MAT = { gold: 'gold', cyan: 'glowCyan', purple: 'hullVanta', armor: 'hullDark' };

/** A hardpoint node with the turret for a given weapon: size class, barrel length/width and finish from TURRET_CATALOG. */
export function buildHardpoint(node, turretId, L, big, hullMat, strakeMat, M, tile) {
  const g = new THREE.Group();
  g.name = node.bank;
  const w = turretId ? TURRET_CATALOG[turretId] : null;
  const s = L * (0.022 + big * 0.006) * (node.size ?? 1) * (w ? SIZE_SCALE[w.size] ?? 1 : 0.8);
  const base = new THREE.Mesh(new THREE.CylinderGeometry(s * 1.1, s * 1.35, s * 0.5, 20), M.hullDark);
  g.add(base);
  const ring = new THREE.Mesh(new THREE.TorusGeometry(s * 1.25, s * 0.06, 6, 28), strakeMat);
  ring.rotation.x = Math.PI / 2;
  ring.position.y = -s * 0.2;
  g.add(ring);
  if (!w) {
    // Empty node: a capped socket.
    const cap = new THREE.Mesh(new THREE.CylinderGeometry(s * 0.7, s * 0.9, s * 0.25, 16), M.hullVanta);
    cap.position.y = s * 0.3;
    g.add(cap);
    g.userData = { turretId: null };
    return g;
  }
  const housing = new THREE.Mesh(loftGeometry({
    length: s * 2.2, width: (u) => s * 0.95 * Math.pow(ss(0, 0.4, u), 0.5), top: () => s * 0.55, bottom: () => s * 0.1,
    exp: 3.5, segs: 16, rings: 12, tile: tile * 0.3,
  }), hullMat);
  housing.position.set(0, s * 0.3, s * 0.2);
  g.add(housing);
  const barrels = w.homing ? 0 : w.rate > 1.5 ? 3 : 2;
  const bl = s * 2.6 * w.barrelLength, bw = s * 0.12 * w.barrelWidth;
  const mat = M[BARREL_MAT[w.material]] || M.gold;
  for (let i = 0; i < barrels; i++) {
    const bx = (i - (barrels - 1) / 2) * s * 0.34;
    const barrel = new THREE.Mesh(new THREE.CylinderGeometry(bw * 0.8, bw, bl, 10), mat);
    barrel.rotation.x = Math.PI / 2;
    barrel.position.set(bx, s * 0.55, -s * 0.6 - bl / 2);
    g.add(barrel);
    const tip = new THREE.Mesh(new THREE.CylinderGeometry(bw * 1.25, bw * 1.25, bl * 0.08, 10), M.hullDark);
    tip.rotation.x = Math.PI / 2;
    tip.position.set(bx, s * 0.55, -s * 0.6 - bl);
    g.add(tip);
  }
  if (w.homing) {
    // Missile and torpedo racks: a launcher box with glowing tube mouths.
    const box = new THREE.Mesh(boxUV(new THREE.BoxGeometry(s * 1.5 * w.barrelWidth, s * 0.7, s * 1.4), tile * 0.3), M.hullDark);
    box.position.set(0, s * 0.75, -s * 0.2);
    g.add(box);
    const glow = new THREE.MeshBasicMaterial({ color: new THREE.Color(w.color).multiplyScalar(2), toneMapped: false });
    for (let i = 0; i < 4; i++) {
      const tube = new THREE.Mesh(new THREE.CircleGeometry(s * 0.16, 12), glow);
      tube.position.set((i % 2 - 0.5) * s * 0.6, s * (0.6 + Math.floor(i / 2) * 0.3), -s * 0.91);
      tube.rotation.y = Math.PI;
      g.add(tube);
    }
  }
  // Weapon-colour emitter on the housing.
  const em = new THREE.Mesh(new THREE.BoxGeometry(s * 0.5, s * 0.06, s * 0.06), new THREE.MeshBasicMaterial({ color: new THREE.Color(w.color).multiplyScalar(2.2), toneMapped: false }));
  em.position.set(0, s * 0.86, -s * 0.2);
  g.add(em);
  g.userData = { turretId };
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
