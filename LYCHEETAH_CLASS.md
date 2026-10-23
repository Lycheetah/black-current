# 🐆 THE LYCHEETAH CLASS — DESIGN BRIEF
### stable name · edit this file, never date-stamp a copy
### answers to `GAME_VISION.md` · frames live in `FLEET_ROSTER.md` · art spec `ART_PROMPTS.md`

---

## ⭐⭐ MAC'S BRIEF — LOCKED, HIS WORDS

> **"its going to be the black and gold class of void and earned light
> enshrining the lycheetah cat in ways."**
>
> **"the ships need to be maybe celtic then Black and Green with gold"**
>
> **"ill design some amazing classes i just need a base to begin"** — Mac, 2026-08-17

**This is the authority.** Everything below translates it into what the engine can
actually hold. Where the two disagree, the brief wins and the engine gets changed.

⚠ **THE PALETTE MOVED AND THE SECOND WORD WINS: black · green · gold, Celtic.**
The first line is kept because *void and earned light* is the meaning, and that
survived the palette change. Green joined the ground; gold is still the light.

⛔ **THIS FILE IS A BASE, NOT A SPEC.** Mac designs the classes. Everything here
is either a measured constraint, a table, or a blank.

⛔ **THE NAMES ARE MAC'S.** The frame supplies the type noun (CRUISER,
DREADNOUGHT); the class and the ships are named by the person who designed them.
Nothing in this file names a ship, and nothing should.

---

## 🔴 TWO HAZARDS YOUR CHOICE CREATES — BOTH ALREADY MEASURED HERE

Black and gold is the strongest look on this roster and it walks straight into
the two failures this project has already paid for. Neither is a reason to change
the brief. Both have a known answer.

### 1. ⛔ NEVER GENERATE A BLACK HULL ON A BLACK BACKGROUND

**MEASURED 2026-08-16.** A chroma key works by distance from the background
colour. **Against black, distance-from-background IS BRIGHTNESS** — so the keyer
deleted the dark parts of dark ships. Four ships came back as smudges and a dozen
as ghosts, while the bright ones passed and looked fine, which is why it wasn't
caught immediately.

⭐⭐ **A KEY ONLY WORKS WHEN THE BACKGROUND COLOUR IS ABSENT FROM THE SUBJECT.**

**A black-hulled class is the exact case that broke it.** So:

- **Generate the Lycheetah class on MAGENTA `#FF00FF`.** No hull is near magenta,
  and `scripts/key-flat-background.py` handles it cleanly.
- ⚠ **The generator gives three backgrounds, not one** — measured across 42
  sheets: 12 real alpha, 9 magenta, 21 opaque black. **Probe the file, never
  trust the prompt.** If a sheet comes back black-backed, re-roll it rather than
  key it.
- If a black field is unavoidable it must be keyed by **silhouette** (threshold →
  close → fill holes → keep comparable components → feather), never by colour
  ramp.

### 2. ⛔ A BLACK SHIP ON BLACK SPACE HAS NO SILHOUETTE

The game's background is near-black. **Contrast is arithmetic, not taste** — this
repo has lost a feature to "true but invisible" four separate times.

⭐ **SO THE GOLD IS NOT TRIM. THE GOLD IS THE SILHOUETTE.** The black is what the
gold is drawn *against*; it cannot be what reads at distance. Practically: every
part needs gold on the edge that faces outward, and the ship's outline should be
legible with the black filled in as pure background.

**The test is cheap and you should run it before generating a full sheet:** put
one part on the real background at real size and see if you can tell what it is.
`shots/sprites/CONTACT_fleet_in_art.png` is that view for the current roster.

⚠ Judge it **cropped and upscaled** — a 30px part judged on a full screenshot is
judged on a thumbnail, and that has fooled us before.

---

## 🎨 THE PALETTE — AND THE ONE COLOUR THAT CAN BREAK IT

| | |
|---|---|
| **hull** | black — void, the ground the light is earned against |
| **field** | green — Celtic, deep, the living half of the void |
| **light** | gold — earned, structural, **carries the silhouette** |

