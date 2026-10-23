# GAME VISION — LOCKED
### `bubble-tanks-forge` / BLACK CURRENT · stable name, edit this file, never date-stamp a copy

---

## THE RULING — Mac, 2026-08-16

> *"this game will be like a wee eve version with top down dreadnought gameplay"*
>
> *"lock that in now — as its all my ideas"*

⭐ **DECIDED. This is the north star and it is not to be relitigated.** Every
later decision in this repo answers to this sentence. When a feature and this
sentence disagree, the feature is wrong.

**Authorship: Mackenzie Conor James Clark.** The direction, the register, the
call to build ships from bases and parts, the module grids, the zoomed-out
camera — his. Recorded here so the record is unambiguous.

---

## WHAT THE SENTENCE ACTUALLY COMMITS US TO

Three words carry the whole design. Taken one at a time:

### "wee"

⛔ **SMALL ON PURPOSE.** Not a 20-year universe sim, not a spreadsheet, not a
second job to learn. The depth is in the *ships*, not in the paperwork, the
politics or the skill queue.

**Therefore:** ⛔ **THE BAN WAS ALWAYS ON *WAITING*, NEVER ON SYSTEMS.**
No skill-training timers, no market orders that mature overnight, no travel you
sit through, no corporation paperwork. **The fun is reachable in under a minute.**

⭐ **AMENDED 2026-08-16 — hubs and markets are IN**, because neither one makes
you wait. ▶ *Sovereign Hubs*, below. The earlier flat "no market, no
sovereignty" was too broad and is withdrawn.

### "top down dreadnought"

⭐ **THIS IS THE MECHANIC, AND IT IS THE ONE THAT MAKES US DIFFERENT.** A
dreadnought is not a fighter with more hit points. It is a different *verb*:

| a fighter game says | a dreadnought game says |
|---|---|
| dodge the bullet | **you cannot dodge — angle the armour** |
| turn to face | **turning takes real time and you commit to it** |
| one gun, points where you point | **many guns, each with its own arc and traverse** |
| you die | **your starboard battery dies, and you fight on lopsided** |

⭐ **MASS IS THE FEELING.** Acceleration, turn rate and stopping distance are the
core sensation. A capital that pivots instantly is a fighter wearing a big
sprite, and the fantasy dies on the first input.

⭐ **TRAVERSE SPEED IS THE KEYSTONE STAT.** Capital guns swing slowly. That one
number does four jobs at once:

1. It makes big guns *feel* big without inflating damage.
2. It gives small fast ships a real, skill-expressed counter — **get inside the
   arc and the battery cannot answer you.**
3. It lets a slow hull still feel powerful, because fast turrets on a heavy hull
   read as *capable*, not sluggish.
4. It makes facing matter, which is what turns positioning into gameplay.

⚠ **UNBUILT.** `shootPrimary()` today fires from the core at `player.angle` and
does not read the node array at all — **six cannons shoot identically to zero
cannons.** Per-socket weapons with their own arcs is therefore *the* gameplay
unlock, not a polish item. **MEASURED** in `js/engine.js` / `js/weapons.js`.

### "like a wee eve version"

⭐ **REGISTER, NOT REPLICA.** What we take from that reference is the *feeling*
of scale and consequence: ships that read as enormous, industrial and owned;
loadouts that express identity; loss that means something.

⛔ **WE TAKE NOTHING ELSE.** No EVE names, no EVE UI, no EVE art, no EVE ship
silhouettes, no signature layout. Our houses, our nouns, our hulls. ⛔ **Never
describe the game to anyone as "EVE but X"** — the reference is a private tuning
fork for us, not a marketing line, and it prices our own work at second-hand.

---

## WHAT THIS MAKES TRUE ABOUT THE BUILD

The vision and the architecture already agree, which is the good news:

