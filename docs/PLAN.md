# Black Current: the living plan

The one backlog for every AI seat and every human working on this repo. Read it before you start; update it
before you stop.

## Rules (every seat follows these)

1. **Hull specialisation pathways.** Each of the six frames (frigate, cruiser, battleship, capital, supercapital, titan) branches into role paths (EVE-style: interceptor, assault, logistics, ewar, carrier, siege and so on). Mac: *"specialization pathways for each of those is a good variety right but 5 eight classes"*, so confirm with him whether that means 5 paths per class or 8. Make it data in `js/modular-ships.js` next to `HULLS`, priced on the shipwright ladder, and balanced on the `HULL_LADDER` net (never strictly stronger).
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

## Deploy (main is NOT the live site)
GitHub Pages serves the **`gh-pages`** branch, not `main`. Pushing `main` changes nothing Mac can see.
To publish: `python3 scripts/build-site.py` → copy `.site-build/` over a `gh-pages` worktree → commit
"Publish ..." → push `gh-pages` → wait for `gh api repos/Lycheetah/black-current/pages/builds/latest` to say
`built` → check the live `play/` page shows the new `v=` cache token. Publish only on Mac's word.

## Standing rulings from Mac
- Keep **both** Shipyards: classic (freeform) and modular (hull sections). Modular is not the default.
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

## Backlog (top = next)

