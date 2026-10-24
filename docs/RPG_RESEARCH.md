# Black Current — RPG research and progression findings

Evidence date: 2026-10-24. Product author and direction: Mac / Lycheetah.
This is a design brief, not a claim that a complete RPG or balanced economy has shipped.
The active checklist remains the existing local `FORGE_PLAN.md` at the project root.

**Status update, 2026-10-25:** the proposed price ladder below was subsequently
implemented in the local s13 source and rebuilt standalone. Final purchase and pacing
validation remain pending. The 31/31 shipyard-reset report predates the final list-view
and price changes. These local updates have not been published by this seat.

**New direction from Mac, 2026-10-25:** entry capital weaponry should start around
99,000, replacing the current local 6,000 capital target. This new floor is not
implemented. The next economy design must distinguish paid hardware from a permanent
license, align endgame income and preserve an accessible starter. At the present
120-metal base boss payout, the price equals 825 boss rewards before other income;
that arithmetic is not a measured play duration. Mac also requests substantially
less weapon/audio spam, role-based RPG upgrades and a naturally wider flight view.
The proposed initial camera test is 0.40 versus the current 0.50 default. See the
canonical tracker for the gold-counter clarification and current acceptance gates.

## EVE market snapshot — 25 October 2026 in New Zealand

Fetched from the official ESI public market API at **2026-10-24 21:06:49 UTC**.
These are the lowest nonempty sell-order asks in the captured responses, not
executed trades, average transaction prices or guaranteed quotes. All seven type
responses have one page; 259 regional orders were examined. Jita refers to station
60003760. The Forge region is 10000002. Data changes after this snapshot.

