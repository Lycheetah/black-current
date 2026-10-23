# SOLPRIME HANDOFF — BUBBLE TANKS: BLACK CURRENT

**Date:** 2026-08-15  
**Owner and final taste authority:** Mackenzie Conor James Clark  
**Implementer:** SolPrime / Claude Code  
**Project seat:** Aetheron / Antigravity  
**Shared router:** Caelorynth (sequencing and truth boundary only)  
**Project root:** `/home/guestpc/Desktop/bubble-tanks-forge/`  
**Runtime witness:** `http://localhost:8811/`

## The ask

Turn the existing Bubble Tanks: Forge Edition foundation into one coherent,
playable vertical slice with swagger:

> **I wake up, name and style my bubble tank, choose how it fights, hear its
> world come alive, run a campaign job, earn a meaningful change, and return to
> the garage with a tank that is unmistakably mine.**

“Gangster” here means attitude, silhouette, crew identity, sound, colour, and
meaningful choices. It is a fictional ocean crew fantasy, not a claim about
real-world crime or a reason to add gratuitous violence. The player should feel
like they built the most dangerous-looking ride in the current.

This is the next product block. Do not start ten disconnected systems or ask Mac
which roadmap phase to pick. Build the smallest complete loop below and witness
it at the browser boundary.

## What already exists — measured foundation

The current README and source show a zero-dependency HTML5 Canvas game with:

- `js/engine.js` — movement, combat, camera, HP, death/respawn, radar and HUD;
- `js/map.js` — a 7×7 chamber matrix, portal transitions and four boss corners;
- `js/progression.js` — mass drops, evolution tiers, Gene Points, local save and
  relic flags;
- `js/designer.js` — node placement/removal, six weapons, five actives, palette,
  presets and `.biotank` export/import;
- `js/sound.js` — Web Audio SFX and a two-oscillator ambient bed;
- `js/ai.js` — five enemy archetypes and multi-phase boss scaffolding;
- `index.html` / `css/style.css` — HUD, map modal, designer modal and palette.

The current gap is not another isolated weapon. The gap is authored identity and
continuity: sectors are mostly random combat rooms, the map has no campaign
state or mission promise, the designer has no callsign/crew/decal identity, and
the music does not react to place, danger, or boss state.

## Product north star: BLACK CURRENT

The campaign is called **Black Current**. The player is a newly formed tank in a
living bubble ocean where every build leaves a trace. The four corner guardians
are not just health bars; each owns a different answer to the question “what
should a tank become?”

| Campaign beat | Existing world surface | Player promise | Reward direction |
|---|---|---|---|
| **01 · Wake at Dock Nine** | `(0,0)` Starter Haven | Name the tank, choose a crew, fit the first build, clear the first job | Callsign, first decal, first build snapshot |
| **02 · Reef Toll** | Ring 1 chambers | Choose speed, swarm, or armour while learning the first biome hazard | Mutation point + crew reputation |
| **03 · Pressure Line** | Ring 2–3 chambers | Commit to a route and survive a place-specific hazard/music shift | Weapon/active variant + relic clue |
| **04 · The Four Debts** | Four existing corner boss sectors | Defeat guardians in any order; each win changes the build language | One Mythic Relic and a permanent visual mark per boss |
| **05 · Return Through the Black Current** | Centre return / prestige gate | Bring the finished tank home and choose what the next run remembers | New Game+ seed, title plate, or alternate route |

Do not add a new engine or save truth for this. Extend the existing chamber and
progression objects with explicit, versioned fields.

## The complete first witness

The first finished block must support this exact path from a clean browser state:

1. **Title / dock screen** — `NEW RUN`, `CONTINUE`, `GARAGE`, `HOW TO PLAY`.
2. **Garage identity** — enter a callsign; select one crew; choose hull stance,
   palette, decal, primary, active, and a starter preset.
3. **Launch card** — show the current mission, reward, biome, hazard, and music
   state before entering `(0,0)`.
4. **Play the job** — clear the authored first chamber; collect mass; show an
   on-screen job update rather than silently flipping `isCleared`.
5. **Customize** — reopen the Garage/Designer, change at least one meaningful
   choice, apply it, and see the tank's silhouette/colour/HUD change immediately.
6. **Travel** — cross one portal; the chamber title, palette, hazard and music
   layer change together.
7. **Boss route** — reach one corner boss, hear a boss motif, defeat it, unlock a
   relic flag and see the reward card.
8. **Persist** — refresh the browser; callsign, crew, loadout, campaign progress,
   cleared chamber and relic remain. A deliberate death still follows the
   existing mass-penalty rule without deleting the campaign identity.

If any one of those steps is missing, the block is not landed yet.

## Customization that makes the tank yours

