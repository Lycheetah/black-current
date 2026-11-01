/* Contract excerpts from gold master 0.27.5 (src/world/destinations.js), text and numbers unchanged. */
export const CONTRACTS = {
  breach_purge: {
    id: 'breach_purge', name: 'Break the Current', type: 'Purge Operation',
    desc: 'Enter the Black Current breach and destroy a layered hostile fleet before the anomaly can stabilise.',
    sector: 'naraka', target: 'breach', reward: 260, difficulty: 'STANDARD', enemyMult: 1.0,
    waves: [
      { fighter: 6, frigate: 2 },
      { frigate: 3, destroyer: 2 },
      { destroyer: 2, cruiser: 1 },
      { cruiser: 2, battleship: 1 },
    ], boss: true,
  },
  mirror_extraction: {
    id: 'mirror_extraction', name: 'The Mirror Well', type: 'Far-Side Recovery',
    desc: 'Reach the Mirror Well and extract a phase-memory lattice before Erebos hunters collapse on the site.',
    sector: 'erebos', target: 'well', reward: 470, difficulty: 'HIGH', enemyMult: 1.28,
    waves: [
      { fighter: 6, frigate: 3 },
      { frigate: 4, destroyer: 2 },
      { destroyer: 2, cruiser: 2 },
    ], boss: false,
  },
  cold_cathedral: {
    id: 'cold_cathedral', name: 'Choir in the Dark', type: 'Erebos Suppression',
    desc: 'Trace the signal inside the Cold Cathedral and silence the fleet nesting around its singularity choir.',
    sector: 'erebos', target: 'cathedral', reward: 650, difficulty: 'EXTREME', enemyMult: 1.32,
    waves: [
      { fighter: 7, frigate: 3 },
      { frigate: 4, destroyer: 3 },
      { destroyer: 3, cruiser: 2, battleship: 1 },
    ], boss: true,
  },
  bone_ring_siege: {
    id: 'bone_ring_siege', name: 'Crown of Bones', type: 'Erebos Capital Siege',
    desc: 'Enter the Bone Ring kill-zone and destroy the capital formation guarding the far-side corridor.',
    sector: 'erebos', target: 'bone', reward: 840, difficulty: 'MYTHIC', enemyMult: 1.48,
    waves: [
      { frigate: 5, destroyer: 3 },
      { destroyer: 3, cruiser: 3 },
      { cruiser: 2, battleship: 2, dreadnought: 1 },
    ], boss: true,
  },
};

/* Contract enemy races from gold master 0.27.5 (src/combat/enemies.js), unchanged. */
export { CONTRACT_ENEMY_RACES } from './combat/enemies.js';
