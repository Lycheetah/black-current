# 🎨 THE ART IS IN THE GAME
### stable name · edit this file, never date-stamp a copy
### `js/sprites.js` · `art/manifest.json` · witness `scripts/witness-sprites.mjs`

> **"we should have some art and modules doen surerly bro weve used 150% usage"**
> **"since just putting art in XD"** — Mac, 2026-08-17

He was right, and the reason it had not happened is worse than "not started".

---

## 🔴 THE FINDING — THE ART WAS NEVER THE GAP

**MEASURED 2026-08-17.** `art/keyed/` held **268 finished, keyed, marker-stripped
sprites**:

| where | files |
|---|---|
| `art/keyed/modules/` | **215** (+ 215 marker-free copies in `clean/`) |
| `art/keyed/ships/` | 36 |
| `art/keyed/enemy-ships/` | 17 |

And `ctx.drawImage` appeared **nowhere in `js/`.** Not once. Every sprite Mac had
generated, sliced and keyed was **unreachable by the running game.**

⭐⭐ **THE ENGINE WAS 100% PROCEDURAL BY OMISSION, NOT BY DECISION.** That is the
whole finding. Nobody had chosen a procedural look — a draw call was simply
missing, and because the procedural renderer worked, nothing ever failed loudly
enough to say so. The art pipeline ran end to end and then stopped one function
short of the screen.

⚖ **WHAT WAS ACTUALLY MISSING WAS A NAME.** Nothing in the repo could answer
*"which file is a cannon, and where does it bolt on?"* The pixels existed; the
index did not. So the first deliverable was not a renderer, it was
`art/manifest.json`.

---

## ⭐⭐ THE MOUNT DOT IS THE PIVOT, NOT THE CENTRE

Every module sprite carries one reserved pure-green `#00FF00` dot. **That is why
`#00FF00` and `#FF00FF` are forbidden in every faction palette** — the green dot
is a machine-readable mount marker and the magenta is a chroma field. A palette
that used either would eat its own ship.

A turret rotates about **where it bolts to the hull**, never about the middle of
its own picture. Draw these centred and every gun on the ship swings like a
propeller. So the manifest stores `mount` as a **normalised (u, v) fraction of
the bitmap** — the one form that survives any scale the game later picks, because
`drawImage` addresses source pixels in bitmap space.

```js
ctx.translate(nodeX, nodeY);          // the socket on the hull
ctx.rotate(turretAngle);              // read from the LIVE turret, not recomputed
ctx.drawImage(img, -mountU * W * s, -mountV * H * s, W * s, H * s);
```

MEASURED: a mid-sized cannon (`module_168.png`) sits at **u = 0.115** — eleven
percent along its own bitmap. Centring it would have thrown the barrel a full
barrel-length off its socket.

---

## 🏗 THE SEAM — `engine.js` WAS NOT TOUCHED AT ALL

`fluidShader.drawOrganismMembrane()` is the **single entry point** through which
the whole player body is drawn, and it already receives everything a sprite layer
needs: screen position, hull angle, core radius, the live node array, and the
firing/thrusting state.

So `js/sprites.js` **wraps that one function** and keeps the original as the
fallback. **Zero lines of `engine.js` changed.** One seam, reversible with a
keypress.

⭐ **THIS IS THE REPO'S OWN IDIOM, NOT A NEW ONE** — `energy.js`, `feel.js`,
`hardpoints.js` and `fleet.js` each own their input, their HUD and their data for
the same reason: **two seats are live here and `engine.js` is the file most
likely to be corrupted by both editing at once.** Aetheron holds this project;
a new additive file is the safe mode.

⛔ **IT IS A WRAPPER, NOT A FORK.** The procedural renderer stays reachable and is
still what draws the hull underlay. There is exactly **one** procedural renderer,
and this is a layer over it.

### ⚖ THE NODE GRAPH IS STILL THE SHIP

A sprite is a **costume**. Nothing here changes physics, collision, hit points,
cost, traverse or class — the same `{dx, dy, radius, type}` is simulated either
way. **Witnessed §4: toggling sprites on and off changes not one node.** If every
PNG vanished the game would play identically. That is the test of whether a
render layer has quietly become a second engine. It has not.

---

