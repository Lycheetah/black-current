# Changelog

## 2.11.0-rc.7 — Weapon access hotfix (2026-10-27)

A future Titan blueprint no longer labels ordinary guns with the Titan’s
20,000-biomass unlock. Equipment rows use that item’s copy price, research,
compatible mount, power and module capacity; the separate frame banner keeps
its real unlock requirements. **Fit flying ship** returns directly to the
active hull while preserving the future blueprint. New frames still require
their unlock and fabrication price. Already-owned frames remain usable after
biomass loss, so death cannot lock every subsequent weapon refit.

23/23 focused Firefox touch checks passed, including a real six-metal rookie
gun purchase at zero biomass, locked new Titan fabrication, owned-Titan refit,
all six main menu buttons, Settings, station services and fitting panes. Phone
screenshots inspected. Actual-device menu failures remain unverified until
Mac identifies the affected menus/device. Full regression remains incomplete.
Published: source `e59b752`, Pages `320c7ab`, cache20261027s61.
All7 changed public files match; Desktop HTML updated.

## 2.11.0-rc.6 — Solar Wake reliability (2026-10-27)

Near a reachable station, **Dock & apply** now enables for an otherwise valid,
affordable blueprint. The handler still docks before applying; direct field
fabrication remains blocked. The prior UI incorrectly disabled this action
using the open-space restriction before its docking step could run.

Confirmed new campaigns now stop the old launch stack before reload, so the
old galaxy cannot write its civilisation home or location into the fresh save.
SWARM brood actors are preserved when applying the existing encounter cap;
faction patrol composition leaves those authored motes intact. The limit
remains12 actors. Civilisation cards also retain a readable minimum width.

The regression pass reproduced that failure twice before the fix. The fitting
witness also now expects the current cruiser costs: 600 metal frame plus 120
metal training, with 500 biomass and Shipwright rank1 required. Post-fix checks passed: opening37/37, fitting34/34, novice fleet62/62 and
civilisation/new-campaign17/17. The broad regression was interrupted during
the fourth command; it has no complete green verdict. Remaining legacy
checks, real-phone performance and balance remain pending. Cache20261027s60.
Published to Pages: source `311ad07`, Pages `4c301fe`; all11 changed public
files match the package, including the standalone HTML. Receipt:
`shots/release-candidate/publication-rc6.json`. Desktop trailer kit updated.

## 2.11.0-rc.5 — Solar Wake refinement (local candidate, 2026-10-27)

**Published to GitHub Pages.** Source `56893b2`, Pages `1af67ed`; cache `20261027s59`. Phone flight help detects coarse input
before the first canvas touch, waits for the starter workshop and other
overlays, and has a 44px dismiss control away from the flight actions.

The equipment shop defaults to ordinary/researched items, including things
you cannot afford yet. An information button opens pictured base stats,
compatible-slot details, physical-copy counts and the full fabrication bill.
Previewing stays free; Apply retains the native purchase/save checks. Global
shopping checks the actual compatible section. Selecting the already-fitted
gun preserves its mark and facing. Modular help uses module/power language.

The journal has separate Main job, Faction jobs, Milestones and Contracts
views. Main-job route buttons use real gates and sector guidance. The first
recovery reward description now matches its physical gun/support choice.
Starting ordinary technology no longer qualifies for the research milestone.
Choosing a premade after starting a custom first ship now replaces the editor’s
bare-core draft with the ship actually launched.

**19/19 focused Firefox checks** passed; phone, landscape and desktop screenshots
were inspected. Closing evidence is in `shots/refinement/report.json`. Mac ended
the sprint before the planned full regression pass. Full regression, actual
phone performance and the release decision remain pending. This build is
published. Package/offline checks passed **23/23**; all **52 changed public
files** matched the reviewed package after Pages reported the matching commit
as built. Receipt: `shots/release-candidate/publication.json`. The matching full
HTML and capture guide were also delivered to Mac’s Desktop trailer kit.

## 2.11.0-rc.4 — Solar Wake (local candidate, 2026-10-27)

**Unpublished.** Cache `20261027s58`. The existing Solar Dreadnought encounter
has a generated orbital-ring environment, connected modular capital body,
visible batteries and an arrival pulse. Native 1800 HP, 300 shield, three
attack phases and the Flare Crown relic path remain. The new scenery is a
distant parallax plate; sector collision boundaries remain native.

Pause → **Guardian encounter & capture** plots a real gate/sector route to
Asterion Forge −3,3, starts a free rehearsal, or hides the interface with H.
Rehearsal parks the original save document by reference and uses a temporary
copy with no persistent writes. Kills, deaths, salvage, docking, side activities
and roaming patrols cannot award campaign progress in the rehearsal. Exit
restores save identity, storage, original actors, biomass and camera. Phones
retain a 44px HUD-return control; the boss bar clears reactor controls.

