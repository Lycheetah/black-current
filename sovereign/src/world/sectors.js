// Every sector the game knows, loaded from sector files (src/data/sectors/*.json, made in the Sector
// Forge), validated and compiled at load. Also the charted universe around them.
import naraka from '../data/sectors/naraka.json' with { type: 'json' };
import erebos from '../data/sectors/erebos.json' with { type: 'json' };
import { compileSector } from './sector-schema.js';

export const SECTOR_FILES = { naraka, erebos };
const IDS = Object.keys(SECTOR_FILES);

/**
 * Sector Forge play-test: when the game is opened with ?forge, sector files saved by the Forge in this
 * browser replace the built-in ones (only if they validate; otherwise the built-in sector is kept).
 */
function forgeOverrides() {
  try {
    if (typeof location === 'undefined') return {};
    // Opened with ?forge, or the Forge's PLAY button was pressed in the last ten minutes.
    const fresh = Date.now() - Number(localStorage.getItem('sovereign.forge.play') || 0) < 10 * 60 * 1000;
    if (!/[?&]forge\b/.test(location.search) && !fresh) return {};
    return JSON.parse(localStorage.getItem('sovereign.forge.sectors') || '{}');
  } catch { return {}; }
}
const overrides = forgeOverrides();
export const FORGE_OVERRIDDEN = [];

export const SECTORS = Object.fromEntries(IDS.map((id) => {
  if (overrides[id]) {
    try { const s = compileSector(overrides[id], IDS); FORGE_OVERRIDDEN.push(id); return [id, s]; }
    catch (e) { console.warn('Forge sector rejected, using the built-in one:', e.message); }
  }
  return [id, compileSector(SECTOR_FILES[id], IDS)];
}));

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
