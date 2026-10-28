/* THE FORGE TABLE. Master route Stage 0 (docs/PLAN.md).
 * Every size, sector, gun-curve and economy number the route will retune lives here,
 * so a balance pass edits one file. Loaded first; every reader guards with `window.tuning`.
 * Values below are the rc.13 numbers moved verbatim; Stage 0 changes no behaviour. */
(() => {
  'use strict';
  const CLASSES = ['frigate', 'cruiser', 'battleship', 'capital', 'supercapital', 'titan'];
  const T = window.tuning = Object.freeze({
    CLASSES,
    // The flying frame class of a ship ('frigate' … 'titan'), or 'frigate' for legacy hulls.
    classOf(ship) {
      const cls = String(window.fleet?.hullBand?.(ship)?.cls || '').toLowerCase();
      return CLASSES.includes(cls) ? cls : 'frigate';
    },
    sectorRadius(danger) { return T.SECTOR.byDanger[Math.max(0, Math.min(T.SECTOR.byDanger.length - 1, Math.floor(danger) || 0))]; },
    // Hull scale. `enemyArt` multiplies an enemy's authored silhouette (hostile-skins.js).
    // `playerLength` is the measured length of the factory flagship of each frame, in px.
    SIZE: {
      enemyArt: { frigate: 1, cruiser: 1.55, battleship: 2.15, capital: 2.85, supercapital: 3.6, titan: 4.5 },
      playerLength: { frigate: 170, cruiser: 222, battleship: 344, capital: 512, supercapital: 704, titan: 800 },
      sectionPx: 48,
      // Stage 1 · one scale. A frame's blueprint spacing is multiplied by this in flight, so a
      // titan flies at ~1,840 px long while its blueprint keeps the 48 px editor grid. Radii are
      // NOT scaled: a gun mount's radius selects its weapon class.
      hullScale: { frigate: 1, cruiser: 1.2, battleship: 1.45, capital: 1.75, supercapital: 2, titan: 2.3 },
      // Enemy silhouette length = playerLength × hullScale of its class × this role factor.
      role: { mote: 0.72, stalker: 1, charger: 0.9, sniper: 1.08, hive: 1.1, hunter: 1.12 },
      // Camera pulls back with the flying frame: target zoom = player's zoom dial × this.
      zoom: { frigate: 1, cruiser: 0.96, battleship: 0.91, capital: 0.86, supercapital: 0.82, titan: 0.78 }
    },
    // Hull mass: thrust (acceleration, so also top speed) and hull turn rate by frame.
    MASS: {
      frigate: { accel: 1, turn: 1 }, cruiser: { accel: 0.88, turn: 0.85 }, battleship: { accel: 0.76, turn: 0.68 },
      capital: { accel: 0.65, turn: 0.54 }, supercapital: { accel: 0.56, turn: 0.44 }, titan: { accel: 0.5, turn: 0.36 }
    },
    // Sector radius in px. `home` is the classic Asterion Forge chamber; `deep` is the
    // minimum for ordinary sectors outside the protected home rings (enemy-combat.js).
    // `byDanger` sizes ordinary sectors outside the home rings so capital fleets have room.
    SECTOR: { home: 2600, deep: 3200, byDanger: [3200, 3200, 3200, 3600, 4200, 5000, 5800, 6600, 7400, 8200, 9000] },
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