**22/22 focused packaged/offline checks** passed after fixing fresh-pilot entry
without an initial editor visit. Controlled native attacks exercised phases
I/II/III with 84/126/156 live projectiles at the sampled frames. Damage tests
step through thresholds to account for existing damage multipliers. The real
campaign kill awarded its relic once and 1080 native metal; rehearsal awarded
neither. All six protected sources and generated package hashes passed.
Desktop/phone gameplay and capture screenshots were inspected.

The new masterplan and proposed private two-player room-code prototype are in
`docs/PLAN.md`; `docs/FORGE_ROADMAP.svg` and `.png` are generated views of that
same phase table. Co-op has no implementation or backend yet. The trailer
handoff is `docs/TRAILER_CAPTURE.md`; arena prompt/provenance is
`docs/ART_BOSS_ARENA.md` (built-in image_gen, original output preserved).

The current standalone embeds 168 images. The site candidate has 632 files,
excluding 128 unselected incoming keyed-art files. Full npm regression did not
run; actual phone FPS, touch and balance remain unverified. No commit, push or
publication occurred. The last verified public release remains 2.10.1.

## 2.11.0-rc.3 — Factions in the Current (local candidate, 2026-10-27)

Three shared fleet styles cover the fifteen existing civilisations: hunting
wings with split flankers, armoured breach patrols with covering fire, and
radiant lance screens with standoff tenders. Fresh ordinary sector actors and
three-ship patrols use their doctrine while respecting the old density caps.
Connected silhouettes differ by style. Names come from the existing canon.
Twelve selected incoming sprites add structural materials and normalised
turret pivots; their source files are unchanged. Other incoming art stays out.

The first three home rings, practice, named encounters, elites, boss sectors
and quest guard zero retain composition protection. Native tender brood
behaviour remains. Lock/ram warnings take priority over formation labels.
Phone warnings now sit below the reactor controls, or below an active route.

**29/29 focused faction/package/offline checks** passed: 300 civilisation,
class and role models; distinct silhouettes; native sector/patrol composition;
actual steering, firing and disarmed guns; all twelve sprites reached in real
rendering; protected actors; phone layout; cache bounds and package hashes.
Screenshots were inspected in normally lit systems. Full regression and
actual phone performance remain pending. See `docs/ART_FACTION_FLEETS.md`.

## 2.11.0-rc.2 — The Upgrade Path (local candidate, 2026-10-27)

**Unpublished.** Cache `20261027s56`. Station services now open **My progression**:
three pictured fitting choices and a compact next-frame bill, with separate
frame, remaining Shipwright training, biomass milestone and wallet shortfall.
Frames and Training stay one tap away. The frame action previews an upgrade
using the current flying ship’s connected layout and fittings; native Apply
still owns purchase, validation and save. Owned hardware is reused.

Ordinary novice weapons remain 4–16 metal. Light prices are 48–68, Medium
360–504, Heavy 2,200–3,080, Siege 9,800–13,720 and Capital 99,000–138,600.
The original mixed-price table let some Heavy/Siege weapons cost the same
150 metal as entry Light guns. Archetypes now have consistent size budgets.
First Shipwright training costs 120; the cruiser frame costs 600, with the
existing 500-biomass requirement. Later frame investments remain substantial.

Native ordinary tier 1/2/3 kills still pay 1/2/3 metal. Later bounties rise with
threat: tier 5 pays 12, tier 7 pays 36; elites pay three times ordinary, with
larger outpost/boss rewards. Bounties are bounded and paid once per dead enemy
object. Practice keeps its separate one-metal-per-ten reward and no loot.
Prices install without rewriting balances, ranks or owned equipment.

The packaged candidate passed **25/25 focused checks**: 140 native census kills,
six earned rookie metal buying a real six-metal gun, free reuse, training/frame
gates, forced-save rollback, preserved two-gun layout, reload with saved biomass,
practice exclusion, all six protected sources, 612 manifested file hashes and
an offline standalone launch. Desktop and phone screenshots were inspected.
The initial run stopped after 13 passes on an incorrect test panel selector;
the final run corrected it and strengthened the seeded biomass persistence check.
The generated package has 613 files and excludes 140 unselected keyed-art files;
the HTML embeds 155 images. Rc.1’s versioned standalone remains available.

Measurement and method: `docs/research/PROGRESSION_CENSUS_2026-10-27.md`.
Receipts: `shots/progression-path/report.json` and
`shots/release-candidate/package.json`. Full npm regression did not run;
actual phone feel and progression time remain unverified. No commit, push or
publication occurred in this batch.

## 2.11.0-rc.1 — The Quartermaster (local candidate, 2026-10-27)

**Unpublished candidate.** Cache token `20261027s55`. Consolidates the local
space, audio, Equipment Codex and faction-supply batches described below.
The last verified public release remains 2.10.1.

The candidate builder packages selected working-tree source and tracked assets,
including newly referenced JS/CSS, while excluding 140 unselected keyed-art
files. The result has 611 files; the generic, versioned and packaged standalone
HTML files are byte-identical and embed 155 images. The main menu identifies
the version on desktop and phone; Credits opens the updated in-game notes.

