import { CLASS_LENGTH, WORLD } from '../core/scale.js';
// Hull blueprints: the single, plain-data description of a hull's shape and hardpoint nodes.
// The game, the Elite Shipwright and the Hull Forge tool all read this format; nothing here touches Three.js.
//
// Every distance is a fraction of hull length L except `length` itself (metres).
// Profiles are sampled along t ∈ [0, 1] from nose (0) to tail (1).
// See docs/HULL_BLUEPRINTS.md for the field guide.

export const BLUEPRINT_SCHEMA = 'sovereign.hull/1';

/**
 * Per-civilisation hull doctrine: the starting point each race's blueprints are generated from.
 * Palettes and signature parts follow the Pantheon codex visual lines (docs/canon).
 */
export const RACE_FORM = {
  savanah: { arch: 'blade', exp: 2.6, nose: 0.34, wide: 0.2, fins: 2, spire: false, sponsons: false, signature: 'hooks_eyes', hull: '#686a5d', trim: '#2c2e25', accent: 'green' },
  sol_symbiots: { arch: 'shell', exp: 2.4, nose: 0.3, wide: 0.22, fins: 0, spire: false, sponsons: true, signature: 'shells', hull: '#e6eaee', trim: '#b89a5a', accent: 'cyan' },
  chaos: { arch: 'beast', exp: 4.5, nose: 0.22, wide: 0.24, fins: 2, spire: false, sponsons: false, signature: 'spikes', hull: '#5e3c7c', trim: '#2a1a38', accent: 'orange' },
  cosmic_darkness: { arch: 'wing', exp: 5, nose: 0.42, wide: 0.17, fins: 0, spire: false, sponsons: false, signature: 'cloak_wings', hull: '#2c2644', trim: '#15121f', accent: 'violet' },
  cosmic_light: { arch: 'halo', exp: 2.2, nose: 0.38, wide: 0.19, fins: 2, spire: true, sponsons: false, signature: 'halo_blades', hull: '#efe9dc', trim: '#c49c4c', accent: 'gold' },
  blackhole: { arch: 'maw', exp: 3, nose: 0.26, wide: 0.24, fins: 0, spire: false, sponsons: true, signature: 'maw', hull: '#222838', trim: '#101218', accent: 'orange' },
  hybrid_fused: { arch: 'twin', exp: 2.8, nose: 0.3, wide: 0.21, fins: 2, spire: false, sponsons: false, signature: 'stitched', hull: '#6e7276', trim: '#3e4044', accent: 'violet' },
  human_hunters: { arch: 'hauler', exp: 5.5, nose: 0.28, wide: 0.2, fins: 0, spire: false, sponsons: false, signature: 'industrial', hull: '#5f6744', trim: '#3a3e2c', accent: 'orange' },
  ai_hunters: { arch: 'needle', exp: 6, nose: 0.4, wide: 0.16, fins: 2, spire: false, sponsons: false, signature: 'spear', hull: '#1f1f22', trim: '#0e0e10', accent: 'red' },
  amethyst_angels: { arch: 'cathedral', exp: 2.4, nose: 0.36, wide: 0.18, fins: 2, spire: false, sponsons: false, signature: 'cathedral', hull: '#2a2530', trim: '#151318', accent: 'violet' },
  techno_angels: { arch: 'crystal', exp: 3.5, nose: 0.4, wide: 0.17, fins: 0, spire: false, sponsons: false, signature: 'crystal_feathers', hull: '#e4f0f8', trim: '#9cc4e2', accent: 'cyan' },
  ai_gods: { arch: 'trident', exp: 3, nose: 0.3, wide: 0.22, fins: 0, spire: false, sponsons: false, signature: 'radial_crown', hull: '#dfe4ea', trim: '#aeb5be', accent: 'gold' },
  pagan_ai: { arch: 'fortress', exp: 4, nose: 0.25, wide: 0.21, fins: 0, spire: false, sponsons: true, signature: 'fortress', hull: '#a8987a', trim: '#7a5634', accent: 'orange' },
  ai: { arch: 'lattice', exp: 6, nose: 0.33, wide: 0.18, fins: 2, spire: false, sponsons: false, signature: 'modules', hull: '#7a8088', trim: '#4a4e54', accent: 'cyan' },
};

