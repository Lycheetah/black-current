# 🚢 BLACK CURRENT — *Bubble Tanks: Forge Edition*

**Top-down dreadnought combat.** Zero dependencies, zero build step, one HTML file
and a folder of classic scripts.

| | |
|---|---|
| **Version** | 2.0.0 — Black Current |
| **Live URL** | `http://localhost:8811/` ✅ *fixed everywhere 2026-08-17; 8082 is dead* |
| **Root** | `/home/guestpc/Desktop/bubble-tanks-forge/` |
| **Version control** | 🔴 **NOT a git repository.** There is no undo. Tag files to `_retired/`; never `rm`. |
| **Authorship & taste authority** | Mackenzie Conor James Clark (Mac) |
| **Agent seat** | Aetheron (Antigravity). Sol (Claude) works here at Mac's request. |
| **Last verified** | 2026-08-17 |
| **📱 APK release** | ▶ **`APK_BUILD_PLAN.md`** — the full, self-contained build plan. Any model can execute it cold. |

> *"a wee eve version with top down dreadnought gameplay"* — Mac. **Locked. His idea.**
> ⛔ Never describe this game to anyone as "EVE but X".

---

> **STATUS 2026-10-23 (Sol).** FPS pass 1 landed (82.7 → ~26 ms headless, target not yet met) and modals now fit the screen. Full receipts, backups and the next-seat handoff are in `PLAN_FPS_AND_FUN_2026-10-23.md` §8–9. Profiler: `scripts/profile-fps.mjs`.

## ⚖ HOW TO READ THIS FILE

Every claim below is marked. **This matters more than the content**, because the
previous version of this README described a game that no longer existed — it
claimed a designer that has been retired, fifteen art packs that have been
removed, and "zero image files" over a folder of 270 PNGs.

| mark | means |
|---|---|
| ✅ **MEASURED** | observed running, in a browser, this week |
| ⚙ **BUILT** | code exists and syntax-checks; behaviour not witnessed |
| 📐 **RULED** | Mac has decided it; not built |
| 🔴 **BROKEN** | measured to be wrong |
| ⏭ **OPEN** | nobody has done it |

⛔ **A green gate is not a green browser, and a green browser is not a green
phone.** Frame pacing, heat, touch latency and whether the loop is *fun* are only
ever answered by a person holding the device. **The phone is completely
unwitnessed.** Every screenshot in `shots/` is desktop 1440×900.

---

## 🎮 RUN IT & PLAY IT

```bash
cd /home/guestpc/Desktop/bubble-tanks-forge
python3 -m http.server 8811
# then open http://localhost:8811/
```

No install, no build, no npm. It is `index.html` and a folder of scripts.

### CONTROLS — ✅ read from the source 2026-08-17, not remembered

**Flying**

| key | does |
|---|---|
| `WASD` | move |
| **mouse** | aim. Touch aims by dragging the right half of the screen — **same one path**, see Defect 1. |
| `Space` / `Q` | secondary ability |
| `M` | map |
| `B` | fitting bay |
| `Y` / `TAB` | **THE SHIPYARD** — the one ship editor |
| `N` | sector overlay |
| `f` / `F` | cycle fleet hull forward / back |
| `r` | restore your own ship |
| `Enter` | launch (garage) |
| `Esc` | close whatever is open |

**Dev dials — these are how you hunt the FPS problem**

