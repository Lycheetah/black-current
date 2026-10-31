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
import { getPlayer } from './world.js';

export const SAVE_VERSION = 1;
export const SAVE_KIND = 'sovereign-eclipse-reforge';

/** v → function turning a v save into a v+1 save. */
const MIGRATIONS = {
  // 1: (d) => ({ ...d, v: 2, newField: default }),
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
    pilot: { hullId: p.hullId, blueprint: cloneBlueprint(p.blueprint), fit: { ...p.fit } },
    wallet: { salvage: world.salvage, research: world.research, materials: { ...world.materials } },
    atlas,
    ops: { [world.op.id]: world.op.stage === 'complete' ? 'complete' : 'open' },
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
  const hull = FLEET[d.pilot.hullId] || p.hull;
  setHull(p, hull);
  try { p.blueprint = validateBlueprint(cloneBlueprint(d.pilot.blueprint)); } catch { p.blueprint = editableBlueprintFor(hull); }
  const banks = new Set(p.blueprint.nodes.map((n) => n.bank));
  initPlayerCombat(p, Object.fromEntries(Object.entries(d.pilot.fit || {}).filter(([b]) => banks.has(b))));
  world.salvage = d.wallet.salvage;
  world.research = d.wallet.research;
  world.materials = { ...d.wallet.materials };
  for (const [id, s] of Object.entries(d.atlas || {})) {
    const sig = world.atlas.sigs[id];
    if (!sig) continue;
    Object.assign(sig, { stage: s.stage, quality: s.quality || 0, pings: s.pings || [], scan: s.scan || 0 });
    const k = 1 - sig.quality;
    sig.radius = Math.max(70, 1400 * (1 - 0.95 * sig.quality));
    sig.center = { x: sig.pos.x + sig.offset.x * k, y: sig.pos.y + sig.offset.y * k, z: sig.pos.z + sig.offset.z * k };
    if (!world.atlas.activeId && s.stage !== 'resolved') world.atlas.activeId = id;
  }
  if (d.ops?.[world.op.id] === 'complete') world.op.stage = 'complete';
  return world;
}