/** Default node placement per catalog weapon bank: x across the beam (−1 port … 1 starboard), z along length (−0.5 nose … 0.5 tail). */
export const BANK_NODES = {
  WPN_FL: [-0.38, -0.2], WPN_FR: [0.38, -0.2],
  WPN_ML: [-0.5, 0.06], WPN_MR: [0.5, 0.06],
  WPN_AL: [-0.45, 0.28], WPN_AR: [0.45, 0.28],
};

export const hullLength = (hull) => CLASS_LENGTH[hull.classId] ?? hull.radius * 5.6 * WORLD;

function seeded(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); }
  return () => ((h = Math.imul(h ^ (h >>> 15), 2246822507) >>> 0) / 4294967296);
}
const round = (v, n = 3) => Math.round(v * 10 ** n) / 10 ** n;

/** Class → fleet role. Roles change proportions here and add role structures in the renderer. */
export const CLASS_ROLE = {
  pod: 'pod', starter: 'frigate', frigate: 'frigate', assault_frigate: 'frigate', specialist_frigate: 'frigate',
  destroyer: 'destroyer', cruiser: 'cruiser', heavy_cruiser: 'cruiser', advanced_cruiser: 'cruiser',
  battlecruiser: 'battleship', specialist_ship: 'battleship', battleship: 'battleship',
  drone_carrier: 'carrier', carrier: 'carrier', industrial: 'industrial', autonomous: 'core',
  dreadnought: 'dreadnought', titan: 'titan',
};
const ROLE_SHAPE = {
  pod: { w: 1.2, h: 1.2, n: 1.3 }, frigate: { w: 1.1, h: 1, n: 1 }, destroyer: { w: 0.75, h: 0.9, n: 0.9 },
  cruiser: { w: 1, h: 1.1, n: 1 }, battleship: { w: 1.05, h: 1.35, n: 0.85 }, carrier: { w: 1.4, h: 0.75, n: 0.7 },
  industrial: { w: 1.35, h: 1.6, n: 0.55 }, core: { w: 1.1, h: 1.2, n: 1 }, dreadnought: { w: 0.85, h: 1.25, n: 0.8 },
  titan: { w: 1.15, h: 1.5, n: 0.9 },
};
/** Parts an architecture replaces with its own structure. */
const ARCH_PARTS = {
  shell: { carapace: false }, wing: { keelBlade: false }, hauler: { carapace: false }, crystal: { carapace: false, keelBlade: false },
  lattice: { carapace: false, keelBlade: false }, maw: { carapace: false }, fortress: { carapace: false },
};

