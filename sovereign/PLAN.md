# Sovereign Eclipse · Forge plan

Mac owns direction; this is the working order. Each release ships playable with before/after captures.

## Vertical slice (R0.x)

| Release | Delivers | Status |
|---|---|---|
| R0.1 Ignition | engine, capital flight, orbit camera, Naraka Veil, Asterion Forge, black sun, HUD, phone controls | done |
| R0.2 First Blood | lock, weapon groups, EVE-style hit chance, anatomy damage, *Break the Current* | done |
| R0.3 Shipwright | hull blueprints, dock + Elite Shipwright (move nodes, fit guns), Hull Forge tool | done |
| R0.4 Atlas | scanner: the five canon Naraka signatures, detect → triangulate → scan → understand → resolve, research and materials | in progress |
| R0.5 Persistence | versioned save + migration, quota-safe file fallback, continue from launch screen; full slice captures | next |

Slice done = Mac flies all six brief steps on desktop and phone. Then Mac decides flagship.

## Our version of what makes EVE work (design pillars)

Studied as design, built in the Black Current canon: no EVE names, art or content.

1. **Commit to a target, not a crosshair.** Lock, range, transversal, orbit: tactics over twitch. *(R0.2)*
2. **Fitting is a budget with trade-offs.** Powergrid, tiers, node placement; every gun costs something. Add CPU-style second budget and module slots from the original MODULE_CATALOG. *(R0.3 → R1.1)*
3. **Space has layers.** Signatures hidden until you look for them; exploration pays. *(R0.4 → R1.2)*
4. **Loss means something.** A hull is an investment: insurance-style recovery, wrecks to salvage, risk scaled to security. *(R1.3)*
5. **Security tiers.** Warden-patrolled safe space, contested lanes, lawless deep Current: reward rises with risk. *(R1.4)*
6. **A living market.** Station stock, NPC traffic and haulers move goods; prices react; route risk matters. *(R1.5)*
7. **Long arcs.** Research and industry turn materials into hulls, guns and blueprints. *(R1.6)*
8. **Scale.** Frigate to Titan feels different in speed, reach and role; fleets of civilisations. *(R2)*

## After the slice (Mac reorders)

| Release | Delivers |
|---|---|
| R1.0 | Erebos, Aion, Chaos Cradle, Deep Current zones from the original; PILLAR gate and Micro-ZJ jumps between them |
| R1.1 | Module slots (weapon / defence / drive / utility) from MODULE_CATALOG; second fitting budget |
| R1.2 | Full Atlas: signatures across all sectors, destination intel, combat signatures that spawn operations |
| R1.3 | Wrecks, salvage, hull loss with recovery costs |
| R1.4 | Security levels, Warden patrols, legality and faction standing |
| R1.5 | Market: persistent station stock, NPC traffic, trade with route risk |
| R1.6 | Research and industry loops; buy and build hulls from the 252-hull catalog |
| R2.x | Titans and civilisation fleets (270-hull lineage), drone wings, AI cores; co-op on the separated simulation |

## Rules (from the brief)

Simulation separate from rendering · one owner per rule · data-driven content validated at load · small ES modules ·
versioned saves · lean checks (`npm run smoke`), no giant test suites.
