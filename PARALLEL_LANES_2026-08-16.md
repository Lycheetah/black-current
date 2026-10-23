# PARALLEL LANES — bubble-tanks-forge
### 2026-08-16 · work split for AZOTH, Antigravity/Aetheron, Gemini, Codex, Sol

Mac's point: *"thankfully this is a game so most of us can work on it."* True — but
only if we don't stomp each other. **The collision law in §0 is what makes this
parallel instead of chaotic.**

---

## ⭐ THE PLAN — Mac's ruling 2026-08-16

> *"capital ship fights in this could easily be quite fun if the graphics can
> look like it — but gameplay first, and customization, and still yeah locks."*

**Read as three constraints, in his order: gameplay → customization → graphics,
with socket locks staying in.** The sequence below follows that and nothing else.

### THE KEYSTONE: NODE DESTRUCTION

One feature pays off all three constraints at once, and it is the thing that
actually makes a capital ship fight fun: **you shoot the guns off it.**

- **Gameplay** — a fight becomes a target-priority decision instead of a health
  bar race. Kill its thrusters and it can't chase; kill its cannons and it can't
  hurt you. That is the whole reason big-ship combat reads.
- **Customization** — build choices gain visible stakes. Where you put a node
  starts to matter, because exposed nodes die first (GPT §7, "placement matters").
- **Graphics** — a big ship *looks* big when it comes apart. Wreckage is the
  cheapest possible way to sell scale, and the pack seam already draws per-part.

**MEASURED 2026-08-16 — what exists and what does not:**

| | state |
|---|---|
| node graph on the player | ✅ exists — `designer.js:46+`, typed `core`/`cannon`/`pod`/`spike`/`thruster`/`shield` |
| node graph on enemies | ✅ exists — `ai.js:48–65`, same shape |
| per-node rendering | ✅ exists — the art pack seam draws each part already |
| **per-node health** | 🔴 **DOES NOT EXIST ANYWHERE.** No `hp`, no `dead`, no `destroyNode` |
| damage model | 🔴 one global pool — `engine.js:459` `this.player.hp -= amount`; enemies `takeDamage(40)` |

▶ Classification: **NEW**, not ADAPTER — but it rides structure that is already
there on both sides, so it is far cheaper than it sounds. Three pieces:
give each node `hp`/`maxHp`/`dead`; attribute an incoming hit to the nearest
node instead of the global pool; make a dead node stop contributing its function
(cannon stops firing, thruster stops thrusting, pod stops granting HP).

⛔ **The core node stays lethal.** Killing the core still kills the ship — node
destruction is a way to *dismantle* a threat, never a way to make death optional.

### THE SEQUENCE

**PHASE 1 — MAKE THE FIGHT READ** *(gameplay first)*
1. ✅ Movement feel — built, 18/18. **⏳ Waiting on Mac's dial number.**
2. 🔴 **Node destruction** — the keystone above. Player and enemy, same system.
3. 🔴 **Projectile seam + weapon roles** — all 16 packs author projectile art and
   nothing renders it. Wiring it is also *legibility*: you can tell what is
   incoming. Fix the dead `weapons.js:51` glow ring in the same pass.

**PHASE 2 — CUSTOMIZATION + LOCKS** *(his second and third constraints)*
4. 🔴 **Typed sockets** — what may go where. The grammar of a build, and the
   thing that makes the 4-slot Dreadnought layout mean something.
5. 🔴 **Socket lock** — commit a build. ⛔ **A lock costs nothing, and nothing
   ever silently unlocks.** An unlock is always a visible, deliberate act.
6. 🔴 **Content volume** — 30 primaries / 20 actives / 30 mutations. Pure data
   entry against shapes that already exist. ⛔ Balance is Mac's call.

