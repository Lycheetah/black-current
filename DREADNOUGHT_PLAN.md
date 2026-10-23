# THE DREADNOUGHT PLAN — implementation
### stable name · edit this file, never date-stamp a copy
### answers to `GAME_VISION.md`, which is the north star and outranks this file

---

## THE DIAGNOSIS — what the game actually is right now

**MEASURED** by reading every line of `js/engine.js`, `js/weapons.js`,
`js/particles.js`, `js/shaders.js` and `js/feel.js`.

The ship is **a circle with decorative jewellery.** That is the whole problem,
and it is one problem wearing four costumes:

| the vision says | the code does | where |
|---|---|---|
| many guns, each with its own arc | **fires one bullet from the core centre** | `engine.js:559-605` |
| turning takes real time, you commit | `player.angle = atan2(mouse)` — **instant, zero mass** | `engine.js:662` |
| your starboard battery dies, you fight lopsided | **nodes cannot be hit at all** | `engine.js:765` tests `e.coreRadius` only |
| big guns swing slowly | **traverse does not exist as a concept** | nowhere |

⭐ **THE NODES ARE ALREADY THERE AND ALREADY CORRECT.** `SpringNode` carries
position, radius and type; the spring wobble runs every frame; the designer
writes them; saves restore them. **The geometry is built. Nothing reads it.**
So this is not a rewrite — it is *connecting an existing graph to the four
systems that should already have been asking it questions.*

### Two defects found on the way in

