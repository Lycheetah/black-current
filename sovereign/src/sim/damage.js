// Anatomy damage: shield → local armour → penetration → structure → systems.
// One owner: this module writes ship.combat pools. Numbers come from the original
// DAMAGE_PROFILES (damage type) and WEAPON_ANATOMY (weapon behaviour).
import { DAMAGE_PROFILES, WEAPON_ANATOMY, ZONE_SYSTEMS } from './combat-model.js';
import { v3, sub3, rotate3, copyQ } from '../core/math.js';

const _d = v3(), _l = v3(), _inv = { x: 0, y: 0, z: 0, w: 1 };

/** Armour zone facing an attacker, from the target's body frame. */
export function zoneFacing(target, fromPos) {
  sub3(_d, fromPos, target.pos);
  copyQ(_inv, target.rot); _inv.x = -_inv.x; _inv.y = -_inv.y; _inv.z = -_inv.z;
  rotate3(_l, _d, _inv);
  if (Math.abs(_l.z) >= Math.abs(_l.x)) return _l.z < 0 ? 'fore' : 'aft';
  return _l.x < 0 ? 'port' : 'starboard';
}

/**
 * @param {number} roll 0..1 from the world RNG, picks which system behind the zone is struck
 * @returns {{zone:string, shield:number, armour:number, structure:number, system:string|null, systemLoss:number, penetrated:boolean, destroyed:boolean}}
 */
export function applyHit(target, raw, weaponId, damageType, zone, roll = 0.5) {
  const c = target.combat;
  const P = DAMAGE_PROFILES[damageType] || DAMAGE_PROFILES.balanced;
  const A = WEAPON_ANATOMY[weaponId] || WEAPON_ANATOMY.normal;
  const out = { zone, shield: 0, armour: 0, structure: 0, system: null, systemLoss: 0, penetrated: false, destroyed: false };
  c.shield.since = 0;

  // 1 · Shield. A share bypasses; the rest is soaked until the shield breaks.
  let carry = raw;
  if (c.shield.cur > 0) {
    const bypass = raw * A.shieldBypass;
    const mult = P.shield * A.shield;
    const want = (raw - bypass) * mult;
    const soaked = Math.min(c.shield.cur, want);
    c.shield.cur -= soaked;
    out.shield = soaked;
    carry = bypass + (want - soaked) / mult;
    if (carry <= 0.0001) return out;
  }

  // 2 · Local armour plate on the facing zone; 3 · penetration transmits through damaged plate.
  const plate = target.combat.armour[zone];
  const integrity = plate.max > 0 ? plate.cur / plate.max : 0;
  let transmitted;
  if (plate.cur > 0) {
    const pen = Math.min(1, A.penetration * (0.12 + 0.5 * (1 - integrity)));
    const toPlate = carry * (1 - pen) * P.armor * A.armour;
    const taken = Math.min(plate.cur, toPlate);
    plate.cur -= taken;
    out.armour = taken;
    transmitted = carry * pen + (toPlate - taken) / (P.armor * A.armour);
    out.penetrated = pen > 0.2 || plate.cur <= 0;
  } else {
    transmitted = carry;
    out.penetrated = true;
  }

  // 4 · Structure.
  if (transmitted > 0) {
    const s = transmitted * P.hull * A.structure;
    c.structure.cur = Math.max(0, c.structure.cur - s);
    out.structure = s;
    // 5 · Systems behind the zone take internal blast, emphasised by the weapon's critical rating.
    const sys = ZONE_SYSTEMS[zone][roll < 0.5 ? 0 : 1];
    const loss = Math.min(c.systems[sys], (s * A.internalBlast * A.critical * P.subsystem) / c.structure.max * 1.6);
    c.systems[sys] -= loss;
    out.system = sys;
    out.systemLoss = loss;
  }
  out.destroyed = c.structure.cur <= 0;
  return out;
}

/** Passive recovery each step: shield regenerates after a quiet delay, capacitor recharges. */
export function regenerate(ship, dt) {
  const c = ship.combat;
  c.shield.since += dt;
  if (c.shield.since > c.shield.delay && c.shield.cur < c.shield.max) {
    c.shield.cur = Math.min(c.shield.max, c.shield.cur + c.shield.max * c.shield.regen * (0.4 + 0.6 * c.systems.reactor) * dt);
  }
  c.cap.cur = Math.min(c.cap.max, c.cap.cur + c.cap.regen * (0.4 + 0.6 * c.systems.reactor) * dt);
}