/** Generate the default blueprint for a fleet-catalog hull (deterministic per race and class). */
export function blueprintFromHull(hull) {
  const r = seeded(hull.raceId + ':' + hull.classId);
  const f = RACE_FORM[hull.raceId] || RACE_FORM.savanah;
  const big = Math.min(1, hull.radius / 22);
  const role = CLASS_ROLE[hull.classId] || 'cruiser';
  const rs = ROLE_SHAPE[role];
  const parts = ARCH_PARTS[f.arch] || {};
  const fins = [];
  for (let i = 0; i < f.fins; i += 2) {
    const pair = i / 2;
    fins.push({ at: round(0.7 - pair * 0.22), span: round((0.7 + r() * 0.5) * (pair ? 0.6 : 1)), angle: pair ? 0.5 : -0.12, lift: pair ? 0.5 : 0 });
  }
  return {
    schema: BLUEPRINT_SCHEMA,
    id: hull.id,
    name: hull.name,
    race: hull.raceId,
    class: hull.classId,
    length: round(hullLength(hull), 2),
    role,
    hull: {
      arch: f.arch,
      exp: f.exp,
      nose: round(Math.min(0.6, (f.nose + (r() - 0.5) * 0.06) * rs.n)),
      width: round((f.wide + (r() - 0.5) * 0.03) * (0.85 + big * 0.25) * rs.w),
      height: round((0.05 + r() * 0.02 + big * 0.02) * rs.h),
      keel: round(0.055 + r() * 0.02),
      waist: round(0.12 + r() * 0.12),
      droop: 0.3,
      tailTaper: 0.22,
    },
    carapace: { on: parts.carapace ?? true, from: 0.2, to: 0.92, width: 0.78, height: 0.42 },
    keelBlade: { on: parts.keelBlade ?? true, length: 0.6, depth: 1 },
    superstructure: { at: round(0.62 + r() * 0.06), length: round(0.2 + r() * 0.08), height: round(0.9 + r() * 0.8 + big * 0.6), width: 0.24, mast: round(1.2 + r()) },
    spire: { on: f.spire, at: 0.3, height: 2.2 },
    fins,
    sponsons: { on: f.sponsons, length: 0.42, width: 0.3, at: 0.72 },
    engines: { main: 0, scale: 1 },
    colors: { accent: f.accent || hull.accent || 'cyan', tint: 0.05, hull: f.hull, trim: f.trim },
    signature: { kind: f.signature, on: true },
    nodes: (hull.activeBanks || []).map((bank) => ({ bank, x: BANK_NODES[bank][0], z: BANK_NODES[bank][1], size: 1 })),
  };
}

const ss = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
const bump = (c, w, x) => Math.exp(-(((x - c) / w) ** 2));

/** Profile functions for a blueprint, in metres. Shared by mesh building and hardpoint placement. */
export function hullProfile(bp) {
  const L = bp.length, h = bp.hull;
  const W = L * h.width, H = L * h.height, K = L * h.keel;
  const nose = h.nose, waist = h.waist;
  const width = (t) => W * Math.pow(Math.min(1, t / nose), 0.72) * (1 - waist * bump(0.6, 0.13, t)) * (1 - h.tailTaper * ss(0.86, 1, t)) + W * 0.02;
  const top = (t) => H * (0.3 + 0.7 * Math.pow(Math.min(1, t / (nose * 1.4)), 0.8)) * (1 + 0.35 * bump(0.66, 0.14, t));
  const bottom = (t) => K * (0.25 + 0.75 * Math.pow(Math.min(1, t / (nose * 1.7)), 0.9)) * (1 - 0.3 * ss(0.8, 1, t));
  const y = (t) => -H * h.droop * (1 - ss(0, 0.45, t));
  const base = { width, top, bottom, y };
  const A = ARCHETYPES[h.arch]?.({ L, W, H, K, nose, base }) || {};
  const P = { L, W, H, K, width: A.width || width, top: A.top || top, bottom: A.bottom || bottom, y: A.y || y, exp: A.exp ?? h.exp, big: Math.min(1, L / 140), arch: h.arch || 'blade' };
  P.deck = (t) => P.y(t) + P.top(t);
  return P;
}

const ellipse = (t) => Math.sqrt(Math.max(0, 1 - (2 * t - 1) ** 2));
const taper = (t, n) => Math.pow(Math.min(1, t / Math.max(0.02, n)), 0.7);
/**
 * Hull architectures: each civilisation's base silhouette as profile functions (all pure maths,
 * so hardpoints sit on the same surface in the simulation and the renderer).
 */