2. **Hired escorts + a wider galaxy.** The civilisation start landed (15 canon civilisations, each with its own
   calm home that becomes your anchorage; `js/civilisations.js`, witness `witness-civilisations.mjs`). Next: a
   hireable NPC escort, a healer frigate first, as the solo answer to zones built for groups (Mac: "hire a healer
   mercenary ship or frigate solo"); then more zones on the galaxy map. Multiplayer and PvP need a server later;
   the save already records `civ` and `civHome` per run.
3. **Quests, bounties and NPCs (EVE-style agents).** Every NPC starbase has agents with a name, a civilisation
   and a standing with you. They offer missions (kill, escort, courier, scan an anomaly, hunt a named target) with
   a briefing, objectives on the map and a reward in metal, parts and standing. A bounty board posts named
   warlords and demons with a price that grows the longer they roam. Missions are data in one table, not code.
4. **Deep space and anomalies.** Past the charted zones, Depth rises: scan for anomalies (derelicts, rifts,
   combat sites, relic caches, demon nests), each a short authored encounter with a payout and a risk. Feeds
   quests (#2) and the abyssal hold.
5. **Field refit.** Refit anywhere for **+10% metal**, but only with **no hostiles within ~1,200**. Docked refit
   stays the cheap option. The Apply button reads "Field refit · N metal (+10%)" or "Hostiles near".
   Touches: `modular-ships.js apply` (the `hubs.docked` gate), `modular-yard.js` button text.
6. **Jump gates + NPC starbases (the long road).**
   - *Found gates:* a few fixed gates already in the galaxy link distant systems (one-way until you light the
     far side).
   - *Built gates:* you build a gate pair (large metal sink, late game), one at each end, to make your own
     shortcut home. This is the answer to "going back to base is a slog".
   - *NPC starbases:* one per canon civilisation as you push out, dressed in its fleet DNA, selling its favoured
     weapon family. Trade, refit (docked price), contracts,
     rumours of warlords. Some are hostile fortresses.
   - *Our bases scale out:* station size, defences and services grow with depth (Naraka → Erebos → Aion →
     Chaos Cradle → Deep Current), so the deep frontier has to be earned and its stations feel huge.
   Sol's proposed order: NPC starbases (content you meet) → found gates → built gates → base scaling. Plan
   this with Mac before building; each step is its own batch. Touches: `galaxy.js`, `hubs.js`, `travel.js`,
   `sectors.js`.
7. **Damage triad.** Kinetic/rail do ×2 to shields and ×0.5 to plated hull. Beam does ×0.5 to shields and ×1.5 to
   hull. Ordnance/missile does flat damage but has 3× the chance to shear off nodes. Uses `arsenal.GUNS[id].family`.
   Done when a shielded elite visibly needs kinetic to break and beam to finish. The holo bay's DPS readout is
   the witness. Touches: a patch over the damage path, never `weapons.js` directly.
8. **Chassis tiers on the canon ladder + the Goliath berth.** The 18 canon classes (Pod → Titan) are the
   chassis ladder. Each tier gets its own grid, slots, power, clip-on limit and look, unlocked by mass and
   Shipwright rank. A carrier gets extra bay mounts, a capital gets silo banks and a built-in command post.
   Your civilisation choice names your hulls (e.g. Savanah: Green Seed, Eye Knife, Harpy Claw, Watcher Dread).
   A shadowed **PROJECT GOLIATH** Titan under scaffolding at Asterion Forge (99,000 metal + 3 warlord cores)
   is visible from day 1 as the long goal. Touches: `modular-ships.js HULLS`, `canon.js`, `topdown-kit.js`.
9. **Module and gun art pass.** Mac: modular "leaves us such an easier room to make sick art for the modules and
   the guns". Each section, clip-on, gear and turret gets a top-down sprite in `topdown-kit.js` style, one look,
   readable at phone zoom. Carried over from the yard skin (2026-10-25): put that art on the yard's part and
   factory cards, and animate the top stat pills on every change.
10. **Micromodules (named loot with traits).** Elites, outposts and bosses have a 15–20% chance to drop a named
   module with a strong upside and a real downside (e.g. Overclocked Magnetron: +40% beam range, +15% recoil).
   Socketed in the yard. This absorbs the old "EVE module inventory" item: one inventory, not two.
   Touches: `loot.js`, `modular-ships.js`, `modular-yard.js`.
11. **Adjacency bonuses.** Neighbouring sections buff each other (power next to a gun deck: faster traverse and
   fire; shield next to the core or a bay: that node resists damage; engine next to a nacelle: more acceleration).
   Shown live in the yard. Touches: `modular-ships.js compile`.
12. **Abyssal hold (push your luck).** The deeper Depths (Chaos Cradle, Deep Current) pay 3–5× metal into an unbanked **volatile hold** that only
   banks at a hub, a forward dock or an NPC starbase. Death leaves it at your wreck as a recovery beacon. This is
   risk, not guilt: the wreck always waits for you. Touches: `hubs.js`, `galaxy.js`, `wreck.js`.
13. **Roaming warlords.** 6 named, persistent pirate bosses with bounty cards, a sector-entry klaxon and a radio
    line, and a bounty that grows when they beat you. Each drops a warlord core (feeds Goliath).
    Touches: `bosses.js`, `galaxy.js`, `contracts.js`.
   Warlords are canon figures from the 15 civilisations (Chaos, Cosmic Darkness, Blackhole first), flying their
   faction's Dreadnought/Titan hulls.
14. **Space demons.** Mac: "this game should have space demons". Naraka (the inhabited threshold) and the Chaos
   Cradle are their natural home in canon. Mac is sending the list. Skeleton each one into `canon.js`-style data
   first, then build the fight.
15. **Enemies hunt fighters.** Bay fighters are only hit by stray fire. Some enemies should target drones on
    purpose. Touches: `ai.js` via a patch, `roles.js`.
16. **Phone Shipyard.** A swipe tray of 112px cards, a nowrap category chip row, details as a bottom sheet,
    44px buttons. Plus the New Pilot title on phone: `phone.css:176` (34px) outranks `.ng-title`.
17. **Fix it button** for "fitting limit exceeded". It removes the cheapest parts until the build fits.
18. **Armoury filters** (family, class, owned).
19. **Straight-line hulls in the classic builder.** Lower now that Mac ruled "modular ships is the way" (modular
    hulls are already straight-edged). Placeable hard-edged plates drawn with `topdownKit` for freeform ships.
20. **Red tests that were already failing before 2026-10-25.** galaxy ring-1 "bot never dies" (stochastic,
    deaths 0.3) and hubs "structures and metal survive a reload". Both stop `npm test` before skin/hubs/roles run.

## Sources
- `docs/canon/`: Mac's Sovereign Eclipse canon (see Canon above). `js/canon.js` is its data form.
- `docs/research/RETENTION_DOSSIER_FOR_SOL_OPUS.md`: a Gemini research pass on Starsector, Space Rangers 2,
  Cosmoteer, Dredge and EVE (items 3–8 come from it; its line counts are UNVERIFIED).
- `HANDOFF_2026-10-25_menus_loot.md`: local only, the session receipts behind the top-down hulls and clip-ons.