The focused artifact witness passed **23/23** after correcting a phone-hidden
version label (the first run passed 22/23). Coverage includes all package hashes,
deliberately bad hash/missing-script rejection, six protected-source hashes,
phone-width build-first launch, offline premade launch with networking blocked,
the real station Codex door and specials, and saved outer-system Continue.
Menu, Codex and flight screenshots were inspected. Receipt and report:
`shots/release-candidate/{package,report}.json`. Full npm regression did not run;
actual phone touch, audio taste, sustained FPS and balance remain unverified.
No commit, push or publication occurred in this consolidation batch.

Larger faction ships have tapered, filled shoulders rather than cross-shaped
extensions. The existing five roles retain their AI and weapon bays. Up to four
nearby contacts (three on a narrow screen) show hull class, role and numeric HP;
sniper locks and charging rams use explicit evade/sidestep labels. Labels avoid
the contract, event and route panels.

Routes show a bearing marker in space: the next cardinal sector exit, or the
actual station, gate or training landmark once in its sector. Radar and route
arrows share that bearing. The phone route card uses two compact rows with
44-pixel controls; its X also removes the space marker.

Unchanged modular hull artwork is cached, bounded to 24 entries and 16 MiB of
RGBA pixels. Lost sections, physical offsets, colour, livery, clip-ons, loaded
art and zoom resolution invalidate the image. Turrets and combat effects keep
their live drawing passes. Final desktop Firefox samples of the same frozen
capital encounter averaged 19.6 ms cached versus 37.6 ms uncached (30 renders
each, including raster readback). This is rendering cost, not gameplay FPS or
a real-phone result. Fifteen focused browser checks passed, twenty role/class
combinations compiled, and desktop/phone-sized screenshots were inspected.
Full npm regression did not run. Local candidate only; publication and phone
feel pending.

Weapon reports have filtered electro-kinetic, rail, beam, missile and ordnance
voices, with archetype-specific attack lengths and lower, longer capital
reports. The existing kinetic family keeps its saved identifier and is labelled
Electro-kinetic. Weapon cadence and damage are unchanged. Legacy hit pops now
use the shared short-voice limiter. Weapons use at most six voices; ordinary
effects leave two of the ten slots available for cues. Positional reports pan
in stereo, with distance attenuation independent of camera zoom.

Music sits at 78% of the chosen level while a weapon report is active and returns
afterwards, retaining menu ducking and the user's faders. Zero Master/Effects
prevents new managed voices. Low-hull heartbeat scheduling is covered in flight
and while paused. Fifteen focused audio checks passed: real battery routing,
offline stereo signals, family brightness and capital envelope differences,
200-call stress/cleanup, silent zero-volume renders and the native Effects
slider. Twelve local WAV samples and a listening page are under
`shots/audio-forge/`. The phone-sized settings screenshot was inspected.
Listening quality, real-phone audio and full regression remain unverified.

The Equipment Codex opens from Pause, the station service grid and the fitting
inspector. Its shared catalogue starts with 167 entries: 92 weapon models,
systems, hull sections, clip-ons and 32 recovered traits. Ordinary hardware
shows stats immediately. Recovered traits stay silhouetted until found; their
descriptions then show the canonical benefit and trade-off. Filters cover
category, family, size and collection. Desktop pages adapt to viewport height;
the 1214×800 witness shows nine full cards. Phones show up to six cards, then a
separate detail page with Back and Close. Opening it does not summon a phone
search keyboard.

Details include base hit/DPS/cadence, power, actual shield and support numbers,
compatible sections, minimum hull, price and acquisition route. Cosmetic
sensors explicitly add no combat stats. View in equipment shop opens the
existing filtered shop; native fitting, ownership, research and prices remain
authoritative. The station retains eight tiles, with legacy stock still in its
expandable section. No new currency or ordinary-weapon unlock requirement.

Collection metadata follows owned/applied/recovered equipment when the existing
campaign saves, including weapon marks. Browsing grants nothing. Failed saves
roll metadata back with the native transaction. Twenty-one focused Firefox
checks passed: a real six-metal purchase, refused-save rollback, trait recovery,
reload persistence, modal return paths, filters and phone layout. Screenshots
were inspected under `shots/equipment-codex/`. Full regression and actual phone
feel remain unverified. This batch is local and unpublished.

Faction quartermasters offer four commissions in the existing journal: rookie
patrol, outer-lane defence, prototype recovery from elites, and an outpost
requisition. One can be active at a time. Each shows its exact fitting before
acceptance and pays once per system, on return to that system's station.
Practice targets do not count. Progress and delivered rewards persist; claims
cannot repeat. Rewards enter the existing modular hold, without a new currency.

Outer-system stations share three limited specials per system. Canon faction
doctrine and system danger select the base hardware; existing recovery traits
supply a benefit and trade-off. Each offer sells one physical fitting. Items,
prices and remaining quantities persist; a saved 12-hour stock period prevents
menu reopening or clock reversal from rerolling an earlier period. Rookie
anchorage hardware remains in the ordinary catalogue. The old rerolling vendor
panels are hidden and their modular purchase route is retired.

