# Black Current

Build a strange little ship. Strip the guns off something bigger. Bring the salvage home.

**Black Current** is a single-player browser action RPG about building your own
modular spaceship, fighting hostile fleets and turning recovered equipment into
your next build. Fly from a small two-gun frigate toward larger hulls, specialised
weapons and dangerous outer systems. Made by **Mac / Lycheetah**.

The loop is **build → fight → salvage → refit → explore somewhere harder**.
Your ship is both your character build and your vehicle: its guns, armour,
shields, engines and support modules determine what it can do. Enemies have
damageable parts too. Progress stays in your browser between visits.

This is currently a single-player prototype. Private co-op is planned in the
[development roadmap](docs/PLAN.md); there is no multiplayer service yet.

**[Enter the Current →](https://lycheetah.github.io/black-current/)**

- [Play the current browser build](https://lycheetah.github.io/black-current/play/)
- [Download the standalone HTML snapshot](https://lycheetah.github.io/black-current/download/black-current.html)
- [Atmosphere and future ideas](docs/ATMOSPHERE.md)
- [RPG research and progression findings](docs/RPG_RESEARCH.md)
- [Development guide](docs/DEVELOPMENT.md)
- [Changelog](CHANGELOG.md)

This is a work in progress. The browser build uses the source from the latest deployed
commit; the downloadable file is a separately generated snapshot. Desktop keyboard and
mouse are the recommended way to try it. Touch controls exist; phone feel and performance
still need testing on actual devices.

## Your first flight

1. Choose a civilisation and callsign, then build a ship from the supplied
   two-gun kit or launch a premade. A fresh campaign starts with **100 metal**
   for optional extras.
2. Talk to the home dockkeeper for your first job. Training grounds provide
   low-risk practice with tiny rewards; ordinary sectors are where you earn upgrades.
3. Fight, collect metal and recover physical fittings. Compare weapons by
   **DPS, damage per round, cycle and power**, rather than damage alone.
4. Fit owned hardware into compatible slots while travelling. Dock at a
   station to buy equipment or rebuild hull sections.
5. Use the sector chart to plot routes to stations, gates and encounters.
   The optional Jelly Shoal detour offers a fitting reward; deeper systems
   bring stronger fleets, limited stock and larger ship goals.

**Metal** buys hardware, fabrication and training. **Biomass** is collected
progression used for hull unlocks. **Module slots and reactor power** limit
what fits on a modular ship. The Equipment Codex explains each fitting’s role,
stats and compatible slot.

## What's in the prototype

- A Captain build, paid specialisation training, recovered AI augments and a quest journal.
- Ordinary weapons bought once; special/capital research and six mount classes from point defence to capital.
- A build-first opening with 100 starting metal, a free two-gun kit, affordable extras, optional premades and a saved-build library.
- A shipyard with pictured parts, a large preview, an inspector and undo/redo.
- Ship identity: five hull finishes, eight paint schemes, custom accents, markings and six fitting layouts.
- Modular hulls: guns, thrusters, shields and cores change how your ship fights.
- Coherent enemy hulls cover real damageable modules; parts can be shot off and recovered.
- Distinct ranged scouts, gunships, artillery, carriers and charging enemies.
- Optional target lock with manual aim override, plus a mobile aiming/firing joystick.
- A visual Equipment Codex explains weapons, systems, hull parts and recovered traits, with collection history and a direct fitting-shop route.
- Faction commissions offer named physical fittings; outer-system stations carry limited specials with saved quantities and scheduled rotation.
- A 96-system galaxy with expanded 9–13-wide local sector grids, jump routes, encounters, contracts and bosses.
- Docking, a parts market, metal salvage, buildable structures and raids.
- Plated hull skins, drone bays, repair and siphon roles, and wing escorts.
- A pause menu, settings and a gentler opening area.
- A special Grave Choir excursion and a wreck to recover after death.
- Procedural sound and an abyssal backdrop.

These are implemented prototype systems, not a promise of finished balance or content.
Save data stays in your browser. Changing browser, device or site address changes the save
location; export designs you want to keep.

Supplied Novice decks take Novice guns only. A new Light deck costs **96 metal**;
Light guns start at **48**, for **144 total** when neither is owned. Preview the
conversion from a Novice slot or My progression. Apply buys missing hardware at
a station; no research or new frame is required. Larger mounts list smaller
guns as fallback fits, with their original weapon stats.

Owned equipment can be swapped in the field. Buy hardware and rebuild hull sections at stations. Modular ships use physical module slots and reactor power; the old GP/fire-control gates do not apply.

In the Shipyard, **New ship** clears the blueprint while retaining your captain and
wallet. **New campaign** in My builds resets progression and money after confirmation,
with a restorable previous-campaign backup. Metal is spendable; Biomass is collected progression. Module slots and reactor power limit modular fits.

## Controls

| Input | Action |
| --- | --- |
| WASD / arrow keys | Move |
| Mouse / hold primary button | Aim / fire |
| Space / Q | Ability |
| 1–4 | Reactor doctrine |
| Y / Tab / B | Shipyard |
| M | Sector chart |
| L | Toggle target lock |
| V | Toggle sustained cruise: +65% thrust, −75% battery damage |
| Shift / full aim-stick push | Override target lock with manual aim |
| F1 | Diagnostics |
| Escape / P | Pause menu / close an overlay |

## Run locally

The game has no runtime package dependencies and needs no compilation:

```sh
python3 -m http.server 8811
```

Open `http://localhost:8811/`. The source entry is `index.html`; the generated standalone
snapshot is `dist/black-current.html`. See the development guide for optional browser checks
and the public-site packaging command.

The repository keeps playable source, art, useful tools and current public documentation.
Historical planning notes and inactive experiments remain preserved in local development
copies and Git history; they are outside the current published tree.

## AGENT: START HERE

**The master plan is [docs/PLAN.md](docs/PLAN.md): one route in seven stages, from Forge
foundation to the capital endgame.** Read its rules first: work the stages in order,
delete an item in the same commit that lands it, and remember `main` is not the live site
(Pages serves `gh-pages`; see its Deploy section). Dated plans and handoffs are history.

Check Git state and the [changelog](CHANGELOG.md) before editing.
Current published build: **2.11.0-rc.13 · Threat ladder** (cache `20261028s68`).
Runtime source `ef975d7`, Pages `939cf45`; Pages built and all11 changed live
files match the exact checked package. Receipt:
`shots/release-candidate/publication-rc13.json`.
`test:scaling` passed22/22 against that package: protected opening, home3/4/5
steps, fixed deep threats to10, mixed fleets, physical fitting classes,
frame durability, no refit/stat-recalculation healing, real firing/collision
kills, exact native payouts and bounded hull textures. Captures inspected.
`test:candidate` passed25/25 exact-package/offline checks:647 files,646 hashes,
169 embedded art images, build-first/premade launch, services and Continue.
Native stationary-target kills took about1.5/5.6/8.2/26.7seconds for matched
cruiser/battleship/capital/titan fits versus tiers3/5/7/10. These are controlled
combat probes; coordinated-fleet survival, actual phone FPS/feel, audio taste
and full regression remain pending. No extra map rings shipped.
Desktop rc.13 HTML matches SHA256
`12da00e3e3efe5f96997fe0c3a7366512650087db0346facb4b2cd5cdfdab1a6`.
Frame bonuses run from+300 cruiser to+22,000 titan hull HP. Ordinary deep
fleets use one flagship, two escorts and lighter screens, with normal tier10
bounties up to1,500 metal. Long-battery target lock reaches3,000 units;
Novice range stays at1,300. Authored bosses, Swarm, training and jelly encounters
keep separate rules. Capital shield/repair-module progression and authored
boss scaling still need their own work.
Antigravity is continuing the separate module/cosmetic-art lane.
Build the selected-source candidate with `python3 scripts/build-candidate.py`.
It refreshes `dist/black-current.html`, a versioned sibling, and the publishable
`dist/release-candidate/` directory without shipping the incoming art inbox.
`npm run test:candidate` checks the generated package and offline HTML; it does
not replace the full regression suite or Mac’s phone playtest. The current
starter and fitting adapters are `novice-ships.js`, `pve-frontier.js`,
`recovered-fittings.js`, `section-art.js`, `turret-art.js` and `battery-audio.js`.
`modular-phone.js` owns the phone panes; `hangar-ui.js` lists your fitted slots,
one-tap compatible equipment, compact shopping rows and frame requirements. `wallet-panel.js` and `hud-layout.css`
keep resources and HUD regions readable. `navigation-hud.js` owns radar landmarks.
`starter-journey.js` owns the build-first opening, `accessible-progression.js` owns ordinary weapon access, and `station-grid.js` owns the station service landing page.
`equipment-codex.js` reads the fitting registries and records collection metadata through the existing save path. Focused guide check: `npm run test:codex`.
`quartermaster.js` adds commissions to the existing contract/journal flow and limited stock to the native shop. It uses the same modular hold and metal balance; `npm run test:supply` covers its save, purchase and phone paths.
`progression-path.js` owns the price/bounty ladder and compact native progression view.
`npm run test:progression` measures native rewards and covers earned fitting,
Shipwright training, layout-preserving frame upgrades and failed-save rollback.
`faction-fleets.js` composes three shared canon fleet styles; `faction-art.js`
loads the twelve accepted assets in `art/faction-kit.json`. `boss-scenes.js`
adds the Solar Dreadnought environment, disposable rehearsal and capture view.
`art/world-kit.json` owns the generated arena plate. Focused checks:
`npm run test:factions` and `npm run test:boss-scenes`.
The current refinement adds touch flight help, inspect-before-fit shop details
and separate journal views. Focused check: `npm run test:refinement`.
The masterplan, including proposed room-code co-op, stays in `docs/PLAN.md`.
`python3 scripts/render-roadmap.py` regenerates its SVG/PNG view; it is not a
second task list. [Capture handoff](docs/TRAILER_CAPTURE.md).
Focused journey: `npm run test:journey`. Focused fitting coverage: `npm run test:hangar`; touch construction: `npm run test:phone-fitting`.
`forge-reset.js` owns the one-time development reset. From Stage 0 of the master route,
the six original combat and editor sources may be edited directly under behaviour witnesses.

Incoming art lives under `art/review/`; preserve it and select explicit assets for
`art/keyed/`. The nine accepted section and turret files have manifests there.
[Art integration notes](docs/ART_NOVICE_FLEET.md) record provenance and prompts.
Dated handoffs describe their recorded moment; the living plan and latest
changelog describe current work. Run browser checks muted with
`PULSE_SERVER=unix:/nonexistent`. Pages serves `gh-pages`, not `main`.