⛔ **`#00FF00` AND `#FF00FF` ARE RESERVED ENGINE COLOURS AND MAY NOT APPEAR IN
THE PALETTE.** Pure green is the **machine-readable mount-point marker** painted
on every module sprite; magenta is the chroma field. A faction that used either
would eat its own ship. **Gold is safe. Black is safe as fill.**

### 🔴 A GREEN FACTION WALKS INTO THE MARKER DETECTOR

This is not theoretical. The pipeline finds sockets by asking **"is this pixel
green-dominant?"** — literally `g > 120 AND g > r+55 AND g > b+55`. A Lycheetah
part painted in a bright green **will be read as a mount point**, and the strip
pass will punch a transparent hole through it.

⭐ **THE RULE, EXACTLY.** A green is safe when **either** its green channel is
**≤ 120**, **or** its blue (or red) channel is within **55** of green.
**Bright yellow-greens are the danger. Deep, blue-leaning greens are safe.**

MEASURED against the live detector:

| hex | rgb | safe? | note |
|---|---|---|---|
| `#004225` | 0, 66, 37 | ✅ | British racing — deepest, most void-like |
| `#054A29` | 5, 74, 41 | ✅ | |
| `#0F5132` | 15, 81, 50 | ✅ | |
| `#1B4D3E` | 27, 77, 62 | ✅ | blue-leaning, reads cold |
| `#146B3A` | 20, 107, 58 | ✅ | |
| `#0B6E4F` | 11, 110, 79 | ✅ | emerald, still safe |
| `#1D7A46` | 29, 122, 70 | ✅ | about as bright as you can go |
| `#2E8B57` | 46, 139, 87 | ✅ | sea green — safe, but marginal |
| `#40826D` | 64, 130, 109 | ✅ | viridian |
| `#00A86B` | 0, 168, 107 | 🔴 | jade — **trips the detector** |
| `#3CB371` | 60, 179, 113 | 🔴 | **trips** |
| `#00FF7F` | 0, 255, 127 | 🔴 | **trips** |

⚠ **The same applies to `#39ff14`** — the engine's own signature green (thruster
flare, homing round, Bio Emerald). Not just a clash of look: it is inside the
detection band.

⭐ **THIS IS A GIFT, NOT A TAX.** Every safe green on that list is a **deep** one,
and deep green is exactly what sits under gold in Celtic work. The constraint and
the brief want the same thing.

---

## ⚖ "EARNED LIGHT" — A QUESTION ONLY MAC ANSWERS

The phrase is doing work, and it can be read two ways. **This is a ruling, not a
detail**, because the two readings build differently:

**(a) Earned light is the look.** The gold is fixed. It means the ship *has*
earned its light; the class is what a finished thing looks like.

**(b) Earned light is a mechanic.** The gold **grows** — a hull launches nearly
all void and gains gold as it is flown, so the light on the ship is a legible
record of what the player actually did.

⭐ (b) is buildable on the seam that already exists: `js/sprites.js` receives the
live `state` on every draw, so a gold pass could be modulated without touching
`engine.js`. **It would be the first thing in this game that is earned and
visible rather than earned and counted.**

⛔ **AND IT MUST NEVER BECOME A RETENTION LOOP.** No streaks, no decay, no
reproaching absence. Light that can be *lost* by not playing is the opposite of
earned. If (b), it only ever accumulates.

**Mac decides. Until then the class is (a) and the door to (b) is left open.**

---

## 🐆 WHERE THE CAT CAN LAND — SLOTS, NOT DECISIONS

The engine draws a ship as a **core plus nodes**, and these are the only places a
form can live. Listed so the motif goes where the renderer can actually show it:

| node type | what it is structurally | what the cat could put there |
|---|---|---|
| `core` | the body — **wears no sprite**, the membrane draws it | the chest / the seat of the light |
| `cannon` | swings on its mount, arc and traverse from its radius | — |
| `spike` | hurts by touching; forward-mounted reads as a prow | claw · fang · the strike |
| `thruster` | rear, plume | haunch · the run |
| `shield` | projected field | — |
| `pod` | capacity, mass | — |

