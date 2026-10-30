/* ==========================================================================
   BUBBLE TANKS: BLACK CURRENT — Identity, Campaign Truth & The One Save
   ==========================================================================

   ⚠ THIS FILE IS THE SAVE. Before it existed there were two competing keys —
     `biotank_forge_progress` (mass, evolution, relics) and `biotank_forge_player`
     (the design) — written by two systems that did not know about each other, so
     a design could be saved while the progression that paid for it was not. Every
     new feature would have added a third key. There is now ONE document,
     `biotank_forge_save_v2`, ONE migration, and every other system reads and
     writes through `saveState`.

   ⚠ THE CAMPAIGN IS AUTHORED, NOT ROLLED. Enemy placement inside a room may stay
     random. The player-facing promise — biome, objective, reward, hazard, music
     — may not. A mission the player cannot be told about in advance is not a
     mission, it is a room with monsters in it. `MISSIONS` is a deterministic
     table and `missionFor()` is a pure function of coordinates.

   ⚠ CREW MODIFIERS MUST HAVE A CALLER. A balance constant that nothing reads is
     a lie printed on a card. Each field below names the exact call site that
     consumes it, and if you delete that call site you must delete the field.

   ⚠ NEVER INJECT A CALLSIGN AS HTML. It is player text that reaches the HUD, the
     mission card, the reward card and the exported `.biotank` string.
     `sanitizeCallsign` is the only door it comes through.
   ========================================================================== */

const SAVE_KEY = 'biotank_forge_save_v2';
const LEGACY_PROGRESS_KEY = 'biotank_forge_progress';
const LEGACY_DESIGN_KEY = 'biotank_forge_player';

/* ── CREWS — four readable play identities ────────────────────────────────────
   Fictional current crews. Not a morality system, not an alignment lock: every
   crew can finish every route. The modifiers are deliberately small so that
   taste stays a valid reason to pick one. */
const CREWS = {
  ironwake: {
    id: 'ironwake',
    name: 'IRONWAKE',
    feel: 'Heavy. Plated. Relentless.',
    edge: '+20 hull · takes 30% less ramming damage',
    trim: '#ffb703',
    accent: '#ff8a3d',
    mark: '⛓',
    /* consumed by EngineCore.recalculatePlayerStats() */
    hpBonus: 20,
    /* consumed by EngineCore.playerTakeDamage() on contact damage only */
    contactResist: 0.7,
    accelScale: 1,
    fireRateScale: 1,
    gpScale: 1
  },
  neonVeil: {
    id: 'neonVeil',
    name: 'NEON VEIL',
    feel: 'Fast. Evasive. Surgical.',
    edge: '+18% thrust · actives recharge 25% faster',
    trim: '#bc13fe',
    accent: '#00f3ff',
    mark: '◈',
    hpBonus: 0,
    contactResist: 1,
    /* consumed by EngineCore.update() movement */
    accelScale: 1.18,
    /* consumed by EngineCore.triggerSecondaryAbility() */
    cooldownScale: 0.75,
    fireRateScale: 1,
    gpScale: 1
  },
  redlineBloom: {
    id: 'redlineBloom',
    name: 'REDLINE BLOOM',
    feel: 'Aggressive. Volatile. Loud.',
    edge: 'fires 18% faster · 10 less hull',
    trim: '#ff3366',
    accent: '#ff6b3d',
    mark: '✷',
    hpBonus: -10,
    contactResist: 1,
    accelScale: 1,
    /* consumed by EngineCore.update() shoot cadence — LOWER is faster */
    fireRateScale: 0.82,
    gpScale: 1
  },
  crownlessChoir: {
    id: 'crownlessChoir',
    name: 'CROWNLESS CHOIR',
    feel: 'Strange. Relic-hungry. Clever.',
    edge: '+15% Gene Points from all biomass',
    trim: '#bc13fe',
    accent: '#ffd166',
    mark: '♆',
    hpBonus: 0,
    contactResist: 1,
    accelScale: 1,
    fireRateScale: 1,
    /* consumed by ProgressionSystem.getTotalGP() */
    gpScale: 1.15
  }
};

