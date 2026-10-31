// The simulation world. Owns all game state; renderers and UI only read it.

import { createFleetCatalog } from '../data/ships/catalog.js';
import { NARAKA_VEIL } from '../world/naraka.js';
import { createShip, stepShip, setHull } from './ship.js';
import { initPlayerCombat, applyOrders, stepShipCombat, stepShots, findEntity } from './combat.js';
import { navCommand } from './pilot.js';
import { stepAI } from './ai.js';
import { createOperation, stepOperation, resetOperation } from './encounter.js';
import { pushEvent, trimEvents } from './events.js';
import { createRng } from '../core/rng.js';
import { editableBlueprintFor } from '../ships/registry.js';
import { applyShipwrightOrders } from './shipwright.js';
import { v3, sub3, len3, scale3, add3, dot3 } from '../core/math.js';

export const FLEET = createFleetCatalog();
const FLEET_CLASSES_PER_RACE = Object.keys(FLEET).filter((id) => FLEET[id].raceId === 'savanah').length;
const RESPAWN_DELAY = 5;

export const NEUTRAL_COMMAND = Object.freeze({ throttle: 0, throttleSet: null, yaw: 0, pitch: 0, roll: 0, stop: false });

function launchPlayer(world, hull, fit, blueprint) {
  const st = world.sector.landmarks.asterion.pos;
  const o = world.sector.launch.offset;
  const player = createShip({ id: world.playerId, hull, pos: { x: st.x + o.x, y: st.y + o.y, z: st.z + o.z - hull.radius * 4 } });
  // Undock: leave the launch rail already under way.
  player.throttle = 0.3;
  player.vel.z = -player.flight.maxSpeed * 0.3;
  player.shotDamage = 30;
  // The player's hull is their own editable copy: the Shipwright moves its nodes.
  player.blueprint = blueprint || editableBlueprintFor(hull);
  initPlayerCombat(player, fit);
  return player;
}

export function createWorld({ hullId = 'savanah_starter', seed = 1 } = {}) {
  const hull = FLEET[hullId];
  if (!hull) throw new Error('Unknown hull ' + hullId);
  const world = {
    version: 1, tick: 0, time: 0, seed,
    sector: NARAKA_VEIL, fleet: FLEET,
    entities: [], shots: [], events: [], eventSeq: 0,
    playerId: 1, nextId: 100,
    rng: createRng(seed),
    salvage: 180,
    op: createOperation('breach_purge'),
    respawnIn: 0,
  };
  world.entities.push(launchPlayer(world, hull));
  return world;
}

export const getPlayer = (world) => world.entities.find((e) => e.id === world.playerId);

const _d = v3();

/** Keep hulls out of solid landmarks: a soft push and a velocity clamp. */
function resolveLandmarks(world, ship) {
  for (const key in world.sector.landmarks) {
    const lm = world.sector.landmarks[key];
    if (!lm.solid) continue;
    sub3(_d, ship.pos, lm.pos);
    const dist = len3(_d) || 1;
    const minD = lm.radius + ship.flight.radius;
    if (dist < minD) {
      scale3(_d, _d, 1 / dist);
      add3(ship.pos, lm.pos, scale3(v3(), _d, minD));
      const vn = dot3(ship.vel, _d);
      if (vn < 0) { ship.vel.x -= _d.x * vn; ship.vel.y -= _d.y * vn; ship.vel.z -= _d.z * vn; }
    }
  }
}

const isManual = (c) => c && (c.throttle || c.yaw || c.pitch || c.roll || c.stop || c.throttleSet != null);

/** Player autopilot: approach/orbit/keep-at-range until the pilot touches the stick. */
function playerNav(world, ship, cmd) {
  if (isManual(cmd) && ship.nav.mode !== 'manual') {
    ship.nav = { mode: 'manual', targetId: null, range: 0 };
    pushEvent(world, { type: 'navManual' });
  }
  if (ship.nav.mode === 'manual') return cmd;
  const t = findEntity(world, ship.nav.targetId);
  const goal = t ? t.pos : world.sector.landmarks[ship.nav.targetId]?.pos;
  if (!goal) { ship.nav.mode = 'manual'; return cmd; }
  const out = navCommand(ship, ship.nav.mode, goal, ship.nav.range, 1);
  if (ship.nav.mode !== 'approach') out.throttleSet = Math.max(out.throttleSet, 0.6);
  return out;
}

/**
 * Advance one fixed step.
 * @param {ReturnType<typeof createWorld>} world
 * @param {Record<number, typeof NEUTRAL_COMMAND & {orders?:object[]}>} commands per-entity orders
 * @param {number} dt
 */
export function stepWorld(world, commands, dt) {
  world.tick++;
  world.time += dt;

  for (const e of world.entities) {
    if (e.dead || e.kind !== 'ship') continue;
    let cmd = commands[e.id] || NEUTRAL_COMMAND;
    if (e.ai) {
      const a = stepAI(world, e, dt);
      cmd = a.cmd;
      applyOrders(world, e, a.orders);
    } else if (e.id === world.playerId) {
      applyOrders(world, e, applyShipwrightOrders(world, e, cmd.orders));
      if (e.docked) { e.prevPos = { ...e.pos }; e.prevRot = { ...e.rot }; continue; }
      cmd = playerNav(world, e, cmd);
    }
    stepShip(e, cmd, dt);
    resolveLandmarks(world, e);
  }
  for (const e of world.entities) if (!e.dead && e.kind === 'ship' && !e.docked) stepShipCombat(world, e, dt);
  stepShots(world, dt);

  // Player loss and recovery at Asterion.
  const player = getPlayer(world);
  if (player?.dead) {
    if (world.respawnIn <= 0) { world.respawnIn = RESPAWN_DELAY; resetOperation(world); }
    else if ((world.respawnIn -= dt) <= 0) {
      world.respawnIn = 0;
      world.entities = world.entities.filter((e) => e.id !== world.playerId);
      world.entities.push(launchPlayer(world, player.hull, player.fit, player.blueprint));
      pushEvent(world, { type: 'recovered' });
    }
  }
  stepOperation(world, dt);
  world.entities = world.entities.filter((e) => !e.dead || e.id === world.playerId);
  trimEvents(world);
}

/** Forge test: swap the player's hull through the 252-hull catalog. */
export function cyclePlayerHull(world, dir, sameRace = true) {
  const p = getPlayer(world);
  const ids = Object.keys(FLEET).filter((id) => !sameRace || FLEET[id].raceId === p.hull.raceId);
  if (!sameRace) dir *= FLEET_CLASSES_PER_RACE;
  const i = ids.indexOf(p.hullId);
  setHull(p, FLEET[ids[(i + dir + ids.length) % ids.length]]);
  p.blueprint = editableBlueprintFor(p.hull);
  initPlayerCombat(p);
  return p.hull;
}
