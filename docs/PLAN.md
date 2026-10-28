# Black Current: the living plan

The one backlog for every AI seat and every human working on this repo. Read it before you start; update it
before you stop.

## Master sequence — 2026-10-28

The central loop is **build → fight → recover something useful → refit → choose
a harder destination**. Mac owns design, direction, the phone/fun verdict and
release decisions. This is the only active game plan; generated diagrams and
the live task viewer read this file.

| Phase | Outcome | Gate before moving on |
| --- | --- | --- |
| 0. Make fitting progression clear | Novice mounts, an explicit Light upgrade and readable equipment sizes | Preserve two free guns, 100 starting metal, ten sections and four guns. Prove native fitting, exact costs, old-save compatibility and failed-save rollback. |
| 1. Give enemies distinct jobs | More recognisable faction fleets and tactical encounters | Different ranges, attacks, support roles and counterplay; useful salvage. Keep the opening Mac now enjoys. |
| 2. Make loot and menus rewarding | Understandable upgrades, targeted rewards and compact pictured menus | Show fit, effect, owned copies, source and real price together. No second inventory, mandatory research wall or menu reroll exploit. |
| 3. Open the dangerous frontier | Three more outer sector rings per system and distinct danger bands | Home protection, map scale, routes, stations and warnings survive. Audit tier clamps before raising difficulty; populate new space with encounters. |
| 4. Deepen ship and world identity | Modular art, authored places, NPC jobs and role paths | Antigravity owns module/cosmetic art. Settle five versus eight paths before implementing; keep player-authored layouts. |
| 5. Bring an ally | Useful AI escorts, then a private two-player arena | Prove escort roles first. Co-op needs authoritative rewards, separate player ownership and reconnect safety; no backend exists yet. |
| 6. Earn the capital endgame | Titan fleets, roaming warlords and enemy citadel fortresses | Authored support, shield, battery and core objectives, with specific rewards. Frontier tier 9–99 is a staged long-term direction, not implemented content. |

### Visual route

```mermaid
flowchart LR
  A["NOW · Novice → Light fitting"] --> B["Distinct enemies"]
  B --> C["Useful loot + proper menus"]
  C --> D["Three outer rings + danger bands"]
  D --> E["World + modular ship identity"]
  E --> F["AI ally → private co-op"]
  F --> G["Titan fleets + citadel fortresses"]
```

**Current published build:** **2.11.0-rc.12 Fleet services**, cache `20261028s67`.
Runtime source `0da83bc`, Pages `f5d7b30`; Pages built and all17 changed live
files match the exact package.25/25 package/offline and25/25 native menu/service
checks passed; the combat source gate passed28/28. Package646 files,645 hashes,
169 embedded images; Desktop HTML matches. Compact station/Captain menus,
tactical wings, hull damage, class-sized enemies, cruise, shotguns and ambience
are live. Full regression did not run; actual phone/FPS/sound/balance and the
specific rapid-recovery encounter remain pending. Full scaling is next.

Earlier release receipts are in [CHANGELOG.md](../CHANGELOG.md); their focused
counts describe their recorded versions, not an additional pass on current code.

### Co-op proposal — design only

- First slice: private two-player room, one arena, existing ships, one shared
  guardian, friendly fire off, personal loot and a simple revive. Four players
  is a later expansion, after frame/network measurements.
- Join flow: create room → share code → ready check → enter together → fight →
  leave with an explicit result. No public matchmaking or voice/chat is needed
  for this first slice.
- Proposed authority: a room service owns enemies, damage, pickups and reward
  claims; clients send input and display snapshots. This needs a technical
  spike: the present runtime has one global player and player/enemy bullet
  ownership. It is not already a network engine.
- Architecture gate: separate simulation from presentation, add player/team IDs,
  validate imported designs, and define reconnect and room-ending behaviour.
  Prototype persistent rewards only after duplicate-claim and dropped-connection
  cases pass. Room hosting, stack, cost and delivery time are still undecided.
- Persistent shared galaxy, trading and PvP stay outside the first prototype.
  This proposal authorises planning, not deployment of a multiplayer backend.

### What makes the game worth returning to

Visible ship growth, distinct fights, understandable next upgrades, memorable
places and a friend to share them with. A good trailer should show actual
building, actual combat and one striking guardian scene. Judge the first release
by playability and those concrete moments; commercial reach remains unproven.

