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
| **R0.16 Maps** | sector map (landmarks, signatures, routes, jump targets) and universe map (sectors, gates, security) |
| **R0.17 Induction** | the first hour as a story: Asterion induction chain (fly, fight, refit, scan, sell) with rewards, ending at your civilisation's agent |

## Phase C · The living game (to R1.0)
| Release | Delivers |
|---|---|
| **R0.18 Travel** | Micro-ZJ jumps inside a sector (align, spool by mass, jump); the PILLAR gate to **Erebos**, a second sector scene |
| **R0.19 Modules** | module slots from MODULE_CATALOG; **mass** as second budget changing handling; active modules (shield boost, armour repair, afterburner) on capacitor |
| **R0.20 Market** | station markets: NPC stock, buy and sell, prices that move with supply; trade between sectors |
| **R0.21 Contracts and agents** | all 11 canon contracts across sectors; agents per civilisation; standing; Covenant marks and civilisation stores |
| **R0.22 Loss and wrecks** | losing a hull loses the hull and fitted guns; wrecks with loot; salvaging; Covenant cover pays part back |
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
