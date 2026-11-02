// Ores mined from asteroid belts (Reforge). Unit = 10 m³. Refining turns ore into canon materials
// (data/progression/materials.js) at a better price than selling it raw.
export const ORES = {
  ferric_ore: { id: 'ferric_ore', name: 'Ferric Ore', desc: 'Iron-rich belt rock. Common, cheap, everywhere.', value: 3, color: 0xc07a48,
    refine: { ferrite: 0.9 } },
  prism_ore: { id: 'prism_ore', name: 'Prism Ore', desc: 'Rock shot through with crystalline veins that hum near shields.', value: 5, color: 0x7fd8ff,
    refine: { prism_shard: 0.3, ferrite: 0.3 } },
  void_ore: { id: 'void_ore', name: 'Void Ore', desc: 'Black rock from the far side, heavy with condensed Current.', value: 10, color: 0xb07cff,
    refine: { void_glass: 0.3, solar_filament: 0.1 } },
};
/** Which ores a sector's belts hold, with weights. */
export const SECTOR_ORES = { naraka: { ferric_ore: 0.7, prism_ore: 0.3 }, erebos: { prism_ore: 0.4, void_ore: 0.6 } };
/** Ore hold by class (units of 10 m³). */
export const ORE_HOLD = {
  pod: 0, starter: 30, frigate: 40, assault_frigate: 35, specialist_frigate: 50, destroyer: 70, cruiser: 150, heavy_cruiser: 140,
  advanced_cruiser: 160, battlecruiser: 220, specialist_ship: 260, battleship: 400, drone_carrier: 450, industrial: 2000,
  autonomous: 300, dreadnought: 600, carrier: 800, titan: 3000,
};
/** Mining modules added by the Reforge (utility slot). 'mining' is ore units per 5 s cycle. */
export const REFORGE_MODULES = {
  ore_harvester: { id: 'ore_harvester', slot: 'utility', name: 'Ore Harvester', cost: 0, pg: 14, mass: 9, visual: 'utility', mining: 3,
    desc: 'A mining laser for belt rock.', effect: 'Mining · 3 ore per 5 s cycle', stats: {} },
  deep_core_harvester: { id: 'deep_core_harvester', slot: 'utility', name: 'Deep-Core Harvester', cost: 340, pg: 30, mass: 16, visual: 'utility', mining: 7,
    desc: 'A heavy mining array that cuts straight to the rich core.', effect: 'Mining · 7 ore per 5 s cycle', stats: {} },
};
