# Shipbuilding handoff — 25 October 2026

For Aetheron / Antigravity, at Mac's request. Product direction and taste remain
Mac / Lycheetah's. Read this and inspect Git before changing anything.

## State and boundary

The canonical checkout is the Game Hall's `black-current/` directory. The former
forge path is a compatibility link, not another working copy.

Everything described below is **local and uncommitted** on main, based on
`12c572d`. Public remains **2.7.0, cache token 20261025s15**, Pages `d5104c5`.
Local source and rebuilt standalone use `20261025s17`. Package version has not
been advanced. Mac asked to wrap this session and hand over; do not interpret
the focused checks as release qualification. Preserve all dirty work, including
untracked source/assets. `node_modules` is an untracked dependency symlink.

## Implemented local slice

- `js/shipyard-placement.js`: Mirror off by default, one placement per selection,
  explicit single-copy Duplicate, precise touch movement and Undo.
- `js/modular-ships.js`: frigate/cruiser hull definitions, connected structural
  grid, typed single-module sockets, power/slot limits and authoritative compiler.
  `design.modular = {v:1, hull, sections, fittings}` owns the structure; `nodes`
  is derived. Preserve `weapon` and `mk`. Custom structural nodes use type `hull`;
  armour plates use ordinary pods and add 35 base HP.
- `js/modular-yard.js` and `css/modular-yard.css`: tap connectors/slots, compatible
  equipment cards, individual rotation/removal, Undo/Redo, save versus station
  application, visible wallet/HP/shield/GP/module/power numbers and costs.
- New hardware is paid once and retained as reusable stock in
  `saveState.doc.modularHangar = {v:1, rank, owned}`. Starter stock is supplied.
  Moving/reapplying owned fittings is free. Shipwright training costs
  600 / 2,400 / 9,600 metal with mass gates 150 / 500 / 1,400.
  Cruiser fabrication costs 1,800 and requires 500 mass plus rank 1.
  Spending saves before runtime application; failed saves roll back.
- Opening the old yard now defaults to the actual flying design. New/loaded
  blueprints are explicitly labelled. Old drafts are preserved in
  `workshop.blueprintDraft`; pre-modular ships are archived in `modularLegacy`.
  Legacy ships are not automatically converted or billed.
- `js/reactor-training.js`: three reactor branches start at 5%, add five percentage
  points per purchased rank, cap at five ranks; one point earned per level after
  level one. Existing drain/recharge rules remain. This is not a full skill tree.
- `js/hubs.js`: public refit docks at the centre of visited non-hub systems,
  docking radius 320 (haven 380), public stations excluded from player limits,
  raid targets, demolition and owned respawn selection. Existing ordinary owned
  stations retain their renderer.
- `js/travel.js`: chart route planning through existing galaxy links, next-gate
  bearings, local station guidance and explicit assisted approach/docking.
  Approach stops on manual movement and pauses with the game; no teleporting.
- `js/view-controls.js`: desktop zoom/fullscreen delegates to existing controls;
  original phone controls remain. Help in `js/menu.js` explains travel and fitting.
- Legacy spikes are labelled defensive plating with no ram bonus in
  `js/workshop-catalog.js`; offensive impact armour is still a proposal.

The existing 21 weapons supply the workbench. New family labels include
**electro-kinetic**. No magic damage/resistance system, new capital ladder or new
boss AI was added. The six reserved gun/engine sources remain identical to HEAD:
`engine.js`, `hardpoints.js`, `shipyard-ui.js`, `weapons.js`, `fleet.js`,
`progression.js`. Coordinate Sol's gun-mark work before editing them.

## Art and rendering

`art/keyed/structures/refit-station-v1.png` is installed in world rendering and
the standalone. It is a 1254-square RGBA overhead asset, authored centre anchor,
drawn at 420 world units. Its outer tips touch canvas edges; further art polish
may need margin. It was witnessed in an actual world frame.

`art/concepts/asterion-components-v1.png` and `hostile-fleet-v1.png` are reference
sheets only, not installed equipment/enemies. `docs/ART_DIRECTION.md` gives the
production contracts: separate true-overhead assets, real alpha, measured pivots,
phone-readable silhouettes and detachable fittings. Do not install a whole
concept sheet as a turret. Existing engine art now uses valid module 089.

