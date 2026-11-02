// The simulation world. Owns all game state; renderers and UI only read it.

import { createFleetCatalog } from '../data/ships/catalog.js';
import { SECTORS } from '../world/sectors.js';
import { applyTravelOrders, stepTravel, changeSector } from './travel.js';
import { createShip, stepShip, setHull } from './ship.js';
import { initPlayerCombat, applyOrders, stepShipCombat, stepShots, findEntity } from './combat.js';
import { navCommand } from './pilot.js';
import { stepAI } from './ai.js';
import { createOperation, stepOperation, resetOperation } from './encounter.js';
import { pushEvent, trimEvents } from './events.js';
import { createRng } from '../core/rng.js';
import { editableBlueprintFor } from '../ships/registry.js';
import { applyShipwrightOrders } from './shipwright.js';
import { createAtlas, applyScannerOrders, stepScanner } from './scanner.js';
import { createDrill, stepDrill } from './drill.js';
import { applyResearchOrders, STARTING_RESEARCH } from './research.js';
import { applyEconomyOrders, createMarket, stepMarket } from './economy.js';
import { applyLossOrders, stepLoss, losePlayerHull, recoveryShip } from './loss.js';
import { createInduction, stepInduction } from './induction.js';
import { applyFittingOrders, stepFitting } from './fitting.js';
import { createJobs, applyJobOrders, stepJobs, jobEncounters, jobPoint } from './jobs.js';
import { v3, sub3, len3, scale3, add3, dot3 } from '../core/math.js';
import { hullLength } from '../ships/blueprint.js';

export const FLEET = createFleetCatalog();
const RESPAWN_DELAY = 5;

export const NEUTRAL_COMMAND = Object.freeze({ throttle: 0, throttleSet: null, yaw: 0, pitch: 0, roll: 0, stop: false });

function launchPlayer(world, hull, fit, blueprint, modules) {
  const st = world.sector.landmarks[world.sector.home].pos;
  const o = world.sector.launch.offset;
  const player = createShip({ id: world.playerId, hull, pos: { x: st.x + o.x, y: st.y + o.y, z: st.z + o.z - hullLength(hull) * 1.5 } });
  // Undock: leave the launch rail already under way.
  player.throttle = 0.3;
  player.vel.z = -player.flight.maxSpeed * 0.3;
  player.shotDamage = 30;
  // The player's hull is their own editable copy: the Shipwright moves its nodes.
  player.blueprint = blueprint || editableBlueprintFor(hull);
  player.uid = 'S0';
  initPlayerCombat(player, fit, modules);
  return player;
}

export function createWorld({ hullId = 'savanah_starter', seed = 1 } = {}) {
  const hull = FLEET[hullId];
  if (!hull) throw new Error('Unknown hull ' + hullId);
  const world = {
    version: 1, tick: 0, time: 0, seed,
    sector: SECTORS.naraka, fleet: FLEET,
    entities: [], shots: [], events: [], eventSeq: 0,
    playerId: 1, nextId: 100,
    rng: createRng(seed),
    salvage: 180,
    ops: {
      naraka: createOperation('breach_purge'),
      // Erebos is harder: its contract flies all three canon waves at 60% strength.
      erebos: createOperation('mirror_extraction', { waves: 3, scale: 0.6 }),
    },
    respawnIn: 0,
    research: 0,
    materials: {},
    pilot: { name: 'Pilot', civ: hull.raceId },
    researched: [...STARTING_RESEARCH],
    hangar: [],
    market: createMarket(),
    wrecks: [],
    cover: [],
    induction: createInduction(),
    fits: [],
    jobs: createJobs(),
  };
  world.op = world.ops.naraka;
  world.atlas = createAtlas(world.rng);
  world.drill = createDrill();
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
  const sigId = typeof ship.nav.targetId === 'string' && ship.nav.targetId.startsWith('sig:') ? ship.nav.targetId.slice(4) : null;
  const sig = sigId ? world.atlas.sigs[sigId] : null;
  const wreck = typeof ship.nav.targetId === 'string' && ship.nav.targetId.startsWith('w') ? world.wrecks.find((w) => w.id === ship.nav.targetId) : null;
  const goal = t ? t.pos : sig ? (sig.stage === 'detected' ? sig.center : sig.pos) : wreck ? wreck.pos : ship.nav.targetId === 'sun' ? world.sector.blackSun.pos : jobPoint(world, ship.nav.targetId)?.pos ?? world.sector.landmarks[ship.nav.targetId]?.pos;
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
      applyOrders(world, e, applyJobOrders(world, e, applyFittingOrders(world, e, applyLossOrders(world, e, applyTravelOrders(world, e, applyEconomyOrders(world, e, applyResearchOrders(world, e, applyScannerOrders(world, e, applyShipwrightOrders(world, e, cmd.orders)))))))));
      if (e.docked) { e.prevPos = { ...e.pos }; e.prevRot = { ...e.rot }; continue; }
      cmd = playerNav(world, e, cmd);
      // Spooling a jump: the drive holds the ship still.
      if (e.jump) cmd = { ...cmd, throttleSet: 0, throttle: 0 };
    }
    stepShip(e, cmd, dt);
    resolveLandmarks(world, e);
  }
  for (const e of world.entities) if (!e.dead && e.kind === 'ship' && !e.docked) stepShipCombat(world, e, dt);
  stepShots(world, dt);

  // Player loss: the hull is gone (loss.js); the pilot recovers at the sector's station.
  const player = getPlayer(world);
  if (player?.dead) {
    if (world.respawnIn <= 0) { world.respawnIn = RESPAWN_DELAY; resetOperation(world, jobEncounters(world)); losePlayerHull(world, player); }
    else if ((world.respawnIn -= dt) <= 0) {
      world.respawnIn = 0;
      world.entities = world.entities.filter((e) => e.id !== world.playerId);
      const r = recoveryShip(world);
      const next = launchPlayer(world, r.hull, r.fit, r.blueprint, r.modules);
      next.uid = r.uid;
      world.entities.push(next);
      pushEvent(world, { type: 'recovered', name: r.hull.name, fromHangar: r.fromHangar });
    }
  }
  stepOperation(world, dt);
  stepJobs(world, getPlayer(world), dt);
  stepTravel(world, getPlayer(world), dt);
  if (world.sector.drill) stepDrill(world, dt);
  stepMarket(world, dt);
  stepLoss(world, dt);
  stepFitting(world, getPlayer(world), dt);
  stepInduction(world, getPlayer(world));
  stepScanner(world, getPlayer(world), dt);
  world.entities = world.entities.filter((e) => !e.dead || e.id === world.playerId);
  trimEvents(world);
}