🔴 **`[` and `]` are bound twice.** `feel.js:endBindings` moves camera zoom;
`shaders.js:327-328` moves fog density. Both listen on `window`. **Pressing `[`
changes zoom AND fog at the same time.** Fog moves to `,` / `.`; `\` still
snaps back to the original 0.82 for comparison.

⚠ **Nothing is capped.** No `MAX_` constant exists anywhere in `js/`.
Projectiles, particles and enemies all grow without limit.

---

## THE ARCHITECTURE RULE THIS PLAN OBEYS

`js/feel.js` states it in its own header, and it is right:

> *"THIS FILE OWNS ITS OWN INPUT AND ITS OWN HUD, DELIBERATELY — the same
> pattern as `energy.js`. That keeps the change to `engine.js` down to two
> one-line reads... Two seats are live in this repo and `engine.js` is the one
> file most likely to be corrupted by both of us editing it at once."*

⭐ **SO EVERY NEW CAPABILITY IS A NEW FILE THAT OWNS ITSELF**, and `engine.js`
receives only the few one-line reads it cannot avoid. This is both the codebase's
own idiom and the safe mode under the cross-seat barrier in `AGENTS.md`.

⚠ **NO ES MODULES.** Classic scripts sharing globals. An `export` defers the
file and breaks load order. New tags go in `index.html` before `engine.js`.

---

## PHASE 1 — THE PERFORMANCE FLOOR · `js/perf.js` (NEW)

Cheap, protects everything downstream, and it is what makes the phone viable.

1. **Caps.** `MAX_PROJECTILES 400`, `MAX_PARTICLES 520`. Oldest evicted, never
   newest — dropping the bullet you just fired is the one thing a player feels.
2. **⭐ THE GLOW CACHE — the single biggest win in the file.** `particles.js`
   currently calls `createRadialGradient` **per particle per frame** (`:61`) and
   sets `shadowBlur` per particle (`:54`, `:176`). Both are among the most
   expensive operations in Canvas 2D. They are replaced by **one pre-rendered
   glow sprite per colour, built once into an offscreen canvas** and stamped
   with `drawImage`.
   ⛔ **THIS IS NOT THE ART SPRITE PATH AND DOES NOT PRE-EMPT MAC'S DECISION.**
   It is an internal render cache of a shape the engine already draws
   procedurally. Zero image files are added. The 268-asset question in
   `GAME_VISION.md` is untouched and still his.
3. **View culling** for particles, using the visible-world rect (not canvas
   width — at zoom 0.62 the world is 1/0.62 wider than the canvas).

---

## PHASE 2 — THE SHIP BECOMES ITS GUNS · `js/hardpoints.js` (NEW)

**This is the unlock.** Every `cannon` node becomes a real turret.

```
mountAngle  atan2(dy, dx) of its mount point — where it faces at rest
arc         half-width of its firing cone; a gun that cannot bear does not fire
traverse    rad/frame it can swing  ⭐ DERIVED FROM RADIUS — big gun, slow swing
angle       current facing, eased toward the cursor, CLAMPED to the arc
cooldown    per-gun, so six guns ripple instead of shotgunning
hp          so it can be shot off
```

⭐ **TRAVERSE IS DERIVED FROM THE GUN'S OWN RADIUS**, so the keystone stat needs
no new authoring and no new data format — a bigger barrel is *automatically* a
slower one. `traverse ≈ 0.052 · (12 / radius)`: a 12px gun swings ~180°/s, a
30px gun ~72°/s.

### The balance law

⛔ **SIX GUNS MUST NOT BE SIX TIMES THE DPS**, or stacking cannons becomes the
only build and customization dies. Damage per gun scales by **`1 / √n`**, so six
guns deliver **2.45×** a single gun's damage — dramatically more *presence* on
screen, nowhere near six times the power. Coverage and survivability are what
extra guns actually buy. `dpsScale` is a dial so you can overrule me.

---

## PHASE 3 — MASS IN THE TURN · hull turn rate

`player.angle` stops snapping and eases toward the cursor at `turnRate`.

⭐ **THIS IS FREE, AND HERE IS WHY IT IS SAFE:** movement is *absolute* —
`W` is world-up, not ship-forward (`engine.js:624-627`). So hull facing drives
**only gunnery and silhouette**, never thrust direction. Slowing the turn adds
all of the weight and costs none of the responsiveness. The ship still darts;
its guns simply have to catch up.

Default **120°/s**, dialled `,` … actually `<` / `>` — see the dial table below.

---

## PHASE 4 — NODE DESTRUCTION · the keystone verb

- Every non-core node gets `hp = 30 + radius·2`.
- Enemy projectiles test **nodes as well as the core** — a wide ship now has a
  real profile instead of one circle.
- A destroyed **cannon** stops firing. A destroyed **pod** withdraws its HP
  bonus. A destroyed node draws as a dark stub with a dead spar.
- Nodes restore on respawn and on level-up.

⚠ **`recalculatePlayerStats()` must be re-run on every node loss**, and `hp`
clamped to the new `maxHp` — that clamp *is* the "fight on lopsided" moment.

---

## THE DIALS — because feel is Mac's verdict and no gate's

Every new feel number ships as a live dial with conservative defaults, the same
pattern as `feel.js` and the fog. Nothing here is my ruling.

| key | dial | default |
|---|---|---|
| `−` / `=` | top speed | 18 |
| `;` / `'` | response | 0.88 |
| `[` / `]` | camera zoom | 0.62 |
| `,` / `.` | **fog** *(moved — was colliding with zoom)* | 0.50 |
| `<` / `>` | **hull turn rate** | 120°/s |
| `9` | **turret arcs on/off overlay** | off |
| `0` | reset movement | — |

---

## ⛔ WHAT THIS PLAN DELIBERATELY DOES NOT DO

- **No sprite path.** `GAME_VISION.md` records that as Mac's open decision.
  The 268 keyed assets stay exactly where they are.
- **No renderer rewrite.** Canvas 2D stays. The measured verdict was that it is
  the right call for this game.
- **No second engine.** `PRESET_DESIGNS` and the `nodes[]` array remain the one
  authoritative ship format. Everything here *reads* that graph; nothing
  replaces it. **A split roster is the only failure that matters.**
- **No new art, no new content.** This is the systems pass.

---

## STOP CONDITION