## 🐛 THE CATERPILLAR — MAC FOUND IT BY PLAYING

> **"brother some of the ships youve connected modules to ships what the fuck"**
> **"and modules to modules as ships"** — Mac, 2026-08-17

His frigate launched as **a conga line of complete purple alien ships** chained
nose to tail. Cause, in full:

**Modules 093–100 are not modules.** They are whole small ships, and the giveaway
was already measured: **each carries several green dots, and a module has exactly
one mount.** `scripts/build-art-manifest.py` even says so in its own comment —
*"several sockets means it is a HULL, not a part"*.

🔴 **AND THE NEXT LINE FILED THEM AS `core`.** Having correctly reasoned *this is
a ship, not a part*, I put them in the one bucket that **every hull's core node
draws from.** So every ship wore a whole other ship at its centre.

⛔ **THE DIAGNOSIS WAS RIGHT AND THE ACTION CONTRADICTED IT.** That is the failure
worth remembering — not a missing check, but a correct finding that never reached
the line of code it was about.

**Fix.** `type: 'ship'`, `usable: false`. `ship` is not a node type, so nothing
bolts them on. **There is now no `core` bucket at all: a core node wears no
sprite.** The procedural membrane draws the body the painted parts bolt onto —
there is no core art, and inventing one out of a ship is exactly what broke it.
The seed in the builder was corrected too, so a regenerate cannot bring it back,
and the witness now asserts `core bucket === 0`.

### ⚖ CENSUS BEFORE CORRECTION — THE ONE HE DIDN'T SEE

Mac found **one** instance. Fixing only that would have left the rest. So the
same rule was run over **all 100 drawable sprites**: count separated green blobs
in each original.

🔴 It found **`module_092`** — five sockets on a swept-wing body with no green
paint anywhere — still filed `spike`, still being bolted onto hulls as a part.
Reclassified to `ship`. **Drawable set: 100 → 99.**

⚠ **AND THE SAME PASS PRODUCED A FALSE POSITIVE WORTH KEEPING.** `module_070`
also shows four green blobs — but it is a cannon built around a **glowing green
reactor**. **Blob count alone cannot separate a socket from a running light.**
The render at `shots/sprites/JUDGE_mount_truth.png` did, in one look. 070 stays a
part.

---

## 🟢 A RESERVED COLOUR WAS STILL REACHING THE SCREEN

MEASURED: **77 of the drawable sprites still carried green at their recorded
mount** in the supposedly marker-free `clean/` copies — mostly an anti-aliased
fringe of 8–15 px, but `module_070`, `module_079` and `module_089` kept the
**whole dot**, bright and visible at draw scale.

`scripts/strip-residual-markers.py` removes it. **It strips green inside a disc
at the manifest's recorded `mount`/`mountR` and nowhere else**, and that
restriction is the entire safety argument:

⛔ **THE FIRST VERSION SWEPT THE WHOLE BITMAP, AND THE ART PROVED IT WRONG.** The
engine's own signature green — **`#39ff14`**, the thruster flare, the homing
round, Bio Emerald — sits inside any band wide enough to catch a marker. A
whole-bitmap sweep would have punched holes through `module_070`'s reactor. **A
mount-local sweep never has to make that judgement.** The originals are untouched
and `clean/` is fully regenerable from `extract-node-points.py`, so the earlier
pass was bounded and reversible; the rule is now sound.

⚠ **AND THE GREEN WEDGE ON THE INTERCEPTOR IS NOT A BUG.** Isolated by
measurement, not by eye: it survives with **sprites off** and vanishes with the
**underlay off**, and its colour is exactly `#39ff14`. It is the procedural
**thruster flare**. This corrects an earlier claim in this file that a green wedge
on the DREADNOUGHT was the membrane's core glow — that one was `module_096`, one
of the eight misfiled ships.

---

## 🏗 THE CHASSIS — WHAT A CORE NODE DRAWS INSTEAD

Once no core node wore a sprite, the small hulls read as **parts floating in a
ring**. The membrane cannot fill that gap: the legacy pack draws **translucent
cyan bubbles**, not a body.

So `sprites._drawChassis()` draws structural spars from the core to every
non-core node, beneath both membrane and sprites, plus a core drum.

