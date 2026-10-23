# Opus 5.5 — engine handoff

Mac's request: finish the UI and ship editor, then let Opus 5.5 work on the engine.
Game direction and authorship belong to Mackenzie Conor James Clark.

**UI batch status:** implemented locally and witnessed. **Engine handoff status:**
ready; no Opus/provider implementation run was launched during the UI batch.
Requested model is Opus 5.5. Do not silently substitute another model or claim
provider/model identity before a run reports it.

## Workspace and preservation

Use `/home/guestpc/-0-OPENCODE-ROOTFOLDER/bubble-tanks-forge/`, served at
`http://127.0.0.1:8811/`. The old Desktop path in historical documents is absent.
Read `AGENTS.md`, `GAME_VISION.md` and the latest receipts in
`PLAN_FPS_AND_FUN_2026-10-23.md`. Preserve Mac's fixed-zoom sense of scale;
editor auto-fit is separate from the combat camera.

There is no committed project history; the enclosing Git repository has unrelated
untracked projects. Back up exact files before edits. Do not stage, commit, push,
publish, delete art, modify sibling projects or edit seat constitutions.
No dependency installation, bundler, framework migration or new ship file format.

## One bounded engine objective

Stabilize desktop Firefox frame pacing toward sustained 60 FPS during a visible
26-node capital / 24-enemy fight. Preserve real-time movement, weapon timing,
spring motion, collision, saves and the new workshop. Diagnose the largest
remaining cost before selecting a rendering or simulation intervention.

Mac's supplied 16:06:34 screenshot shows the FPS counter at 22 in the home sector.
That is one displayed value, not a sustained benchmark. His starter ship also
reads very small in that image. Check the actual camera/scale state before any
change; do not equate editor zoom with combat-camera tuning.

The previous engine batch established a 60 Hz simulation accumulator, bounded
catch-up, hidden-tab reset, pause guards, a half-resolution fog mask, opaque HUD
panels and bounded resampled texture/gradient caches. It did **not** reach the
60 FPS target. Its headless timings are historical; the UI has since changed,
so start from a fresh baseline of the current app.

Likely files: `js/engine.js`, `js/shaders.js`, `js/sprites.js`, `js/ai.js`,
`js/particles.js`, and profiling scripts where instrumentation needs correction.
Read `js/hardpoints.js`, `js/feel.js`, `js/weapons.js`, `js/map.js` and
`js/sectors.js` for the contracts they depend on. Expand scope only when a
measured cause requires it, and state the change in direction first.

## Interfaces the engine must preserve

- The canonical hull is still `{ id, frame, mark, scale, color, primaryWeapon,
  secAbility, nodes: [{ dx, dy, radius, type, art? }] }`. The exporter, roster,
  draft, preview and engine must agree. No parallel serialized format.
- `engine.applyDesign`, `engine.player.nodes`, `targetDx/targetDy`, the engine's
  existing HUD element IDs, `fluidShader.drawOrganismMembrane`, `fleet.equips`,
  `fleet.mountBand` and the sprite manifest remain active UI seams.
- The new UI owns `js/shipyard-ui.js`, `js/interface.js`, `css/workshop.css` and
  their load order in `index.html`. Keep those files unchanged for this engine
  pass. They reuse the original Shipyard operations; there is one editor.
- The editor's `Fly this ship` uses `engine.applyDesign`, then the existing
  `bay._restoreArt()` seam because `applyDesign` currently drops `node.art`
  while constructing `SpringNode`s. Continue also restores art in the UI layer.
  A canonical engine fix may forward that metadata directly; preserve the
  observed refresh/Continue behavior and avoid a new storage format.
- B/Y/Tab and the visible Shipyard button reach the same workshop. The old
  fitting-bay UI is bypassed; its appearance-restoration helper is still used.
- Debug readouts are grouped under F1. Do not repopulate the battlefield with
  permanent diagnostics or hide a performance failure by changing the FPS counter.
- Mount radius still selects weapon class. Cosmetic casting is separate.
  Existing GP/socket overruns are displayed, not newly enforced by this UI pass.
  Any change in fitting admission or balance is a separate product decision.

## Measurement and acceptance

Run one heavy process at a time. Use isolated browser profiles, not Mac's profile.

```
node scripts/witness-phase-one.mjs opus-before firefox
node scripts/witness-phase-one.mjs opus-after firefox
node scripts/witness-workshop.mjs firefox
```

`witness-phase-one` asserts the capital actually reaches the renderer with 25
painted parts. Its earlier invulnerability fixture hid the capital and was fixed.
Never optimize a workload by dropping that ship, enemies or collision updates.
Frame intervals and forced-readback raster timings are separate measurements.
Report mean/p95 and sample counts, plus errors and simulation ticks.

The retained UI passed 31/31 assertions in Firefox and Chromium; its undo check
rejects a deliberately inert implementation inside the isolated page. Firefox's
map-close witness additionally passed at 1366×768 and 1024×600:

```
node scripts/witness-workshop.mjs firefox map
```

Keep the timing witness's 30/60/144 Hz movement, cooldown, reactor and projectile
invariants, pause/visibility behavior and cache bounds. The phase-one performance
goal remains raster p95 <16.7 ms and actual steady 60 FPS; a green functional
suite is not a performance pass, and headless results are not Mac's own browser.

`scripts/profile-fps.mjs` predates the fixed-step repair. Its timer begins at the
last update within a frame, so it can omit earlier catch-up work. Correct that
instrumentation if using it for total-frame attribution. Do not weaken workload
or acceptance checks to obtain a green result.

A membrane-paint tile experiment was removed because it was slower in Firefox.
Do not assume whole-ship caching helps without a matched measurement; preserve
live spring motion, rotating turrets, recoil and damage changes. Rotation should
transform a reusable local bitmap, not regenerate it for each heading.

Stop this batch at one measured engine intervention and its receipt. If the
target remains unmet, report it with the next measured bottleneck. A rewrite,
combat rebalance, new economy or procedural-world expansion is a new direction.

## Evidence and return path

- UI: `shots/workshop/firefox/report.json`, `shots/workshop/chromium/report.json`.
- Desktop previews: `shots/workshop/firefox/selected-part.png` and
  `shots/workshop/firefox/flight.png`.
- UI backup: `/home/guestpc/.local/state/bubble-tanks-forge/ui-editor-20261023-161445/`.
- Phase-one source hashes and historical timings:
  `shots/performance-phase-one/final-build.json` and the plan's section 10.
- UI receipt/source hashes: `shots/workshop/final-build.json` and plan section 11.

Leave the existing server available for Mac. Update this app's `CHANGELOG.md`
and append the exact changed files, before/after measurements, test counts,
remaining gaps and rollback to the existing plan. Mac's physical FPS and taste
verdict remain pending; no phone-readiness or fun claim is established here.