**PHASE 3 — LET THE GRAPHICS CARRY IT** *(explicitly last, by his order)*
7. 🔴 **Six real silhouettes** to replace the nine palette-swaps. Test: legible
   in pure black. This also unblocks mixed-lineage hulls, which only read if the
   lineages are actually distinct.
   ▶ **REFERENCE ART IS UNBLOCKED** — `ART_PROMPTS.md`,
   **12 batches of 10**, capital-fleet register, five houses on the alchemical
   spine. ⛔ **The 16 subjects ARE the 16 packs that already load** — an earlier
   draft invented 16 new classes alongside them, which is a split roster. Every
   image traces into a registered id; **do not create a seventeenth.**
   🟢 **NODE POINTS ARE THE POINT.** Every image carries its sockets as pure
   `#00FF00` dots — a reserved colour makes them machine-readable, so
   `scripts/extract-node-points.py` emits `{dx, dy, radius, type}` in game units
   and strips the markers from a clean copy. **The art carries the socket
   geometry, not just the shape.** Verified 11/11 against synthetic ground truth;
   a forward socket extracted at `dx 38.8, r 12.0` vs `designer.js`'s real
   `dx 38, r 12`.
   ⭐ **A MERGED BLOB IS STILL A VALID BLOB — only its SHAPE betrays it.** Two
   sockets drawn touching flood-fill into one fat node and the first version
   reported "0 needing attention" over a hull that had silently lost a socket.
   Roundness check added.
   🎨 `scripts/key-flat-background.py` keys a flat magenta card to transparent
   (`rembg` is installed but has no onnxruntime backend, so it cannot run).
   ⭐ **ASK FOR THE BACKGROUND YOU CAN REMOVE** instead of removing the one you
   were given. ⚠ Its first version fringed 89 of 177 edge pixels: the alpha ramp
   was a fixed 48 against a real key distance of ~235, so half-blended pixels
   scored fully opaque and the despill never fired. **A threshold in an absolute
   unit is a guess until you measure the range it lives in.**
   ⛔ **Those images are TRACING REFERENCE, not sprites** — the engine has no
   texture path, and adding one is a real architectural decision that is Mac's to
   make, never a side effect of having generated art.
8. 🔴 **Capital ship layering** — the 6-layer visual direction from GPT's doc.
9. 🔴 **Sector-bound lineage** — a pack becomes *where you have been*, not a menu
   choice. Mostly wiring; depends on 7 to be worth looking at.

⛔ **Phase 3 does not start early because it is the fun part to build.** Mac put
gameplay first and that ordering is the ruling.

---

## §0 — COLLISION LAW (read before touching anything)

**One file, one owner, per batch.** The only genuinely shared file is
`js/engine.js`, and it is the one most likely to be corrupted by two seats
editing at once.

| File | Owner this batch | Notes |
|---|---|---|
| `js/engine.js` | **LANE 1 ONLY** | ⛔ Everyone else: do not touch. Ask Lane 1 to add your hook. |
| `js/shaders.js` | LANE 1 | Physics + fog live here |
| `js/weapons.js` | LANE 2 | Projectiles, abilities |
| `js/packs.js` | LANE 2 | Adding `drawProjectile` only — don't touch `drawPart` |
| `js/designer.js` | LANE 3 | Sockets, catalogs |
| `js/garage.js` | LANE 3 | Socket lock UI |
| `js/particles.js` | LANE 4 | Perf |
| `js/ai.js` | LANE 5 | Enemies |
| `packs/*.json` | LANE 6 (Gemini) | New files only |
| `js/energy.js`, `js/map.js`, `js/campaign.js`, `js/progression.js`, `js/sound.js` | **nobody** | Stable. Leave alone. |

**Rules that are not negotiable:**

1. ⛔ **No git commands.** No commit, no push, no `git clean`, no stash, no
   checkout. The worktree is dirty on purpose and untracked files are real work.
   `git checkout` cannot restore an untracked file.
2. ⛔ **New files are the safe mode.** Prefer adding `js/<yourthing>.js` over
   editing an existing file. `js/energy.js` is the pattern: it owns its own
   input and HUD, so it cost `engine.js` only three one-line changes.
3. ⛔ **Never judge a render you have not looked at.** And **paint the dark
   ground first** — I misread the same art three times today on a white canvas.
4. **Ship a dial, not a constant.** Anything that is a *feel* number gets a live
   keybind + `localStorage` so Mac tunes it himself. He is the only instrument
   that can measure feel. The fog fix is the template.
5. Run `node --check <file>` before saying you're done.

---

## LANE 1 — PHYSICS FEEL  ✅ **BUILT 2026-08-16 — AWAITING MAC'S NUMBER**

▶ `js/feel.js` (new) · `js/engine.js` (2-line read) · `index.html` (1 script tag)
▶ Witness: `node scripts/witness-movement-feel.mjs` → **18/18**