Stock purchases and commission claims save wallet, hardware, stock, completion
and collection together, rolling back on failure while retaining the standing
field-contract objects. The native shop owns fitting and Apply. Continue now
keeps a valid saved system/sector instead of the civilisation wrapper forcing
every return home. The compact fitting inspector's Codex control is reachable.

Twenty-seven focused Firefox checks passed, covering actual hostile/practice
kills, progress/reward reloads, exact purchase cost, one-copy ownership, sold
stock, rotation, failed-save rollback, native fitting and the Continue location.
All three purchase buttons fit the 390×844 stock screen with 44px touch targets;
desktop/phone screenshots were inspected in `shots/quartermaster/`. Full
regression, actual phone play and economy/encounter balance remain unverified.
The master sequence is in `docs/PLAN.md`. No commit, push or publication yet.

## 2.10.1 — rookie waters and first fitting (2026-10-26)

The gold starter button adds and fits gun one, gun two and the engine before
it offers Launch. Manual construction remains available. Refused/deferred
campaign launches cannot reopen an unfinished workshop; returning-save premade
and build-first entry paths have native browser coverage.

Home rings one and two are danger one with at most four initial enemies; ring
three is danger two with at most six. Home learning enemies have lower HP,
slower movement/firing and weaker shots. Extra patrol waves are suppressed in
those rings; authored bosses retain their exceptions. Other sectors cap their
initial population at twelve. Existing scout, pursuer, charger, artillery and
carrier roles have different layouts; outer cruiser/battleship/capital hulls
have larger physical footprints. Contact scouts/chargers no longer display
unused guns. Existing AI roles remain the behaviour source.

Every local sector grid gains three rings: original 3/5/7-wide system grids
become 9/11/13 wide, and Asterion becomes 13 wide. System IDs, coordinates,
existing gates and authored boss locations remain stable. The phone chart
scrolls within its panel; event banners do not cover its controls.

The six base weapon-DPS budgets are 50 / 110 / 200 / 400 / 700 / 1300.
Every ordinary Light archetype has more base DPS than its novice counterpart;
role, range, cadence, fitting and secondary effects still matter. Ordinary
novice prices stay 4–16 metal. Inspector comparisons include base DPS.

Loose-part chance is 6% in danger one and 4% beyond it, versus the previous
100%/25%. Elite special-fitting chance is 12%, versus 30%. Ordinary surviving-
part kill drops pass an additional 15% gate; the existing 35% roll therefore
becomes 5.25% for that route. Boss equipment and promised quest rewards retain
their guarantees. Metal/biomass payout values are unchanged.

Muted Firefox: **9/9 first-fit checks** and **12/12 balance/chart checks**.
The final controlled three-gun second-ring fight cleared four enemies in
4.28 simulated seconds without death. One seeded sample produced 10 normal
hardware drops / 100 kills, 27 total hardware drops / 100 elites, and equipment
from all four bosses. These samples cover kill drops, not an overall live drop
rate. Phone/chart/fitting and the seeded enemy scene were inspected. Full npm
regression and sustained/real-phone FPS remain unverified. Cache: `20261026s54`.

## 2.10.0 — build, fight, refit (2026-10-26)

Build my ship is the primary new-pilot action. It opens a core-only modular
workshop with a supplied kit; Quick launch premade remains available. Both
paths supply two guns. Starter frigates allow at most four weapons, including
silos, with two supplied. Ten hull sections, six base module slots and twelve
reactor power allow early customisation. Larger frames scale to 18 / 30 / 48 /
72 / 96 sections. Four spare spines are supplied for shaping. Basic hull sections
cost 8–30 metal; engines 18, shields 24 and repair modules 40.
Unfinished first builds resume through Continue. Existing one-gun novice saves
receive the missing second-gun/deck kit once without replacing the flying ship,
resetting progress or granting money.

Fifteen ordinary novice weapons now cost **4–16 metal**, retaining their existing
cadences and damage. This restores affordable early choices without raising
income. Ordinary weapons require one hardware purchase, without a separate research
payment. Capital and special discoveries retain research. Ready-to-fit hardware
comes first, with other requirements behind a compact disclosure. Modular fits
use physical mounts, module count and reactor power; legacy GP and fire-control
research no longer impose a second set of fitting or damage limits.

Owned guns/modules/add-ons can be swapped away from stations. New fabrication,
hull rebuilding and repairs to destroyed sections require a station. Field refits
preserve hull damage, shield charge, invulnerability and surviving-part damage;
they do not pay out currency or supply a free heal. Existing save-failure rollback
is retained. Salvage Fit now reaches the modular editor rather than the retired
freeform Mount flow.

Stations have eight visual service tiles and collapsed stock/construction
controls. The current recovery job gives a physical pulse gun instead of an
ordinary weapon licence, with atomic reward rollback. Vows and their automatic
popup/modifiers are retired; their inert compatibility API preserves old saves.
The captain screen and station no longer offer the obsolete vow/armoury doors.
Wallet and fitting readouts label actual module capacity instead of legacy GP.
The main HUD shows both Metal and Biomass with separate symbols and numeric
balances, on desktop and phone.