/* ── HULL STANCE — silhouette, not a second physics model ────────────────────
   The `nodes` array stays the mechanical truth. A stance moves the base core
   radius, changes the rim treatment the renderer draws, and names a starter
   preset. It does not invent a new movement model. */
const HULL_STYLES = {
  ai_hunters: {
    id: 'ai_hunters',
    name: 'AI HUNTERS',
    desc: 'Wedge scout. Dual forward spitters with high agility.',
    coreRadius: 18,
    rim: 'blade',
    preset: 'ai_hunters'
  },
  techno_angels: {
    id: 'techno_angels',
    name: 'TECHNO ANGELS',
    desc: 'Glass halo chassis. Forward crystal emitter with twin shield buds.',
    coreRadius: 18,
    rim: 'crown',
    preset: 'techno_angels'
  },
  crimson_blood: {
    id: 'crimson_blood',
    name: 'CRIMSON BLOOD',
    desc: 'Aggressive hunter. Forward bio-cannon with chitin ramming barbs.',
    coreRadius: 18,
    rim: 'plate',
    preset: 'crimson_blood'
  },
  cosmic_light: {
    id: 'cosmic_light',
    name: 'COSMIC LIGHT',
    desc: 'Solar flare chassis. Balanced dual pulse cannons & vitality pods.',
    coreRadius: 18,
    rim: 'crown',
    preset: 'cosmic_light'
  },
  black_hole: {
    id: 'black_hole',
    name: 'BLACK HOLE',
    desc: 'Void singularity chassis. Piercing heavy beam spitter & shield membrane.',
    coreRadius: 18,
    rim: 'plate',
    preset: 'black_hole'
  },
  chaos: {
    id: 'chaos',
    name: 'CHAOS FACTION',
    desc: 'Volatile kinetic bio-chassis. High-speed split cannon and agile thrusters.',
    coreRadius: 18,
    rim: 'blade',
    preset: 'chaos'
  }
};


const PALETTES = {
  'cyan-ion': { id: 'cyan-ion', name: 'Cyan Ion', color: '#00f3ff' },
  'bio-emerald': { id: 'bio-emerald', name: 'Bio Emerald', color: '#39ff14' },
  'amethyst-void': { id: 'amethyst-void', name: 'Amethyst Void', color: '#bc13fe' },
  'solar-flare': { id: 'solar-flare', name: 'Solar Flare', color: '#ffb703' },
  'crimson-plasma': { id: 'crimson-plasma', name: 'Crimson Plasma', color: '#ff3366' },
  'black-current': { id: 'black-current', name: 'Black Current', color: '#5a7fa8', locked: 'return-through-the-black-current' },
  'gold-crown': { id: 'gold-crown', name: 'Gold Crown', color: '#ffd166', locked: 'boss-solar' }
};

/* Identity only. A decal never touches a stat — that is the whole point of
   separating STYLE from COMBAT in the garage. */
const DECALS = {
  none: { id: 'none', name: 'No Mark', glyph: '', always: true },
  'crew-mark': { id: 'crew-mark', name: 'Crew Mark', glyph: '◆', always: true },
  'dock-nine': { id: 'dock-nine', name: 'Dock Nine', glyph: '⑨', from: 'wake-at-dock-nine' },
  'reef-toll': { id: 'reef-toll', name: 'Reef Toll', glyph: '≋', from: 'reef-toll' },
  'titan-mark': { id: 'titan-mark', name: 'Titan Debt', glyph: '⬢', from: 'boss-titan' },
  'queen-mark': { id: 'queen-mark', name: 'Queen Debt', glyph: '⬡', from: 'boss-queen' },
  'solar-mark': { id: 'solar-mark', name: 'Solar Debt', glyph: '✺', from: 'boss-solar' },
  'void-mark': { id: 'void-mark', name: 'Void Debt', glyph: '✧', from: 'boss-void' },
  'current-scar': { id: 'current-scar', name: 'Current Scar', glyph: '⌁', from: 'pressure-line' }
};