Playable in the browser with: guns firing from their own mounts within their own
arcs, a hull that has weight in the turn, batteries that can be shot off, and a
frame budget that survives a big fight. Then **Mac plays it and rules on the
numbers** — which is the only verdict that counts, and the one no gate here can
give.

---

# 🔱 PHASE 5 — THE WEAPON LADDER · MAC'S RULING, 2026-08-16

> *"for bigger ships bro we obviously give lasers continous fire missles or larger
> slower weapons and drones for sure. and if you have small slots on a larger
> ships theyll be significantly slower versions to match the ship class maybe as
> that means itll just have a modfier for some titans ect so they can have the
> smaller guns popping off ect but slower with higher dmg"*

**LOCKED.** Two dials, both DERIVED, neither authored.

## ⭐ THE MOUNT CHOOSES THE WEAPON

`hardpoints.js` already derives `traverse` and `arc` from `n.radius`. Weapon class
is **the same mechanism with one more table** — no new data format, no new
authoring, retroactive across every preset and every saved ship.

| mount radius | class | weapon | character |
|---|---|---|---|
| 4–9px   | POINT  | `spitter` / `twin` | chatter, wide arc, ~200°/s traverse |
| 10–15px | LIGHT  | `twin`             | today's default |
| 16–22px | MEDIUM | `laser`            | continuous — must HOLD bearing to keep damage on |
| 23–30px | HEAVY  | `homing`           | missile salvo, tracks, slow |
| 31px+   | SIEGE  | `mortar` / `railgun` | very slow, huge damage, narrow arc |

🔴 **MEASURED 2026-08-16 — ALL SIX WEAPONS ALREADY EXIST** in `js/weapons.js:189-194`
with `damage`, `fireRate`, `speed`, `radius` already tuned. `laser` fireRate **4**,
`railgun` **25** at **50 damage**. **Nothing needs writing.** They are currently
selected by digit key and fired identically from every mount. The work is *wiring
the mount to the table*, not authoring weapons.

## ⭐⭐ THE HULL CLASS MODIFIES EVERY MOUNT ON IT

Mac's actual insight, and the better half of the ruling: **a light autocannon on a
titan is not the same weapon as a light autocannon on a frigate.** The hull applies
a modifier to its whole battery.

Class is **derived from node count**, which `hardpoints.sync()` already walks:

| nodes | class | fireRate ×  | damage × | net DPS |
|---|---|---|---|---|
| 1–5   | SKIFF / FRIGATE | 1.00 | 1.00 | 1.00 |
| 6–11  | CRUISER         | 0.80 | 1.30 | 1.04 |
| 12–24 | BATTLESHIP      | 0.62 | 1.75 | 1.09 |
| 25–60 | TITAN           | 0.45 | 2.40 | **1.08** |

⭐ **NEAR-IDENTICAL DPS, WILDLY DIFFERENT FEEL.** That is the whole point and it is
why this is safe to ship. A titan is not stronger per gun — it is *heavier*. Its
point-defence still pops off, just in slow heavy thuds instead of chatter. The
slight upward drift (1.00 → 1.08) pays the big hull for its terrible traverse
without making it the only build.

Stacks *underneath* the existing `1/√n` fleet scale, so node count still cannot be
farmed for damage.

## 🔴 THE ONE THING THAT DOES NOT EXIST YET

**Per-mount cooldown.** The turret struct in `js/hardpoints.js:85-97` carries
`node, index, radius, mountAngle, arc, traverse, angle, bearing, flash` — **there
is no `cooldown` field**, and `shootPrimary()` fires every bearing mount on one
shared timer. `fireRate` per mount is the single new mechanism Phase 5 requires.

Everything else above is a lookup.

## DRONES

⏭ Deferred to THE LOOP in `GAME_VISION.md`, where mining drones already live.
⭐ **A DRONE BAY IS A HARDPOINT WHOSE PROJECTILE HAS AI** — same verb again. Do not
build a second spawner.
