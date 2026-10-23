# 🚢 BLACK CURRENT

**A top-down bubble-tank arcade game with dreadnought depth.** You fly a ship built from
parts (core, cannons, thrusters, membranes), shoot it out with living hulls in a dark ocean
of space, tear their parts off and have yours torn off, and rebuild from the salvage.

The look is **cyberpunk × steampunk × strange AI**: neon membranes, brass instruments, and
a Black Sun hanging over everything. The lore base is Mac's own **Sovereign Eclipse** canon.

- **Zero dependencies and zero build step.** It is `index.html`, a folder of classic
  scripts, and 270 keyed PNGs.
- **Runs in any browser.** Phone touch controls are built in.
- **Game direction, design and authorship:** Mackenzie Conor James Clark (Mac). He has
  final say on taste and every consequential decision.

> *"a wee eve version with top down dreadnought gameplay"*, Mac, 2026-08-16. Locked.
> ⛔ Never describe this game to anyone as "EVE but X". That reference is a private tuning
> fork, not a pitch.

---

## 🤖 AGENT: START HERE

You've been handed this repo so you can **plan with Mac, then build**. Follow this exactly.

### 1. Read (in this order, once)

1. This README, all of it.
2. `GAME_VISION.md`: the locked north star. Never relitigate it.
3. `PLAN_WEEKEND_BLITZ_2026-10-23.md`, the current plan. You need:
   - §2 why the HUD was weak;
   - §3 the Sovereign Eclipse canon base;
   - §4 the build steps B0–B6;
   - §5 death rules;
   - §6 multiplayer;
   - §7 Mac's open decisions;
   - §9 receipts (what is already done);
   - §10 the runbook (system census, laws, concrete specs).
4. `CHANGELOG.md` for recent history.

Everything else at the root is **history** (see *Doc index* below). Read it only when a
task points you there.

### 2. Set up

```bash
npm install                      # installs Playwright (tests only; the game has no deps)
npx playwright install firefox   # browser for the witness scripts
npm run serve                    # http://127.0.0.1:8811/  (leave running)
npm test                         # workshop 31/31 + phase-one 36/36 must stay green
```

### 3. Your first message to Mac: plan, don't code

Send Mac **one short message** with:

- **Where it stands:** two or three lines from the status table below.
- **The next batch you propose:** normally **B4 Salvage → B5 Grave Choir** from the plan's
  §10.5. Give it as dot points: what he'll *see and feel* when it lands, not file names.
- **His open calls:** the §7 decisions that haven't been ruled yet, each with your
  recommendation and the default you'll use if he says "go".
- **One question:** what he wants first, or whether anything has changed.

Mac writes casually and fast. Typos are normal; read for intent. *"smash it"* and *"go"* mean
build now. He likes dot points, emojis, and seeing the game, not reading about it.

### 4. Build loop (once he says go)

1. **Batch the work.** Make one coherent change set per step (B4, B5…), not a drizzle of
   micro-edits.
2. **Syntax check** every touched file: `npm run check`.
3. **Run the witnesses once per batch**, not per edit: `npm test`. The counts may only
   go **up**, never down. If you add a law, add its witness.
4. **Look at the screen:** the witnesses write screenshots to `shots/` (gitignored). Open
   `shots/workshop/firefox/flight.png` and make sure what you built is actually visible.
