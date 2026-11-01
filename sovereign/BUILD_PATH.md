# Sovereign Eclipse · Full build path

The road from today's build to the full game. Order: **core engine → UI and menus → gameplay → content →
scale**. Each release is playable, published, and shown with captures. Checks run once per release
(`npm run smoke`), not after every change. Mac reorders anything.

**The game:** a capital-ship space RPG in the Black Current. You fly heavy ships you build node by node,
fight with tactics, read hidden space through the Atlas, earn standing among fifteen civilisations, and rise
from a Green Seed at Asterion to Titan command. Single-player first, then co-op, then a persistent universe.
Browser, desktop and phone, one link. *"The light you carry is not given; it is earned."*

## Phase A · Core engine (now)
| # | Delivers | Status |
|---|---|---|
| A1 | merged draw calls, leak fixes, MSAA, baked sky + star layer, quality levels, dynamic resolution, perf readout | done |
| A2 | calmer image (glow, grain, fringe as settings), higher resolution caps | done |
| A3 | turret and tracer batching, ship level of detail by distance, WebP textures, loading progress | next |
| A4 | **audio engine**: engine hum by throttle, weapons per turret type, impacts, shields, UI, ambient sector drone (procedural Web Audio, no files) | |
| A5 | phone pass: touch layout per screen size, battery-friendly 30 fps mode, measured on real devices | |

## Phase B · UI and menus
| # | Delivers |
|---|---|
| B1 | pause menu and settings (graphics, resolution, glow, controls, HUD size) | done |
| B2 | title screen: New / Continue / Settings / Credits, pilot name, save slots |
| B3 | one UI kit: panels, buttons, tabs, tooltips, sounds; every screen built from it |
| B4 | station services shell: Hangar, Shipwright, Market, Contracts, Research, Industry |
| B5 | maps: sector map (3D, landmarks, signatures, routes) and universe map (sectors, gates) |
| B6 | first-hour flow: launch tutorial, guided first fight, first refit, first scan |

## Phase C · Gameplay core
| # | Delivers |
|---|---|
| C1 | **universe layer**: Naraka, Erebos, Aion, Chaos Cradle, Deep Current; PILLAR gates and Micro-ZJ jumps; per-sector scenes |
| C2 | **fitting depth**: module slots (weapon, defence, drive, utility) from MODULE_CATALOG, second budget, ammo/charges |
| C3 | **economy**: salvage as currency, station markets and stock, buy and sell, trade routes with risk |
| C4 | **operations**: every canon contract, waves, bosses, rewards, repeatable sites from signatures |
| C5 | **progression**: research tree and industry recipes from the original data, building and buying hulls |
| C6 | **factions**: standing with fifteen civilisations, security levels, Warden patrols, legality |
| C7 | **loss**: wrecks, salvage, hull loss and recovery cost |
| C8 | drones and AI cores (original DRONE_CATALOG), fleet wingmates |
| C9 | living space: NPC traffic, haulers, pirates, civilisation fleets on routes |

## Phase D · Content
| # | Delivers |
|---|---|
| D1 | a baked Blender hero hull for each of the 14 civilisations (design sheets in docs/ART_DIRECTION_SHIPS.md) |
| D2 | class variants per civilisation from each hero's parts; turret styles per civilisation |
| D3 | stations per civilisation; the nine Micro-ZJ war worlds from the original |
| D4 | story arcs from the canon bible; civilisation questlines |
| D5 | Titans as set pieces; the 270-hull lineage completed |

## Phase E · Scale
| # | Delivers |
|---|---|
| E1 | co-op on the separated simulation (authoritative host, WebRTC or a small server) |
| E2 | persistent universe server: accounts, shared market, territory |
| E3 | MMO: player corporations, sovereignty, large fleet battles |

## Ground rules
- The simulation owns the game; renderers and UI only read it. One owner per rule.
- Content is data validated at load. Hulls are blueprints; hero hulls are Blender scripts.
- Lean checks: one smoke run per release; no test suites per feature.
