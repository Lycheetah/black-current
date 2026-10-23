# ⚔ THE FLEET ROSTER — NAMED HULLS
### stable name · edit this file, never date-stamp a copy
### answers to `GAME_VISION.md` · art spec is `ART_PROMPTS.md`

⛔⛔ **MAC NAMES THE SHIPS. HE GENERATES THE ART AND NAMES THE SHIP FROM IT.**
Established 2026-08-17 after I got it wrong. The engine supplies **frames** —
chassis specs like `DREADNOUGHT FRAME` — and never a name. There is exactly one
list of ship names in this game and it is `packs/*.json`.

⚠ **THE TITAN CLASS TABLE BELOW IS STILL MY SUGGESTIONS, NOT NAMES.** It predates
that ruling. Every entry is a proposal awaiting Mac's word, and a name he has not
said out loud is not a name — it is my handwriting in his slot. Read it as *"here
is what I saw in the picture"*, never as roster.

⛔ Class names are ours. No franchise borrowings, no EVE nouns.

---

## TITAN CLASS — 13 hulls generated 2026-08-16

| # | faction | hull | the name | why |
|---|---|---|---|---|
| 1 | AI Gods | chrome mandorla, burning eye | **ORACLE-class · "THE UNBLINKING"** | it has one eye and it never shuts |
| 2 | AI | brutalist stacked arcology | **FOUNDRY-class · "COLD ARITHMETIC"** | it is a factory that decided to fly |
| 3 | Amethyst Angel | black + gold horned cathedral | **SERAPH-class · "AMETHYST CHOIR"** | the flagship look of the whole game |
| 4 | Cosmic Darkness | indigo mantle, face in the stars | **SHROUD-class · "THE LONG WITNESS"** | it watched, it did not intervene |
| 5 | Human Hunters | scrap arcology, painted sigil | **SCRAPWRIGHT-class · "PAINTED CAT"** | someone climbed out and painted that |
| 6 | Pagan AI | rusted iron, bone skull crown | **RELIQUARY-class · "RUST LITURGY"** | a machine that learned to pray |
| 7 | AI Hunters | matte black wedge, one red slit | **SHRIKE-class · "ONE RED LINE"** | the only colour it permits itself |
| 8 | Black Hole | the hole, ringed in fire | **HORIZON-class · "ALL DEBTS PAID"** | nothing it takes comes back |
| 9 | Cosmic Light | twin suns in a pale gold blade | **LANTERN-class · "TWIN DAWN"** | two stars where one would do |
| 10 | Human AI Gods | marble face, ivory and blood | **APOTHEOSIS-class · "SHE WHO CONSENTED"** | she agreed to this. that is the horror |
| 11 | Hybrid Fused Hunters | half machined, half grown | **GRAFT-class · "BOTH HANDS"** | one hand built it, one hand grew it |
| 12 | Techno Angels | white glass feathers, halo | **ANNUNCIATION-class · "GLASS FEATHER"** | it arrives to tell you something |
| 13 | Chaos | golden cat head, torn shards | **FRACTURE-class · "THE ONLY TRUE FACE"** | ⭐ the mask is the sole symmetric thing on it |

⭐ **#13 IS THE PROOF THE SPEC WORKED.** The brief said *"the cat mask is the ONLY
stable, correct, symmetrical thing in the entire image, which is what makes it
frightening."* It came back exactly that. The name is just reading it aloud.

---

## 🔴 GAPS TO COMPLETE THE SET

| missing | faction has | needs |
|---|---|---|
| **CRIMSON BLOOD titan** | flagship ✅ | a titan |
| **CHAOS flagship** | titan ✅, fighter ✅ | a flagship |

---

## ⭐ A 15TH FACTION APPEARED — SOVEREIGN CORRUPT

`lycheetahSOVCORUPTmothership.jpg` · `SOVCORUPTFIGHTER.jpg`

⭐⭐ **THIS PLUGS STRAIGHT INTO THE SOVEREIGN HUBS RULING** made the same night.
A hub that went wrong is the perfect antagonist for a game whose safe places are
hubs: **the thing you fly to for repair, turned against you.** It gives the
station system a villain instead of just an interface, and it is the one faction
whose existence is *explained by the map* rather than added on top of it.

⚠ Mac's call whether it joins the roster as #15.

---

## MEASURED, 2026-08-16 — the art laws held

| law | result |
|---|---|
| green `#00FF00` mount dots on every hull | ✅ **13/13 titans** |
| prow points up | ✅ **13/13 titans** |
| field colour absent from the subject | ✅ all 31 files |
| pink `#F30486` fields still key cleanly | ✅ **0.000% fringe, 32,474 green px survived** |

