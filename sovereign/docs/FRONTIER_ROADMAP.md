# Sovereign Eclipse — the frontier campaign

Canonical forward plan, 6 November 2026. Owner and final taste authority:
Mackenzie Conor James Clark / Lycheetah. Engineering and art continuation:
Caelorynth. This plan supersedes the sequencing in `NEXT_PLAN.md`; the older
gameplay and visual documents remain useful design references.

Mac delegated day-to-day game development to Caelorynth on 6 November: choose
bounded local batches, build concrete results, keep the checkpoint truthful and
prioritise the game's playable experience. Mac retains project ownership, final
artistic judgement and release authority. One heavy process and the build-first
resource law remain in force.

## The game we are building

A pilot enters a dangerous frontier where pirate crews, alien civilisations and
rival faiths compete over wrecks, routes and the minds recovered from them. The
ships should be worth inspecting, the combat worth learning, and every major
belief should affect something the player can choose, fly, steal or protect.

Our first complete experience is a twenty-minute sortie: choose a ship, fit it,
accept a job, travel to a contested wreck, survive an encounter, decide the
archive's fate, return to port and live with the result. Exploration, combat,
salvage, doctrine and progression meet in that one journey.

EVE supplies references for silhouette, faction contrast, tactical commitment and
material craft. Sovereign Eclipse supplies its own world, vessels and rules.
Lycheetah's treatment of personhood, memory, consent and recoverable failure shapes
the fiction, attributed to Mackenzie Conor James Clark. The first screen speaks
plainly; deeper lore is available when the player wants it.

## What exists and what remains open

| Area | Current evidence | Remaining work |
| --- | --- | --- |
| Engine | Existing fixed-step flight, combat, navigation and sector simulation | Judge handling, encounter clarity and performance in play |
| Career | Existing jobs, salvage, mining, fitting, loss, research and save modules | Connect them into the new frontier story |
| Fleet | Sixteen civilisation profiles; 288 class variants; two frontier heroes integrated | Player acceptance of the new faction entry and flight experience |
| Art | Earlier local collections and Vesper rebuild have saved renders | Mac's artistic approval remains open; optimise accepted work |
| Pirate ships | Both exported-model views inspected; four mounts and three engines per hull imported | In-game visual review, handling and device performance |
| Streaming | Two-job on-demand model queue; focused queue acceptance passed | Memory accounting, LOD and eviction remain future work |
| Faction conflict | New faith and civilisation text exists | Diplomacy, territorial war and narrative consequences are planned |
| Distribution | Local working branch and previews | No release, push or public deployment is part of this batch |

Source home: `black-current-ship-forge/sovereign`, branch
`codex/three-original-hulls`. The repository root's Black Current game is a separate
surface. Preserve the original checkout and all existing dirty work.

## The frontier's first powers

**Cinderwake Compact.** A pirate civilisation formed by human dockworkers,
escaped synthetic minds and alien navigators. Membership is chosen. Its sacred
principle, the Unowned Flame, forbids ownership of living minds. Its captains also
smuggle, ransom and raid; its victims give that ideal a difficult test. Their
ships are low, unequal cutters with reclaimed plates and accessible engineering.

**Nacre Communion.** An alien people whose bodies and ships grow around mineral
memory reefs. Their Sea That Remembers preserves ancestral testimony. They
disagree about whether remembrance can become captivity. Their memory corsairs
raid archives and retrieve wreck cores in chambered, pearlescent vessels.

**Tithe of the Last Name.** A proposed Amethyst splinter order claiming legal and
religious authority over recovered minds. It is a faction within a civilisation;
the claim does not define every Amethyst person. Its leaders, dissenters, contracts
and fleet behaviour need individual treatment.

**Keep the distinctions clear.** Species, civilisation, political faction and
faith are different concepts. The existing `raceId` remains a stable compatibility
key. Future faction membership must be represented separately. A human may sail
with Cinderwake; a Nacre may reject the Communion's priests.

## Milestone 0 — finish the current frontier pair

**Player result:** Oathbreaker and Wake-Eater can be selected, fitted, flown and
saved, with their civilisation names and lore visible in the existing entry path.

