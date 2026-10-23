# Changelog




## Unreleased — phone screen layout (2026-10-23)

Added a compact phone status panel, six labelled 48px thumb actions, a toggleable
contracts drawer and safe-area spacing. Title, pause, settings, chart, docking and
construction panels now fit portrait and short landscape screens with scrollable
content and reachable back/close actions. Desktop resources return to their original
position when the screen grows. Rebuilt the standalone HTML with the same layout.

Validation: 106 focused Firefox checks passed across four phone viewports, including
native taps, drawer hit testing, a planted off-screen-control defect, desktop restoration
and the standalone download. All 31 existing game scripts remain byte-identical. Physical
phone usability and performance still need a device playtest. No combat or fitting rules changed.

## Unreleased — Opus forge import (2026-10-23)

Imported the supplied forge source at b570578 and its matching standalone HTML. The
update adds title/pause/settings menus, a gentler start, a seeded 96-system galaxy,
jump routes and system rules, plated hull rendering, docking/metal/markets/construction,
raids and drone/siphon/escort/repair roles. The cleaned public README, landing page and
local-note exclusions are retained. The internal forge tracker remains local.

Upload verification: the supplied HTML matches the bundled standalone file byte-for-byte;
all 18 changed game entry/style/script/build files match the imported source. All 31 game
JavaScript files passed syntax checks. The existing Firefox page/package check passed
22/22, including game launch and the pictured Shipyard. This upload did not rerun the
full gameplay suite or establish physical-phone usability, performance or balance.

## Unreleased — public game page and repository cleanup (2026-10-23)

Added a public landing page with direct Play and standalone-download links. Site packaging
copies the current playable source and keyed artwork without changing the game entry,
engine or editor. GitHub Pages deploys the packaged artifact from main. Replaced the long
internal README with player-facing instructions and a short development guide. Added
100 proposed atmosphere and feature ideas, clearly separated from implemented content.

Removed 44 internal notes, archived handoffs and inactive files from the current public
Git tree. Their local files and history are preserved. Added ignore rules for local notes,
site output and private configuration. All game source, assets and standalone HTML remain
byte-identical to the pre-cleanup commit.

Validation: 22/22 Firefox checks passed, including three page widths, current-source and
snapshot hashes, working links, real game launch and pictured Shipyard open/close. This
is a page/package witness, not new gameplay, FPS, phone or content qualification.

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
