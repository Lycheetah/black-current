// Jobs: the repeatable loop. Every station has a board of offers; the pilot takes up to MAX_ACTIVE,
// flies out, does them, and comes home richer with more standing, which opens harder, better-paid tiers.
// One owner: this module writes world.jobs (boards, active jobs, standing) and pays job rewards.
//
// Job types:
//   purge     clear hostile waves at a site                                 → paid when the site is clear
//   bounty    kill a named commander and his escort                         → paid when he dies
//   recovery  clear a guarded wreck, loot its black box [V], dock at home   → paid on docking
//   courier   carry sealed cargo to the other sector's station              → paid on docking there
import { CONTRACT_ENEMY_RACES } from '../data/contracts.js';
import { LEGACY_RACE_ALIASES } from '../data/ships/races.js';
import { SECTORS } from '../world/sectors.js';
import { WORLD } from '../core/scale.js';
import { createEncounter, stepEncounter } from './encounter.js';
import { spawnWreck } from './loss.js';
import { pushEvent } from './events.js';
import { dist3 } from '../core/math.js';

export const MAX_ACTIVE = 3;
const BOARD_SIZE = 6;
export const TIER_NAMES = ['I', 'II', 'III', 'IV'];
/** Standing needed for each tier (tier I is open to everyone). */
export const TIER_STANDING = [0, 3, 8, 15];

const WAVES = {
  purge: [
    [{ fighter: 3, frigate: 1 }, { frigate: 2 }],
    [{ frigate: 3 }, { frigate: 2, destroyer: 1 }, { destroyer: 2 }],
    [{ frigate: 3, destroyer: 2 }, { destroyer: 2, cruiser: 1 }, { cruiser: 2 }],
    [{ destroyer: 3, cruiser: 2 }, { cruiser: 2, battleship: 1 }, { battleship: 2 }],
  ],
  // The first ship of the first wave is the commander.
  bounty: [
    [{ frigate: 1, fighter: 3 }],
    [{ destroyer: 1, frigate: 2 }],
    [{ cruiser: 1, destroyer: 2 }],
    [{ battleship: 1, cruiser: 2 }],
  ],
  recovery: [
    [{ fighter: 4 }],
    [{ frigate: 3 }],
    [{ frigate: 2, destroyer: 2 }],
    [{ destroyer: 3, cruiser: 1 }],
  ],
};
const REWARD = {
  purge: [140, 300, 600, 1050], bounty: [180, 380, 760, 1300], recovery: [120, 260, 520, 900], courier: [90, 180, 340, 600],
};
const RESEARCH = [4, 8, 14, 22];
const STANDING = [1, 1.5, 2, 3];
const MULT = [0.55, 0.8, 1.05, 1.3];

const TYPE_INFO = {
  purge: { name: 'Purge', icon: '⚔', verb: 'Clear the hostiles at' },
  bounty: { name: 'Bounty', icon: '☠', verb: 'Hunt the commander last seen near' },
  recovery: { name: 'Recovery', icon: '◈', verb: 'Recover the black box from the wreck at' },
  courier: { name: 'Courier', icon: '✉', verb: 'Carry sealed cargo to' },
};
export const jobTypeInfo = (t) => TYPE_INFO[t];

const POCKET_WORDS = [['Silent', 'Ash', 'Hollow', 'Broken', 'Drowned', 'Cinder', 'Pale', 'Iron', 'Shattered', 'Quiet'], ['Relay', 'Drift', 'Reach', 'Spire', 'Graveyard', 'Anchorage', 'Rift', 'Cradle', 'Wake', 'Crossing']];
const COMMANDERS = ['Kor Vex', 'Sable Anath', 'Ruun the Pale', 'Iselde Marrow', 'Thane Okkar', 'Veyra Ash', 'Moloch-9', 'Hesk Dunmore'];

/** Fresh jobs state. */
export const createJobs = () => ({ boards: {}, active: [], standing: {}, seq: 0, done: 0 });

/** The station whose board this is: each sector's home station. */
const stationOf = (sectorId) => SECTORS[sectorId].home;
export const standingAt = (world, sectorId) => world.jobs.standing[sectorId] || 0;
export const tierOpen = (world, sectorId, tier) => standingAt(world, sectorId) >= TIER_STANDING[tier];

/** Is the gate between the two sectors open (couriers need it)? */
function routeOpen(world) {
  const n = SECTORS.naraka;
  return Object.values(n.gates || {}).every((g) => !g.requires || world.ops.naraka?.stage === 'complete');
}