⚠ **A core node wears no sprite** — that is a hard fact of the current renderer,
learned by breaking it. The hull body is drawn by the procedural membrane and the
chassis spars, so **the cat cannot be a single painting of a cat at the centre.**
It has to be expressed through the parts and the silhouette they make together.

⛔ Whether that constraint should change — whether a hull should ever be one
painting instead of assembled modules — **is Mac's call and is already open** in
`ART_IN_THE_GAME.md`. Do not decide it by accident while designing a class.

---

## 🔧 THE ENGINE CONTRACT — WHAT A HULL ACTUALLY IS

A hull is a **node graph**. Nothing else.

```js
lycheetahSomething: {
  id: 'lycheetahSomething',
  frame: 'SOMETHING FRAME',        // the type noun — engine's
  mark: '◈',                       // glyph shown in the HUD — Mac's
  note: 'One line on how it fights.',
  color: '#d4a017',                // faction tint — Mac's
  primaryWeapon: 'railgun', secAbility: 'emp',
  nodes: [
    { dx: 0, dy: 0, radius: 30, type: 'core' },
    // ...
  ]
}
```

- `dx, dy` are **pixels from the core centre**. **FORWARD IS `+X`.**
- `radius` is everything — it picks the weapon, the traverse, the arc and the price.
- types: `core` `cannon` `pod` `shield` `thruster` `spike`
- ⭐ **THE GRAPH IS THE SHIP.** Sprites are a costume over it; toggling art off
  changes not one node. Design the graph and the look follows.

---

## 📐 THE TABLES — MEASURED FROM THE LIVE CONSTANTS

### A gun's radius decides what it IS

⭐⭐ **TRAVERSE IS THE KEYSTONE AND THE ANTI-POWERCREEP MECHANISM.** A big gun
feels big because it is *slow and narrow*, not because it does more damage. A
small ship's counter is real: **get inside the arc.**

| radius | class | weapon | traverse °/s | arc ° | GP |
|---:|---|---|---:|---:|---:|
| 6 | POINT | spitter | 357.5 | 244.1 | 6 |
| 8 | POINT | spitter | 268.1 | 233.8 | 10 |
| 10 | LIGHT | twin | 214.5 | 223.5 | 15 |
| 12 | LIGHT | twin | 178.8 | 213.1 | 20 |
| 14 | LIGHT | twin | 153.2 | 202.8 | 26 |
| 16 | MEDIUM | laser | 134.1 | 192.5 | 33 |
| 18 | MEDIUM | laser | 119.2 | 182.2 | 40 |
| 20 | MEDIUM | laser | 107.3 | 171.9 | 48 |
| 23 | HEAVY | homing | 93.3 | 156.4 | 60 |
| 26 | HEAVY | homing | 82.5 | 140.9 | 74 |
| 28 | HEAVY | homing | 76.6 | 130.6 | 84 |
| 31 | SIEGE | railgun | 69.2 | 115.2 | 100 |
| 34 | SIEGE | railgun | 63.1 | 99.7 | 117 |
| 36 | SIEGE | railgun | 59.6 | 89.4 | 129 |
| 38 | SIEGE | railgun | 56.5 | 79.1 | 142 |
| 40 | SIEGE | railgun | 53.6 | 68.8 | 155 |

### The other parts

| radius | pod | shield | thruster | spike |
|---:|---:|---:|---:|---:|
| 8 | 6 | 12 | 13 | 14 |
| 10 | 8 | 18 | 18 | 20 |
| 12 | 12 | 24 | 25 | 27 |
| 14 | 15 | 31 | 32 | 35 |
| 15 | 17 | 35 | 37 | 40 |
| 18 | 23 | 48 | 50 | 54 |
| 20 | 28 | 57 | 60 | 65 |
| 24 | 38 | 78 | 81 | 89 |

Price is `base × (radius / ref)^1.7` — **the exponent is above 1 so scaling up is
genuinely expensive**, not linear-cheap. A core costs 0.

### Total node count decides the hull class

⭐⭐ **THE FLAT LADDER — POWER IS LATERAL, NOT VERTICAL.**