export const ARCHETYPES = {
  blade: () => null,
  // Rounded protective shell: short, broad, domed.
  shell: ({ W, H, K }) => ({
    width: (t) => W * 1.35 * Math.pow(ellipse(t * 0.92 + 0.04), 0.7) + W * 0.02,
    top: (t) => H * 1.9 * Math.pow(ellipse(t), 0.9),
    bottom: (t) => K * 1.4 * Math.pow(ellipse(t), 0.9),
    y: () => 0, exp: 2,
  }),
  // Stealth flying wing: thin delta widening to the tail.
  wing: ({ W, H, K }) => ({
    width: (t) => W * (0.18 + 2.4 * Math.pow(ss(0.02, 0.88, t), 1.1)) * (1 - 0.35 * ss(0.92, 1, t)),
    top: (t) => H * 0.65 * (0.4 + 0.6 * ss(0, 0.5, t)) * (1 + 0.6 * bump(0.45, 0.12, t)),
    bottom: (t) => K * 0.35 * (0.4 + 0.6 * ss(0, 0.5, t)),
    y: () => 0, exp: 7,
  }),
  // Long spear: narrow, needle bow.
  needle: ({ W, H, K }) => ({
    width: (t) => W * 0.55 * Math.pow(Math.min(1, t / 0.62), 1.1) * (1 - 0.3 * ss(0.88, 1, t)) + W * 0.01,
    top: (t) => H * 0.85 * Math.pow(Math.min(1, t / 0.7), 0.9),
    bottom: (t) => K * 0.75 * Math.pow(Math.min(1, t / 0.7), 0.9),
    y: () => 0, exp: 6,
  }),
  // Slim spine the halo structure is built around.
  halo: ({ W, H, K, nose }) => ({
    width: (t) => W * 0.62 * taper(t, nose) * (1 - 0.2 * ss(0.86, 1, t)) + W * 0.02,
    top: (t) => H * 0.9 * taper(t, nose * 1.3), bottom: (t) => K * 0.8 * taper(t, nose * 1.5), exp: 2.2,
  }),
  // A hull swollen around its central mass.
  maw: ({ W, H, K, nose }) => ({
    width: (t) => W * (0.32 + 1.3 * bump(0.5, 0.17, t)) * taper(t, nose) + W * 0.02,
    top: (t) => H * (0.5 + 2.4 * bump(0.5, 0.17, t)) * taper(t, nose),
    bottom: (t) => K * (0.5 + 2.0 * bump(0.5, 0.17, t)) * taper(t, nose),
    y: () => 0, exp: 2.3,
  }),
  // Jagged beast hull: ragged width, heavy jaw.
  beast: ({ W, H, K, nose }) => ({
    width: (t) => W * (1 + 0.22 * Math.sin(t * 37) * ss(0.1, 0.3, t)) * taper(t, nose * 0.8) * (1 + 0.3 * bump(0.25, 0.08, t)) + W * 0.02,
    top: (t) => H * (1 + 0.3 * Math.abs(Math.sin(t * 23))) * taper(t, nose),
    bottom: (t) => K * 1.3 * (1 + 0.6 * bump(0.18, 0.1, t)) * taper(t, nose * 0.6), exp: 4,
  }),
  // The narrower main hull of a stitched pair (the second hull is added in the renderer).
  twin: ({ W, H, K, nose }) => ({
    width: (t) => W * 0.62 * taper(t, nose) + W * 0.02, top: (t) => H * 1.1 * taper(t, nose), bottom: (t) => K * taper(t, nose), exp: 2.6,
  }),
  // Industrial brick: blunt, tall, square.
  hauler: ({ W, H, K }) => ({
    width: (t) => W * 1.1 * Math.pow(Math.min(1, t / 0.1), 0.5) * (1 - 0.1 * ss(0.9, 1, t)),
    top: (t) => H * 1.9 * Math.pow(Math.min(1, t / 0.14), 0.6), bottom: (t) => K * 1.4 * Math.pow(Math.min(1, t / 0.14), 0.6),
    y: () => 0, exp: 9,
  }),
  // Narrow hull under a tall cathedral sail.
  cathedral: ({ W, H, K, nose }) => ({
    width: (t) => W * 0.75 * taper(t, nose) + W * 0.02,
    top: (t) => H * (1 + 3.2 * bump(0.55, 0.2, t)) * taper(t, nose), bottom: (t) => K * 1.1 * taper(t, nose), exp: 3,
  }),
  // Faceted crystal: diamond section and diamond length.
  crystal: ({ W, H, K }) => ({
    width: (t) => W * 1.15 * (1 - Math.pow(Math.abs(2 * t - 1.1), 1.6)) + W * 0.02,
    top: (t) => H * 1.9 * (1 - Math.pow(Math.abs(2 * t - 1.1), 1.4)) + H * 0.05,
    bottom: (t) => K * 1.7 * (1 - Math.pow(Math.abs(2 * t - 1.1), 1.4)) + K * 0.05,
    y: () => 0, exp: 1.3,
  }),
  // Slim central shaft; the renderer adds the two outer prongs.
  trident: ({ W, H, K, nose }) => ({
    width: (t) => W * 0.5 * taper(t, nose) + W * 0.02, top: (t) => H * 1.1 * taper(t, nose), bottom: (t) => K * 0.9 * taper(t, nose), exp: 3,
  }),
  // Stepped fortress block: blunt bow, rising tiers.
  fortress: ({ W, H, K }) => ({
    width: (t) => W * 1.2 * Math.pow(Math.min(1, t / 0.08), 0.4) * (1 - 0.12 * ss(0.9, 1, t)),
    top: (t) => H * (1.0 + 0.7 * ss(0.3, 0.34, t) + 0.8 * ss(0.58, 0.62, t)) * Math.pow(Math.min(1, t / 0.1), 0.5),
    bottom: (t) => K * 1.3 * Math.pow(Math.min(1, t / 0.1), 0.5), y: () => 0, exp: 8,
  }),
  // Modular lattice core: square section, square ends.
  lattice: ({ W, H, K }) => ({
    width: (t) => W * 0.95 * Math.pow(Math.min(1, t / 0.06), 0.3),
    top: (t) => H * 1.3 * Math.pow(Math.min(1, t / 0.06), 0.3), bottom: (t) => K * 1.3 * Math.pow(Math.min(1, t / 0.06), 0.3),
    y: () => 0, exp: 12,
  }),
};