/** A site for a job: a landmark (not a station or gate), or a generated pocket of space. */
function pickSite(world, sectorId) {
  const S = SECTORS[sectorId];
  const home = S.landmarks[S.home].pos;
  const places = Object.values(S.landmarks).filter((l) => !['station', 'gate'].includes(l.kind));
  if (places.length && world.rng.next() < 0.45) {
    const l = places[Math.floor(world.rng.next() * places.length)];
    const a = world.rng.next() * Math.PI * 2, r = (l.radius || 0) + 2500 + world.rng.next() * 3000;
    return { name: l.name + ' outskirts', pos: { x: Math.round(l.pos.x + Math.cos(a) * r), y: Math.round(l.pos.y + (world.rng.next() - 0.5) * 2000), z: Math.round(l.pos.z + Math.sin(a) * r) } };
  }
  const a = world.rng.next() * Math.PI * 2, r = 18000 + world.rng.next() * 26000;
  const w = POCKET_WORDS;
  const name = `${w[0][Math.floor(world.rng.next() * w[0].length)]} ${w[1][Math.floor(world.rng.next() * w[1].length)]}`;
  return { name, pos: { x: Math.round(home.x + Math.cos(a) * r), y: Math.round(home.y + (world.rng.next() - 0.5) * 6000), z: Math.round(home.z + Math.sin(a) * r) } };
}

function racesFor(sectorId) {
  const op = SECTORS[sectorId].operation;
  return (CONTRACT_ENEMY_RACES[op] || CONTRACT_ENEMY_RACES.breach_purge).map((r) => LEGACY_RACE_ALIASES[r] || r);
}

/** Make one offer for a board, at a tier the pilot can see (open tiers plus the next locked one). */
function makeOffer(world, sectorId) {
  const top = Math.min(3, TIER_STANDING.filter((s) => standingAt(world, sectorId) >= s).length);
  const tier = Math.min(top, Math.floor(world.rng.next() * (top + 1)));
  const types = ['purge', 'purge', 'bounty', 'recovery', ...(routeOpen(world) ? ['courier'] : [])];
  const type = types[Math.floor(world.rng.next() * types.length)];
  const hard = sectorId === 'erebos' ? 1.3 : 1;
  const id = 'J' + (++world.jobs.seq);
  const offer = { id, type, tier, sector: sectorId, station: stationOf(sectorId),
    reward: { salvage: Math.round(REWARD[type][tier] * hard), research: RESEARCH[tier], standing: STANDING[tier] } };
  if (type === 'courier') {
    const dest = Object.keys(SECTORS).find((s) => s !== sectorId);
    offer.dest = dest;
    offer.title = `Sealed cargo for ${SECTORS[dest].stationName || SECTORS[dest].name}`;
    offer.desc = `${TYPE_INFO.courier.verb} ${SECTORS[dest].stationName || dest} in ${SECTORS[dest].name}. Dock there to deliver.`;
    offer.site = { name: SECTORS[dest].stationName, sector: dest, landmark: SECTORS[dest].home };
    return offer;
  }
  const site = pickSite(world, sectorId);
  offer.site = { ...site, sector: sectorId };
  offer.waves = WAVES[type][tier].map((w) => ({ ...w }));
  offer.mult = MULT[tier] * hard;
  if (type === 'bounty') offer.commander = COMMANDERS[Math.floor(world.rng.next() * COMMANDERS.length)];
  offer.title = type === 'bounty' ? `Bounty: ${offer.commander}` : type === 'purge' ? `Purge ${site.name}` : `Black box at ${site.name}`;
  offer.desc = `${TYPE_INFO[type].verb} ${site.name}.` + (type === 'recovery' ? ' Loot the black box [V], then dock here to hand it in.' : '');
  return offer;
}

/** The board at a sector's station, topped up to BOARD_SIZE offers. */
export function boardFor(world, sectorId) {
  const b = (world.jobs.boards[sectorId] ||= []);
  while (b.length < BOARD_SIZE) b.push(makeOffer(world, sectorId));
  return b;
}

/** Where a job sends the pilot now: its site, or home with the black box, or the courier's station. */
export function jobTarget(world, job) {
  if (job.type === 'courier') return { sector: job.dest, pos: SECTORS[job.dest].landmarks[SECTORS[job.dest].home].pos, name: job.site.name };
  if (job.type === 'recovery' && job.hasBox) return { sector: job.sector, pos: SECTORS[job.sector].landmarks[SECTORS[job.sector].home].pos, name: SECTORS[job.sector].stationName };
  return { sector: job.site.sector, pos: job.site.pos, name: job.site.name };
}

/** One line for the tracker. */
export function jobStatus(world, job) {
  if (job.type === 'courier') return `Deliver to ${job.site.name}`;
  if (job.type === 'recovery' && job.hasBox) return `Black box aboard · dock at ${SECTORS[job.sector].stationName}`;
  if (job.type === 'recovery' && job.enc?.stage === 'complete') return 'Wreck clear · loot the black box [V]';
  const e = job.enc;
  if (!e || e.stage === 'travel') return `Fly to ${job.site.name}`;
  if (e.stage === 'wave') return `Wave ${e.wave + 1} / ${e.waves.length} · ${e.alive.length} hostile${e.alive.length === 1 ? '' : 's'}`;
  if (e.stage === 'interval') return `Wave ${e.wave + 2} / ${e.waves.length} inbound…`;
  return 'Done';
}