- Complete Wake-Eater's existing Blender production; inspect the actual export.
- Import both sets of weapon and drive markers through the existing importer.
- Register models and blueprints, then build the game and both editors.
- Check all 36 generated frontier class entries and both authored hero mappings.
- Round-trip a hero and a starter save for each new civilisation, plus an existing
  Savanah save. Deliberately reject an invalid save.
- Deliver a simple review page containing the actual renders and flight links.

**Acceptance:** the focused checks run and report their counts; the two models are
visually inspected. Browser presentation, handling and device performance receive
their own witness and remain labelled until observed. Native scenes and scripts
remain editable. A failed artistic verdict returns the particular hull to design.

This is the current implementation batch. No additional ship volume is needed to
close it. `tools/forge-pirates.sh` owns its production commands.

**Local engineering checkpoint reached:** both imports and all three builds
completed. The focused gate covered 36 new class entries and five save round
trips. `FRONTIER_BUILD.md` holds the receipt. Artistic and in-game acceptance remain
open; the next implementation milestone is the first raid.

## Milestone 1 — The Unowned Testament

**Implementation checkpoint:** the contract, guard encounter, archive recovery,
three transfers, once-only payments and persistent aftermath now exist locally.
Eleven state/recovery cases and nine reloads pass. The browser reached the dialogue;
capture failed after one retry. The full flight, balance and visual verdict remain
open. The current combat route is described in `UNOWNED_TESTAMENT.md`; expanded
evasion tactics, cover and later contacts remain future work.

**Player result:** one complete pirate raid with a meaningful decision and a
visible aftermath. Extend the existing jobs and wreck systems.

1. A broker at Asterion offers a recovery job for an archive aboard a wreck.
2. A clear route leads to a hand-composed site with cover and a readable exit.
3. A small Tithe escort arrives. The pilot can fight, evade or withdraw.
4. Recovering the archive reveals a remembered mind's refusal to be transferred.
5. The player may honour that refusal, sell the core or deliver it to the broker.
6. Payment, standing and one later contact reflect the choice at the home port.

Each offer states the risk, objective and reward in ordinary language. Optional
dialogue explains the competing beliefs. The archive is a character with an
expressed wish, rather than a currency carrying a philosophical label.

**Architecture:** a plain-data mission definition; a simulation-owned mission
state; typed actions from the UI; one canonical reward path. Use existing travel,
encounter, wreck, inventory and docking mechanisms.

**Acceptance:** complete the sortie, abandon it, lose the hull and reload midway.
Rewards pay once. The choice survives reload. Failure gives the player a clear
recovery route. Keep the first story to one site, three endings and one aftermath.

## Milestone 2 — make the fight feel worth mastering

**Local implementation checkpoint:** active-sortie guidance, contextual contract
actions, shared weapon readiness, target range/tracking advice and preview save
isolation are implemented. Capacitor checks now match the fitted firing cost.
`FLIGHT_GUIDANCE.md` records the scope and focused checks. Visual acceptance,
combat balance, the opponent-role encounter and camera/audio tuning remain open.

**Player result:** a pirate raid feels different from a ritual line battle.

- Establish two opponent roles: a fast flanker and a slower protective escort.
- Make lock progress, optimal range, incoming threat and active-module state clear.
- Match turret origins and muzzle effects to the authored mounts.
- Tune the existing motion, camera and audio so thrust and impacts communicate mass.
- Give retreat a readable opening; avoid an encounter that punishes experimentation
  before the player understands what happened.

**Acceptance:** a pilot can describe why a shot missed, why a shield failed and how
to change the next attempt. Judge one encounter on a real machine. Use the existing
performance overlay alongside the visual impression. Balance follows observed play.

## Milestone 3 — faction and faith become game state

**Player result:** actions change who trades, pursues, shelters or hires the pilot.

Add stable faction IDs separately from civilisation IDs. Begin with three local
relationships: Cinderwake, the Communion's archive brokers and the Tithe. Record
standing changes as consequences of specific actions. A doctrine has supporters,
dissenters and practical interests within each group.