/* ── THE AUTHORED ROUTE ──────────────────────────────────────────────────────
   Ring 0 and ring 1 are written by hand because they carry the campaign's
   promise. Rings 2–3 are DERIVED — deterministically, from coordinates, so the
   same sector always tells the player the same thing — and the four corners are
   written by hand again because they are the point of the act. */
const BIOMES = {
  'starter-haven': { name: 'Dock Nine', tint: '#00f3ff', music: 'HAVEN' },
  reef: { name: 'The Reef', tint: '#39ff14', music: 'REEF' },
  'pressure-line': { name: 'Pressure Line', tint: '#bc13fe', music: 'PRESSURE' },
  'black-current': { name: 'Black Current', tint: '#5a7fa8', music: 'PRESSURE' },
  debt: { name: 'A Debt', tint: '#ff3366', music: 'BOSS' }
};

const HAZARDS = {
  none: { id: 'none', label: 'None' },
  drift: { id: 'drift', label: 'Reef drift — the current pushes you off your line' },
  pressure: { id: 'pressure', label: 'Pressure — hull regen is halved down here' },
  swarm: { id: 'swarm', label: 'Swarm water — hives spawn faster' },
  debt: { id: 'debt', label: 'The guardian does not tire' }
};

const MISSIONS = {
  '0,0': {
    id: 'wake-at-dock-nine',
    act: 1,
    beat: '01 · WAKE AT DOCK NINE',
    biome: 'starter-haven',
    objective: 'clear',
    promise: 'Fit your first build and clear the dock. Nothing here is friendly, but nothing here is fast.',
    hazard: 'none',
    reward: { type: 'decal', id: 'dock-nine', label: 'Dock Nine decal' }
  },
  '1,0': {
    id: 'reef-toll-east',
    act: 1,
    beat: '02 · REEF TOLL · EAST',
    biome: 'reef',
    objective: 'clear',
    promise: 'The east reef charges a toll in hull. Pay it fast and the current pays you back.',
    hazard: 'drift',
    reward: { type: 'rep', id: 'redlineBloom', label: '+2 Redline Bloom reputation' }
  },
  '-1,0': {
    id: 'reef-toll-west',
    act: 1,
    beat: '02 · REEF TOLL · WEST',
    biome: 'reef',
    objective: 'clear',
    promise: 'West water is slower and meaner. Armour reads this room better than speed.',
    hazard: 'swarm',
    reward: { type: 'rep', id: 'ironwake', label: '+2 Ironwake reputation' }
  },
  '0,-1': {
    id: 'reef-toll-north',
    act: 1,
    beat: '02 · REEF TOLL · NORTH',
    biome: 'reef',
    objective: 'clear',
    promise: 'North runs thin and bright. Whatever is quickest through here is your build.',
    hazard: 'drift',
    reward: { type: 'rep', id: 'neonVeil', label: '+2 Neon Veil reputation' }
  },
  '0,1': {
    id: 'reef-toll-south',
    act: 1,
    beat: '02 · REEF TOLL · SOUTH',
    biome: 'reef',
    objective: 'clear',
    promise: 'South smells of relic. The Choir says that is worth a scar.',
    hazard: 'swarm',
    reward: { type: 'rep', id: 'crownlessChoir', label: '+2 Crownless Choir reputation' }
  },
  '-3,-3': {
    id: 'boss-titan',
    act: 1,
    beat: '04 · THE FOUR DEBTS · ABYSSAL TITAN',
    biome: 'debt',
    objective: 'boss',
    promise: 'The Titan says a tank should be a wall. Prove otherwise or agree with it.',
    hazard: 'debt',
    reward: { type: 'relic', id: 'titan', label: 'Mythic Relic: Carapace of the Titan' }
  },
  '3,-3': {
    id: 'boss-queen',
    act: 1,
    beat: '04 · THE FOUR DEBTS · HIVE QUEEN',
    biome: 'debt',
    objective: 'boss',
    promise: 'The Queen says a tank should be many. She will show you what she means.',
    hazard: 'debt',
    reward: { type: 'relic', id: 'queen', label: 'Mythic Relic: Brood Chorus' }
  },
  '-3,3': {
    id: 'boss-solar',
    act: 1,
    beat: '04 · THE FOUR DEBTS · SOLAR DREADNOUGHT',
    biome: 'debt',
    objective: 'boss',
    promise: 'The Dreadnought says a tank should be seen. It has never once been ignored.',
    hazard: 'debt',
    reward: { type: 'relic', id: 'solar', label: 'Mythic Relic: Flare Crown' }
  },
  '3,3': {
    id: 'boss-void',
    act: 1,
    beat: '04 · THE FOUR DEBTS · VOID LEVIATHAN',
    biome: 'debt',
    objective: 'boss',
    promise: 'The Leviathan says a tank should be nothing at all. Disagree loudly.',
    hazard: 'debt',
    reward: { type: 'relic', id: 'void', label: 'Mythic Relic: Absence Engine' }
  }
};