| nodes | class | rate | dmg | **net DPS** |
|---:|---|---:|---:|---:|
| 0–7 | FRIGATE | 1.00 | 1.00 | **1.00** |
| 8–13 | CRUISER | 0.80 | 1.30 | **1.04** |
| 14–24 | BATTLESHIP | 0.62 | 1.75 | **1.09** |
| 25+ | TITAN | 0.45 | 2.40 | **1.08** |

A titan is not a stronger frigate. It is a **slower, heavier, more committed**
one. ⚠ It counts **every node**, not just guns — mass is the class.

### Guns do not stack linearly

`1/√n`. **Six guns deliver 2.45× one gun, not 6×.**

| guns | 1 | 2 | 3 | 4 | 6 | 8 | 12 |
|---|---|---|---|---|---|---|---|
| ×one gun | 1.00 | 1.41 | 1.73 | 2.00 | 2.45 | 2.83 | 3.46 |

⚠ **This is what stops a class being "the same ship with more barrels."**

---

## ⭐⭐ THE ONE LEVER THAT MAKES A CLASS DISTINCT

**MOUNT RADIUS AND HULL SIZE DISAGREEING.** That is it. That is the whole design
space, and it is already proven on this roster.

The SUPER BATTLE FRIGATE — Mac's own class — is a **small hull carrying one
enormous gun**. It renders as a giant cannon with a ship bolted on behind, it
bills at 106 GP of 147 GP for that one gun, and it plays as a thing that hits
like a battleship and dies like a frigate. **Three independent systems told the
same story without being coordinated**, which is how you know the rule is real.

So, for the Lycheetah class, the question is not "how big is it". It is:

- **many small mounts on a big hull** → a swarm-denial ship, everything bears, nothing hurts
- **few huge mounts on a small hull** → a glass lance, must aim the whole ship
- **one spinal siege mount, forward** → commitment; the traverse *is* the drawback
- **all mounts forward, none aft** → a hunter that cannot disengage

⭐ **AND THE CLASS SHOULD LOSE SOMETHING.** Every distinct hull on this roster
gives up an axis. A ship that is good at everything is a frame, not a class.

---

## 🔴 THE HONEST CAVEAT — READ THIS BEFORE TUNING

⛔ **`shootPrimary()` DOES NOT YET READ THE NODE ARRAY.** Six cannons currently
fire **identically to zero cannons.** The turrets in `js/hardpoints.js` track,
swing at their own traverse and respect their arcs — and the shot does not come
from them.

**So the tables above describe what the guns ARE, not yet what they DO.** A
Lycheetah class designed today will look and cost exactly right and will not yet
*fight* differently. That work is named and is the top of the open list.

**This does not block design.** The node graph is the durable artifact; it is what
the fix will read. Design it now, and it comes alive when the guns are wired.

---

## ✍ THE TEMPLATE

Fill this in. Everything unmarked is Mac's.

```
CLASS NAME        ................................  (Mac)
FRAME             ................................  (type noun)
MARK GLYPH        ................................  (Mac)
ONE-LINE NOTE     ................................  how it fights
TINT              ................................  gold, exact hex

WHAT IT GIVES UP  ................................  ⭐ required
THE DISAGREEMENT  ................................  mount radius vs hull size
EARNED LIGHT      (a) fixed gold   /   (b) grows    ⭐ Mac's ruling

NODES
  core      r ....
  cannon    r ....  at (dx ...., dy ....)     ← forward is +X
  ...

TOTAL NODES  ....   → hull class ............
TOTAL GP     ....
```

---

## 📍 WHERE THINGS ARE

| | |
|---|---|
| play it | **http://localhost:8811/** |
| the roster and both ladders | `FLEET_ROSTER.md` |
| art generation spec | `ART_PROMPTS.md` |
| how sprites reach the screen | `ART_IN_THE_GAME.md` |
| hull definitions | `js/fleet.js` |
| traverse, arc, turret truth | `js/hardpoints.js` |
| the sprite layer | `js/sprites.js` |
| in-game keys | `G` sprites · `H` membrane · `J` chassis · `;` `'` scale · `P` pack |