| key | does | file |
|---|---|---|
| `G` | **sprites on/off** | `sprites.js` |
| `H` | membrane underlay on/off | `sprites.js` |
| `J` | chassis strokes on/off | `sprites.js` |
| `;` / `'` | sprite gain − / + | `sprites.js` |
| `K` | show firing arcs | `hardpoints.js` |
| `<` / `>` | turret turn rate − / + | `hardpoints.js` |
| `[` / `]` | fog − / + | `shaders.js` |
| `\` | reset | ⚠ **resets fog *and* turn rate — double-bound** |

⚠ **`[` and `]` are TRIPLE-BOUND** — fog (`shaders.js`), zoom (`feel.js`) and bay
resize (`bay.js`, which grabs them on capture while the bay is open). Pressing
them does more than one thing. On the housekeeping list; not fixed.

⭐ **To localise the FPS drop, press `G`, then `H`, then `J` — one at a time**,
and watch the counter after each. Those three toggles are the three render passes.

### Where the ships come from

🔴 **The roster is empty.** `FLEET_HULLS = {}` — every premade was cut on Mac's
ruling, so `f`/`F` currently cycle nothing. **Press `Y`, build one, hit SAVE TO
ROSTER.** It goes into the game live and survives a refresh. That is the only
door back in, and nothing has been authored through it yet.

---

## 🔴 WHAT IS BROKEN RIGHT NOW — FIX THESE FIRST

### DEFECT 1 — "some areas don't even allow you to shoot" · **REAL, BUT UNDIAGNOSED**

> *"note some areas dont even allow you to shoot"* — Mac, 2026-08-16

🔁 **RETRACTED 2026-08-17 — the cause previously printed here was wrong.** This
file used to state that `_aimX` had no touch writer and that *"the phone can
therefore never fire."* That is false. Re-measured, at the lines:

| | where | verdict |
|---|---|---|
| `this.mouse.x/y` written by **mouse** | `js/engine.js:154-155` (`clientX/clientY`) | ✅ |
| `this.mouse.x/y` written by **touch** | `js/engine.js:205-206` + the touchmove branch — **same fields, same units** | ✅ |
| `this.mouse.down` set by touch | `js/engine.js:205` → read at `js/engine.js:799` to fire | ✅ |
| `_aimX/_aimY` written | `js/engine.js:749-750` in `update()`, **derived from `this.mouse` every frame** | ✅ |
| `_aimX/_aimY` read | `js/hardpoints.js:150`, called from `js/engine.js:753` — **3 lines after the write, same function, same frame** | ✅ |
| `hardpoints.update()` callers | `js/engine.js:753` and nowhere else — **player only, no enemy hits that read** | ✅ |

**So the aim path is one mechanism and touch is already on it.** The writer cannot
miss a frame the reader runs, because the writer is three lines above the reader
in the same function. The NaN-stickiness story that used to be printed here had
no way to trigger.

⚠ **WHY IT WAS MISREAD, so nobody repeats it:** both touch handlers still compute
a `const mouseWorldX` / `mouseWorldY` that **nothing uses** — dead leftovers from
the second aim path deleted on 2026-08-16. Reading dead aim maths inside the touch
handler looks exactly like a missing write. **Delete those four lines.**

🔴 **MAC'S REPORT STANDS AND IS NOW UNEXPLAINED.** He saw guns that would not
fire. A wrong diagnosis does not clear an observed symptom — it just means the
cause is still out there. **Do not close this.** Next probes, in order:

1. `readyMounts()` / `t.bearing` — a gun that never bears never fires, and the
   arc is `arcA - r * arcB` (`js/hardpoints.js:105`), so a **big** gun has a
   **narrow** arc. On a wide hull the target may sit outside every arc at once.
2. `shootPrimary()` — ⚠ **it never reads the node array** (known, still true):
   six cannons shoot identically. Check whether it early-returns on some state.
3. `reactor` / energy triage — a drained pool may be gating the shot silently.

Only claim a fix here after firing on the actual device.

### DEFECT 2 — "you load into new reefs too often" · **PARTLY ADDRESSED**

✅ **MEASURED:** chamber radius is now `2600` in `js/map.js:25` (was 750). The
**re-entry inset** — how far inside the new chamber you are placed — has *not*
been re-measured since. ⏭ Re-measure it before calling this closed: arriving
~120px from the boundary you just crossed is about 7 frames of travel, and any
backward drift re-triggers the transition. That thin lip was always the worse half.

### DEFECT 3 — FPS · **MAC'S MEASUREMENT, UNFIXED**

🔴 **FPS 17, then 7.** Mac's number from his own screen (Firefox, 80% zoom,
1366×768). Nothing in this project is judgeable until this is fixed.
**Diagnosed, not repaired:** roughly three full passes per capital ship —
chassis strokes, then a membrane underlay at 0.82 alpha, then up to 27 sprites —
plus a doubled `drawImage` per firing cannon.
**Localise it by pressing `G`, `H`, `J` one at a time and watching the counter.**

---

## ✅ WHAT ACTUALLY WORKS

| System | State | Notes |
|---|---|---|
| Engine core | ✅ MEASURED | Fixed-timestep loop, collisions, HP/shields/iFrames, respawn |
| **The Shipyard** (ship editor) | ✅ MEASURED | **28/28 witness.** The one tool — see below |
| Sprite art in the game | ✅ MEASURED | 270 keyed PNGs; `drawImage` lives in **`js/sprites.js` only** |
| Hardpoints / per-socket gunnery | ⚙ BUILT | 🟠 Defect 1 is real but its cause is retracted — see above |
| Weapons | ✅ MEASURED | 6 primaries, 5 secondaries |
| Enemy AI + 4 mega bosses | ⚙ BUILT | Not re-witnessed since the sprite work |
| 7×7 chamber matrix | ✅ MEASURED | 49 sectors, portal wrap, modal map |
| Single save seam | ✅ MEASURED | `biotank_forge_save_v2`, one key, legacy migration |
| Procedural Web Audio | ✅ MEASURED | Zero audio files; all synthesised |
| **Fleet roster** | 🔴 **EMPTY** | `FLEET_HULLS = {}`. Every premade was cut on Mac's ruling. **The Shipyard is the only door back in, and no ship has been authored yet.** |
| Node destruction | ⏭ OPEN | The keystone of dreadnought combat. Unbuilt. |
| Economy (`js/economy.js`) | 📐 RULED | Designed, unbuilt. **One decision only Mac can make: does dying cost you your fittings?** |
| Visual art packs | ⛔ **REMOVED** | `js/packs.js` + `packs/` are tagged to `_retired/`. Mac's ruling. |

---

## 🛠 THE SHIPYARD — THERE IS ONE SHIP TOOL

> *"we only need one tool bro to do it properly."* — Mac, 2026-08-17

**Open with `Y`, `TAB`, the on-screen 🛠️ button, or the touch button. All four
land in the same place.** `js/designer.js` used to be a second, rival ship editor;
it is now **data only**, and its class is preserved whole at
`_retired/designer-ui-class.js` with a line-by-line map of where every feature went.

**⭐⭐ THE ONE LAW: THE EXPORT FORMAT *IS* THE FILE FORMAT.**
What EXPORT writes is byte-for-byte what `FLEET_HULLS` wants and what
`engine.applyDesign()` already eats:

```js
{ id, frame, mark, scale, color, primaryWeapon, secAbility, nodes: [ { dx, dy, radius, type } ] }
```

There is no serialiser. The editor mutates a real hull object and prints it, so
"what the tool has" and "what the file needs" can never drift apart.

- **The editor draws with the game's renderer** (`fluidShader.drawOrganismMembrane`),
  the exact call `engine.js` makes for the player. A second renderer in the editor
  would be a tool that shows you something the game will not.
- **`SAVE TO ROSTER`** puts the hull into `FLEET_HULLS` live and persists it, so
  `f`/`F` reach it in flight and it survives a refresh.
- **`EXPORT`** gives the literal `js/fleet.js` entry to paste in permanently.
- **The GP gate is on the COMMIT, not the placement.** Draw anything; the budget
  line turns red and says by how much; **FLY refuses and names what is over.**
  EXPORT and SAVE never check — *a roster hull is not a fitting*, and an enemy
  dreadnought was never meant to be paid for out of the player's GP.

### The ladders the whole game hangs on

**MOUNT_LADDER** — a cannon's **radius picks its weapon**. Nothing else does.

| band | radius ≥ | weapon | tint |
|---|---|---|---|
| POINT | 0 | spitter | `#8FA6C4` |
| LIGHT | 10 | twin | `#00f3ff` |
| MEDIUM | 16 | laser | `#bc13fe` |
| HEAVY | 23 | homing | `#39ff14` |
| SIEGE | 31 | railgun | `#ff3366` |

