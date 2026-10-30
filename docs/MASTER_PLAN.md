# Black Current: Master Plan to 1.0

**Owner:** Mac (Lycheetah). **Forger:** Athanor. **Written:** 2026-10-29, the night of rc.18.
This is the game's design and production plan. `docs/PLAN.md` holds the live task table and the Route 2 receipts. This file says what the game *is*, the numbers it runs on, and the order we build it in. When the two disagree, this file wins on design and PLAN wins on status.

---

## 1. The game in one breath

> **Build a warship from salvage, fly it into a living, lawless frontier, and climb from a two-gun frigate to a titan that the galaxy names you by.**

- **Fantasy:** a captain in the Black Current (Sovereign Eclipse canon). It is part frontier, part ruin and part war zone, and fifteen civilisations contest it. You are small, then you are feared.
- **Feel:** heavy, physical naval combat in space. Every gun has a report, every hit a clank and every wreck stays.
- **Shape:** top-down action, modular ship building, a seeded open galaxy, short sessions that always pay, and a long climb.
- **Platforms:** browser first, PC and phone equal. Standalone download for itch.io. Co-op later.
- **Who:** players who loved *Bubble Tanks*, *Reassembly*, *FTL*, *Starsector* and *Nova Drift*, and who want depth that grows without a manual.
- **Session:** 5 minutes is worth opening it; 60 minutes is one more frame.

## 2. Five pillars (every feature serves one, or it waits)

| Pillar | Promise | How we prove it |
|---|---|---|
| **Weight** | You fly a warship, not a bubble. | Hit-stop, recoil, report audio and shake by gun class. Wrecks drift. A frigate *feels* different from a battleship within 3 seconds. |
| **The climb never stalls** | There is always a next upgrade within 10–15 minutes. | An economy witness asserts time-to-next-upgrade ≤ 15 minutes at every rung. |
| **A place worth flying through** | Every sector reads at a glance: what is here, what threatens, what pays. | Each Depth has its own palette, terrain kit, music and enemy doctrine. Screenshots are tested per Depth. |
| **Your ship, your story** | Your frame, marks, banner, gates and wingmen are yours. | Ship identity, hull paths, elite trims and the campaign's act choices are saved and visible to others in co-op. |
| **Respect the player's time** | Autopilot, auto-fire, clear routes, phone first-class. | No task needs more than 3 taps from flight. A hands-off route crosses systems. |

## 3. The loops

| Loop | Length | What happens | What it pays |
|---|---|---|---|
| **Contact** | 20–40 s | A patrol, a lane ambush, a landmark guard: fight, wreck, salvage. | Metal, parts, the odd fitting. |
| **Upgrade** | 10–15 min | Spend at a station: a gun rank, a deck, a fitting, a training step. | A visible power step. |
| **Session goal** | 30–60 min | A job, a derelict dive, a rift seal, a daily goal, a campaign beat. | Elite cores, reputation, named gear. |
| **Horizon** | Hours | The next frame, the next elite mark, the next act, your first gate network. | A new class, a new title, a new region. |
| **Living galaxy** | Daily, weekly | Rift modifiers rotate, warlords roam, station stock turns, faction front lines move. | Reasons to come back today. |

## 4. Systems

### 4.1 Flight and combat
- Mass-based flight: cruise scales with frame, and the lens keeps your hull readable on phone.
- Combat **reads by silhouette and sound**: each family has a shape, a colour and a report.
- **Feel kit:** hit-stop on heavy hits (30–80 ms), shake scaled by class, recoil push, muzzle flash, shell casings, hull impact decals, drifting wrecks you can salvage.
- **Auto-fire (setting):** guns engage the nearest target in arc and range while you steer. Default on for phone, off for PC.
- **Autopilot:** flies the plotted route through gates and systems. It stops on contact, on damage, or when you touch a control.

### 4.2 Ships: the ladder (nine frames, from canon)

