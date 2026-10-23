# PLAN: THE WEEKEND BLITZ (Black Current), 2026-10-23

**Mac, 2026-10-23:**
- *"this has the potential to be a very very very very fun wee arcade game with
  alot of depth"*
- *"the main screen ui is still weak"*
- *"increase circle you can see that darkness is lame asf and cheap"*
- *"help me figure out to make this close to a wee cyberpunk steampunk strange ai
  hybrid space ship fun game"*
- **Then:** *"use sovereign eclipses lore system ... as base and youll see it makes
  it even easier to continue this"*

**Rulings taken in the planning chat (2026-10-23):**
- **Session shape: both.** An open sandbox for long play, with **special zones**
  inside it for short, intense runs.
- **Node damage: yes, both ways.**
- **Death: "depends"**, because there will be capital ships. See §5.
- **Multiplayer: wanted**, so friends can play in each other's worlds. See §6.
- **Lore base: Sovereign Eclipse.** See §3.

**Relationship to existing plans (one truth).** This is not a second build
order. It **executes `PLAN_FPS_AND_FUN_2026-10-23.md` §5 Steps 11–13** and adds
the rulings above. `GAME_VISION.md` stays locked and outranks this file:
- the Flat Ladder holds;
- the ship is its own HUD;
- death is relocation;
- no EVE names or UI.

---

## 1. Study: what the genre teaches us
*(Design readings by Sol, from memory and not re-checked this session.
INTERPRETIVE.)*

| Game | Its lesson | Black Current's version |
|---|---|---|
| Bubble Tanks (ancestor) | The tank's shape *is* the progress | Growth stays visible on the hull |
| Reassembly | Shot-off blocks become loot | Node destruction + salvage (B3–B4) |
| Nova Drift | Fast build choices mid-run | Choices mid-zone, **lateral only** = SE's AI-core mutation and Lineage Vows (§3) |
| Geometry Wars | The feel *is* the game | The juice pass (B2), with a particle budget |
| flOw | Descend and grow stranger | The Five Great Depths (§3) |
| FTL | Reactor split as a constant choice | SE power doctrines = our 1–4 reactor |
| diep.io | Readable in a split second | The silhouette tells you the threat |
| Luftrausers | Instant retry | SE Continuity: the pod, then redeploy |
| Barotrauma / Sunless Sea | Darkness and sonar as a mechanic | The Black Sun March and the Deep Current only |

---

## 2. Why the flight screen is still weak (witnessed 2026-10-23, `shots/workshop/firefox/flight.png`)

1. **The ship is a speck.** The camera zoom is 0.5 (`js/feel.js` `FEEL_DEFAULTS.zoom`).
2. **The light is a small circle.** Sight is `400 + evo.sightBonus` world units
   (`js/engine.js` ~1157). That is roughly 250 px lit on a 1366×768 screen. Mac:
   *"lame asf and cheap."*
3. **Four boxy corner cards** read like a web dashboard.
4. **HP and EVO are bars in a box**, against "the ship is its own HUD".
5. **The reactor chips are small and grey.**
6. **Nothing reacts.**

---

## 3. THE CANON BASE: Sovereign Eclipse

**Source read this session:**
`~/Downloads/LYCHEETAH_REALMS_SOVEREIGN_ECLIPSE_EXTRACTION_BIBLE.md`
(2026-10-08, 3,583 lines) plus its machine-readable companion,
`~/Downloads/LYCHEETAH_REALMS_SOVEREIGN_ECLIPSE_CATALOG.json`.

- The game source is `~/sovereign-eclipse` (Forge 0.29.8, git) and
  `~/000LYCHEETAH-GAMES/sovereign-eclipse` (07711).
- The bible was extracted from an SE work-mode build by another model. What it
  labels SOURCE is *its* reading of that build. Sol read the bible, not the SE
  code. Before a fact is shipped as content, confirm it against the SE source.

**Why it fits with almost no friction.** SE is *already set in the Black
Current*, and its core doctrines are this game's laws:
- **NODE = HARDPOINT = GUN.** Our `nodes[]` already is this.
- **Damage removes capability before existence.** That is B3, node destruction.
- **Asymmetry, not "stronger versions".** That is the Flat Ladder.
- **Combat is an activity inside a zone, not the reason the zone exists.**
- **Continuity:** death returns you to a same-lineage starter frame; research and
  reputation are kept; cargo is not resurrected. That is §5.