/** Boss display name → the relic/mission key everything else uses. */
const BOSS_KEYS = {
  'ABYSSAL TITAN': 'titan',
  'HIVE QUEEN': 'queen',
  'SOLAR DREADNOUGHT': 'solar',
  'VOID LEVIATHAN': 'void'
};

/**
 * The authored record for a sector.
 *
 * ⚠ PURE AND TOTAL. Every one of the 49 sectors gets an answer, the answer never
 * changes between visits, and no `Math.random()` appears anywhere below. That is
 * what lets the launch card promise something before the room is entered.
 */
function missionFor(gridX, gridY) {
  const key = `${gridX},${gridY}`;
  if (MISSIONS[key]) return MISSIONS[key];

  const ring = Math.max(Math.abs(gridX), Math.abs(gridY));
  const biome = ring >= 3 ? 'black-current' : (ring === 2 ? 'pressure-line' : 'reef');
  /* deterministic, not rolled: the parity of the coordinate pair picks the hazard */
  const hazard = ((gridX + gridY) % 2 === 0) ? 'pressure' : 'drift';

  return {
    id: `pressure-line-${key.replace(',', '_')}`,
    act: 1,
    beat: ring >= 3 ? '05 · THE BLACK CURRENT' : '03 · PRESSURE LINE',
    biome,
    objective: 'clear',
    promise: ring >= 3
      ? 'Deep water. The current here remembers every build that came through.'
      : 'Commit to the route. The pressure line does not care which crew you swore to.',
    hazard,
    reward: { type: 'mass', id: 'pressure', label: 'Pressure bounty · +40 biomass' }
  };
}

function defaultSave() {
  const starter = (typeof fleet !== 'undefined' && fleet.starterChassis)
    ? fleet.starterChassis()
    : {
        id: 'ai_hunters_starter',
        frame: 'AI Hunters Starter',
        color: '#00f3ff',
        primaryWeapon: 'spitter',
        secAbility: 'dash',
        nodes: [
          { dx: 0, dy: 0, radius: 18, type: 'core' },
          { dx: 26, dy: -12, radius: 10, type: 'cannon' },
          { dx: 26, dy: 12, radius: 10, type: 'cannon' },
          { dx: -24, dy: 0, radius: 10, type: 'thruster' }
        ]
      };

  return {
    version: 2,
    profile: {
      callsign: '',
      crew: 'ironwake',
      hullStyle: 'ai_hunters',
      decal: 'none',
      palette: 'cyan-ion',
      title: 'Rookie of the Current'
    },
    design: starter,
    builds: { runner: null, bruiser: null, sovereign: null },

    totalMass: 0,
    evolutionLevel: 1,
    campaign: {
      id: 'black-current-v1',
      act: 1,
      missionId: 'wake-at-dock-nine',
      reputation: { ironwake: 0, neonVeil: 0, redlineBloom: 0, crownlessChoir: 0 },
      flags: {},
      clearedMissions: [],
      discoveredSectors: ['0,0'],
      relics: [],
      version: 1
    },
    unlockedRelics: { titan: false, queen: false, solar: false, void: false },
    decals: ['none', 'crew-mark'],
    palettes: ['cyan-ion', 'bio-emerald', 'amethyst-void', 'solar-flare', 'crimson-plasma'],
    chambers: {},
    audio: { muted: false },
    inventory: [],   // B4 salvage hold: [{ type, radius, count }]
    aiCore: null,    // B4 AI core id (AI_CORES), lateral only
    launched: false
  };
}