**HULL_LADDER** — by total node count. Net DPS is ~1.0 at every tier **on purpose**:
power in this game is **lateral, not vertical.**

| class | nodes ≥ | dps × | hp × |
|---|---|---|---|
| FRIGATE | 0 | 1.00 | 1.00 |
| CRUISER | 8 | 0.80 | 1.30 |
| BATTLESHIP | 14 | 0.62 | 1.75 |
| TITAN | 25 | 0.45 | 2.40 |

⭐⭐ **TRAVERSE SPEED IS THE KEYSTONE STAT.** Big guns feel big without dealing
more damage, and small ships counter them by getting inside the arc. Traverse is
derived from mount radius, so every gun in the game obeys it retroactively.

⚠ **`applyScale` multiplies LAYOUT (`dx`,`dy`) and CORE radius ONLY** — never a
cannon, pod, shield, spike or thruster radius, or `mountBand()` silently re-bands
every gun on the ship. There is exactly one implementation; never write a second.

---

## 📁 FILE MAP

```
bubble-tanks-forge/
├── index.html          UI, HUD, garage, modals. ⚠ SCRIPT ORDER IS LOAD-BEARING.
├── README.md           this file
├── AGENTS.md           seat anchor (Aetheron / Antigravity)
├── PLAN_2026-08-17.md  working history. ⭐ PART 12 IS THE CURRENT RULING (read it)
├── APK_BUILD_PLAN.md   ⭐ the Android release plan. Self-contained, cold-start safe
├── GAME_VISION.md      the north star. Read this before proposing anything.
├── ART_IN_THE_GAME.md  how the 270 keyed PNGs reach the screen
├── ART_DROP_2026-08-17.md  survey of Mac's ship art drop (106 files)
├── js/
│   ├── engine.js       game loop, physics, collisions, camera. ⚠ TWO SEATS EDIT THIS. Touch it least.
│   ├── shipyard.js     ⭐ THE ship editor (Y / TAB). Self-owning.
│   ├── designer.js     ⛔ DATA ONLY now — PRESET_DESIGNS + catalogues + a redirect
│   ├── fleet.js        FLEET_HULLS (empty), MOUNT_LADDER, HULL_LADDER, costOfNode, applyScale
│   ├── sprites.js      ⭐ the ONLY file containing `drawImage`. One art seam.
│   ├── hardpoints.js   per-socket gunnery, traverse, arcs. 🟠 Defect 1 suspect #1.
│   ├── shaders.js      SpringNode + drawOrganismMembrane — the renderer the editor also uses
│   ├── bay.js          fitting bay
│   ├── feel.js         movement dials
│   ├── energy.js       4-mode energy triage
│   ├── sectors.js      sector content
│   ├── map.js          7×7 chamber matrix, portals
│   ├── campaign.js     save state, missions, crews, relics
│   ├── progression.js  mass, 6 evolution tiers, GP
│   ├── weapons.js      WEAPON_TYPES — 6 primaries
│   ├── ai.js           5 archetypes + 4 mega bosses
│   ├── garage.js       garage UI
│   ├── particles.js    particle engine
│   └── sound.js        procedural Web Audio
├── art/
│   ├── manifest.json   the sprite manifest sprites.js reads
│   └── keyed/          ships 36 · enemy-ships 17 · modules 217  (270 total)
├── scripts/            python art pipeline + node witnesses (see below)
└── _retired/           tagged, not deleted: packs.js, packs/, designer-ui-class.js
```