| the vision demands | already exists |
|---|---|
| ships that are assemblies, not sprites | **the node graph IS the ship** — `PRESET_DESIGNS`, `{dx,dy,radius,type}` |
| hulls with real hardpoints | ▶ `MODULAR_SHIPS.md` — bases declare sockets, **compiles down to the same `nodes[]` array** |
| parts that read as *mounted* | ▶ `ART_PROMPTS.md` — collars, gimbal rings, keyed flanges, green mount dot |
| you can see the whole ship | **camera zoom** shipped at 0.62 — ⚠ UNWITNESSED |
| losing a battery matters | ⚠ **node destruction — UNBUILT.** The keystone. |
| facing matters | ⚠ **per-socket weapons + traverse — UNBUILT.** |

⛔ **THE ONE LAW STANDS:** a base + loadout must compile down to the existing
`nodes[]` array. Adapter, never a second format. **A split roster is the only
failure that actually matters.**

---

## 🖥 "CAN AN HTML GAME RUN THIS?" — MEASURED, 2026-08-16

**Yes, and not marginally.** The honest constraint is not the browser, it is
**decoded bitmap memory**, and it is entirely under our control.

**MEASURED, current keyed library:**

| category | assets | on disk | pixels | largest edge |
|---|---|---|---|---|
| ships | 36 | ~64 MB | 44.2 Mpx | **2152 px** |
| modules | 215 | ~24 MB | 12.2 Mpx | 479 px |
| enemies | 17 | 4.5 MB | 2.9 Mpx | 613 px |
| **total** | **268** | **~92 MB** | **~60 Mpx** | |

A decoded RGBA bitmap costs `w × h × 4` bytes in RAM regardless of how small the
PNG is on disk. So the whole question is *what size we bake to*:

| baked cap | RAM | verdict |
|---|---|---|
| native | **237 MB** | ⛔ kills a phone |
| 512 px | 247 MB | ⛔ worse — 35 ships get *upscaled* into the cap |
| 384 px | 139 MB | ⚠ desktop only |
| **256 px** | **62 MB** | ✅ **the target** |
| 192 px | 35 MB | ✅ comfortable |
| 128 px | 15 MB | ✅ trivial, but capitals lose detail |

⭐ **THE SHIPS ARE THE PROBLEM AND THE MODULES ARE FREE.** 36 ships hold ~74% of
all pixels because they were generated at up to 2152 px, while 215 modules hold
20%. **MEASURED:** cap ships at 256 px and modules/enemies at 128 px and the
entire library bakes to **25 MB of texture** — 9 MB of ships, 15 MB of parts.
Less than one modern web page of images, and that is the *whole* library at once.

⚠ **AND NONE OF IT IS LOADED AT ONCE.** A run touches one player hull, a handful
of module types and a few enemy species. Load-on-demand plus an LRU cache means
the working set is a dozen sprites, not 268.

⛔ **THE REAL DECISION IS STILL MAC'S AND STILL OPEN:** the engine today is
**100% procedural — zero image files, zero sprite loader, `ctx.drawImage` appears
nowhere.** All 16 art packs are hand-traced JSON polygons. **268 assets cannot be
hand-traced.** So either the art stays reference-only for tracing, or we add a
real sprite path. That is an architectural change, it is his call, and it has not
been made. **UNDECIDED — do not sneak it in.**

---

## 📦 THE ART LIBRARY — RECEIPT, 2026-08-16

**MEASURED.** 49 source sheets → 285 slices → **268 keyed assets** after purge.

▶ `art/keyed/ships/` **36** · `art/keyed/modules/` **215** ·
`art/keyed/enemy-ships/` **17**
▶ `art/sliced/manifest.tsv` — maps every asset to its source sheet, slot, grid
row/column and md5. **This is the only record that survives deleting the
originals, which Mac asked for.**

**Purged as junk (17):** 4 engine-glow fragments mistaken for ships, 1 leftover
magenta key card, 10 muzzle-flash specks, 2 whole-sheet merged blobs.