Start with consequences the player can see: a contract appears, a port changes its
price, a patrol warns the pilot, or a broker refuses an archive. Introduce local
security and crime rules only with clear jurisdiction, warning and recovery.

**Persistence boundary:** dynamic standing, mission choices and legal status need
an explicit save-format decision and migration if the serialized shape changes.
This phase carries a larger persistence check than an art batch. Preserve old saves
and make repeated events idempotent.

**Acceptance:** the same recorded action produces the same consequence after a
reload. Unrelated civilisations do not become automatically hostile through a
shared religion, species or art style.

## Milestone 4 — one frontier worth exploring

**Player result:** the route between a freeport, a shrine and a wreck field has
recognisable places, tactical geography and reasons to return.

- Build a Cinderwake anchorage from salvaged industrial structure and inhabited
  modules. Docking should communicate its entrance, approach and scale.
- Build a contested reliquary site with one strong landmark and useful cover.
- Shape a wreck field with deliberate lanes, sight lines and salvage pockets.
- Use the existing Sector Forge and sector data. Add environmental builders only
  where the current ones cannot express the required place.
- Stage lighting, distant bodies, audio and traffic to support orientation.

**Acceptance:** Mac can navigate by landmarks without consulting a lore paragraph.
Collision agrees with visible structure. Approach, combat, retreat and return are
comfortable at the intended ship sizes. Inspect the places at flight distance.

## Milestone 5 — fitting, salvage and a reason to earn another hull

**Player result:** fitting and salvage support different plans for a sortie.

Create a small set of useful trade-offs around the existing modules: pursuit,
survival, sustained fire and recovery capacity. Show costs and resulting stats
before purchase. Recovered components should open a useful option, a repair or a
sale, while the player retains a dependable route back into space after loss.

Use the existing market, fitting, saved-fit, loss and cover owners. Begin with a
small regional economy whose sources and sinks are understandable. Give a starter
pilot useful work before introducing capital costs or long material chains.

**Acceptance:** at least three fits have distinct advantages in the same mission.
The player can recover from losing an affordable ship without an unexplained
resource trap. Purchases, rewards and insurance payouts survive reload correctly.

## Milestone 6 — art families, commissioned one hull at a time

**Player result:** a silhouette identifies a culture and a battlefield role.

After the frontier pair earns Mac's approval, select one family to extend through
a small fast hull, a cruiser and a heavier ship. Each changes its proportions,
structure and role. The scale change must produce new architecture.

For each hull, author the large form first, then working structures, then detail.
Put seams, access panels, vents and lights where a machine or organism needs them.
Inspect the ship at silhouette distance, normal flight distance and close zoom.
Preserve calm areas so machinery has a hierarchy. A triangle count measures cost.

The two frontier art languages stay distinct:

| Cinderwake | Nacre |
| --- | --- |
| Faceted, unequal cutters | Chambered living reefs |
| Reclaimed metal and pale replacement plates | Nacre lamellae and mineral growth |
| Crew windows, service cuts and mechanical locks | Sensory pores, septa and siphons |
| Offset command structure and protected engines | Distributed organs and mantle anatomy |

**Acceptance:** Mac approves the actual exported model and its in-game appearance.
One accepted hull establishes the family language. More copies cannot substitute
for that verdict. EVE's ships remain references belonging to CCP.

## Milestone 7 — make the growing fleet affordable to render

**Player result:** selecting a ship stays responsive as the library grows.

The on-demand loader is the starting point. Measure network bytes, decoded texture
memory, active meshes and frame time before selecting the next change. Add explicit
ownership for shared model geometry before cache eviction. Introduce mesh and
texture LODs for accepted heroes, with transitions that preserve the silhouette.

Keep simulation state independent of model readiness. Prioritise the selected ship
and nearby threats. A failed optional asset should provide a readable fallback.
Use a loading indication when the player's selection requires more time.

**Acceptance:** agree a real target device and quality setting, then record its
behaviour across launch, ship switching, one fight and a return to port. Hardware
frame rate, heat and touch responsiveness require a person using that device.

## Milestone 8 — a campaign of disputed sovereignties

