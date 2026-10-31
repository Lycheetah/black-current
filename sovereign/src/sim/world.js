// The simulation world. Owns all game state; renderers and UI only read it.

import { createFleetCatalog } from '../data/ships/catalog.js';
import { NARAKA_VEIL } from '../world/naraka.js';
import { createShip, stepShip, setHull } from './ship.js';
import { v3, sub3, len3, scale3, add3, dot3 } from '../core/math.js';

export const FLEET = createFleetCatalog();
const FLEET_CLASSES_PER_RACE = Object.keys(FLEET).filter((id) => FLEET[id].raceId === 'savanah').length;

export const NEUTRAL_COMMAND = Object.freeze({ throttle: 0, throttleSet: null, yaw: 0, pitch: 0, roll: 0, stop: false });

export function createWorld({ hullId = 'savanah_starter' } = {}) {
  const sector = NARAKA_VEIL;
  const st = sector.landmarks.asterion.pos;
  const o = sector.launch.offset;
  const hull = FLEET[hullId];
  if (!hull) throw new Error('Unknown hull ' + hullId);
  const player = createShip({ id: 1, hull, pos: { x: st.x + o.x, y: st.y + o.y, z: st.z + o.z - hull.radius * 4 } });
  // Undock: leave the launch rail already under way.
  player.throttle = 0.3;
  player.vel.z = -player.flight.maxSpeed * 0.3;
  return {
    version: 1,
    tick: 0,
    time: 0,
    sector,
    entities: [player],
    playerId: 1,
  };
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

/**
 * Advance one fixed step.
 * @param {ReturnType<typeof createWorld>} world
 * @param {Record<number, typeof NEUTRAL_COMMAND>} commands per-entity orders
 * @param {number} dt
 */
export function stepWorld(world, commands, dt) {
  world.tick++;
  world.time += dt;
  for (const e of world.entities) {
    if (e.kind === 'ship') {
      stepShip(e, commands[e.id] || NEUTRAL_COMMAND, dt);
      resolveLandmarks(world, e);
    }
  }
}

/** Forge test: swap the player's hull through the 252-hull catalog. */
export function cyclePlayerHull(world, dir, sameRace = true) {
  const p = getPlayer(world);
  const ids = Object.keys(FLEET).filter((id) => !sameRace || FLEET[id].raceId === p.hull.raceId);
  if (!sameRace) dir *= FLEET_CLASSES_PER_RACE;
  const i = ids.indexOf(p.hullId);
  setHull(p, FLEET[ids[(i + dir + ids.length) % ids.length]]);
  return p.hull;
}