/** A new pilot: name and civilisation of origin, flying that civilisation's starter hull. */
export function startPilot(world, { name, civ }) {
  const hull = FLEET[civ + '_starter'] || FLEET.savanah_starter;
  world.pilot = { name: (name || 'Pilot').slice(0, 24), civ: hull.raceId };
  world.induction = createInduction();
  const p = getPlayer(world);
  setHull(p, hull);
  p.blueprint = editableBlueprintFor(hull);
  initPlayerCombat(p);
  return hull;
}

/** Classes kept out of the ship picker until they have authored hero models: generated capitals
 * (3 to 21 km) look wrong and cannot fit near a station. */
export const PICKER_HIDDEN = new Set(['pod', 'dreadnought', 'carrier', 'titan']);

/** After a hull swap, move the ship clear of solid landmarks so a bigger hull is never stuck inside one. */
function clearOfLandmarks(world, ship) {
  for (const lm of Object.values(world.sector.landmarks)) {
    if (!lm.solid) continue;
    sub3(_d, ship.pos, lm.pos);
    const d = len3(_d) || 1;
    const need = lm.radius + ship.flight.radius * 1.2 + 200;
    if (d < need) {
      scale3(_d, _d, need / d);
      add3(ship.pos, lm.pos, _d);
      ship.prevPos = { ...ship.pos };
    }
  }
}

/** Board a specific hull on the spot (the ship picker on the HUD). */
export function setPlayerHull(world, hullId) {
  const h = FLEET[hullId];
  const p = getPlayer(world);
  if (!h || !p || p.dead) return null;
  setHull(p, h);
  p.blueprint = editableBlueprintFor(h);
  initPlayerCombat(p);
  clearOfLandmarks(world, p);
  return h;
}

/** Forge test: swap the player's hull through the catalog (capitals without models are skipped). */
export function cyclePlayerHull(world, dir, sameRace = true) {
  const p = getPlayer(world);
  const ids = Object.keys(FLEET).filter((id) => (!sameRace || FLEET[id].raceId === p.hull.raceId) && !PICKER_HIDDEN.has(FLEET[id].classId));
  // Across races: step a whole race at a time, keeping the class.
  if (!sameRace) dir *= ids.filter((id) => FLEET[id].raceId === p.hull.raceId).length;
  const i = Math.max(0, ids.indexOf(p.hullId));
  setHull(p, FLEET[ids[(i + dir + ids.length) % ids.length]]);
  p.blueprint = editableBlueprintFor(p.hull);
  initPlayerCombat(p);
  clearOfLandmarks(world, p);
  return p.hull;
}

export { changeSector };