Focused muted Firefox: **37/37 journey checks passed**, including real touch
construction, draft recovery, both launch paths, four-gun cap rejection, ordinary
purchase/reapply, failed field saves, no field healing, mission reward rollback,
existing-save migration, visible Metal/Biomass balances and reload. Phone and desktop station/workshop screenshots
were inspected. Six original combat/editor files remain unchanged. Full npm
regression did not run; real-phone feel and combat FPS remain unverified. This
release uses cache token `20261026s53`; manual Pages publication is recorded
in the living plan.

## 2.9.4 — fitting made simple again (2026-10-26)

The side panels say what they are. Left: **Your ship** lists every slot with
what is in it, then **Add hull parts** as one short list (no pages). Right: the
chosen slot, what is fitted, and **Fits here**: every part that fits that slot,
one tap to fit it. Owned parts come first, and locked weapons show their research
price. The section tools (Unfit, Turn, Move, Remove) are always visible.
The Equipment and Armour menus are one compact list that scrolls; a tap fits the
part instead of opening a preview. Frames have two clear tabs. Upgrades say why
they are greyed out when you are not docked. From 1001 to 1180px wide the three
columns stay on screen; before, the side panels were pushed below the ship.
Gameplay, costs and fitting rules are unchanged. The hangar (33), phone fitting
(30) and modular ships (60) witnesses passed in Chromium. Firefox and the full
npm suite have not been run by Opus. Publication uses cache token `20261026s52`
and a regenerated standalone. Cael’s focused muted Firefox publication run passed
33/33 checks, including desktop/phone geometry, fitting transactions, reload and
standalone boot, with no application exceptions. Actual phone feel and FPS remain
unverified; this release does not include a rendering-performance change.

## 2.9.3 — compact equipment pages (2026-10-26)

Equipment cards use less empty space: up to 10 per compact desktop page, 15 on
taller desktops, 8 on tall phones and 6 in short landscape. Full effects stay
in the selected-item inspector. Research locks have a small icon with an
accessible label. Search, page controls and close controls remain separate.
Gameplay, costs and fitting rules are unchanged. The 32-check fitting suite passed;
the final phone density uses eight cards to keep all rows readable. Token: `20261026s51`.


## 2.9.2 — visual fitting and a proper wallet (2026-10-26)

Kept the central modular construction view and replaced the long side lists.
High groups weapon mounts, Mid groups support slots and Low groups drive/
engineering slots. These expose the existing compatibility rules; weapon size
remains separate. A visual equipment picker shows small pages of choices, with
search, family, size and ownership filters. Selecting an item opens its effect,
power requirement, hardware price and total fabrication bill in one inspector.
Shield previews show actual pool/recharge changes; guns show base hit/cycle
comparisons. The existing overhead art is displayed at readable card sizes.

Equipment shop doors now appear at the station and pause menu. Research still
uses the original station transaction, while hardware is paid through Apply.
The frame ladder shows all six construction capacities, module slots, reactor
output, frame prices, biomass/rank requirements and remaining training costs.
Ready-built ships have a separate paged view. Upgrades expose weapon fire control.

Functional armour is browsed separately from style pieces. Gun casings can add
their existing +35 base hull HP over a fitted weapon deck while retaining its
gun. Reapplying owned equipment does not charge again. Cosmetic sensor pieces
are excluded from the default functional picker and remain labelled as style.

The HUD has a visible metal icon/balance and a Wallet window showing metal,
biomass, unspent talent/reactor points and fitting capacity, each with its own
symbol and explanation. These read existing campaign data. Health, system
identity, arrival notifications, navigation and zoom/fullscreen controls have
separate positions. Escape closes the top picker/wallet without also closing
the shipyard. Existing campaigns are preserved.

Muted Firefox: **32/32 focused HUD/shop/wallet/fitting checks** and **30/30 phone
construction checks** passed. Includes actual shield/armour fabrication,
research save-failure rollback, native station shop access, placement/Undo/Redo,
rotation, portrait/landscape controls, reload and standalone boot. Screenshots
were inspected; no application exceptions. Six protected combat/editor sources
remain byte-identical. Full npm regression was not run; the older construction
witness now targets the new controls but has not been rerun in this batch.
Actual phone feel remains **PHONE: pending**. Source/standalone: `20261026s50`.

Field-refitting policy awaits Mac's choice. Starter creation/pacing, new fusion
reactors/batteries and hull specialisations remain future work. Incoming art is
preserved for a separate integration pass. [Research and design decisions](docs/research/SHIPYARD_UX_2026-10-26.md).

## 2.9.1 — phone fitting and navigation (2026-10-26)

