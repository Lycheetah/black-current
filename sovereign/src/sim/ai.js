// Hostile pilots: pick the player, lock, then orbit at doctrine range with weapons on auto.
// Writes only the AI's own memory (ship.ai) and returns orders; flight/combat stay with their owners.
import { navCommand } from './pilot.js';
import { findEntity } from './combat.js';

export function stepAI(world, ship, dt) {
  const ai = ship.ai;
  ai.think -= dt;
  const player = findEntity(world, world.playerId);
  const orders = [];
  if (ai.think <= 0) {
    ai.think = 0.5 + world.rng.next() * 0.5;
    if (player && ship.lock.targetId !== player.id) orders.push({ type: 'lock', targetId: player.id });
    // Doctrine variety: occasionally switch orbit direction.
    if (world.rng.next() < 0.04) ai.spin = -ai.spin;
  }
  if (!player) return { cmd: { throttle: 0, throttleSet: 0.2, yaw: 0, pitch: 0, roll: 0, stop: false }, orders };
  return { cmd: navCommand(ship, 'orbit', player.pos, ai.range, ai.spin), orders };
}