⭐ **IT IS DERIVED, NOT AUTHORED.** Every spar comes from a real node — its
direction from that node's live `currentDx/currentDy`, its width from that node's
own radius. Delete a node and its spar goes with it. **That is why this is a
renderer and not a second ship definition.**

⛔ **`sprites.chassis === true` IS A FLAG, NOT A MECHANISM.** On a dense hull the
spars are covered by the parts they carry — correct, and unphotographable. So the
witness counts real `ctx.stroke` calls with the toggle on and off (**223 → 281,
58 extra strokes for 19 spars**) and ships a deliberately shrunken diagnostic shot,
`shots/sprites/diag-chassis-exposed.png`, so a person can see the structure is
derived from the real node graph.

---

## ✅ MEASURED — `node scripts/witness-sprites.mjs` → 🟢 15/15

| § | law | result |
|---|---|---|
| 1 | manifest loads, wrapper installs | ✅ 136 usable, **99 drawable on a node** |
| 1 | **no `core` bucket** (the caterpillar cannot return) | ✅ core bucket = 0 |
| 2 | **`drawImage` is actually called in a real frame** | ✅ **114 calls / 6 frames** |
| 2 | one hull wears many distinct sprites | ✅ **12 distinct** on the DREADNOUGHT |
| 3 | the mount is not the bitmap centre | ✅ u = 0.115 |
| 3b | **the chassis is stroked, not merely enabled** | ✅ 223 → 281 strokes |
| 4 | the node graph is untouched | ✅ 20 nodes identical on/off |
| 5 | the title overlay is closed | ✅ we photographed the game |
| 5 | **the shots use the SHIPPED defaults** | ✅ enabled/underlay/chassis all on, gain 1.85 |
| 6 | no runtime errors | ✅ clean |

⛔ **§2 EXISTS BECAUSE `sprites.ready === true` PROVES A FETCH RESOLVED** and says
nothing about whether one pixel was ever painted. So the witness instruments the
live 2D context and counts real `drawImage` calls.

⛔ **AND THE FIRST RUN CAUGHT ITSELF LYING.** All six screenshots came back
showing the **callsign menu** — `garage.launch()` refuses without a callsign and
leaves the title overlay covering the canvas. The gate was 10/10 green over six
photographs of a form. Fixed by driving the real door and then **asserting the
overlay is gone before spending a screenshot.**

⛔ **AND THEN IT PHOTOGRAPHED A CONFIGURATION NOBODY LOADS.** The hull shots
forced `underlay = false` while the file shipped `true` — nine pictures of a game
Mac never sees. The shots now change exactly one thing, which hull is equipped,
and a law asserts the rest is what ships.

### 📸 LOOK AT IT

| sheet | shows |
|---|---|
| `shots/sprites/CONTACT_fleet_in_art.png` | nine hulls, real art, shipped defaults |
| `shots/sprites/diag-chassis-exposed.png` | the spars, sprites shrunk to 0.45 |
| `shots/sprites/JUDGE_mount_truth.png` | the three surviving markers, mount circled |
| `cmp-1/2/3` | procedural ⇄ sprites ⇄ sprites+underlay |

---

## 👁 WHAT THE SCREEN SAID

⭐ **THE SIZE LADDER READS INSTANTLY.** Interceptor to leviathan, the roster now
has visible weight class. That was invisible under uniform procedural circles.

⭐⭐ **THE SUPER BATTLE FRIGATE RENDERED ITS OWN THESIS.** It came out as an
enormous gun with a small ship bolted behind it — nobody arranged that. The class
is defined by mount radius and hull size *disagreeing*, and under real art that
disagreement is the silhouette. **The bill said the same thing** (106 GP of 147 GP
is the one gun). Three independent systems telling one story is the sign the rule
was real and not decorative.

🔴 **THE BIG HULLS HAVE NO PROW.** DREADNOUGHT, FLAGSHIP and LEVIATHAN read as
radially symmetric balls of guns. **The art did not cause this — it exposed it.**
The node graphs fan mass evenly around the core; procedural blobs hid that and
painted modules cannot. Mid hulls read correctly. Mac's eye, not a gate's.

