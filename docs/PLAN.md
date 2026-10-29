# Black Current: the master plan

The one plan for every AI seat and every human working on this repo: a single
route, worked top-down. Read it before you start; update it before you stop.

## Overnight run, explicit (Mac asleep, 2026-10-29 → 30)

Athanor works these in order without stopping, one commit and push per step, a witness per feature. If a step blocks, write why in its row below and move to the next.

1. **Frame rate: rc.19 is live** (scene 11–15 → 24–26 fps headless; playtest +1k metal / +500 biomass buttons shipped with it). **Still open:** projectiles, particles, motes, and the unskinned modular hulls.
   - **Done so far:**
     - backdrop painted at 0.6 scale;
     - far and wash caches sized to their pixels (background 25 → ~8 ms);
     - hostile skins cached at drawn size and pre-rotated into 48 angles with a 64 MB LRU (20 enemies 32 → 13.5 ms).
   - **Next:**
     - projectiles (batch the sprites, no per-shot rotate);
     - the player ring `shadowBlur`;
     - the terrain draw;
     - modular (unskinned) enemy hulls;
     - the HUD's DOM writes per frame.
   - **Exit:** re-profile both scenes, numbers in the commit, gate witnesses green.
2. ✅ **Economy probe** (done: `scripts/probe-economy.mjs`, `docs/ECONOMY.md`). `scripts/probe-economy.mjs` → `docs/ECONOMY.md`: metal per minute per danger band against every price on the ladder.
3. ✅ **Re-price the climb** (done with step 7: `witness-climb` 7/7, titan at 8.8 h census, steps 0.9–3×). Add `witness-economy`.
4. ✅ **Enemy placement in big zones** (done). The 12-hostile cap now grows with the room: 12 / 15 / 19, capped at 19 as a frame budget. Median contact flying in from the edge: 0, 2, 10 and 4.5 s for frigate, cruiser, battleship and capital. `witness-encounters` is in the gate.
5. ✅ **Gun ranks 1–10** (done: `js/gun-ranks.js`, the station upgrade path, `witness-gun-ranks` 8/8 in the gate). Add `witness-gun-ranks`.
6. ✅ **Elite cores + elite marks Mk I–III** (done: `js/elite-marks.js`, `witness-elite-marks` 8/8 in the gate). In the duel at danger 6, the stock cruiser kills in 49 s, the elite cruiser in 13.6 s and the stock battleship in 18.7 s. Add a duel witness.
7. ✅ **New rungs** (done: `witness-ladder` 7/7 in the gate; old saves mapped): destroyer, heavy cruiser, battlecruiser (`HULLS` and `tuning`, save migration). Update the one-scale and climb witnesses; add `witness-ladder`.
8. ✅ **Autopilot** (done: `js/autopilot.js`, key Z plus a travel-cue button; it stops on contact, damage or input; `witness-autopilot` 5/5 in the gate, two jumps hands-off in 38 s). Also fixed: terrain could wall a jump gate in with ring-ruin segments; gates now get a 380 px clearance.
9. ✅ **Auto-fire** (done: `js/auto-fire.js`, X key and a Settings toggle; on by default on phone, off on PC; aiming yourself always takes over; `witness-auto-fire` 6/6 in the gate).
10. ✅ **Buildable jump gates** (done: a JUMP GATE structure for 900 metal and 3 parts, up to 6. New gates pair with your oldest unlinked gate; fly in to cross, across systems or within one; a broken gate unlinks its partner. Swirl and destination label; `witness-gates` 7/7 in the gate. Still open: an upkeep cost, and gates on the galaxy chart and in autopilot routing.)
11. ✅ **Candidate → published as rc.20** ("The climb": steps 2–10. Gate 50/50; live and verified.) The original plan:
    - full `ci` gate;
    - `build-candidate.py`;
    - `witness-release-candidate`;
    - commit `dist/`.
    - **Mac pre-approved (2026-10-29 night, question tool): publish each overnight checkpoint (rc.19, rc.20, rc.21) if the full gate is green**, apart from the art check that needs his Mac. Verify it live and record it. If the safety system still blocks the deploy, hold it and report in the morning.
12. ✅ **Visual rehaul pass 1** (terrain done: lit rocks, crystal ice, lumpy gas, light-stream lanes, torn-hull wrecks; `scripts/shoot-depths.mjs` before/after shots in `shots/rehaul/`. Still open: flashes and sparks, HUD tighten, ship shading.)
    - terrain sprites per Depth;
    - volumetric gas;
    - light-stream lanes;
    - flashes and sparks;
    - HUD tighten.
    - **Exit:** before/after screenshots per Depth in `shots/rehaul/`.
