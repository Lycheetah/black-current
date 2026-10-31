/* Contract excerpt from gold master 0.27.5 (src/world/destinations.js), unchanged. */
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
};

/* Contract enemy races from gold master 0.27.5 (src/combat/enemies.js), unchanged. */
export { CONTRACT_ENEMY_RACES } from './combat/enemies.js';
