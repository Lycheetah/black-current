/* THE FORGE TABLE. Master route Stage 0 (docs/PLAN.md).
 * Every size, sector, gun-curve and economy number the route will retune lives here,
 * so a balance pass edits one file. Loaded first; every reader guards with `window.tuning`.
 * Values below are the rc.13 numbers moved verbatim; Stage 0 changes no behaviour. */
(() => {
  'use strict';
  // Nine rungs (overnight run step 7, docs/MASTER_PLAN.md §4.2). Enemy fleets still use the six original classes.
  const CLASSES = ['frigate', 'destroyer', 'cruiser', 'heavycruiser', 'battlecruiser', 'battleship', 'capital', 'supercapital', 'titan'];
  // Null band rows 11–20 continue the ladder: hull/shield ×1.18, damage ×1.1, parts ×1.15, bounty ×1.2 per tier.
  const extend = rows => { for (let t = 11; t <= 20; t++) { const p = rows[t - 1]; rows[t] = { hp: Math.round(p.hp * 1.18 / 100) * 100, shield: Math.round(p.shield * 1.18 / 100) * 100, damage: Math.round(p.damage * 1.1 * 10) / 10, parts: Math.round(p.parts * 1.15), bounty: Math.round(p.bounty * 1.2 / 10) * 10 }; } return rows; };
  const T = window.tuning = Object.freeze({
    CLASSES,
    // The flying frame class of a ship ('frigate' … 'titan'), or 'frigate' for legacy hulls.
    classOf(ship) {
      const cls = String(window.fleet?.hullBand?.(ship)?.cls || '').toLowerCase();
      return CLASSES.includes(cls) ? cls : 'frigate';
    },
    // Damage multiplier for a weapon id against a target whose shield is (or is not) up.
    lane(weapon, shieldUp) { const f = window.arsenal?.GUNS?.[weapon]?.family, l = f && T.ARSENAL.lanes[f]; return l ? (shieldUp ? l.shield : l.hull) : 1; },
    sectorRadius(danger) { return T.SECTOR.byDanger[Math.max(0, Math.min(T.SECTOR.byDanger.length - 1, Math.floor(danger) || 0))]; },
    // Hull scale. `enemyArt` multiplies an enemy's authored silhouette (hostile-skins.js).
    // `playerLength` is the measured length of the factory flagship of each frame, in px.
    SIZE: {
      enemyArt: { frigate: 1, destroyer: 1.25, cruiser: 1.55, heavycruiser: 1.75, battlecruiser: 1.95, battleship: 2.15, capital: 2.85, supercapital: 3.6, titan: 4.5 },
      playerLength: { frigate: 170, destroyer: 196, cruiser: 222, heavycruiser: 262, battlecruiser: 300, battleship: 344, capital: 512, supercapital: 704, titan: 800 },
      sectionPx: 48,
      // Stage 1 · one scale. A frame's blueprint spacing is multiplied by this in flight, so a
      // titan flies at ~1,840 px long while its blueprint keeps the 48 px editor grid. Radii are
      // NOT scaled: a gun mount's radius selects its weapon class.
      hullScale: { frigate: 1, destroyer: 1.1, cruiser: 1.2, heavycruiser: 1.3, battlecruiser: 1.38, battleship: 1.45, capital: 1.75, supercapital: 2, titan: 2.3 },
      // Enemy silhouette length = playerLength × hullScale of its class × this role factor.
      role: { mote: 0.72, stalker: 1, charger: 0.9, sniper: 1.08, hive: 1.1, hunter: 1.12 },
      // Camera pulls back with the flying frame: target zoom = player's zoom dial × this.
      zoom: { frigate: 1, destroyer: 0.98, cruiser: 0.96, heavycruiser: 0.94, battlecruiser: 0.925, battleship: 0.91, capital: 0.86, supercapital: 0.82, titan: 0.78 },
      // Route 2 Stage 1 · room scale (js/room-scale.js). Every sector is at least `room` of your own
      // ship-lengths in radius, and the camera keeps your hull within `fit` of the screen's short side.
      // 12 (was 6, then 8; Mac, 2026-10-30: "the zones you're in can be larger again", "zones are still way too small").
      // `zone` multiplies every sector's own size outside the home rookie rings (rings 1-3 stay compact for new pilots).
      room: 12, fit: 0.42, zone: 1.6
    },
    // Cruise (V) thrust by flying frame, so crossing a sector sized for your ship takes seconds, not a minute.
    // ×1.6 with the larger zones (2026-10-30), so crossing a sector still takes seconds
    CRUISE: { frigate: 2.64, destroyer: 2.75, cruiser: 2.88, heavycruiser: 3.04, battlecruiser: 3.28, battleship: 3.36, capital: 4.16, supercapital: 4.96, titan: 5.76 },
    // Stage 5 · the wide dark. Grid half-widths: home 9 (19×19), systems base size + 6 (15–19 wide).
    // Inner coordinates and seeds never move; the outer rings are new space.
    MAP: { homeHalf: 9, systemExtra: 6 },
    // Danger bands: safe 1–3, contested 4–10, null 11–20. Far regions push sectors into the null band.
    BANDS: { safe: [1, 3], contested: [4, 10], null: [11, 20], maxTier: 20, regionBonus: [0, 0, 1, 3, 6] },
    // Stage 6 · capital endgame (js/capital-endgame.js). Multipliers are × the sector's threat row.
    ENDGAME: {
      roamMs: 20 * 60 * 1000, warlordMinDanger: 12,
      citadel: { core: 6, generator: 1.5, battery: 1, hangar: 1.2, bounty: 20, reward: 20 },
      warlord: { tier: 16, hp: 2.5, bounty: 10, reward: 10 },
      // The four home bosses sit on a fixed rung: tier-5 threat × these (they are the first capital-ish fights).
      boss: { tier: 5, hp: 3, shield: 3 }
    },
    // Hull mass: thrust (acceleration, so also top speed) and hull turn rate by frame.
    MASS: {
      frigate: { accel: 1, turn: 1 }, destroyer: { accel: 0.95, turn: 0.93 }, cruiser: { accel: 0.88, turn: 0.85 },
      heavycruiser: { accel: 0.81, turn: 0.75 }, battlecruiser: { accel: 0.86, turn: 0.74 }, battleship: { accel: 0.76, turn: 0.68 },
      capital: { accel: 0.65, turn: 0.54 }, supercapital: { accel: 0.56, turn: 0.44 }, titan: { accel: 0.5, turn: 0.36 }
    },
    // Sector radius in px. `home` is the classic Asterion Forge chamber; `deep` is the
    // minimum for ordinary sectors outside the protected home rings (enemy-combat.js).
    // `byDanger` sizes ordinary sectors outside the home rings so capital fleets have room.
    SECTOR: { home: 2600, deep: 3200, byDanger: [3200, 3200, 3200, 3600, 4200, 5000, 5800, 6600, 7400, 8200, 9000, 9300, 9600, 9900, 10200, 10500, 10800, 11100, 11400, 11700, 12000] },
    // Gun damage-per-second budget by mount class: POINT, LIGHT, MEDIUM, HEAVY, SIEGE, CAPITAL (arsenal.js).
    GUN_CURVE: [50, 110, 200, 400, 700, 1300],
    // Stage 2 · the arsenal. Above Point class, five families × five classes are offered; every other
    // generated gun is RETIRED: owned copies keep flying, nothing new is sold or dropped, and enemies
    // and salvage use the roster gun of the same class and family. Values are each gun's share of its
    // class DPS budget (GUN_CURVE). Point guns are civilisation starters and all stay.
    ARSENAL: {
      roster: {
        autocannon: 1, heavycannon: 1, 'repeater-heavy': 1, 'cannon-siege': 1, 'cannon-capital': 1,
        'driver-light': 0.95, 'rifle-medium': 0.95, 'driver-heavy': 0.95, railgun: 0.95, capitalrail: 0.95,
        wave: 0.9, laser: 0.9, 'pulse-heavy': 0.9, lance: 0.85, 'lance-capital': 0.8,
        'rocket-light': 1, 'seeker-medium': 0.95, torpedo: 1, 'seeker-siege': 0.95, 'torpedo-capital': 1,
        shrapnel: 0.85, mortar: 0.9, howitzer: 0.95, cluster: 0.8, 'shell-capital': 0.9,
        // Mac, 2026-10-30 ("weapons need work"): a second gun per family per class, the archetype that plays most
        // differently from the first. It sits just under the first in its slot (role 0.05 lower), so the signature
        // guns still lead their lanes and the measured climb is unchanged; the choice is how it fights, not a bigger number.
        'scatter-light': 0.95, 'scatter-medium': 0.95, 'cannon-heavy': 0.95, 'scatter-siege': 0.95, 'repeater-capital': 0.95,
        'rifle-light': 0.9, 'stream-medium': 0.9, 'rifle-heavy': 0.9, 'rifle-siege': 0.9, 'rifle-capital': 0.9,
        'pulse-light': 0.85, 'lance-medium': 0.85, 'bolt-heavy': 0.85, 'pulse-siege': 0.8, 'bolt-capital': 0.75,
        'seeker-light': 0.95, 'rocket-medium': 0.9, 'rocket-heavy': 0.95, 'torpedo-siege': 0.9, 'seeker-capital': 0.95,
        'mortar-light': 0.8, 'flak-medium': 0.85, 'mortar-heavy': 0.9, 'flak-siege': 0.75, 'mortar-capital': 0.85,
        // Mac, 2026-10-30 ("needs more guns"): the third archetype in every family and class joins too, so every slot above
        // Point offers all three ways to fight. Each sits 0.05 under the lower of its slot's two (the climb is unchanged).
        'cannon-light': 0.9, 'repeater-medium': 0.9, 'scatter-heavy': 0.9, 'repeater-siege': 0.9, 'scatter-capital': 0.9,
        'stream-light': 0.85, 'driver-medium': 0.85, 'stream-heavy': 0.85, 'stream-siege': 0.85, 'stream-capital': 0.85,
        'bolt-light': 0.8, burstbeam: 0.8, 'lance-heavy': 0.8, 'bolt-siege': 0.75, 'pulse-capital': 0.7,
        'torpedo-light': 0.9, 'torpedo-medium': 0.85, homing: 0.9, 'rocket-siege': 0.85, 'rocket-capital': 0.9,
        'shell-light': 0.75, 'shell-medium': 0.8, 'flak-heavy': 0.85, 'mortar-siege': 0.7, 'flak-capital': 0.8
      },
      point: { flak: 1 },   // Point-class role fixes (flak was 1.3 on paper; it reaches point-blank only)
      specials: ['twin', 'flechette', 'boomerang'],
      // What each family is FOR: damage multiplier while the target's shield is up, and against bare hull.
      lanes: {
        kinetic: { shield: 1, hull: 1 }, rail: { shield: 0.7, hull: 1.3 }, beam: { shield: 1.5, hull: 0.85 },
        missile: { shield: 0.9, hull: 1.1 }, ordnance: { shield: 0.85, hull: 1.05 }
      }
    },
    // Stage 3 · the climb. The progression census (witness-climb) MEASURES kill time per frame and MODELS
    // play pace: each kill costs `overhead` × kill time + `travel` seconds. `targetHours` is Mac's call;
    // 15–25 h frigate → titan is the proposed starting window (UNVERIFIED until he plays it).
    // Mac 2026-10-29 ("everything costs too much relative to scaling"): the climb window moves from 15–25 h to 8–14 h.
    CLIMB: { overhead: 2.5, travel: 25, targetHours: [8, 14] },
    // Player shield pool and recharge × this by flying frame, so capital shields matter against capital fleets.
    SHIELD_SCALE: { frigate: 1, destroyer: 2, cruiser: 3, heavycruiser: 4.5, battlecruiser: 6, battleship: 8, capital: 20, supercapital: 40, titan: 70 },
    // Live prices (modular-ships.js, progression-path.js): frame metal, shipwright rank metal/biomass,
    // gun hardware by mount class (× ARCH factor), with POINT guns priced by upgradePath.NOVICE_PRICES.
    PRICE_CURVE: {
      // Overnight run steps 3 + 7 (docs/ECONOMY.md, witness-climb census): nine rungs whose step times rise
      // steadily (0.27, 0.3, 0.4, 0.5, 0.7 h to the battleship at ~2.2 h, then 2.1, 2.0, 2.9 h; each step
      // ≥0.9× and ≤3× the last). Real play runs slower than the census model (docs/ECONOMY.md probe).
      frame: { frigate: 0, destroyer: 110, cruiser: 580, heavycruiser: 1400, battlecruiser: 2280, battleship: 4950, capital: 7600, supercapital: 15000, titan: 44500 },
      rankMetal: [80, 380, 920, 1540, 3100, 5000, 10000, 29000],
      rankBiomass: [100, 250, 500, 900, 1400, 3000, 6000, 20000],
      gun: { LIGHT: 48, MEDIUM: 170, HEAVY: 600, SIEGE: 2100, CAPITAL: 7400 },   // ~3.5× per class (was 7.5/6/4.5/10×); Light 48 (was 46): with every type on sale the Light cannon and bolt (factor 1) are the 48-metal entry, so the first upgrade stays 96 + 48 = 144
      gunArch: { cannon: 1, repeater: 1.05, scatter: 1.1, stream: 1.05, driver: 1.2, rifle: 1.35, bolt: 1, pulse: 1.1, lance: 1.4, seeker: 1.2, rocket: 1.1, torpedo: 1.3, mortar: 1.1, flak: 1.15, shell: 1.25 }
    },
    // Native (unscaled) kill bounty by tier, used where ROWS does not apply: home rings, bosses,
    // outposts and protected encounters (progression-path.js). ROWS.bounty pays scaled sectors.
    // Mac's playtest list (2026-10-30, item 2): home-ring kills paid 1-2 metal, so the first 144-metal upgrade came only from
    // contracts. Tiers 1-4 now pay 4/7/9/11 (about 25 rookie kills to the first upgrade); tier 5 up is unchanged.
    BOUNTY: [0, 4, 7, 9, 11, 12, 22, 36, 54, 78, 110],
    // Extra hull HP granted by each frame (combat-scaling.js).
    FRAMES: { frigate: 0, destroyer: 120, cruiser: 300, heavycruiser: 600, battlecruiser: 850, battleship: 1200, capital: 4000, supercapital: 10000, titan: 22000 },
    // Fixed sector threat by tier 1–10: enemy HP/shield, damage multiplier, salvage parts and bounty metal.
    ROWS: extend([null,
      { hp: 90, shield: 0, damage: 1, parts: 1, bounty: 4 },
      { hp: 220, shield: 0, damage: 1, parts: 1, bounty: 10 },
      { hp: 650, shield: 100, damage: 1.4, parts: 2, bounty: 40 },
      { hp: 1500, shield: 200, damage: 2, parts: 3, bounty: 90 },
      { hp: 4200, shield: 600, damage: 3.2, parts: 6, bounty: 180 },
      { hp: 9000, shield: 1500, damage: 4.8, parts: 10, bounty: 310 },
      { hp: 22000, shield: 4000, damage: 7, parts: 20, bounty: 450 },
      { hp: 42000, shield: 7000, damage: 9, parts: 32, bounty: 640 },
      { hp: 78000, shield: 12000, damage: 11, parts: 50, bounty: 870 },
      { hp: 125000, shield: 22000, damage: 14, parts: 80, bounty: 1500 }
    ])
  });
})();
