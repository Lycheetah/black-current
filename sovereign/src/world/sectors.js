// Every sector the game knows, by id, and the charted universe around them.
import { NARAKA_VEIL } from './naraka.js';
import { EREBOS_REACH } from './erebos.js';

export const SECTORS = { naraka: NARAKA_VEIL, erebos: EREBOS_REACH };

/**
 * The universe map. Playable sectors come from SECTORS; the rest are canon regions still beyond reach,
 * shown as uncharted. Positions are map coordinates (0..1), links are gate routes.
 */
export const UNIVERSE = [
  { id: 'naraka', map: { x: 0.3, y: 0.62 }, links: ['erebos'] },
  { id: 'erebos', map: { x: 0.52, y: 0.42 }, links: ['naraka', 'aion'] },
  { id: 'aion', name: 'AION SCAR', map: { x: 0.74, y: 0.26 }, links: ['erebos', 'chaos'], security: { level: 0.1, label: 'LAWLESS' }, sealed: 'The Aion Gate in Erebos Reach is sealed.' },
  { id: 'chaos', name: 'CHAOS CRADLE', map: { x: 0.82, y: 0.6 }, links: ['aion', 'deep'], security: { level: 0.0, label: 'UNKNOWN' }, sealed: 'Uncharted.' },
  { id: 'deep', name: 'DEEP CURRENT', map: { x: 0.58, y: 0.8 }, links: ['chaos'], security: { level: 0.0, label: 'UNKNOWN' }, sealed: 'Uncharted.' },
];