**MEASURED on the real ship, not the constants:** ramp **42 → 24 frames** (43%
faster) with top speed essentially unchanged (9.96 → 9.53 px/frame, −4%).
Defaults `accel 1.30`, `damping 0.88`. Dial: `−`/`=` accel, `;`/`'` damping,
`0` reset. Persists to `biotank_forge_feel`.

> ⚠ **THE FORMULA IN THE SPEC BELOW WAS WRONG AND THE WITNESS CAUGHT IT.**
> `engine.js` does `v += a` and **then** `v *= d` in the same frame, so the
> steady state is **`a·d/(1−d)`, not `a/(1−d)`**. I predicted 10.7 px/frame;
> the ship measured 8.43, which is exactly `a·d/(1−d)`. The ship was right.
> ⭐ **When an integrator's order of operations is damp-after-accelerate, the
> closed form carries an extra factor of `d`.** Worth keeping — the wrong
> version looks correct and will be re-derived by anyone who doesn't measure.

⛔ **Still Mac's call.** A green witness is not a green hand on the keys. The
numbers above are a starting point; whatever he lands on with the dial becomes
the default.

### The original spec (kept for the arithmetic, corrected above)
**Suggested owner: Antigravity / Aetheron** (it owns this project per `AGENTS.md`)
**Files: `js/engine.js`, `js/shaders.js`**

Mac, playing, 2026-08-16: *"physics feels so sluggish."* That is the top-tier
evidence there is. Here is the arithmetic behind it.

### The measurement

`js/engine.js` ~line 637:
```js
this.player.vx += ax * 0.75 * crewAccel * reactorThrust;
this.player.vx *= 0.93;
```

- terminal velocity = `0.75 / (1 − 0.93)` = **10.7 px/frame**
- frames to 95% of terminal = `ln(0.05) / ln(0.93)` ≈ **41 frames ≈ 0.68s**
- frames to stop after key release ≈ **41 frames**

**Two-thirds of a second to reach speed, and two-thirds to shed it.** That is
the sluggishness. Top speed is fine; the *approach* to it is the problem, and
the long glide-out makes it feel like driving on ice as well as slow.

### The change

Keep terminal velocity roughly the same, halve the time to reach it:

```js
// accel 0.75 → 1.15,  damping 0.93 → 0.88
// terminal = 1.15 / 0.12 = 9.6 px/frame   (was 10.7 — near enough)
// 95% in ln(0.05)/ln(0.88) ≈ 23 frames ≈ 0.38s   (was 41)
```

Also the organelle springs in `js/shaders.js:18-19`:
```js
this.stiffness = 0.22;   // → 0.32   parts chase the hull harder
this.damping   = 0.78;   // → 0.72   less overshoot wobble
```
Loose springs make the whole body lag behind the input, which reads as
sluggish even when the hull itself is responsive.

### ⭐ The actual deliverable: a live dial

**Do not just change the numbers and declare it fixed.** Ship it like the fog
dial in `shaders.js` — a self-contained IIFE, guarded against typing in an
`<input>`, persisting to `localStorage`, with an on-screen toast:

- `-` / `=` → accel down / up (step 0.05)
- `;` / `'` → damping down / up (step 0.01)
- a toast reading `ACCEL 1.15 · DAMP 0.88 · TOP 9.6`

Then Mac plays, finds the number, and tells us. **That is the fix.** A constant
we guessed is what produced this complaint in the first place.

### Acceptance
- [ ] Dial works, persists, survives reload
- [ ] Doesn't fire while typing in the callsign box
- [ ] Reactor CILIA still multiplies thrust (currently a measured 1.97×)
- [ ] `node --check js/engine.js js/shaders.js` clean

---

## LANE 2 — THE PROJECTILE ART SEAM
**Suggested owner: AZOTH**
**Files: `js/weapons.js`, `js/packs.js` (add only)**

Codex authored full `projectiles` + `effects` blocks in
`packs/ironwake-fleet.json` — six weapons, trails, bursts, rings. **Nothing
renders them.** Loading the fleet today gives you battleships firing bio-bubbles.

### Work
1. Add `packRenderer.drawProjectile(ctx, weaponKey, x, y, angle, r, tint)` to
   `js/packs.js`. **Reuse the existing `drawPart` layer loop** — it already
   handles `poly`/`rect`/`circle`/`arcband`, `"tint"`, gradients and `pulse`.
   ⛔ Do not write a second interpreter. Extract the loop into a shared
   `_drawLayers()` and have both call it.
