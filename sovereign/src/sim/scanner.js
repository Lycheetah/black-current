// Scanner Atlas: detect → triangulate → scan → understand → resolve.
// One owner: this module writes world.atlas, and the research and materials a resolved signature pays.
import { NARAKA_SIGNATURES } from '../data/signatures.js';
import { SECTOR_SCALE } from '../world/naraka.js';
import { pushEvent } from './events.js';
import { dist3 } from '../core/math.js';

export const STAGES = ['hidden', 'detected', 'triangulated', 'scanned', 'understood', 'resolved'];
export const DETECT_RANGE = 3200;
export const SCAN_RANGE = 750;
const R0 = 1400;               // starting uncertainty radius (m)
const OFFSET_SCALE = SECTOR_SCALE * 2.2; // canon uncertainty vector → initial false centre
const PING_CAP = 35, PING_COOLDOWN = 2.5;
const SCAN_TIME = 6, TUNE_TOL = 0.045, TUNE_HOLD = 1.5;

const at = ([x, y, z], k) => ({ x: x * k, y: y * k, z: z * k });

export function createAtlas(rng) {
  const sigs = {};
  for (const s of Object.values(NARAKA_SIGNATURES)) {
    const pos = at(s.pos, SECTOR_SCALE);
    const off = at(s.uncertainty, OFFSET_SCALE);
    sigs[s.id] = {
      id: s.id, def: s, pos, offset: off, stage: 'hidden',
      pings: [], quality: 0, radius: R0, center: { x: pos.x + off.x, y: pos.y + off.y, z: pos.z + off.z },
      scan: 0, tune: { target: 0.15 + rng.next() * 0.7, value: 0.5, hold: 0, match: 0 },
    };
  }
  return { sigs, activeId: null, pingCooldown: 0 };
}

const stageIdx = (s) => STAGES.indexOf(s);

function updateGeometry(sig, playerPos) {
  const n = sig.pings.length;
  let baseline = 0;
  for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) baseline = Math.max(baseline, dist3(sig.pings[i], sig.pings[j]));
  const d = Math.max(400, dist3(playerPos, sig.pos));
  const geom = Math.min(1, baseline / (0.5 * d));
  const count = Math.min(1, Math.max(0, (n - 1) / 2));
  sig.quality = Math.max(sig.quality, geom * count);
  const k = 1 - sig.quality;
  sig.radius = Math.max(70, R0 * (1 - 0.95 * sig.quality));
  sig.center = { x: sig.pos.x + sig.offset.x * k, y: sig.pos.y + sig.offset.y * k, z: sig.pos.z + sig.offset.z * k };
}

/** Atlas orders from the pilot; returns what it did not consume. */
export function applyScannerOrders(world, ship, orders) {
  if (!orders) return orders;
  const A = world.atlas, rest = [];
  for (const o of orders) {
    switch (o.type) {
      case 'ping': {
        if (A.pingCooldown > 0) { pushEvent(world, { type: 'pingRefused', reason: 'RECHARGING' }); break; }
        if (ship.combat.cap.cur < PING_CAP) { pushEvent(world, { type: 'pingRefused', reason: 'CAPACITOR LOW' }); break; }
        ship.combat.cap.cur -= PING_CAP;
        A.pingCooldown = PING_COOLDOWN;
        const read = [];
        for (const sig of Object.values(A.sigs)) {
          if (sig.stage !== 'detected') continue;
          if (dist3(ship.pos, sig.pos) > DETECT_RANGE * 1.4) continue;
          sig.pings.push({ ...ship.pos });
          if (sig.pings.length > 6) sig.pings.shift();
          updateGeometry(sig, ship.pos);
          read.push(sig.id);
          if (sig.quality >= 0.85) {
            sig.stage = 'triangulated';
            pushEvent(world, { type: 'sigStage', id: sig.id, stage: 'triangulated' });
          }
        }
        pushEvent(world, { type: 'ping', pos: { ...ship.pos }, read });
        break;
      }
      case 'atlasSelect': if (A.sigs[o.id] && A.sigs[o.id].stage !== 'hidden') A.activeId = o.id; break;
      case 'tune': {
        const sig = A.sigs[A.activeId];
        if (sig?.stage === 'scanned') sig.tune.value = Math.max(0, Math.min(1, o.value));
        break;
      }
      case 'resolve': {
        const sig = A.sigs[o.id ?? A.activeId];
        if (!sig || sig.stage !== 'understood' || dist3(ship.pos, sig.pos) > SCAN_RANGE * 1.5) break;
        sig.stage = 'resolved';
        world.research += sig.def.research;
        for (const [k, v] of Object.entries(sig.def.materials)) world.materials[k] = (world.materials[k] || 0) + v;
        pushEvent(world, { type: 'sigResolved', id: sig.id, name: sig.def.name, research: sig.def.research, materials: sig.def.materials, text: sig.def.resolved });
        break;
      }
      default: rest.push(o);
    }
  }
  return rest;
}

export function stepScanner(world, ship, dt) {
  const A = world.atlas;
  A.pingCooldown = Math.max(0, A.pingCooldown - dt);
  if (!ship || ship.dead || ship.docked) return;
  for (const sig of Object.values(A.sigs)) {
    const d = dist3(ship.pos, sig.pos);
    if (sig.stage === 'hidden' && d < DETECT_RANGE) {
      sig.stage = 'detected';
      if (!A.activeId) A.activeId = sig.id;
      pushEvent(world, { type: 'sigStage', id: sig.id, stage: 'detected' });
    }
  }
  const sig = A.sigs[A.activeId];
  if (!sig) return;
  if (sig.stage === 'triangulated') {
    const near = dist3(ship.pos, sig.pos) < SCAN_RANGE;
    const slow = ship.speed < ship.flight.maxSpeed * 0.5;
    if (near) sig.scan = Math.min(1, sig.scan + (slow ? dt : dt * 0.25) / SCAN_TIME);
    else sig.scan = Math.max(0, sig.scan - dt * 0.05);
    if (sig.scan >= 1) { sig.stage = 'scanned'; pushEvent(world, { type: 'sigStage', id: sig.id, stage: 'scanned', name: sig.def.name }); }
  } else if (sig.stage === 'scanned') {
    const t = sig.tune;
    t.match = Math.max(0, 1 - Math.abs(t.value - t.target) / 0.5);
    if (Math.abs(t.value - t.target) < TUNE_TOL) t.hold += dt; else t.hold = Math.max(0, t.hold - dt * 0.5);
    if (t.hold >= TUNE_HOLD) { sig.stage = 'understood'; pushEvent(world, { type: 'sigStage', id: sig.id, stage: 'understood', name: sig.def.name }); }
  }
}

export const atlasSummary = (world) => Object.values(world.atlas.sigs).filter((s) => s.stage !== 'hidden');
export { stageIdx };
