// Targeting, weapon groups, turret fire, projectiles and kills.
// One owner: this module writes locks, weapon cooldowns, shots and kill state.
import {
  weaponStats, hitChance, defaultFit, playerCombatState, RANGE_SCALE,
} from './combat-model.js';
import { applyHit, zoneFacing, regenerate } from './damage.js';
import { pushEvent } from './events.js';
import { v3, sub3, len3, dot3, scale3, addScaled3, rotate3, dist3, copy3 } from '../core/math.js';
import { nodeLocal, groupForNode, hullProfile } from '../ships/blueprint.js';

export const GROUPS = ['fore', 'mid', 'aft'];
export const LOCK_RANGE = 4200;

/**
 * Fit weapons to a ship from its blueprint nodes. fit: node bank → turret id.
 * A gun's group comes from where its node sits on the hull, and it fires from that node.
 */
export function fitWeapons(ship, fit) {
  ship.fit = { ...fit };
  const bp = ship.blueprint;
  const P = hullProfile(bp);
  ship.weapons = bp.nodes.filter((n) => fit[n.bank]).map((n) => ({
    bank: n.bank, group: groupForNode(n), w: weaponStats(fit[n.bank]), cooldown: 0, offset: nodeLocal(bp, n, P),
  }));
  ship.groups ??= { fore: { active: false, auto: false }, mid: { active: false, auto: false }, aft: { active: false, auto: false } };
  ship.visualRev = (ship.visualRev || 0) + 1;
}

/** Player combat setup for a fleet hull (pools, capacitor, default fit). Blueprint must already be on the ship. */
export function initPlayerCombat(ship, fit) {
  ship.combat = playerCombatState(ship.hull);
  ship.lock = { targetId: null, progress: 0 };
  ship.nav = { mode: 'manual', targetId: null, range: 0 };
  fitWeapons(ship, fit || defaultFit(ship.hull));
}

export const findEntity = (world, id) => world.entities.find((e) => e.id === id && !e.dead && !e.docked);

const _rel = v3(), _dir = v3(), _perp = v3();

/** Angular velocity of target as seen from ship (rad/s). */
export function angularVelocity(ship, target) {
  sub3(_dir, target.pos, ship.pos);
  const d = len3(_dir) || 1;
  scale3(_dir, _dir, 1 / d);
  sub3(_rel, target.vel, ship.vel);
  const along = dot3(_rel, _dir);
  addScaled3(_perp, _rel, _dir, -along);
  return len3(_perp) / d;
}

function lockTime(ship, target) {
  const sensors = ship.combat.systems.sensors;
  return (0.9 + 18 / Math.max(3, target.flight.radius)) / (0.3 + 0.7 * sensors);
}

/** Apply discrete orders from the pilot or AI. */
export function applyOrders(world, ship, orders) {
  if (!orders) return;
  for (const o of orders) {
    switch (o.type) {
      case 'lock': {
        const t = findEntity(world, o.targetId);
        if (t && t !== ship && dist3(t.pos, ship.pos) <= LOCK_RANGE && ship.lock.targetId !== t.id) {
          ship.lock = { targetId: t.id, progress: 0 };
          pushEvent(world, { type: 'lockStart', shipId: ship.id, targetId: t.id });
        }
        break;
      }
      case 'unlock': ship.lock = { targetId: null, progress: 0 }; break;
      case 'group': {
        const g = ship.groups[o.group];
        if (g) g.active = o.active ?? !g.active;
        break;
      }
      case 'groupAuto': {
        const g = ship.groups[o.group];
        if (g) g.auto = o.auto ?? !g.auto;
        break;
      }
      case 'allGroups': {
        const any = GROUPS.some((k) => ship.groups[k].active && ship.weapons.some((w) => w.group === k));
        for (const k of GROUPS) ship.groups[k].active = o.active ?? !any;
        break;
      }
      case 'nav': ship.nav = { mode: o.mode, targetId: o.targetId ?? null, range: o.range ?? 0 }; break;
    }
  }
}

function nearestHostile(world, ship, maxRange) {
  let best = null, bd = maxRange;
  for (const e of world.entities) {
    if (e.dead || e.docked || e.kind !== 'ship' || e.faction === ship.faction) continue;
    const d = dist3(e.pos, ship.pos);
    if (d < bd) { bd = d; best = e; }
  }
  return best;
}

const _origin = v3(), _off = v3(), _aim = v3();