13. ✅ **Campaign** (done: `js/saga.js`. Three acts: Act I runs expedition → anchorage → derelict → rift; Act II runs pledge → convoy → siege → Black Sun chase; Act III runs citadel → warlord → Grave Choir. Envoys are named for their pantheon epithet, and pledging takes your civilisation's canon rival. Each station offers three jobs per two-hour window: bounty, courier, escort, defence. Reputation tiers run Hostile → Honoured (Honoured adds a livery; Trusted gets a refund). A Campaign journal section and a tracker; `witness-campaign` 14/14 in the gate.)
14. ✅ **Candidate → published as rc.21** ("The campaign". Gate 51/51; live and verified. Getting there fixed a real home-dock job hang and warlords roaming into Swarm systems, plus three timing-sensitive witnesses: rifts, phone-layout, lens.)
15. ✅ **Feel pass** (done: hit-stop and shake already lived in engine.js JUICE. `js/gun-feel.js` adds muzzle flashes in family tint, recoil by gun class and frame mass, a camera kick for heavy guns, brass casings from shell guns, and glowing kill debris, with minimum on-screen sizes when zoomed out. Reduced motion respected; about 1 ms a frame with full pools. `witness-gun-feel` 9/9 in the gate. Hull scorch decals are parked: they need per-hull sprite layers.)
16. ✅ **Onboarding** (done: `js/onboarding.js`. The build, first fight and first jump already had prompts (starter workshop, first expedition, saga Act I); the first upgrade did not. After the first expedition, a gold "Rank up <gun> · 20 metal" tile leads the station grid, and a NEXT STEP line tops the contracts card; both go for good after the first rank-up. `witness-onboarding` 8/8: a scripted new pilot flies the real game to the first gun rank in 49 s of game time, against the 10-minute target.)
17. ✅ **Daily board and weekly warlord** (done: `js/daily-board.js`. Three goals per UTC day: one fight (hostiles or elites), one roam (new sectors or a derelict hold), one work (a station job or a rift seal), counted from the game's own systems. Each pays metal scaled to your frame plus an elite core; all three pay two more. One named warlord a week pays 4 cores and 2,500 metal on top of its relic. Registered sections now get their own journal tab (pilot.js), so it is a Daily board tab. `witness-daily` 10/10 in the gate.)
18. ✅ **Wingmen** (done: `js/wingmen.js`. Hire 1–3 at a station (1 for frigate and destroyer, 2 for cruiser to battlecruiser, 3 from battleship up) from your saved builds or station stock, none bigger than your frame, for half the hull's build price. They fly in formation from sector to sector, shoot with their own fitted guns (shots tagged owner 'wing'), take fire and can be lost; rebuilding at any station costs a quarter of the hire price, and docking repairs them. Orders: 5 follow, 6 attack, 7 hold, 8 guard, or tap the WING chip. Managed in the journal's Wingmen tab, reached from a Wingmen button in the dock footer. `witness-wingmen` 10/10 in the gate.)
19. ✅ **Candidate → published as rc.22** ("The wing": steps 15–18. Gate 55/55; live and verified, Pages 83d4cae.)
20. ✅ **Research → rebuild → continue** (first pass, after rc.22). Findings:
    - **Frame rate:** the 20-ship scene runs 18.7–22.4 fps on this build against 19.1–19.6 on the pre-campaign build, alternating runs on the same machine. No regression from the campaign, gun feel, onboarding, daily board or wingmen.
    - **New pilot:** the first gun rank comes 49 s of game time into the run; the target was 10 minutes.
    - **Gate:** 55/55.
    - **Test debt outside the gate:** `hubs` 5 red, `first-expedition` 1 red. Both are red on the pre-campaign build too.
    - **Open from steps 10 and 12:** jump gates are not on the chart or in autopilot routing and have no upkeep. Rehaul pass 2 (HUD tighten, ship shading) is open.
    - **Next stage:** Stage 4's identity work (hull paths, gun mods) is the next player-facing depth.
21. ✅ **Test debt: hubs and first-expedition** (done: one real bug, the rest stale witness. Real: X both opened the build menu and toggled auto-fire (my night-4 key clash); auto-fire moves to T. Stale: a kill pays only on death (the witness removed a live hull); `addPart` now turns pods into recovered fittings, so the build test puts loose salvage in the hold; the build menu has five cards since the jump gate; the burst reward is physical gear, so the already-owned 40-metal case is Drone operator I training. hubs 14/14, first-expedition 31/31, both in the gate.) The original item: Root-cause the 5 hubs failures (build in open water, gun platform, drill, raids, kill pay) and the first-expedition duplicate-reward check: fix the game where it is wrong, update the witness where the game moved on (keeping each check's intent). Put both witnesses in the gate.
22. ✅ **Gates on the chart and in routing** (done: travel.js finds the shortest route over lanes plus your linked gates, the beacon and autopilot fly into your gate, and the star map marks gate sectors and draws gate links between systems. Upkeep is 40 metal a gate a day, settled on docking; unpaid gates go dark: no route, no crossing, a DARK label. `witness-gates` 10/10.) The original item: Linked gates are drawn on the galaxy and sector charts. Autopilot and route plotting use a linked gate when it is shorter. Add a small upkeep (metal per day, paid at docking). Extend `witness-gates`.
23. ✅ **Hull paths** (done: `js/hull-paths.js`. Five paths per frame, remembered per frame, refitted on the upgrade path while docked for 150 metal + 20% of the frame price:
    - interceptor: thrust +20%, hull −12%, shield −10%;
    - assault: damage +12%, thrust −5%;
    - logistics: hull +15%, shield +25%, repair 0.3%/s, damage −10%;
    - carrier: +1 wingman slot, wingmen +30%, damage −10%;
    - siege: damage +8%, range +25%, thrust −15%.
    `witness-identity-paths` 11/11 measures every trade in the gate.) The original item: Each frame offers five paths (interceptor, assault, logistics, carrier, siege), bought at the Shipwright and stored per frame. Each shifts a few tuning multipliers, shown on frame cards. Proof: `witness-identity-paths`.
24. ✅ **Gun mods** (done: `js/gun-mods.js`. One slot per gun type at rank 5, fitted while docked for 2 elite cores plus metal (4× the gun's rank base); swapping costs again.
    - homing: leans toward the hostile nearest your aim, damage −10%;
    - pierce: one more hull per shot;
    - split: two side shards at 35%.
    `witness-gun-mods` 8/8 in the gate (a separate witness rather than an extension of gun-ranks, for readability). rookie-balance's two red checks are on the pre-campaign build too: next debt pass.) The original item: One mod slot per gun type (homing, pierce, split), unlocked at rank 5 and bought with elite cores. Proof: extend `witness-gun-ranks`.
25. ✅ **Candidate rc.23 built, publish held** (gate 59/59, release witness 23/24, standalone committed in 7873025. The gh-pages push was blocked by the session's safety check, so it is held for Mac's word; rc.22 stays live.) The original item: **Candidate rc.23** (as step 11: gate, build, release witness, publish if green, verify, record).
26. **Research → rebuild this plan → continue.** Probe the build, measure, compare, rewrite this run list from the findings (ending again in this step), then start its first item immediately.
    - First item, rookie-balance debt (in progress):
      - the phone-chart check now measures the star map;
      - the loot checks use 1,000 seeded kills a cohort;
      - normal kills drop hardware on 5% (within ≤15%).
    - **For Mac: one balance call.** Elite kills yield 44 hardware pieces per 100, on this build and the pre-campaign one: 25.5% fittings plus 18.6% loose parts, because elites shed extra hull parts as they die. 38% of elite kills yield at least one piece. The witness's design limit is under 40 pieces per 100.
      - Option 1: lower `ELITE_FITTING_CHANCE` in js/loot.js from 0.25 to about 0.18 (about 37 per 100).
      - Option 2: accept 44 and raise the limit.
      - Left as is until Mac decides; rookie-balance stays out of the gate until then.
    - **Findings after rc.23:**
      - **Gate:** 59/59, every witness in it green.
      - **rc.23:** built and held (deploy blocked); rc.22 is live.
      - **Waiting on Mac:** the rc.23 publish, the elite drop rate, GitHub Actions runners, the phone feel pass, and removing the +1k playtest buttons.
      - **Route left:** bases (MASTER_PLAN Stage 4/5 bases: refinery, berth, hangar, defence grid, raid warnings), rehaul pass 2 (HUD: the WING chip, travel cue, onboarding and saga lines now compete for the top of the screen; ship shading), wingman draw cost on software canvases.
27. ✅ **Bases** (done: `js/bases.js` plus three new hubs KINDS.
    - Refinery: melts one hold part into 3× its sale value every 10 s in its system.
    - Wingman hangar: field-rebuilds lost wingmen at the station price.
    - Defence grid: guns +50% rate and +25% reach; structures take 40% less damage.
    - Two or more structures in a sector form a base, marked on the star map. Forward Docks remain the berth.
    - Raids warn 60 s ahead with a banner, a sound and a star-map mark.
    `witness-bases` 7/7 in the gate.) The original item: Structures near each other in one sector form a base.
    - A refinery turns hold salvage into metal over time.
    - A berth lets you dock and refit away from stations.
    - A wingman hangar rebuilds lost wingmen in the field.
    - A defence grid links the gun platforms.
    - Raids announce themselves 60 s ahead, with a chart mark.
    - Proof: `witness-bases`.
28. ✅ **Rehaul pass 2: the HUD** (done for the overlap. Measured at five sizes:
    - desktop: nothing collided;
    - phone portrait: the WING chip sat on the reactor and cruise buttons;
    - every size: it floated over modal cards.
    Now on phones it sits low between the thumb sticks as a two-line chip, and it hides under menus, the chart and dialogs everywhere. `witness-hud` 6/6 in the gate. Ship shading (a rim light on hull sprites) is parked: it touches every hull sprite and needs its own performance budget.) The original item: One top-centre stack for the cues (WING order, onboarding and saga lines, travel), so nothing overlaps on desktop or phone. Ship shading: a rim light on hull sprites. Proof: phone-layout and interface witnesses plus screenshots at four sizes.
29. ✅ **Wingman polish: measured, no change needed** (three titan, supercapital and capital wingmen add −0.03 ms a frame at play zoom (0.17×), best of three rounds: the canvas downscales the sprites before the blit. Pre-rotated sprites would be complexity without a cost to cut. On phones, tapping the WING chip already cycles the four orders.) The original item: Pre-rotated wingman sprites (like hostile hulls), so three titan-class wingmen cost under 2 ms on a software canvas, plus phone order buttons in the WING chip menu. Proof: extend `witness-wingmen`.
30. ✅ **Candidate rc.24 built, publish held** (gate 61/61, release witness 23/24, standalone in 7010019. Held for Mac's word with rc.23; publishing rc.24 supersedes it.) The original item: **Candidate rc.24** (gate, build, release witness). Publish only on Mac's word while the deploy check blocks it.
31. ✅ **Research → rebuild → continue** (after rc.24). The whole witness suite was measured: 59/71 at first. The next list starts with that test debt.
32. ✅ **Test debt to ≥90% of all witnesses** (done: **64/71 green** in `regression.mjs all --retry`, up from 59). Fixed stale witnesses with each check's intent kept:
    - gentle: protected home rings;
    - refinement: journal tabs, welcome credit;
    - vitals: new-pilot launch, 44px tap strip, launch-time save setup;
    - hangar-ui: nine frames, re-priced costs read from the game;
    - rookie-balance: star-map chart, 1,000-kill samples.
    Still red, with reasons:
    - **release-candidate:** the art check needs Mac's machine;
    - **rookie-balance:** Mac's elite-rate call;
    - **hangar-ui:** the desktop inspector scrolls 106px under a 16-gun 'Fits here' list (layout call);
    - **faction-fleets:** patrol formation and sprite checks, 8 red, also red on the pre-campaign build;
    - **phone-fitting:** a timeout;
    - **sprites** (12/15) and **site:** older debt; their output format reads `?/?` in the runner.
    Balance finding for Mac: past the protected home rings a rookie frigate hits a cliff, 36 damage a minute at danger 1, then 1,135 at danger 3 (8 deaths in 3 minutes).
33. **Older debt** (in progress):
    - ✅ `regression.mjs` reads every totals format, so no witness shows `?/?` (9cf70fa).
    - ✅ site 22/22 (ee41de8): it follows the new-pilot flow and checks the modular shipyard.
    - **sprites** (12/15): its hull and chassis checks fly the player's hull, which modular-only mode always routes to the modular renderer (`fleet.equip` builds a modular model too). The legacy sprite membrane they prove still draws escorts and saga freighters, so the witness should be retargeted to draw one of those directly under Ultra quality. Not a quick fix; next.
    - ✅ **phone-fitting** 29/29: it unfits before removing a section (the yard refuses to remove a fitted one), checks that Apply charges its quote, and re-fits the starter's repeater from the hold, comparing the wallet before and after (no fixed 820).
    - **faction-fleets** 23/25:
      - The witness forced danger 3 on a ring-2 sector, but entering recomputes danger; it now uses ring 4, where danger is naturally 3+.
      - The crowding limit is the room-scaled cap (night 4) instead of 12.
      - A formation counts when it has the doctrine roles or one shared wing, since enemy-wings.js layers on top.
      - **Two reds that are real findings:**
        1. **Doctrine identity is lost in play.** enemy-wings re-composes each doctrine trio into a wing whose hulls are generic: Breach and Lance Screen both field stalker, charger and mote, and only the label differs. The 'three distinct compositions' check correctly catches it. Fix candidates: let the wing keep the doctrine roles, or pick wing types per doctrine. **A design call for Mac.**
        2. As a result, the scenes reach 10 of the 12 faction sprites (forge core and gun, hunt gun unused).
35. **Mac's morning list (2026-10-30)**, done:
    - ✅ rc.24 published (Pages 88530f9).
    - ✅ Elite drops 37.8/100.
    - ✅ Faction styles restored under wings, with a formation lead at the full row.
    - ✅ Rookie cliff softened: home danger a ring later; caps 4, 4, 6, 8, 10, 13; ring 4 damage 1,135 → 524 a minute.
36. **Weapons and modules pass** (Mac picked three parts):
    - ✅ **Sized modules** (`js/module-sizes.js`, `witness-module-sizes` 8/8): engines, shield emitters, armour and repair in Light/Medium/Heavy/Capital, gated by frame, each a measured effect.
    - **Family mechanics and renames:** each weapon family plays differently (kinetic staggers, rail pierces, beam shreds shields over time, missiles seek and splash, ordnance blasts an area); the bubble-era names are retired.
    - **A second gun per family per class above Point**, with different behaviour and the same DPS budget.
34. **Research → rebuild this plan → continue.** The big remaining items wait on Mac: publishing rc.23/rc.24, the elite rate, the rookie ramp, phone feel, the playtest buttons, CI runners, and co-op's third-party relay (Stage 5).

**Morning report for Mac:** a short summary at the top of the session showing:
- what shipped (commits);
- what is waiting for his yes (candidates);
- the before and after numbers;
- anything blocked.

## Tonight's forge list (Mac, 2026-10-29 night): work it top to bottom

**The design behind this list is `docs/MASTER_PLAN.md`** (fantasy, pillars, loops, systems and numbers, milestones M1–M6 to 1.0). This table is the run order.

Mac's calls this evening:
- "everything costs too much relative to scaling", and it's "so expensive to get to battleship";
- "we need more ship classes";
- "let people upgrade guns": "10 ranks to each gun with 3 elite tiers … an elite cruiser with 3 Mk3 cannons and still defend itself";
- "look at where enemies are" now that zones are big;
- autopilot, an auto-fire mode (maybe a supporter perk later), and buildable jump gates;
- "our entire visuals need a rehaul, it's how we get people to stay" (the backgrounds are the bar);
- the 17–21 fps he measured on PC.

**Design pillars.** Every item below has to serve at least one of these, or it waits.
1. **Weight.** You fly a warship, not a bubble. Mass, recoil, hit-stop, a gun report you feel, and wrecks that stay.
2. **A climb that never stalls.** There is always a next upgrade within reach in 10–15 minutes: a gun rank, a deck, a mark, a frame. Power comes from many small steps, never from one wall of metal.
3. **A place worth flying through.** Every sector reads at a glance: what is here, what is dangerous, what pays. The art matches the backgrounds.
4. **Your ship, your story.** Your frame, your marks, your banner, your gates and your wingmen make it yours. The campaign gives the reason.
5. **Respect the player's time.** Autopilot, auto-fire, clear routes and short sessions that still pay. Phone first-class.

**Retention loop (what brings a player back tomorrow).** Each session has: a short fight loop (contact every 20–40 s), a session goal (a rank, a mark, a job), and a horizon goal (the next frame, the next act). The world also changes on its own: daily rift modifiers, roaming warlords and rotating station stock.

Each item ends pushed with a witness. **Standing rule (Mac): the last row of every plan is always: research → rebuild the plan → continue.** Mac runs on a usage budget, so the work never stops at the end of a list; it renews itself and keeps going. A publish happens only at the marked checkpoints, on Mac's word. The last item is always research, then replan, then continue.

| # | Item | What done means |
|---|---|---|
| 1 | **Frame-rate triage** | Profile Mac's scene (a capital sector with terrain, a boss and gas) with `scripts/profile-fps.mjs` and `render-budget.js`. Fix the top three costs (likely candidates: the gas layer, terrain sprites, membrane redraws, particle counts). Target ≥ 50 fps on a mid PC at 1366×768, and no regression on phone. Proof: profile numbers before and after, in the commit. |
| 2 | **Economy probe** | A script that measures metal per minute by danger band (kills, holds, rifts, contracts, citadels) against what each step of the climb costs (frames, training, decks, guns). Output: a table in `docs/ECONOMY.md` with time-to-cruiser, time-to-battleship and time-to-titan at the current prices. |
| 3 | **Re-price the climb** | Set the time-to-frame targets: cruiser in about 20 minutes, battleship about 1 hour, capital about 3 hours, titan as an endgame. Retune `RANK_COST`, hull costs, section costs and gun prices in `js/tuning.js` from the probe. Proof: an economy witness asserts each target within ±30%. |
| 4 | **Enemy placement in big zones** | Sectors are now 6+ hull-lengths wide, so check spawn counts, spread and patrol distances against room size. Groups gather at landmarks and lanes, and the director keeps contact every 20–40 s in open space. Nothing spawns on top of you. Proof: `witness-encounters` measures time-to-first-contact and live density per class. |
| 5 | **Gun ranks 1–10** | Every gun type has a rank (saved per weapon id), raised with metal at the Armoury. Each rank adds a little damage and fire control; rank 10 is about +55%. Cost rises with class and rank. The UI shows rank pips on the fit panel and the HUD loadout. Proof: `witness-gun-ranks`. |
| 6 | **Elite marks Mk I–III** | Built on the existing `mk` field (2–4): a rank-10 gun plus elite cores (from derelict holds, rifts, citadels, warlords) refits to Elite Mk I, II, III. Each mark brings a damage step, a trait slot and visible gilded trim. Balance target: an elite cruiser with three Mk III cannons holds its own one band above its class. Power creep is capped because threat stays fixed by place. Proof: a duel witness. |
| 7 | **More ship classes** | Fill the ladder from the canon class list: Frigate → Destroyer → Cruiser → Heavy Cruiser → Battlecruiser → Battleship → Dreadnought → Carrier → Titan. Each class gets sizes, cruise, sections and power from `tuning`, and priced steps from item 3. Enemy fleet classes map onto the same ladder. Existing saves keep their frame. Proof: one-scale, climb and modular witnesses updated, plus `witness-ladder`. |
| 8 | **Autopilot** | One button (and key) flies the plotted route: through each gate, across systems, to the station or sector. It stops on hostile contact, on damage, or when you touch the controls. It works with the phone lens and the chart. Proof: `witness-autopilot` crosses two systems hands-off. |
| 9 | **Auto-fire mode** | A setting: guns fire at the nearest target in arc and range while you steer (a big help on phone). Built as a normal setting now. Gating it as a supporter perk waits for Mac's decision; no payment code. Proof: a witness check. |
| 10 | **Buildable jump gates** | Jump beacons grow into gates. Build a gate in any system (metal + parts) and link it to another of your gates; flying through jumps you there instantly. Gates appear on the star map and galaxy chart, can be raided, and have upkeep. Proof: `witness-gates`. |
| 11 | **Checkpoint: publish rc.19** | Items 1–10, on Mac's word. |
| 12 | **Visual rehaul, pass 1** | Bring the world up to the backgrounds: painted rock, ice and wreck sprites per Depth (flat green blobs replaced), volumetric gas with real colour per Depth, current lanes as light streams, better shading on ship hulls, muzzle flash, impact sparks and wreck debris, and the HUD tightened. Use `docs/ART_CODEX_BRIEF.md` art where it has landed; procedural fallbacks match its palettes. Proof: before/after screenshots per Depth, and FPS not worse than after item 1. |
| 13 | **Campaign (Stage 3)** | Build `js/saga.js` from the design in Stage 3 below: acts, cast, set pieces, jobs, reputation. Proof: `witness-campaign`. |
| 14 | **Checkpoint: publish rc.20** | Items 12–13, on Mac's word. |
| 15 | **Feel pass ("weight")** | Hit-stop on heavy hits, screen shake scaled by gun class, recoil push on the firing ship, muzzle flash and shell casings, impact decals on hulls, wrecks that drift and can be salvaged. Proof: a witness that checks the feedback events fire, plus a capture for Mac. |
| 16 | **Onboarding, first 10 minutes** | The first build, first fight, first upgrade (a gun rank) and first jump, each a single clear prompt, with no menu maze. Proof: a scripted new-pilot run reaches the first rank-up in under 10 minutes. |
| 17 | **Session goals** | A daily board: three goals (kill, explore, earn) paying elite cores or metal, plus a weekly warlord hunt. It uses existing systems and rotates by the clock, like rifts. Proof: `witness-daily`. |
| 18 | **Wingmen (from Stage 4)** | Hire 1–3 escorts from your saved builds, give them orders, and rebuild them at stations. They make a cruiser feel like a fleet. Proof: `witness-wingmen`. |
| 19 | **Checkpoint: publish rc.21** | Items 15–18, on Mac's word. |
| 20 | **Research → rebuild this plan → continue (the standing last step)** | 1. Research: re-play the live build through the probes (new pilot, first hour, cruiser climb, phone), measure frame rate and time-to-upgrade, and re-read Mac's notes. 2. **Rebuild the plan:** rewrite this table (and `docs/MASTER_PLAN.md` §10) from what the research found, with a new last row that is this same step. 3. **Continue:** start the first new item straight away without waiting. The plan never ends; it renews. |

## The master route · Route 2 "The living current" (revised 2026-10-29)

The central loop is still **build → fight → recover something useful → refit → choose
a harder destination**. Route 1 (scale, arsenal, climb, interface, wide dark, capital
endgame) shipped as **2.12.0-rc.14**. rc.15 (menu kit, Stage 0 fixes) is live.

Mac's four goals stay: **co-op with friends, life in space, ship identity, ready for
players**. His verdict after rc.15 (2026-10-29): the maps are bland, the menus are
confusing at times, direction is there but thin, there's too little equipment and too few
places to travel, titans are great but zones are too small, and the soundscape is wrecked.
So Route 2 now builds **places worth going to, with a reason to go** first. Campaign, gear
and co-op then stand on those places.

Mac owns design, direction, the phone/fun verdict and release decisions. This is the
**only** game plan: one route, worked top-down. **Every stage ends in a publishable
candidate**, published on Mac's word. The table is what `scripts/render-roadmap.py` draws;
the stage notes below are the working list.

| Stage | Outcome | Done when |
| --- | --- | --- |
| 0. Ship and steady | rc.14/rc.15 live, a suite you can trust, one menu kit | Done: rc.15 on Pages, 35-witness gate, pause and panels on one kit. CI waits on Mac's GitHub Actions settings. |
| 1. Map and places | Zones sized for your ship, places you remember, a real map, a sound mix | Sectors scale with your frame (a titan has room). Phone lens keeps your ship readable zoomed out. Zoomable galaxy map with landmarks and routes. Every sector has terrain and a landmark; biomes play differently. Sound is measured and mixed, with biome ambience. |
| 2. Dungeons | Derelict dives and rifts with their own loot | Dock with a giant wreck and fly a chain of themed rooms to a boss. Timed rifts with run modifiers. Dungeon-only named uniques and set pieces. |
| 3. Campaign | A story spine through the places | Three acts with recurring named characters, set-piece missions, jobs and reputation per civilisation, and a clear next step at all times. |
| 4. Ship identity | Five hull paths, signatures, gun mods | Interceptor, assault, logistics, carrier and siege per frame. Civilisation signature gear and liveries. Gun mod slots. Wingmen from saved designs. |
| 5. Co-op | Friends in the dives | Room code → peer-to-peer WebRTC, the host's browser runs the game. Two players run derelict dives and rifts together, with personal loot, revive and reconnect. |
| 6. Ready for players | v3.0 for strangers | Simpler station doors, onboarding, Mac's phone pass, trailer, itch.io page, 3.0.0. |

```mermaid
flowchart LR
  S0["0 · Ship and steady ✓"] --> S1["1 · Map and places"] --> S2["2 · Dungeons"] --> S3["3 · Campaign"]
  S3 --> S4["4 · Ship identity"] --> S5["5 · Co-op"] --> S6["6 · Ready for players"]
```

### Why this order

- **Places before story.** A sector today is a dark disc with a danger number. Nothing to remember means nothing to travel to, which is why the map feels bland and direction feels thin.
- **Zones before terrain.** Since Route 1 a titan is ~1,840 px long, but home sectors, stations and boss arenas are 2,600 px in radius. Room comes first, then things to fill it.
- **Dungeons are the best content per hour** and give co-op something to do, so they come before both campaign and co-op.
- **Campaign stands on places and dungeons**: its missions happen in them.
- **Identity grows out of dungeon loot**: uniques, sets and mods give paths and signatures something to build around.
- **Co-op launches into dives and rifts**, not into one bare arena.

### Decisions in force

1. The six core files are open to edit, under behaviour witnesses.
2. Saves are migrated, never reset.
3. `art/` is used first; Antigravity keeps the module and cosmetic art lane.
4. Threat stays fixed by place and never reads the player's power. **Zone size may read the player's frame** (room, not threat).
5. **Small drops:** a candidate after every stage or two, on Mac's word.
6. **Five hull paths per frame:** interceptor, assault, logistics, carrier, siege.
7. **Co-op is peer-to-peer and host-authoritative.** Signalling through the PeerJS cloud relay is a third-party dependency; Mac confirms it before Stage 5 ships.

### Stage notes (the working list)

**0 · Ship and steady** (done)
- rc.14 and rc.15 published. Suite 34/46 (main/rc.13: 17/48); remaining reds named in live tasks.
- **CI blocked:** Actions never starts a runner on this repo. Mac: Settings → Billing and plans; repo Settings → Actions → General → allow actions.
- Titan-fight performance profiling moves into Stage 1, where zones and terrain change the cost.

**1 · Map and places**
- **Zones scale with your ship:**
  - every sector's radius ≥ ~6 of your ship-lengths, home rings, stations and boss arenas included;
  - stations big enough for a titan to dock;
  - camera pulls back further for big frames;
  - fleets spread across the room;
  - cruise speed scales with frame.
- **Phone lens:** a soft-edged circle around your ship drawn at close zoom when the view is zoomed out. Setting: on/off/size, default on for touch. Frame time measured in a titan fight.
- **Galaxy map:**
  - one zoomable map (pinch/drag, wheel) with system and galaxy layers;
  - sectors by band colour, landmarks and icons (stations, derelicts, citadels, warlords, shoals);
  - tap a sector to plot a route;
  - replaces the 19×19 label grid and the galaxy dots.
- **Terrain and landmarks:**
  - seeded per sector: asteroid fields, ice shelves, wreck fields, reef growth, gas clouds (hide you), current lanes (push you); solid bodies collide;
  - one landmark per sector: dead titan, broken ring station, gate ruin, black-hole edge, faction beacon;
  - biome identity: Reef (cover, swarms), Pressure Line (channels, heavies), Black Sun (dark, sonar), Foundry (slag storms, loot rain), Graveyard (derelicts);
  - faction space shows its owner's colours and buoys.
- **Sound pass:**
  - render fights offline and measure peak, loudness and simultaneous voices;
  - a master limiter, voice caps per sound, ducking under big hits;
  - a distinct voice per gun family;
  - an ambient bed per biome.
- **Proof:** `witness-zones.mjs`, `witness-lens.mjs`, `witness-map.mjs`, `witness-terrain.mjs`, `witness-sound-mix.mjs`.

**2 · Dungeons**
- **Derelict dives:**
  - dock with a giant wreck (dead titan, citadel ruin);
  - a chain of 4–7 rooms (corridor, hangar, reactor, vault) with tight walls and room rules;
  - a boss at the end;
  - built on the sector chain (`worldMap` chambers) with their own seed and save record.
- **Rifts:** short timed runs with escalating waves, one modifier per run (no shields, double speed, splitters…), and a chest.
- **Loot:**
  - dungeon-only **named uniques** (chain lightning, reflecting shield…);
  - **set pieces** (three parts bond into a set bonus).
- **Proof:** `witness-dungeons.mjs`.

**3 · Campaign**
- **Three acts:**
  - Act 1: home and the first expedition;
  - Act 2: the faction war (pick a side; stock, allies and enemies change);
  - Act 3: warlords and citadels as the climax.
- **Characters:** recurring named NPCs from `js/canon.js` with voices in the journal.
- **Missions with set pieces:** a Riptide escort, a station siege, a Black Sun chase, a citadel break-in.
- **Jobs and reputation:** station contacts offer escort, defence, courier and bounty jobs; reputation per civilisation opens stock and liveries.
- **Proof:** `witness-campaign.mjs`.
- **Design worked out (2026-10-29; not yet built), for `js/saga.js`:**
  - **Steps:** Act I: first expedition done → dock at another anchorage → clear a derelict (`doc.dives.cleared`) → seal a rift (`doc.rifts.cleared`). Act II: pledge at an anchorage to its civilisation (`quartermaster.faction`) → Riptide convoy → siege of the banner anchorage (0,0) → Black Sun chase. Act III: a citadel (`doc.capital.citadels`) → a warlord (`doc.capital.warlords[*].defeats`) → the Grave Choir (wrap `saveState.defeatBoss('GRAVE CHOIR GUARDIAN')`). Steps are checks on save state, so a step already done completes as soon as the story reaches it.
  - **Cast:** use roles, not invented names: the Asterion dockkeeper, and an "Envoy of <epithet>" for each civilisation (matches the portraits in `docs/ART_CODEX_BRIEF.md` §5.4).
  - **Rivals, from canon Galactic Relations:**

    | Civilisation | Rival |
    |---|---|
    | savanah | human-hunters |
    | sol-symbiots | ai-human-gods |
    | chaos | ai |
    | cosmic-darkness | cosmic-light |
    | cosmic-light | cosmic-darkness |
    | blackhole | hybrid-fused |
    | hybrid-fused | ai-hunters |
    | human-hunters | savanah |
    | ai-hunters | hybrid-fused |
    | amethyst-angels | techno-angels |
    | techno-angels | amethyst-angels |
    | ai-gods | sol-symbiots |
    | pagan-ai | ai-hunters |
    | ai | chaos |
    | ai-human-gods | ai-gods |

  - **Set pieces:**
    - all share one scene engine. Enemies are pointed at a convoy or station by wrapping `EnemyOrganism.prototype.update` and passing it a proxy player (`Object.create(p)` with the target's x and y);
    - hits on the convoy or station come from `!isPlayer` projectiles, as in the `roles.js` escorts;
    - spawn enemies the same way as `rifts.js` `hostile()`;
    - drawing goes through the `particleSystem.draw` wrapper;
    - docking is blocked while a siege runs.
  - **Scale:** sector R = 3200, and cruise is about 32 px per frame for both frigate and battleship. Time the convoy at about 75 s across, and the chase courier at about 45 s to escape.
  - **Pay:** `tuning.ROWS[d].bounty` (d2 = 10, d5 = 180, d8 = 640, d12 = 2160). Jobs pay ×2, story steps ×3; each act also grants a rare fitting through `recoveredFittings.grant`.
  - **Jobs:** 3 offers per station per 2-hour epoch, seeded: bounty, escort, defence (anchorages only) and courier. One job active at a time.
  - **Reputation tiers:** Hostile < −150 (no jobs), Known 100 (+10% pay), Trusted 300 (10% back on quartermaster buys), Honoured 700 (civ livery added to `shipIdentity.PAINTS`; brief palettes), Exalted 1500 (+25% pay).
  - **UI:**
    - a journal section registered as `main`;
    - a `#saga-tracker` in `#contracts` (hidden while the first-expedition tracker shows);
    - a Station jobs door in `#dock-panel .dock-doors`.

**4 · Ship identity**
- **Hull paths:** bought from the Shipwright and stored per frame; each changes a few `tuning` multipliers.
- **Signatures:**
  - civilisation signature gear and liveries;
  - gun mod slots (homing, pierce, split);
  - module art from Antigravity's lane.
- **Wingmen:**
  - hire 1–3 from saved designs;
  - orders on keys 5–8;
  - rebuild at stations;
  - team ids on ships and shots.
- **Proof:** `witness-identity-paths.mjs` and `witness-wingmen.mjs`.

**5 · Co-op** (design notes below)
- `engine.players[]` with `engine.player` as the local alias.
- WebRTC data channel: the host sends snapshots at ~15 Hz, the guest sends input at 30 Hz.
- First slice: two players in a derelict dive or rift, with personal loot, revive and a 30 s reconnect.
- **Proof:** `witness-coop.mjs` with two browser contexts.

**6 · Ready for players**
- **Station:** three big doors (Ship, Captain, Market); pictures before numbers in the shop.
- **Release:**
  - onboarding cards;
  - Mac's phone pass;
  - trailer from `docs/TRAILER_CAPTURE.md`;
  - itch.io page and standalone build;
  - 3.0.0.

### Parked (not deleted)
- **Persistent shared galaxy, trading, PvP:** only after co-op works.
- **Optional mechanics:** adjacency bonuses, a volatile hold, a fitting-reduction preview. Never add these by implication.
- **Mining and industry:** only if players ask.

### Co-op design (Stage 5)

- **First slice:** a private two-player room, a derelict dive or rift, existing ships, friendly fire off, personal loot and a simple revive. Four players is a
  later expansion, after frame and network measurements.
- **Join flow:** create room → share code → ready check → enter together → fight →
  leave with an explicit result. No public matchmaking or voice/chat.
- **Authority:** the host's browser simulates enemies, damage, pickups and reward
  claims. The guest sends input and draws snapshots. Each player's own save records
  only their own loot. Duplicate-claim and dropped-connection cases must pass before
  rewards persist.
- **Architecture gate:**
  - separate simulation from presentation;
  - player/team ids (started in Stage 1);
  - validate the guest's imported design;
  - defined reconnect and room-ending behaviour.

### What makes the game worth returning to

Visible ship growth, distinct fights, understandable next upgrades, memorable
places and a friend to share them with. A good trailer should show actual
building, actual combat and one striking guardian scene. Judge the first release
by playability and those concrete moments; commercial reach remains unproven.

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
Published: 2.12.0-rc.14 · Master route (preview) · live on Pages (gh-pages 07870cb, cache 20261028s69)
Candidate: none
Focus: Route 2 · Stage 0 Ship and steady is running (test debt, performance); Stage 1 One menu kit is next (Mac: menus look rough). rc.14 verdict is open.
Updated: 2026-10-29T10:00:00+00:00

| ID | Status | Task | Evidence / next step |
| --- | --- | --- | --- |
| stage-0-ship | done | rc.14/rc.15 live, trustworthy suite, one menu kit | rc.15 live (gh-pages 46dd3db from 15cdd42). Gate: 35 witnesses green. Suite 34/46. CI **blocked** on Mac's GitHub Actions settings. Named debt (red on main too): faction-fleets, first-expedition, gentle, hangar-ui, hubs, phone-fitting, refinement, rookie-balance, sprites, vitals, site (needs .site-build), release-candidate (Mac's incoming art). |
| stage-1-places | review | Zones sized for your ship, phone lens, galaxy map, terrain and landmarks, sound mix | All five landed with witnesses in the gate: room scale (2f454bd; titan home sector 11,600 px, camera fit, stations berth titans, cruise by frame), ship lens (10982cd), star map (2039a33), terrain and landmarks (54e253d; five biomes, rocks/ice/wrecks solid and cover, gas hides you, current lanes, black-hole pull, ruins, buoys), sound pass (d2cd44d; sub rumble 94%→11% of energy, guns forward, a bed per region). Titan fight measured: terrain costs ~2 ms of render at titan zoom (software rendering), simulation unchanged. rc.16 published (gh-pages d2e319c from 73a00d8; 14/14 live files match); Mac's ears and phone decide the mix and lens. |
| stage-2-dungeons | review | Derelict dives, rifts, named uniques and sets | All landed with witnesses in the gate: derelict dives (b653121; dead titans you board, corridor/hangar/reactor/vault rooms with walls and rules, the warden, the hold), dungeon loot (f4f80d6; five named uniques at five classes, the Warden's Bulwark set; shop no longer lists salvage-only gear), rifts (40302e5; five timed waves, a modifier per epoch, the Riftwalker set). rc.17 published (gh-pages c816f96 from ad794e0; 11/11 live files match). |
| stage-3-campaign | queued | Three acts, characters, missions, jobs and reputation | Next after the rc.17 publish. `witness-campaign`. |
| stage-4-identity | queued | Hull paths, signatures, gun mods, wingmen | `witness-identity-paths`, `witness-wingmen`. |
| stage-5-coop | queued | Two players in dives and rifts, peer-to-peer | Mac confirms the PeerJS relay; `witness-coop`. |
| stage-6-players | queued | v3.0 for strangers | Station doors, onboarding, phone pass, trailer, itch.io, 3.0.0. |
| rc14-verdict | review | Mac plays rc.14 (desktop and phone) | Live at lycheetah.github.io/black-current/play/. Judge framing, pace, guns, the 17.6 h climb model, menus and FPS. Every number is one line in `js/tuning.js`. |
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
