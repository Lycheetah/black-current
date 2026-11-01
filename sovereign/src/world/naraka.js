// Naraka Veil sector layout. Positions are the canon coordinates from the
// original WORLD table (Forge 0.27.5), multiplied by SECTOR_SCALE so the
// sector reads at capital-ship scale.

export const SECTOR_SCALE = 8;

const canon = {
  station: [190, 18, 155],
  pillarGate: [58, 52, -158],
  breach: [0, 28, -355],
  wreck: [-255, -15, -125],
  observatory: [105, 72, -118],
  refinery: [365, -28, -72],
  blackSun: [-65, 146, -1040],
};

const at = ([x, y, z]) => ({ x: x * SECTOR_SCALE, y: y * SECTOR_SCALE, z: z * SECTOR_SCALE });

export const NARAKA_VEIL = Object.freeze({
  id: 'naraka',
  name: 'NARAKA VEIL',
  stationName: 'ASTERION FORGE',
  landmarks: {
    asterion: { name: 'Asterion Forge', kind: 'station', pos: at(canon.station), radius: 260, solid: true },
    pillar: { name: 'The PILLAR', kind: 'gate', pos: at(canon.pillarGate), radius: 180, leadsTo: 'Erebos Reach' },
    breach: { name: 'Current Breach', kind: 'site', pos: at(canon.breach), radius: 120 },
    wreck: { name: 'Ash Wreckfield', kind: 'wreck', pos: at(canon.wreck), radius: 140 },
    observatory: { name: 'Veil Observatory', kind: 'beacon', pos: at(canon.observatory), radius: 60 },
    refinery: { name: 'Ferric Refinery', kind: 'beacon', pos: at(canon.refinery), radius: 90 },
  },
  // The spectral black sun is a navigational omen, rendered as a far anomaly.
  blackSun: { name: 'Spectral Black Sun', pos: at(canon.blackSun), radius: 1400 },
  star: { kind: 'blacksun' },
  home: 'asterion',
  security: { level: 0.9, label: 'WATCHED' },
  operation: 'breach_purge',
  drill: true,
  // The PILLAR opens to Erebos once the Current has been broken at the breach.
  gates: { pillar: { to: 'erebos', arrive: 'gate', requires: 'breach_purge' } },
  sky: { a: [0.03, 0.26, 0.34], b: [0.3, 0.08, 0.46], warm: [0.55, 0.25, 0.07] },
  // Undock point: just off Asterion's launch spine, nose toward the PILLAR.
  launch: { offset: { x: -40, y: 20, z: -440 } },
});