⛔ **`js/*.js` ARE CLASSIC SCRIPTS SHARING GLOBALS — NOT ES MODULES.** Adding a
single `export` defers the file and breaks the load order in `index.html`.

⭐⭐ **THE MOST EXPENSIVE BUG IN THIS CODEBASE, THREE TIMES OVER:**
a top-level `const`/`let` in a classic script binds into the **global lexical
environment, NOT onto `window`**. So `fluidShader` resolves and
`window.fluidShader` is `undefined`. Guarding with `window.X` silently takes the
fallback and reports success. **Always use `typeof X !== 'undefined'`.**
Confirmed lexical-only: `fluidShader`, `WEAPON_TYPES`, `PRESET_DESIGNS`,
`SECONDARY_ACTIVES_CATALOG`. Confirmed real window properties: `engine`, `garage`,
`fleet`, `FLEET_HULLS`, `sprites`, `saveState`, `shipyard`.

---

## 🎨 THE ART

✅ **MEASURED:** 270 keyed PNGs on disk, reaching the screen through **one seam**
(`js/sprites.js`), with **zero `engine.js` edits**.

⭐⭐ **A COLOUR KEY ONLY WORKS WHEN THE BACKGROUND COLOUR IS ABSENT FROM THE
SUBJECT.** Against black, "distance to background" *is* brightness — so a naive
keyer ate every dark ship. ⭐ **The generator gives three backgrounds, not one**
(12 alpha / 9 magenta / 21 black). **Probe the file, never the prompt.**