⭐ **THE DROP FOLDER IS AN INBOX, AND IT IS NOW EMPTY.** Mac's ruling: *"make
sure you delete the ones you used as it doesn't matter me adding more stuff."*
A source sheet is deleted only after its slices exist and its md5 is written to
the manifest, so anything dropped in mid-run survives untouched — **three sheets
arrived while this batch was processing and were picked up on the next pass, not
lost.** Re-run the chain any time; it slices only what it has never seen.

```
scripts/slice-sheet.py "<drop folder>" --out art/sliced --consume
scripts/key-flat-background.py art/sliced art/keyed
scripts/contact-sheet.py art/keyed/<category> --out art/contact_<category>.png
```

⭐ **THE GRID IS THE STAT TABLE.** Row and column are recorded per slice, so on a
deliberate matrix sheet (row = size class, column = damage type) module stats can
be *derived from where it was drawn* instead of from tags nobody maintains.

⚠ **Modules 101–116 and 133–160 carry no green mount dot** — those sheets predate
the mounting-point rule. Usable art, but no socket origin until redrawn.

---

## ⛔ WHAT THIS DOCUMENT IS NOT

It is not a task board (▶ `PARALLEL_LANES_2026-08-16.md`), not the art spec
(▶ `ART_PROMPTS.md`) and not the parts architecture (▶ `MODULAR_SHIPS.md`).
It is the one paragraph every one of those has to obey.

---

## ⚓ SOVEREIGN HUBS — THE RULING, Mac, 2026-08-16

> *"we are going to have — if you die you can head back to station to repair,
> like eve. we're gonna have stations, as this is already nothing like eve bro.
> citadels, but we will call them sovereign hubs, and all hubs are markets as
> well. tbh i want this to be a little eve now. its my fun, actual only fun
> project in a while and i deserve a wee little space rpg thingymajig — but
> **itll be fun, thats the main thing**"*

**Authorship: Mackenzie Conor James Clark.**

### ⭐⭐ FUN IS THE ARBITER — the highest law in this document

Every rule above and below answers to that last clause. When a system is
defensible, balanced, architecturally clean **and not fun**, it is wrong and it
loses. ⛔ This project is not allowed to become a second job — not for Mac, and
not by accumulating "correct" systems nobody enjoys.

⚠ **This is the tiebreaker to reach for whenever two good arguments deadlock.**

### ⭐ WHY THIS DOES NOT BREAK "WEE"

The `"wee"` clause banned **waiting**, not systems — that was the real content
and the flat wording above overstated it. A market you can use in ten seconds
when you dock costs zero waiting. A skill queue that costs you a fortnight costs
nothing but waiting. **Hubs and markets are on the right side of that line.**

⛔ Still banned, unchanged: skill-training timers, orders that mature overnight,
travel you sit through, corporation paperwork, anything that is homework.

### ⭐ DEATH BECOMES RELOCATION, NOT PUNISHMENT

This is the best thing the ruling buys and it is worth naming explicitly.

Today death is `dead` + `respawnTimer` — you wait, then you reappear. Under the
ruling you **wake up at a hub, intact, and fly back out.** That changes the whole
economy of risk:

| death as punishment | death as relocation |
|---|---|
| lose progress, feel robbed | lose **position**, and position is the thing you were spending |
| the map is a backdrop | **the map has a shape** — distance from a hub IS the difficulty dial |
| harsh penalties needed to add stakes | the stakes are already there: the long way home |

⭐ **DISTANCE FROM THE NEAREST HUB IS NOW A FREE DIFFICULTY CURVE.** Deep space
is dangerous because it is *far*, not because a number said "hard". No zone
tables, no level gates — the danger is geometry, and the player feels it without
being told.

### ✅ THE NAMING CALL WAS ALREADY MADE CORRECTLY