| Rung | Class (canon) | Sections | Role in the climb |
|---|---|---|---|
| 1 | Frigate | 10 | First build: two Novice guns. |
| 2 | **Destroyer** (new) | 14 | First Light deck; your first real gun line. |
| 3 | Cruiser | 18 | Three or four guns; your first utility build. |
| 4 | **Heavy Cruiser** (new) | 24 | Medium batteries; the elite cruiser lives here. |
| 5 | **Battlecruiser** (new) | 28 | Fast heavy hitter; the first heavy deck. |
| 6 | Battleship | 30–36 | A gun line that holds a lane. |
| 7 | Dreadnought (today's "capital") | 48 | Spinal mount, hangar. |
| 8 | Carrier (today's "supercapital") | 72 | Wings and drones. |
| 9 | Titan | 96 | City-scale; the galaxy names you. |

- **Hull paths (per frame):** interceptor, assault, logistics, carrier and siege. Each trades a few `tuning` multipliers.
- **Civilisation signatures:** liveries, clip-ons and a signature gun per civ, unlocked by reputation.

### 4.3 Guns: depth without creep
- **Classes:** Point → Light → Medium → Heavy → Siege → Capital, each roughly 2× the damage per second of the one below (measured: 45 → 102 → 180 → 380 → 595 → 1,235).
- **Families:** kinetic, rail, beam, missile, ordnance, each with archetypes.
- **Ranks 1–10 per gun type:** raised with metal at the Armoury. Each rank is about +5% damage and +1% fire rate, so rank 10 is about +55%. This is the 10–15 minute upgrade that keeps the climb moving between frames.
- **Elite marks Mk I, II, III:** a rank-10 gun plus **elite cores** refits to an elite mark, giving +25%, +55% and +90%, plus a trait slot and gilded trim. A Mk III rank-10 gun hits about 2.9× stock, roughly one class up. That is Mac's elite cruiser: three Mk III cannons defend it like a battleship's line. Not two lines: it still lacks the hull, the sections and the deck count.
- **Uniques and sets:** derelict-only uniques (+25% plus a signature trait) and three-piece sets. Already in the game.
- **Creep guard:**
  - threat is fixed by place (`tuning.ROWS`);
  - elite marks cap at III;
  - elite cores are scarce, coming only from dives, rifts, citadels, warlords and the daily board.

### 4.4 Economy

| Currency | Faucets | Sinks |
|---|---|---|
| **Metal** | Kills (`ROWS[d].bounty`), holds, rifts, jobs, citadels | Frames, training, decks, guns, ranks, gates, upkeep |
| **Biomass** | Kills, salvage | Frame mass gates |
| **Elite cores** (new) | Derelict holds, rift seals, citadels, warlords, daily board | Elite marks, hull paths |
| **Reputation** (per civ) | Jobs, campaign, pledges | Opens stock, liveries, signatures, discounts |

**Time targets** (to be measured by the economy probe before any re-price):

| Step | Target |
|---|---|
| First gun rank | 5 minutes |
| Destroyer | 15 minutes |
| Cruiser | 35 minutes |
| Heavy cruiser | 1 hour 15 minutes |
| Battlecruiser | 2 hours |
| Battleship | 3 hours |
| Dreadnought | 6 hours |
| Carrier | 10 hours |
| Titan | 20+ hours |
| Each elite mark | 1–2 sessions |

### 4.5 World
- **96 seeded systems** in the **Five Depths**: Naraka (home, Asterion Forge), Erebos (cold military frontier), Aion (archive-space), Chaos Cradle (unstable) and the Deep Current (dead capitals, unknown signals).
- **System rules:** Black Sun, Riptide, Foundry Storm, Swarm.
- **Sector content:** terrain (rock, ice, wreck, gas, lanes, black holes), landmarks (ring and gate ruins, derelict titans, faction buoys), derelict dives, rifts, citadels, roaming warlords, and the Grave Choir.
- **Canon set-piece worlds:** the PILLAR (central warp gate), Aether Crucible, Black Sun March and Grave Choir. The last three become Micro ZJ war worlds, each a multi-stage zone.
- **Encounter density:** contact every 20–40 s in open space. Groups gather at landmarks and lanes. Danger is readable on the map before you jump.

### 4.6 Factions and the campaign
- **15 civilisations, each with:**
  - doctrine;
  - fleet style;
  - a canon rival (taken from the canon's Galactic Relations);
  - reputation tiers: Hostile, Stranger, Known, Trusted, Honoured, Exalted.
- **Campaign: three acts on the places that exist.**
  - **Act I:** the Forge at the edge.
  - **Act II:** the Banner War. You pledge, then fly a Riptide convoy, a siege and a Black Sun chase.
  - **Act III:** Warlords and Citadels, ending in the Grave Choir.
- **Cast:** roles, not invented names. The Asterion dockkeeper and fifteen envoys.
- **Jobs:** escort, defence, courier and bounty, three per station, rotating every two hours.
- The full spec is in PLAN, Stage 3.

### 4.7 Fleet, bases and gates
- **Wingmen:** 1–3 escorts built from your saved designs, with orders (follow, attack, hold, guard), rebuilt at stations.
- **Bases:** structures grow into a base (refinery, berth, hangar, defence grid). Raids come with warnings.
- **Buildable jump gates:** beacons grow into gates.
  - Link any two of your gates; flying through one jumps you to the other.
  - Gates show on the chart, cost upkeep and can be raided.
  - Late game: tap into the PILLAR network.

### 4.8 Together (co-op)
- Peer-to-peer with the host's browser running the fight, by room code.
- Content: dives, rifts, warlords, citadels.
- Loot is personal. Downed allies can be revived. A 30-second reconnect window.
- PeerJS relay, pending Mac's confirmation.

### 4.9 Endgame
- Titan hunts (warlords) and citadel sieges.
- The Deep Current's dead capitals become multi-stage raids.
- Elite Mk III collections.
- A sovereignty gate network: your gates across the Depths.
- Seasonal rift ladders.

## 5. Art direction (the backgrounds are the bar)
- **Painterly space backdrops** per Depth: nebula, starfield and a distant body. These are already the best thing on screen.
- **Terrain must match them:**
  - painted rock, ice and wreck sprites per Depth, never flat tinted blobs;
  - gas as layered volumetric colour;
  - lanes as light streams.
- **Ships:** clean silhouettes; hull plating shaded from one light direction; faction trims; elite marks gilded; damage states.
- **Effects:** additive flashes, sparks, debris and shock rings, with intensity scaled by class.
- **HUD:** thin, dark glass with brass and cyan accents, tight to the edges; nothing over the centre third.
- **Source:** `docs/ART_CODEX_BRIEF.md` (P0 terrain kits and landmarks; P1 titans, fleet kits and portraits; P2 backdrops and store). Procedural fallbacks use its palettes.

## 6. Audio direction
- Warship audio (rc.18): reports, clanks, klaxons, war drums and a brass drone; no chimes.
- **Next:**
  - per-Depth ambience beds;
  - per-civ fleet signatures (a horn or a choir);
  - a boss motif per warlord;
  - Doppler on fly-bys;
  - the low-hull alarm as a ship klaxon.

## 7. Technical budgets
- **Frame rate:** 60 fps on a mid PC at 1366×768 in a 20-ship terrain fight; 45 fps on a mid phone.
  - Measured tonight: about 11 fps headless, 17–21 on Mac's PC. `drawImage` takes 32% of CPU time, so it is the first target.
- **Memory:** under 600 MB. Sprite caches are shared.
- **Save:** one document with append-only migrations; never lose a ship.
- **Tests:** every feature ships with a witness, and the gate stays green.

## 8. Money (Mac decides; no payment code until he does)
- Free to play, with no pay-to-win.
- A **supporter tier** (donation) could unlock cosmetics, a supporter badge and early access to new hulls' liveries.
- **Auto-fire as a supporter perk:** the risk is that phone players need it for comfort. Two options:
  - free on phone and supporter-only on PC;
  - free for all, with a supporter-only cosmetic auto-fire tracer.
- **Recommendation:** auto-fire stays free; supporters get cosmetics.

## 9. Milestones to 1.0

| Milestone | Name | Contents | Exit criteria |
|---|---|---|---|
| **M1** (tonight) | **Weight and the Climb** | Frame rate; economy probe and re-price; enemy density; gun ranks; elite marks; destroyer, heavy cruiser and battlecruiser; autopilot; auto-fire; buildable gates | 50+ fps headless-equivalent; every rung ≤ 15 minutes to the next upgrade; rc.19 published |
| **M2** | **A Place Worth Flying** | Visual rehaul pass 1 (terrain, gas, lanes, effects, HUD); feel pass; per-Depth ambience | Screenshot set per Depth approved by Mac; rc.20 |
| **M3** | **The Living Current** | Campaign Acts I–III; jobs; reputation; daily board; warlord weekly | A new pilot reaches Act II in 2 hours; rc.21 |
| **M4** | **Fleet and Banner** | Wingmen; hull paths; civ signatures; bases; PILLAR network | An elite cruiser with two wingmen clears a danger-8 citadel |
| **M5** | **Together** | Co-op slice (dives, rifts, warlords) | Two players on two networks finish a rift |
| **M6** | **1.0 Launch** | Onboarding; phone pass; trailer; itch.io page; standalone; save hardening | Five strangers play an hour without help |

## 10. Tonight's run (M1, in order)

**Frame rate**
1. Kill the `drawImage` hotspot: find each per-frame full-screen or oversized blit (backdrop, terrain sprites, lighting canvas) and cache or downscale it.
2. Cap particle and projectile draw cost. Batch same-colour shots.
3. Re-profile both scenes (terrain and boss). Commit before and after numbers.

**Economy**

4. Economy probe: metal per minute by danger band against every price, written to `docs/ECONOMY.md`.
5. Re-price frames, training, decks and guns to §4.4. Add an economy witness.

**Enemy placement**

6. Measure time-to-contact and density per class in big rooms, then fix the director and spawn spread.

**Guns**

7. Gun ranks 1–10: Armoury UI, saved per weapon, damage hook, HUD pips, `witness-gun-ranks`.
8. Elite cores: drops from holds, rifts, citadels and warlords, shown in the wallet.
9. Elite marks Mk I–III: refit at the Armoury, damage hook, gilded trim, a duel witness.

**Ships**

10. New rungs (destroyer, heavy cruiser, battlecruiser) in `modularShips.HULLS` and `tuning`, with migration of today's ranks. Update the one-scale and climb witnesses.

**Travel**

11. Autopilot (a key and a button), stopping on contact or input. `witness-autopilot`.
12. Auto-fire setting. Witness check.
13. Buildable jump gates with linking, the chart and upkeep. `witness-gates`.

**Release**

14. Run the full gate. **Ask Mac → publish rc.19.**

**Research**

15. **Research → rebuild the plan → continue (always the last step).** Research: re-play the live build through the probes (first hour, cruiser climb, phone), re-read Mac's notes, and compare against the reference games. **Rebuild:** rewrite §9 and §10 (and the PLAN table) from the findings, ending again with this step. **Continue:** start the new first item at once.

## 11. Risks

| Risk | Guard |
|---|---|
| Frame rate keeps sliding as content grows | A profile witness with a budget; each new layer must show its cost. |
| Power creep from ranks and marks | Threat fixed by place; marks capped at III; cores scarce; a duel witness. |
| Ladder change breaks saves | Append-only migration maps old ranks onto the new ladder; a reload witness. |
| Scope sprawl | Every item names its pillar and its witness; anything without both waits. |
| CI blocked (GitHub Actions has no runner) | Local gate before every publish. Mac checks billing and Actions settings. |

## 12. The research loop (the last task of every plan, always: research → rebuild the plan → continue)
After each milestone:
1. **Play:** run the scripted probes (new pilot, first hour, climb, phone), plus Mac's notes.
2. **Measure:** frame rate, time-to-upgrade, contact rate, deaths, and where players stop.
3. **Compare:** onboarding, juice and loops against the reference games.
4. **Replan:** rewrite §9 and §10.
5. **Continue.**