/**
 * ⚠ THE ONLY DOOR PLAYER TEXT COMES THROUGH.
 * The callsign reaches the HUD, two cards and the exported design string. It is
 * stripped to a small safe alphabet and length-capped here so that no consumer
 * has to remember to be careful — and every consumer still uses `textContent`.
 */
function sanitizeCallsign(raw) {
  return String(raw || '')
    .toUpperCase()
    .replace(/[^A-Z0-9 _\-.]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 14);
}

/* ⭐ B4 AI CORES: Sovereign Eclipse's AI-core mutation, held to the Flat Ladder.
   Every core is a TRADE: one stat up, another down, net ≈ 0. A rare drop offers
   two of these; you fit one; it persists on the save and can be swapped by the
   next core you find. Hooks: thrust (engine move), hull (maxHp), sight (lighting),
   parts (your own part toughness). */
const AI_CORES = {
  swift:     { name: 'SWIFT CORE',     lore: 'A Techno-Angel reflex loop.',        up: '+15% thrust',          down: '−13% hull',  mods: { thrust: 1.15, hull: 0.87 } },
  bulwark:   { name: 'BULWARK CORE',   lore: 'Hunter-forged brass ballast.',       up: '+15% hull',            down: '−13% thrust', mods: { hull: 1.15, thrust: 0.87 } },
  longsight: { name: 'LONGSIGHT CORE',  lore: 'A Horned Archive eye, still open.', up: '+30% sight',           down: '−10% hull',  mods: { sight: 1.3, hull: 0.9 } },
  stitch:    { name: 'STITCH CORE',    lore: 'The Stitch Saint holds parts on.',   up: '+40% part toughness',  down: '−12% hull',  mods: { parts: 1.4, hull: 0.88 } },
};
window.AI_CORES = AI_CORES;

class SaveState {
  constructor() {
    this.doc = defaultSave();
    this.load();
  }

  /**
   * ⚠ ONE MIGRATION FUNCTION, AND IT NEVER DELETES THE OLD KEYS.
   * A player who has been building a tank in the old build must not lose their
   * mass because a save format changed underneath them. The legacy keys are read
   * as a fallback and then left exactly where they are: if this migration is
   * wrong, the evidence to fix it is still on disk.
   */
  load() {
    const fresh = defaultSave();
    let raw = null;
    try {
      raw = localStorage.getItem(SAVE_KEY);
    } catch (e) {
      console.warn('[save] storage unavailable, running in-memory:', e);
      return;
    }

    if (raw) {
      try {
        const parsed = JSON.parse(raw);
        this.doc = this.merge(fresh, parsed);
        return;
      } catch (e) {
        console.warn('[save] v2 document unreadable, falling back to legacy keys:', e);
      }
    }

    /* v1 → v2 */
    try {
      const legacyProgress = JSON.parse(localStorage.getItem(LEGACY_PROGRESS_KEY) || 'null');
      if (legacyProgress) {
        fresh.totalMass = legacyProgress.totalMass || 0;
        fresh.evolutionLevel = legacyProgress.evolutionLevel || 1;
        if (legacyProgress.unlockedRelics) {
          fresh.unlockedRelics = { ...fresh.unlockedRelics, ...legacyProgress.unlockedRelics };
        }
      }
      const legacyDesign = JSON.parse(localStorage.getItem(LEGACY_DESIGN_KEY) || 'null');
      if (legacyDesign && legacyDesign.nodes) fresh.design = legacyDesign;
    } catch (e) {
      console.warn('[save] legacy migration skipped:', e);
    }

    this.doc = fresh;
  }