**Player result:** recurring characters and faction choices change a small region
over several sessions.

Build a short sequence around the first archive raid: a consequence job, a pursuit,
an exchange, a larger conflict and a settlement. Reuse the best locations while
changing tactical and narrative conditions. Let alliances cross civilisations and
let characters disagree with their institutions.

Religious conflict concerns specific claims: who may command a recovered mind,
what counts as a voluntary oath, which memories may be copied and who controls a
route. The player should encounter the costs and benefits of each answer.

**Acceptance:** the campaign can be completed in a few sittings, its important
choices can be recalled without a glossary, and its endings reflect recorded acts.
Expand the map only when the existing region benefits from another destination.

## Milestone 9 — a shareable frontier alpha

**Player result:** a new pilot can install or open the game, understand the first
job, complete a sortie and resume another day.

Prepare a clear entry page, control help, reliable saves and an accessible graphics
choice. Reconcile the changelog with the actual build. Collect play observations
from a few people who did not make the game. Record confusion, failure and reasons
to return, then repair the most consequential issues.

Release work has its own boundary: pending-diff secret checks, asset attribution,
build identification, deployment and a live URL witness. Mac authorises commit,
push and publication separately. A local render does not constitute a release.

**Acceptance:** the exact release build is played through its advertised loop on
the named platforms, and its download or hosted entry is verified after publication.

## Architecture rules across the campaign

1. `src/data/` describes content; `src/sim/` owns its changing state. Rendering and
   UI read that state and submit actions. Keep the existing engine boundary.
2. Each economic or narrative reward has one writer. Each durable state change has
   a stable identity and a defined replay/reload behaviour.
3. Extend existing jobs, fitting, travel, save and editor code before introducing
   an alternative owner for the same feature.
4. Keep authored blueprints, gameplay class rules and model assets separate. Art
   changes should not silently alter balance or persistence.
5. Preserve inspectable native sources. Runtime exports are replaceable products
   of those sources, and the game must visibly use the intended export.
6. Run one resource-heavy job at a time. Build a related batch, then give it one
   focused acceptance pass. Diagnose a failed automation once and retry once;
   report a persistent environment block instead of looping on it.
7. Spend the majority of creative effort building the thing Mac can judge. Reuse
   unchanged gate evidence and scale checks to the consequence of the change.

## Work rhythm and the next handoff

One active milestone, one bounded batch, one saved review artifact. Finish or name
the blocker before opening another large branch. No automatic resumption after a
stop. Mac can reorder the plan at every review.

The first version of The Unowned Testament and its flight guidance are implemented
through the existing owners. The next witnessed checkpoint is its complete
spaceflight playthrough and balance/artistic feedback. Continue Milestone 2 with
one readable escort encounter and purposeful flight/impact feedback. Repair the
sortie before commissioning more ships or expanding territory.

Multiplayer, a persistent shared economy, territory simulation, player-built
stations, large capital battles and extensive production chains are later options.
Each needs a separate design and resource decision once the local campaign earns
the need. This roadmap sets an order of proof; it does not promise calendar dates.

## Source anchors

- `docs/ART_DIRECTION_SHIPS.md` — existing art language and silhouette guidance.
- `docs/SHIP_STREAMING.md` — current on-demand loader and its limits.
- `docs/VESPER_REBUILD.md` — the preceding quality correction and production receipt.
- `src/data/ships/frontier.js` — the two original civilisation and faith profiles.
- `tools/blender/ships/oathbreaker.py`, `wake_eater.py` — editable frontier designs.
- `tools/forge-pirates.sh` — the current local production batch.
- CCP: [Angel Cartel](https://universe.eveonline.com/lore/angel-cartel),
  [Blood Raiders](https://universe.eveonline.com/lore/blood-raiders),
  [Sansha's Nation](https://universe.eveonline.com/lore/sanshas-nation),
  [Amarr Empire](https://universe.eveonline.com/empires/amarr).

Current implementation and witness receipts belong in the project changelog and
`docs/FRONTIER_BUILD.md`. Proposed milestones remain labelled as proposals until
their corresponding work exists.