Damage-triad multipliers, adjacency bonuses and a volatile hold remain optional
design proposals. They do not automatically enter the next build.

## Rules (every seat follows these)

1. **Follow Mac’s latest direction.** Work the backlog in priority order; keep each build batch bounded.
2. **One plan.** This file is the backlog. Dated docs (`PLAN_WEEKEND_BLITZ_*`, `HANDOFF_*`, `docs/research/*`)
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
9. **Laws still apply.** README §Laws, `GAME_VISION.md`, `CLAUDE.md`. Classic scripts only, guard with `typeof X`,
   never break the source-hash gates (`weapons.js` and the other original gun files stay byte-identical; patch them
   from another file).
10. **Keep live tasks current.** Update the table below at build milestones. Only one task is running; queued,
    blocked and awaiting Mac's test are distinct. Done carries evidence. The local task viewer reads this file,
    so never create a second progress database or mark planned work as completed.

## Live tasks

The live viewer reads the local working copy. A GitHub commit is a timestamped
snapshot of this table, not an automatic activity feed.

<!-- live-tasks:start -->
Project: Black Current
Published: rc.12 · Fleet services · live on Pages
Candidate: none · rc.12 published;25/25 exact package checks passed
Focus: release verified live; weapon/enemy/reward scaling is the next queued build. Actual phone verdict pending.
Updated: 2026-10-28T09:12:03+00:00

| ID | Status | Task | Evidence / next step |
| --- | --- | --- | --- |
| combat-hotfix | review | Fix enemy recovery, enemy scale, cruise and sound | Published in rc.12. Earlier combat source gate28/28 covers real critical/module damage, repair interruption, physical hull sizes, six shotgun fans, cruise and rendered audio. Exact package gate25/25; actual-phone FPS/feel and the specific recovery encounter remain pending. |
| live-task-tracker | done | Build a visible native task rail for Cael | Native GTK rail is open under the desktop user service. Eight controls passed: live edits without restart, source error/recovery, task-state guards and real window captures. Desktop/application launchers installed. |
| fitting-progression | review | Play the published Novice → Light fitting repair |28/28 focused native fitting/persistence/touch checks passed. All15 starters, exact144-metal new mount+gun bill, save rollback, facing through replacement/reload, owned field fallback and old saves covered. Phone/desktop captures inspected. Published rc.11: sourceedf246d, Pages72d1051, cache20261028s65.23/23 package/offline plus28/28 fitting checks;13/13 live files match. Actual phone/full regression pending. |
| enemy-roster | review | Play local Tactical wings and continue faction variety | Tactical wings published in rc.12. The earlier26/26 combat/commission gate preceded the hotfix and was not rerun. Three patrol roles and Sanctuary mender reward are live; complete endgame scaling and actual phone/balance remain pending. |
| proper-menus | review | Design premium fitting, station and Captain menus | Published rc.12: source0da83bc, Pagesf5d7b30, cache20261028s67.25/25 native menus and25/25 exact package/offline checks;17/17 changed live files match. Desktop/portrait/landscape captures inspected. Actual phone feel/FPS pending. Weapon/enemy scaling is next. |
| combat-scaling | queued | Scale enemy difficulty and rewards with ship progression | Measure damage, survival time, weapon tier and rewards across rookie, cruiser and capital fits. Preserve the good opening, add tactical pressure and clear danger bands; actor/FPS budgets apply. |
| useful-loot | queued | Make salvage and station stock worth choosing | Improve existing commissions, recovered variants and limited specials. Show sources and compatible fits; measure drop usefulness and frequency. |
| frontier-rings | queued | Add three more outer sector rings per system | Current local grids are 9–13 wide; target 15–19. Preserve inner sectors and saved coordinates; add populated danger zones, routes and refit access. |
| danger-bands | queued | Design system risk bands and a staged null frontier | Current sector tier cap is 7 and bounty lookup caps at 10. Census clamps before tier 9–99; author fleet, fortress and reward progression in stages. |
| module-art | queued | Integrate coherent modular parts and customisation | Antigravity's lane. Preserve incoming sources; witness selected art at fitting and flight scale. |
| ally-and-coop | queued | AI support first, private two-player arena later | Useful escort roles; room authority, reconnect and reward-safety prototype before persistent co-op. No room service exists. |
| capital-endgame | queued | Titan fleet and citadel objectives | Canon ships, destructible batteries/shields/support/core, warnings and specific rewards. Long-term design. |
| phone-verdict | review | Judge current release on actual hardware | Rc.12 is live: source0da83bc, Pagesf5d7b30, cache20261028s67;17/17 changed live files match. Source menu and package gates25/25 each; actual phone FPS, comfort, audio and balance remain unverified. |
| regression-debt | queued | Finish the interrupted broad regression in bounded groups | Rc.10 has31/31 combat/input/offline plus31/31 reward/persistence checks. Full npm regression remains incomplete; do not treat these as full-suite proof. |
<!-- live-tasks:end -->

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