  /** Shallow-per-section merge so a save written by an older build keeps working. */
  merge(base, incoming) {
    if (!incoming || typeof incoming !== 'object') return base;
    const out = { ...base, ...incoming };
    out.profile = { ...base.profile, ...(incoming.profile || {}) };
    out.campaign = { ...base.campaign, ...(incoming.campaign || {}) };
    out.campaign.reputation = { ...base.campaign.reputation, ...((incoming.campaign || {}).reputation || {}) };
    out.unlockedRelics = { ...base.unlockedRelics, ...(incoming.unlockedRelics || {}) };
    out.builds = { ...base.builds, ...(incoming.builds || {}) };
    out.audio = { ...base.audio, ...(incoming.audio || {}) };
    out.chambers = { ...(incoming.chambers || {}) };
    out.decals = Array.isArray(incoming.decals) ? incoming.decals : base.decals;
    out.palettes = Array.isArray(incoming.palettes) ? incoming.palettes : base.palettes;
    out.inventory = Array.isArray(incoming.inventory) ? incoming.inventory : [];
    out.aiCore = (incoming.aiCore && AI_CORES[incoming.aiCore]) ? incoming.aiCore : null;
    out.profile.callsign = sanitizeCallsign(out.profile.callsign);
    out.version = 2;
    return out;
  }

  /**
   * ⚠ A FAILED WRITE MUST BE VISIBLE. Private-mode Safari and a full quota both
   * throw here. Swallowing that silently is how a player loses an hour and is
   * told nothing — so the failure reaches the console AND the banner.
   */
  save() {
    try {
      localStorage.setItem(SAVE_KEY, JSON.stringify(this.doc));
      return true;
    } catch (e) {
      console.error('[save] WRITE FAILED — progress is not durable:', e);
      if (window.garage) window.garage.banner('SAVE FAILED — progress is not being written to this browser', 'bad');
      return false;
    }
  }

  get profile() { return this.doc.profile; }
  get campaign() { return this.doc.campaign; }

  crew() { return CREWS[this.doc.profile.crew] || CREWS.ironwake; }

  /* B4 SALVAGE: a shot-off part lands in the hold as a SHAPE (type + size
     class), never as stats. Bucketed so the hold stays a short list. */
  addPart(part) {
    const radius = Math.round(part.radius / 2) * 2;
    const inv = this.doc.inventory;
    const quirk = typeof part.quirk === 'string' ? part.quirk : null;
    const rarity = ['rare', 'exotic', 'relic'].includes(part.rarity) ? part.rarity : (quirk ? 'rare' : 'common');
    const hit = inv.find(p => p.type === part.type && p.radius === radius && (p.quirk || null) === quirk && (p.rarity || 'common') === rarity);
    if (hit) hit.count++; else inv.push({ type: part.type, radius, count: 1, ...(quirk ? { quirk, rarity } : {}) });
    this.save();
  }
  partCount() { return this.doc.inventory.reduce((a, p) => a + p.count, 0); }

  setAiCore(id) {
    if (!AI_CORES[id]) return false;
    this.doc.aiCore = id;
    return this.save();
  }
  /* Multiplier for one stat from the fitted AI core; 1 when none. */
  coreMod(stat) {
    const c = this.doc.aiCore && AI_CORES[this.doc.aiCore];
    return (c && c.mods[stat]) || 1;
  }
  hull() { return HULL_STYLES[this.doc.profile.hullStyle] || null; }

  hasDecal(id) { return this.doc.decals.includes(id); }
  hasPalette(id) { return this.doc.palettes.includes(id); }

  unlockDecal(id) {
    if (!DECALS[id] || this.doc.decals.includes(id)) return false;
    this.doc.decals.push(id);
    return true;
  }

  unlockPalette(id) {
    if (!PALETTES[id] || this.doc.palettes.includes(id)) return false;
    this.doc.palettes.push(id);
    return true;
  }

