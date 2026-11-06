// Authored operation: "Break the Current" (canon contract breach_purge) at the Black Current breach.
// The vertical slice flies the contract's first two waves at half strength (SLICE_SCALE);
// the full four-wave canon contract runs once the player has more than a starter hull.
import { CONTRACTS, CONTRACT_ENEMY_RACES } from '../data/contracts.js';
import { LEGACY_RACE_ALIASES } from '../data/ships/races.js';
import { WORLD } from '../core/scale.js';
import { ENEMY_CLASS_CATALOG, ENEMY_RACE_DOCTRINES, RANGE_SCALE, ENEMY_SPEED_SCALE } from './combat-model.js';
import { enemyCombatState, defaultFit } from './combat-model.js';
import { fitWeapons } from './combat.js';
import { createShip } from './ship.js';
import { pushEvent } from './events.js';
import { dist3 } from '../core/math.js';
import { blueprintFor } from '../ships/registry.js';
import { assignRole } from './roles.js';

export const SLICE_WAVES = 2;
export const SLICE_SCALE = 0.5;
const TRIGGER_RANGE = 3600 * WORLD;

// Enemy class → fleet-catalog hull class used for its silhouette.
const HULL_CLASS = { fighter: 'pod', frigate: 'frigate', destroyer: 'destroyer', cruiser: 'cruiser', battleship: 'battleship', dreadnought: 'dreadnought', titan: 'titan' };
const TURN = { fighter: 1.3, frigate: 0.8, destroyer: 0.5, cruiser: 0.36, battleship: 0.24, dreadnought: 0.16, titan: 0.12 };

export function createOperation(contractId = 'breach_purge', { waves: count = SLICE_WAVES, scale = SLICE_SCALE } = {}) {
  const c = CONTRACTS[contractId];
  const waves = c.waves.slice(0, count).map((w) =>
    Object.fromEntries(Object.entries(w).map(([k, n]) => [k, Math.max(1, Math.ceil(n * scale))])));
  const races = CONTRACT_ENEMY_RACES[contractId].map((r) => LEGACY_RACE_ALIASES[r] || r);
  return { id: c.id, name: c.name, type: c.type, desc: c.desc, reward: c.reward, target: c.target, difficulty: c.difficulty, mult: c.enemyMult ?? 1, waves, races, stage: 'travel', wave: -1, alive: [], timer: 0, killed: 0 };
}

/** A job's encounter: its own waves, races and difficulty, fought at a position in a given sector. */
export function createEncounter({ id, job, name, sector, pos, waves, races, mult = 1, trigger, commander }) {
  return { id, job, name, sector, pos: { ...pos }, waves, races, mult, trigger, commander, stage: 'travel', wave: -1, alive: [], timer: 0 };
}

/** Where an encounter fights: its own position (jobs) or a landmark of the current sector (story ops). */
export const encounterPos = (world, enc) => enc.pos || world.sector.landmarks[enc.target]?.pos;

function spawnHostile(world, enc, cls, race, index, count) {
  const fleet = world.fleet;
  const hull = fleet[race + '_' + HULL_CLASS[cls]];
  const cfg = ENEMY_CLASS_CATALOG[cls];
  const doc = ENEMY_RACE_DOCTRINES[race];
  const site = encounterPos(world, enc);
  const a = (index / count) * Math.PI * 2 + world.rng.next() * 0.4;
  const r = (500 + world.rng.next() * 400) * WORLD;
  const ship = createShip({ id: ++world.nextId, hull, faction: 'hostile', pos: { x: site.x + Math.cos(a) * r, y: site.y + (world.rng.next() - 0.5) * 160 * WORLD, z: site.z + Math.sin(a) * r } });
  const maxSpeed = cfg.speed * ENEMY_SPEED_SCALE * doc.speed;
  ship.flight = { ...ship.flight, maxSpeed, accel: maxSpeed / 2.5, maxTurn: TURN[cls], maxRoll: TURN[cls] * 1.6, angAccel: TURN[cls] * 1.4, sig: cfg.radius * 1.6 };
  ship.enemyClass = cls;
  ship.encounterId = enc.id;
  ship.combat = enemyCombatState(cls, doc, enc.mult ?? 1);
  ship.lock = { targetId: null, progress: 0 };
  ship.shotDamage = cfg.damage * doc.damage * 0.66;
  const weapon = world.rng.next() < 0.7 ? doc.weapon : doc.alt;
  ship.blueprint = blueprintFor(hull);
  fitWeapons(ship, { [ship.blueprint.nodes[0].bank]: weapon });
  ship.cycleMult = cfg.fireRate / ship.weapons[0].w.cycle;
  ship.groups.fore.auto = true;
  ship.ai = { think: world.rng.next(), spin: world.rng.next() < 0.5 ? -1 : 1, range: cfg.ideal * RANGE_SCALE * doc.range };
  ship.throttle = 0.6;
  world.entities.push(ship);
  assignRole(world, ship, enc, enc.commander && enc.wave === 0 && index === 0 ? 'command' : undefined);
  return ship;
}