/** Node position in ship space (metres). Model hulls give nodes an absolute `local` position. */
export function nodeLocal(bp, node, P = hullProfile(bp)) {
  if (node.local) return { ...node.local };
  const t = Math.min(1, Math.max(0, node.z + 0.5));
  return { x: node.x * P.width(t), y: P.deck(t) + P.H * 0.12, z: node.z * P.L };
}

/** Weapon group from where the node sits: moving a gun along the hull moves it between groups. */
export function groupForNode(node, length) {
  const z = node.local && length ? node.local.z / length : node.z;
  return z < -0.1 ? 'fore' : z > 0.16 ? 'aft' : 'mid';
}

/** Validate and fill defaults; throws on data that cannot build. */
export function validateBlueprint(bp) {
  if (!bp || bp.schema !== BLUEPRINT_SCHEMA) throw new Error(`Blueprint ${bp?.id}: schema must be ${BLUEPRINT_SCHEMA}`);
  for (const k of ['id', 'length', 'hull', 'nodes']) if (bp[k] == null) throw new Error(`Blueprint ${bp.id}: missing ${k}`);
  if (!(bp.length > 4 && bp.length <= 25000)) throw new Error(`Blueprint ${bp.id}: length ${bp.length} out of range`);
  const ids = new Set();
  for (const n of bp.nodes) {
    if (ids.has(n.bank)) throw new Error(`Blueprint ${bp.id}: duplicate node ${n.bank}`);
    ids.add(n.bank);
    n.x = Math.max(-1, Math.min(1, n.x ?? 0)); n.z = Math.max(-0.48, Math.min(0.48, n.local ? n.local.z / bp.length : n.z ?? 0)); n.size ??= 1;
  }
  bp.fins ??= []; bp.colors ??= { accent: 'cyan', tint: 0.05 }; bp.engines ??= { main: 0, scale: 1 };
  // Blueprints saved before signatures existed pick up their civilisation's look.
  const race = RACE_FORM[bp.race];
  bp.signature ??= { kind: race?.signature ?? null, on: !!race };
  bp.colors.hull ??= race?.hull; bp.colors.trim ??= race?.trim;
  return bp;
}

export const cloneBlueprint = (bp) => JSON.parse(JSON.stringify(bp));
