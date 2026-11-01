// Economy: the Asterion shipyard (buy hulls, gated by research), the fleet (own several ships, board one,
// sell others), paid turret fitting, and the materials exchange with prices that move with supply.
// One owner: this module writes world.hangar, world.market and salvage spent or earned here.
import { MATERIAL_CATALOG } from '../data/progression/materials.js';
import { TURRET_CATALOG } from '../data/ships/weapons.js';
import { RESEARCH_PROJECTS } from '../data/progression/research.js';
import { editableBlueprintFor } from '../ships/registry.js';
import { defaultFit } from './combat-model.js';
import { initPlayerCombat } from './combat.js';
import { setHull } from './ship.js';
import { pushEvent } from './events.js';
import { cloneBlueprint } from '../ships/blueprint.js';

/** Hull price by class (salvage). */
export const HULL_PRICE = {
  pod: 0, starter: 0, frigate: 220, assault_frigate: 360, specialist_frigate: 380, destroyer: 560,
  cruiser: 1150, heavy_cruiser: 1650, advanced_cruiser: 1850, battlecruiser: 2700, specialist_ship: 2900,
  battleship: 4300, drone_carrier: 5200, industrial: 3600, autonomous: 6100, dreadnought: 9200, carrier: 11500, titan: 26000,
};
/** Research that opens each class at the shipyard (canon unlock lines). */
export const HULL_RESEARCH = {
  frigate: 'frigate_specialization', assault_frigate: 'frigate_specialization', specialist_frigate: 'frigate_specialization',
  destroyer: 'destroyer_architecture', cruiser: 'cruiser_architecture', heavy_cruiser: 'cruiser_architecture',
  advanced_cruiser: 'battlecruiser_theory', battlecruiser: 'battlecruiser_theory', specialist_ship: 'battleship_architecture',
  battleship: 'battleship_architecture', drone_carrier: 'drone_command', industrial: 'sovereign_industry', autonomous: 'ai_cognition',
  dreadnought: 'subcapital_architecture', carrier: 'subcapital_architecture', titan: 'titan_theory',
};
/** Hulls from another civilisation's line cost more until standing exists (R0.21). */
const FOREIGN_MARKUP = 1.25;
const SELL_BACK = 0.4;
const TURRET_REFUND = 0.5;

/** Base value of each material in salvage. */
export const MATERIAL_VALUE = { ferrite: 4, biofiber: 7, drone_parts: 9, prism_shard: 14, solar_filament: 18, void_glass: 30, ai_lattice: 42 };

export function createMarket() {
  const prices = {}, stock = {};
  for (const k of Object.keys(MATERIAL_CATALOG)) { prices[k] = MATERIAL_VALUE[k] ?? 10; stock[k] = 40; }
  return { prices, stock };
}
export const buyPrice = (world, k) => Math.ceil(world.market.prices[k] * 1.15);
export const sellPrice = (world, k) => Math.floor(world.market.prices[k]);

export function hullPrice(world, hull) {
  return Math.round((HULL_PRICE[hull.classId] ?? 1000) * (hull.raceId === world.pilot.civ ? 1 : FOREIGN_MARKUP));
}

/** Why this hull cannot be bought now, or null. */
export function hullBlocker(world, hull) {
  const req = HULL_RESEARCH[hull.classId];
  if (req && !world.researched.includes(req)) return `RESEARCH ${RESEARCH_PROJECTS[req].name.toUpperCase()}`;
  const price = hullPrice(world, hull);
  if (world.salvage < price) return `NEED ${price} SALVAGE`;
  return null;
}

let uid = 0;
const newUid = (world) => `S${Date.now().toString(36)}${(++uid).toString(36)}${world.tick}`;

/** Snapshot the boarded ship for the hangar. */
function snapshot(ship) {
  return { uid: ship.uid, hullId: ship.hullId, blueprint: cloneBlueprint(ship.blueprint), fit: { ...ship.fit } };
}

/** Board a hangar ship as the active ship (keeps the player's entity, swaps its hull, blueprint and fit). */
export function board(world, ship, entry) {
  setHull(ship, world.fleet[entry.hullId]);
  ship.blueprint = cloneBlueprint(entry.blueprint);
  ship.uid = entry.uid;
  initPlayerCombat(ship, entry.fit);
}