Mac renamed *citadel* → **SOVEREIGN HUB** himself, unprompted. That is exactly
the standing law working: **register, not replica.** ⛔ The reference stays a
private tuning fork — never describe this game to anyone as "EVE but X".

### WHAT A SOVEREIGN HUB IS

| property | ruling |
|---|---|
| repair | dock and you are made whole. The death destination. |
| market | ⭐ **EVERY hub is a market.** Not a separate building, not a subset. |
| presence | a real place in the world you fly to, not a menu you open anywhere |

⚠ **UNBUILT — all of it.** No station entity, no docking, no market, and death
still respawns in place. This section is a ruling, not a receipt.

---

## 🛰 THE LOOP — Mac, 2026-08-16

> *"itll feel like top down eve / dreadnought combat by the end, auto cannons
> blazing into pirate outposts"*
>
> *"sending out mining drones to harvest metal from ships, or wood cutting ones
> for the space trees"*

**Authorship: Mackenzie Conor James Clark.**

### ⭐⭐ THIS IS AN ADAPTER, NOT A NEW ENGINE — and that is the whole point

Read plainly it sounds like three new systems. **MEASURED, it is nearly none:**

| the idea needs | what already exists |
|---|---|
| drones that go out and come back | **`this.drones = []` is already in `engine.js`** |
| a tool that reaches a target at range, from a mount, within an arc | **`js/hardpoints.js` — built 2026-08-16** |
| harvestable things with organic shape | **the renderer already draws membranes, spores and bio-mines** |
| parts you bolt to a hull | **the node graph, and 268 keyed assets with green mount dots** |

⭐⭐ **HARVESTING IS THE SAME VERB AS SHOOTING.** A mining laser is a hardpoint
whose projectile targets a wreck and returns cargo instead of damage. Arcs,
traverse, bearing, per-mount origin — `hardpoints.js` already does all of it and
does not care what the target is. **The gunnery pass paid for the mining pass.**

⛔ So build it as a target class and a projectile outcome. **Never as a second
system with its own aiming, its own arcs and its own idea of a mount.**

### ⭐ THE SPACE FOREST IS THE RIGHT CALL, NOT A JOKE

This engine is procedural organic — membranes, spores, bio-mines, springy nodes.
**A drifting forest fits what this renderer is already good at; a grey asteroid
belt fights it.** It is also the thing that makes the setting *ours* rather than
a hard-sci-fi field we would be the tenth entry in.

### ⭐⭐ TWO RESOURCES, TWO HARVEST TOOLS, TWO DIFFICULTY DIALS

This is the structure underneath the idea, and it is why it holds together:

| resource | source | harvester | what gates it |
|---|---|---|---|
| **METAL** | wrecks of ships you killed | mining drone | ⭐ **COMBAT** — you must fight to farm it |
| **GROWTH** | the space trees | cutter drone | ⭐ **DISTANCE** — you must travel to farm it |

⭐ **THE TWO RESOURCES MAP EXACTLY ONTO THE TWO DIFFICULTY DIALS** already
established — combat, and distance from the nearest Sovereign Hub. Nothing here
is an arbitrary number. A player who wants metal picks a fight; a player who
wants growth flies further from safety. **The economy is the map.**

### THE CLOSED LOOP

```
   fight a pirate outpost  ──▶  it leaves WRECKS
            ▲                        │
            │                        ▼
   guns reach further        mining drones harvest METAL
            ▲                        │
            │                        ▼
   bolt modules to mounts  ◀──  dock at a SOVEREIGN HUB: repair, sell, buy
```

⭐ **NO MARKET SIMULATION IS REQUIRED FOR ANY OF THIS.** No NPC economy, no order
book, no price discovery, no regional arbitrage. Fixed prices at a hub close the
loop completely. That is what keeps it *wee* while it still feels like a world.

⚠ **UNBUILT — all of it.** No wrecks, no cargo, no drones in play, no hub. The
`drones` array exists and is empty. This is a ruling, not a receipt.

