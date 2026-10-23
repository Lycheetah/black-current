# PLAN: FIX THE FPS, THEN MAKE IT FUN (for Sonnet to execute cold)

Written 2026-10-23 by Sol at Mac's request. Mac: *"we need to make this game fun."*
Mac owns taste and every "is it fun" verdict. Sonnet owns the mechanics below.

## 0. RULING: FIX IN PLACE, DO NOT START FRESH

**DERIVED from measurement (below):** the engine core is lean (`js/engine.js`,
1209 lines, fixed loop, one aim path, one collision pass). The frame time is
spent in **render passes** (canvas effects, uncapped particles, per-enemy
three-pass ship drawing), not in architecture. Every cost below is a local
change. A rewrite would re-derive the 1209 lines of working rules and
rebuild the same canvas effects. **Fix in place.** Revisit only if Step 6 fails.

## 1. MEASURED BASELINE (headless Chromium, 1366x768, single run)

Harness: `scripts/profile-fps.mjs` (new, written today). It equips a synthetic
26-part capital (the roster `FLEET_HULLS` is empty), spawns 24 enemies, holds
the trigger, and times update+render+a 1px readback per frame (forces raster).
It then switches one pass off at a time. Run: `node scripts/profile-fps.mjs`
(about 5 min; needs `python3 -m http.server 8811` running in the project).

| pass switched OFF | frame mean ms | saved ms |
|---|---|---|
| BASELINE | **82.7** (about 12 fps) | |
| chamber membrane (`map.js:169` `drawChamberMembrane`) | 34.7 | **48.0** |
| enemies draw | 61.9 | 20.8 |
| particles draw (about 500 live, uncapped) | 62.6 | 20.1 |
| sprites off (G) | 63.9 | 18.9 |
| HUD + radar | 66.9 | 15.8 |
| lighting / fog canvas | 68.4 | 14.3 |
| mass drops | 68.5 | 14.2 |
| projectiles draw | 69.5 | 13.2 |
| membrane underlay off (H) | 71.1 | 11.7 |
| ocean grid | 71.8 | 10.9 |
| chassis off (J) | 74.1 | 8.7 |
| ambient spores | 74.4 | 8.4 |

**Honesty labels.**
- MEASURED: the 48 ms chamber-membrane saving. It is far outside noise.
- UNVERIFIED: every other row. The baseline ran first and the run-to-run noise
  is roughly 10 ms, so rows saving 8-20 ms are a ranking hint, not a number.
  Step 1 reruns them.
- Headless software raster is not Mac's Firefox (reported 7-17 fps at 80% zoom).
  The **ranking** is the evidence. Mac's screen is the final witness.

**Cause of the 48 ms (DERIVED from the code):** `drawChamberMembrane` fills and
strokes a circle of `chamber.radius` (thousands of px) with `ctx.shadowBlur = 24`
every frame. A blur shadow over a screen-sized path is the most expensive
canvas operation there is. Particles and spores also use `shadowBlur`.

## 2. RULES FOR SONNET (do not skip)

1. **Not a git repo with history.** `git log` is empty and there is no undo.
   Before the first edit: `cp -r js /tmp/.../js_before_fps` (scratchpad dir) and
   note the path. Tag retired code into `_retired/`; never `rm`.
2. **One change, one measurement.** After each step rerun
   `node scripts/profile-fps.mjs` (or `FRAMES=120` for speed) and write the
   before/after mean + p95 into the receipt table in section 7. A step with no
   number is not done.
3. **Do not change what the game looks like beyond what each step says.**
   Feel is Mac's. Visual changes get a screenshot (`shots/`) before and after.
4. **Regression gates stay green.** Run the existing witnesses before and after
   the whole job: `scripts/witness-fleet.mjs`, `witness-movement-feel.mjs`,
   `witness-shipyard.mjs`, `witness-skin-selector.mjs`, `witness-sprites.mjs`.
   A gate you changed must be seen to fail once on purpose (skill: `gate`).
5. **No new dependencies, no build step.** Classic scripts only (README law).
6. **A green headless run is not a green phone.** Never write "phone-ready".
   Say "profiler p95 X ms headless; Mac's screen pending".
7. One heavy process at a time. Kill the http.server and any browsers at the end
   unless Mac wants the server left up.

## 3. THE FPS STEPS (ordered by measured payoff)