⭐ **THE FIELD DOES NOT HAVE TO BE `#FF00FF`.** `detect_background()` takes a
median of four corner patches — it SAMPLES. The law was always *"a colour absent
from the subject"*, never a magic number. Hot pink satisfies it. **Do not
regenerate pink-field art.**

---

## ⚔ SUPER BATTLE FRIGATE — Mac's class, 2026-08-16

> *"i jsut invented super battle frigates"*

**A small hull carrying guns it has no business carrying.**

⭐ **EMERGENT, NOT AUTHORED.** This class is not a new rule — it is the only place
the two PHASE 5 dials (`DREADNOUGHT_PLAN.md`) pull against each other:

| dial | reads | verdict for this hull |
|---|---|---|
| hull class | **node count** 1–5 | FRIGATE — ×1.00 rate, ×1.00 damage, fast, agile |
| weapon class | **mount radius** 31px+ | SIEGE — railgun damage, ~71°/s traverse |

Result: a ship that can be **anywhere on the field instantly** and then must
**fly its whole hull to aim.** No twitch shots. Every engagement is a commitment.

⭐ **IT IS THE COUNTER-COUNTER.** The keystone law says a small ship beats a
capital by getting inside its arc. The super battle frigate gets inside the arc —
and finds its own guns are just as slow. It cannot cheese a titan. It has to duel
one. That is a whole archetype falling out of existing rules with **zero new code**.

✅ **DESIGNER CHECK — MEASURED 2026-08-17**, `witness-fleet.mjs` §8. The GP economy
permits it, and charges for it honestly:

| | GP |
|---|---|
| SUPER BATTLE FRIGATE, whole hull | **147** |
| ...of which the **32px** mount alone | **106** (72%) |
| plain PATROL FRIGATE, same node count | 66 |
| VOID LEVIATHAN (31 nodes, TITAN) | 1475 |

⭐ **THE BILL TELLS THE STORY THE CLASS TELLS.** Nearly three quarters of the ship's
cost is the one gun. You are not buying a frigate with an upgrade — you are buying
a gun and bolting the smallest possible ship to the back of it.

✅ **IT IS BUILT AND IT FLIES.** `fleet.hulls.superBattleFrigate` — 5 nodes, 32px
mount, FRIGATE class (×1.00/×1.00), fires `railgun`. Witnessed firing a real SIEGE
projectile in the real loop (§4).