Phone fitting now has separate Ship, Parts, Fit, Ships and Training panels. The
canvas and equipment list no longer compete for the same scrolling space. Main
navigation and Apply remain visible; landscape uses a side menu. Tap a section
to open its fittings, or choose it from the section selector. Move, rotate,
remove and unfit live under explicit section actions. The larger Apply button
shows the fabrication cost beside the free test-flight button. Metal, flying
HP/shield numbers and fitting limits remain in the compact header.

The minimap opens the actual chart and shows gate/station landmarks, current
system, sector coordinates and route bearing. Navigation has a 44px X that
clears the saved route and cancels approach; successful docking clears refit
guidance. The captain/quest journal has an explicit close button. This update
preserves the new modular campaign and does not repeat the development reset.

Muted Firefox verification: **30/30 focused phone-fitting checks**, including
real section attachment/removal, Undo/Redo, rotation, owned-gun fitting, a
180-metal station purchase, reload/Continue, desktop restoration, portrait and
landscape geometry, chart navigation and the standalone. Screenshots were
inspected; no application exceptions. The six protected combat/editor files
remain byte-identical. Full npm regression was not run for this UI hotfix.
Actual phone feel remains **PHONE: pending**. Source and standalone use
`20261026s49`.

## 2.9.0 — civilisation novice fleets (2026-10-25)

**Development reset:** at Mac's request, campaigns and legacy editor saves from
older builds are cleared once. New progress survives subsequent loads. Other
applications' browser storage is left alone.

Added fifteen canon-named novice modular frigates, with different layouts,
liveries and starter weapons. The new-pilot cards and the ship launched use the
same blueprint. Modular fitting is the visible shipyard; old freeform controls
are retired. Undo now records independently of the hidden legacy canvas.

Installed nine generated overhead turret sprites and nine supplied structural
sprites, shared by menus, construction and flight. The original review art is
preserved. Faction scouts, pursuers, armoured chargers, artillery and drone tenders
use modular hulls with existing AI behaviours. The 92-weapon arsenal remains the
weapon source; this release does not claim 92 newly added weapons.

Training grounds occupy sector 1,0 of the starting home system. Three weak targets
scale to fitted gun power. Ten kills pay one metal, without mass, loot, mastery,
quest or sector-clear rewards. The remaining first-ring home sectors use danger 1.
Chart and dock controls explain how to reach training; existing gates lead into
the 96-system galaxy.

Collected fittings now enter modular hardware ownership. Shields, drives, armour,
repair, fighters, escorts and siphons have compatible fitting entries. Recovered
weapon variants retain their traits; one owned variant cannot fill two slots.
Pickups are consumed after successful persistence and cannot be collected twice.
Physical equipment does not also grant biomass. Modular blueprints can save up to
160 compiled nodes, accommodating the existing titan frame and its fittings.

A focused sound pass adds distinct family timbres, lower heavy-weapon pitch and
clearer shield/hull/explosion reports. Battery reports merge by family, preserving
headroom for warnings. This is not a replacement music or ambience engine.
Rendering preserves modular enemy hull metadata, and lighting-cache keys now
include the system, rule, haven status and lighting settings.

Muted Firefox focused checks: **62/62 novice/loot/training checks and 60/60
construction checks**, no application exceptions. Covers rare-fitting application
and reload, actual gate travel, sound dispatch, portrait/landscape fitting layouts
and the standalone. Screenshots were inspected. The extended regression run was
stopped at Mac's request after those focused suites; no full npm-suite or fresh
110-case phone result is claimed. Actual mobile feel, sustained FPS and sound
quality are Mac's playtest. Source and standalone use `20261025s48`.

## 2.8.0 — modular shipbuilding (2026-10-25)

Added an opt-in modular workbench with explicit frigate/cruiser hull ratings,
connected sections, single-slot fitting, armour plates and quarter-turn module
orientation. It explains metal, GP, slots and power, previews compatible equipment,
shows a fabrication bill and keeps current HP/shield numbers visible. Preview and
flight share the hull compiler and renderer. Starter hardware is supplied once as
reusable hangar stock; newly required hardware is paid once and reused across refits.
Shipwright ranks cost 600 / 2,400 / 9,600 metal with mass gates and station training.

Opening the regular shipyard now defaults to the active ship. Explicit new/saved
blueprints are labelled; prior drafts and pre-modular ships remain available through
My builds. This fixes the default blank/stale draft appearing as the current ship.
Reactor boosts start at 5%; earned level points add five percentage points per rank,
up to five ranks per branch. Weapon-family labels include electro-kinetic.

Public refit stations now appear in visited non-hub systems, with a larger docking
radius and a new overhead station sprite. Chart routes show the next actual gate;
an explicit approach action flies to a local station and docks. Desktop zoom and
fullscreen controls are restored alongside the existing phone controls.

Focused muted Firefox verification passed **60/60**, with no application exceptions,
covering construction, spending/failed-save rollback, progression, save/Continue,
phone layouts, standalone boot, travel, docking and view-control delegation.
Screenshots were inspected. In a controlled 26-node/24-enemy medium-preset scene,
render budgeting improved sampled cadence from 12.8 FPS (13.9 on repeat) to 27.2 FPS.
This is a short isolated-browser comparison, not sustained or real-phone validation;
performance remains unfinished. Full release witnesses have not run on this batch.