2. Honour two fields the schema already defines and nothing reads:
   - `stretch` — scale along travel axis (beams 3–5, shells 1)
   - `spin` — radians/frame, tumbling shells
3. In `js/weapons.js`, `Projectile.draw()` asks the pack first, falls back to
   the current circle on `false`. **Same fallback contract as `drawPart`.**

### 🔴 Fix this while you're in there
`js/weapons.js:51`:
```js
ctx.fillStyle = this.color.replace(')', ', 0.25)').replace('rgb', 'rgba');
```
Every colour in this game is hex (`'#00f3ff'`). A hex string contains no `)`
and no `rgb`, so **both replacements are no-ops** and the "soft glow ring"
fills at full opacity in the core colour. **That halo has never once
rendered.** Convert hex → rgba properly.

### Acceptance
- [ ] `packRenderer.drawProjectile` returns `false` with no pack → legacy draws
- [ ] Ironwake shells visibly differ from legacy bubbles
- [ ] `stretch` and `spin` observably change the render
- [ ] Glow ring is actually translucent

---

## LANE 3 — TYPED SOCKETS + SOCKET LOCK
**Suggested owner: Antigravity / Aetheron (second pass, after Lane 1)**
**Files: `js/designer.js`, `js/garage.js`**

The Dreadnought four-slot grammar: **Primary / Secondary / Perimeter / Internal,
one of each, always** — plus N free graft sockets. Structural, not advisory.

Then **socket lock**, and Mac's ruling is exact: *"give option to lock sockets
if people as this is mainly for me bro."*

⛔ **A LOCK COSTS NOTHING.** No stat penalty, no reduced drops, no nudge to
unlock, no "you could earn more if…". **Nothing ever silently unlocks a
socket** — not a level-up, not a respec, not a new run. If a lock can be
undone by anything other than Mac clicking it, it is broken.

Also add whole-hull **locked-build mode**: one toggle, everything pinned.

### Acceptance
- [ ] Exactly one of each of the four types is enforced
- [ ] A locked socket survives: level-up, chamber clear, reload, respec
- [ ] Locking changes no stat and no drop rate — verify by reading the code paths
- [ ] Design still saves to `biotank_forge_player`

---

## LANE 4 — PERFORMANCE
**Suggested owner: AZOTH (measurement lane)**
**File: `js/particles.js`**

`particles.js:53` and `:172` set `ctx.shadowBlur = 8` on **every trail particle
and all 80 ambient spores, every frame** — while `shaders.js`'s own header
boasts of achieving speed *"without slow shadowBlur"*.

⚠ **MEASURE FIRST.** Capture frame time before touching anything. If it isn't
costing, don't change it — this is currently a suspicion, not a finding.

If it is costing: replace with a two-pass draw (larger translucent circle
underneath) and re-measure. **Report both numbers.**

---

## LANE 5 — ENEMY VARIETY
**Suggested owner: AZOTH or a fresh seat**
**File: `js/ai.js`**

Five archetypes today: `mote`, `stalker`, `charger`, `sniper`, `hive`, + bosses.

⚠ **`hive` and boss are both `#ff3366`** — a carrier reads as a flagship at a
glance. Fix by reading `packRenderer.threat(archetype, fallback)`, which is
already wired and already returns distinct colours per pack.

Then add 3–4 archetypes with genuinely different *behaviour*, not different
stats: something that retreats when damaged, something that shields a
neighbour, something that only fires when you stop moving.

---

## LANE 6 — MORE ART PACKS
**Owner: Gemini** — full brief already written

▶ **`GEMINI_ART_PACK_HANDOFF_2026-08-16.md`**

Four packs: `voidwright`, `emberwake-swarm`, `glassreef-choir`,
`deepiron-cartel`. Validate with `node scripts/validate-pack.mjs --sheet`.
⛔ Add the id to `packs/index.json` or it will never load.

---

## LANE 7 — CONTENT VOLUME
**Suggested owner: Codex** (it did well on structured data)
**File: `js/designer.js` catalogs + `js/weapons.js` catalogs**

Today: 6 primaries, 5 secondaries, 5 organelle types. The Black Current Codex
specced **30 primaries in 6 families, 20 actives, 30 mutations in 5 branches,
24 grafts.** That is pure data entry against existing shapes — ideal parallel
work, zero architectural risk.