**Budget:** profiler p95 under 16.7 ms (60 fps) on the same scenario; mean under
12 ms. Stretch: under 8 ms so a mid phone has headroom.

**Step 1: Re-baseline (no code change).** Run the profiler three times, take the
median per row, replace the table in section 1 with the medians. This turns the
UNVERIFIED rows into MEASURED ones and re-orders steps 3-8 if needed.

**Step 2: Chamber membrane (`js/map.js:169`).** Expected win about 48 ms.
Remove `shadowBlur`. Keep the look by drawing the ring as 2-3 strokes of
decreasing alpha and increasing `lineWidth` (a fake glow), and cull: only the arc
near the visible rect matters, so skip the full-disc `fill()` (or fill a
screen-sized rect clipped to the circle once). Screenshot before/after the ring
at the boundary; Mac's verdict on glow is his, so keep the colours identical.

**Step 3: Particles (`js/particles.js`).** Expected win about 20 ms.
- Add `MAX_PARTICLES = 200`; when exceeded, drop the oldest on spawn.
  (`spawnBubbleBurst` makes 15 per call; a firing capital spawns hundreds.)
- Remove `shadowBlur` from `trail`/`spore`/ambient spores (`drawAmbient`).
- Pre-render one soft-bubble sprite per colour into an offscreen canvas and
  `drawImage` it, instead of building a `createRadialGradient` per particle
  per frame. Drop the per-particle `save()/restore()`; set `globalAlpha` and
  reset once after the loop.
- Cull particles outside the visible world rect (see `drawAmbient` for the
  zoom-aware rect).

**Step 4: Ships (`js/sprites.js`, `js/shaders.js:72`).** Expected win about 20 ms
(enemies) plus the player's three passes.
- The sprites wrapper draws chassis + underlay + sprites for **every** enemy.
  Add an LOD rule: skip the chassis and the underlay when the ship's on-screen
  size is small, or when it is not the player. Keep the sprites.
- Skip drawing any ship wholly outside the visible rect.
- Cache the chassis (`_drawChassis`) to an offscreen canvas per hull and only
  rebuild when node positions change by more than a pixel (springs settle).
  Do **not** cache while springs are visibly moving: that would freeze the
  wobble that is part of the feel.
- Fix `scaled()` cache key: it keys `file@width` but validates height, so two
  heights at one width thrash. Key on `file@w@h`.

**Step 5: HUD and radar (`js/engine.js:937, 968, 1008`).** Expected win about 15 ms.
- `drawMiniRadar` uses `shadowBlur` per enemy: remove it.
- Run radar every 8th frame and HUD DOM writes only when a value changed
  (cache last text/width, skip identical writes).
- Note the throttle uses `this.frameCount % 4`, and `frameCount` resets every
  second, so the cadence is uneven. Use a separate monotonic counter.

**Step 6: Fog canvas (`js/shaders.js:213`).** Expected win about 14 ms.
Currently a full-screen clear + fill + gradient `destination-out` every frame.
Replace with one cached radial-fog canvas, drawn by `drawImage` at the player's
screen position, or render the lighting canvas at half resolution and let CSS
scale it. The fog dial (`[` `]`) must still work: re-render the cache when
`fogDensity` or the radius changes, not per frame.

**Step 7: Small passes.** Mass drops, projectiles, ocean grid, spores.
- Ocean grid (`shaders.js:258`): about 110 separate `beginPath/stroke` per frame.
  Build one path for all cells, one `stroke()`.
- Projectiles/drops: skip off-screen ones; batch same-colour fills.
- Do these only if Step 1's medians say they still matter after Steps 2-6.

**Step 8: Re-measure and decide.** If profiler p95 is not under 16.7 ms after
Steps 2-7, stop and report to Mac with the table. That is the only point where
"start fresh" comes back on the table, and it needs his ruling.

**Step 9: Mac's witness.** Hand Mac a one-line run instruction. He presses
`G`/`H`/`J` and reads the fps counter on his own screen. Record his number in
section 7. Until then the status is **unwitnessed**.

## 4. GATE: NO FUN VERDICTS UNTIL STEP 9

Mac cannot judge a loop at 7 fps. Do not retune combat, difficulty or rewards
before Mac reports a playable frame rate. Steps 10+ are written now so the work
is queued, but they start only after Step 9.