`js/render-budget.js` caches atmosphere cadence and lighting, and uses a compact
non-ultra hull pass while preserving modular/styled player rendering. Simulation,
input and collision cadence are unchanged. `renderBudget.enabled` allows A/B
measurement. This remains a performance intervention requiring broader review.

## Evidence and gaps

`scripts/witness-modular-ships.mjs`: **59 passed, 0 failed, no application
exceptions**. Local report: `shots/modular-ships/report.json`, including source
SHA256 values. Covers model rejection cases, real purchases and planted save
failures, paid training, active/draft identity, save/Continue, 1366/390/844px
layouts, standalone boot, actual station sprite draw, routing/approach/docking,
zoom and fullscreen request delegation. Actual device fullscreen is not tested.
Construction and station screenshots were inspected. Landscape flight still
looks busy when the route card, tutorial and event prompts overlap.

Earlier placement-only workshop checks passed 44/44 before this larger integration;
that count is historical, not a second qualification of the latest tree. The old
workshop fixtures now explicitly choose New ship before expecting a blank draft.

`shots/performance-sprint/comparison.json`: isolated Firefox, medium, 1366×768,
26 player nodes and 24 enemies. Original 12.8 FPS (28 samples), budgeted 27.2 FPS
(60 samples), original repeat 13.9 FPS (30 samples). Median frame times
78 / 35 / 72 ms; p95 110 / 55 / 93 ms. No application errors. Short samples,
not sustained combat or a real-device guarantee. **FPS is not solved.**
An earlier profiling helper could silently fall back to a starter ship; this
comparison explicitly restored and asserted all 26 nodes. The file named
`baseline.json` was overwritten during investigation; use `comparison.json`.

Release blockers / unverified items:

- Full npm release witnesses and commit-first phone-layout checks have not run.
- Harden imported modular IDs to require own dictionary keys (hull/section/gear);
  current truthy lookups can encounter inherited names such as `__proto__`.
  Add malformed-ID checks and finite quote validation before release.
- Mac's actual old save, phone feel, sustained FPS and audio remain unwitnessed.
- Income/loot remain too generous by Mac's verdict. Added spending is not proof
  of balance; measure a fresh and rich captain through the first three sectors.
- Full skill trees, AI augment clarity, faction build paths, destroyer through
  titan hulls, capital enemies/bosses, magic/super weapons and ability unlocks
  remain queued. Capital hardware target is at least 99,000 for Mk I; the two
  current structural hulls cannot fit capital gear.
- Aggregate weapon audio by battery/family; avoid a sound per child projectile.
- Minimap/service clarity and capital construction yards need further design.
- Optional roguelite expeditions/prestige were discussed, not implemented.
  Never reset the current campaign to simulate progression balance.

## Next seat and release sequence

Inspect this dirty checkout and preserve its work. Close the import validation
gap, then review performance and phone layout before expanding content. Run the
focused witness against the exact candidate after any code changes:

```sh
PULSE_SERVER=unix:/nonexistent GAME_URL=http://127.0.0.1:8811/ node scripts/witness-modular-ships.mjs
```

Serve from the checkout for that URL. If serving from the parent Game Hall,
append `/black-current/` to GAME_URL. One heavy browser process at a time.
Rebuild standalone with `python3 scripts/build-single.py` after source changes.

On Mac's release instruction: stage exact files, run appropriate release
witnesses, commit, then run the phone witness that hashes app sources against
HEAD. Use the publish skill's pending-diff secret scan before pushing this public
repo. Actions billing is blocked; follow the manual Pages runbook in
`docs/HANDOFF_2026-10-24_BATON.md`, then verify public hashes/cache token and the
download independently. A local pass does not establish public deployment.


## Release preparation addendum

Mac subsequently requested push and publication. The 2.8.0 candidate uses
`20261025s18` and updated in-game release notes. Imported hull/section/gear
identifiers now require own string keys, and quotes require non-negative safe
integer costs. The focused witness includes inherited-key and planted NaN-cost
rejections. Earlier uncommitted-state and validation-gap entries above describe
the handoff moment; consult Git and the changelog for final release state.
