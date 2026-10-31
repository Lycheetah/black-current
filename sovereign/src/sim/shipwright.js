// Docking and the Elite Shipwright. One owner: this module writes docking state, node positions and fits.
// Rules are the original's: a fit must stay inside the hull's powergrid, and a gun's tier
// cannot exceed the class's maxWeaponTier.
import { TURRET_CATALOG } from '../data/ships/weapons.js';
import { CLASS_CATALOG } from '../data/ships/classes.js';
import { fitWeapons } from './combat.js';
import { playerCombatState } from './combat-model.js';
import { pushEvent } from './events.js';
import { dist3 } from '../core/math.js';

export const DOCK_RANGE = 1100;
const HOSTILE_CLEAR = 3000;
/** Turrets the pilot owns at the start (original defaultSettings.ownedTurretWeapons). */
export const OWNED_TURRETS = ['autocannon', 'repeater', 'railgun', 'plasma', 'flak', 'beam_laser', 'missile', 'ion', 'shard'];

export function powergridUsed(fit) {
  return Object.values(fit).reduce((s, id) => s + (id ? TURRET_CATALOG[id].pg : 0), 0);
}

/** Why a turret cannot go on this hull right now, or null if it can. */
export function fitBlocker(ship, bank, turretId) {
  const w = TURRET_CATALOG[turretId];
  if (!w) return 'UNKNOWN WEAPON';
  if (!OWNED_TURRETS.includes(turretId)) return w.sectorReq ? `REQUIRES ${w.sectorReq.toUpperCase()}` : 'NOT OWNED';
  const maxTier = CLASS_CATALOG[ship.hull.classId]?.maxWeaponTier ?? 1;
  if (w.tier > maxTier) return `TIER ${w.tier} · CLASS MAX ${maxTier}`;
  const next = { ...ship.fit, [bank]: turretId };
  if (powergridUsed(next) > ship.hull.powergrid) return `POWERGRID ${powergridUsed(next)} / ${ship.hull.powergrid}`;
  return null;
}

export function canDock(world, ship) {
  if (ship.dead || ship.docked) return false;
  const st = world.sector.landmarks.asterion;
  if (dist3(ship.pos, st.pos) > DOCK_RANGE) return false;
  return !world.entities.some((e) => e.faction === 'hostile' && !e.dead && dist3(e.pos, ship.pos) < HOSTILE_CLEAR);
}

function dockPose(world, ship) {
  const st = world.sector.landmarks.asterion.pos, o = world.sector.launch.offset;
  ship.pos = { x: st.x + o.x, y: st.y + o.y, z: st.z + o.z - ship.hull.radius * 4 };
  ship.prevPos = { ...ship.pos };
  ship.rot = { x: 0, y: 0, z: 0, w: 1 }; ship.prevRot = { ...ship.rot };
  ship.vel = { x: 0, y: 0, z: 0 }; ship.angVel = { x: 0, y: 0, z: 0 };
  ship.throttle = 0; ship.speed = 0;
}

/** Handle shipwright orders; returns the orders it did not consume. */
export function applyShipwrightOrders(world, ship, orders) {
  if (!orders) return orders;
  const rest = [];
  for (const o of orders) {
    switch (o.type) {
      case 'dock':
        if (canDock(world, ship)) {
          ship.docked = true;
          dockPose(world, ship);
          // Full service on docking: repair and recharge.
          ship.combat = playerCombatState(ship.hull);
          ship.lock = { targetId: null, progress: 0 };
          ship.nav = { mode: 'manual', targetId: null, range: 0 };
          for (const g of Object.values(ship.groups)) g.active = false;
          pushEvent(world, { type: 'docked' });
        } else pushEvent(world, { type: 'dockRefused' });
        break;
      case 'undock':
        if (ship.docked) {
          ship.docked = false;
          dockPose(world, ship);
          ship.throttle = 0.3;
          ship.vel.z = -ship.flight.maxSpeed * 0.3;
          pushEvent(world, { type: 'undocked' });
        }
        break;
      case 'moveNode': {
        if (!ship.docked) break;
        const n = ship.blueprint.nodes.find((x) => x.bank === o.bank);
        if (!n) break;
        n.x = Math.max(-1, Math.min(1, o.x));
        n.z = Math.max(-0.46, Math.min(0.46, o.z));
        fitWeapons(ship, ship.fit);
        pushEvent(world, { type: 'nodeMoved', bank: o.bank });
        break;
      }
      case 'fit': {
        if (!ship.docked) break;
        if (o.turretId) {
          const why = fitBlocker(ship, o.bank, o.turretId);
          if (why) { pushEvent(world, { type: 'fitRefused', bank: o.bank, reason: why }); break; }
        }
        const fit = { ...ship.fit };
        if (o.turretId) fit[o.bank] = o.turretId; else delete fit[o.bank];
        fitWeapons(ship, fit);
        pushEvent(world, { type: 'fitted', bank: o.bank, turretId: o.turretId || null });
        break;
      }
      default: rest.push(o);
    }
  }
  return rest;
}