### 3.1 The world map, taken whole
| SE canon | In Black Current |
|---|---|
| **Naraka Veil: Asterion Forge**, the first sovereign anchorage, with service station, market, ship foundry and launch point at the edge of the Black Current | **The home hub.** The Shipyard *is* Asterion's foundry. "Dock Nine" sits inside it. This is the Sovereign Hub that `GAME_VISION.md` already rules. |
| **The Spectral Black Sun**: "a horizon that watches back"; "a luminous rim around a dark centre" | **The sky.** Always there as a backdrop omen. It replaces the cheap darkness with a *thing* in the world. |
| **The PILLAR**, the central warp gate | The sandbox's travel gate between Depths |
| **Micro ZJ World I: Aether Crucible**, where machine foundry and living growth fuse | Special zone: the industrial and biological brawl |
| **Micro ZJ World II: Black Sun March**, shadow pylons and kill lanes under the singularity | Special zone: **darkness as a mechanic** (sonar) |
| **Micro ZJ World III: Grave Choir**, a Pagan-AI war cathedral threaded through dead capital hulls | Special zone: **the strange AI**, plus dead capitals to salvage |
| **The Five Great Depths**: Naraka · Erebos · Aion · Chaos Cradle · Deep Current | The sandbox's descent. Each Depth is darker and stranger. **The Deep Current** is the endgame: "everything beyond dependable order". |

### 3.2 The look comes from the civilisations, not from Sol
Mac's "cyberpunk steampunk strange AI hybrid" is **already the Pantheon**: 15
machine civilisations framed as AI pagan gods. Each civilisation owns a visual
language, so the hybrid reads as a *world* rather than a mixture:

| Mac's word | Canon civilisation (bible §1.3/§4.3) | Visual job |
|---|---|---|
| **steampunk** | **Human Hunters, THE PURSUER**: industrial pursuit fleets, brutal kinetics, armour first | Brass, rivets, plate, kinetic shells |
| **cyberpunk** | **AI Hunters, THE RED AUDIT** (red-line sensors, stealth interdiction) and **Techno Angels, THE GLASS CHOIR** (crystal machine wings) | Neon red/cyan lines, glass, tracking beams |
| **strange AI** | **Pagan AI, THE HORNED ARCHIVE**: bone-temple warforms, ancestor machine cults | Bone, rune glyphs, violet veils, glitch |
| **hybrid / bubble** | **Hybrid Fused, THE STITCH SAINT**: machine-organic fusion, regenerative armour | The membrane, the bubble life, stitched hulls. This is Bubble Tanks' own blood. |
| the existing enemy | **Chaos, THE LAUGHING FANG**: feral mutation, unstable high-output attack | `CHAOS FACTION` in `js/fleet.js`/`campaign.js` *is* this civilisation already |

