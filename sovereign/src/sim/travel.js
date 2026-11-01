// Travel. One owner: this module writes the player's jump state and the world's current sector.
//  - Micro-ZJ jump: a short, slightly dangerous local-space jump to a landmark in the same sector.
//    Spool time grows with hull mass; hostiles close by stop it; it costs capacitor.
//  - Gate transit: through a sector gate (the PILLAR, the Ancient Gate) to another sector.
import { SECTORS } from '../world/sectors.js';
import { pushEvent } from './events.js';
import { dist3 } from '../core/math.js';

export const ZJ = { cap: 60, cooldown: 8, blockRange: 1500, arriveGap: 420, minDistance: 1500 };
export const GATE_RANGE = 650;
const GATE_SPOOL = 4;

export const spoolTime = (ship) => 2 + Math.min(6, (ship.hull.baseMass || 100) / 160);

function hostileNear(world, ship, range) {
  return world.entities.some((e) => e.faction === 'hostile' && !e.dead && dist3(e.pos, ship.pos) < range);
}

/** Gate entry the player is close enough to traverse, or null. */
export function nearbyGate(world, ship) {
  for (const [id, g] of Object.entries(world.sector.gates || {})) {
    const lm = world.sector.landmarks[id];
    if (lm && dist3(ship.pos, lm.pos) < GATE_RANGE + lm.radius) return { id, ...g, lm };
  }
  return null;
}

export function gateBlocker(world, gate) {
  if (gate.requires && world.ops[world.sector.id]?.id === gate.requires && world.ops[world.sector.id].stage !== 'complete') {
    return `SEALED · ${world.ops[world.sector.id].name.toUpperCase()} FIRST`;
  }
  return null;
}

export function applyTravelOrders(world, ship, orders) {
  if (!orders) return orders;
  const rest = [];
  const refuse = (reason) => pushEvent(world, { type: 'jumpRefused', reason });
  for (const o of orders) {
    if (o.type !== 'zjJump' && o.type !== 'gateJump' && o.type !== 'cancelJump') { rest.push(o); continue; }
    if (o.type === 'cancelJump') { ship.jump = null; continue; }
    if (ship.docked || ship.dead) { refuse('UNDOCK FIRST'); continue; }
    if (ship.jump) { refuse('ALREADY SPOOLING'); continue; }
    if (hostileNear(world, ship, ZJ.blockRange)) { refuse('HOSTILES TOO CLOSE · DRIVE DISRUPTED'); continue; }
    if (o.type === 'zjJump') {
      const lm = world.sector.landmarks[o.targetId];
      if (!lm) { refuse('NO DESTINATION'); continue; }
      if (dist3(ship.pos, lm.pos) < ZJ.minDistance) { refuse('TOO CLOSE TO JUMP'); continue; }
      if ((world.jumpCooldown || 0) > 0) { refuse(`ZJ DRIVE COOLING · ${Math.ceil(world.jumpCooldown)}s`); continue; }
      if (ship.combat.cap.cur < ZJ.cap) { refuse('CAPACITOR LOW'); continue; }
      ship.combat.cap.cur -= ZJ.cap;
      ship.jump = { kind: 'zj', targetId: o.targetId, t: 0, spool: spoolTime(ship) };
      pushEvent(world, { type: 'jumpSpool', kind: 'zj', name: lm.name, spool: ship.jump.spool });
    } else {
      const gate = nearbyGate(world, ship);
      if (!gate) { refuse('NO GATE IN RANGE'); continue; }
      const why = gateBlocker(world, gate);
      if (why) { refuse(why); continue; }
      ship.jump = { kind: 'gate', to: gate.to, arrive: gate.arrive, t: 0, spool: GATE_SPOOL };
      pushEvent(world, { type: 'jumpSpool', kind: 'gate', name: SECTORS[gate.to].name, spool: GATE_SPOOL });
    }
  }
  return rest;
}

/** Advance a spooling jump; complete it when spooled. */
export function stepTravel(world, ship, dt) {
  world.jumpCooldown = Math.max(0, (world.jumpCooldown || 0) - dt);
  const j = ship?.jump;
  if (!j || ship.dead) return;
  if (hostileNear(world, ship, ZJ.blockRange * 0.6)) { ship.jump = null; pushEvent(world, { type: 'jumpRefused', reason: 'JUMP DISRUPTED BY HOSTILES' }); return; }
  j.t += dt;
  if (j.t < j.spool) return;
  ship.jump = null;
  if (j.kind === 'zj') {
    const lm = world.sector.landmarks[j.targetId];
    const dx = ship.pos.x - lm.pos.x, dy = ship.pos.y - lm.pos.y, dz = ship.pos.z - lm.pos.z;
    const d = Math.hypot(dx, dy, dz) || 1, gap = lm.radius + ZJ.arriveGap;
    place(ship, { x: lm.pos.x + (dx / d) * gap, y: lm.pos.y + (dy / d) * gap, z: lm.pos.z + (dz / d) * gap });
    world.jumpCooldown = ZJ.cooldown;
    pushEvent(world, { type: 'jumped', kind: 'zj', name: lm.name });
  } else {
    changeSector(world, j.to, j.arrive);
  }
}

function place(ship, pos) {
  ship.pos = { ...pos }; ship.prevPos = { ...pos };
  ship.vel = { x: 0, y: 0, z: 0 }; ship.throttle = 0; ship.speed = 0;
  ship.nav = { mode: 'manual', targetId: null, range: 0 };
  ship.lock = { targetId: null, progress: 0 };
}

/** Move the player into another sector beside the arrival landmark; the old sector's ships stay behind. */
export function changeSector(world, to, arriveAt, silent = false) {
  const sector = SECTORS[to];
  if (!sector) return;
  const player = world.entities.find((e) => e.id === world.playerId);
  world.entities = world.entities.filter((e) => e.id === world.playerId);
  world.shots = [];
  world.sector = sector;
  world.op = world.ops[to];
  // A sector's operation restarts its approach if it was mid-fight when we left.
  if (world.op && world.op.stage !== 'complete') { world.op.stage = 'travel'; world.op.wave = -1; world.op.alive = []; }
  if (world.drill) for (const s of world.drill.slots) { s.id = null; s.wait = 0; }
  const lm = sector.landmarks[arriveAt] || sector.landmarks[sector.home];
  if (player && lm) place(player, { x: lm.pos.x - 200, y: lm.pos.y + 60, z: lm.pos.z - lm.radius - 600 });
  if (!silent) pushEvent(world, { type: 'sectorChanged', sector: to, name: sector.name, security: sector.security.label });
}
