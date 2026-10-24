# Changelog




## 2.6.0 — the armoury (2026-10-24)

- **Every gun picks its own weapon.** Mount size still sets the class; select a gun in the shipyard and use **Weapon on this gun**. 13 weapons in all. Seven are new:
  - Needle Stream
  - Flak Burst
  - Tidewave Emitter (weaves, pierces 3)
  - Tidal Boomerang (out and back, hits going and coming)
  - Deep Torpedo (launches slow, then accelerates)
  - Leviathan Lance (pierces 8)
  - Cluster Bomb (bursts into 8 shards)

  The Tri-Spread Mortar, which no mount could fire before, is now a medium-gun choice.
- **Guns pivot a full 360°.** A rear gun used to be locked into a cone facing backwards, so it never fired at anything ahead of you. Big guns still swing slower than small ones, but no gun takes more than about 1.5 s to come round.
- Within a class the weapons trade **role**, not raw power. Single-target damage stays close; the choice is how it hits.

## 2.5.1 — the old ship lets go (2026-10-24)

- Old saves are checked before they load. Broken parts are removed, fittings that no longer exist go back to being plain parts, and a bad colour or dead weapon is reset. A banner tells you what was repaired instead of the ship glitching out.
- If a saved ship can't be rebuilt at all, you fly your starter hull and your fittings wait in the hold.
- Settings has a new **Reset ship to starter** button (tap twice). Mounted fittings go back to your hold; mass and progress stay. It also clears the old pre-v2 ship key, so the old ship can't come back from storage.

## 2.5.0 — living water (2026-10-24)

- Every place has its own water now (`js/atmosphere.js`): a surface wash in the place's colour, light shafts falling from above, bioluminescent plankton that drifts and pulses, and embers raining under the Foundry sky. Black Sun water gets no shafts. It really is dark down there.
- An ambient bed plays under the music: a brown-noise swell tuned per place (rushing in a Riptide, low in the Black Current, a hum under the Black Sun), distant calls from things too big to see, and crackle in the Foundry. The Music slider and Mute control all of it.
- A hull under 30% pulses the screen edge red, in time with the heartbeat you already hear.
- Settings → Graphics has a new **Living water** switch. Low turns it off; Medium, High and Ultra keep it on. Reduced motion freezes the water.

## 2.4.0 — the arsenal gets its faces (2026-10-24)

- Every one of the 32 exotic fittings now has its own emblem: a coloured ring and glyph drawn on the part in flight and in the Shipyard, on its card in the hold and the dock, and on its shots (cryo crystals, plasma flame trails, needle streaks, void vortices, blinking armed cluster mines, a spinning reaper blade).
- Each quirk cannon has its own voice layered over the shot; nova, cluster, flak, arc, cryo, plasma, reaper and leech hits have their own impact sound.
- New `js/quirk-art.js` is pure presentation: no stats change. `witness-night-sprint` checks every emblem renders, the art palette matches every shot colour in `quirks.SHOT`, hull and shot art draw, and every quirk cannon has a voice.

## 2.3.0 — the arsenal wave (2026-10-24)

- 19 new exotic fittings (catalog 26 -> 64 blueprints), each with real mechanics and a named cost.
- Weapons: Cryo (slow), Plasma (burn), Flak (shards), Nova (blast), Arc (chain lightning), Needle (fast, small),
  Hydra (three-shot fan), Void (pulls hulls), Leech (lifesteal), Cluster (mines), Reaper (execute), Splitter (side shards).
- Systems: Reactive armour, Living plating, Phase veil, Comet drive (ram), Venom ram, Tithe siphon, Sanctuary mender.
- Phone: ship systems (DRIVE / GUARD / GUNS / CHARGE) are real buttons on the left; before, phones could not switch reactor modes at all.
- Phone: hull and guns turn 2.5x faster while the aim stick is held (a 180 flick no longer takes 1.5 s). Desktop unchanged.
- Every weapon has its own shot colour so it reads in a fight; blasts and arcs draw their own rings and lightning.

## 2.2.0 — new fittings, graphics settings, slower economy (2026-10-24)

- Frame limit under Settings → Graphics (Off / 30 / 60 / 120 fps); lower saves battery and heat on phones.

Seven new recovered fittings (fourteen blueprints), each with a stated cost: Seeker and
Lance cannons, Mirror shield, Thorn ram, Grave mender, Salvage magnet plating and the Ion
wake drive. Settings now has a Graphics section: Low / Medium / High / Ultra presets,
a particle cap, seven layer switches and an FPS counter. Selling spare parts is cut to
roughly a third (a headless bot measured spares paying 4-6x the metal of kills), and the
evolution ladder is stretched with two new tiers, Titan and Sovereign. Fixed: entering
fullscreen on a phone could hide the Exit button. Balance and feel are for Mac's playtest.

## Unreleased — mobile controls and recovered equipment (2026-10-24)

Shrank the phone status strip; added fullscreen, saved camera zoom and fixed movement
and aim/fire sticks. Reworked the phone Shipyard into Parts / Ship / Details views
with a Mount action and visible fitting errors. Fly and fleet switching now enforce
GP, socket and recovered-blueprint limits; restoring an existing save remains supported.
GP capacity grows at 28% of collected mass; metal kill payouts are lower and shop prices
are higher, with purchase-time balance checks. Evolution thresholds are unchanged.

Added a pictured salvage hold, shaped pickup markers and twelve unusual fitting
blueprints across six quirks: ricochet, scatter, chain siphon, overclock drive,
salvager drones and anchor plating. Elites/outposts/bosses can drop unusual fittings;
docks rotate pictured offers. Added procedural compression/reverb, bounded weapon and
impact voices, pickup chimes, a low-hull heartbeat and a Black Sun music bed. Added
three saved vows with explicit tradeoffs and short seeded distress/wreck/convoy/Black
Sun recovery encounters, sonar-lit landmarks and recoverable hulls in the hold.

The standalone HTML is rebuilt. Syntax and publication scans are checked separately
from the focused browser report; physical phone playability, pacing and balance remain
for Mac's playtest. No claim of a completed full gameplay or performance suite.

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
