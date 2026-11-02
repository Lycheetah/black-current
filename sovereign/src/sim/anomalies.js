// Pirate anomalies: dens of hostiles that appear near asteroid belts, pay out when cleared, and come
// back elsewhere after a while. Lower security means more of them, and harder ones.
// One owner: this module writes world.anomalies.
import { CONTRACT_ENEMY_RACES } from '../data/contracts.js';
import { LEGACY_RACE_ALIASES } from '../data/ships/races.js';
import { createEncounter, stepEncounter } from './encounter.js';
import { pushEvent } from './events.js';

const RESPAWN = 300;
const NAMES = ['Pirate Den', 'Raider Outpost', 'Smuggler Nest', 'Current Cult Cell', 'Scavenger Roost', 'Blackwake Hideout'];
// Waves by danger (0 safe … 2 lawless).
const WAVES = [
  [{ fighter: 3 }, { fighter: 2, frigate: 1 }],
  [{ frigate: 2, fighter: 2 }, { frigate: 2, destroyer: 1 }],
  [{ frigate: 3, destroyer: 1 }, { destroyer: 2, cruiser: 1 }],
];
const REWARD = [90, 200, 420];

export const createAnomalies = () => ({ list: [], seq: 0, timers: {} });

/** How many dens a sector holds at once, and how dangerous they are, from its security. */
function profile(sector) {
  const sec = sector.security?.level ?? 0.5;
  return sec >= 0.7 ? { count: 1, danger: 0 } : sec >= 0.3 ? { count: 2, danger: 1 } : { count: 3, danger: 2 };
}

function spawn(world, sector) {
  if (!sector.belts.length) return;
  const { danger } = profile(sector);
  const belt = sector.belts[Math.floor(world.rng.next() * sector.belts.length)];
  const a = world.rng.next() * Math.PI * 2, r = belt.spread * 0.5 + 3000 + world.rng.next() * 4000;
  const pos = { x: Math.round(belt.center.x + Math.cos(a) * r), y: Math.round(belt.center.y + (world.rng.next() - 0.5) * 2000), z: Math.round(belt.center.z + Math.sin(a) * r) };
  const id = 'A' + (++world.anomalies.seq);
  const name = NAMES[Math.floor(world.rng.next() * NAMES.length)];
  const races = (CONTRACT_ENEMY_RACES[sector.operation] || CONTRACT_ENEMY_RACES.breach_purge).map((x) => LEGACY_RACE_ALIASES[x] || x);
  const enc = createEncounter({ id, name, sector: sector.id, pos, waves: WAVES[danger].map((w) => ({ ...w })), races, mult: 0.6 + danger * 0.3, trigger: 7000 });
  enc.anomaly = true;
  world.anomalies.list.push({ id, name, sector: sector.id, pos, enc, reward: Math.round(REWARD[danger] * (sector.id === 'erebos' ? 1.3 : 1)) });
}

/** Keep each visited sector stocked with dens; pay and retire cleared ones. */
export function stepAnomalies(world, dt) {
  const S = world.sector;
  const { count } = profile(S);
  const here = world.anomalies.list.filter((a) => a.sector === S.id);
  const t = world.anomalies.timers;
  if (here.length < count) {
    t[S.id] = (t[S.id] ?? 0) - dt;
    if (t[S.id] <= 0) { spawn(world, S); t[S.id] = here.length + 1 < count ? 0 : RESPAWN; }
  }
  for (const a of here) {
    stepEncounter(world, a.enc, dt);
    if (a.enc.stage === 'complete') {
      world.salvage += a.reward;
      world.anomalies.list = world.anomalies.list.filter((x) => x !== a);
      t[S.id] = RESPAWN;
      pushEvent(world, { type: 'anomalyCleared', name: a.name, reward: a.reward });
    }
  }
}

/** Anomaly encounters (for resets on player loss and gate travel). */
export const anomalyEncounters = (world) => world.anomalies.list.map((a) => a.enc);
