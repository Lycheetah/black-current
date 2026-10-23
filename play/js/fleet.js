// fleet.js — THE ROSTER BECOMES REAL SHIPS
//
// THIS FILE OWNS ITS OWN INPUT, ITS OWN HUD AND ITS OWN DATA, deliberately —
// the same pattern as `energy.js`, `feel.js` and `hardpoints.js`. Two seats are
// live in this repo and `engine.js` is the file most likely to be corrupted by
// both of us editing it at once.
//
// WHAT THIS FIXES
// ---------------
// 🔴 NOT ONE PRESET IN THE GAME USED A MOUNT ABOVE 14px. `designer.js:40-97`
//    ships five hulls whose cannons are all 12-14px — the "Heavy Dreadnought"
//    preset included. Traverse is derived from mount radius, so EVERY GUN IN
//    THE GAME WAS A LIGHT MOUNT. The keystone stat has existed in code since
//    hardpoints.js landed and has never once been visible on screen, because
//    nothing was ever authored big enough to feel slow.
//
// THE GEOMETRY IS NOT REBUILT HERE. `SpringNode` remains the one ship format
// and `PRESET_DESIGNS` remains the one design shape — these are simply more of
// them, authored across the whole radius range the maths already supported.
//
// ⭐ MOUNT RADIUS PICKS THE WEAPON. HULL CLASS SCALES THE RATE. That is Mac's
//    ruling of 2026-08-16 (DREADNOUGHT_PLAN.md, PHASE 5) expressed as two
//    independent dials, which is why a 5-node hull carrying a 32px siege gun —
//    the SUPER BATTLE FRIGATE — is a real and different thing rather than a
//    label. The two dials disagree about what it is. That disagreement IS the
//    class.
//
// NO ES MODULES. Classic script sharing globals. An `export` would defer this
// file and break the load order in index.html.