function spawnWave(world, enc) {
  const wave = enc.waves[enc.wave];
  const list = [];
  for (const [cls, n] of Object.entries(wave)) for (let i = 0; i < n; i++) list.push(cls);
  enc.alive = list.map((cls, i) => spawnHostile(world, enc, cls, enc.races[i % enc.races.length], i, list.length).id);
  // A bounty's first ship is its commander: tougher, named.
  if (enc.commander && enc.wave === 0) {
    const boss = world.entities.find((e) => e.id === enc.alive[0]);
    if (boss) {
      boss.commander = enc.commander;
      for (const k of ['shield', 'structure']) { boss.combat[k].max = Math.round(boss.combat[k].max * 2.2); boss.combat[k].cur = boss.combat[k].max; }
      for (const z of Object.values(boss.combat.armour)) { z.max = Math.round(z.max * 2.2); z.cur = z.max; }
    }
  }
  pushEvent(world, { type: 'opWave', wave: enc.wave + 1, of: enc.waves.length, count: list.length, name: enc.name, enc: enc.id });
}

/**
 * Advance one encounter: it wakes when the player comes within range of its site, flies its waves, and
 * completes when the last one dies. Story operations pay their reward here; jobs pay through jobs.js.
 */
export function stepEncounter(world, enc, dt) {
  if (!enc || enc.stage === 'complete') return;
  if (enc.sector && enc.sector !== world.sector.id) return;
  const player = world.entities.find((e) => e.id === world.playerId && !e.dead);
  enc.alive = enc.alive.filter((id) => world.entities.some((e) => e.id === id && !e.dead));
  const site = encounterPos(world, enc);
  if (!site) return;
  switch (enc.stage) {
    case 'travel':
      if (player && !player.docked && dist3(player.pos, site) < (enc.trigger || TRIGGER_RANGE)) {
        enc.stage = 'wave'; enc.wave = 0; spawnWave(world, enc);
        pushEvent(world, { type: 'opStart', name: enc.name, enc: enc.id });
      }
      break;
    case 'wave':
      if (enc.alive.length === 0) {
        if (enc.wave + 1 < enc.waves.length) { enc.stage = 'interval'; enc.timer = 4; }
        else {
          enc.stage = 'complete';
          if (!enc.job && !enc.anomaly) {
            world.salvage += enc.reward;
            pushEvent(world, { type: 'opComplete', name: enc.name, reward: enc.reward });
          } else pushEvent(world, { type: 'encounterCleared', enc: enc.id, job: enc.job });
        }
      }
      break;
    case 'interval':
      if ((enc.timer -= dt) <= 0) { enc.stage = 'wave'; enc.wave++; spawnWave(world, enc); }
      break;
  }
}

/** The story operation of the current sector. */
export const stepOperation = (world, dt) => stepEncounter(world, world.op, dt);

/** Player lost: hostiles withdraw and every unfinished encounter here resets to its approach. */
export function resetOperation(world, others = []) {
  for (const e of world.entities) if (e.faction === 'hostile') e.dead = true;  // drill drones stay
  for (const enc of [world.op, ...others]) {
    if (!enc || enc.stage === 'complete') continue;
    enc.stage = 'travel'; enc.wave = -1; enc.alive = [];
  }
}