## Current bounded batch

**REVIEW: rc.12 published.** Compact station/Captain menus passed25/25 native
service/training-save checks; desktop/phone/landscape captures inspected. Exact
package/offline gate25/25; Pagesf5d7b30 built and all17 changed live files match.
Runtime source0da83bc is pushed. See CHANGELOG and the publication receipt.

Combat feel and tactical wings are live in this release. Module hits chip the hull and retain
critical excess damage; mender repair waits3s after damage. Physical enemy
hulls scale by class. Separate Cruise gives65% thrust for75% less battery
damage. Six shotgun sizes offer wider aim coverage within class DPS budgets.
Midrange ambience and sparse music motifs retain the saved audio mix.

Latest focused receipt: `shots/combat-feel/report.json`,28/28 via `test:feel`,
including a defective response control. Native damage, critical plate loss,
repair, hull geometry, actual pellets, cruise/momentum/charge, phone touch and
offline audio passed. Desktop and390px phone captures inspected. Earlier wing
combat/commission gate passed26/26 before this hotfix; it was not rerun here.
Forty ordinary-enemy probes found no passive recovery; Mac's specific report
still needs an enemy/sector and retest. Full regression, actual-phone FPS,
sound quality and balance remain pending. No further map expansion shipped: home
is13×13; ordinary outer rooms use3200 radius; sector danger caps at7.
The next substantial build is weapon/enemy scaling, before more menu expansion.

## Full continuation list (top = next)

1. **Weapon, enemy and reward scaling — next build.** Measure emitted DPS, range, burst and survival time across Novice, Light, cruiser and capital fits. Match hull size to fleets, telegraphs and fitting rewards; design real capital encounters rather than just HP increases. Preserve the opening, actor/FPS budgets, and explain danger bands before raising the tier7 clamp.


2. **Novice → Light fitting — published, phone review.** Separate the supplied rookie mount from paid Light mounts. Explain supported sizes, smaller-gun fallback, base DPS/cycle/power and total mount-plus-gun cost. Preserve the supplied two guns, 100 metal, ten sections and four-gun ceiling. No hidden research requirement. Sources: `modular-ships.js`, `novice-ships.js`, `starter-journey.js`, `hangar-ui.js`, `progression-path.js`.

3. **Enemy roster and combat variety.** More canon faction hulls, formations, ranged attackers, carriers, escorts and support roles. Enemies must actually fire and telegraph dangerous attacks. Coherent hulls retain real damageable modules. Keep ordinary actor budgets and the opening Mac enjoys. Sources: `ai.js`, `faction-fleets.js`, `enemy-combat.js`, `hostile-skins.js`, canon.

4. **Useful loot and acquisition.** Extend existing commissions, recovered variants, Jelly Shoals and rotating station stock. Give each activity a reason to visit, with identifiable equipment sources and meaningful upsides/downside variants. Keep ordinary rookie stock available; no stock-menu reroll exploit or second inventory. Sources: `loot.js`, `recovered-fittings.js`, `quartermaster.js`, `equipment-codex.js`.

5. **Proper compact menus.** Finish pictured slot/equipment comparisons, station services, Captain choices, augments and journal goals. Show price, owned copies, fit, actual effect and next action together. Consolidate obsolete Armoury presentation only with a replacement witness of native ownership/purchase. Sources: `hangar-ui.js`, `station-grid.js`, `pilot.js`, `equipment-codex.js`, native overlays.

6. **Three more outer rings per system.** Expand current 9–13-wide local grids to 15–19, preserving home protection, inner-sector seeds, existing saves and return routes. New rings need distinct populated encounters, useful stations and visible danger/route guidance. More empty squares alone do not complete this item. Sources: `map.js`, `sectors.js`, `galaxy.js`, `travel.js`, `navigation-hud.js`.

