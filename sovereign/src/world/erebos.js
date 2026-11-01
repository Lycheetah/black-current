// Erebos Reach: the cold military frontier beyond the Ancient Gate. Positions are the canon EREBOS
// coordinates from the original (Forge 0.27.5) multiplied by the sector scale; names and descriptions
// from the canon SECTOR_META and contracts.
import { SECTOR_SCALE } from './naraka.js';

const canon = {
  station: [-165, 32, 170], gate: [315, 24, 355], cathedral: [-320, 78, -390], well: [110, -35, -365],
  bone: [425, 18, -220], violetObservatory: [-52, 68, 318], procession: [-420, 4, 92], phaseBeacon: [232, 72, -58],
  sanctuary: [-68, -62, -208], nullFoundry: [355, -42, -12], aionGate: [-462, 48, -22],
};
const at = ([x, y, z]) => ({ x: x * SECTOR_SCALE, y: y * SECTOR_SCALE, z: z * SECTOR_SCALE });

export const EREBOS_REACH = Object.freeze({
  id: 'erebos',
  name: 'EREBOS REACH',
  stationName: 'HELIOS BASTION',
  desc: 'A surviving fortress beyond the Ancient Gate. Its forges understand technologies absent from Naraka Veil, but the surrounding void is substantially more hostile.',
  landmarks: {
    bastion: { name: 'Helios Bastion', kind: 'station', pos: at(canon.station), radius: 260, solid: true },
    gate: { name: 'Ancient Gate', kind: 'gate', pos: at(canon.gate), radius: 180, leadsTo: 'Naraka Veil' },
    cathedral: { name: 'Cold Cathedral', kind: 'site', pos: at(canon.cathedral), radius: 160 },
    well: { name: 'Mirror Well', kind: 'site', pos: at(canon.well), radius: 140 },
    bone: { name: 'Bone Ring', kind: 'site', pos: at(canon.bone), radius: 180 },
    violetObservatory: { name: 'Violet Observatory', kind: 'beacon', pos: at(canon.violetObservatory), radius: 60 },
    phaseBeacon: { name: 'Phase Beacon', kind: 'beacon', pos: at(canon.phaseBeacon), radius: 40 },
    nullFoundry: { name: 'Null Foundry', kind: 'beacon', pos: at(canon.nullFoundry), radius: 90 },
    aionGate: { name: 'Aion Gate · sealed', kind: 'gate', pos: at(canon.aionGate), radius: 180, leadsTo: 'Aion Scar (sealed)' },
  },
  // A cold blue-white star, far off: Erebos has no black sun.
  blackSun: { name: 'Erebos Primary', pos: { x: 3600, y: 1400, z: -7800 }, radius: 600 },
  star: { kind: 'cold', color: 0xbfe6ff },
  home: 'bastion',
  security: { level: 0.4, label: 'CONTESTED' },
  operation: 'mirror_extraction',
  drill: false,
  gates: { gate: { to: 'naraka', arrive: 'pillar' } },
  launch: { offset: { x: -40, y: 20, z: -440 } },
  sky: { a: [0.05, 0.16, 0.3], b: [0.2, 0.1, 0.36], warm: [0.3, 0.4, 0.55] },
});