## 5. THE FUN TRACK (grounded in GAME_VISION.md; Sonnet proposes, Mac rules)

**The arbiter, Mac 2026-08-16:** *"itll be fun, thats the main thing."* FUN IS
THE ARBITER is the highest law in `GAME_VISION.md`. A system that is correct and
not fun loses. Read `GAME_VISION.md` (north star, locked, not to be relitigated)
before touching anything below.

**What the game IS:** "a wee eve version with top down dreadnought gameplay."
Never describe it to anyone as "EVE but X". The verb that makes it different:
you do not dodge, you **angle armour**; many guns each with their own arc and
traverse; **traverse speed is the keystone** (`traverse = 0.052 * (12/radius)`);
turning takes real time; losing a battery leaves you fighting lopsided. Power is
**lateral** (the Flat Ladder, net DPS about 1.0 per hull class). Reward axis is
**access**, never raw power. Never add a purchasable traverse upgrade.

**Where the fun is MEASURED to be missing (from README/PLAN, not new claims):**
| the vision's fun | state |
|---|---|
| per-socket guns, arcs, traverse (`hardpoints.js`) | BUILT, not re-witnessed; "some areas don't allow shooting" is an OPEN unexplained report (README Defect 1) |
| node destruction (lose a battery, fight lopsided) | **UNBUILT. "The keystone."** This is the signature moment of the genre |
| the loop: kill -> wreck -> mining drone -> dock -> repair/sell/buy | **UNBUILT** (no wrecks, cargo, hub; `drones` array empty) |
| Sovereign Hub (death = relocation, repair, market) | **UNBUILT**; death still respawns in place with a mass penalty |
| enemy ships that play the same dreadnought game | UNKNOWN; 5 archetypes + 4 bosses, not re-witnessed since sprite work |
| a roster to fly | **EMPTY** (`FLEET_HULLS = {}`); Shipyard (`Y`) is the only door |
| economy (`js/economy.js`) | RULED, unbuilt; one decision only Mac can make (see Q1) |
So the game today is a bubble-tank shooter wearing the dreadnought art. The fun
the vision promises lives in the UNBUILT rows.