### THE NEXT BUILD — smallest slice that proves the whole loop

1. Killed enemies leave a **wreck** entity holding metal.
2. A `miner` node type — a hardpoint that targets wrecks instead of enemies.
3. A **cargo** count on the player.
4. One **Sovereign Hub**: dock to repair, sell cargo, buy one module.

⛔ Not in that slice: the forest, the second resource, outposts, multiple hubs,
prices that move. **Prove the loop turns once, then widen it.**

---

# ⚖ THE FLAT LADDER — MAC'S PROGRESSION LAW, 2026-08-17

> *"unlike eve and other games the more powerful you get will eventually balance
> in our game so progression to titan and back to your fun frigate feels good not
> retardly broken but good... you can do those stealth deep space mwd drive runs
> and go kill lucrative dreads in a special frigate say no normal mothership could
> get to without an assist fleet"*

**LOCKED. This outranks every balance instinct that comes after it.**

## THE LAW

**Power is LATERAL, not vertical.** A titan is not *better than* a frigate. It is a
different tool. **Returning to a small hull must feel like a treat, not a demotion.**

## ⭐⭐ IT IS ALREADY BUILT

The PHASE 5 hull modifier (`DREADNOUGHT_PLAN.md`) was specified on 2026-08-16 to
make big ships *feel* big. Its arithmetic turns out to be this law:

| class | fireRate × | damage × | **net DPS** |
|---|---|---|---|
| frigate | 1.00 | 1.00 | **1.00** |
| cruiser | 0.80 | 1.30 | **1.04** |
| battleship | 0.62 | 1.75 | **1.09** |
| titan | 0.45 | 2.40 | **1.08** |

**The curve is flat.** Roughly 8% total drift across the entire ladder. The titan
buys *weight, reach and presence* — never raw superiority.

## ⭐⭐ TRAVERSE IS THE ANTI-POWERCREEP MECHANISM

This is the structural reason the law cannot rot:

`traverse = 0.052 × (12 / radius)` — a 12px gun swings ~180°/s, a 30px gun ~71°/s.

**The thing that makes a big gun big is the same thing that makes it slow.** They
are one number. There is no upgrade, item, skill or patch that can give a titan a
frigate's traverse without also making its guns small — at which point it is not a
titan. **The small hull's advantage is permanent by construction, not by balancing.**

⛔ **THEREFORE: NEVER ADD A FLAT TRAVERSE UPGRADE.** It is the one stat in this game
that must not be purchasable. Any item that raises traverse without shrinking the
mount deletes this law.

## THE REWARD AXIS IS ACCESS, NOT POWER

Mac's "special frigate no mothership could reach without an assist fleet" names the
correct reward currency for a flat ladder:

- Deep-void chambers gate on **hull size / signature / speed**, never on DPS.
- A stealth-MWD frigate reaches a lucrative dread that a capital *physically cannot
  get to*. The frigate is not stronger. It is **admitted**.
- ⭐ This makes the endgame **a garage full of specialists**, not one best ship.
  Every hull you ever built stays in rotation because somewhere only it can go.

⭐ **AND IT MAKES THE ECONOMY THE PROGRESSION.** With a flat power curve, wealth
buys *options* — more hulls, more access, more range — instead of bigger numbers.
That is what keeps THE LOOP meaningful past hour ten.

## ⛔ WHAT THIS FORBIDS

- No global damage/HP multipliers tied to rank or hull class.
- No "tier 2 version of the same gun, strictly better".
- No zone gated purely behind a DPS check.
- No purchasable traverse. *(see above — this is the load-bearing one)*

---

# 👁 WHY TOP-DOWN WINS — THE VISIBILITY BUDGET, 2026-08-17
### recorded so this is never relitigated. Mac's crown; this file states the reason.

> *"any higher than this wed have a whole other layer we couldnt think about
> function like that right"* — Mac, 2026-08-17. **Correct, and here is why.**