  isMissionCleared(id) { return this.doc.campaign.clearedMissions.includes(id); }

  addReputation(crewId, amount) {
    if (!(crewId in this.doc.campaign.reputation)) return;
    this.doc.campaign.reputation[crewId] += amount;
  }

  /**
   * Grant a mission's authored reward exactly once and describe what happened.
   *
   * ⚠ RETURNS A DESCRIPTION, NOT A SIDE EFFECT ALONE. The old code flipped
   * `isCleared` and said nothing; the player learned they had finished a room by
   * noticing the room was empty. The caller shows what this returns.
   */
  completeMission(mission) {
    if (!mission || this.isMissionCleared(mission.id)) return null;

    this.doc.campaign.clearedMissions.push(mission.id);
    const lines = [];
    const reward = mission.reward || {};

    if (reward.type === 'decal' && this.unlockDecal(reward.id)) {
      lines.push(`DECAL UNLOCKED · ${DECALS[reward.id].name}`);
    } else if (reward.type === 'rep') {
      this.addReputation(reward.id, 2);
      const crew = CREWS[reward.id];
      lines.push(`REPUTATION · ${crew ? crew.name : reward.id} +2`);
    } else if (reward.type === 'mass') {
      this.doc.totalMass += 40;
      lines.push('BOUNTY · +40 biomass');
    } else if (reward.type === 'relic') {
      lines.push(reward.label || 'RELIC');
    }

    /* the reef toll decal is earned by paying ANY of the four tolls */
    if (mission.id.startsWith('reef-toll') && this.unlockDecal('reef-toll')) {
      lines.push('DECAL UNLOCKED · Reef Toll');
    }
    if (mission.id.startsWith('pressure-line') && this.unlockDecal('current-scar')) {
      lines.push('DECAL UNLOCKED · Current Scar');
    }

    this.doc.campaign.missionId = mission.id;
    this.save();
    return { mission, lines };
  }

  /**
   * A guardian falls. This is the ONLY path that records a relic.
   *
   * ⚠ 🔴 THE PREVIOUS BUILD COULD NOT DO THIS AT ALL.
   * `progression.unlockBossRelic()` existed, was correct, and was never called
   * from anywhere — `killEnemy()` spliced the boss out of the array and dropped
   * mass like any other kill. Four bosses, four relic flags, zero callers. A
   * capability with no caller is not a feature.
   */
  defeatBoss(bossName) {
    const key = BOSS_KEYS[bossName];
    if (!key) return null;

    const already = this.doc.unlockedRelics[key];
    this.doc.unlockedRelics[key] = true;
    if (!this.doc.campaign.relics.includes(key)) this.doc.campaign.relics.push(key);

    const lines = [];
    const markId = `${key}-mark`;
    if (this.unlockDecal(markId)) lines.push(`PERMANENT MARK · ${DECALS[markId].name}`);
    if (key === 'solar' && this.unlockPalette('gold-crown')) lines.push('PALETTE UNLOCKED · Gold Crown');

    const count = Object.values(this.doc.unlockedRelics).filter(Boolean).length;
    if (count >= 4) {
      this.doc.profile.title = 'Sovereign of the Black Current';
      this.unlockPalette('black-current');
      lines.push('TITLE · Sovereign of the Black Current');
    } else if (count >= 1 && this.doc.profile.title === 'Rookie of the Current') {
      this.doc.profile.title = 'Debt Collector';
      lines.push('TITLE · Debt Collector');
    }

    this.save();
    return { key, bossName, lines, already, relicCount: count };
  }

  /** Chamber cleared/explored state, so a refresh does not un-explore the ocean. */
  rememberChamber(key, state) {
    this.doc.chambers[key] = { ...(this.doc.chambers[key] || {}), ...state };
    if (state.explored && !this.doc.campaign.discoveredSectors.includes(key)) {
      this.doc.campaign.discoveredSectors.push(key);
    }
  }

  chamberState(key) { return this.doc.chambers[key] || null; }
}

const saveState = new SaveState();
window.saveState = saveState;
