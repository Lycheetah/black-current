// Sector files (sovereign.sector/1): the schema, a validator that explains problems in plain words, and
// the compiler that turns a file into the runtime sector the simulation and renderer use.
// Sector files live in src/data/sectors/ and are made or edited in the Sector Forge.

import { CONTRACTS } from '../data/contracts.js';

export const SECTOR_SCHEMA = 'sovereign.sector/1';
/** Scenery each landmark can be built as (render/sector-scene.js maps these to builders). */
export const BUILDS = {
  asterion: 'Station (Asterion type)', pillar_gate: 'Gate ring', breach: 'Rift breach', wreckfield: 'Wreckfield',
  cathedral: 'Cold Cathedral', mirror_well: 'Mirror Well', bone_ring: 'Bone Ring', beacon: 'Beacon light', none: 'Nothing (marker only)',
};
export const KINDS = ['station', 'gate', 'site', 'wreck', 'beacon'];
export const STAR_KINDS = { blacksun: 'Black sun', cold: 'Cold star' };
export const BELT_KINDS = ['rock'];

const isNum = (v) => typeof v === 'number' && Number.isFinite(v);
const isVec = (p) => p && isNum(p.x) && isNum(p.y) && isNum(p.z);
const isRgb = (a) => Array.isArray(a) && a.length === 3 && a.every((v) => isNum(v) && v >= 0 && v <= 1);

/** Every problem with a sector file, as plain sentences (empty when it is valid). */
export function sectorProblems(s, knownSectors = null) {
  const out = [];
  const say = (m) => out.push(m);
  if (!s || typeof s !== 'object') return ['The file is not a sector.'];
  if (s.schema !== SECTOR_SCHEMA) say(`The schema must be "${SECTOR_SCHEMA}".`);
  if (!/^[a-z][a-z0-9_]*$/.test(s.id || '')) say('The sector id must be lowercase letters, digits or _ (e.g. "naraka").');
  if (!s.name) say('The sector needs a name.');
  if (!s.security || !isNum(s.security.level) || s.security.level < 0 || s.security.level > 1) say('Security level must be a number from 0 to 1.');
  const lms = Array.isArray(s.landmarks) ? s.landmarks : [];
  if (!lms.length) say('A sector needs at least one landmark.');
  const ids = new Set();
  for (const [i, lm] of lms.entries()) {
    const who = lm?.name || lm?.id || `landmark ${i + 1}`;
    if (!/^[a-zA-Z][a-zA-Z0-9_]*$/.test(lm?.id || '')) say(`${who}: its id must be letters, digits or _.`);
    if (ids.has(lm.id)) say(`${who}: the id "${lm.id}" is used twice.`);
    ids.add(lm.id);
    if (!lm.name) say(`${who}: needs a name.`);
    if (!KINDS.includes(lm.kind)) say(`${who}: kind must be one of ${KINDS.join(', ')}.`);
    if (!isVec(lm.pos)) say(`${who}: position must have numbers x, y, z.`);
    if (!isNum(lm.radius) || lm.radius <= 0) say(`${who}: radius must be more than 0.`);
    if (!(lm.build in BUILDS)) say(`${who}: scenery "${lm.build}" is not one of ${Object.keys(BUILDS).join(', ')}.`);
  }
  const byId = Object.fromEntries(lms.map((l) => [l.id, l]));
  if (!byId[s.home]) say(`The home station "${s.home}" is not a landmark.`);
  else if (byId[s.home].kind !== 'station') say(`The home "${s.home}" must be a station.`);
  for (const [gid, g] of Object.entries(s.gates || {})) {
    if (!byId[gid]) say(`Gate "${gid}" is not a landmark.`);
    else if (byId[gid].kind !== 'gate') say(`Gate "${gid}" must be a landmark of kind gate.`);
    if (knownSectors && !knownSectors.includes(g.to)) say(`Gate "${gid}" leads to "${g.to}", which is not a known sector.`);
  }
  if (s.operation) {
    const c = CONTRACTS[s.operation];
    if (!c) say(`The operation "${s.operation}" is not a known contract.`);
    else if (!byId[c.target]) say(`The operation ${c.name} is fought at "${c.target}": keep a landmark with that id.`);
  }
  const st = s.star;
  if (!st || !(st.kind in STAR_KINDS)) say(`The star kind must be one of ${Object.keys(STAR_KINDS).join(', ')}.`);
  else {
    if (!isVec(st.pos)) say('The star needs a position.');
    if (!isNum(st.radius) || st.radius <= 0) say('The star radius must be more than 0.');
  }
  if (!s.sky || !isRgb(s.sky.a) || !isRgb(s.sky.b) || !isRgb(s.sky.warm)) say('The sky needs three colours (a, b, warm), each three numbers from 0 to 1.');
  for (const [i, b] of (s.belts || []).entries()) {
    const who = b.id || `belt ${i + 1}`;
    if (!isVec(b.center)) say(`${who}: centre must have numbers x, y, z.`);
    if (!isNum(b.count) || b.count < 1 || b.count > 2000) say(`${who}: rock count must be 1 to 2000.`);
    if (!isNum(b.spread) || b.spread <= 0) say(`${who}: spread must be more than 0.`);
    if (!Array.isArray(b.size) || !(b.size[0] > 0) || !(b.size[1] >= b.size[0])) say(`${who}: rock size must be [smallest, largest] with smallest above 0.`);
  }
  if (!isVec(s.launch?.offset)) say('The launch offset (undock point from the home station) needs x, y, z.');
  return out;
}

/** Validate (throws with every problem listed) and build the runtime sector. */
export function compileSector(s, knownSectors = null) {
  const problems = sectorProblems(s, knownSectors);
  if (problems.length) throw new Error(`Sector ${s?.id || '?'}: ${problems.join(' ')}`);
  const landmarks = Object.fromEntries(s.landmarks.map((l) => [l.id, { ...l, pos: { ...l.pos } }]));
  const color = s.star.color ? parseInt(String(s.star.color).replace('#', ''), 16) : undefined;
  return Object.freeze({
    ...s,
    landmarks,
    belts: (s.belts || []).map((b) => ({ kind: 'rock', ...b })),
    gates: s.gates || {},
    star: { ...s.star, color },
    // The simulation and older code call the sector's star blackSun (hazard, bearings, lighting).
    blackSun: { name: s.star.name, pos: { ...s.star.pos }, radius: s.star.radius },
  });
}
