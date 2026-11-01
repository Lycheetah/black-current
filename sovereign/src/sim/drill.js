// Asterion drill range: practice drones drifting near the station from the moment you launch.
// They carry no weapons, respawn after being destroyed, and pay a little salvage: guns have something
// to shoot without flying to the breach.
import { createShip } from './ship.js';
import { enemyCombatState, ENEMY_RACE_DOCTRINES } from './combat-model.js';
import { fitWeapons } from './combat.js';
import { blueprintFor } from '../ships/registry.js';
import { pushEvent } from './events.js';

const DRONES = 3, RESPAWN = 8, REWARD = 2;

export function createDrill() {
  return { slots: Array.from({ length: DRONES }, (_, i) => ({ i, id: null, wait: 1 + i })) };
}

function spawn(world, slot) {
  const st = world.sector.landmarks.asterion.pos;
  const a = -1.1 + slot.i * 0.55;
  const anchor = { x: st.x - 300 + Math.sin(a) * 1500, y: st.y - 80 + slot.i * 70, z: st.z - 1500 + Math.cos(a) * 400 };
  const hull = world.fleet.ai_pod;
  const ship = createShip({ id: ++world.nextId, hull, faction: 'drill', pos: { ...anchor } });
  ship.flight = { ...ship.flight, maxSpeed: 55, accel: 25, maxTurn: 0.9, maxRoll: 1.4, angAccel: 1.2, radius: 9 };
  ship.enemyClass = 'drill drone';
  ship.combat = enemyCombatState('fighter', ENEMY_RACE_DOCTRINES.ai, 1.8);
  ship.lock = { targetId: null, progress: 0 };
  ship.blueprint = blueprintFor(hull);
  fitWeapons(ship, {});
  ship.ai = { drill: true, anchor, think: 0, spin: slot.i % 2 ? 1 : -1, range: 220 };
  ship.throttle = 0.5;
  world.entities.push(ship);
  slot.id = ship.id;
}

export function stepDrill(world, dt) {
  const d = world.drill;
  if (!d) return;
  for (const slot of d.slots) {
    if (slot.id != null && !world.entities.some((e) => e.id === slot.id && !e.dead)) {
      slot.id = null;
      slot.wait = RESPAWN;
      world.salvage += REWARD;
      pushEvent(world, { type: 'drillKill', reward: REWARD });
    }
    if (slot.id == null && (slot.wait -= dt) <= 0) spawn(world, slot);
  }
}