## ⭐⭐ THE ARGUMENT

**Top-down is the only perspective where the player can see the ENTIRE STATE of a
fight simultaneously.** No occlusion. No camera to manage. No depth ambiguity.

A player has a fixed attention budget. In 3D a large share is spent on *spatial
comprehension* — where am I, where is he, what is behind me, is the camera right.
Top-down returns all of it.

⭐ **THE ATTENTION SAVED ON FIGURING OUT WHERE THINGS ARE IS THE ATTENTION SPENT ON
WHAT THINGS ARE DOING.** That is the trade that *buys* systemic depth. It is why
top-down and overhead games routinely carry mechanical complexity that action-3D
cannot. The perspective is not a limitation — it is a **budget transfer**.

## ⭐⭐ THE SHIP IS ITS OWN HUD

**A subsystem the player cannot see is not a mechanic. It is a status bar.**

| in 3D | in this game |
|---|---|
| "port battery disabled" — a UI element | the battery **visibly stops turning** |
| a health bar segment greys out | the **node is gone from the silhouette** |
| an icon shows a firing arc | **`hardpoints.drawArcs()` renders the actual cone, green when it can bear** |

`js/hardpoints.js:196-224` already draws this today. **The mechanic and its own
readout are the same pixels.** No HUD to design, no icon language to teach.

## WHAT THE 3D LAYER WOULD ACTUALLY COST

Not "a dimension" — a stack of systems that compete for the same budget as the
gameplay: camera control, occlusion handling and the indicator UI it forces,
depth ambiguity, per-subsystem rigging and animation so a disabled part *reads*,
LOD, culling, lighting and shadows.

⛔ **The 3D game was already scrapped once, and the measured cause was COVERAGE,
never map size.** This is the same finding stated forward instead of backward.

## ⚠ WHAT TOP-DOWN HONESTLY COSTS US

Stated plainly so it is designed around, not discovered late:

1. **No vertical drama.** Nothing looms. No low-angle hero shot of a dreadnought.
2. **Scale awe is work.** A titan is a bigger shape unless we earn the size.
3. **Entrances are flat.** A warp-in has no "descend from above" beat.

### THE MITIGATIONS ARE ALREADY IN THE ENGINE
- **Zoom as the scale instrument** — `feel.js` zoom dial. Pull the camera *out* on
  approach; the titan grows because the world shrinks around it.
- **Fog / sight cone as the reveal instrument** — `shaders.js` fluidShader. A
  capital emerges out of the dark edge-first. Dread is authored by *what is not
  yet drawn*, which top-down does better than 3D.
- **Silhouette as the awe instrument** — the fleet ladder and the cat-mask house
  mark exist so a hull is recognised before it is identified.

⭐ **We do not get scale from a camera tilt. We get it from zoom, fog and outline —
all three of which are already implemented.**

---

# 🧠 THE THREE LAYERS — SHIELD · HULL · MIND, 2026-08-17
### Mac's ruling. Recorded at his instruction: *"save that as it isnt forgotten"*.

> *"we need a structure armour and shield bar like eve id say our structure could be
> say your ships ai cpu which can tank a fuck ton but can be put at risk of
> technological downgrade just like you used to lose eve points... so people can
> either literally ai dumb tank by utilizing like gravity well technology if theyre
> a pirate as no normal player will kill their other skills for an ultra strong
> pve only character... and itll only be available say for ai killer or ai factions"*

## THE THREE LAYERS

| # | layer | absorbs | recovers | what damage to it *means* |
|---|---|---|---|---|
| 1 | **SHIELD** | first | fast, in combat | nothing — pure buffer |
| 2 | **HULL** | second | slow, out of combat | node loss, lopsided fighting |
| 3 | ⭐ **MIND** (AI CPU) | last, and enormously | **only at a hub, for money** | **capability loss** |

