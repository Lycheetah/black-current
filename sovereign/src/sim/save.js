// Versioned save data. The simulation decides what a save holds and how to restore it;
// storage (localStorage, files) lives in core/storage.js.
//
// Rule: bump SAVE_VERSION when the shape changes and add a migration from the previous version.
// Old saves always load: migrations run in order up to the current version.
import { FLEET } from './world.js';
import { cloneBlueprint, validateBlueprint } from '../ships/blueprint.js';
import { editableBlueprintFor } from '../ships/registry.js';
import { initPlayerCombat } from './combat.js';
import { setHull } from './ship.js';
import { getPlayer, changeSector } from './world.js';
import { SECTORS } from '../world/sectors.js';
import { INDUCTION } from './induction.js';

export const SAVE_VERSION = 7;
export const SAVE_KIND = 'sovereign-eclipse-reforge';

/** v → function turning a v save into a v+1 save. */
const MIGRATIONS = {
  // v2 adds the pilot's name and civilisation of origin.
  1: (d) => ({ ...d, v: 2, pilot: { ...d.pilot, name: 'Pilot', civ: FLEET[d.pilot?.hullId]?.raceId || 'savanah' } }),
  // v3 records completed research projects.
  2: (d) => ({ ...d, v: 3, researched: null }),
  // v4 adds the fleet hangar and the exchange's prices.
  3: (d) => ({ ...d, v: 4, hangar: [], market: null }),
  // v5 records the current sector (operations already save by contract id).
  4: (d) => ({ ...d, v: 5, sector: 'naraka' }),
  // v6 records which ships carry full Covenant cover.
  5: (d) => ({ ...d, v: 6, cover: [] }),
  // v7 tracks the induction chain; pilots from older saves have already found their way.
  6: (d) => ({ ...d, v: 7, induction: { step: 99, done: true } }),
};

export function serialize(world) {
  const p = getPlayer(world);
  const atlas = {};
  for (const s of Object.values(world.atlas.sigs)) {
    if (s.stage === 'hidden') continue;
    atlas[s.id] = { stage: s.stage, quality: s.quality, pings: s.pings, scan: s.scan };
  }
  return {
    kind: SAVE_KIND, v: SAVE_VERSION, savedAt: new Date().toISOString(),
    pilot: { name: world.pilot.name, civ: world.pilot.civ, uid: p.uid, hullId: p.hullId, blueprint: cloneBlueprint(p.blueprint), fit: { ...p.fit } },
    wallet: { salvage: world.salvage, research: world.research, materials: { ...world.materials } },
    atlas,
    researched: [...world.researched],
    hangar: world.hangar.map((h) => ({ ...h, blueprint: cloneBlueprint(h.blueprint), fit: { ...h.fit } })),
    market: { prices: { ...world.market.prices }, stock: { ...world.market.stock } },
    sector: world.sector.id,
    cover: [...world.cover],
    induction: { step: world.induction.step, done: world.induction.done },
    ops: Object.fromEntries(Object.values(world.ops).map((o) => [o.id, o.stage === 'complete' ? 'complete' : 'open'])),
  };
}

export function migrate(data) {
  if (!data || data.kind !== SAVE_KIND) throw new Error('Not a Sovereign Eclipse save');
  let d = data;
  while (d.v < SAVE_VERSION) {
    const step = MIGRATIONS[d.v];
    if (!step) throw new Error(`No migration from save version ${d.v}`);
    d = step(d);
  }
  if (d.v > SAVE_VERSION) throw new Error(`Save is from a newer build (v${d.v})`);
  return d;
}

/** Apply a (migrated) save to a fresh world. */
export function restore(world, data) {
  const d = migrate(data);
  const p = getPlayer(world);
  world.pilot = { name: d.pilot.name || 'Pilot', civ: d.pilot.civ || 'savanah' };
  const hull = FLEET[d.pilot.hullId] || p.hull;
  setHull(p, hull);
  try { p.blueprint = validateBlueprint(cloneBlueprint(d.pilot.blueprint)); } catch { p.blueprint = editableBlueprintFor(hull); }
  const banks = new Set(p.blueprint.nodes.map((n) => n.bank));
  initPlayerCombat(p, Object.fromEntries(Object.entries(d.pilot.fit || {}).filter(([b]) => banks.has(b))));
  p.uid = d.pilot.uid || 'S0';
  world.salvage = d.wallet.salvage;
  world.research = d.wallet.research;
  world.materials = { ...d.wallet.materials };
  if (Array.isArray(d.researched)) world.researched = [...new Set([...world.researched, ...d.researched])];
  world.hangar = (d.hangar || []).filter((h) => FLEET[h.hullId]);
  if (d.market?.prices) { Object.assign(world.market.prices, d.market.prices); Object.assign(world.market.stock, d.market.stock); }
  for (const [id, s] of Object.entries(d.atlas || {})) {
    const sig = world.atlas.sigs[id];
    if (!sig) continue;
    Object.assign(sig, { stage: s.stage, quality: s.quality || 0, pings: s.pings || [], scan: s.scan || 0 });
    const k = 1 - sig.quality;
    sig.radius = Math.max(70, 1400 * (1 - 0.95 * sig.quality));
    sig.center = { x: sig.pos.x + sig.offset.x * k, y: sig.pos.y + sig.offset.y * k, z: sig.pos.z + sig.offset.z * k };
    if (!world.atlas.activeId && s.stage !== 'resolved') world.atlas.activeId = id;
  }
  world.cover = Array.isArray(d.cover) ? [...d.cover] : [];
  if (d.induction) world.induction = { step: Math.min(d.induction.step | 0, INDUCTION.length), seq: world.eventSeq, done: !!d.induction.done };
  for (const o of Object.values(world.ops)) if (d.ops?.[o.id] === 'complete') o.stage = 'complete';
  if (d.sector && d.sector !== world.sector.id && SECTORS[d.sector]) {
    changeSector(world, d.sector, SECTORS[d.sector].home, true);
    // Saved pilots resume at the sector's station launch rail.
    const st = world.sector.landmarks[world.sector.home].pos, off = world.sector.launch.offset;
    p.pos = { x: st.x + off.x, y: st.y + off.y, z: st.z + off.z - p.hull.radius * 4 }; p.prevPos = { ...p.pos };
  }
  return world;
}