This is a local first slice. More capital hulls, magic/super weapons, ability unlocks,
faction trees and the income/audio overhaul remain planned. Turret art production
requires true overhead geometry and measured pivots; concept sheets are not runtime
sprites. Release candidate uses cache token `20261025s18`; import validation now rejects
inherited identifier keys and non-finite fabrication bills. Publication is being verified.
See [the handoff](docs/HANDOFF_2026-10-25_SHIPBUILDING.md) for boundaries and next checks.

### Deliberate ship placement

Mirror now starts off. Choosing a part places it once, then clears placement;
Mirror remains an explicit option. Duplicate creates one copy and retains weapon,
mark, art and exotic metadata. Selected fittings have touch-sized directional
controls for precise movement with Undo. New ship restores single-part mode.
Focused muted Firefox workshop verification passed 44/44, including native canvas
placement, deliberate duplication, precise movement/Undo, phone touch targets,
save/reload and standalone boot; screenshots were inspected. This local foundation
does not yet add structural hulls or typed attachment slots. Included in the 2.8.0 release candidate.

### Local modular art study

Added a six-piece construction concept sheet and docs/ART_DIRECTION.md: structural
keel, armour section, engine, point defence, torpedo battery and capital rail.
The sheet establishes a shared component and connector language for the hull/slot
redesign. It is a design reference, not an installed sprite atlas or new equipment.
Added a matching six-role enemy concept lineup: mote, stalker, charger, sniper,
hive and a proposed capital hunter. Hostile silhouettes emphasise behaviour,
detachable fittings and salvage identity; enemy rendering and AI are unchanged.

## 2.7.0 — captain, shipyard and live wallet (2026-10-25)

This release combines the RPG and usability slices below. The 99,000 capital
economy and battery sound overhaul remain future work.

### In-game release notes

Credits now offers a touch-sized “What's new in 2.7.0” button. The existing menu
shows the shipped features, explains New ship versus New campaign, links this
full changelog and identifies the capital economy and audio work still ahead.

### Live wallet and wider view

Money now updates in the HUD and an open shop while paused, after income,
purchases, saves and rollback. Spendable metal is labelled separately from GP
fitting capacity; the phone strip retains numeric HP and shield. Numeric-string
legacy wallets add as numbers, and invalid assignments preserve the balance.
The readout adapter never saves, grants or resets money.

Default flight zoom is 0.40. The former version-3 0.50 baseline migrates once;
other saved version-3 zoom values and handling settings survive. Current-version
manual zoom persists, including 0.50, and phone zoom controls remain available.

Focused muted Firefox verification: **60/60**, including actual dock purchases,
planted failed saves, fresh-campaign backup/restore, compact catalogue controls,
phone layouts at 320/390/844px, zoom migration and standalone boot. Screenshots
were inspected. This does not qualify real-phone feel, sustained FPS, sound or
income balance. The armoury regression also passed 57/57. Release witnesses cover the editor,
simulation, menus, opening sectors, galaxy, hull skin, structures and ship roles.
Phone layout passed 110/110 against committed app sources, including portrait and
landscape controls and the standalone. All eight release witnesses passed (146
checks). Opening-combat needed its documented rerun; the galaxy test now freezes
position during save/Continue measurement instead of measuring subsequent drift.
Source and rebuilt standalone use cache token `20261025s15`.
The 99,000 capital economy and weapon audio overhaul remain queued.

### Local development — main Game Hall home (2026-10-25)

The complete working repository now sits in the main Game Hall's `black-current/`
directory, with its former forge path retained as a compatibility link. The local
Game Hall has a Black Current entry. File hashes, Git state/history and the dependency
link were preserved; six focused browser checks cover the local launcher, game boot,
weapon catalogue and task-board source. This relocation is not a public release or
a qualification of pending economy/shipyard changes. Added a dated seven-item EVE
market snapshot and three reusable daily research briefs.

### shipyard reset and readable catalogue (2026-10-24)

Added a larger weapons/systems catalogue with fixed search and size filters, one
scrolling card list, named weapons with base firing cycles, damage and unlock costs,
and discoverable exotic fittings. Compact sidebar cards show actual weapon names;
selecting a weapon preserves it on new mirrored nodes. Fly retains all ownership,
fire-control, dock and GP checks. The budget explicitly distinguishes fitted GP
from the captain's earned capacity.

New ship clears the blueprint. New campaign now actually clears mass, money, inventory,
upgrades and ship after confirmation, stores a previous-campaign backup, and boots a
clean runtime. My builds provides restore and export for that backup. Previewing a
new captain no longer overwrites the current campaign before confirmation. Preferences
are retained. These reset and catalogue changes are included in 2.7.0.