(function () {
  'use strict';

  // ---- THE MOUNT LADDER -------------------------------------------------
  // Radius band -> which weapon that hardpoint fires. Bands are inclusive of
  // `min` and run to the next band's `min`. ⛔ These bands are the reason to
  // author a big gun at all; do not narrow them without re-authoring the hulls.
  const MOUNT_LADDER = [
    { min: 0,  cls: 'POINT',  weapon: 'spitter', tint: '#8FA6C4' },
    { min: 10, cls: 'LIGHT',  weapon: 'twin',    tint: '#00f3ff' },
    { min: 16, cls: 'MEDIUM', weapon: 'laser',   tint: '#bc13fe' },
    { min: 23, cls: 'HEAVY',  weapon: 'homing',  tint: '#39ff14' },
    { min: 31, cls: 'SIEGE',  weapon: 'railgun', tint: '#ff3366' }
  ];

  // ---- THE HULL LADDER --------------------------------------------------
  // Node count -> class modifiers. ⭐ THE FLAT LADDER (GAME_VISION.md): `rate`
  // and `dmg` multiply out to ~1.0 net DPS at every tier ON PURPOSE. Power is
  // LATERAL. A titan is not a bigger number, it is a different shape of number:
  // ponderous, heavy-hitting, and beatable by something small that gets inside
  // its arc. ⛔ Never "fix" these to make a titan strictly stronger.
  const HULL_LADDER = [
    { min: 0,  cls: 'FRIGATE',    rate: 1.00, dmg: 1.00 }, // net 1.00
    { min: 8,  cls: 'CRUISER',    rate: 0.80, dmg: 1.30 }, // net 1.04
    { min: 14, cls: 'BATTLESHIP', rate: 0.62, dmg: 1.75 }, // net 1.09
    { min: 25, cls: 'TITAN',      rate: 0.45, dmg: 2.40 }  // net 1.08
  ];

  function bandFor(table, n) {
    let hit = table[0];
    for (const b of table) if (n >= b.min) hit = b;
    return hit;
  }

  /* ==========================================================================
     ⭐⭐ THE STARTER CHASSIS — ONE DEFINITION, THREE CONSUMERS
     ==========================================================================
     Mac's ruling, 2026-08-17: *"the starter ship needs a start chassis 3 slots
     only"*, and earlier the same day *"it should start with a small chassis."*

     ⛔ THIS WAS DUPLICATED AND NOBODY NOTICED. `engine.js` built the starting
     nodes by hand, and `designer.js` kept a BYTE-IDENTICAL copy inside
     `PRESET_DESIGNS.balanced`. Two definitions of the ship every player begins
     in is exactly the split this repo treats as its only real failure: edit one
     and the designer opens a different hull from the one actually flying, with
     no error anywhere. Both now read this, and `shipyard.js` uses it for NEW HULL.

     ⭐ THREE SLOTS, AND THE CORE IS NOT ONE OF THEM. A core wears no sprite and
     mounts nothing — it IS the hull, which is why `COST_BASE.core` is 0 and why
     `sprites.js` measures every gun against it. So "3 slots" is 3 non-core
     nodes: one forward cannon and two pods.

     ⭐ CORE 26 -> 18. The starter has to read as SMALL beside anything Mac
     authors in the shipyard, or the scale ladder has no floor to climb from.
     Reach falls 50 -> 42, so the hull is 84px across instead of 100.
     ========================================================================== */
  const STARTER_HULLS = {
    ai_hunters: {
      id: 'ai_hunters_starter',
      frame: 'AI Hunters Starter',
      name: 'AI HUNTERS',
      desc: 'Wedge scout. Dual forward spitters with high agility.',
      color: '#00f3ff',
      primaryWeapon: 'spitter',
      secAbility: 'dash',
      nodes: [
        { dx: 0, dy: 0, radius: 18, type: 'core' },
        { dx: 26, dy: -12, radius: 10, type: 'cannon' },
        { dx: 26, dy: 12, radius: 10, type: 'cannon' },
        { dx: -24, dy: 0, radius: 10, type: 'thruster' }
      ]
    },
    techno_angels: {
      id: 'techno_angels_starter',
      frame: 'Techno Angels Starter',
      name: 'TECHNO ANGELS',
      desc: 'Glass halo chassis. Forward crystal emitter with twin shield buds.',
      color: '#00ffcc',
      primaryWeapon: 'spitter',
      secAbility: 'shield',
      nodes: [
        { dx: 0, dy: 0, radius: 18, type: 'core' },
        { dx: 28, dy: 0, radius: 12, type: 'cannon' },
        { dx: -20, dy: -16, radius: 10, type: 'shield' },
        { dx: -20, dy: 16, radius: 10, type: 'shield' }
      ]
    },
    crimson_blood: {
      id: 'crimson_blood_starter',
      frame: 'Crimson Blood Starter',
      name: 'CRIMSON BLOOD',
      desc: 'Aggressive hunter. Forward bio-cannon with chitin ramming barbs.',
      color: '#ff3366',
      primaryWeapon: 'spitter',
      secAbility: 'dash',
      nodes: [
        { dx: 0, dy: 0, radius: 18, type: 'core' },
        { dx: 28, dy: 0, radius: 12, type: 'cannon' },
        { dx: 22, dy: -14, radius: 8, type: 'spike' },
        { dx: 22, dy: 14, radius: 8, type: 'spike' },
        { dx: -22, dy: 0, radius: 10, type: 'thruster' }
      ]
    },
    cosmic_light: {
      id: 'cosmic_light_starter',
      frame: 'Cosmic Light Starter',
      name: 'COSMIC LIGHT',
      desc: 'Solar flare chassis. Balanced dual pulse cannons & vitality pods.',
      color: '#ffb703',
      primaryWeapon: 'spitter',
      secAbility: 'shield',
      nodes: [
        { dx: 0, dy: 0, radius: 18, type: 'core' },
        { dx: 28, dy: 0, radius: 12, type: 'cannon' },
        { dx: -22, dy: -16, radius: 10, type: 'pod' },
        { dx: -22, dy: 16, radius: 10, type: 'pod' }
      ]
    },
    black_hole: {
      id: 'black_hole_starter',
      frame: 'Black Hole Starter',
      name: 'BLACK HOLE',
      desc: 'Void singularity chassis. Piercing heavy beam spitter & shield membrane.',
      color: '#bc13fe',
      primaryWeapon: 'laser',
      secAbility: 'emp',
      nodes: [
        { dx: 0, dy: 0, radius: 18, type: 'core' },
        { dx: 30, dy: 0, radius: 12, type: 'cannon' },
        { dx: -24, dy: 0, radius: 12, type: 'shield' },
        { dx: -18, dy: -16, radius: 8, type: 'pod' },
        { dx: -18, dy: 16, radius: 8, type: 'pod' }
      ]
    },
    chaos: {
      id: 'chaos_starter',
      frame: 'Chaos Starter',
      name: 'CHAOS FACTION',
      desc: 'Volatile kinetic bio-chassis. High-speed split cannon and agile thrusters.',
      color: '#39ff14',
      primaryWeapon: 'spitter',
      secAbility: 'mine',
      nodes: [
        { dx: 0, dy: 0, radius: 18, type: 'core' },
        { dx: 26, dy: -10, radius: 10, type: 'cannon' },
        { dx: 26, dy: 10, radius: 10, type: 'cannon' },
        { dx: -22, dy: -14, radius: 10, type: 'thruster' },
        { dx: -22, dy: 14, radius: 10, type: 'thruster' }
      ]
    },
    balanced: {
      id: 'ai_hunters_starter',
      frame: 'AI Hunters Starter',
      name: 'AI HUNTERS',
      desc: 'Wedge scout. Dual forward spitters with high agility.',
      color: '#00f3ff',
      primaryWeapon: 'spitter',
      secAbility: 'dash',
      nodes: [
        { dx: 0, dy: 0, radius: 18, type: 'core' },
        { dx: 26, dy: -12, radius: 10, type: 'cannon' },
        { dx: 26, dy: 12, radius: 10, type: 'cannon' },
        { dx: -24, dy: 0, radius: 10, type: 'thruster' }
      ]
    },
    assault: {
      id: 'chaos_starter',
      frame: 'Chaos Starter',
      name: 'CHAOS FACTION',
      desc: 'Volatile kinetic bio-chassis. High-speed split cannon and agile thrusters.',
      color: '#39ff14',
      primaryWeapon: 'spitter',
      secAbility: 'mine',
      nodes: [
        { dx: 0, dy: 0, radius: 18, type: 'core' },
        { dx: 26, dy: -10, radius: 10, type: 'cannon' },
        { dx: 26, dy: 10, radius: 10, type: 'cannon' },
        { dx: -22, dy: -14, radius: 10, type: 'thruster' },
        { dx: -22, dy: 14, radius: 10, type: 'thruster' }
      ]
    },
    mortar: {
      id: 'crimson_blood_starter',
      frame: 'Crimson Blood Starter',
      name: 'CRIMSON BLOOD',
      desc: 'Aggressive hunter. Forward bio-cannon with chitin ramming barbs.',
      color: '#ff3366',
      primaryWeapon: 'spitter',
      secAbility: 'dash',
      nodes: [
        { dx: 0, dy: 0, radius: 18, type: 'core' },
        { dx: 28, dy: 0, radius: 12, type: 'cannon' },
        { dx: 22, dy: -14, radius: 8, type: 'spike' },
        { dx: 22, dy: 14, radius: 8, type: 'spike' },
        { dx: -22, dy: 0, radius: 10, type: 'thruster' }
      ]
    },
    seeker: {
      id: 'black_hole_starter',
      frame: 'Black Hole Starter',
      name: 'BLACK HOLE',
      desc: 'Void singularity chassis. Piercing heavy beam spitter & shield membrane.',
      color: '#bc13fe',
      primaryWeapon: 'laser',
      secAbility: 'emp',
      nodes: [
        { dx: 0, dy: 0, radius: 18, type: 'core' },
        { dx: 30, dy: 0, radius: 12, type: 'cannon' },
        { dx: -24, dy: 0, radius: 12, type: 'shield' },
        { dx: -18, dy: -16, radius: 8, type: 'pod' },
        { dx: -18, dy: 16, radius: 8, type: 'pod' }
      ]
    },
    titan: {
      id: 'techno_angels_starter',
      frame: 'Techno Angels Starter',
      name: 'TECHNO ANGELS',
      desc: 'Glass halo chassis. Forward crystal emitter with twin shield buds.',
      color: '#00ffcc',
      primaryWeapon: 'spitter',
      secAbility: 'shield',
      nodes: [
        { dx: 0, dy: 0, radius: 18, type: 'core' },
        { dx: 28, dy: 0, radius: 12, type: 'cannon' },
        { dx: -20, dy: -16, radius: 10, type: 'shield' },
        { dx: -20, dy: 16, radius: 10, type: 'shield' }
      ]
    }
  };



  const STARTER_CHASSIS = STARTER_HULLS.ai_hunters;


  /* ==========================================================================
     ⭐⭐ THE SCALE LADDER — MAC'S RULING, 2026-08-17
     ==========================================================================
     *"a titan can not be as big as a frigate and a citadel etc."*

     🔴 THE MEASURED DEFECT. Across the whole authored roster the CORE grew
     18 -> 46 (2.5x) while the GUNS grew 6 -> 38 (6.3x). The body could not keep
     up with its own armament, so the biggest ships read as a pile of barrels
     with no ship inside — exactly what Mac photographed at 3:11pm.

     ⭐ `scale` multiplies the LAYOUT (dx, dy) and the CORE radius only. It is
     applied ONCE, at parse time, straight into the authored data — so every
     consumer (fleet, bay, designer, the engine) receives one already-correct
     ship. There is no draw-time multiplier and therefore no way for the drawn
     hull and the simulated hull to disagree.

     ⛔⛔ IT MUST NEVER TOUCH A CANNON, POD, SHIELD, SPIKE OR THRUSTER RADIUS.
     `mountBand(radius)` picks the WEAPON and traverse is 1/radius, and
     `costOfNode` prices off radius too. Scaling a hull "up" by scaling every
     node would silently re-band every gun in the game — a 14px LIGHT on a 1.7x
     hull becomes a 24px HEAVY, and nine ships would change what they fire
     without one line of balance being edited. THAT is the trap this field
     exists to avoid. Layout and core only.

     ⚠ CONSEQUENCE TO WATCH, STATED NOT HIDDEN: because node radii do not grow,
     a capital's collision circles are now spread further apart, so a small ship
     can fly BETWEEN a titan's hardpoints. That may be excellent (gaps in a
     capital are real) or may read as a colander. Only Mac can say.

     MEASURED reach (max |offset| + radius) before -> after:
       interceptor  33 ->  33      frigate  49 ->  51
       lanceCutter  70 ->  74      SBF      82 ->  94
       destroyer    69 ->  89      battleship 84 -> 143
       dreadnought 106 -> 228      titan   147 -> 368
       leviathan   173 -> 502
     Ratio smallest:largest was 5.2x. It is now 15x.
     ========================================================================== */
  function applyScale(hull) {
    const s = hull.scale || 1;
    if (s === 1 || hull._scaled) { hull._scaled = true; return hull; }
    for (const n of hull.nodes) {
      n.dx = Math.round(n.dx * s);
      n.dy = Math.round(n.dy * s);
      if (n.type === 'core') n.radius = Math.round(n.radius * s);
    }
    hull._scaled = true;
    return hull;
  }

  // ---- THE ROSTER -------------------------------------------------------
  // Forward is +X. A hull is symmetric about the X axis, because an asymmetric
  // silhouette reads as damage rather than as design.
  //
  // ⚠ `nodes` uses the SAME shape as PRESET_DESIGNS so `engine.applyDesign()`
  //    consumes a hull unchanged. This is an ADAPTER on an existing truth, not
  //    a second ship format.
  /* ⛔⛔ THE ROSTER IS EMPTY, AND THAT IS MAC'S RULING OF 2026-08-17:
     *"remove the premade ones."* Twenty hulls I authored were cut to nine that
     morning and to ZERO that afternoon.

     ⭐ THIS FILE IS NOT THE ROSTER. It is the two LADDERS — mount radius -> what
     a gun IS, node count -> what a hull IS — plus the parts catalogue and the
     GP pricing curve. Those are load-bearing: `hardpoints.js` asks `mountBand`
     what every cannon fires, `bay.js` builds its parts list from `equips()`,
     and the designer prices every socket through `costOfNode`. Deleting the
     ships did not delete any of that, which is exactly why the ships were safe
     to delete.

     ⚖ THE SHIPS ARE MAC'S. He is authoring them and exporting them with the bay
     tool (see PLAN_2026-08-17.md). A hull dropped in here must carry:
       id, frame, mark, scale, color, primaryWeapon, secAbility, nodes[]
     where `scale` multiplies LAYOUT AND CORE RADIUS ONLY — never a cannon, pod,
     shield, spike or thruster radius, or every gun in the game silently
     re-bands. `applyScale()` below enforces that and is the one place it
     happens. */
  const FLEET_HULLS = {};

  /* ⭐ BAKED ONCE, AT PARSE TIME, INTO THE AUTHORED DATA. Every consumer —
     `fleet.equip`, `bay.js`, the designer, `engine.applyDesign` — reads
     `FLEET_HULLS` and therefore reads the SAME already-scaled ship. A
     draw-time multiplier would have been a second ship shape, and a drawn hull
     that disagrees with the simulated one is the split this repo treats as its
     only real failure. */
  for (const k in FLEET_HULLS) applyScale(FLEET_HULLS[k]);

  /* ⭐ ORDER IS THE LADDER — `f` walks up it, `F` walks back down. Derived from
     the roster rather than hand-listed, so it can never name a hull that does
     not exist and can never miss one Mac adds. With the roster empty it is
     empty, and `cycle()` below says so instead of throwing. */
  const ORDER = Object.keys(FLEET_HULLS);

  const STASH_KEY = 'bcforge_fleet_stash_v1';

  // ---- THE EQUIPMENT CATALOG --------------------------------------------
  // ⭐⭐ THE EQUIPMENT LIST WRITES ITSELF FROM THE MOUNT LADDER. A cannon at
  //    6px and a cannon at 36px are not the same part with a different sprite:
  //    they fire DIFFERENT WEAPONS, swing at different speeds and cover
  //    different arcs, because `hardpoints.js` derives all three from radius.
  //    Radius stopped being decoration the moment anything read it.
  //
  // ⛔ THESE ARE NOT SEPARATE NODE TYPES. Every entry below is one of the five
  //    types the engine already renders and scores. Nothing new to draw,
  //    nothing new to validate, no second parts system.
  const MOUNTS = [
    { r: 6,  title: 'Needle Mount' },
    { r: 9,  title: 'Point Mount' },
    { r: 12, title: 'Light Mount' },
    { r: 14, title: 'Light Mount II' },
    { r: 18, title: 'Medium Mount' },
    { r: 21, title: 'Medium Mount II' },
    { r: 26, title: 'Heavy Mount' },
    { r: 29, title: 'Heavy Mount II' },
    { r: 33, title: 'Siege Mount' },
    { r: 38, title: 'Spinal Lance' }
  ];

  const SUPPORT = [
    { type: 'pod',      icon: '🟢', r: 10, title: 'Micro Pod',      desc: 'Small HP buffer. Cheap filler mass.' },
    { type: 'pod',      icon: '🟢', r: 14, title: 'Vitality Pod',   desc: 'Standard HP buffer.' },
    { type: 'pod',      icon: '🟢', r: 18, title: 'Bulk Pod',       desc: 'Heavy HP buffer. Widens the silhouette.' },
    { type: 'shield',   icon: '🛡️', r: 12, title: 'Shield Bud',     desc: 'Light shield pool & recharge.' },
    { type: 'shield',   icon: '🛡️', r: 15, title: 'Shield Pod',     desc: 'Standard shield pool & recharge.' },
    { type: 'shield',   icon: '🛡️', r: 19, title: 'Bastion Pod',    desc: 'Deep shield pool. Slow to seat.' },
    { type: 'thruster', icon: '🚀', r: 10, title: 'Trim Fin',       desc: 'Small propulsion & agility gain.' },
    { type: 'thruster', icon: '🚀', r: 12, title: 'Plasma Fin',     desc: 'Standard propulsion & agility gain.' },
    { type: 'thruster', icon: '🚀', r: 15, title: 'Burner Fin',     desc: 'Large propulsion gain. Heavy.' },
    { type: 'spike',    icon: '🗡️', r: 8,  title: 'Chitin Barb',    desc: 'Light ramming spike.' },
    { type: 'spike',    icon: '🗡️', r: 10, title: 'Chitin Spike',   desc: 'Standard ramming spike.' },
    { type: 'spike',    icon: '🗡️', r: 13, title: 'Ram Prow',       desc: 'Heavy ramming spike.' }
  ];

  // Reference radius per type — the size that costs exactly the base price.
  const COST_REF = { core: 26, pod: 14, cannon: 12, spike: 10, thruster: 12, shield: 15 };
  const COST_BASE = { core: 0, pod: 15, cannon: 20, spike: 20, thruster: 25, shield: 35 };

  /* ⭐ GP COST NOW FOLLOWS RADIUS, NOT JUST TYPE. It had to: the moment a 38px
     siege lance became placeable, a flat per-type price meant the biggest gun
     in the game cost the same 20 GP as the smallest. The exponent is above 1
     so scaling up is genuinely expensive rather than linear-cheap.
     ⚖ `core` has base 0, which is why the SCALE LADDER above can grow a core
     without moving a single ship's price. */
  function costOfNode(type, radius) {
    const base = COST_BASE[type] || 0;
    const ref = COST_REF[type] || 12;
    if (!base) return 0;
    return Math.max(1, Math.round(base * Math.pow(Math.max(2, radius) / ref, 1.7)));
  }

  const fleet = {
    hulls: FLEET_HULLS,
    order: ORDER,
    index: -1,          // -1 == "the player's own design, untouched"

    // ---- the two ladders, as pure functions -----------------------------

    // Radius -> mount band. Used by hardpoints.js to decide what a gun IS.
    mountBand(radius) { return bandFor(MOUNT_LADDER, radius); },

    /* Total node count -> hull band. ⚠ COUNTS EVERY NODE, NOT JUST CANNONS.
       An earlier cut of this counted only the battery, and the witness caught
       what that cost: the SIEGE MONITOR — a barge with one 36px spinal gun —
       scored as a FRIGATE, and no hull in the roster could reach TITAN at all.
       Mac's ruling is that a small slot on a LARGER SHIP fires slower "to match
       the ship class", so the class must follow HULL SIZE, which is mass.
       ⭐ This is also what keeps the SUPER BATTLE FRIGATE and the LANCE CUTTER
       honest: their disagreement is MOUNT RADIUS vs HULL SIZE. Counting guns
       would have made that disagreement impossible to express. */
    hullBand(player) {
      if (!player || !player.nodes) return HULL_LADDER[0];
      return bandFor(HULL_LADDER, player.nodes.length);
    },

    costOfNode: costOfNode,

    /* ⭐ ALWAYS A DEEP CLONE. Three consumers mutate what they get back —
       `engine` wraps it in SpringNodes, the designer edits it live, the
       shipyard drags it around. Handing out the shared object would let the
       first ship anyone builds silently rewrite what "starter" means. */
    starterChassis() { return JSON.parse(JSON.stringify(STARTER_CHASSIS)); },
    starterHulls() { return JSON.parse(JSON.stringify(STARTER_HULLS)); },

    /* ⭐ EXPOSED FOR THE SHIPYARD, AND FOR NOTHING ELSE TO COPY. `shipyard.js`
       must honour a non-1 `scale` on an imported hull. It borrows THIS
       function rather than writing its own, because a second copy of the rule
       "scale touches LAYOUT AND CORE RADIUS ONLY" is a second copy that can
       disagree — and the day it does, every gun in the game silently re-bands.
       One law, one implementation, one caller-visible name. */
    applyScale: applyScale,

    /* ⭐ BUILT LAZILY, ON PURPOSE. The traverse and arc printed on every card
       are read from `HP_DEFAULTS` at call time, so the catalogue can never
       drift from the numbers hardpoints.js actually fights with. ONE TRUTH —
       if those constants change, every card changes with them. fleet.js loads
       BEFORE hardpoints.js, so this must not run at parse time. */
    equips() {
      const D = (typeof window !== 'undefined' && window.HP_DEFAULTS) || {
        traverseBase: 0.052, traverseRef: 12, arcA: 2.4, arcB: 0.045, arcMin: 0.6
      };
      const list = [];

      for (const m of MOUNTS) {
        const band = bandFor(MOUNT_LADDER, m.r);
        const degPerSec = D.traverseBase * (D.traverseRef / m.r) * 60 * 180 / Math.PI;
        const arcDeg = Math.max(D.arcMin, D.arcA - m.r * D.arcB) * 2 * 180 / Math.PI;
        const wep = (typeof WEAPON_TYPES !== 'undefined' && WEAPON_TYPES[band.weapon])
          ? WEAPON_TYPES[band.weapon].title : band.weapon;
        list.push({
          id: 'mount_' + m.r,
          title: m.title + ' · ' + m.r + 'px',
          icon: '🫧',
          desc: band.cls + ' — fires ' + wep + '. Swings ' + Math.round(degPerSec) +
                '&deg;/s across a ' + Math.round(arcDeg) + '&deg; arc.',
          type: 'cannon',
          radius: m.r,
          cost: costOfNode('cannon', m.r)
        });
      }

      for (const s of SUPPORT) {
        list.push({
          id: s.type + '_' + s.r,
          title: s.title + ' · ' + s.r + 'px',
          icon: s.icon,
          desc: s.desc,
          type: s.type,
          radius: s.r,
          cost: costOfNode(s.type, s.r)
        });
      }

      return list;
    },

    // ---- equipping ------------------------------------------------------

    /* ⚠ `engine.applyDesign()` PERSISTS. Switching hulls therefore overwrites
       whatever the player built in the designer — so the first switch stashes
       the existing design and `R` puts it back. A test flight must not cost
       Mac the ship he actually made. */
    _stashOnce() {
      if (localStorage.getItem(STASH_KEY)) return;
      try {
        const own = (window.saveState && saveState.doc && saveState.doc.design) || null;
        if (own) localStorage.setItem(STASH_KEY, JSON.stringify(own));
      } catch (e) { /* a full quota must not block a test flight */ }
    },

    equip(key) {
      const hull = FLEET_HULLS[key];
      if (!hull || !window.engine) return false;
      this._stashOnce();
      this.index = ORDER.indexOf(key);
      engine.applyDesign(JSON.parse(JSON.stringify(hull)));
      this._paint();
      return true;
    },

    /* ⛔ AN EMPTY ROSTER MUST NOT THROW. `% 0` is NaN and would have made `f`
       silently break the ship the moment the presets were removed. There are no
       hulls to cycle until Mac authors one, and the HUD says exactly that
       rather than the key doing nothing with no explanation. */
    cycle(dir) {
      if (!ORDER.length) {
        if (window.garage && garage.banner) {
          garage.banner('No hulls authored yet — build one in the bay (B)', 'warn');
        }
        return;
      }
      const next = (this.index + dir + ORDER.length * 2) % ORDER.length;
      this.equip(ORDER[next]);
    },

    restoreOwn() {
      const raw = localStorage.getItem(STASH_KEY);
      if (!raw || !window.engine) return false;
      try {
        engine.applyDesign(JSON.parse(raw));
        localStorage.removeItem(STASH_KEY);
        this.index = -1;
        this._paint();
        return true;
      } catch (e) { return false; }
    },

    // ---- HUD ------------------------------------------------------------

    _hud: null,

    /* ⛔⛔ THE NAME IS NOT MINE TO INVENT. Mac generates the art and names the
       ship from it. A hull here supplies only the FRAME — the type noun and the
       node graph — and the name is read live from whichever art pack is worn.
       ⚖ ONE ROSTER. There is exactly one source of ship names in this game and
       it is `packs/*.json`, which is Mac's. A second list of names living in
       code is the SPLIT ROSTER this project treats as its only real failure. */
    shipName() {
      if (typeof packRenderer === 'undefined' || !packRenderer.label) return null;
      /* ⛔ `label()` FALLS BACK TO "Legacy Bio" WHEN NO PACK IS WORN — that is a
         renderer's name for having no pack, not a ship's name, and headlining it
         would be inventing a name by accident. Return null and let the caller
         show the frame instead of dressing an absence up as an identity. */
      return packRenderer.activeId ? packRenderer.label() : null;
    },

    _paint() {
      if (!this._hud) return;
      const p = window.engine && engine.player;
      if (!p) return;

      const hb = this.hullBand(p);
      const cur = this.index >= 0 ? FLEET_HULLS[ORDER[this.index]] : null;

      // Census the battery by band so the mount ladder is READABLE, not implied.
      const tally = {};
      for (const nd of p.nodes) {
        if (nd.type !== 'cannon') continue;
        const b = this.mountBand(nd.radius);
        tally[b.cls] = (tally[b.cls] || 0) + 1;
      }
      const bands = MOUNT_LADDER
        .filter(b => tally[b.cls])
        .map(b => `<span style="color:${b.tint}">${b.cls[0]}${tally[b.cls]}</span>`)
        .join(' ');

      /* ⭐ THE HULL'S ACTUAL SIZE, ON SCREEN. Mac's whole complaint of
         2026-08-17 was a RATIO nobody could see, so the ratio is now printed:
         reach in world px, which is the one number that says "this is a titan
         and that was a frigate" without him having to squint at two ships. */
      let reach = 0;
      for (const nd of p.nodes) {
        const d = Math.hypot(nd.targetDx || 0, nd.targetDy || 0) + (nd.radius || 0);
        if (d > reach) reach = d;
      }

      this._hud.innerHTML =
        /* MAC'S SHIP NAME headlines when a pack is worn; the frame is the
           subtitle, because a frame is a chassis spec and the name is the ship.
           With no pack there is no name, so the frame headlines alone — the HUD
           never fills that slot with something nobody chose. */
        (() => {
          const ship = this.shipName();
          const frame = cur ? cur.mark + ' ' + cur.frame : '◇ OWN DESIGN';
          return ship
            ? '<b>' + ship + '</b><br><span style="opacity:.62">' + frame + '</span><br>'
            : '<b>' + frame + '</b><br><span style="opacity:.45">unnamed · press P</span><br>';
        })() +
        '<b>' + hb.cls + '</b> &nbsp; rate &times;' + hb.rate.toFixed(2) +
        ' &nbsp; dmg &times;' + hb.dmg.toFixed(2) +
        ' &nbsp; <span style="opacity:.6">net &times;' + (hb.rate * hb.dmg).toFixed(2) + '</span>' +
        (bands ? '<br>' + bands : '<br><span style="opacity:.5">no guns</span>') +
        ' &nbsp; <span style="opacity:.55">' + Math.round(reach * 2) + 'px across</span>' +
        '<br><span style="opacity:.55">f / F cycle hull &nbsp; r restore yours</span>';
    },

    mount() {
      const el = document.createElement('div');
      el.id = 'fleet-hud';
      el.style.cssText =
        'position:fixed;right:10px;bottom:170px;z-index:60;' +
        'font:11px ui-monospace,Menlo,Consolas,monospace;color:#ffd9a0;' +
        'background:rgba(4,10,14,.72);border:1px solid rgba(255,190,120,.28);' +
        'border-radius:6px;padding:6px 9px;pointer-events:none;line-height:1.5;' +
        'text-align:right;';
      document.body.appendChild(el);
      this._hud = el;
      this._paint();

      window.addEventListener('keydown', (e) => {
        // ⚠ Guarded against text fields the same way every other dial in this
        //    repo is — typing a callsign must not launch a dreadnought.
        const t = e.target;
        if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable)) return;
        if (window.engine && (engine.paused || engine.mapOpen)) return;

        // ⛔ `f` and `r` are chosen because `[`, `]` and `\` are ALREADY
        //    double-bound in this repo (feel.js zoom + shaders.js fog). Staying
        //    clear of them, of the digits (reactor) and of `<`/`>`/`k`
        //    (hardpoints).
        if (e.key === 'f') { this.cycle(1); }
        else if (e.key === 'F') { this.cycle(-1); }
        else if (e.key === 'r' || e.key === 'R') { this.restoreOwn(); }
        else return;

        e.preventDefault();
      });

      setInterval(() => this._paint(), 500);
    }
  };

  window.fleet = fleet;
  window.FLEET_HULLS = FLEET_HULLS;
  window.MOUNT_LADDER = MOUNT_LADDER;
  window.HULL_LADDER = HULL_LADDER;

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => fleet.mount());
  } else {
    fleet.mount();
  }
})();