function pay(world, job) {
  world.salvage += job.reward.salvage;
  world.research += job.reward.research;
  world.jobs.standing[job.sector] = Math.round((standingAt(world, job.sector) + job.reward.standing) * 10) / 10;
  world.jobs.done++;
  world.jobs.active = world.jobs.active.filter((j) => j.id !== job.id);
  pushEvent(world, { type: 'jobComplete', id: job.id, title: job.title, reward: job.reward, standing: world.jobs.standing[job.sector] });
}

/** Orders: accept or abandon jobs. */
export function applyJobOrders(world, ship, orders) {
  if (!orders) return orders;
  const rest = [];
  for (const o of orders) {
    if (o.type === 'acceptJob') {
      const board = boardFor(world, world.sector.id);
      const i = board.findIndex((j) => j.id === o.id);
      const refuse = (reason) => pushEvent(world, { type: 'jobRefused', reason });
      if (!ship.docked) { refuse('DOCK TO TAKE JOBS'); continue; }
      if (i < 0) { refuse('THAT JOB IS GONE'); continue; }
      const job = board[i];
      if (!tierOpen(world, job.sector, job.tier)) { refuse(`TIER ${TIER_NAMES[job.tier]} NEEDS STANDING ${TIER_STANDING[job.tier]}`); continue; }
      if (world.jobs.active.length >= MAX_ACTIVE) { refuse(`${MAX_ACTIVE} JOBS AT ONCE`); continue; }
      board.splice(i, 1);
      if (job.waves) job.enc = createEncounter({ id: job.id, job: job.id, name: job.title, sector: job.site.sector, pos: job.site.pos, waves: job.waves, races: racesFor(job.sector), mult: job.mult, commander: job.commander, trigger: 8000 });
      world.jobs.active.push(job);
      pushEvent(world, { type: 'jobAccepted', id: job.id, title: job.title });
    } else if (o.type === 'abandonJob') {
      const job = world.jobs.active.find((j) => j.id === o.id);
      if (!job) continue;
      for (const e of world.entities) if (e.encounterId === job.id) e.dead = true;
      world.jobs.active = world.jobs.active.filter((j) => j.id !== job.id);
      world.jobs.standing[job.sector] = Math.max(0, Math.round((standingAt(world, job.sector) - 1) * 10) / 10);
      pushEvent(world, { type: 'jobAbandoned', title: job.title });
    } else rest.push(o);
  }
  return rest;
}

/** Run active jobs: their encounters, black boxes, and deliveries on docking. */
export function stepJobs(world, player, dt) {
  for (const job of [...world.jobs.active]) {
    if (job.enc) stepEncounter(world, job.enc, dt);
    const cleared = job.enc?.stage === 'complete';
    if (cleared && (job.type === 'purge' || job.type === 'bounty')) { pay(world, job); continue; }
    if (job.type === 'recovery' && cleared && !job.boxDropped && world.sector.id === job.sector) {
      // The black box drifts in the wreck of the guard's last ship.
      job.boxDropped = true;
      const w = spawnWreck(world, { id: -1, hullId: null, hull: { name: 'Black box wreck' }, flight: { radius: 40 }, pos: job.site.pos, vel: { x: 0, y: 0, z: 0 } }, { salvage: 0, materials: {}, blackBox: job.id });
      job.wreckId = w.id;
    }
    if (job.type === 'recovery' && job.boxDropped && !job.hasBox && !world.wrecks.some((w) => w.id === job.wreckId && !w.looted)) {
      job.hasBox = true;
      pushEvent(world, { type: 'jobProgress', title: job.title, text: `BLACK BOX ABOARD · DOCK AT ${SECTORS[job.sector].stationName}` });
    }
    if (player?.docked && world.sector.id === (job.type === 'courier' ? job.dest : job.sector)) {
      if (job.type === 'courier' || (job.type === 'recovery' && job.hasBox)) pay(world, job);
    }
  }
}

/** Active job encounters in play (for the player-loss reset). */
export const jobEncounters = (world) => world.jobs.active.map((j) => j.enc).filter(Boolean);

/** A navigation point for 'job:<id>' targets (approach and ZJ jumps), in the current sector only. */
export function jobPoint(world, id) {
  if (typeof id !== 'string' || !id.startsWith('job:')) return null;
  const job = world.jobs.active.find((j) => j.id === id.slice(4));
  if (!job) return null;
  const t = jobTarget(world, job);
  return t.sector === world.sector.id ? { name: t.name, pos: t.pos, radius: 600 } : null;
}

/** Distance from the player to a job's current target (null in another sector). */
export function jobDistance(world, player, job) {
  const t = jobTarget(world, job);
  return t.sector === world.sector.id && player ? dist3(player.pos, t.pos) : null;
}
