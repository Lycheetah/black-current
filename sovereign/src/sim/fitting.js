// Fitting: modules in slots, the budgets they spend, and the ship they make.
// One owner: this module writes ship.modules, the fitted stats it derives (flight, pools, capacitor,
// weapon multipliers), active module cycling, and world.fits (saved fits).
//
// EVE-style rules:
//  - slots by class: weapon systems (W), defense (D), drive (R), utility (U)
//  - power grid is shared by turrets and modules and cannot be exceeded
//  - mass has a hard cap (MASS_CAP × hull mass); fitted mass makes the ship slower to accelerate and turn
//  - module stats multiply the hull's; active modules (shield boosters, armour repairers) cycle on
//    capacitor whenever their pool drops below the module's threshold
import { MODULE_CATALOG, MODULE_RUNTIME } from '../data/ships/modules.js';
import { TURRET_CATALOG } from '../data/ships/weapons.js';
import { capacitorProfileFor } from '../data/combat/capacitor.js';
import { flightProfile } from './ship.js';
import { weaponStats, PLAYER_SHOT_DAMAGE } from './combat-model.js';
import { pushEvent } from './events.js';

export const SLOT_TYPES = [
  { key: 'W', type: 'weapon', name: 'WEAPON SYSTEMS' },
  { key: 'D', type: 'defense', name: 'DEFENSE' },
  { key: 'R', type: 'drive', name: 'DRIVE' },
  { key: 'U', type: 'utility', name: 'UTILITY' },
];
/** Slots per class: [weapon systems, defense, drive, utility]. */
const SLOT_COUNTS = {
  pod: [0, 1, 1, 0], starter: [1, 1, 1, 1], frigate: [1, 1, 1, 1], assault_frigate: [2, 1, 1, 1], specialist_frigate: [1, 1, 1, 2],
  destroyer: [2, 1, 1, 1], cruiser: [2, 2, 1, 2], heavy_cruiser: [2, 3, 1, 2], advanced_cruiser: [2, 2, 2, 2],
  battlecruiser: [3, 2, 2, 2], specialist_ship: [2, 2, 2, 3], battleship: [3, 3, 2, 3], drone_carrier: [2, 3, 2, 3],
  industrial: [1, 2, 2, 3], autonomous: [3, 2, 2, 2], dreadnought: [4, 4, 2, 3], carrier: [2, 4, 2, 4], titan: [5, 5, 3, 5],
};
export const MASS_CAP = 1.25;      // fitted mass may reach 125% of the hull's own mass
const AGILITY_LOSS = 0.32;         // at full mass load, acceleration and turning drop by this share
const MODULE_REFUND = 0.5;
/** Modules every pilot owns from the start (the canon free set); the rest are bought on fitting. */
export const FREE_MODULES = Object.values(MODULE_CATALOG).filter((m) => m.cost === 0).map((m) => m.id);
/** Modules that can be fitted today (the AI cores arrive with drones). */
export const FITTABLE = Object.values(MODULE_CATALOG).filter((m) => m.stats || MODULE_RUNTIME[m.id]).map((m) => m.id);

/** Slot ids for a hull, e.g. ['W1', 'D1', 'D2', 'R1', 'U1']. */
export function slotsFor(hull) {
  const n = SLOT_COUNTS[hull.classId] || SLOT_COUNTS.cruiser;
  return SLOT_TYPES.flatMap((t, i) => Array.from({ length: n[i] }, (_, j) => t.key + (j + 1)));
}
export const slotType = (slot) => SLOT_TYPES.find((t) => t.key === slot[0])?.type;

export function powergridUsed(fit = {}, modules = {}) {
  return Object.values(fit).reduce((s, id) => s + (TURRET_CATALOG[id]?.pg || 0), 0)
    + Object.values(modules).reduce((s, id) => s + (MODULE_CATALOG[id]?.pg || 0), 0);
}
export function massUsed(fit = {}, modules = {}) {
  return Object.values(fit).reduce((s, id) => s + (TURRET_CATALOG[id]?.mass || 0), 0)
    + Object.values(modules).reduce((s, id) => s + (MODULE_CATALOG[id]?.mass || 0), 0);
}
export const massCap = (hull) => Math.round((hull.baseMass || 100) * MASS_CAP);

/** The hull's stats with every fitted module's multipliers applied. */
export function fittedStats(hull, modules = {}) {
  const s = { ...hull.stats };
  for (const id of Object.values(modules)) {
    for (const [k, v] of Object.entries(MODULE_CATALOG[id]?.stats || {})) s[k] = (s[k] ?? 1) * v;
  }
  return s;
}