⚠ **THE SCALE IS UNRULED.** `sprites.gain` ships at **1.85**, a compromise and not
an answer. MEASURED: at **2.35** the DREADNOUGHT lost its silhouette entirely
while the 2-node INTERCEPTOR looked right. **Overlap grows with node count, so no
single number flatters both ends of the roster.** A per-hull-class gain is the
likely real fix. Until Mac rules, it is a live dial.

---

## 🎮 CONTROLS

| key | does |
|---|---|
| `G` | sprites ⇄ procedural |
| `H` | procedural hull underlay on/off (**default on**) |
| `J` | structural chassis on/off (**default on**) |
| `;` `'` | sprite scale down / up |

The HUD sits **bottom-left**. It was bottom-right and printed straight over
`#fleet-hud` — visible in Mac's own play screenshot, which is the only reason it
was found.

---

## ⚡ FRAME RATE — OPEN, AND ONLY MAC CAN CLOSE IT

Mac's play screenshot read **FPS 17**.

**Diagnosed cause:** the source bitmaps are **227–479 px** and were being drawn
down to roughly 30 px, twenty-plus times per frame — the browser resampling a
half-megapixel image on every single blit. `sprites.scaled()` now resamples each
sprite **once** into an offscreen canvas at its drawn size, quantised to 4 px so
small changes reuse the cache.

⛔ **WHETHER THAT FIXES IT IS UNVERIFIED, AND I CANNOT VERIFY IT FROM HERE.**
Headless Chromium reported 0.6 ms/frame because **it does not composite** — the
number is meaningless. Mac runs **Firefox**.

**The measurement only he can take:** press **`G`** in game and read the FPS with
sprites on versus off. That single comparison separates *"the sprite layer costs
17 FPS"* from *"it was already 17"*, and nothing else here can.

⚠ **A CANVAS HAS NO `.src`.** Adding the cache silently broke the witness's own
instrumentation — it reported "0 distinct sprites" over 114 real `drawImage`
calls. Pre-scaled canvases are tagged `_file` for exactly this reason.

---

## 🔧 THE MANIFEST IS AN AUTHORED FILE

`python3 scripts/build-art-manifest.py`

Geometry is **MEASURED** from pixels every run and overwritten. `type` is
**AUTHORED** and carried forward **verbatim** — a machine cannot see that a
barrel is a cannon and a capsule is a pod.

⛔ **DO NOT "REGENERATE IT CLEAN" TO TIDY UP.** That throws away the only part a
person had to supply. Edit `type` in `art/manifest.json`, **never in the script.**
The seed dict in the script exists so the first run produced a game you could
look at, and every value in it is overridden the moment the manifest disagrees.

### Current coverage

| | count |
|---|---|
| sprites measured | **268** |
| usable (has a mount and clean geometry) | 136 |
| **actually drawable on a node** | **99** |
| cannon / pod / spike / shield / thruster | 55 / 23 / 11 / 6 / 4 |
| `ship` — indexed, nothing draws them | 37 |

⚠ **136 AND 99 ANSWER DIFFERENT QUESTIONS.** The 37 `ship` entries are usable in
the sense that they were measured, and unreachable in the sense that no node has
type `ship`. Quoting 136 as "in the game" would be an overclaim by arithmetic.

### 🟠 OPEN

1. **105 of 215 modules are `unclassified`** — nearly half the bank, unreachable
   until each gets a `type`. Contact sheet 3 (modules 173–228) has not been read
   by anyone; **guessing at art nobody has looked at is exactly the failure this
   pipeline is built to avoid**, so they arrive honest instead of wrong.
2. **98 files carry no 🟢 mount dot** and cannot be placed on a node at all.
   Regenerate with a marker, or drop them.
3. **The 36 ship and 17 enemy sprites are indexed but undrawn**, and **none of
   them has a `clean/` copy — 0 of 37** — so they still carry their raw markers
   and backgrounds. They are whole hulls, not parts: they need a different draw
   path (one sprite per ship rather than one per node), and whether the player
   hull should ever be a single painting instead of assembled modules is **Mac's
   call, not a wiring detail.**
4. **The big hulls have no prow** — a node-graph problem the art exposed.
5. **`sprites.gain` is a compromise**, not a ruling.
6. ⚠ **PHONE COMPLETELY UNWITNESSED.** Browser only. Decode cost of 99 PNGs on a
   phone is unmeasured and is the obvious risk.