⏭ **NAME STILL OPEN — Mac's call.** It ships under his own words, `SUPER BATTLE
FRIGATE`, until he says otherwise. The register wants a word that is small and
heavy at the same time.

---

## 🚢 THE PLAYABLE ROSTER — 20 HULLS, BUILT AND FLYING

**MEASURED 2026-08-17** — `js/fleet.js`, witnessed by `node scripts/witness-fleet.mjs`
(**26/26 🟢**). This is a *different axis* from the TITAN CLASS table above: those
are **factions and art**, these are **node graphs you can fly right now.** A hull
here can wear any of the 16 art packs — **20 × 16 = 320 combinations.**

In-game: **`f`** next hull · **`F`** previous · **`r`** restore your own design ·
**`P`** cycle art pack. Every hull also appears as a button in the DESIGNER's
Presets tab under `— THE FLEET —`.

⚠ Your own design is stashed to `localStorage` before the first switch, because
`engine.applyDesign()` **persists**. `r` gives it back.

### ⛔⛔ THESE ARE FRAMES. THEY ARE NOT SHIP NAMES.

> **"well bro i named them because i generate the art and then named the ship
> wy the fuck did you rename them"** — Mac, 2026-08-17

**MY ERROR, CORRECTED THE SAME DAY.** I had invented twenty hull names — *WASP
INTERCEPTOR*, *VOID LEVIATHAN*, *SOVEREIGN FLAGSHIP* — and then handed Mac the
overlap with his own pack names as though it were a design question for him to
rule on. It was not a question. **It was a second roster**, which is the one
failure this project treats as fatal, and I built it and then asked him to
approve it.

⚖ **THE DIVISION OF LABOUR, WRITTEN DOWN SO IT CANNOT DRIFT AGAIN:**

| | supplies | owner |
|---|---|---|
| **frame** | the node graph, the type noun, the mount bands | the engine (mine) |
| **name** | what the ship is called | **the art pack — Mac's** |

Mac generates the art, then names the ship from what he sees. A frame is a
chassis spec — `DREADNOUGHT FRAME` is a description, the way *12 nodes* is a
description. It is not a name and it must never read like one.

**In code:** `fleet.hulls[*].frame` is the chassis label; `fleet.shipName()`
returns `packRenderer.label()`, so the HUD headlines **Mac's** name and prints
the frame beneath it in muted grey. There is exactly one list of ship names in
this game and it lives in `packs/*.json`.

⭐ **`SUPER BATTLE FRIGATE` IS UNTOUCHED** — Mac coined it (*"i jsut invented
super battle frigates"*), so it stays verbatim as both frame and class.

| frame | guns | class | rate | dmg | net | mount bands |
|---|---|---|---|---|---|---|
| › INTERCEPTOR FRAME | 1 | FRIGATE | ×1.00 | ×1.00 | ×1.00 | POINT |
| ▹ SKIFF FRAME | 1 | FRIGATE | ×1.00 | ×1.00 | ×1.00 | POINT |
| » CORVETTE FRAME | 2 | FRIGATE | ×1.00 | ×1.00 | ×1.00 | POINT |
| ◁ FRIGATE FRAME | 2 | FRIGATE | ×1.00 | ×1.00 | ×1.00 | LIGHT |
| ◅ GUNSHIP FRAME | 3 | FRIGATE | ×1.00 | ×1.00 | ×1.00 | LIGHT |
| ⊲ CUTTER FRAME | 1 | FRIGATE | ×1.00 | ×1.00 | ×1.00 | HEAVY |
| ⊳ **SUPER BATTLE FRIGATE** | 1 | FRIGATE | ×1.00 | ×1.00 | ×1.00 | **SIEGE** |
| ⋈ ESCORT FRAME | 6 | CRUISER | ×0.80 | ×1.30 | ×1.04 | POINT |
| ◄ DESTROYER FRAME | 4 | CRUISER | ×0.80 | ×1.30 | ×1.04 | MEDIUM/LIGHT |
| ⋉ RAIDER FRAME | 5 | CRUISER | ×0.80 | ×1.30 | ×1.04 | LIGHT |
| ◈ CRUISER FRAME | 3 | CRUISER | ×0.80 | ×1.30 | ×1.04 | LIGHT/MEDIUM |
| ◆ HEAVY CRUISER FRAME | 6 | CRUISER | ×0.80 | ×1.30 | ×1.04 | MEDIUM/HEAVY/LIGHT |
| ⬡ CARRIER FRAME | 4 | CRUISER | ×0.80 | ×1.30 | ×1.04 | LIGHT |
| ⊞ MONITOR FRAME | 5 | CRUISER | ×0.80 | ×1.30 | ×1.04 | SIEGE/POINT |
| ⬢ BATTLESHIP FRAME | 8 | BATTLESHIP | ×0.62 | ×1.75 | ×1.08 | HEAVY/POINT |
| ⬟ BATTLECRUISER FRAME | 8 | BATTLESHIP | ×0.62 | ×1.75 | ×1.08 | HEAVY/MEDIUM/LIGHT/POINT |
| ⬣ DREADNOUGHT FRAME | 12 | BATTLESHIP | ×0.62 | ×1.75 | ×1.08 | SIEGE/MEDIUM/POINT |
| ✹ FLAGSHIP FRAME | 11 | TITAN | ×0.45 | ×2.40 | ×1.08 | SIEGE/HEAVY/LIGHT |
| ✷ TITAN FRAME | 17 | TITAN | ×0.45 | ×2.40 | ×1.08 | SIEGE/HEAVY/POINT |
| ✵ LEVIATHAN FRAME | 18 | TITAN | ×0.45 | ×2.40 | ×1.08 | SIEGE/HEAVY/POINT |

⭐ **THE COLLISION DISSOLVED WHEN THE AXES SEPARATED.** *Needle Interceptor* and
`INTERCEPTOR FRAME` were never competing for the same slot — one is a ship, one
is a chassis. The clash existed only because I had put a name where a spec
belonged. Nothing needed renaming; something needed **deleting.**

### ⭐⭐ THE FLAT LADDER — power is LATERAL, not vertical

`net` is `rate × dmg`. It stays between **1.00 and 1.08 across the entire roster.**
A titan does not out-DPS a frigate. It trades *tempo* for *weight*: fewer, heavier,
slower punches. **You do not climb this ladder — you pick a place on it.**

That is what stops the roster becoming a staircase where the last ship is the only
ship worth flying, and it is why the small hulls stay live content forever.

### ⭐⭐ TRAVERSE IS THE ANTI-POWERCREEP MECHANISM

**The number that makes a gun big is the same number that makes it slow.** Both
traverse and arc are derived from the mount's own radius in `hardpoints.js` — no
separate balance table exists to drift.

MEASURED (§5): **8px → 268.1°/s across a 234° arc** · **34px → 63.1°/s across a
100° arc.** A titan's battery cannot follow a corvette. That is the keystone.

### 🔴 THE BUG THIS BUILD EXPOSED

**Not one preset in the game used a mount above 14px** (`designer.js:40-97` — even
the old "Heavy Dreadnought" preset topped out at 14px). Since traverse and arc are
*derived* from radius, **every gun that had ever been fired in this game was a
LIGHT mount.** The keystone stat had existed in code since `hardpoints.js` landed
and had never once been visible on screen. Largest mount now in the game: **40px.**

### 🔴 THE STALE-NODE BUG — FOUND AND FIXED

`hardpoints.sync()` early-returned on an identical shape signature, but
`engine.applyDesign()` **replaces** `player.nodes` with fresh `SpringNode` objects.
Re-applying a design of the same shape left every turret holding a reference to an
**orphaned node the spring physics no longer updates** — guns firing from frozen
positions on a hull that had moved. Fixed by comparing **array identity** as well
as shape. Witnessed §6.

⚠ **This is a CANDIDATE for Defect 1 ("some areas dont even allow you to shoot"),
not a confirmed cause.** Defect 1 remains OPEN.

---

## 🔧 THE EQUIPMENT — 22 PARTS, GENERATED FROM THE MOUNT LADDER

⭐⭐ **THE EQUIPMENT LIST WRITES ITSELF.** A cannon at 6px and a cannon at 38px are
*mechanically different parts* — different weapon, different traverse, different
arc, different price — with **zero new engine code.** Radius stopped being
decoration the moment `hardpoints.js` started reading it.

### The mount ladder — radius picks the weapon

| radius | class | weapon | traverse | arc |
|---|---|---|---|---|
| 0–9px | **POINT** | spitter | fastest | widest |
| 10–15px | **LIGHT** | twin | fast | wide |
| 16–22px | **MEDIUM** | laser | medium | medium |
| 23–30px | **HEAVY** | homing | slow | narrow |
| 31px+ | **SIEGE** | railgun | slowest | narrowest |

**10 cannon sizes** ship as buyable parts: 6 · 9 · 12 · 14 · 18 · 21 · 26 · 29 ·
33 · 38 px. **12 support parts**: pods 10/14/18, shields 12/15/19, thrusters
10/12/15, spikes 8/10/13.

### The hull ladder — total node count picks the class

| nodes | class | rate | dmg |
|---|---|---|---|
| 1–7 | FRIGATE | ×1.00 | ×1.00 |
| 8–13 | CRUISER | ×0.80 | ×1.30 |
| 14–24 | BATTLESHIP | ×0.62 | ×1.75 |
| 25+ | TITAN | ×0.45 | ×2.40 |

⭐ **CLASS FOLLOWS HULL SIZE, NOT GUN COUNT.** Mac's ruling: small slots on a larger
ship fire slower *to match the ship class*. Counting guns instead would have made
the SUPER BATTLE FRIGATE **inexpressible** — its whole identity is that mount
radius and hull size *disagree*.

### The price curve

`cost = base × (radius / ref)^1.7` — MEASURED: **6px = 6GP · 12px = 20GP ·
38px = 142GP.** Superlinear, so a big gun is never a cheap upgrade.

### ⚖ ONE TRUTH

`fleet.equips()` builds **lazily at call time** and reads `window.HP_DEFAULTS`, so
the traverse and arc printed on an equipment card **cannot drift** from the numbers
the guns actually fight with. There is no second table.

---

## ⏭ OPEN — Mac's call

1. ✅ ~~NAME COLLISION~~ — **CLOSED 2026-08-17.** It was not a collision, it was
   my invented second roster. Deleted. See the frames note above.
2. 🔴 **NO PROW ON THE BIG HULLS.** Now *visible*, not theoretical — see
   `shots/sprites/CONTACT_fleet_in_art.png`. Under real art the DREADNOUGHT,
   FLAGSHIP and LEVIATHAN read as **radially symmetric balls of guns** with no
   front. The mid hulls (DESTROYER, HEAVY CRUISER) read correctly. The art did
   not cause this — it **exposed** it: the node graphs fan mass evenly around
   the core, which procedural blobs hid and painted modules cannot. Fix is to
   bias mass rearward and lengthen the spine. **Wants Mac's eye, not a gate's.**
3. ⚠ **THE SPRITE SCALE IS UNRULED.** `sprites.gain` ships at **1.85**, which is
   a compromise I picked, not an answer. MEASURED: at 2.35 the DREADNOUGHT lost
   its silhouette entirely while the 2-node INTERCEPTOR looked right — overlap
   grows with node count, so **no single number flatters both ends of the
   roster.** Dial it live in game with `;` and `'` and tell me the number. A
   per-hull-class gain is the likely real fix.
4. **CARRIER FRAME is deliberately undergunned** — it is waiting on the drone
   bay (*a drone bay is a hardpoint whose projectile has AI*).
5. 🟠 **105 OF 215 MODULES ARE UNCLASSIFIED** and therefore unreachable — nearly
   half the art bank. `art/manifest.json` needs a `type` on each. 98 files also
   carry **no 🟢 mount dot** and cannot be placed at all.
6. ⚠ **PHONE COMPLETELY UNWITNESSED.** Everything above is browser-only.
