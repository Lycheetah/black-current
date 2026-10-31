// Combat numbers in Reforge units, derived from the original catalogs.
// Original distances are scaled ×6 and projectile speeds ×8 to match the ×8 sector scale.
import { TURRET_CATALOG } from '../data/ships/weapons.js';
import { DAMAGE_PROFILES, WEAPON_ANATOMY, WEAPON_GROUPS } from '../data/combat/damage.js';
import { capacitorProfileFor } from '../data/combat/capacitor.js';
import { ENEMY_CLASS_CATALOG, ENEMY_RACE_DOCTRINES } from '../data/combat/enemies.js';

export const RANGE_SCALE = 6;
export const SHOT_SPEED_SCALE = 8;
export const TRACK_K = 17;
export const PLAYER_SHOT_DAMAGE = 30;
export const ENEMY_SPEED_SCALE = 7;

export { TURRET_CATALOG, DAMAGE_PROFILES, WEAPON_ANATOMY, WEAPON_GROUPS, ENEMY_CLASS_CATALOG, ENEMY_RACE_DOCTRINES };

export const GROUP_OF_BANK = Object.fromEntries(
  Object.entries(WEAPON_GROUPS).flatMap(([g, banks]) => banks.map((b) => [b, g])),
);

export function weaponStats(id) {
  const w = TURRET_CATALOG[id];
  if (!w) throw new Error('Unknown turret ' + id);
  return {
    id, name: w.name, size: w.size, damageType: w.damageType || 'balanced', homing: !!w.homing,
    optimal: w.optimal * RANGE_SCALE, falloff: w.falloff * RANGE_SCALE, tracking: w.tracking,
    speed: w.speed * SHOT_SPEED_SCALE, cycle: 1 / w.rate, damage: w.damage, cap: w.cap, color: w.color,
    radius: w.radius,
  };
}

/** EVE-style turret hit chance from angular velocity, target size and range. */
export function hitChance(w, distance, angular, targetRadius) {
  const track = (angular * TRACK_K) / (Math.max(0.04, w.tracking) * Math.max(2, targetRadius));
  const range = Math.max(0, distance - w.optimal) / w.falloff;
  if (w.homing) return Math.pow(0.5, range * range * 0.5); // guided ordnance ignores tracking
  return Math.pow(0.5, track * track + range * range);
}

/** Starting fit per bank: the original's free autocannon plus doctrine variety on bigger hulls. */
const DEFAULT_ROTATION = ['autocannon', 'beam_laser', 'plasma', 'railgun', 'missile', 'shard'];
export function defaultFit(hull) {
  const fit = {};
  (hull.activeBanks || []).forEach((bank, i) => { fit[bank] = DEFAULT_ROTATION[i % DEFAULT_ROTATION.length]; });
  return fit;
}

/** Build the combat state (pools, armour zones, systems, capacitor) for a fleet-catalog hull. */
export function playerCombatState(hull) {
  const s = hull.stats;
  const cap = capacitorProfileFor(hull);
  const zoneArmour = Math.round((850 * s.armor) / 2);
  return {
    shield: { cur: Math.round(1000 * s.shield), max: Math.round(1000 * s.shield), regen: 0.03, delay: 5, since: 99 },
    armour: zoneSet(zoneArmour),
    structure: { cur: Math.round(1000 * s.hull), max: Math.round(1000 * s.hull) },
    systems: freshSystems(),
    cap: { cur: cap.max, max: cap.max, regen: cap.regen },
    damageMult: s.turretDamage,
  };
}

export function enemyCombatState(cls, doctrine, mult = 1) {
  const c = ENEMY_CLASS_CATALOG[cls];
  const d = doctrine;
  const zoneArmour = Math.round((c.armor * d.armor * mult) / 2);
  return {
    shield: { cur: Math.round(c.shield * d.shield * mult), max: Math.round(c.shield * d.shield * mult), regen: 0.03, delay: 6, since: 99 },
    armour: zoneSet(zoneArmour),
    structure: { cur: Math.round(c.hull * d.hull * mult), max: Math.round(c.hull * d.hull * mult) },
    systems: freshSystems(),
    cap: { cur: 9999, max: 9999, regen: 9999 },
    damageMult: 1,
  };
}

const zoneSet = (v) => ({ fore: { cur: v, max: v }, aft: { cur: v, max: v }, port: { cur: v, max: v }, starboard: { cur: v, max: v } });
const freshSystems = () => ({ engines: 1, sensors: 1, reactor: 1, weapons_fore: 1, weapons_mid: 1, weapons_aft: 1 });

/** Which internal systems sit behind each armour zone. */
export const ZONE_SYSTEMS = {
  fore: ['sensors', 'weapons_fore'],
  aft: ['engines', 'weapons_aft'],
  port: ['reactor', 'weapons_mid'],
  starboard: ['reactor', 'weapons_mid'],
};