7. **System risk bands and the null frontier.** Separate safer homes, contested space and dangerous outer systems. Audit sector/AI/bounty/loot clamps first: sector danger currently caps at7, bounty lookup at10. Stage authored bands toward Mac's tier9–99 vision; suggested first slice9–12 is a proposal. Higher bands add fleet roles, siege counterplay and specific rewards, not just multiplied HP. Single-player risk bands do not imply implemented PvP/security services.

8. **Modular art and customisation — Antigravity's lane.** Select incoming top-down hull, armour and turret assets; preserve sources and consistent anchors/scale in flight and fitting. Use old capital silhouettes as modular inspiration. Keep spinal rails visible beneath guns and big-frame phone construction usable. No return of the retired player editor. Sources: `art/review/`, accepted manifests, `section-art.js`, `turret-art.js`, `topdown-kit.js`.

9. **Performance and real-phone blockers.** Reproduce Mac's exact touch failures. Profile representative fights and fix the largest measured cost. Keep all wallet currencies, HP/shield numbers, route dismiss controls and usable stations. Browser viewport screenshots do not establish sustained phone FPS, heat or fun. Sources: `render-budget.js`, `hud-layout.css`, `navigation-hud.js` and the measured hot path.

10. **Interrupted regression.** Finish the broad pass in bounded groups; distinguish stale fixtures from real failures, including historical galaxy survival/hubs reload reports. Preserve counts and failures. The first fifteen minutes are now a regression guard, not a fresh redesign priority: Mac says they already feel good.

11. **Weapon and defence balance.** Compare DPS, cadence, range, payload, power, price and mount investment. Avoid both one-gun slowness and the zone-three power spike. Retain distinct missile, beam, rail and electro-kinetic behaviours. Make armour/shield trade-offs visible; no blanket hull buff. Protected combat sources remain byte-identical.

12. **Soundscape and combat feedback.** Five family voices, managed firing layers and effects controls shipped in rc.5. Use Mac's listening verdict to target impacts, warnings, pickups, docking and ambience. Replace the engine only if measured limits justify it. Sources: `battery-audio.js`, `soundscape.js`, `sound.js`.

13. **Hull specialisation paths — decision pending.** Confirm five versus eight paths per frame before building. Interceptor, assault, logistics, carrier and siege are candidates; each needs clear trade-offs and prices on the existing ladder. Source: `modular-ships.js`, canon.

14. **Reactors and batteries.** Distinguish fitting power from stored boost energy. Small incremental active upgrades complement passive fits. Sensors stay deferred until they have a real gameplay job. Sources: reactor/Captain adapters.

15. **NPC jobs, stations, gates and anomalies.** Canon agents, mapped objectives and targeted rewards for hunts, couriers, escorts and exploration. Improve refit coverage, then gates and Depth-scaled bases. Every risk needs a visible route home. Sources: `contracts.js`, `contacts.js`, `hubs.js`, `travel.js`, `galaxy.js`.

16. **AI allies → private co-op.** Start with a useful healer escort, then distinct support/combat roles and enemy counterplay. Prototype two pilots with one room code and guardian, friendly fire off, revive and explicit leave/reconnect. Authoritative enemies/rewards, player/team IDs and save-safety come first. No multiplayer backend exists; hosting/stack/cost need Mac's decision. Persistent galaxy/trading/PvP follow only after this works.

17. **Capital and Titan endgame.** Earnable capital guns, fleet goals and enemy citadel fortresses. Author separate shields, batteries, hangars, power and core objectives for a pilot plus AI or human ally. Extend canon ships, six roaming warlords, landscapes and specific rewards; Titan services must exist before calling it a mobile base. Goliath's 99k-plus-cores target remains a proposal. Mac's space-demon list is still needed before authoring those figures.

18. **Optional later mechanics.** Damage-type multipliers, adjacency buffs, volatile deep cargo and a player-approved fitting-reduction preview remain proposals. Never silently remove fitted hardware or add them to a batch by implication.

## Sources
- `docs/canon/`: Mac's Sovereign Eclipse canon (see Canon above). `js/canon.js` is its data form.
- `docs/research/RETENTION_DOSSIER_FOR_SOL_OPUS.md`: a Gemini research pass on Starsector, Space Rangers 2,
  Cosmoteer, Dredge and EVE (historical design input; its line counts are UNVERIFIED).
- `HANDOFF_2026-10-25_menus_loot.md`: local only, the session receipts behind the top-down hulls and clip-ons.