/** Everything the fitting window shows, for a hull with this fit (pure: used for hover previews). */
export function fitSummary(hull, fit = {}, modules = {}) {
  const s = fittedStats(hull, modules);
  const mass = massUsed(fit, modules), cap = massCap(hull);
  const agility = 1 - AGILITY_LOSS * Math.min(1, mass / cap);
  const fl = flightProfile({ ...hull, stats: s });
  const capP = capacitorProfileFor(hull);
  const capMax = capP.max * (s.capacitor ?? 1), capRegen = capP.regen * (s.capRegen ?? 1);
  const shield = 1000 * s.shield, armour = 850 * s.armor, structure = 1000 * s.hull;
  const rate = s.turretRate ?? 1, dmg = s.turretDamage ?? 1, wcap = s.weaponCapUse ?? 1;
  let dps = 0, drain = 0;
  for (const id of Object.values(fit)) {
    if (!id) continue;
    const w = weaponStats(id), cycle = w.cycle / rate;
    dps += (w.damage * PLAYER_SHOT_DAMAGE * dmg) / cycle;
    drain += (w.cap * wcap) / cycle;
  }
  let repair = 0;
  for (const id of Object.values(modules)) {
    const r = MODULE_RUNTIME[id];
    if (!r) continue;
    drain += r.cap / r.cycle;
    repair += r.amount / r.cycle;
  }
  return {
    pg: { used: powergridUsed(fit, modules), max: hull.powergrid },
    mass: { used: mass, max: cap },
    ehp: Math.round(shield + armour + structure), shield: Math.round(shield), armour: Math.round(armour), structure: Math.round(structure),
    repair: Math.round(repair * 10) / 10,
    dps: Math.round(dps * 10) / 10,
    cap: { max: Math.round(capMax), regen: Math.round(capRegen * 10) / 10, drain: Math.round(drain * 10) / 10,
      // Seconds until empty while every gun and active module cycles, or null if it holds.
      lasts: drain > capRegen ? Math.round(capMax / (drain - capRegen)) : null },
    speed: Math.round(fl.maxSpeed), accel: Math.round(fl.accel * agility), turn: Math.round(fl.maxTurn * agility * 57.3 * 10) / 10,
    agility: Math.round(agility * 100),
  };
}

/** Why a module cannot go in this slot right now, or null. */
export function moduleBlocker(world, ship, slot, moduleId) {
  const m = MODULE_CATALOG[moduleId];
  if (!m || !FITTABLE.includes(moduleId)) return 'NOT FITTABLE YET';
  if (!slotsFor(ship.hull).includes(slot)) return 'NO SUCH SLOT';
  if (slotType(slot) !== m.slot) return `${m.slot.toUpperCase()} MODULE · ${slotType(slot).toUpperCase()} SLOT`;
  const next = { ...ship.modules, [slot]: moduleId };
  const pg = powergridUsed(ship.fit, next);
  if (pg > ship.hull.powergrid) return `POWERGRID ${pg} / ${ship.hull.powergrid}`;
  const mass = massUsed(ship.fit, next);
  if (mass > massCap(ship.hull)) return `MASS ${mass} / ${massCap(ship.hull)}`;
  const cost = moduleCost(ship.modules[slot], moduleId);
  if (world && cost > world.salvage) return `NEED ${cost} SALVAGE`;
  return null;
}
export const moduleCost = (oldId, newId) => (MODULE_CATALOG[newId]?.cost || 0) - Math.floor((MODULE_CATALOG[oldId]?.cost || 0) * MODULE_REFUND);
export const modulesValue = (modules = {}) => Object.values(modules).reduce((s, id) => s + (MODULE_CATALOG[id]?.cost || 0), 0);

/** Keep only modules that still fit this hull (after a hull swap), within its budgets. */
export function sanitizeModules(hull, fit, modules = {}) {
  const slots = new Set(slotsFor(hull));
  const out = {};
  for (const [slot, id] of Object.entries(modules || {})) {
    if (!slots.has(slot) || MODULE_CATALOG[id]?.slot !== slotType(slot)) continue;
    const next = { ...out, [slot]: id };
    if (powergridUsed(fit, next) > hull.powergrid || massUsed(fit, next) > massCap(hull)) continue;
    out[slot] = id;
  }
  return out;
}

/**
 * Apply the fit to a ship: flight, pool maxima (current values keep their share), capacitor, weapon
 * multipliers and the active module list.
 */
export function applyFitting(ship) {
  ship.modules = sanitizeModules(ship.hull, ship.fit, ship.modules);
  const sum = fitSummary(ship.hull, ship.fit, ship.modules);
  const s = fittedStats(ship.hull, ship.modules);
  const agility = sum.agility / 100;
  const base = flightProfile({ ...ship.hull, stats: s });
  ship.flight = { ...base, accel: base.accel * agility, maxTurn: base.maxTurn * agility, maxRoll: base.maxRoll * agility, angAccel: base.angAccel * agility };
  const c = ship.combat;
  const rescale = (pool, max) => { const f = pool.max > 0 ? pool.cur / pool.max : 1; pool.max = Math.round(max); pool.cur = Math.round(max * f); };
  rescale(c.shield, sum.shield);
  rescale(c.structure, sum.structure);
  for (const z of Object.values(c.armour)) rescale(z, sum.armour / 2);
  rescale(c.cap, sum.cap.max);
  c.cap.regen = sum.cap.regen;
  c.damageMult = s.turretDamage ?? 1;
  ship.cycleMult = 1 / (s.turretRate ?? 1);
  ship.weaponCapUse = s.weaponCapUse ?? 1;
  ship.activeModules = Object.entries(ship.modules).filter(([, id]) => MODULE_RUNTIME[id]).map(([slot, id]) => ({ slot, id, ...MODULE_RUNTIME[id], timer: 0 }));
}

