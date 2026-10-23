# Changelog

## Unreleased — 2026-10-23

Game direction and authorship: Mackenzie Conor James Clark.


### Flight UI and Shipyard

- Replaced scattered flight diagnostics with one F1 panel and a compact HUD.
- Added a pictured parts library, search/categories, a larger ship preview,
  selected-part inspector, weapon-class controls and casting choices.
- Save/Fly/Close stay visible; catalogue and inspector scroll independently.
  Ship names generate roster IDs. Import/export is tucked under its own section.
- Added undo/redo, reversible New ship, Ctrl+S, clear mirror/grid controls and
  wheel zoom. B, Y, Tab and the visible button reach one workshop.
- Preserved per-part artwork through preview, save, Fly and refresh/Continue,
  using the existing ship format and appearance-restoration helper.
- Witnessed 31/31 UI checks in each of Firefox and Chromium. Four viewport
  sizes fit; Firefox map Close visibility/hit checks passed at two desktop sizes.
  Physical-device touch and Mac's taste verdict remain pending.

Opus 5.5 engine pass ran 2026-10-23: one intervention measured neutral and reverted; engine source unchanged. Receipt and next bottleneck: plan section 12.
[handoff brief](OPUS_ENGINE_HANDOFF.md) is prepared; no provider run was launched.
The UI rollback, screenshots and receipts are in the plan's section 11.

### Timing and rendering foundation

- Combat now advances at a fixed 60 simulation ticks per second, independently
  of render rate. Long stalls have bounded catch-up; background tabs resume
  without replaying the time away.
- Pausing freezes combat and lets the battlefield render idle. Abilities cannot
  activate through paused menus. The FPS counter measures rendered frames.
- Reduced fog-mask resolution and removed the full-screen multiply blend.
  Combat HUD panels use opaque dark backgrounds instead of backdrop blur.
- Bounded resampled sprite canvases to 192 entries / 16 MiB and gradient discs
  to 64 entries. Source images and total browser memory are separate.
- Added a reproducible browser timing/performance witness. The retained build
  passed 36/36 functional checks in Chromium and Firefox, and its Chromium
  desktop render was inspected. The original defects fail the same clock checks.

**Performance remains open:** the 26-node / 24-enemy headless stress scenario
still misses steady 60 FPS. Mac's own Firefox and phone results are pending.
Shipyard/HUD work is present locally; procedural encounter work remains queued.
Local changes only; no commit, release, deployment or publication.

Measurements, source hashes, screenshots, backup and repeat instructions:
[phase-one receipt](PLAN_FPS_AND_FUN_2026-10-23.md#10-receipt--phase-one-timing-and-rendering-repairs-2026-10-23).