**Layers 1 and 2 already exist** — `README.md §5`: shield absorbs first, hull takes
damage with 15 iFrames and out-of-combat regen. **Layer 3 is the new one.**

## ⭐⭐ WHAT MAKES THIS OURS AND NOT A RESKIN

**EVE's structure is a dumb third bar. It does nothing until you die.**

**MIND is a resource that is also a stat.** Damaging it does not merely bring you
closer to death — **it degrades what the ship can DO.** That is a different mechanic
wearing a familiar shape, and it is the reason this is an invention rather than a copy.

⛔ **Never describe this as "EVE's structure but X".** State it as its own rule:
*the third layer is the mind that runs the ship, and hurting it makes the ship stupid.*

## ⭐⭐ "TECHNOLOGICAL DOWNGRADE" IS ALREADY HALF-BUILT

Mind damage expresses itself through systems that already exist or are already
specified. **No new readout, no new HUD, no new bar to teach.**

| mind damage does | mechanism | state |
|---|---|---|
| turret traverse slows | `hardpoints.js` — the keystone stat | ✅ built |
| individual mounts go offline | Phase 4 node destruction | 📋 specified, unbuilt |
| reactor modes become unavailable | `energy.js` 4-mode reactor | ✅ built, needs a lock |
| firing arcs narrow | `hardpoints.js` arc calc | ✅ built |

⭐ **THE DEGRADED SHIP IS VISIBLY DEGRADED.** Arcs shrink, guns swing like they are
underwater, batteries go dark on the silhouette. Consistent with THE VISIBILITY
BUDGET: *the ship is its own HUD*. There is nothing to read in a corner.

## ⭐ IT OBEYS THE FLAT LADDER

An AI-tank build buys **enormous survivability** and pays in **capability**. That is
lateral, not vertical — exactly what THE FLAT LADDER requires. Mac's own read is the
proof it is balanced: *"no normal player will kill their other skills for an ultra
strong PVE-only character"*. A build with a real cost does not need a nerf.

## ⭐⭐ THIS IS THE FIRST FACTION *MECHANIC*

Until now the fourteen factions are **skins** — silhouette family plus material.
Gating AI-tanking to **AI-killer and AI-aligned factions** gives a faction its first
**rule**. That is what turns a roster into a set of *ways to play*.

⛔ **Do not hand every faction a mechanic.** The power of this is that it is rare and
thematically earned: only the factions that study or hunt AI may weaponise it.

## 🔴 CONFLICT WITH AN EXISTING RULING — NAMED, NOT BURIED

**SOVEREIGN HUBS (2026-08-16) ruled: *death becomes relocation, not punishment*, and
FUN IS THE ARBITER is the highest law in this file.** Permanent skill loss is
punishment. These cannot both be absolute.

### PROPOSED RESOLUTION — Mac rules
**The downgrade is REAL but RECOVERABLE, and recovery costs money.**

- Mind damage is not repaired by regen, by relocating, or by time. Only at a hub.
- You may fly degraded indefinitely — that is a *choice*, and sometimes the right one.
- ⭐ **Structure damage therefore becomes an ECONOMIC SINK**, which THE LOOP needs and
  currently lacks. It gives money a reason to matter after the first hull.

This keeps the stakes real (you genuinely lost something and you feel it) without
deleting progress (nothing is gone forever). ⚠ **If Mac wants true permanent loss, it
must be an explicit opt-in mode, never the default** — that is the only version that
survives FUN IS THE ARBITER.

## ⏭ OPEN, NOT DECIDED

- **"Gravity well technology"** — named by Mac, undefined. Placeholder for the
  AI-tank enabler. Needs its own ruling.
- Whether MIND is one pool or per-subsystem.
- Whether enemies have MIND too *(⭐ if they do, "shut his functions down" from
  2026-08-17 becomes **attacking the boss's mind directly** — the boss fight and the
  tank layer are then the same mechanic seen from both sides)*.