export function applyEconomyOrders(world, ship, orders) {
  if (!orders) return orders;
  const rest = [];
  const refuse = (reason) => pushEvent(world, { type: 'tradeRefused', reason });
  for (const o of orders) {
    switch (o.type) {
      case 'buyHull': {
        const hull = world.fleet[o.hullId];
        if (!ship.docked || !hull) { refuse('DOCK FIRST'); break; }
        const why = hullBlocker(world, hull);
        if (why) { refuse(why); break; }
        const price = hullPrice(world, hull);
        world.salvage -= price;
        const entry = { uid: newUid(world), hullId: hull.id, blueprint: editableBlueprintFor(hull), fit: defaultFitFor(hull) };
        world.hangar.push(entry);
        pushEvent(world, { type: 'hullBought', name: hull.name, price, uid: entry.uid });
        break;
      }
      case 'board': {
        const i = world.hangar.findIndex((h) => h.uid === o.uid);
        if (!ship.docked || i < 0) { refuse('DOCK FIRST'); break; }
        const entry = world.hangar[i];
        world.hangar[i] = snapshot(ship);
        board(world, ship, entry);
        pushEvent(world, { type: 'boarded', name: ship.hull.name });
        break;
      }
      case 'sellHull': {
        const i = world.hangar.findIndex((h) => h.uid === o.uid);
        if (!ship.docked || i < 0) { refuse('DOCK FIRST'); break; }
        const hull = world.fleet[world.hangar[i].hullId];
        const value = Math.floor(hullPrice(world, hull) * SELL_BACK + fitValue(world.hangar[i].fit) * TURRET_REFUND);
        world.salvage += value;
        world.hangar.splice(i, 1);
        pushEvent(world, { type: 'hullSold', name: hull.name, value });
        break;
      }
      case 'sellMat': case 'buyMat': {
        const k = o.mat, n = Math.max(1, o.n | 0);
        if (!ship.docked || !(k in world.market.prices)) { refuse('DOCK FIRST'); break; }
        if (o.type === 'sellMat') {
          const have = world.materials[k] || 0, m = Math.min(have, n);
          if (!m) { refuse('NONE TO SELL'); break; }
          let total = 0;
          for (let i = 0; i < m; i++) { total += sellPrice(world, k); world.market.prices[k] *= 0.985; world.market.stock[k]++; }
          world.materials[k] = have - m;
          world.salvage += total;
          pushEvent(world, { type: 'sold', mat: k, n: m, total });
        } else {
          let bought = 0, total = 0;
          while (bought < n && world.market.stock[k] > 0 && world.salvage >= buyPrice(world, k)) {
            const p = buyPrice(world, k); world.salvage -= p; total += p; bought++;
            world.market.prices[k] *= 1.015; world.market.stock[k]--;
          }
          if (!bought) { refuse(world.market.stock[k] ? 'NOT ENOUGH SALVAGE' : 'OUT OF STOCK'); break; }
          world.materials[k] = (world.materials[k] || 0) + bought;
          pushEvent(world, { type: 'bought', mat: k, n: bought, total });
        }
        break;
      }
      default: rest.push(o);
    }
  }
  return rest;
}

/** Prices drift back toward their base value; stock refills slowly. */
export function stepMarket(world, dt) {
  const m = world.market;
  for (const k in m.prices) {
    const base = MATERIAL_VALUE[k] ?? 10;
    m.prices[k] += (base - m.prices[k]) * Math.min(1, dt * 0.004);
    if (m.stock[k] < 40 && world.rng.next() < dt * 0.02) m.stock[k]++;
  }
}

export const fitValue = (fit) => Object.values(fit || {}).reduce((s, id) => s + (TURRET_CATALOG[id]?.cost || 0), 0);

/** New hulls come with the free Earned-Light Autocannon on every node. */
export function defaultFitFor(hull) {
  const fit = defaultFit(hull);
  for (const k of Object.keys(fit)) fit[k] = 'autocannon';
  return fit;
}

/** Cost of changing one node's gun: pay for the new one, half back for the old. */
export function refitCost(oldId, newId) {
  return (TURRET_CATALOG[newId]?.cost || 0) - Math.floor((TURRET_CATALOG[oldId]?.cost || 0) * TURRET_REFUND);
}
