/* THE FORGE TABLE. Master route Stage 0 (docs/PLAN.md).
 * Every size, sector, gun-curve and economy number the route will retune lives here,
 * so a balance pass edits one file. Loaded first; every reader guards with `window.tuning`.
 * Values below are the rc.13 numbers moved verbatim; Stage 0 changes no behaviour. */
(() => {
  'use strict';
  const CLASSES = ['frigate', 'cruiser', 'battleship', 'capital', 'supercapital', 'titan'];
  window.tuning = Object.freeze({
    CLASSES,
    // Hull scale. `enemyArt` multiplies an enemy's authored silhouette (hostile-skins.js).
    // `playerLength` is the measured length of the factory flagship of each frame, in px.
    SIZE: {
      enemyArt: { frigate: 1, cruiser: 1.55, battleship: 2.15, capital: 2.85, supercapital: 3.6, titan: 4.5 },
      playerLength: { frigate: 170, cruiser: 222, battleship: 344, capital: 512, supercapital: 704, titan: 800 },
      sectionPx: 48
    },
    // Sector radius in px. `home` is the classic Asterion Forge chamber; `deep` is the
    // minimum for ordinary sectors outside the protected home rings (enemy-combat.js).
    SECTOR: { home: 2600, deep: 3200 },
    // Gun damage-per-second budget by mount class: POINT, LIGHT, MEDIUM, HEAVY, SIEGE, CAPITAL (arsenal.js).
    GUN_CURVE: [50, 110, 200, 400, 700, 1300],
    // Live prices (modular-ships.js, progression-path.js): frame metal, shipwright rank metal/biomass,
    // gun hardware by mount class (× ARCH factor), with POINT guns priced by upgradePath.NOVICE_PRICES.
    PRICE_CURVE: {
      frame: { frigate: 0, cruiser: 600, battleship: 9000, capital: 24000, supercapital: 60000, titan: 250000 },
      rankMetal: [120, 1800, 7200, 24000, 60000, 200000],
      rankBiomass: [150, 500, 1400, 3000, 6000, 20000],
      gun: { LIGHT: 48, MEDIUM: 360, HEAVY: 2200, SIEGE: 9800, CAPITAL: 99000 },
      gunArch: { cannon: 1, repeater: 1.05, scatter: 1.1, stream: 1.05, driver: 1.2, rifle: 1.35, bolt: 1, pulse: 1.1, lance: 1.4, seeker: 1.2, rocket: 1.1, torpedo: 1.3, mortar: 1.1, flak: 1.15, shell: 1.25 }
    },
    // Native (unscaled) kill bounty by tier, used where ROWS does not apply: home rings, bosses,
    // outposts and protected encounters (progression-path.js). ROWS.bounty pays scaled sectors.
    BOUNTY: [0, 1, 2, 3, 6, 12, 22, 36, 54, 78, 110],
    // Extra hull HP granted by each frame (combat-scaling.js).
    FRAMES: { frigate: 0, cruiser: 300, battleship: 1200, capital: 4000, supercapital: 10000, titan: 22000 },
    // Fixed sector threat by tier 1–10: enemy HP/shield, damage multiplier, salvage parts and bounty metal.
    ROWS: [null,
      { hp: 90, shield: 0, damage: 1, parts: 1, bounty: 1 },
      { hp: 220, shield: 0, damage: 1, parts: 1, bounty: 3 },
      { hp: 650, shield: 100, damage: 1.4, parts: 2, bounty: 8 },
      { hp: 1500, shield: 200, damage: 2, parts: 3, bounty: 18 },
      { hp: 4200, shield: 600, damage: 3.2, parts: 6, bounty: 42 },
      { hp: 9000, shield: 1500, damage: 4.8, parts: 10, bounty: 95 },
      { hp: 22000, shield: 4000, damage: 7, parts: 20, bounty: 220 },
      { hp: 42000, shield: 7000, damage: 9, parts: 32, bounty: 450 },
      { hp: 78000, shield: 12000, damage: 11, parts: 50, bounty: 850 },
      { hp: 125000, shield: 22000, damage: 14, parts: 80, bounty: 1500 }
    ]
  });
})();
