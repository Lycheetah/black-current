// Loss and wrecks. One owner: this module writes world.wrecks, world.cover and what a lost hull pays back.
//  - Every destroyed ship (not drill drones) leaves a wreck in its sector with loot: salvage by class and,
//    sometimes, materials native to the sector. Wrecks drift for a few minutes, then break up.
//  - The player's loss is real: the hull and its fitted guns are gone. Half the guns' worth survives in
//    the wreck to be recovered. Covenant cover pays part of the hull back: basic cover is free,
//    full cover is bought at a station for a share of the hull's price.
//  - Recovery: the pilot wakes at the sector's station in the first ship of their hangar, or in a fresh
//    civilisation starter hull when the hangar is empty.
import { pushEvent } from './events.js';
import { WORLD } from '../core/scale.js';
import { dist3 } from '../core/math.js';
import { hullPrice, fitValue, defaultFitFor } from './economy.js';
import { modulesValue } from './fitting.js';
import { editableBlueprintFor } from '../ships/registry.js';
import { cloneBlueprint } from '../ships/blueprint.js';

export const LOOT_RANGE = 500 * WORLD;
export const WRECK_TTL = 300;
export const COVER = { basic: 0.4, full: 0.9, fullCost: 0.12 };
const CLASS_LOOT = { fighter: 8, frigate: 14, destroyer: 24, cruiser: 40, battlecruiser: 60, battleship: 90, dreadnought: 160, titan: 300 };
const SECTOR_MATS = { naraka: ['ferrite', 'drone_parts', 'prism_shard'], erebos: ['solar_filament', 'void_glass', 'ai_lattice', 'prism_shard'] };

let wid = 0;

/** Salvage a lost hull pays back through Covenant cover. */
export function coverPayout(world, ship) {
  const value = hullPrice(world, ship.hull);
  return Math.floor(value * (world.cover.includes(ship.uid) ? COVER.full : COVER.basic));
}
export const fullCoverCost = (world, ship) => Math.ceil(hullPrice(world, ship.hull) * COVER.fullCost);

function lootFor(world, e) {
  const salvage = CLASS_LOOT[e.enemyClass] ?? 10;
  const materials = {};
  const mats = SECTOR_MATS[world.sector.id] || SECTOR_MATS.naraka;
  if (world.rng.next() < 0.45) { const k = mats[Math.floor(world.rng.next() * mats.length)]; materials[k] = 1 + Math.floor(world.rng.next() * 2); }
  return { salvage: Math.round(salvage * (0.8 + world.rng.next() * 0.4) * (world.op?.mult ?? 1)), materials };
}

export function spawnWreck(world, e, loot, isPlayer = false) {
  const w = {
    id: 'w' + (++wid), shipId: e.id, sector: world.sector.id, hullId: e.hullId, name: e.hull.name, radius: e.flight.radius,
    pos: { ...e.pos }, vel: { x: e.vel.x * 0.15, y: e.vel.y * 0.15, z: e.vel.z * 0.15 }, spin: (world.rng.next() - 0.5) * 0.4,
    loot, looted: false, ttl: WRECK_TTL, player: isPlayer,
  };
  world.wrecks.push(w);
  pushEvent(world, { type: 'wreck', id: w.id, shipId: e.id, player: isPlayer });
  return w;
}

/** Destroyed ships become wrecks; wrecks drift and break up. */
export function stepLoss(world, dt) {
  for (const ev of world.events) {
    if (ev.seq <= (world.lossSeq || 0)) continue;
    world.lossSeq = ev.seq;
    if (ev.type !== 'destroyed' || ev.faction === 'drill' || ev.shipId === world.playerId) continue;
    const e = world.entities.find((x) => x.id === ev.shipId);
    if (e) spawnWreck(world, e, lootFor(world, e));
  }
  for (const w of world.wrecks) {
    w.pos.x += w.vel.x * dt; w.pos.y += w.vel.y * dt; w.pos.z += w.vel.z * dt;
    // An emptied wreck breaks up within a minute.
    w.ttl = (w.looted ? Math.min(w.ttl, 60) : w.ttl) - dt;
  }
  world.wrecks = world.wrecks.filter((w) => w.ttl > 0);
}

/** The player's hull is destroyed: leave its wreck, pay cover, and record what was lost. */
export function losePlayerHull(world, ship) {
  const payout = coverPayout(world, ship);
  const covered = world.cover.includes(ship.uid);
  world.cover = world.cover.filter((u) => u !== ship.uid);
  world.salvage += payout;
  const guns = fitValue(ship.fit) + modulesValue(ship.modules);
  spawnWreck(world, ship, { salvage: Math.floor(guns * 0.5), materials: {} }, true);
  pushEvent(world, { type: 'hullLost', name: ship.hull.name, payout, covered, guns });
}

/** What the pilot flies next: first hangar ship, else a civilisation starter. */
export function recoveryShip(world) {
  if (world.hangar.length) {
    const entry = world.hangar.shift();
    return { hull: world.fleet[entry.hullId], fit: entry.fit, modules: entry.modules || {}, blueprint: cloneBlueprint(entry.blueprint), uid: entry.uid, fromHangar: true };
  }
  const hull = world.fleet[world.pilot.civ + '_starter'] || world.fleet.savanah_starter;
  return { hull, fit: defaultFitFor(hull), modules: {}, blueprint: editableBlueprintFor(hull), uid: 'S' + world.tick.toString(36) + 'r', fromHangar: false };
}

export const wreckHere = (world, w) => w.sector === world.sector.id;

export function nearestWreck(world, ship, range = LOOT_RANGE) {
  let best = null, bd = range;
  for (const w of world.wrecks) {
    if (w.looted || !wreckHere(world, w)) continue;
    const d = dist3(w.pos, ship.pos) - w.radius;
    if (d < bd) { bd = d; best = w; }
  }
  return best;
}

export function applyLossOrders(world, ship, orders) {
  if (!orders) return orders;
  const rest = [];
  for (const o of orders) {
    if (o.type === 'loot') {
      const w = o.wreckId ? world.wrecks.find((x) => x.id === o.wreckId) : nearestWreck(world, ship);
      if (!w || w.looted || !wreckHere(world, w) || dist3(w.pos, ship.pos) - w.radius > LOOT_RANGE || ship.docked) {
        pushEvent(world, { type: 'lootRefused', reason: w?.looted ? 'ALREADY EMPTY' : `COME WITHIN ${LOOT_RANGE} M OF A WRECK` });
        continue;
      }
      w.looted = true;
      world.salvage += w.loot.salvage;
      for (const [k, n] of Object.entries(w.loot.materials)) world.materials[k] = (world.materials[k] || 0) + n;
      pushEvent(world, { type: 'looted', id: w.id, name: w.name, salvage: w.loot.salvage, materials: w.loot.materials });
    } else if (o.type === 'buyCover') {
      if (!ship.docked) { pushEvent(world, { type: 'tradeRefused', reason: 'DOCK FIRST' }); continue; }
      if (world.cover.includes(ship.uid)) { pushEvent(world, { type: 'tradeRefused', reason: 'ALREADY FULLY COVERED' }); continue; }
      const cost = fullCoverCost(world, ship);
      if (world.salvage < cost) { pushEvent(world, { type: 'tradeRefused', reason: `NEED ${cost} SALVAGE` }); continue; }
      world.salvage -= cost;
      world.cover.push(ship.uid);
      pushEvent(world, { type: 'covered', name: ship.hull.name, cost });
    } else rest.push(o);
  }
  return rest;
}
