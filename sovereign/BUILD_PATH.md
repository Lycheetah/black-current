# Sovereign Eclipse · Forge path

From today to the full game, one playable release at a time. Each release is a batch Mac can feel in
one session, published with captures; checks run once per release. Design reference:
`docs/EVE_STUDY.md` (systems) and `docs/ART_DIRECTION_SHIPS.md` (ships). Mac reorders anything.

**The game:** a capital-ship space RPG in the Black Current. Launch, take a risk, bring something home,
build a stronger fleet, rise from a Green Seed at Asterion to Titan command among fifteen civilisations.
Single-player first, then co-op, then a persistent universe. Browser, desktop and phone, one link.

## Done so far (R0.1 – R0.12)
Engine, flight, combat with anatomy damage, Shipwright and Hull Forge, Atlas scanner, saves, Blender hero
hull with baked textures, civilisation architectures, living turrets, menus and settings, sound, and the
engine pass (69 draw calls quiet, 111 in a fight).

## Phase B · Stations, UI and the first hour
| Release | Delivers |
|---|---|
| **R0.13 Title and pilot** ✓ | title screen (New, Continue, Settings, Credits); pilot creation: name and **civilisation of origin** (14), which sets your starter hull, palette and first agent; three save slots |
| **R0.14 Station** ✓ | docking opens a **station screen** with tabs: Hangar, Shipwright, Market, Contracts, Research, Industry; one UI kit for every panel |
| **R0.15 Fleet and Market** ✓ | shipyard (hulls gated by research, priced by class), own and board several ships, guns bought on fitting, the Asterion Exchange with moving prices |
| **R0.16 Travel and Erebos** ✓ | Micro-ZJ jumps inside a sector (spool by mass, capacitor, hostiles disrupt); the PILLAR gate, sealed until the Current is broken, opens to **Erebos Reach**: Helios Bastion, Cold Cathedral, Mirror Well, Bone Ring, a cold star and its own sky; each sector keeps its operation |
| **R0.17 Loss and wrecks** ✓ | losing a hull loses it and its guns (half their worth stays in your wreck); Covenant cover pays 40% free or 90% bought; you wake in your next hangar ship or a reissued starter; every kill leaves a burnt, tumbling wreck of its own hull with salvage and sector materials, looted with [V] |
| **R0.18 Maps** ✓ | [B] map: the sector plan (landmarks, gate routes, signatures, wrecks, hostiles, your heading; pick to approach or ZJ jump) and the universe of known sectors (gates, security, operations, uncharted regions) |
| **R0.19 Induction** ✓ | the first hour as a nine-step story (fly, fire, listen, dock, refit, break the Current, loot, trade, cross the PILLAR) with rewards, ending at Helios Bastion with an envoy of your civilisation's god |

## Phase C · The living game (to R1.0)
| Release | Delivers |
|---|---|
| **R0.20 Modules** | module slots from MODULE_CATALOG; **mass** as second budget changing handling; active modules (shield boost, armour repair, afterburner) on capacitor |
| **R0.21 Trade** | a market at every station, NPC stock, trade between Asterion and Helios Bastion |
| **R0.22 Contracts and agents** | all 11 canon contracts across sectors; agents per civilisation; standing; Covenant marks and civilisation stores |
| **R0.23 Security** | security level per sector; Warden patrols; legality; pirates where law is thin |
| **R0.24 Research and industry** | the canon research tree; manufacturing modules and hulls from blueprints and materials; mining resource sites |
| **R0.25 Drones** | canon drone wings and AI cores as wingmates |
| **R0.26 Living space** | NPC haulers, patrols, pirates and civilisation fleets moving on routes |
| **R0.27 – R0.29 Sectors** | Aion, Chaos Cradle, Deep Current; the nine Micro-ZJ war worlds |
| **R1.0 Sovereign** | five sectors, a full career from induction to capital command, every system connected |

## Phase D · Content (one piece in every release)
A baked Blender hero hull per civilisation (14), then class variants from each hero's parts and a turret
style per civilisation; stations per civilisation; story arcs from the canon bible; Titans as set pieces.

## Phase E · After R1.0
Co-op on the separated simulation; a persistent universe server; corporations, territory, fleet battles.

## Ground rules
Simulation owns the game; renderers and UI only read it. Content is data validated at load. Hero hulls
are Blender scripts. One smoke run per release.