function fireWeapon(world, ship, wpn, target) {
  const w = wpn.w;
  rotate3(_off, wpn.offset, ship.rot);
  copy3(_origin, ship.pos);
  _origin.x += _off.x; _origin.y += _off.y; _origin.z += _off.z;

  const d = dist3(_origin, target.pos);
  const chance = hitChance(w, d, angularVelocity(ship, target), target.flight.radius);
  const hit = world.rng.next() < chance;
  // Lead the target; a miss is aimed off the hull so the tracer visibly goes wide.
  const t = d / w.speed;
  copy3(_aim, target.pos);
  addScaled3(_aim, _aim, target.vel, t);
  if (!hit) {
    const r = target.flight.radius * world.rng.range(1.6, 3.2);
    _aim.x += world.rng.range(-1, 1) * r; _aim.y += world.rng.range(-1, 1) * r; _aim.z += world.rng.range(-1, 1) * r;
  }
  sub3(_dir, _aim, _origin);
  const travel = len3(_dir);
  scale3(_dir, _dir, w.speed / (travel || 1));
  const raw = ship.combat.damageMult * w.damage * (ship.shotDamage ?? 30) * (0.3 + 0.7 * ship.combat.systems.reactor);
  world.shots.push({
    id: ++world.nextId, ownerId: ship.id, targetId: target.id, weaponId: w.id, damageType: w.damageType,
    color: w.color, size: w.radius, homing: w.homing, speed: w.speed,
    pos: { ..._origin }, prevPos: { ..._origin }, origin: { ..._origin }, vel: { ..._dir },
    age: 0, impactAt: travel / w.speed, ttl: travel / w.speed + 1.5, hit, raw,
  });
  ship.combat.cap.cur -= w.cap;
  pushEvent(world, { type: 'fire', shipId: ship.id, bank: wpn.bank, weaponId: w.id, color: w.color });
}

/** Locks, weapon cycling and fire for one ship. */
export function stepShipCombat(world, ship, dt) {
  regenerate(ship, dt);
  // Lock progress.
  let target = ship.lock.targetId != null ? findEntity(world, ship.lock.targetId) : null;
  if (ship.lock.targetId != null && (!target || dist3(target.pos, ship.pos) > LOCK_RANGE * 1.1)) {
    ship.lock = { targetId: null, progress: 0 };
    target = null;
  }
  if (target && ship.lock.progress < 1) {
    ship.lock.progress = Math.min(1, ship.lock.progress + dt / lockTime(ship, target));
    if (ship.lock.progress >= 1) pushEvent(world, { type: 'locked', shipId: ship.id, targetId: target.id });
  }
  const locked = target && ship.lock.progress >= 1 ? target : null;

  for (const wpn of ship.weapons) {
    wpn.cooldown -= dt;
    const g = ship.groups[wpn.group];
    let tgt = null;
    if (g.auto) tgt = locked || nearestHostile(world, ship, wpn.w.optimal + wpn.w.falloff * 2);
    else if (g.active) tgt = locked;
    wpn.aimId = tgt ? tgt.id : (locked ? locked.id : null);
    if (!tgt || wpn.cooldown > 0) continue;
    if (dist3(tgt.pos, ship.pos) > wpn.w.optimal + wpn.w.falloff * 2.5) continue;
    if (ship.combat.cap.cur < wpn.w.cap) continue;
    const integrity = ship.combat.systems['weapons_' + wpn.group];
    wpn.cooldown = wpn.w.cycle * (ship.cycleMult ?? 1) / (0.3 + 0.7 * integrity);
    fireWeapon(world, ship, wpn, tgt);
  }
}

/** Move projectiles, resolve impacts, emit hit and kill events. */
export function stepShots(world, dt) {
  const keep = [];
  for (const s of world.shots) {
    copy3(s.prevPos, s.pos);
    s.age += dt;
    const target = findEntity(world, s.targetId);
    if (s.homing && target && s.hit) {
      sub3(_dir, target.pos, s.pos);
      const d = len3(_dir) || 1;
      scale3(s.vel, _dir, s.speed / d);
      s.impactAt = s.age + d / s.speed;
    }
    addScaled3(s.pos, s.pos, s.vel, dt);
    if (s.hit && s.age >= s.impactAt) {
      if (target) {
        const zone = zoneFacing(target, s.origin);
        const res = applyHit(target, s.raw, s.weaponId, s.damageType, zone, world.rng.next());
        pushEvent(world, { type: 'hit', shipId: target.id, ownerId: s.ownerId, weaponId: s.weaponId, pos: { ...s.pos }, ...res });
        if (res.destroyed) killShip(world, target, s.ownerId);
      }
      continue;
    }
    if (s.age < s.ttl) keep.push(s);
  }
  world.shots = keep;
}

export function killShip(world, ship, byId) {
  if (ship.dead) return;
  ship.dead = true;
  pushEvent(world, { type: 'destroyed', shipId: ship.id, byId, pos: { ...ship.pos }, radius: ship.flight.radius, hullName: ship.hull.name, faction: ship.faction });
}

export { RANGE_SCALE, nearestHostile };
