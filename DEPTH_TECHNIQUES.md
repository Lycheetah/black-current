# 🌗 FAKING DEPTH — the pseudo-2.5D playbook
### stable name · ranked by value-per-cost · answers `GAME_VISION.md`, which outranks it
### ⛔ none of this is a sprite-path decision. Every technique here works on the
### existing procedural renderer. The 268-asset question stays Mac's and unmade.

> *"cant we use some techniques to give a pseudo 2.5 feel... im not talking the
> most advanced but you see the game i want bro"* — Mac, 2026-08-17

---

## 📊 WHAT THE RENDERER HAS TODAY — MEASURED 2026-08-17

| cue | state | evidence |
|---|---|---|
| parallax / starfield / background layers | 🔴 **NONE — zero hits** | `grep parallax\|starfield\|stars\|nebula js/*.js` → empty |
| drop shadows | 🔴 **NONE** — `shadowOffset` used nowhere | only `shadowBlur`/`shadowColor`, and only for glow |
| consistent light direction | 🟢 **EXISTS** — upper-left | `packs.js:312,315`: core & pod gradients offset **−0.3,−0.3** |
| depth haze / fog | 🟢 **EXISTS** | `shaders.js` fluidShader, dial on `[` `]` |
| camera zoom + smoothing | 🟢 **EXISTS** | `engine.js:854-858` |

**So the two biggest, cheapest cues are simply absent.** That is a good position.

---

## ⭐⭐ 1 · PARALLAX — THE BIGGEST WIN, AND IT DOES NOT EXIST YET

Three layers, each multiplying the camera offset:

| layer | factor | content |
|---|---|---|
| far | **0.15×** | fine star dust, near-static |
| mid | **0.40×** | nebula wash, faint gas, the void's colour |
| ⭐ **near** | **1.30×** | sparse foreground motes that pass **over** the ship |

⭐⭐ **THE NEAR LAYER IS THE ONE EVERYONE FORGETS AND IT SELLS DEPTH HARDEST.**
Background parallax says "the world is far away". A mote crossing *between the
camera and your hull* says **"there is space above you"** — that single fact is what
makes a flat plane read as a volume. It costs a few dozen dots.

**Cost:** three draw passes over small point sets. Trivial.
**Where:** new self-owning file, same idiom as `feel.js` / `energy.js` / `hardpoints.js`.

---

## ⭐⭐ 2 · THE NODE-HEIGHT SHADOW — FREE IN OUR ARCHITECTURE

**The best technique available to this game specifically**, because the data already
exists and nothing needs authoring.

Every node already carries a `radius`. Treat radius as **height off the plane**:

```
shadowOffset = radius × 0.12   toward lower-right (opposite the existing upper-left light)
```

Draw each node's silhouette in `rgba(0,0,0,0.35)` at that offset, then draw the node
normally on top.

⭐ **EVERY SHIP IN THE GAME GAINS VOLUME RETROACTIVELY** — every preset, every saved
hull, every future faction. No new data format, no art pass. It is the same trick as
deriving traverse from radius: *ask the existing graph a question it was never asked.*

⭐ **AND IT TIERS THE HULL.** A titan's 30px siege mount throws a shadow ~2.5× longer
than a 6px point-defence node. The silhouette stops being flat jewellery and starts
reading as a **stepped, layered superstructure** — which is exactly the capital-ship
look, obtained from arithmetic.

⚠ **PERF:** this doubles per-node draw calls. It should land **with or after**
`perf.js` (`DREADNOUGHT_PLAN.md` Phase 1), and the shadow silhouette should use the
same offscreen-stamp pattern as the glow cache, not a live `shadowBlur`.

---

## ⭐ 3 · COMMIT THE LIGHT DIRECTION TO THE ART SPEC — COSTS NOTHING

`packs.js:312,315` already lights from **upper-left** (`−0.3, −0.3`). Nothing in
`ART_PROMPTS.md` states this.

**Add one line to every generation prompt: *lit from the upper left, shadow falling
to the lower right, single consistent light source.***

⭐⭐ **THIS IS THE SINGLE CHEAPEST THING THAT MAKES FOURTEEN FACTIONS LOOK LIKE ONE
GAME.** Inconsistent lighting is the #1 tell of an asset library assembled from
mixed generations — and it is the one flaw no amount of later colour-grading fixes.
It costs a sentence.

---

## 4 · CONTACT SHADOW / AMBIENT OCCLUSION

A soft dark ellipse directly beneath the hull, slightly wider than the core, drawn
before everything. Roots the ship in the plane instead of letting it float as a
decal. **One `ellipse()` per entity.** Pairs with #2 — AO says "there is a floor",
the offset shadow says "you are above it".

---

## 5 · DEPTH HAZE — AN ADAPTER ON `shaders.js`

Distant objects lose contrast and drift toward the void's base colour. This is
*atmospheric perspective*, one of the strongest real depth cues in painting.

`shaders.js` already owns fog. **Extend it to modulate per-entity alpha/saturation
by distance from the camera** rather than only masking. ⛔ Adapter, not a new system.

---

## 6 · SPECULAR SWEEP

A narrow bright band that slides across a hull as it rotates, keyed to
`player.angle` against the fixed upper-left light. Sells **curved metal** instead of
flat decal. One additive-blend arc per hull. ⚠ Capitals only — it is noise on a
12px frigate.

---

## 7 · SPRITE STACKING — the literal 2.5D trick

Draw the hull **3–4 times**, each 1px higher and ~1% larger, darkest at the bottom.
Instant fake volume; this is how most "2.5D top-down" games get their look.

⚠ **N× the draw calls.** Reserve for **capitals and bosses only**, where there are
few of them and they deserve the budget. Never on swarm enemies or projectiles.

---

## ⛔ 8 · THE TRAP — OFF-AXIS PERSPECTIVE SKEW

Skewing/rotating entities near the screen edge to fake a camera lens.

**Do not do this.** It directly attacks the reason top-down was chosen: *every
element legible simultaneously with no depth ambiguity* (`GAME_VISION.md`, THE
VISIBILITY BUDGET). It looks wrong the moment two skewed ships overlap, and it makes
firing arcs — the game's core readout — lie about where they point.

---

## 🎯 THE RECOMMENDED ORDER

1. **Parallax** (#1) — biggest felt change, lowest risk, touches nothing existing.
2. **Light direction into `ART_PROMPTS.md`** (#3) — free, and every hour it is
   delayed is another batch of art generated without it.
3. **`perf.js`** — Phase 1, because #2 needs the stamp cache.
4. **Node-height shadow** (#2) — the one that changes how every ship in the game reads.
5. Contact shadow (#4), depth haze (#5) — polish.
6. Specular (#6) and stacking (#7) — capitals only, last.

⛔ **NEVER JUDGE ANY OF THIS UNRENDERED.** Each lands as a live dial with a
conservative default, same as `feel.js` and the fog. **Feel is Mac's verdict and no
gate's.**