5. **Write the receipt:** append a short receipt under §9 of the plan, saying what landed,
   which checks passed, and what is **unwitnessed** (feel, phone, FPS on Mac's machine).
6. **Commit with a clear message and push.** Ask Mac once, at the start, whether he wants a
   branch + PR or straight to `main`.
7. **Tell Mac what to try.** Give the URL, the keys, and what should feel different.
   **Fun is his verdict, never a test's.**

Mac has said explicitly: *"dont do 100s of gates, this is a game, just smash it."* Gate
**once per batch**. Spend your effort on the game.

### 5. Stop and ask Mac when

- a step would break a **Law** below or change a locked ruling;
- a lore fact is needed that this repo doesn't hold (the full Sovereign Eclipse source lives
  on Mac's machine, so ask him to paste it);
- a witness count drops and two honest fixes don't restore it.

---

## 🎮 PLAY IT

```bash
npm run serve        # or: python3 -m http.server 8811
# open http://127.0.0.1:8811/
```

### Controls

| key | does |
|---|---|
| `WASD` / arrows | move (absolute: W is always up) |
| **mouse** | aim; **hold to fire**. Every gun aims from its own mount, within its own arc |
| `Space` / `Q` | secondary ability |
| `1` `2` `3` `4` | reactor doctrine: **PROPULSION / DEFENCE / WEAPONS / RECHARGE** |
| `Y` / `Tab` | **the Shipyard**: the one ship editor |
| `B` | fitting bay |
| `M` | map · `N` sector overlay |
| `f` / `F` | cycle fleet hulls · `r` restore your own ship |
| `F1` | flight diagnostics (danger, weapon, FPS, sprite/fleet/hardpoint readouts) |
| `Esc` | close whatever is open |
| **Touch** | left half = move stick · right half = drag to aim and fire |

**Tuning dials:**

| key | does |
|---|---|
| `-` / `=` | top speed down / up |
| `;` / `'` | response down / up |
| `0` | reset movement feel |
| `[` / `]` | zoom (also fog, and the bay size while the bay is open; ⚠ triple-bound) |
| `G` `H` `J` | sprites / membrane underlay / chassis strokes on/off (find FPS costs) |
| `K` | show firing arcs |
| `<` / `>` | turret traverse rate |

**`JUICE` dials** (browser console, live):

```js
JUICE.shake = 0        // screen shake off (default 1)
JUICE.hitStopMs = 0    // kill freeze off (default 55)
JUICE.magnet = 500     // pickup pull radius (default 340)
JUICE.nodeHpPerRadius  // part toughness (default 4)
```

---

## 📊 WHERE IT STANDS (2026-10-23)

| mark | means |
|---|---|
| ✅ | witnessed by headless browser tests and screenshots |
| ⚙ | built and syntax-checked, behaviour not separately witnessed |
| 🎮 | **needs Mac to play it**: feel, fun, phone |
| ⏭ | not built yet |

| System | State | Notes |
|---|---|---|
| Engine core | ✅ | Fixed 60 Hz sim, collisions, HP/shields/iFrames, respawn |
| **Sight radius + Black Sun** | ✅ 🎮 | The cheap darkness is gone; the edge vignette remains. The Black Sun hangs in the sky (B0) |
| **Ship is its own HUD** | ✅ 🎮 | HP ring around the hull (cracks under 30%), brass EVO arc. Corner HUD trimmed (B1) |
| **Juice** | ⚙ 🎮 | Kill hit-stop, screen shake, enemy hit flash, impact sparks, kill ring, bigger magnet (B2) |
| **Node destruction, both ways** | ⚙ 🎮 | See below (B3) |
| **Input struct** | ⚙ | `engine.readInput()`, one struct per ship, ready for multiplayer (B3) |
| Reactor doctrines | ✅ | 4 modes; chips restyled brass/neon (B0) |
| The Shipyard (ship editor) | ✅ | The one tool. Export format = file format |
| Hardpoints / per-gun arcs + traverse | ✅ | Gun radius picks the weapon; big guns swing slowly |
| Enemy AI (5 archetypes) + 4 mega bosses | ⚙ | |
| 7×7 sector map, portals, landmarks | ✅ | wreck / reef / beacon / cache landmarks |
| Save | ✅ | One key: `biotank_forge_save_v2` |
| Procedural audio | ✅ | No audio files; all synthesised |
| Fleet roster | ⏭ | `FLEET_HULLS = {}`. Premades were cut on Mac's ruling; ships come from the Shipyard |
| **B4 Salvage** | ✅ | Parts drop on hit + kill, hold `N` in the Shipyard, 4 AI cores (boss/tier 3+). Plan §9 |
| **B5 Grave Choir zone** | ✅ | Rift in the home sector ≈ (1250, −900). 3 layers, capitals to strip, tomb boss, loot unbanked until you exit. Plan §9 |
| HUD reskin (`css/vibe.css`) | ✅ | Abyssal instrument glass: brass brackets, glass panels, angled chips; glow follows `--primary-cyan` (violet in the Choir). Remove = delete one `<link>` |
| **B7 The Hunt** (`js/hunt.js` + `enemyPace` in `js/ai.js`) | ✅ | Enemies paced off your top speed (they can reach you now) · charger wind-up + lunge · sniper laser paint · motes swarm · kill CHAIN (x8 = OVERDRIVE, guns 35% faster) · hostile WINGS every ~45–75 s · one PIRATE OUTPOST per non-home sector · ELITES. Plan §9 |
| Multiplayer (world codes → WebRTC co-op) | ⏭ | Post-weekend. Plan §6 |
| Phone | 🎮 | Touch is built; **real-device feel is unwitnessed** |
| FPS | 🎮 | Headless p95 ≈ 26 ms (budget ≤ 29). Mac's own machine is the real number |

### How node destruction works (B3)

- Every ship, the player's included, uses the same `nodes[]`. A shot resolves to the
  **outer part first** and the core last (`engine.shipHit`).
- **Shields protect parts.** While an enemy's shield is up, part hits go to the shield.
- A part has **HP = radius × `JUICE.nodeHpPerRadius`**. At 0 it is flagged `lost: true`.
  It is **never spliced**, so saves and `applyDesign` stay intact.
- A lost part leaves the silhouette, a lost gun drops out of `readyMounts()`, and lost
  thrusters cut thrust (down to a floor of 50%). **You fight lopsided.**
- Enemies with no cannons left stop shooting. A charger with no spikes rams for 8 instead
  of 20. Lost enemy parts drop a small mass bubble.
- Repair happens on **level-up** and **respawn**.

---

## ⚖ LAWS (break one = stop and ask Mac)

1. **The camera never compensates for hull size.** Zoom is fixed at 0.5; `[`/`]` is Mac's
   dial. A titan reads as huge *because* the frigate beside it reads small at the same zoom.
   (`js/feel.js`, ruling 2026-08-17.)
2. **Flat Ladder: power is lateral, never vertical.** No flat +damage/+HP upgrades, no
   strictly-better gear. Choices are trade-offs. (Hull classes deliberately net ~1.0 DPS.)
3. **One hull format.** There is never a second:
   ```js
   { id, frame, mark, scale, color, primaryWeapon, secAbility, nodes: [ { dx, dy, radius, type, art? } ] }
   ```
4. **One of everything.** One ship editor (`js/shipyard.js`), one renderer
   (`fluidShader.drawOrganismMembrane`), one save key, one aim path, one hit resolver.
   **Search before you add.** It probably exists.
5. **Never delete HUD element IDs.** The witnesses and `updateHUD` read them. Hide or move
   instead.
6. **The ship is its own HUD.** Prefer information on the ship and in the world over
   corner panels.
7. **Death is relocation, not punishment.** Designs are always kept (plan §5).
8. **No guilt loops, no manipulative retention.** Continuity (giving the player their
   thread back) is good; streaks and counters you can lose are not.
9. **No EVE names, UI, art or silhouettes.** Our houses, our nouns, our hulls.
10. **Never invent ship names.** Mac names ships from his art, and the filename is the
    name.
11. **`#00FF00` and `#FF00FF` are reserved engine colours** (`#00FF00` is the mount-point
    marker on module sprites). Never use them in a palette.
12. **Witness counts only go up.**

---

## 🏗 ARCHITECTURE

### Classic scripts, not modules

`js/*.js` are **classic scripts sharing globals**. They are not ES modules: adding `export`
defers the file and breaks the load order. **The load order is the `<script>` order in
`index.html`:**

```
campaign → sound → particles → packs → shaders → map → sectors → weapons → ai →
progression → fleet → designer → energy → feel → hardpoints → engine → garage →
sprites → bay → shipyard → shipyard-ui → interface
```

⭐ **The most expensive bug in this codebase, three times over:** a top-level `const` in a
classic script is **not** a `window` property. `fluidShader` resolves, but
`window.fluidShader` is `undefined`. Guard with `typeof X !== 'undefined'`, never
`window.X`.
- **Real window properties:** `engine`, `garage`, `fleet`, `FLEET_HULLS`, `sprites`,
  `saveState`, `shipyard`, `JUICE`.
- **Lexical only:** `fluidShader`, `WEAPON_TYPES`, `PRESET_DESIGNS`,
  `SECONDARY_ACTIVES_CATALOG`, `particleSystem`, `progression`, `hardpoints`.

### File map

| file | owns |
|---|---|
| `index.html` | DOM, HUD, garage, modals, **script order** |
| `js/engine.js` | game loop (60 Hz accumulator), input → `this.input`, physics, collisions, `shipHit`/`damageNode`/`loseNode`, camera, render passes, `drawShipRing`, `JUICE` |
| `js/ai.js` | `EnemyOrganism`: archetypes (mote/stalker/charger/sniper/hive), bosses, `nodes[]`, `armed(type)` |
| `js/hardpoints.js` | per-gun mounts, arcs, traverse, `readyMounts()` (skips lost guns) |
| `js/weapons.js` | `WEAPON_TYPES`, `Projectile` (`hits(x,y,r)`), mines, drones |
| `js/fleet.js` | `FLEET_HULLS`, `MOUNT_LADDER`, `HULL_LADDER`, `applyScale`, costs |
| `js/shipyard.js` + `shipyard-ui.js` | **the** ship editor |
| `js/shaders.js` | `SpringNode`, `drawOrganismMembrane`, fog vignette, **Black Sun** |
| `js/sprites.js` | the **only** file with `drawImage`; wraps the membrane renderer with art |
| `js/particles.js` | `particleSystem` (cap 200): bursts, sparks, trails |
| `js/progression.js` | mass drops + magnet, 6 evolution tiers, GP |
| `js/energy.js` | the 4-mode reactor (`1`–`4`) |
| `js/feel.js` | movement + zoom dials |
| `js/map.js` · `js/sectors.js` | 7×7 chambers, portals · landmarks (wreck/reef/beacon/cache) |
| `js/campaign.js` | `saveState`: the one save document, missions, crews, relics |
| `js/garage.js` · `js/bay.js` | garage UI · fitting bay |
| `js/interface.js` | top-level UI wiring, F1 diagnostics panel |
| `js/sound.js` | procedural Web Audio |
| `art/` | `manifest.json` + `keyed/` PNGs (ships, enemy ships, modules) |
| `scripts/` | Playwright witnesses + Python art pipeline |
| `_retired/` · `archive/` | tagged-out code and old docs. **Retire, don't delete** |

### The ladders the game hangs on

**MOUNT_LADDER**: a cannon's **radius picks its weapon**.

| band | radius ≥ | weapon |
|---|---|---|
| POINT | 0 | spitter |
| LIGHT | 10 | twin |
| MEDIUM | 16 | laser |
| HEAVY | 23 | homing |
| SIEGE | 31 | railgun |

**HULL_LADDER**: classed by node count. DPS falls as HP rises, so the net is ~1.0 on purpose.

| class | nodes ≥ | dps × | hp × |
|---|---|---|---|
| FRIGATE | 0 | 1.00 | 1.00 |
| CRUISER | 8 | 0.80 | 1.30 |
| BATTLESHIP | 14 | 0.62 | 1.75 |
| TITAN | 25 | 0.45 | 2.40 |

⚠ `applyScale` multiplies **layout (`dx`,`dy`) and core radius only**, never a cannon or
part radius, or every gun silently re-bands.

### The canon (Sovereign Eclipse → Black Current)

The full mapping is in plan §3. In short:
- **Places:**
  - **Asterion Forge** is the home hub;
  - the **Spectral Black Sun** hangs in the sky;
  - the **Micro ZJ worlds** become special zones: **Grave Choir** (first), Black Sun
    March, Aether Crucible;
  - the **Five Great Depths** sit deeper.
- **Civilisations become ship styles:**

  | civilisation | style |
  |---|---|
  | Human Hunters | steampunk |
  | AI Hunters | cyberpunk |
  | Pagan AI / the Horned Archive | strange AI |
  | Hybrid Fused | membrane, the player's default lineage |
  | Chaos | the chaos faction |

- **Death follows SE Continuity:** designs are kept, and cargo stays in your wreck.

⚠ The SE source and its extraction bible live on Mac's machine, not in this repo. Confirm a
canon fact with Mac before shipping it as content.

---

## 🧪 TESTING

| command | what |
|---|---|
| `npm run serve` | static server on 8811 (the witnesses expect it; override with `GAME_URL`) |
| `npm test` | `witness-workshop` (31) + `witness-phase-one` (36), headless Firefox |
| `npm run check` | `node --check`-style syntax pass over `js/*.js` |
| `npm run fps` | render-pass attribution: p95 frame time, budget ≤ 29 ms |
| `node scripts/witness-shipyard.mjs` | the ship editor laws |

The scripts find Playwright from `node_modules`, or from `PLAYWRIGHT_PATH` if that is set.
⚠ `scripts/validate-pack.mjs` and `scripts/witness-skin-selector.mjs` test the **retired**
art-pack system and fail by design. Retire them, don't count them.

**A green test is not a green browser, and a green browser is not a green phone.** Frame
pacing, heat, touch feel and fun are only answered by Mac playing it.

---

## 🗺 ROADMAP

1. **B4 Salvage:** wrecks and shot-off parts drop parts and metal. Parts unlock *shapes*
   in the Shipyard (access, not power). The first strange-AI core pickup is a lateral
   mutation choice.
2. **B5 Grave Choir**, the first special zone: violet veils, rib structures of dead
   capitals, a glitching HUD near the AI, and a guardian boss at the bottom. Its salvage is
   lost on death unless you extract.
3. **B6 Verdict:** Mac plays on desktop and phone.
4. **Then:** Black Sun March (darkness + sonar), Pod-eject death, capital ships as mobile
   respawn docks, and Titans as moving worlds with districts you can damage.
5. **Multiplayer:** M0 shared world codes, then M1 live co-op for 2–4 players (host sim,
   WebRTC, a tiny Cloudflare Worker for the handshake). The first co-op target is a Titan
   hunt.
6. **Android APK:** `APK_BUILD_PLAN.md` (Capacitor). It is the reward for FPS, not a route
   around it.

### Mac's open calls (plan §7). Defaults in use until he rules

| question | default |
|---|---|
| Player lineage | **Hybrid Fused** (flavour + colour only for now) |
| First special zone | **Grave Choir** |
| Death rules | **plan §5**: designs kept, cargo stays in the wreck |
| Black Sun always in the sky? | **yes** |

---

## 📚 DOC INDEX

| doc | status |
|---|---|
| `README.md` | ⭐ current: this file |
| `GAME_VISION.md` | ⭐ locked north star |
| `PLAN_WEEKEND_BLITZ_2026-10-23.md` | ⭐ **current plan + receipts + runbook** |
| `CHANGELOG.md` | current |
| `PLAN_FPS_AND_FUN_2026-10-23.md` | recent: the FPS pass and its receipts |
| `APK_BUILD_PLAN.md` | Android release plan |
| `ART_IN_THE_GAME.md` · `ART_PROMPTS.md` · `ART_DROP_2026-08-17.md` | art pipeline + prompts |
| `MODULAR_SHIPS.md` · `FLEET_ROSTER.md` · `DREADNOUGHT_PLAN.md` · `LYCHEETAH_CLASS.md` · `DEPTH_TECHNIQUES.md` | design background |
| `PLAN_2026-08-17.md` · `OPUS_ENGINE_HANDOFF.md` · `PARALLEL_LANES_*` · `BLACK_CURRENT_RECONCILIATION_*` · `SOLPRIME_*_HANDOFF_*` · `GROK_TONIGHT.md` · `TEST_TONIGHT.md` | history: read only if a task points there |
| `AGENTS.md` | a local seat anchor for a different tool, with paths on Mac's machine. **Not instructions for you** |
| `archive/README_2026-08-17.md` | the previous README (defect history, art keying rules in detail) |

---

*Black Current: design, direction and authorship by Mackenzie Conor James Clark.
Built with AI collaborators. Lore from his Sovereign Eclipse canon.*