| Item | Jita lowest ask, ISK | The Forge regional lowest ask, ISK |
| --- | ---: | ---: |
| [125mm Gatling AutoCannon I](https://esi.evetech.net/latest/markets/10000002/orders/?order_type=sell&type_id=484) | 3,500 | 3,500 |
| [Rifter](https://esi.evetech.net/latest/markets/10000002/orders/?order_type=sell&type_id=587) | 348,800 | 292,100 |
| [Caracal](https://esi.evetech.net/latest/markets/10000002/orders/?order_type=sell&type_id=621) | 11,150,000 | 11,150,000 |
| [Raven](https://esi.evetech.net/latest/markets/10000002/orders/?order_type=sell&type_id=638) | 146,900,000 | 146,900,000 |
| [Dual Giga Beam Laser I](https://esi.evetech.net/latest/markets/10000002/orders/?order_type=sell&type_id=20446) | 59,970,000 | 59,970,000 |
| [Capital Shield Booster I](https://esi.evetech.net/latest/markets/10000002/orders/?order_type=sell&type_id=20703) | 85,000,000 | 85,000,000 |
| [Revelation](https://esi.evetech.net/latest/markets/10000002/orders/?order_type=sell&type_id=19720) | No order in snapshot | 2,499,000,000 |

[Snapshot data and validation metadata](research/eve-market-2026-10-25.json) retain
the response dates, page counts, counts by venue and raw-response hashes. Full raw
responses are retained in the ignored local witness directory. The extractor rejected
14 planted empty/invalid inputs; absence of a Jita order is recorded as null, not zero.

EVE manufacturing consumes materials/components using a blueprint; owning the
blueprint does not supply the manufactured object. That is a useful model for our
current license-versus-hardware gap. [Official manufacturing guide](https://support.eveonline.com/hc/en-us/articles/203210292-Manufacturing).
Its insurance covers the hull rather than fitted modules, so equipment loss still
has a replacement cost. We can adapt recoverable loss to Black Current without
adopting EVE's full punishment or industry complexity. [Official insurance guide](https://support.eveonline.com/hc/en-us/articles/212726885-Insurance).

### What changes our economy

The small-autocannon-to-capital-beam ask ratio is about 17,134 in this snapshot.
Our cheapest paid technology at 180 versus the local 6,000 capital rail price is
about 33; Mac's proposed 99,000 capital floor would make that comparison 550.
These are rough scale comparisons between different games and item categories,
not a currency conversion, a DPS comparison or proof of an appropriate grind length.

1. **Own individual hardware.** Recovered or fabricated guns are finite units.
   Moving an owned unit is free; adding a new unit requires stock or a visible price.
   Removing a fitting returns it to the hold. Imports and duplicate nodes use the
   same accounting. Preserve old installed equipment through an explicit migration.
2. **Earn access separately from purchasing power.** Weapon class, blueprint,
   captain specialisation and a rare component can gate an endgame device. Cash
   alone should not buy every role immediately after the opening sectors.
3. **Keep the 99,000 capital Mk I target meaningful.** Coordinate rewards and
   late-game jobs with it. The existing 120-metal base boss reward is not an
   adequate sole income path to that price. Keep starter equipment viable.
4. **Cap power through tradeoffs.** GP, fire control, hull handling, energy and
   limited active systems already supply useful constraints. Require choices among
   defence, speed, control and alpha damage; mass gain must not grant free equipment.
5. **Give money useful destinations.** Fabrication, weapon marks, specialist
   systems and optional expedition services can compete for funds. Avoid mandatory
   upkeep that traps a broke player and retain an accessible recovery path.
6. **Judge progress by play.** Log income sources and purchases through three
   sectors with fresh and returning saves. Compare at least two viable fits, and
   check that saved builds and recovered hulls cannot bypass the costs.

This is a proposed economy architecture. The physical-hardware ledger, capital
99,000 floor and reward rescaling are not implemented by this research pass.

## Daily research workflow

Three independent chats can investigate economy, combat/audio and RPG content.
Give each the same current project brief, a bounded question, primary-source and
date requirements, and a one-page output limit. Bring recommendations into the
single live tracker before changing code. [Ready-to-use lane briefs](RESEARCH_LANES.md).

## What comparable games teach us

These are mechanism comparisons from developer/publisher material. The final column
is our proposed adaptation, not a reported feature of the reference game.

| Reference and primary source | Documented mechanism | Proposed Black Current adaptation |
| --- | --- | --- |
| [EVE fitting window](https://support.eveonline.com/hc/en-us/articles/213287845-Fitting-Window), [fitting attributes](https://support.eveonline.com/hc/en-us/articles/213287965-Ship-Attributes-in-the-Fitting-Window) | Fits expose hardpoint limits, power-grid and CPU usage; offensive readouts distinguish DPS and volley damage. | Show a small set of understandable fitting limits and actual sustained/burst output. Make choosing a small fast battery versus a large slow one consequential. Keep our own names, art and UI. |
| [Cosmoteer](https://cosmoteer.net/) | Module placement affects performance; individual modules can be targeted and destroyed. Crew logistics support the ship's operation. | Make loss of an engine, shield or battery readable; give support modules a job and hull layouts a tactical purpose. Simulated individual crew are unnecessary for this game's scale. |
| [Reassembly](https://store.steampowered.com/app/329130/Reassembly/) | Modular ship growth, changing enemy designs, physics and a procedural universe support ship-building and exploration. | Vary enemy silhouettes and encounter compositions as the player grows. Give newly reached regions valuable salvage and discoveries, while retaining our current node format. |
| [FTL](https://store.steampowered.com/app/212680/FTL_Faster_Than_Light/) | Power allocation, subsystem targeting and text encounters present multiple responses; a randomised journey supplies different enemies and decisions. | Extend current reactor modes and mission choices into a compact authored chapter with consequences and recovery. Keep decisions readable on a phone; retain Black Current's recoverable defeat. |
| [Captain Forever Trilogy](https://store.steampowered.com/app/758930/Captain_Forever_Trilogy/) | Destroyed enemy parts can be attached to the player's ship; physical ship design affects flight and combat. | Make salvage quickly understandable and worth fitting, selling or saving. The existing dedicated shipyard can provide safe planning and clear costs. |

The design inference is that progression becomes satisfying when a purchase, fit,
encounter or story choice changes the player's next decision. Additional item names
alone cannot establish that relationship. These sources do not prove Black Current's
fun, balance or phone performance. Starsector was also considered, but its primary
site/manual could not be retrieved in this pass; no current-version claims rely on it.

## What is already here

The local tree includes captain training, vows, AI collection, a build library,
twenty-one weapons, six mount classes, patrols, a first authored recovery mission and
ship finishes/layout tools. Existing code already has four crews and reputation,
reactor doctrines, five common enemy roles, outposts, bosses, contracts and wrecks.
The work is to deepen and connect these systems, not describe them as missing.

The last recorded focused reports on disk show 21/21 HUD checks, 57/57 shared RPG
checks, 32/32 first-expedition checks and 29/29 ship-identity checks. They have not
been rerun as one integrated release in this research pass. Their counts overlap in
scope and do not add up to a full-game qualification. The RPG changes are local,
uncommitted and unpublished; the public play page could not be fetched in this pass.

## Source census: why money can stop mattering

The following records the source baseline before the later s13 price increase,
not measured minutes of live play. The updated local prices appear below:

| System | Baseline source fact | Source |
| --- | --- | --- |
| GP capacity | Neutral-crew capacity is floor(60 + floor(mass × 0.28)); crew modifiers apply. GP is not deducted like money. | `js/progression.js`, `getTotalGP` |
| Ordinary fittings | Valid ordinary nodes are checked against GP, sockets, class, fire control and technology. There is no per-install metal bill. Exotic blueprint ownership is checked separately. | `js/loot.js`, `fitting.check`; `js/armory.js` |
| Weapon technology | Sixteen paid technologies range from 70 to 1,800 metal. Five base technologies are licensed initially; advanced classes still need the appropriate fire-control tier. | `js/armory.js`, `FREE`, `PRICES`, `MIN_RACK` |
| Fire control | Paid steps cost 140 / 420 / 1,100 / 2,600 metal at 150 / 500 / 1,400 / 3,000 mass. | `js/armory.js`, `RACKS` |
| Captain milestones | Save a gun blueprint: 40; own a paid weapon technology: 40; complete a contract: 80; recover/equip an AI core: 80. Total 240, one-time. The technology condition currently tests ownership, including a gifted license. | `js/pilot.js`, `quests` |
| Kill metal | Standard kill pays tier; elite pays tier × 3; outpost pays 36; boss pays 120. | `js/hubs.js`, `metalFor` |
| Selling spares | Metal per spare is 2 + round(radius × 0.25); the retained blueprint is not sold. | `js/hubs.js`, `sellValue` |
| Other metal | Expeditions include 18 and 24 metal payouts; surviving a structure raid pays 40; active-system drills pay 6 + system danger × 3 on their configured update interval. | `js/expeditions.js`; `js/hubs.js`, `tick` |
| Contract progress | Contracts also award mass and parts. Their mass can accelerate GP and evolution even when metal payouts are tightened. | `js/contracts.js`, `roll` and completion flow |
| Refit health | Applying a design restores full HP. Docking also repairs; free home repair may be an intentional recovery service. | `js/engine.js`, `applyDesign`; `js/hubs.js`, `openDock` |
| Old saves | Armory migration retains the wallet and licenses weapons already fitted. New blueprint creation does not reset campaign wealth. | `js/armory.js`, `doc`; `js/workshop-library.js`, `newShip` |

Mac's newest report says weapon buying remains too cheap. That report has priority
over the earlier green purchase tests: those tests prove charging and rollback, not
that a price makes a satisfying decision. The four milestone rewards total more than
three times the cheapest research price. The first technology milestone also returns
40 metal after a purchase or qualifying gift. These are specific reasons to include
rewards in the pricing review, rather than adjusting kill income alone.

Hypothesis to test: early grants plus cheap permanent unlocks quickly remove the
shopping decision; a returning rich save amplifies it. A fresh captain and an existing
wallet must be measured separately. Income per minute, time to each weapon and the
player's exact save remain unmeasured. Do not silently delete money to manufacture a
better curve.

## Recommended economy contract

1. Trace every reward stream for three sectors with fresh and returning saves, then
   set prices against observed income. Record metal, mass, GP and recovered parts separately.
2. Make a starter choose between a new weapon role, fire control and captain training.
   A higher tier should require further successful play and an appropriate prerequisite.
3. Keep free blueprint planning, Save, paint and movement of owned hardware. Introduce
   a clear quote for newly fabricated hardware, reused fittings and any deliberate service.
   The current blueprint inventory needs an explicit migration before it can act as
   physical hardware stock. This is proposed, not implemented.
4. Complete fitting, debit and save as one transaction, with one source of cost truth.
   Failed storage must restore both equipment and money. Import, duplication, resizing,
   recovered hulls and repeated Fly must use the same rules. Account for Sol's gun marks.
5. Keep a free viable starter/recovery path. Prefer attractive purchases and rare useful
   discoveries to mandatory upkeep taxes. Cosmetic edits must not generate hardware or
   create a healing shortcut; free home repair can remain a deliberate design decision.

Provisional pacing goals: movement and first combat within a minute; a visible first
purchase goal in the opening session; a meaningful spending choice still present after
three sectors; specialised ships before a capital. No minute-based unlock promise or
final multiplier is justified until the census and Mac's phone playtest are complete.

## Local s13 price ladder awaiting validation

These values are implemented locally and remain hypotheses for the census and playtest,
not a claim that the economy is solved. The test is whether a basic technology
can be earned through a satisfying outing. The candidate numbers make the full
240-metal milestone pool insufficient to purchase several basic technologies.
Higher classes still have their fitting prerequisites.

| Technology | Previous metal | Local s13 metal |
| --- | ---: | ---: |
| Needler | 70 | 180 |
| Flak | 90 | 240 |
| Flechette repeater | 90 | 240 |
| Three-round pulse | 120 | 320 |
| Wave emitter | 160 | 420 |
| Rotary autocannon | 180 | 480 |
| Shrapnel shell | 220 | 600 |
| Mortar | 240 | 650 |
| Boomerang | 280 | 760 |
| Heavy deck cannon | 340 | 950 |
| Pulse-lance battery | 400 | 1,100 |
| Torpedo | 550 | 1,600 |
| Siege howitzer | 760 | 2,400 |
| Lance | 950 | 3,200 |
| Cluster | 1,000 | 3,600 |
| Capital spinal rail | 1,800 | 6,000 |

Test the local rack sequence at 320 / 1,000 / 2,600 / 6,000 metal against the same
income log. Keep initial weapons viable and avoid forcing a dull grind before the
first interesting purchase. Review the 40-metal technology milestone as part of that
log: a gifted license currently qualifies too. A satisfying quest reward can be a
specialised fitting or reputation instead of another automatic cash injection.

Some initially licensed weapons belong to advanced mount classes. Raising paid
technology prices alone will not charge for those blueprints after the class gate is
met. This is another reason the proposed hardware quote and fire-control review belong
in the same progression batch. Existing ownership and installed equipment need an
explicit migration policy; this brief authorises no automatic removal or reset.

## Build sequence and scope

The live tracker sequences economy, weapon/enemy roles, captain and campaign depth,
ship ownership/atmosphere, then phone integration and release. Sol retains his gun-mark
lane. A complete first chapter means a connected quest chain, several viable fits,
earned upgrades, an encounter that tests them, a chapter ending and reliable recovery.

Keep sector coordinates for navigation and author the hubs and important beats. Use
seeded local variation for patrols, salvage, weather and minor encounters. This gives
procedural replay without an engine rewrite or losing recognisable places. Content
density in three regions is the proposed next milestone before expanding the existing
large galaxy. Multiplayer, real-time training queues and a player market are outside
this first chapter.