/** Active modules: each cycles on capacitor whenever its pool is below the module's threshold. */
export function stepFitting(world, ship, dt) {
  if (!ship?.activeModules?.length || ship.dead || ship.docked) return;
  const c = ship.combat;
  for (const m of ship.activeModules) {
    m.timer = Math.max(0, m.timer - dt);
    if (m.timer > 0 || c.cap.cur < m.cap) continue;
    if (m.kind === 'shield_boost') {
      if (c.shield.cur >= c.shield.max * m.threshold) continue;
      c.shield.cur = Math.min(c.shield.max, c.shield.cur + m.amount);
    } else if (m.kind === 'armor_repair') {
      const zones = Object.values(c.armour);
      const cur = zones.reduce((a, z) => a + z.cur, 0), max = zones.reduce((a, z) => a + z.max, 0);
      if (cur >= max * m.threshold) continue;
      // Repairs the most damaged plates first.
      let left = m.amount;
      for (const z of zones.sort((a, b) => a.cur / a.max - b.cur / b.max)) { const add = Math.min(left, z.max - z.cur); z.cur += add; left -= add; if (left <= 0) break; }
    } else continue;
    c.cap.cur -= m.cap;
    m.timer = m.cycle;
    pushEvent(world, { type: 'moduleCycle', shipId: ship.id, kind: m.kind, label: m.label });
  }
}

/** Fitting orders (docked): fit or remove a module, save a fit, load a saved fit. */
export function applyFittingOrders(world, ship, orders) {
  if (!orders) return orders;
  const rest = [];
  const refuse = (reason) => pushEvent(world, { type: 'fitRefused', reason });
  for (const o of orders) {
    if (!['fitModule', 'unfitModule', 'saveFit', 'loadFit', 'deleteFit'].includes(o.type)) { rest.push(o); continue; }
    if (!ship.docked) { refuse('DOCK TO REFIT'); continue; }
    if (o.type === 'fitModule') {
      const why = moduleBlocker(world, ship, o.slot, o.moduleId);
      if (why) { refuse(why); continue; }
      world.salvage -= moduleCost(ship.modules[o.slot], o.moduleId);
      ship.modules = { ...ship.modules, [o.slot]: o.moduleId };
      applyFitting(ship);
      pushEvent(world, { type: 'moduleFitted', slot: o.slot, moduleId: o.moduleId });
    } else if (o.type === 'unfitModule') {
      const old = ship.modules[o.slot];
      if (!old) continue;
      world.salvage += Math.floor((MODULE_CATALOG[old]?.cost || 0) * MODULE_REFUND);
      const next = { ...ship.modules }; delete next[o.slot];
      ship.modules = next;
      applyFitting(ship);
      pushEvent(world, { type: 'moduleFitted', slot: o.slot, moduleId: null });
    } else if (o.type === 'saveFit') {
      const name = String(o.name || ship.hull.name).slice(0, 32);
      world.fits = [...(world.fits || []).filter((f) => !(f.name === name && f.hullId === ship.hullId)), { name, hullId: ship.hullId, fit: { ...ship.fit }, modules: { ...ship.modules } }];
      pushEvent(world, { type: 'fitSaved', name });
    } else if (o.type === 'deleteFit') {
      world.fits = (world.fits || []).filter((_, i) => i !== o.index);
    } else if (o.type === 'loadFit') {
      const f = world.fits?.[o.index];
      if (!f || f.hullId !== ship.hullId) { refuse('THAT FIT IS FOR ANOTHER HULL'); continue; }
      const modules = sanitizeModules(ship.hull, ship.fit, f.modules);
      let cost = 0;
      for (const slot of new Set([...Object.keys(ship.modules), ...Object.keys(modules)])) {
        if (ship.modules[slot] !== modules[slot]) cost += modules[slot] ? moduleCost(ship.modules[slot], modules[slot]) : -Math.floor((MODULE_CATALOG[ship.modules[slot]]?.cost || 0) * MODULE_REFUND);
      }
      if (cost > world.salvage) { refuse(`NEED ${cost} SALVAGE`); continue; }
      world.salvage -= cost;
      ship.modules = modules;
      applyFitting(ship);
      pushEvent(world, { type: 'fitLoaded', name: f.name, cost });
    }
  }
  return rest;
}