Local follow-up: the catalogue defaults to a compact list, with an optional card view.
Paid weapon research now ranges from 180 to 6,000 metal; fire-control steps cost
320 / 1,000 / 2,600 / 6,000. The combined 60-check usability run now includes these
final list and pricing edits. Income pacing and a real-phone playtest remain pending.

### ship identity (2026-10-24)

Shipyard → Style ship adds five plated hull finishes, eight paint schemes, custom
accent colours and five marking choices. Six layout tools rearrange existing fittings
into a needle, delta, broadside, crescent, trident or orbital hull. They add no parts
or currency, retain weapon choices, support Undo and pass through the normal fitting
checks when flown. Identity and geometry travel with saved builds, exports and the
flying ship. Rail, launcher, multibarrel and wave weapons gain distinct visible details.
Only styled player ships and their editor previews use the new plating renderer.
Enemy art and Sol's six reserved combat/progression source files remain untouched.




### first expedition story quest (2026-10-24)

The home dockkeeper now offers a guarded recorder recovery through the Captain journal.
Accept the job, follow its marked sector and gold bearing, defeat two persistent guards,
recover physical mission cargo and return to the home dock. Choose three-round pulse
technology or Drone operator I. Already-owned rewards pay 40 metal instead. Progress,
guard defeats and the chosen reward stay in the one save document; turn-in is one-time.

The story objective appears in Jobs and on the sector chart. Carried mission cargo is
visible behind the ship and in the hold. Existing encounters step aside for its nearby
action prompt. Captain journal sections now support authored missions alongside the
existing milestones and field contracts. This local batch preserves Sol's gun sources.
The standalone HTML includes these changes in the 2.7.0 build.

### captain RPG and clean workshop (2026-10-24)

Added a Captain screen with Build, Training and Journal views. Crew, vow, recovered
AI cores and equipped training now share one readable page. Six specialisations
have three paid ranks, level gates and explicit tradeoffs; only one to three trained
perks can be equipped. Training costs 80 / 240 / 720 metal. Recovered cores remain
available to equip at a dock. Four starter journal objectives pay a small, one-time
metal reward and field contracts remain visible. Existing vows no longer trigger
another automatic choice at every evolution. Applying refits requires a dock or haven.

The Shipyard now has visible New ship / Save build / Fly controls on phones and a
My builds library. Its new workspace stores drafts and blueprints in the one save
document. A fresh hull has one core; older editor storage is preserved as an optional
legacy export instead of loading automatically. Quiet travel can bring a three-role
patrol, with home/pause/population guards. Place ambience is stronger, and new weapons
have procedural voices. These additions are local and awaiting Mac's playtest.

Validation: 57/57 focused muted Firefox checks passed, covering purchases and fitting
limits, actual projectile behaviours, legacy draft isolation, New/Save/Load/Delete,
training costs and gameplay effects, save-failure rollback, durable captain experience,
AI collection, one-time rewards, patrol guards and the rebuilt standalone HTML.
The six original gun/progression files remain byte-identical to the 2.6.0 checkpoint.
This is not a full-suite or physical-phone balance/performance qualification.

### weapon research and fitting progression (2026-10-24)

Added a dock armoury with sixteen paid weapon technologies and four staged fire-control
investments. Purchases require metal, docking and the rack's mass milestone; ownership
and fitting tier persist. Existing fitted weapon licenses, ships and wallet are retained.
Tiny guns now cost at least 16 GP. Hull class and purchased fire control limit battery
load; overloaded old batteries receive an explicit warning and reduced damage. Medium,
heavy, siege and capital classes require their matching research tier.

Added eight weapon families: flechette repeater, three-round pulse, rotary autocannon,
shrapnel shell, heavy deck cannon, pulse-lance battery, siege howitzer and capital spinal
rail. New burst, fragment and piercing behaviour uses the existing projectile format.
The 46px capital mount is a distinct class. Starter spitter/twin output is reduced;
heavy and siege batteries have slower, heavier salvos. Danger-3 standard kills now drop
12 mass instead of 27; introductory and boss rewards are unchanged.

Implemented as one classic-script adapter: the original engine, hardpoints, Shipyard,
fleet, weapons and progression source files remain untouched for Sol's gun-mark work.
Cache token is s10 and the local standalone HTML is rebuilt. Uncommitted/unpublished;
physical-device feel, balance and integration with Sol's future gun marks remain open.

### visible hull and shield (2026-10-24)

Added labelled HP and shield bars with numeric readouts to the flight HUD. The same
meters move into the phone status strip and return to the desktop resources card
when resized. Shield capacity follows the pool actually activated in combat;
inactive and depleted states are explicit. The compact phone strip replaces its
location line with the two meters; location remains in the chart and pause menu.

This is a display change. Combat, save handling and Sol's gun-upgrade files are
unchanged. Source preview only: no commit, push or standalone rebuild in this batch.
Validation: 21/21 focused muted Firefox checks passed, including real shield activation
and damage, death/depletion, three phone sizes, desktop restoration, no save writes,
and a deliberately hidden-meter negative control. Physical-phone readability remains
for Mac to judge.

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
