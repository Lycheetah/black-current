// Mining. One owner: this module writes world.mining (the asteroids), the player's ore hold, mining
// cycles, unloading on dock and refining.
//  - each belt holds 12-14 big minable asteroids of the sector's ores; they shrink as they are mined
//    and grow back RESPAWN seconds after they run dry
//  - mining needs a mining module (Ore Harvester); within MINE_RANGE of an asteroid, each 5 s cycle
//    moves ore into the hold (units of 10 m³, capacity by class)
//  - docking unloads the hold into station stock (world.materials); refining turns ore into materials
import { ORES, SECTOR_ORES, ORE_HOLD, REFORGE_MODULES } from '../data/ores.js';
import { WORLD } from '../core/scale.js';
import { pushEvent } from './events.js';
import { dist3 } from '../core/math.js';
import { createRng } from '../core/rng.js';

export const MINE_RANGE = 2500;
export const CYCLE = 5;
const RESPAWN = 480;

export const createMining = () => ({ rocks: [], sectors: {} });
export const holdCapacity = (ship) => ORE_HOLD[ship?.hull?.classId] ?? 100;
export const holdUsed = (ship) => Object.values(ship?.hold || {}).reduce((a, b) => a + b, 0);
export const miningYield = (ship) => Object.values(ship?.modules || {}).reduce((s, id) => s + (REFORGE_MODULES[id]?.mining || 0), 0);

/** Seed a sector's asteroids from its belts (deterministic per belt). */
function seedSector(world, sector) {
  if (world.mining.sectors[sector.id]) return;
  world.mining.sectors[sector.id] = true;
  const ores = Object.entries(SECTOR_ORES[sector.id] || SECTOR_ORES.naraka);
  for (const belt of sector.belts) {
    const rng = createRng((belt.seed || 1) * 7919 + 13);
    const n = 12 + Math.floor(rng.next() * 3);
    for (let i = 0; i < n; i++) {
      let pick = rng.next(), ore = ores[0][0];
      for (const [id, w] of ores) { if (pick < w) { ore = id; break; } pick -= w; }
      const a = rng.next() * Math.PI * 2, r = Math.sqrt(rng.next()) * belt.spread * 0.42;
      const radius = (20 + rng.next() * 30) * WORLD;
      const max = Math.round(radius / WORLD * 3);
      world.mining.rocks.push({
        id: `${sector.id}.${belt.id}.${i}`, sector: sector.id, belt: belt.id, ore, name: ORES[ore].name,
        pos: { x: belt.center.x + Math.cos(a) * r, y: belt.center.y + (rng.next() - 0.5) * belt.spread * 0.12, z: belt.center.z + Math.sin(a) * r },
        radius, amount: max, max, regrow: 0, spin: rng.next() * 6,
      });
    }
  }
}

/** The nearest minable asteroid within range of the ship (surface distance), or null. */
export function nearestRock(world, ship, range = MINE_RANGE) {
  let best = null, bd = range;
  for (const r of world.mining.rocks) {
    if (r.sector !== world.sector.id || r.amount <= 0) continue;
    const d = dist3(r.pos, ship.pos) - r.radius;
    if (d < bd) { bd = d; best = r; }
  }
  return best;
}

export function applyMiningOrders(world, ship, orders) {
  if (!orders) return orders;
  const rest = [];
  const refuse = (reason) => pushEvent(world, { type: 'mineRefused', reason });
  for (const o of orders) {
    if (o.type === 'mine') {
      if (ship.mining) { ship.mining = null; pushEvent(world, { type: 'mineStop', reason: 'STOPPED' }); continue; }
      if (ship.docked) { refuse('UNDOCK FIRST'); continue; }
      if (miningYield(ship) <= 0) { refuse('FIT AN ORE HARVESTER (FITTING · UTILITY SLOT)'); continue; }
      if (holdUsed(ship) >= holdCapacity(ship)) { refuse('ORE HOLD FULL · DOCK TO UNLOAD'); continue; }
      const rock = o.rockId ? world.mining.rocks.find((r) => r.id === o.rockId) : nearestRock(world, ship);
      if (!rock || rock.amount <= 0 || dist3(rock.pos, ship.pos) - rock.radius > MINE_RANGE) { refuse(`COME WITHIN ${MINE_RANGE / 1000} KM OF AN ASTEROID`); continue; }
      ship.mining = { rockId: rock.id, t: 0 };
      pushEvent(world, { type: 'mineStart', name: rock.name });
    } else if (o.type === 'refineOre') {
      if (!ship.docked) { refuse('DOCK TO REFINE'); continue; }
      const ids = o.ore ? [o.ore] : Object.keys(ORES);
      const out = {};
      let used = 0;
      for (const id of ids) {
        const n = world.materials[id] || 0;
        if (!n) continue;
        for (const [mat, per] of Object.entries(ORES[id].refine)) {
          const got = Math.floor(n * per);
          if (got) { world.materials[mat] = (world.materials[mat] || 0) + got; out[mat] = (out[mat] || 0) + got; }
        }
        world.materials[id] = 0;
        used += n;
      }
      if (!used) { refuse('NO ORE TO REFINE'); continue; }
      pushEvent(world, { type: 'refined', used, out });
    } else rest.push(o);
  }
  return rest;
}

/** Mining cycles, regrowth, and unloading the hold on docking. */
export function stepMining(world, ship, dt) {
  seedSector(world, world.sector);
  for (const r of world.mining.rocks) {
    if (r.amount <= 0 && (r.regrow -= dt) <= 0) { r.amount = r.max; pushEvent(world, { type: 'rockRegrown', id: r.id }); }
  }
  if (!ship || ship.dead) return;
  if (ship.docked && holdUsed(ship) > 0) {
    const moved = { ...ship.hold };
    for (const [id, n] of Object.entries(ship.hold)) world.materials[id] = (world.materials[id] || 0) + n;
    ship.hold = {};
    pushEvent(world, { type: 'unloaded', moved });
  }
  const m = ship.mining;
  if (!m) return;
  const rock = world.mining.rocks.find((r) => r.id === m.rockId);
  const stop = (reason) => { ship.mining = null; pushEvent(world, { type: 'mineStop', reason }); };
  if (ship.docked || !rock || rock.sector !== world.sector.id) return stop('STOPPED');
  if (rock.amount <= 0) return stop('ASTEROID DEPLETED');
  if (dist3(rock.pos, ship.pos) - rock.radius > MINE_RANGE * 1.1) return stop('OUT OF RANGE');
  if ((m.t += dt) < CYCLE) return;
  m.t = 0;
  const free = holdCapacity(ship) - holdUsed(ship);
  const got = Math.min(miningYield(ship), rock.amount, free);
  if (got > 0) {
    rock.amount -= got;
    ship.hold = { ...ship.hold, [rock.ore]: (ship.hold?.[rock.ore] || 0) + got };
    pushEvent(world, { type: 'mined', ore: rock.ore, n: got, rockId: rock.id });
    if (rock.amount <= 0) rock.regrow = RESPAWN;
  }
  if (holdUsed(ship) >= holdCapacity(ship)) stop('ORE HOLD FULL · DOCK TO UNLOAD');
}