**The build order that proves the fun fastest** (this is GAME_VISION's own "next
build": "prove the loop turns once, then widen it"). Start only after Step 9:

**Step 10: Witness what exists (15 min, no code).** Walk launch to first kill to
first sector clear in the browser. Write a timeline (seconds to first fight, to
first reward, to next goal). Fire from every gun class on the synthetic capital
and on one Shipyard-built hull. Settle Defect 1 (guns that will not fire):
probe `readyMounts()`/`bearing`, then reactor gating, per README. Output: a
list of "this moment is dead" with timestamps. No tuning.

**Step 11: Make the guns feel like the vision.** Behind live dials (same pattern
as the fog dial): hit flash, small screen shake on damage, hit-stop on kills only,
muzzle flash, visible arc cones that turn green when they can bear
(`hardpoints.drawArcs()` exists). Particle caps from Step 3 apply. Mac's rule:
the ship is its own HUD, so no new bars.

**Step 12: Node destruction (the keystone).** A destroyed node leaves the
silhouette, its gun stops, and the ship fights lopsided. Smallest slice: node HP
derived from radius, a destroyed node removes its mount from `readyMounts()`, a
debris burst, and the hull's silhouette updates. One implementation; it must
compile through the same `nodes[]` array (the one law: no second format).

**Step 13: The smallest loop (GAME_VISION "THE NEXT BUILD").** In order, each
with its own witness: (1) killed enemies leave a wreck holding metal; (2) a
`miner` node type that targets wrecks through the same hardpoint code; (3) a
cargo count; (4) one Sovereign Hub: dock to repair, sell cargo, buy one module.
Explicitly NOT in this slice: forest/growth, outposts, multiple hubs, moving
prices. Prove it turns once, then widen.

**Step 14: Seed the roster.** The Shipyard exports a hull in the exact
`FLEET_HULLS` shape. Mac names ships from his art by filename (never invent
names). Sonnet may only prepare the pipeline and report; it does not author
or name Mac's ships.

**Decisions only Mac can make (Sonnet must ask, not assume):**
- **Q1:** Does dying cost you your fittings? (PLAN Part 4 "the one decision
  only Mac can make"; it decides whether Step 13's hub is a repair shop or a
  risk engine.)
- **Q2:** Is the MIND layer (a third bar whose damage degrades capability, see
  GAME_VISION "Shield, Hull, Mind") in the first slice or later? Default: later.
  It conflicts with "death is relocation" until he resolves it.
- **Q3:** Do Steps 11-13 wait for his frame-rate number, or may Sonnet start
  Step 12 on a headless p95 under 16.7 ms? Default: wait for Step 9.

**What Sonnet must not do:** retune combat numbers, add flat power upgrades, add
tiered "strictly better" gear, gate zones on DPS, add waiting (timers, queues,
overnight orders), or write EVE names/UI into anything.

## 6. DEFINITION OF DONE

- Profiler table (medians) before and after, in section 7, p95 under 16.7 ms
  or an explicit blocker.
- All five existing witnesses green before and after (counts, not just exit codes).
- Screenshots of the chamber ring, a firing capital, and the fog, before/after.
- `scripts/profile-fps.mjs` committed to the project as the reusable measure.
- Backup path of the pre-edit `js/` recorded.
- Mac's own fps number recorded, or the status stated as unwitnessed.
- Nothing left running (http.server, Chromium).

## 7. RECEIPT (Sonnet fills in)

| step | file(s) | before ms | after ms | p95 after | screenshot | note |
|---|---|---|---|---|---|---|
| 1 re-baseline | none | | | | | |
| 2 chamber ring | | | | | | |
| 3 particles | | | | | | |
| 4 ships | | | | | | |
| 5 HUD/radar | | | | | | |
| 6 fog | | | | | | |
| 7 small passes | | | | | | |
| 9 Mac's fps | | | | | | |

Backup of pre-edit `js/`: ______

---

## 8. RECEIPT — FPS pass 1 (Sol, 2026-10-23, Sonnet 5.5)

**Backup (pre-edit):** `/tmp/claude-1000/-home-guestpc/974202b8-31cb-4d3d-b763-fb0f27815a62/scratchpad/js_before_fps/`  (return path: copy back over `js/`)

| Step | Change | File |
|---|---|---|
| 2 | Chamber ring: `shadowBlur=24` removed; glow = two faint wide strokes | `js/map.js` `drawChamberMembrane` |
| 3 | Particles: `MAX_PARTICLES=200`, no per-particle save/restore, no shadowBlur, cached bubble sprite, off-screen cull; spores lose shadowBlur | `js/particles.js` |
| 4 | Enemy cull + chassis skipped for enemies (`sprites.enemyChassis=true` restores); `scaled()` cache key now `file@w@h` | `js/ai.js`, `js/sprites.js` |
| 5 | Radar `shadowBlur` removed; HUD/radar on a monotonic 1-in-6 tick | `js/engine.js` |
| 6 | Fog repaint skipped when its inputs are unchanged | `js/shaders.js` `drawLightingShader` |
| 7 | Ocean grid in one path; pod/core gradients cached as per-colour discs | `js/shaders.js` |

**MEASURED (headless Chromium, 1366x768, 24 enemies + 26-node capital, `scripts/profile-fps.mjs`):** baseline mean **82.7 ms → ~26 ms** (noise ±10 ms; three runs: 32.1, 25.9). In-game FPS counter, 8-enemy shot: **15 → 28**.
**NOT MET:** target p95 < 16.7 ms / mean < 12 ms. Remaining cost (last run): enemies draw ≈ 10-18 ms, hull underlay ≈ 10-20, sprites ≈ 6-15. Next: cache the whole enemy ship to an offscreen bitmap per (hull, colour) and redraw only on node change/rotation.
**Regression check:** `witness-shipyard` 27/1, `witness-sprites` 14/1, `witness-fleet` §1 "hull count" red — **identical before and after** (pre-existing: empty roster, etc.). `witness-movement-feel` and `witness-skin-selector` default to port 8082, **not run**.
**Seen:** before/after screenshots of a live fight, same look (scratchpad `shot_before.png` / `shot_after.png`). The chamber ring itself was off-screen in both, so its new glow is **not yet seen**.
**Unwitnessed:** Step 9 — Mac's own fps on his screen. Absolute ms here is headless software raster, not his number.
**Left running:** `python3 -m http.server 8811` (it had died; I restarted it).

## 9. RECEIPT — SCREEN FIT (Sol, 2026-10-23) + HANDOFF STATE

**Mac's report:** *"how the game fits on the screen lol i had to zoom out to 60% to leave the map."*
**MEASURED cause:** `.modal-card` had no height limit. The map card was **1118 px tall in a 768 px window**; its CLOSE button sat 142 px below the fold.
**Fix (one file, `css/style.css`):** `.modal-card` gets `max-height: calc(100dvh - 40px)` + `overflow-y: auto`; `.matrix-grid` width is `min(100%, calc(100dvh - 330px))` so the square 7×7 grid shrinks to fit. Return path: `scratchpad/style.css.before_fit` (copy back over `css/style.css`).
**MEASURED after (map card bottom vs window, CLOSE button visible in all):** 1366×768 → 711, 1280×720 → 663, 1024×600 → 557, 1920×1080 → 1004. Screenshot of 1366×768 inspected: whole card + grid + legend + CLOSE on screen.
**NOT CHECKED:** the Shipyard (Y) and Designer (TAB) at 1366×768 (same `.modal-card` rule applies to the Designer; the Shipyard is its own full-screen layout), phone widths, Mac's own monitor.

### Where the game stands (for the next seat)
- ~10.5k lines, 21 JS files, zero deps, no build, **no git history** (backups: `/tmp/claude-1000/-home-guestpc/974202b8-31cb-4d3d-b763-fb0f27815a62/scratchpad/js_before_fps/` pre-FPS; `.../js_after_pass1_and_fit/` after).
- FPS pass 1 done (section 8): headless mean frame 82.7 → ~26 ms, in-game counter 15 → 28. **Target (<12 ms mean) NOT met.** Next: cache whole enemy ships as bitmaps.
- **Mac's open asks, in order:** (1) scaling — screen fit now fixed for modals; he may also mean camera zoom (`feel.js` 0.62) or the hull scale ladder (`fleet.js:267`) — **ask him**; (2) the customization menu "is terrible" — `shipyard.js` (1378 lines) + legacy `designer.js` + `bay.js` = three surfaces for one job, parts catalog is ~25 text buttons with no picture of the 136 painted sprites, ship tiny in the preview; (3) he is weighing a **full rebuild with Sol Max 6.1**. Sol's stance: rebuild the *shipyard* as one surface, keep the engine, art and ship file format; do not rebuild what works.
- Roster is empty (`FLEET_HULLS = {}`); wrecks/mining/hub/node destruction unbuilt; README Defect 1 (guns won't fire) undiagnosed.
- Pre-existing red witnesses (identical before/after my edits): `witness-shipyard` 27/1, `witness-sprites` 14/1, `witness-fleet` §1 hull count.
- Tools added: `scripts/profile-fps.mjs` (ablation profiler, `FRAMES=120 node scripts/profile-fps.mjs`).
- Server: `python3 -m http.server 8811` is running; game at http://localhost:8811/.


## 10. RECEIPT — phase-one timing and rendering repairs, 2026-10-23

**Status: functional repair batch landed locally; 60 FPS objective NOT met.**
Mac approved the proposed sequence: performance/timing, unified Shipyard and HUD,
one rewarding excursion loop, then procedural encounters within the sector grid.
This batch covers the first stage only. Shipyard, combat balance, rewards, sector
content, ship formats and saved-player schema were not redesigned.

**Actual project:** `/home/guestpc/-0-OPENCODE-ROOTFOLDER/bubble-tanks-forge/`.
The older Desktop path printed above is absent. Game source served at
`http://127.0.0.1:8811/` matched all four changed runtime files by SHA256.
The existing server was left running; test browsers use separate, disposable
profiles and close at the end. No commit, push, release or publication.

### Retained changes

- `js/engine.js`: 60 Hz simulation accumulator, maximum five catch-up ticks,
  explicit accounting for discarded stall time, render-count FPS counter,
  pause/map/hidden-tab guards, idle rendering under menus, and secondary-ability
  activation blocked while paused. Hidden-tab returns reset the accumulator.
- `js/engine.js`, `js/shaders.js`, `css/style.css`: half-resolution fog with
  correctly scaled sight coordinates, source-over black darkening instead of
  the screen-sized multiply blend, and fog cache invalidation when resized.
  The black mask slightly changes the old blue-tinted darkening; Mac's visual
  verdict is still pending.
- `css/style.css`: combat HUD panels use an opaque dark fill instead of live
  backdrop blur; radar loses backdrop blur. Layout and Shipyard are unchanged.
- `js/sprites.js`: resampled sprite cache bounded to 192 entries / 16 MiB.
  This is a bound on resampled canvases, not on all browser or source-image RAM.
- `js/shaders.js`: gradient-disc cache bounded to 64 entries.
- `scripts/witness-phase-one.mjs`: local, seeded browser witness that drives
  the actual RAF callback at 30/60/144 Hz, checks pause/stall/visibility behavior,
  asserts that the 26-node capital reaches the renderer with 25 painted parts,
  samples browser cadence separately from forced-readback raster work, and
  stress-tests cache limits. It supports original-source overrides from the
  backup, without restoring or changing live files.

A per-part membrane-paint tile experiment was removed: its Firefox comparison
was slower (17.7 ms raster mean versus 16.5 ms without those tiles). The original
live membrane renderer is retained, including spring movement and turret art.

### Evidence and limits

The exact retained build passed **36/36 functional assertions in Chromium and
36/36 in Firefox**; these are the same checks in two browsers, not 72 independent
behaviors. Four changed JavaScript files passed syntax checks. All 30 backup
hashes read back correctly, and 26 pre-existing files outside the four runtime
changes remained byte-identical before this receipt was appended.

The original Firefox build failed 22/34 applicable assertions. Its two new
cache-limit checks are deliberately excluded when testing the original source.
The earlier original Chromium witness failed 19/30 checks before the extra
stall/visibility/ability checks were added. These failures establish that the
clock/pause witness detects the original defects; no assertions were weakened.

Matched initial workload: visible 26-node capital, 24 tier-3 enemies, 1366×768,
zoom 0.5. Natural-cadence samples cover four seconds without forced pixel
readback. The repaired simulation advances more ticks in the same wall time,
so live fights evolve differently. Raster rows use a frozen fixture with
30 samples after six warm-up draws and force a 1-pixel readback of both canvases.
These single-run headless results have noise and are not Mac's own Firefox or
phone FPS. Approximate FPS below is 1000 divided by mean render interval.

| Browser | Cadence samples before / after | Mean interval | p95 interval | Approx. FPS | Raster mean | Raster p95 |
|---|---|---|---|---|---|---|
| Chromium | 56 / 132 | 71.12 → 30.26 ms | 114.30 → 45.30 ms | 14.1 → 33.0 | 12.37 → 12.30 ms | 18.30 → 20.20 ms |
| Firefox | 50 / 63 | 76.44 → 62.78 ms | 147.00 → 99.00 ms | 13.1 → 15.9 | 22.13 → 15.83 ms | 36.00 → 23.00 ms |

**Neither browser meets the stated raster p95 <16.7 ms or steady 60 FPS goal.**
The functional assertions passing does not close that performance objective.
Mac's actual-browser FPS, touch behavior, device heat and fun remain unverified.
The next input requested is a hard refresh in Firefox and a combat FPS/feel report.
Do not start a renderer rewrite or claim phase-one performance complete from these numbers.

Authoritative reports for this batch:

- `shots/performance-phase-one/visible-before-chromium/report.json`
- `shots/performance-phase-one/final-before-firefox/report.json`
- `shots/performance-phase-one/final-current-chromium/report.json`
- `shots/performance-phase-one/final-current-firefox/report.json`
- `shots/performance-phase-one/final-build.json`: exact retained source hashes.
- `shots/performance-phase-one/final-current-chromium/combat.png`: rendered desktop view.
- `shots/performance-phase-one/final-current-firefox/combat-canvas.png`: Firefox canvas export.

Earlier `before-chromium`, `after-timing-*`, `after-clock-*`, `after-render-*`,
`visible-after-chromium` and `final-firefox` runs are superseded for performance:
initial invulnerability settings could hide the capital, a controlled-RAF wait
needed timer polling, one pause count included the resumed frame, and later
runs contained the removed tile experiment. The zero-check `after-clock-chromium`
report did not run and is not a pass. Firefox full-page screenshots failed in
one headless run; final Firefox evidence uses canvas export instead.

The five older fleet/movement/Shipyard/skin/sprite witnesses were not rerun in
this bounded batch. Their old empty-roster/retired-pack failures are not cleared.
`profile-fps.mjs` is unchanged; use the new witness for total frame/cadence
measurement with the fixed-step loop rather than its last-update timer.

### Repeat and return

```
node scripts/witness-phase-one.mjs repeat chromium
node scripts/witness-phase-one.mjs repeat firefox
```

Both need the existing server on port 8811 and the installed local Playwright.
No npm install or new game dependency was added.

The pre-edit 30-file backup and its SHA256 manifest are at:
`/home/guestpc/.local/state/bubble-tanks-forge/phase-one-20261023-152730/`.
To return the four runtime files, copy its `js/engine.js`, `js/shaders.js`,
`js/sprites.js` and `css/style.css` back to the same relative paths, then hard
refresh. Keep this receipt and the witness artifacts as history. Player storage
was exercised only inside isolated browser profiles.


## 11. RECEIPT — flight UI and unified Shipyard, 2026-10-23

**Status:** UI and editor implemented locally; engine work handed off as a
prepared brief for Mac's requested Opus 5.5 seat. No Opus/provider implementation
run was launched in this UI batch. No commit, push, release or publication.

Mac supplied `Screenshot_2026-10-23_16-06-34.png` (combat HUD, FPS counter 22)
and `Screenshot_2026-10-23_16-06-45.png` (the cramped text-based editor), then
explicitly assigned UI/editor here and the engine next to Opus 5.5. The screenshot's
22 is one displayed value; this batch makes no new sustained-FPS claim.

### What the player can now use

- A compact flight HUD, with the three diagnostic panels grouped behind F1,
  controls behind a button, and readable numbered reactor modes.
- A three-column Shipyard: pictured/searchable/category-filtered parts, a much
  larger auto-fit preview, and a selected-part inspector with actual mount class,
  firing arc, fitting cost and casting choices.
- Clear Save ship / Fly this ship / Close actions that stay on screen independently
  of the scrolling catalogue and inspector. Internal roster IDs are generated
  from the player's ship name; import/export lives under a disclosure.
- Undo/redo (including New ship), preserved mirroring/duplication, optional grid
  and angle snapping, explicit weapon-class selection, and wheel zoom that no
  longer silently resizes a weapon. Ctrl+S saves; Escape closes.
- Per-node castings survive placement, preview, save, Fly, refresh and Continue.
  The UI reuses the existing bay appearance-restoration helper because the engine
  constructor path currently drops `art`; this seam is named in the engine brief.
- B/Y/Tab/the visible button lead to one workshop. B starts from the live ship;
  the obsolete separate fitting-bay interface does not open.

### Exact write paths and architecture

New runtime files: `css/workshop.css`, `js/shipyard-ui.js`, `js/interface.js`.
`index.html` adds their stylesheet/script tags after the existing dependencies.
The Shipyard presentation reuses the existing graph, operations, save/roster,
export format and `fluidShader.drawOrganismMembrane` renderer. Original-resolution
art is used while painting the paused editor, at the canonical renderer's same
positions and dimensions. It does not change combat's bitmap cache or renderer.

Added `scripts/witness-workshop.mjs` and `OPUS_ENGINE_HANDOFF.md`; updated this
receipt and `CHANGELOG.md`. All 19 pre-existing JS files and both previous CSS
files remained byte-identical to the UI-batch backup. In particular engine,
shader, sprite, AI, weapon, original Shipyard and fitting-bay source were not
rewritten. The handoff is the next engine batch's entry point; do not silently
resume the earlier FPS campaign under this UI scope.

### Witness

- **Firefox: 31/31 UI assertions; Chromium: 31/31.** Same behaviors in two browsers,
  not 62 independent behaviors. Tests use disposable profiles, not Mac's storage.
- Checks exercise the actual canvas placement path, mirrored pairs, undo/redo,
  a deliberate no-op undo negative control, real weapon-radius changes, wheel
  zoom, casting data entering the renderer, roster/draft persistence, Fly,
  refresh/Continue, one editor and prior-pause preservation.
- Save/Fly/Close and canvas fit at 1366×768, 1024×600, 1920×1080 and 390×844.
  Firefox's additional map-only run passed both Close visibility/hit tests at
  1366×768 and 1024×600, plus its no-exceptions check (3/3).
- Three UI JavaScript files syntax-checked. Final runtime source hashes match
  the browser reports. Primary Firefox desktop/selected-part/narrow layouts
  were visually inspected. Real phone touch, physical Firefox performance and
  Mac's aesthetic verdict remain unverified.
- The first Chromium run expected one search result for 'siege'; two catalogue
  entries are legitimately siege-class mounts. The assertion was corrected to
  two. Search itself was unchanged, and the deliberate undo failure control is
  still caught. Final reports supersede that earlier 28/1 run.

Evidence: `shots/workshop/firefox/`, `shots/workshop/chromium/`,
`shots/workshop/map-firefox/`, and `shots/workshop/final-build.json`.

Repeat:

```
node scripts/witness-workshop.mjs firefox
node scripts/witness-workshop.mjs chromium
node scripts/witness-workshop.mjs firefox map
```

Review at 100% browser zoom (Ctrl+0), then hard refresh (Ctrl+Shift+R).
The latest app is served at `http://localhost:8811/`.

### Known limits, engine handoff and return

Steady 60 FPS remains open. The gameplay-camera scale, organic hull underlay,
asset classification, encounter density, gun behavior, simulation, balance and
procedural sector content were not changed in this batch. GP/socket overruns
are reported using the existing rules; the UI does not add a new admission policy.
The original data-only Designer and compatibility entry points remain loaded.

`OPUS_ENGINE_HANDOFF.md` records the current UI seams, fresh-baseline commands,
known engine metadata issue, accepted tests and one bounded engine objective.
It states the requested model and that no run was dispatched. The engine pass
should preserve this UI and avoid hiding FPS problems by changing counters or
removing the visible capital from its workload.

Backup: `/home/guestpc/.local/state/bubble-tanks-forge/ui-editor-20261023-161445/`,
24 files with SHA256 manifest. The narrow runtime rollback is to copy its
`index.html` back over this project's `index.html` and hard refresh. The new
presentation files then become inactive; the previous engine fixes remain.
Do not restore the whole project over later engine work or delete artifacts.

## 12. Receipt: Opus 5.5 engine pass (2026-10-23, Sol)

**Outcome: no engine change retained. Target still unmet.** Source of `js/` is byte-identical to the pre-pass backup
`/home/guestpc/.local/state/bubble-tanks-forge/opus-engine-20261023-175936/` (the reverted experiment is kept there as `shaders.js.opus-experiment-reverted`).

**Fresh baseline, headless Firefox 1366x768, `witness-phase-one opus-before`: 36/36 pass.**
Frozen raster mean 11.1 / p95 15 ms (meets <16.7). Live combat render mean 18.6 / p95 26 ms; frame interval mean 20.7 / p95 29 ms (~48 fps). Update 0.4 ms. The live gap is render, not simulation.

**Attribution (`scripts/attrib-render-passes.mjs`, live fight, one pass switched off, ~120 frames each):**
all ship drawing OFF 8.2 ms (from 17.5-20.0), underlay OFF 11.7, enemies OFF 13.1, sprites OFF 15.0; every other pass within the ~2-3 ms run-to-run noise.
MEASURED: ships are the bulk of render. UNVERIFIED: the split inside them; baselines in the same run wander 17.5-20 ms.

**Intervention tried and reverted:** batch each ship's connector spars into one stroke and bake pod/core disc+outline into one screen-resolution bitmap (one drawImage per pod). After: render mean 19.8 / p95 30, attrib baseline 17-19: neutral within noise, 0.85% pixels changed. 36/36 phase-one and 31/31 workshop still passed. Reverted: no gain, visible change.

**Two hypotheses falsified (MEASURED, micro-benchmark, same browsers):**
1. Per-node stroke count is not the cost: the underlay issues ~25 paths / 23 drawImage / 14 strokes per frame in total.
2. Op-type switching is not the cost: 450 ops interleaved vs grouped = 4.7 vs 4.1 ms in Firefox; per op ~10 us (drawImage 33px) to ~20 us (arc stroke). No leaked shadowBlur/filter/composite state at underlay ops.

**Next measured bottleneck (for the next seat):** the ops counted cannot account for the ship cost, so the time is not in op count. Instrument with a precise clock (Firefox `performance.now` is 1 ms-quantised here) by timing N repeated calls of `drawOrganismMembrane` for one ship in isolation, then split `sprites.draw` (the per-part art layer, `scaled()` resampling) from `original()`. Run each condition 3x and take medians before choosing any change. Headless Firefox is not Mac's Firefox; his on-screen FPS remains the witness.
