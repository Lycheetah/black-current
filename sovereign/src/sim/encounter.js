// Authored operation: "Break the Current" (canon contract breach_purge) at the Black Current breach.
// The vertical slice flies the contract's first two waves at half strength (SLICE_SCALE);
// the full four-wave canon contract runs once the player has more than a starter hull.
import { CONTRACTS, CONTRACT_ENEMY_RACES } from '../data/contracts.js';
import { LEGACY_RACE_ALIASES } from '../data/ships/races.js';
import { ENEMY_CLASS_CATALOG, ENEMY_RACE_DOCTRINES, RANGE_SCALE, ENEMY_SPEED_SCALE } from './combat-model.js';
import { enemyCombatState, defaultFit } from './combat-model.js';
import { fitWeapons } from './combat.js';
import { createShip } from './ship.js';
import { pushEvent } from './events.js';
import { dist3 } from '../core/math.js';

export const SLICE_WAVES = 2;
export const SLICE_SCALE = 0.5;
const TRIGGER_RANGE = 3600;

// Enemy class → fleet-catalog hull class used for its silhouette.
const HULL_CLASS = { fighter: 'pod', frigate: 'frigate', destroyer: 'destroyer', cruiser: 'cruiser', battleship: 'battleship', dreadnought: 'dreadnought', titan: 'titan' };
const TURN = { fighter: 1.3, frigate: 0.8, destroyer: 0.5, cruiser: 0.36, battleship: 0.24, dreadnought: 0.16, titan: 0.12 };

export function createOperation(contractId = 'breach_purge') {
  const c = CONTRACTS[contractId];
  const waves = c.waves.slice(0, SLICE_WAVES).map((w) =>
    Object.fromEntries(Object.entries(w).map(([k, n]) => [k, Math.max(1, Math.ceil(n * SLICE_SCALE))])));
  const races = CONTRACT_ENEMY_RACES[contractId].map((r) => LEGACY_RACE_ALIASES[r] || r);
  return { id: c.id, name: c.name, type: c.type, desc: c.desc, reward: c.reward, target: c.target, waves, races, stage: 'travel', wave: -1, alive: [], timer: 0, killed: 0 };
}

function spawnHostile(world, cls, race, index, count) {
  const fleet = world.fleet;
  const hull = fleet[race + '_' + HULL_CLASS[cls]];
  const cfg = ENEMY_CLASS_CATALOG[cls];
  const doc = ENEMY_RACE_DOCTRINES[race];
  const site = world.sector.landmarks[world.op.target].pos;
  const a = (index / count) * Math.PI * 2 + world.rng.next() * 0.4;
  const r = 500 + world.rng.next() * 400;
  const ship = createShip({ id: ++world.nextId, hull, faction: 'hostile', pos: { x: site.x + Math.cos(a) * r, y: site.y + (world.rng.next() - 0.5) * 160, z: site.z + Math.sin(a) * r } });
  const maxSpeed = cfg.speed * ENEMY_SPEED_SCALE * doc.speed;
  ship.flight = { ...ship.flight, maxSpeed, accel: maxSpeed / 2.5, maxTurn: TURN[cls], maxRoll: TURN[cls] * 1.6, angAccel: TURN[cls] * 1.4, radius: Math.max(cfg.radius * 1.6, ship.flight.radius) };
  ship.enemyClass = cls;
  ship.combat = enemyCombatState(cls, doc, world.op.mult ?? 1);
  ship.lock = { targetId: null, progress: 0 };
  ship.shotDamage = cfg.damage * doc.damage * 0.66;
  const weapon = world.rng.next() < 0.7 ? doc.weapon : doc.alt;
  fitWeapons(ship, { WPN_FL: weapon });
  ship.cycleMult = cfg.fireRate / ship.weapons[0].w.cycle;
  ship.groups.fore.auto = true;
  ship.ai = { think: world.rng.next(), spin: world.rng.next() < 0.5 ? -1 : 1, range: cfg.ideal * RANGE_SCALE * doc.range };
  ship.throttle = 0.6;
  world.entities.push(ship);
  return ship;
}

function spawnWave(world) {
  const op = world.op;
  const wave = op.waves[op.wave];
  const list = [];
  for (const [cls, n] of Object.entries(wave)) for (let i = 0; i < n; i++) list.push(cls);
  op.alive = list.map((cls, i) => spawnHostile(world, cls, op.races[i % op.races.length], i, list.length).id);
  pushEvent(world, { type: 'opWave', wave: op.wave + 1, of: op.waves.length, count: list.length });
}

export function stepOperation(world, dt) {
  const op = world.op;
  if (!op) return;
  const player = world.entities.find((e) => e.id === world.playerId && !e.dead);
  op.alive = op.alive.filter((id) => world.entities.some((e) => e.id === id && !e.dead));
  switch (op.stage) {
    case 'travel':
      if (player && dist3(player.pos, world.sector.landmarks[op.target].pos) < TRIGGER_RANGE) {
        op.stage = 'wave'; op.wave = 0; spawnWave(world);
        pushEvent(world, { type: 'opStart', name: op.name });
      }
      break;
    case 'wave':
      if (op.alive.length === 0) {
        if (op.wave + 1 < op.waves.length) { op.stage = 'interval'; op.timer = 4; }
        else {
          op.stage = 'complete';
          world.salvage += op.reward;
          pushEvent(world, { type: 'opComplete', name: op.name, reward: op.reward });
        }
      }
      break;
    case 'interval':
      if ((op.timer -= dt) <= 0) { op.stage = 'wave'; op.wave++; spawnWave(world); }
      break;
  }
}

/** Player lost: hostiles withdraw and the operation resets to its approach. */
export function resetOperation(world) {
  const op = world.op;
  for (const e of world.entities) if (e.faction === 'hostile') e.dead = true;
  op.stage = 'travel'; op.wave = -1; op.alive = [];
}
