/* ==========================================================================
   BUBBLE TANKS: FORGE EDITION - Organism Designer & GP Economy (Module 7)
   360° Node Placement, GP Budget, Node Removal & Relic Organelles
   ========================================================================== */

const ORGANELLE_COSTS = {
  core: 0,
  pod: 15,
  cannon: 20,
  spike: 20,
  thruster: 25,
  shield: 35
};

const PRIMARY_WEAPONS_CATALOG = [
  { id: 'spitter', title: 'Bubble Spitter', icon: '🫧', desc: 'Standard rapid-fire single cannon.', weaponType: 'spitter' },
  { id: 'twin', title: 'Twin Splitter', icon: '💥', desc: 'Dual angled bubble cannon blast.', weaponType: 'twin' },
  { id: 'mortar', title: 'Tri-Spread Mortar', icon: '🔱', desc: 'Lobbed area-of-effect plasma mortars.', weaponType: 'mortar' },
  { id: 'laser', title: 'Bio-Laser Tendril', icon: '⚡', desc: 'Continuous piercing damage beam.', weaponType: 'laser' },
  { id: 'homing', title: 'Homing Spore Array', icon: '🔮', desc: 'Tracking swarm bio-rockets.', weaponType: 'homing' },
  { id: 'railgun', title: 'Bio-Needle Railgun', icon: '🎯', desc: 'High-velocity piercing projectile line.', weaponType: 'railgun' }
];

const SECONDARY_ACTIVES_CATALOG = [
  { id: 'shield', title: 'Force Membrane Shield', icon: '🛡️', desc: 'Absorbs 80 incoming hit damage.', secAbility: 'shield' },
  { id: 'emp', title: 'Bio-Electric EMP', icon: '⚡', desc: 'Radial shockwave that stuns & clears bullets.', secAbility: 'emp' },
  { id: 'dash', title: 'Hydro-Dash Burst', icon: '💨', desc: 'Instant directional propulsion burst.', secAbility: 'dash' },
  { id: 'drone', title: 'Mitosis Drone Pod', icon: '🦠', desc: 'Spawns orbital bodyguard drone cell.', secAbility: 'drone' },
  { id: 'mine', title: 'Bio-Mine Layer', icon: '💣', desc: 'Drops explosive bio-mines behind cell.', secAbility: 'mine' }
];

const ORGANELLE_TYPES = [
  { id: 'pod_vitality', title: 'Vitality Pod', icon: '🟢', desc: '+35 Max HP buffer.', type: 'pod', radius: 14, cost: 15 },
  { id: 'cannon_node', title: 'Cannon Spitter', icon: '🫧', desc: '+10 HP, extra firing arc.', type: 'cannon', radius: 12, cost: 20 },
  { id: 'spike_chitin', title: 'Chitin Spike', icon: '🗡️', desc: '+15 HP, ramming collision spikes.', type: 'spike', radius: 10, cost: 20 },
  { id: 'thruster_plasma', title: 'Plasma Fin', icon: '🚀', desc: '+25% propulsion & agility.', type: 'thruster', radius: 12, cost: 25 },
  { id: 'shield_membrane', title: 'Shield Pod', icon: '🛡️', desc: '+30 HP & shield recharge.', type: 'shield', radius: 15, cost: 35 }
];

const PRESET_DESIGNS = (typeof fleet !== 'undefined' && fleet.starterHulls)
  ? fleet.starterHulls()
  : {
      ai_hunters: {
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
      }
    };


/* ============================================================================
   ⭐⭐ THIS FILE IS NOW DATA ONLY — MAC, 2026-08-17:
       *"we only need one tool bro to do it properly."*
   ============================================================================
   Everything above is a TABLE. Nothing above draws, edits or saves a ship.

   The `OrganismDesigner` class that used to live here was the game's SECOND
   ship editor, and a second editor is a second answer to "what does this hull
   look like". `js/shipyard.js` is the one tool now; the class is preserved
   whole at `_retired/designer-ui-class.js` with a line-by-line map of where
   each of its features went, because a retirement nobody can audit is just a
   deletion with a nicer word.

   ⛔ THE TABLES STAY HERE ON PURPOSE. `shipyard.js` READS them by `typeof` —
   it does not copy them. Moving or duplicating `PRESET_DESIGNS`,
   `SECONDARY_ACTIVES_CATALOG` or the cost tables would create exactly the
   drift this merge existed to remove. `index.html` still loads this file
   before `shipyard.js`, and must keep doing so.

   ⭐ THE REDIRECT BELOW IS WHY `engine.js` NEEDED NO EDIT. `engine.js:137`
   (Tab) and `engine.js:330` (the touch button) both call
   `organismDesigner.openDesigner()`, guarded by `typeof`. Keeping that one
   method as a redirect sends every legacy entry point into the one tool
   without touching the file two seats are both live in.
   ========================================================================== */

const organismDesigner = {
  /* Tab, the DESIGNER button and the touch button all arrive here. */
  openDesigner() {
    if (window.shipyard) { shipyard.show(); return; }
    console.warn('[designer] shipyard.js did not load — no ship editor available.');
  },
  /* ⚠ KEPT SO A STALE CALLER FAILS LOUDLY RATHER THAN SILENTLY.
     Nothing in the repo calls these any more (verified by grep before the
     retirement). If one ever does, it gets the one tool, not a no-op. */
  saveAndApply() { if (window.shipyard) shipyard.testFlight(); },
  renderBuilderCanvas() { if (window.shipyard && shipyard.open) shipyard.paint(); }
};

/* The on-screen DESIGNER button lived inside the retired class's `initUI`, so
   it lost its listener with it. Rewire it here, and say on its face which tool
   it opens — a button labelled DESIGNER that opens THE SHIPYARD is a small lie
   the player has to learn to ignore. */
window.addEventListener('DOMContentLoaded', () => {
  const b = document.getElementById('btn-open-designer');
  if (b) {
    b.textContent = '🛠️ SHIPYARD (TAB)';
    b.addEventListener('click', () => organismDesigner.openDesigner());
  }
  /* The retired overlay is still in index.html. It can never be shown now, but
     an invisible modal that can be reached by a stray `display:flex` is a trap
     for the next person, so it is explicitly retired in the DOM as well. */
  const ov = document.getElementById('designer-overlay');
  if (ov) {
    ov.style.display = 'none';
    ov.setAttribute('data-retired', 'superseded by js/shipyard.js 2026-08-17');
  }
});