⛔ Balance is Mac's call. Generate the entries; don't tune the game.

---

## 🔴 MEASURED AGAINST THE ✅ 100% REPORT — 2026-08-16, afternoon

Full write-up: `BLACK_CURRENT_RECONCILIATION_2026-08-16.md`.
Re-run: `node scripts/witness-skin-selector.mjs` (**13/14** — the one failure is
a real open defect, not a bad assertion).

**The report was mostly accurate.** Validator honest, packs load, selector real,
zero image files true. Four things did not survive a browser:

| # | Finding | Lane |
|---|---|---|
| 1 | **Hull Skin selector threw on EVERY click** — `garage.js:186` called `packRenderer.save()`, which did not exist (`persist()` is the method). `use()` ran first so the pack *visibly changed* — which is why it passed as 100%. Choice never persisted, tile never highlighted. **FIXED** by aliasing `save()` in `packs.js`. ⚠ Converge on one name when lanes sync. | 3 |
| 2 | **Pack projectile art renders nowhere.** All 16 packs author `projectiles`; no `drawProjectile` exists. Every ship fires the same bubble. Also `weapons.js:51` — `.replace(')' …)` / `.replace('rgb' …)` are **both no-ops on hex**, so the glow ring has never rendered, ever. | 2 |
| 3 | **15 packs, ~6 designs.** Nine share one drawing in nine hues (`ai-battleship`, `cyber-dreadnought`, `eclipse-battlecruiser`, `emberwake-swarm`, `obsidian-reaver`, `plasma-cruiser`, `sol-flagship`, `titan-dreadnought`, `voidwright`). ⛔ **A pixel count proves a part drew, never that it is a different design.** Plus `plasma-cruiser` (18), `cyber-dreadnought` (7), `titan-dreadnought` (1) hardcode cyan and **ignore the player's tint** — the validator only warns on *no* tint, so a part carrying both passes. | 6 |
| 4 | **It is 16 packs, not 15 — and the validator has never seen the 16th.** `abyssal-choir` is defined **inline at `js/packs.js:330`**, not as a file. `validate-pack.mjs` globs `packs/*.json`, so "0 errors, 0 warnings" covers **15 of 16**. Separately `ids()` offers **17** options but `renderSkinChoices()` iterates `Object.values(packs)` = 16 tiles — **once you pick a pack there is no way back to `legacy` from the grid.** | 3 |

⭐ **The lesson to keep:** a feature that *half* works reads as done. The pack
switched on screen, so a human clicking once would have reported success too.
Only reading the console caught it. **And a validator that discovers its own
inputs can only ever see the inputs it knows how to discover.**

---

## WHAT IS ALREADY DONE — don't redo it

| Thing | State |
|---|---|
| `js/energy.js` energy triage | ✅ 25/25 witnessed. CILIA 1.97×, MEMBRANE ×0.55, STINGERS ×0.60 |
| Art pack seam wired | ✅ 12/12 witnessed. Geometry proven identical across packs |
| `packs/ironwake-fleet.json` | ✅ Codex. Validated, all 6 parts draw |
| `scripts/validate-pack.mjs` | ✅ Two-pass: structure + real-browser render |
| Fog dial | ✅ `[` `]` `\`, persists. ⚠ `shaders.js:325` resets to **0.82**, not the 0.5 this board claimed — Mac's number still wins |
| Movement feel dial | ✅ 18/18 witnessed. `js/feel.js`. Ramp **42 → 24 frames** measured on the real ship. `−`/`=` accel, `;`/`'` damping, `0` reset |
| Skin selector crash | ✅ Fixed — `garage.js:186` called `save()`, which did not exist. Aliased in `packs.js`. 13/14 witnessed |

## OPEN, UNOWNED

- ⏭ **PHONE COMPLETELY UNWITNESSED.** Every claim here is desktop-only.
- ⏭ **Nobody has reported whether the game is fun.** Sol has never played it.
- 🔴 Two save keys unreconciled: `biotank_forge_player` + `biotank_forge_save_v2`
- ⚠ Legacy spike points **−Y** while every other part faces **+X**. Codex chose
  +X correctly. Legacy is the odd one out — fixing it is a visual change and
  therefore Mac's call.