⛔ **PURE GREEN `#00FF00` AND PURE MAGENTA `#FF00FF` ARE RESERVED ENGINE
COLOURS** and may not appear in any faction palette. `#00FF00` is the
machine-readable **mount-point marker** painted on every module sprite. A
whole-bitmap colour sweep cannot tell a marker from paint — **strip mount-local
only.** (`#39ff14`, the engine's own green, is *not* the marker.)

⛔ **A CORE NODE WEARS NO SPRITE.** A file with several sockets is a **HULL**, not
a part.

⚠ **136 usable is not 99 drawable.** Count what *draws*, not what *parses*.

⛔ **DO NOT INVENT SHIP NAMES.** Mac names his ships from the art he generates.
**The filename is the name** — *"if it clearly says that it definetly is."*
A guessed name is an invented name, and an invented name splits the roster.

---

## 🧪 VERIFICATION

```bash
# serve (any static server on 8811)
python3 -m http.server 8811

# the ship editor — 28 laws, real browser, writes screenshots
node scripts/witness-shipyard.mjs

# other witnesses
node scripts/witness-sprites.mjs
node scripts/witness-fleet.mjs
node scripts/witness-movement-feel.mjs

# the art drop survey — PARSE ONLY, copies nothing, writes no assets
python3 scripts/parse-ship-drop.py

# syntax only
node --check js/shipyard.js
```

⚠ `scripts/validate-pack.mjs` and `scripts/witness-skin-selector.mjs` **test the
removed pack system and will fail.** That is expected and pre-existing, not a
regression. They need retiring or rewriting.

⛔ **NEVER pipe a command and then read `$?`** — that returns the exit code of the
*last* command in the pipe, not the program's.

---

# 🤝 BRINGING IN ANOTHER MODEL

> *"how gemini can continue helping me forge this game"* — *and any model from
> **Gemini 3.7** to **DeepSeek V4**, GPT, Grok, whatever Mac has open.*

An outside model **cannot see this repo, cannot run the game, and cannot see the
screen.** That single fact decides what it should and should not be given.

## ⛔ NEVER PASTE THESE INTO A BROWSER MODEL

| file | why |
|---|---|
| `~/.claude/CLAUDE.md` | Sol's private execution anchor. **Never.** |
| `_PROPRIETARY/constitution/SOL_PRIME.md` and its symlinks | private constitution |
| anything containing an API key | three repos are already blocked by live keys |

Paste **game files** — `js/*.js`, the design docs, the art prompts. Not identity files.

## ✅ WHAT AN OUTSIDE MODEL IS GENUINELY GOOD AT HERE

1. **Reviewing one pasted file against a stated law.** Give it `js/hardpoints.js`
   and the NaN analysis above and ask it to find every other unguarded read. This
   is its best job: bounded, textual, no execution needed.
2. **Balance tables and content data.** Faction stat spreads, encounter tables,
   sector contents, weapon numbers against the two ladders above. Pure data, and
   the ladders give it a rigid frame to work inside.
3. **Art prompts.** `ART_PROMPTS.md` and `GROK_TONIGHT.md` are paste-ready.
   Generating prompt variations is real, useful, parallel work.
4. **Writing a witness script.** Describe the law; ask for a Playwright script
   that fails when the law is broken. ⚠ Then *mutate the code to make it fail
   once* — a witness that has never gone red has not been proven to be able to.
5. **Naming and flavour text** — for **frames, factions and abilities**.
   ⛔ **Not ship names.** Those are Mac's, from his art.
6. **Explaining a system back.** Paste a file, ask what it does. Cheap, and it
   catches the thing you assumed.

## 🔴 WHAT IT WILL GET WRONG

- **Anything that needs the screen.** It cannot tell you if the game feels good,
  looks right, or runs at 60fps. Only Mac holding the device can.
- **`engine.js`.** Two seats already edit that file. A blind rewrite of it is the
  fastest way to lose a night's work in a repo **with no git history to restore from.**
- **The `window.X` trap.** Every model writes `window.fluidShader`. It is
  `undefined`. Say so in the prompt, every time.
- **Reinventing what exists.** It will happily propose a "ship designer", a
  "scale system", a "sprite loader". All three exist. **Make it search first.**
- **Confident invention.** It will produce ship names, faction lore and file paths
  that do not exist and say them with total confidence. Verify every path.

## 📋 THE PROMPT PREAMBLE — paste this above whatever else you send

```
You are helping forge BLACK CURRENT, a zero-dependency top-down dreadnought game
in HTML5 Canvas. Vanilla JS classic scripts sharing globals — NOT ES modules;
adding `export` breaks the load order. There is NO build step and NO framework.

You cannot see the repo, run the game, or see the screen. Work only from what I
paste. If you need a file to answer, ASK FOR IT — do not imagine its contents.

HARD RULES:
1. Never invent a ship name. The filename is the name; Mac names his own ships.
2. #00FF00 and #FF00FF are reserved engine colours. #00FF00 is the mount-point
   marker painted on module sprites. Never use either in a palette.
3. A top-level `const` in a classic script does NOT become a window property.
   `window.fluidShader` is undefined; `fluidShader` is not. Always guard with
   `typeof X !== 'undefined'`.
4. There is exactly ONE ship editor (js/shipyard.js) and ONE renderer
   (fluidShader.drawOrganismMembrane). Never propose a second of either.
5. A cannon's RADIUS picks its weapon (POINT 0 / LIGHT 10 / MEDIUM 16 /
   HEAVY 23 / SIEGE 31 px). Scale multiplies layout and core radius ONLY —
   never a cannon/pod/shield/spike/thruster radius.
6. This is NOT a git repository. There is no undo. Never propose deleting a
   file — propose moving it to _retired/.
7. Do not copy any other game's art, names or signature layout. Take the
   register, author our own. Never call this "EVE but X".
8. Give me COMPLETE files or exact find-and-replace blocks with enough
   surrounding context to be unambiguous. Never give me a fragment with
   "// ... rest unchanged".
9. Mark every claim: MEASURED / BUILT / RULED / OPEN. If you have not seen it
   run, it is not MEASURED. Say "I don't know" rather than guessing a path.

Ask me clarifying questions before writing code if the task is ambiguous.
```

## 🔁 THE LOOP THAT ACTUALLY WORKS

1. **Mac picks one job** from the agenda below, or from `PLAN_2026-08-17.md`
   **PART 12** — the most recent ruling, and the one to read first.
2. **Paste the preamble + the one or two files that job touches.** Not the repo.
   A model given ten files reasons about none of them.
3. **It returns a complete file or an exact replacement block.**
4. **Paste it back here.** The seat with repo access applies it, runs
   `node --check`, runs the relevant witness, and **reads the screenshot back.**
5. **Mac judges the screen.** Nothing is done until he has.

⭐ **The split this project treats as fatal is a split roster** — two definitions
of the same ship, two renderers, two editors, two save keys. When an outside model
proposes something new, the first question is always: **does this already exist?**

---

## ⏭ THE AGENDA

⭐ **The current ruling is `PLAN_2026-08-17.md` PART 12** (2026-08-17). The
Android release has its own complete plan in **`APK_BUILD_PLAN.md`**. Short form:

1. 🔴 **FPS** — nothing is judgeable until this is fixed.
2. 🔴 **Art ingest** — 88 of 106 filenames parsed; **nothing copied yet**.
   13 unnamed ChatGPT exports still need names from Mac.
3. 🔴 **Author the first ships** — the roster is empty and the Shipyard is the door.
4. ✅ ~~One tool~~ — **done 2026-08-17**, 28/28.
5. 🔴 **Defect 1** — guns that will not fire. Cause RETRACTED 2026-08-17, symptom still open.
6. 🟠 **Node destruction** — the keystone of dreadnought combat.
7. 🟠 **The economy** — ⚠ *does dying cost you your fittings?* **Mac's call alone.**
8. 🟡 **Housekeeping** — two dead witnesses (`validate-pack.mjs`,
   `witness-skin-selector.mjs` — retire, do not delete), `[`/`]` **triple-bound**
   and `\` **double-bound**, 17 markdown files at the repo root.
   ✅ ~~dead port 8082~~ fixed 2026-08-17.

9. ⭐⭐ **WEAPON SIZE RATIOS — Mac's ruling 2026-08-17.** An editable visual size
   for weapons, as presets *and* a per-class global.
   🔴 **THE TRAP: a cannon's `radius` drives FOUR things** — draw size, which
   weapon it fires (`mountBand`), its arc, and **its traverse, the keystone
   stat.** A naive resize silently re-bands and re-feels the gun.
   ✅ **THE FIX: split it.** `n.radius` = class. `n.sizeRatio` (new, default 1)
   = **visual only**. ⛔ **`hardpoints.js` must NEVER read `sizeRatio`** — make
   that a grep in the witness. Full spec in `PLAN_2026-08-17.md` PART 12b.
10. 📱 **THE ANDROID APK** — full plan in **`APK_BUILD_PLAN.md`**.
   🔴 SDK / gradle / adb are all missing (1–2 GB download, start it early).
   🔴 `js/sprites.js:160` does `fetch()`, which **dies silently on `file://`** —
   use Capacitor, not a bare WebView. 🔴 `art/` is 215 MB of a 220 MB project.
   ⛔ **The APK is the reward for fixing FPS, not a route around it.**

⚠ **PHONE COMPLETELY UNWITNESSED.**