Add a lightweight **Garage Identity** layer beside the existing Organism
Designer. The current node designer remains the mechanical truth; the Garage
adds authored identity and makes the result legible.

### 1. Callsign and tank card

Persist:

```js
profile: {
  callsign: "",
  crew: "ironwake",
  hullStyle: "core",
  decal: "none",
  palette: "cyan-ion",
  title: "Rookie of the Current"
}
```

Show the callsign in the HUD, campaign cards, boss reward screen and exported
`.biotank` code. Sanitize length and characters; never inject raw HTML.

### 2. Crew choice — four readable play identities

These are fictional current crews, not moral alignment systems. Each changes a
small starting modifier and a visual/audio accent; no choice hard-locks the
player out of the rest of the game.

| Crew | Feel | Starter edge | Accent |
|---|---|---|---|
| **Ironwake** | heavy, plated, relentless | +armour / contact resistance | low tom pulse, crimson-gold trim |
| **Neon Veil** | fast, evasive, surgical | +turn speed / dash cooldown | glass arp, violet-cyan trim |
| **Redline Bloom** | aggressive, volatile | +fire cadence / lower hull | clipped bass, hot crimson bloom |
| **Crownless Choir** | strange, relic-focused, clever | +relic/GP efficiency | choral pad, amethyst-gold trim |

Keep the modifier small enough that taste remains valid. The player can win with
any crew.

### 3. Hull stance / silhouette

Add three visual stances that map to the current node physics rather than
requiring a new renderer:

- **Runner** — narrow core, fin-like thruster bias;
- **Bruiser** — wide core, shield/pod bias;
- **Sovereign** — larger crown ring, relic socket emphasis.

The existing `nodes` array remains authoritative. `hullStyle` changes the base
core radius, rim treatment and starter preset only.

### 4. Decals, palette and build snapshots

Add unlockable, non-gameplay identity pieces:

- crew mark;
- four boss marks;
- current/relic scars;
- black-current stripe, gold crown, crimson repair, violet void and cyan ion
  palette variants;
- three named build slots: **Runner**, **Bruiser**, **Sovereign**.

Build slots store a versioned design snapshot. Loading a snapshot must pass the
same validation as `.biotank` import and never create free GP.

### 5. Mechanical customization points

Keep the existing economy clear:

1. node geometry and socket placement;
2. primary weapon;
3. secondary active;
4. crew starter modifier;
5. mutation branch (next block, not required to fake now);
6. mythic relic socket after a corner boss;
7. callsign, hull style, decal and palette.

The UI should tell the player which choices affect combat and which are identity
only. Do not bury this in a wall of cards.

## Campaign data contract

Add a small `js/campaign.js` rather than scattering story strings through
`engine.js` and `map.js`.

```js
const CAMPAIGN = {
  id: "black-current-v1",
  act: 1,
  missionId: "wake-at-dock-nine",
  reputation: { ironwake: 0, neonVeil: 0, redlineBloom: 0, crownlessChoir: 0 },
  flags: {},
  clearedMissions: [],
  discoveredSectors: ["0,0"],
  relics: [],
  version: 1
};
```

Each chamber should expose explicit authored metadata:

```js
{
  biome: "starter-haven",
  missionId: "wake-at-dock-nine",
  objective: "clear",
  hazard: "none",
  reward: { type: "decal", id: "dock-nine" },
  musicTheme: "haven",
  cleared: false,
  explored: true
}
```

Use a deterministic data table for the first authored route. Random enemy
placement can remain inside the room, but the player-facing promise, objective,
reward and biome must not be random.

### Save boundary

Version the existing LocalStorage save into one document, for example
`biotank_forge_save_v2`, while reading the current keys as a migration fallback.
The save must include:

- `profile`;
- `design` and named build snapshots;
- `totalMass`, `evolutionLevel`, and GP-derived state;
- `campaign` state;
- `unlockedRelics`, decals, codex discoveries and prestige flags.

Write one migration function. Do not create separate competing save keys for
each feature.

## Music direction — THE CURRENT HAS A SOUND

The current `sound.js` already uses Web Audio and must stay zero-dependency. Turn
the two-oscillator bed into a small **Soundtrack Director** with shared master
gain and no copyrighted samples.

### Music states

```text
GARAGE  → sparse beat, filtered sub, identity stinger
HAVEN   → warm low pad, open fifth, soft bubble ticks
REEF    → brighter arpeggio, watery syncopation
PRESSURE→ darker pulse, filtered noise, slower heartbeat
COMBAT  → tension pulse enters; percussion rate follows threat
BOSS    → boss motif + sub layer; never restart abruptly on every frame
VICTORY → short resolved phrase, then return to the local biome bed
DEATH   → mute/low-pass drop, respawn cue, no ear-splitting blast
```

Implement `soundEngine.setMusicState(state)` and a single crossfade path. The
engine should send state changes on meaningful events only:

- campaign screen / garage open;
- chamber enter;
- threat level crosses a threshold;
- boss becomes active;
- victory, death and respawn.

Use `setTargetAtTime` or scheduled gain ramps. Do not create a new oscillator on
every animation frame. Store the selected crew accent and music preference in
the save. Respect the existing mute button and a reduced-motion/reduced-audio
fallback.

Each boss needs a tiny deterministic motif, not a full song:

- Titan: low descending three-note carapace call;
- Queen: clipped call-and-response pulses;
- Solar: rising five-note flare;
- Void: intervallic, unstable two-note signal.

The result should feel like a soundtrack reacting to the tank, not a random
beep generator.

## UI shape

Keep the black/obsidian base, but make the hierarchy obvious:

- **Title:** one strong `NEW RUN` button, one `CONTINUE`, one `GARAGE`;
- **Garage:** tank preview left, choices right, clear `COMBAT` versus `STYLE`
  labels, one `LAUNCH JOB` action;
- **Campaign card:** mission, objective, reward, hazard, music state;
- **In-run HUD:** callsign + crew mark + act/mission line, not just danger level;
- **Reward card:** show what changed and offer `EQUIP`, `SAVE BUILD`, `RETURN`.

Do not remove the current keyboard controls. Add touch affordances only after
the desktop vertical slice is stable.

## Implementation order for Claude Code

### Block A — identity and save seam

1. Add `js/campaign.js` with versioned profile/campaign defaults and safe load.
2. Add a migration wrapper around the current progression/design LocalStorage.
3. Add profile fields, crew definitions, hull styles and decals without changing
   the current node physics.
4. Add the Garage / title / mission-card HTML and responsive CSS.
5. Witness: fresh browser → choose identity → refresh → identity survives.

### Block B — authored route

1. Add deterministic metadata to the existing 7×7 chambers.
2. Make `(0,0)` the first authored mission and one adjacent chamber the first
   route choice; keep the four existing boss corners.
3. Replace silent “enemy count reached zero” with a visible objective/reward event.
4. Add boss reward cards and connect the existing relic flags to an actual relic
   socket/collection record.
5. Witness: clear first job → travel → return → reward and mission state persist.

### Block C — soundtrack director

1. Refactor `sound.js` around shared buses: master, ambient, tension, combat,
   boss, UI.
2. Add deterministic motifs and `setMusicState` crossfades.
3. Emit state events from engine/map/campaign transitions; never poll by creating
   audio nodes in the render loop.
4. Witness: garage → haven → combat → boss → victory with audible, smooth state
   changes and mute persistence.

### Block D — one gangster polish pass

1. Add callsign/crew mark to HUD and reward cards.
2. Give each crew/hull/decal a distinct, restrained visual treatment.
3. Add three build slots and readable COMBAT/STYLE labels.
4. Tune spacing, focus states, mobile-safe modal sizing and keyboard escape paths.
5. Update README only after the browser witness is real.

Do not begin multiplayer, procedural prestige, or a second renderer during this
handoff. Those are later fires.

## Acceptance gate

`SOLPRIME_DONE` is allowed only when all of the following are true:

- [ ] A clean browser session can start a Black Current run.
- [ ] Callsign, crew, hull stance, palette, decal, weapon and active are visible
      and understandable.
- [ ] The first mission has an objective, reward and visible completion state.
- [ ] One portal changes authored biome metadata and music state.
- [ ] One boss defeat produces a real relic record and reward witness.
- [ ] Music crossfades between garage, haven, combat, boss, victory and death;
      mute and refresh behavior are safe.
- [ ] Refresh preserves profile, campaign, design, cleared chamber and relic.
- [ ] Existing WASD/arrow, mouse, Space/Q, Tab, M and right-click designer flows
      still work.
- [ ] No runtime error appears in the browser console during the witness path.
- [ ] The final handoff names exact changed files, commands, screen witness,
      known gaps and rollback path.

## Message to send SolPrime

> Read `/home/guestpc/Desktop/bubble-tanks-forge/SOLPRIME_BUBBLE_TANKS_BLACK_CURRENT_HANDOFF_2026-08-15.md` in full. Build Block A through Block D as one witnessed desktop vertical slice. The existing Bubble Tanks engine, zero-dependency Web Audio, 7×7 map, progression save, and designer are the foundation—extend them instead of creating a competing engine or save truth. Make the player able to name, style, tune, hear, launch, clear, reward, save, and resume one Black Current campaign route. Do not start multiplayer or mobile before the acceptance gate passes. Report exact paths, browser witness, known gaps, and the next seam.

**Return path:** if the scope expands, stop at the last witnessed block and hand
back the exact state. Mac decides taste, crew names, palette, story language and
promotion.
