# Black Current: the master plan

The one plan for every AI seat and every human working on this repo: a single
route, worked top-down. Read it before you start; update it before you stop.

## Where we are (2026-10-30)

Route 1 and Route 2 are built. Their receipts live in `CHANGELOG.md` and the git log, not here.
- **Live:** 2.23.0-rc.28 "GPU". **Candidate:** none.
- **Route 2, built:**
  - Stage 1: map and places.
  - Stage 2: dungeons (dives and rifts).
  - Stage 3: campaign.
  - Stage 4: identity (hull paths, gun mods, wingmen).
  - Bases.
  - The arsenal pass (sized modules, family jobs, second guns).
  - Stage 5: co-op slice 1.
- **Next:** Route 3 below, Mac's playtest list (2026-10-30). Work it top-down.

| Stage | Outcome | Done when |
| --- | --- | --- |
| 0. Ship and steady | A suite you can trust, one menu kit | Done. The gate has 64 witnesses. CI is off (GitHub Actions billing is not enabled, per Mac). |
| 1. Map and places | Zones sized for your ship, landmarks, a real map, a sound mix | Done (rc.16). |
| 2. Dungeons | Derelict dives and rifts with their own loot | Done (rc.17). |
| 3. Campaign | A story spine through the places | Done (rc.21). |
| 4. Ship identity | Hull paths, gun mods, wingmen, sized modules | Done (rc.22 to rc.25). |
| 5. Co-op | Friends in the same fight | Slice 1 is in rc.26. Slice 2 is carried forward. |
| 6. Ready for players | v3.0 for strangers | Station doors, onboarding cards, Mac's phone pass, trailer, itch.io, 3.0.0. |

## Route 4 · Mac's direction (2026-10-30 evening): work it top-down

Mac, verbatim in short:
- "fps is insanely bad … how do we give sick graphics to this game, its probably via ship art, its time to clean our game engine up";
- "danger 7 is no risk for even a … carrier";
- "outranked [enemies] never kill you even when afk";
- "on mobile you cannot see the ship fitting screen properly … we need pinch to zoom";
- "we may need actives to make this game fun";
- "eve's weapons … I love the sound of autocannons, people love lasers … the soundscape's terrible";
- "build the true world scale … trading stations, NPCs and jump freighters doing their own thing … a mini universe so the longer people's games go the more accumulates";
- "build the galaxy with the areas of our great races and bring some lore … industry missions and bounty hunting for high-value NPCs … every aspect [of EVE] in a toned-down, much more fun way".

Mac picked: publish rc.27 now; then a WebGL renderer; then danger and actives.