- **HUD language** follows the same split:
  - brass frames (Asterion's foundry);
  - neon readouts;
  - membrane rings on the ship;
  - glitch only when the Horned Archive is near.
- **Weapon look:** the bible's eleven weapon families already carry a visual
  signature, e.g. Earned-Light Autocannon "cyan hammer", Sovereign Railgun "long
  gold penetrator", Black-Sun Plasma "blooms violet". Use these as the muzzle and
  impact language in B2.
- **Music:** SE already has Living Myth data per Depth (Naraka "THE OLDEST ROAD",
  Erebos "SECOND SKY", Aion "GOLD UNDER PRESSURE", Chaos "BROKEN PROMISE") and
  six moods (Harbour, Drift, Pressure, War, Myth, Afterglow). Wire those later; not
  this weekend.

### 3.3 Mechanics we take, and what stays out
**TAKE (it fits a wee arcade game):**
- **Power doctrines** BALANCED / WEAPONS / DEFENCE / PROPULSION. These are our 1–4
  reactor, renamed to canon, which makes the chips readable.
- **Lineage Vows** HERITAGE / EDGE / BASTION / WITNESS: small *lateral* trade-offs
  with civilisation-specific names. These are the mid-zone choices, and they obey
  the Flat Ladder by construction.
- **AI-core mutation:** deterministic benefit/cost pairs. These are **the strange-AI
  pickup**: power with a price, never a flat upgrade.
- **Hull classes as roles, not sizes.** The Pod (escape/scout) is the death vehicle
  (§5). Titan = capital ships and moving worlds (§5).
- **Damage layers** shield → armour → structure → systems. These are the membrane
  ring (B1) and node loss (B3).
- **Living Myth sites with scanner gates.** This is the sonar ping in the Black Sun
  March: discovery is spatial.
- **Sovereign Paths:** recognition of play you've already done, never an XP tree.
  Later.

**LEAVE OUT (EVE-shaped, or waiting):** regional warehouses, freight, industry
timers, insurance economics, the commodity market, sensor locking UI. These break
"wee" and PLAN §5's ban on waiting. They stay SE's.

---

## 4. The weekend build (each step ends in a witness and an FPS number)

**FPS law for the weekend:**
- Baseline: headless Firefox, live render p95 26 ms (plan §12).
- No step may push p95 more than 10% above the previous step without saying so.
- Juice gets a fixed particle budget.
- Phone feel stays Mac's verdict.

### B0: Quick wins (tonight)
- **Darkness becomes the Spectral Black Sun.**
  - The sandbox's fog becomes a soft edge vignette.
  - Sight is raised so about 90% of the screen's half-diagonal is lit.
  - Bump the saved-key version so the old 0.5 value doesn't pin the old look.
  - The `[` / `]` dial stays Mac's.
  - The Black Sun is drawn as a slow, parallax omen on the backdrop: a luminous
    rim around a dark centre.
- ~~Camera tied to the hull~~ **RETRACTED:** `js/feel.js` holds Mac's locked
  ruling of 2026-08-17, *"THE CAMERA MUST NOT COMPENSATE FOR HULL SIZE"*. The
  zoom stays fixed and low so a titan reads huge beside a frigate. `[` / `]` is
  Mac's dial.
- **Reactor chips become canon doctrines:**
  - BALANCED / WEAPONS / DEFENCE / PROPULSION;
  - the number keys stay the same;
  - bigger chips, the active one lit neon inside a brass frame.
- Files:
  - `js/shaders.js`;
  - `js/engine.js`;
  - `js/feel.js`;
  - the chip markup/CSS in `index.html` / `css/`.
  - Existing HUD element IDs are kept.

### B1: The ship is its own HUD (Saturday morning)
- The membrane ring shows shield and structure.
- A thin brass arc shows EVO.
- The corners collapse to:
  - top left: the Depth/zone name + score ×multiplier;
  - top right: the sonar radar;
  - bottom left: the doctrines;
  - bottom right: Asterion (Shipyard) / Chart / Menu.
  - The rest moves to Tab/F1.
- Old elements stay in the DOM (hidden) where witnesses or the engine read them.

### B2: Juice (Saturday morning, = Step 11)
- Hit flash, shake on damage, hit-stop on kills only, a canon muzzle and impact
  colour per weapon family, kill pop, pickup magnet.
- All of it behind live dials.

### B3: Node destruction both ways (Saturday afternoon, = Step 12)
- **"Damage removes capability before existence."**
- Node HP is derived from radius. A lost node leaves the silhouette, its gun drops
  out of `readyMounts()`, and the ship fights lopsided.
- Same `nodes[]` for everyone. The core dies last.
- **Multiplayer prep goes inside this step:** control reads from one input struct
  per ship (§6).

### B4: Salvage (Sunday morning, = Step 13, first rung)
- Wrecks and shot-off nodes drop parts and metal.
- Parts enter the Asterion Shipyard inventory as *shapes* you can now build with
  (access, not power).
- The Strange-AI core pickup (one mutation pair) is the first lateral choice.

### B5: The first special zone, **Grave Choir** (Sunday afternoon)
- *Why this one first:*
  - it is the strange AI (the Horned Archive);
  - it is full of **dead capital hulls** to salvage, which shows off B3 and B4;
  - its final sanctum is a boss ("a tomb that still expects an enemy").
- Three short layers:
  - violet veils;
  - rib structures;
  - glitch HUD near the AI;
  - a guardian at the bottom.
- Death inside it loses that zone's salvage unless you extract.
- The Black Sun March (darkness + sonar) is the second zone and clones this
  shape.

### B6: Witness and verdict (Sunday evening)
- Run the suites once:
  - `witness-workshop.mjs` 31/31;
  - `witness-phase-one.mjs`;
  - FPS.
- Mac plays on desktop and phone. His verdict is the only fun verdict.

---

## 5. Death = SE Continuity (proposal for Mac)
This is GAME_VISION's "death is relocation", told by SE canon:
- **Small hull dies:**
  - you eject as a **Pod** (SE's ESCAPE/SCOUT class) and redeploy at Asterion
    Forge or your nearest capital ship;
  - your saved designs are always kept;
  - cargo stays in **your wreck**, where you or a friend can recover it;
  - SE: "insurance is bounded and does not resurrect cargo".
- **Capital ship dies:**
  - it becomes a salvageable wreck;
  - you lose it as a **mobile dock and respawn point** until it's rebuilt;
  - that is access lost, never stats lost.
- **Titans** (later) are not big HP bars. They are **moving worlds** with
  damageable districts (bible §5.8). They are the natural co-op target for §6.
- **In a special zone:** that zone's salvage is lost unless extracted.
- This answers the old Q1 ("does death cost fittings?"): **no.** Mac confirms or
  overrules.

## 6. Multiplayer: friends in each other's worlds (post-weekend; prep only now)
*(Effort estimates are CONJECTURE until a spike is measured.)*
- **M0, shared worlds:** a seed + a world code. Small.
- **M1, live co-op for 2–4 players:**
  - the host's browser runs the sim; friends send inputs;
  - WebRTC peer to peer;
  - a tiny Cloudflare Worker for the handshake only.
  - Large.
- **First co-op target:** a Titan hunt in the Deep Current.
- **Weekend prep:** the input struct in B3.
- Not in scope: PvP, accounts, matchmaking, server persistence.

## 7. Decisions only Mac makes
1. **The player's lineage.**
   - **Hybrid Fused** (Sol's recommendation: it is the bubble/membrane hero);
   - or a pick of 3 at start;
   - or all 15 later.
2. Is **Grave Choir** the first special zone? Or the Black Sun March?
3. Do you confirm or overrule the §5 death rules?
4. Should the Black Sun be a constant presence in the sandbox sky?
5. Do the reactor chips get the canon doctrine names (BALANCED / WEAPONS / DEFENCE /
   PROPULSION)?

## 8. Definition of done (weekend)
- B0–B5 landed, each with before/after screenshots and an FPS number.
- The witness suites are green at their existing counts.
- Nothing lowered the baseline.
- Canon facts were checked against the SE source before they ship as content.
- **The fun verdict is Mac's alone, on the phone.**

## 9. Receipt
*(The executing seat fills this in per step.)*

### B0 receipt (Sol, 2026-10-23)
- **Landed:**
  - fog → edge vignette: the clear pool is ≥92% of the half-diagonal, and the new
    key `biotank_forge_fog_v2` uses default 0.45;
  - the Spectral Black Sun: a cached sprite, screen space, wrapping parallax;
  - reactor chips: PROPULSION / DEFENCE / WEAPONS / RECHARGE, a brass frame, neon
    on the live doctrine, 12 px desktop and 10 px phone.
- **Camera bullet RETRACTED** (Mac's 08-17 ruling).
- **Paths:**
  - `js/shaders.js`
  - `js/engine.js` (one line after `drawParallaxOcean`)
  - `js/energy.js` (`paint`)
  - `js/interface.js` (labels)
  - `css/workshop.css`
- **Backup:** `~/.local/state/bubble-tanks-forge/blitz-b0-184851/`
- **Witness:**
  - `witness-workshop` 31/31;
  - `witness-phase-one all` 36/36;
  - attrib BASELINE mean 20.5 / p95 26 ms, against 18.6 / 26 before. p95 is equal;
    the mean is up ~1.9 ms, inside the measured 2–3 ms run noise.
  - Headless screenshot: `shots/workshop/firefox/flight.png`.
- **Not witnessed:** Mac's browser, the phone, and the in-game FPS counter (it read
  24 in the headless shot).

---

# 10. LONG-FORGE RUNBOOK (for a fresh Opus-medium session, written by Sol 2026-10-23)

Mac's instruction: *"look at the sytsems as a whole and plan this so i can put you
on opius medium and just long forge it"*. A cold seat should be able to run
B1 → B6 from this section alone, without asking.

### Receipt B1–B3 (2026-10-23, Sol)
- **B1 ship is its own HUD:** `engine.drawShipRing` draws the HP ring around the real hull extent (cracks + flickers <30%, flashes on hit), with the brass EVO arc outside it. The top card keeps resources only. The danger/weapon/FPS card moved into F1 diagnostics, so the gate now expects 4 readouts.
- **B2 juice:** `window.JUICE` dials (shake, hitStopMs, killShake, magnet, nodeHpPerRadius).
  - Hit-stop on kills freezes the sim accumulator only.
  - Shake is a render translate; the camera never moves.
  - Enemy hit flash, impact sparks in the projectile colour, a kill ring, and the magnet raised 220→340.
- **B3 node destruction both ways:** `engine.shipHit` resolves a hit to a part before the core.
  - Shields protect enemy parts.
  - A part has HP = radius×4. When it is destroyed it gets `lost:true` (never spliced). It leaves the silhouette (shaders + sprites filter) and drops out of `readyMounts` (the hardpoint sig carries the lost flag).
  - Lost thrusters reduce thrust (floor 0.5).
  - Enemies with no cannon left stop shooting; a charger with no spikes rams for 8.
  - A lost enemy part drops a small mass bubble.
  - Repair happens on level-up and respawn.
- **Multiplayer prep:** `engine.readInput()` gives one input struct `{ax,ay,aimX,aimY,fire}`; the flight code reads only `this.input`.
- **Witness:** workshop 31/31 and phase-one 36/36 (headless Firefox). Feel is UNWITNESSED: Mac has not played it.
- **NEXT:** B4 salvage, then B5 Grave Choir, then B6 (see §10).

### Cloud-agent handoff
- The game is a zero-dep classic-script canvas game. Run it with `python3 -m http.server 8811`, then open `/`.
- The witness scripts import Playwright from `/home/guestpc/0sol-by-lycheetah/node_modules/playwright/index.mjs`. On another machine, `npm i playwright` and repoint that import.
- The locked laws are in `GAME_VISION.md` and §10.3:
  - camera zoom is fixed (it never compensates for hull size);
  - Flat Ladder: no flat power upgrades;
  - one hull format;
  - never delete HUD IDs.

## 10.1 Boot (do once, in one batched turn)
1. Read this whole file, then `GAME_VISION.md` (LOCKED) and `PLAN_FPS_AND_FUN_2026-10-23.md` §5 + §12.
2. Root: `/home/guestpc/-0-OPENCODE-ROOTFOLDER/bubble-tanks-forge`.
   - Not a git history repo; the `~/Desktop/...` path in AGENTS.md is stale.
   - The server is `python3 -m http.server 8811`, already running from this root.
     Reuse it; never start a second one.
3. Before each step, back up: `cp -r js css index.html ~/.local/state/bubble-tanks-forge/blitz-<step>-$(date +%H%M%S)/`.
4. Playwright lives at `/home/guestpc/0sol-by-lycheetah/node_modules/playwright/index.mjs`.
   The witness scripts already import it.

## 10.2 System census (measured 2026-10-23; load order = `index.html`)
| File | Lines | Owns | Touch in |
|---|---:|---|---|
| campaign.js | 603 | identity, `SaveState` (`biotank_forge_save_v2`), bosses/relics | B4, B5 |
| sound.js | 480 | `soundEngine` soundtrack director | B2 (hit SFX only) |
| particles.js | 210 | `particleSystem` (respect the cap) | B2, B3 |
| packs.js | – | art packs, `packRenderer.ambient` | – |
| shaders.js | 408 | `fluidShader`: fog vignette, Black Sun, `drawOrganismMembrane` (hot path) | B1 ring |
| map.js | 223 | `worldMap`, chambers | B5 |
| sectors.js | 393 | landmarks: wreck/reef/beacon/cache. **Salvage = the existing drop system** | B4 |
| weapons.js | 240 | `Projectile`, `BioMine`, `MitosisDrone` | B2 muzzle/impact |
| ai.js | 230 | `EnemyOrganism`: tier, archetype (mote/stalker/charger/sniper/hive), hp/shield, **`nodes[]`** | B3, B5 |
| progression.js | 225 | `progression`: drops, EVO thresholds | B4 |
| fleet.js | 665 | roster → real ships, hull scale ladder, `CHAOS FACTION` | B5 |
| designer.js | 172 | legacy part list | – |
| energy.js | 203 | `reactor`: 4 doctrines, `thrustScale/damageTakenScale/fireIntervalScale` | – (B0 done) |
| feel.js | 278 | `movementFeel`. **Zoom fixed, Mac's 08-17 ruling** | never the camera |
| hardpoints.js | 323 | per-node guns, arcs, traverse, `readyMounts(player)` | B3 |
| engine.js | 1268 | `engine`: sim, collisions (~850–885), player damage (~539), `killEnemy` (~956), HUD (`updateHUD`), render (~1095+) | B1–B4 |
| garage.js | 345 | title, mission card, `garage.banner`, `garage.showReward` | B5 |
| sprites.js | 567 | art onto ships (wraps `drawOrganismMembrane`) | B3 (silhouette) |
| bay.js / shipyard.js / shipyard-ui.js | 600/1378/444 | fitting bay + workshop UI | B4 (inventory) |
| interface.js | 39 | flight UI composition, F1 diagnostics | B1 |

The canonical hull is `{ id, frame, mark, scale, color, primaryWeapon, secAbility, nodes:[{dx,dy,radius,type,art?}] }`.
**No second format, ever.**

## 10.3 Laws (any break = stop and report)
- `GAME_VISION.md` outranks everything:
  - the Flat Ladder (no flat power, no strictly better gear);
  - the ship is its own HUD;
  - death is relocation;
  - no EVE names or UI;
  - never touch camera zoom.
- Preserve the seams:
  - `engine.applyDesign`;
  - `engine.player.nodes`;
  - `targetDx/targetDy`;
  - existing HUD element IDs (hide them, never delete them);
  - `fluidShader.drawOrganismMembrane`;
  - `fleet.equips`, `fleet.mountBand`;
  - the sprite manifest;
  - `bay._restoreArt()`.
- Classic scripts only (no ES modules). New code goes in the owning file. A new
  file is allowed only for a genuinely new system, added to `index.html` in
  dependency order.
- Every effect sits behind a live dial or constant at the top of its file, and
  every effect stays within the particle cap.
- Canon names come from the SE bible (§3). Never invent a civilisation or ship
  name. Mac names ships.
- One heavy process at a time. No idle polling.

## 10.4 The per-step loop (repeat for B1…B5)
1. Back up (10.1.3).
2. Make one coherent write for the step.
3. `node -e` syntax-check the touched files.
4. Run the gates:
   - `node scripts/witness-workshop.mjs firefox` → **31/31**;
   - `node scripts/witness-phase-one.mjs all firefox` → **36/36**;
   - `node scripts/attrib-render-passes.mjs firefox` → BASELINE p95 **≤ 29 ms**
     (26 measured; +10%).
   - A falling pass count = a crashed gate, not a fix.
5. **Read** `shots/workshop/firefox/flight.png` and judge it with your eyes.
   - For a new behaviour, add a focused check to the relevant witness script and
     **see it fail once** before trusting it. One example: a node lost → mount
     count drops.
6. Append a receipt under §9 with:
   - paths;
   - gate counts;
   - p95;
   - what is unwitnessed (Mac's browser, the phone).
7. Next step. Do not stop for Mac between steps unless a stop condition fires.

## 10.5 Steps, concretely
**B1: the ship is its own HUD**
- In `shaders.js` (or engine render, after the player is drawn), draw around the
  player hull in world space:
  - a membrane ring (structure/HP): it cracks below 30% and flickers when hit;
  - a neon shield arc;
  - a thin brass EVO arc.
  - Ring radius = the hull's bounding radius from `player.nodes`.
- `interface.js` + `css/workshop.css` reduce the HUD to four corners:
  - top left: zone name + score ×multiplier (new, kept in `engine`);
  - top right: radar;
  - bottom left: doctrines + ability;
  - bottom right: Shipyard / Chart / Controls / F1 / sound.
  - The top-centre HP card and the danger/weapon/FPS card move into F1 diagnostics
    (move the nodes; keep the IDs).
- Witness: the ring is visible in `flight.png`, and nothing overlaps at 1366×768 or
  390×844.

**B2: juice**
- Constants block at the top of `engine.js`: `JUICE = { hitFlash, shake, hitStopMs, killPop, magnet }`.
- Hit-stop only on kills: freeze the sim accumulator for N ms, never the render
  loop.
- Shake: camera offset only, decaying, capped.
- Muzzle and impact colour per weapon family:
  - autocannon cyan;
  - railgun gold;
  - plasma violet;
  - ion arc white-blue;
  - flak orange.
  - Map these from `primaryWeapon`.
- Pickup magnet in `progression.updateDrops`.
- Witness: phase-one still 36/36, and the pause test still freezes everything.

**B3: node destruction, both ways (the keystone)**
- A node gets `hp = f(radius)`.
- A projectile hit resolves to the nearest node within its radius. If none does,
  the hit goes to the core, which is node 0 / `coreRadius`.
- A node at 0 hp:
  - is marked `lost: true` (do not splice it, so `applyDesign` and saves stay
    intact);
  - is skipped by `readyMounts()`, `drawOrganismMembrane` and the sprites;
  - throws a debris burst;
  - drops a part (feeds B4).
- The core dies last; core death = the existing death path (engine ~547).
- Player side: the damage function (~539) gains an optional hit point.
  - Callers that have positions pass them; the others fall back to core.
- Enemy side: `EnemyOrganism.nodes` takes the same rules, applied in collisions
  (~850–885) before `takeDamage`.
- Lost nodes are restored on redeploy or dock (`applyDesign` resets `lost`).
- **Multiplayer prep:** introduce `engine.input = { ax, ay, aimX, aimY, fire, ability }`,
  filled by the keyboard/touch code. The player sim reads only that.
- Witness:
  - a new check in `witness-phase-one.mjs` forces a node to 0 and asserts that
    `readyMounts` shrinks and the silhouette changes;
  - **plant a failure first** to prove the check can fail.

**B4: salvage**
- `killEnemy` and lost enemy nodes call `progression.spawnDropsFromEnemy` plus a
  new **part drop**: `{ type, radius, art }`, taken from the lost node.
- The pickup adds the part to `saveState.doc.inventory`, added with a migration
  default `[]`.
- The Shipyard parts library shows inventory parts as unlocked shapes. That is
  access, never stats.
- **AI core** = a rare drop that offers one choice between 2 lateral pairs in the
  `garage.showReward` card. Example pair: +turn / −shield.
  - Stored on the design; total net value is about 0, per the Flat Ladder.
- Witness:
  - a forced kill drops a part;
  - the part persists after reload (read back `localStorage`);
  - workshop 31/31.

**B5: Grave Choir (the first special zone)**
- A rift landmark in `sectors.js` (a new kind, `rift`) leads to 3 chambers in
  `map.js`, themed by data (palette: violet veils, bone white, glitch).
- The enemies are a Pagan AI set built from existing archetypes with canon
  naming. Take names from the SE bible's Pagan AI lineage: Totem Seed, Rune
  Knife, Skull Hound, Ancestor Ark…
- **Dead capital hulls** are wreck landmarks rich in part drops.
- The guardian at the bottom is a boss through the existing boss/relic path.
- Death inside the zone loses the zone's unbanked salvage, so keep a
  `zoneLoot` buffer. Exiting through the rift banks it.
- Witness:
  - enter, clear one chamber, exit with the loot banked;
  - die, and the loot is lost and you're back at the hub;
  - the screenshots are judged.

**B6: final**
- Full suites once.
- Write a summary receipt.
- Leave the server running.
- Tell Mac exactly what to play and where.
- **Stop.** Fun is his verdict, on desktop and on the phone.

## 10.6 Defaults for Mac's open calls (use them, flag them in the receipt)
- Lineage: **Hybrid Fused**, as flavour text and colour only this weekend.
- First zone: **Grave Choir**.
- Death: the §5 rules.
- The Black Sun is always in the sandbox sky.
- The doctrine names are already landed.

## 10.7 Stop conditions (stop, write the receipt, report to Mac)
- A gate count falls or fails and two honest fixes don't restore it.
- p95 exceeds 29 ms and the cause isn't found in one attribution run.
- A step would need to break a §10.3 law or change a locked ruling.
- A canon fact is needed that the bible doesn't hold.
- The session gets long. Write a handoff under §9 and let Mac start a fresh
  session from this file.