| # | Item | What done means |
|---|---|---|
| 1 | **rc.27 published** ✓ | Live on Pages (3cd75c3). |
| 2 | **WebGL renderer** (Mac's pick; ✓ stages 1-2 and bloom, live in rc.28; next: stage 3 ships, 8b) | A GPU drawing layer behind a setting, built in stages: backdrop, ships and sprites, shots and particles, then glow and lighting. Game logic and art stay the same. Proof: fps before and after on the benchmark fight and on a phone profile; screenshots match the Canvas path; the Canvas path stays as a fallback. |
| 3 | **Danger that hurts** ✓ (deep-danger.js) **+ actives** ✓ (actives.js) | Danger 7+ can kill a carrier. Outranked enemies kill an idle ship. Active modules (afterburner, shield booster, EMP, overload) are fitted to slots and fired on keys or phone buttons. Proof: a duel witness (an AFK battleship dies at danger 7+) and an actives witness. |
| 4 | **Phone fitting: pinch to zoom** ✓ (fitting-zoom.js, rc.28) | The fitting screen opens fitted to the ship; pinch and drag zoom and pan it. |
| 5 | **Weapon sound and soundscape** | EVE-style reports: autocannon chatter, laser hum and crack, rail, missile, ordnance. A soundscape pass per region. |
| 6 | **Living universe** | Trading stations; NPC traders and jump freighters running routes in the background; a world that keeps state and builds up over a long game. |
| 7 | **Galaxy, races and lore** | Regions for the great races (canon), lore in places, industry missions, high-value NPC bounties. |
| 8 | **Ready for Cael's art drop** ✓ (art-drop.js, import-art.py, docs/ART_CAEL_BRIEF.md; modules, hulls and effects are wired next) (Mac: "I'm going to have Cael generate an absolute boat load of art") | Ships, guns and modules load from art folders and manifests, so new art lands without code changes; the GPU stages draw it cheaply. |
| 8b | **2.5D ships** (Mac: "I want the game's ships maybe 2.5D") | WebGL stage 3: hull sprites on the GPU, lit with normal maps (Cael supplies them; approximate ones are derived from today's art). Drop shadows, a bank in turns, turrets above the deck. |
| 9 | **Larger zones again** ✓ (room 6 → 8 ship-lengths) (Mac: "the zones you're in can be larger again") | Room scale up again per frame, filled with places and traffic. The GPU stages pay for it. |
| 10 | **More guns and ships** (Mac: "needs more guns, ships") | New gun families and a hull line per great race, folded into item 7. |
| 11 | **Research → rebuild this plan → continue** | The standing last step. |

## Route 3 · Mac's playtest list (2026-10-30): work it top-down

The numbers are the items in Mac's 72-point playtest list. Mac's top five are B to F, in his order. Claims are verified as each item is worked; a claim found wrong is deleted, with one line of why in the commit.

| # | Item | What done means |
|---|---|---|
| A | **Frame rate** (Mac: "the fps is so so bad") | The benchmark fight scene runs faster than rc.19. Headless today: rc.19 is about 25 fps, now about 23. Fix the biggest measured layers (radar, ship ring, drops and projectiles each cost 5–7 ms of a 21 ms render). Proof: `profile-render` and an rAF probe, before and after. |
| B | **1, 2, 3, 10 · A first hour that pays** | The first sectors east of home hold contact within about 10 s. Early kills pay enough to reach the first Light upgrade (144 metal) from fighting, not only from contracts. The starting contracts suit a new pilot. Proof: a new-pilot witness measures time to first contact and metal by minute 10. |
| C | **14–17 · One build door, a short pause menu** | One way into building (no Build, Shipyard, Modular Shipyard and Captain/Build overlap). The pause menu is about 6 buttons. Dev tools (guardian capture, trailer) are hidden unless `?dev` is set. |
| D | **11–13 · One name for each thing** | Metal is called Metal everywhere (no "mass"). Each place has one name across the HUD and the station. |
| E | **19–22, 33–39 · Layout fixes** | The new-game screen fits (quick launch, the civilisation grid, the crew row, the section count). On phone, the dock prompt clears GUARD and Cruise and shows no keyboard key; the pause glyph is fixed; there are fewer buttons on screen at once. Proof: phone-layout and title screenshots at 390×844 and 844×390. |
| F | **53 · Tests on every push** | CI needs GitHub Actions billing, which Mac has not enabled. Until then, a local pre-push hook runs the core witnesses. |
| G | **4–9 · Feel and identity** | Fight length, a rookie's shield or regen, hero-ship scale at the default zoom, the enemy-to-player size read, and a backdrop and landmark per sector. |
| H | **18, 23–32 · UI polish** | The title art, the empty right half of the title, the shipyard wording ("Fits here" against "Ready to fit", the command core label, HP shown while building), short steps instead of a paragraph, overlapping labels, the radar, and the desktop HUD. |
| I | **40–61 · Project hygiene** | 40: phone pass on Mac's device. 44: the forge-reset save wipe. 45: cloud save (a decision for Mac). 46–49: repo and download size, duplicate art. 50: Pages deploys from `main` in `pages.yml` while the plan says `gh-pages`. 51: missing GAME_VISION and CLAUDE files and README §Laws. 52: the danger cap. 55: Firefox for `npm test`. 56: receipts in `shots/`. 57–59: the README pitch and the package description. 60: duplicate meta tag. 61: offline fonts. |
| J | **62–72 · Already built, check them against the list** | Loot, outer rings, danger bands, boss scaling, capital modules, the titan endgame, wingmen, co-op, landmarks, NPCs and fleet balance all exist. Find out why Mac's playthrough didn't meet them (reach, signposting) and fix that. |
| K | **Research → rebuild this plan → continue** | The standing last step. |

## Carried forward (open work from earlier runs)

1. **Co-op, slice 2:**
   - revive instead of the timed rebuild;
   - a reconnect window;
   - travelling together (the friend follows the host's jumps);
   - the friend's gun ranks, mods and hull path on their ship;
   - a host-side "friend down" HUD;
   - Mac's two-network check.
2. **Frame rate:** projectiles, particles, motes, and unskinned modular hulls.
3. **Visuals:** flashes and sparks, ship shading.
4. **Jump gates:** an upkeep cost.
5. **Test debt** (named reds):
   - sprites: retarget to escorts or freighters under Ultra;
   - hangar-ui inspector scroll (a layout call);
   - faction-fleets sprite coverage, 10 of 12;
   - release-candidate art check (on Mac's machine).
6. **Stage 6, ready for players:** see the table.
7. **Research → rebuild this plan → continue** (the standing last step, Mac's rule): probe the live build, measure, rewrite this list from the findings with this step last again, and start its first item straight away.

### Decisions in force

1. The six core files are open to edit, under behaviour witnesses.
2. Saves are migrated, never reset.
3. `art/` is used first; Antigravity keeps the module and cosmetic art lane.
4. Threat stays fixed by place and never reads the player's power. Zone size may read the player's frame (room, not threat).
5. **Small drops:** a candidate every step or two, published on Mac's word.
6. **Co-op is peer-to-peer and host-authoritative**, linked by swapping two codes by hand. There is no relay and no server; a public STUN server is opt-in, for crossing networks (Mac: "not sure we need the relays at all").
7. **CI is ignored** until Mac enables Actions billing. Don't investigate or report the red `witnesses` check.

### Parked (not deleted)
- **Persistent shared galaxy, trading, PvP:** only after co-op works.
- **Optional mechanics:** adjacency bonuses, a volatile hold, a fitting-reduction preview. Never add these by implication.
- **Mining and industry:** only if players ask.

### What makes the game worth returning to

Visible ship growth, distinct fights, upgrades you can see coming, memorable places, and a friend to share them with.

## Rules (every seat follows these)

1. **Follow Mac’s latest direction.** Work the route in stage order; keep each build batch bounded.
2. **One plan.** This file is the master route. Dated docs (`PLAN_WEEKEND_BLITZ_*`, `HANDOFF_*`, `docs/research/*`)
   are history and sources, not plans (`PLAN_2026-08-17.md` and `PLAN_FPS_AND_FUN_2026-10-23.md` included). If you find a second to-do list, merge it here and say so in your commit.
3. **Delete finished work.** When an item is done, delete it from this file in the same commit that lands it.
   The receipt lives in the commit message, not here. Done items do not stay as ✅ lines.
4. **Done means witnessed.** You can delete an item only when the thing works in the running game (a screenshot
   or a witness script) and `npm test` is no worse than before. A green test alone is not done. Phone feel and fun
   are Mac's call. Mark phone-unchecked work `PHONE: pending`.
5. **Delete dead ideas too.** If Mac rejects an item, or the evidence kills it, delete it and put one line of
   why in the commit message.
6. **Keep it short.** Each item gets a name, what done looks like, and where it touches the code. No essays.
   Detail goes in code comments or a handoff.
7. **Order is priority.** Work top-down unless Mac says otherwise. Mac can reorder at any time.
8. **Claims carry a label.** Line counts and effort guesses are guesses (UNVERIFIED) until someone builds them.
9. **Laws still apply.** README §Laws, `GAME_VISION.md`, `CLAUDE.md`. Classic scripts only, guard with `typeof X`.
   The six core files (`engine.js`, `hardpoints.js`, `fleet.js`, `weapons.js`, `progression.js`, `shipyard-ui.js`)
   may be edited directly from Stage 0 on; behaviour witnesses, not byte hashes, protect them.
10. **Keep live tasks current.** Update the table below at build milestones. Only one task is running; queued,
    blocked and awaiting Mac's test are distinct. Done carries evidence. The local task viewer reads this file,
    so never create a second progress database or mark planned work as completed.

## Live tasks

The live viewer reads the local working copy. A GitHub commit is a timestamped
snapshot of this table, not an automatic activity feed.

<!-- live-tasks:start -->
Project: Black Current
Published: 2.23.0-rc.28 · GPU (preview) · live on Pages (gh-pages 2bfc3b2, cache 20261030s83)
Candidate: none
Focus: Route 4: 2.5D ships (WebGL stage 3), weapon sound, more guns and ships, living universe.
Updated: 2026-10-30T12:00:00+00:00

| ID | Status | Task | Evidence / next step |
| --- | --- | --- | --- |
| stage-0-ship | done | A suite you can trust, one menu kit | 64-witness gate; CI off (billing). |
| stage-1-places | done | Map and places | rc.16. |
| stage-2-dungeons | done | Dives, rifts, uniques and sets | rc.17. |
| stage-3-campaign | done | Acts, cast, missions, jobs, reputation | rc.21. |
| stage-4-identity | done | Hull paths, gun mods, wingmen, sized modules | rc.22 to rc.25. |
| stage-5-coop | done | Co-op slice 1 (code handshake, host runs the game, personal loot) | rc.26, `witness-coop` 7/7. Slice 2 is carried forward. |
| stage-6-players | queued | v3.0 for strangers | Station doors, onboarding, phone pass, trailer, itch.io, 3.0.0. |
| fps | running | Frame rate back above rc.19 | Benchmark fight scene: rc.19 24–26 fps; rc.25 and rc.26 16.5 fps (headless). Find what regressed. |
| route-3 | running | Mac's playtest list, items A to K | A to E done, phone items 33-38 done. F to K remain. |
| route-4 | queued | Mac's direction: WebGL renderer, danger and actives, then sound, living universe, galaxy | See Route 4. rc.27 published. |
<!-- live-tasks:end -->

## Art library (`art/`, use before commissioning)

| Folder | Holds | Live now | Stage |
| --- | --- | --- | --- |
| `keyed/modules/`, `sliced/modules/` | 215 module and turret pieces (`manifest.json`) | Fitting art | 2, 4 |
| `keyed/sections/` | 10 modular hull tiles | Player hulls | 1 |
| `keyed/ships/`, `sliced/ships/` | 36 whole-ship sprites, Asterion and alien/precursor | Partly | 1 (enemy pools) |
| `keyed/enemy-ships/` | 17 enemy hulls | Partly | 1 |
| `keyed/hostiles/` | Hostile fleet sheet (`hostile-kit.json`) | Enemy skins | 1 |
| `keyed/turrets/`, `light_guns/`, `heavy_guns/` | Turret and gun art | Partly | 2 |
| `keyed/precursor_weapons/`, `alien_weapons/` | Solar lance, tachyon driver, bio dart, spore mortar | Not yet | 2 |
| `keyed/alien_blocks/`, `precursor_blocks/`, `armor/` | Carapace, heart, rib cage, keel, solar citadel, citadel slab | Not yet | 5, 6 |
| `keyed/structures/`, `keyed/world/` | Refit station, solar ring | Stations, boss arena | 5 |
| `concepts/`, `contact_*.png` | Concept sheets and contact sheets | Reference | — |

`faction-kit.json`, `hostile-kit.json` and `world-kit.json` select assets for the game.
Incoming art stays preserved; accepted pieces get manifest rows.

## Deploy (main is NOT the live site)
GitHub Pages serves the **`gh-pages`** branch, not `main`. Pushing `main` changes nothing Mac can see.
Prepare the selected-source candidate with `python3 scripts/build-candidate.py`.
This includes tracked assets and referenced JS/CSS from the working tree while
excluding unselected incoming art. Review `shots/release-candidate/package.json`
and run `npm run test:candidate` with muted audio before a release decision.
To publish that reviewed candidate: copy `dist/release-candidate/` over a `gh-pages` worktree → commit
"Publish ..." → push `gh-pages` → wait for `gh api repos/Lycheetah/black-current/pages/builds/latest` to say
`built` → check the live `play/` page shows the new `v=` cache token. Publish only on Mac's word.

## Standing rulings from Mac
- **Modular stays (latest):** use the original large node ships as silhouette references for modular capitals. Decompose bridge, keel, bow, armour, engines, hangars and batteries into coherent top-down parts. Weapon access and phone blockers come first; any later living uniques share the existing hangar/save infrastructure.
- **Latest playtest (2026-10-26):** opening sectors 0,2 and 0,3 must be beatable with a three-gun rookie; expand normal sector grids by three rings. Enemy roles must look different. Reduce excessive equipment drops and check actual weapon DPS. Keep entry fitting obvious; premades are valuable.
- **Current opening/refit ruling (2026-10-26):** build-first, premades optional; starter frigates have ten sections, two supplied guns and a four-weapon cap. Ordinary weapons use one hardware price. Owned fittings may be swapped in the field; new purchases and structural rebuilding use stations. Retire obsolete vow overlays and favour polishing existing systems. Show Metal and Biomass together.
- **Latest ruling:** retire the old freeform fitting screen; modular is the visible fitting screen. Reset old development campaigns once for the new novice fleet (Mac, current session).
- **"Modular ships is the way"** (Mac, 2026-10-25): modular is where new depth and art go first.
- Test a build free with **Test flight · free** (modular yard) or **HOLO TEST · free** (classic yard, desktop).
- Test any build with `?forge-test` (gives 999,999 metal).

## Canon (Mac's Sovereign Eclipse lore, the game's own lineage)
`docs/canon/` holds Mac's canon: the **Master Canon Bible** (canonical; it contains the full Pantheon Codex),
the **15-civilisation Pantheon** and the **270 faction hulls**. `js/canon.js` is the same canon as game data:
15 civilisations (doctrine, fleet DNA, favoured weapon, relic, frontier), the 18-class ladder
Pod → Starter Frigate → … → Dreadnought → Carrier → Titan, 270 hull names, and the Five Depths
(Naraka · Erebos · Aion · Chaos Cradle · Deep Current). Canon wins naming disputes. New factions, enemies,
stations and hulls take their names and look from it.

## North star (Mac, 2026-10-25)
"Focus on making the main game fucking epic": ships buildable to **capital proportions**, **bases** you build,
**many kinds of enemies**, a **deep space with anomalies**, and **EVE-like quests and bounties with NPCs to talk
to**. Mining and industry are parked: build them only if players ask for them.

## Sources
- `docs/canon/`: Mac's Sovereign Eclipse canon (see Canon above). `js/canon.js` is its data form.
- `docs/research/RETENTION_DOSSIER_FOR_SOL_OPUS.md`: a Gemini research pass on Starsector, Space Rangers 2,
  Cosmoteer, Dredge and EVE (historical design input; its line counts are UNVERIFIED).
- `HANDOFF_2026-10-25_menus_loot.md`: local only, the session receipts behind the top-down hulls and clip-ons.
