# Black Current

Build a strange little ship. Strip the guns off something bigger. Bring the salvage home.

**Black Current** is a pilot-and-ship RPG prototype about modular living ships, heavy
guns and getting a little too curious in a dark ocean of space. Made by **Mac / Lycheetah**.

**[Enter the Current →](https://lycheetah.github.io/black-current/)**

- [Play the current browser build](https://lycheetah.github.io/black-current/play/)
- [Download the standalone HTML snapshot](https://lycheetah.github.io/black-current/download/black-current.html)
- [Atmosphere and future ideas](docs/ATMOSPHERE.md)
- [RPG research and progression findings](docs/RPG_RESEARCH.md)
- [Development guide](docs/DEVELOPMENT.md)
- [Changelog](CHANGELOG.md)

**2.9 development reset:** older campaigns are cleared once for the new novice
fleet. New progress is retained after that first load.

This is a work in progress. The browser build uses the source from the latest deployed
commit; the downloadable file is a separately generated snapshot. Desktop keyboard and
mouse are the recommended way to try it. Touch controls exist; phone feel and performance
still need testing on actual devices.

## What's in the prototype

- A Captain build, paid specialisation training, recovered AI augments and a quest journal.
- Weapon research, fire-control investments and six mount classes from point defence to capital.
- A saved-build library with New ship, Save build, export and an optional legacy archive.
- A shipyard with pictured parts, a large preview, an inspector and undo/redo.
- Ship identity: five hull finishes, eight paint schemes, custom accents, markings and six fitting layouts.
- Modular hulls: guns, thrusters, shields and cores change how your ship fights.
- Parts can be shot off enemies and collected as salvage.
- A 96-system galaxy with jump routes, local encounters, contracts and bosses.
- Docking, a parts market, metal salvage, buildable structures and raids.
- Plated hull skins, drone bays, repair and siphon roles, and wing escorts.
- A pause menu, settings and a gentler opening area.
- A special Grave Choir excursion and a wreck to recover after death.
- Procedural sound and an abyssal backdrop.

These are implemented prototype systems, not a promise of finished balance or content.
Save data stays in your browser. Changing browser, device or site address changes the save
location; export designs you want to keep.

In the Shipyard, **New ship** clears the blueprint while retaining your captain and
wallet. **New campaign** in My builds resets progression and money after confirmation,
with a restorable previous-campaign backup. GP is fitting capacity, not spendable metal.

## Controls

| Input | Action |
| --- | --- |
| WASD / arrow keys | Move |
| Mouse / hold primary button | Aim / fire |
| Space / Q | Ability |
| 1–4 | Reactor doctrine |
| Y / Tab / B | Shipyard |
| M | Sector chart |
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

**The living backlog is [docs/PLAN.md](docs/PLAN.md).** Read its rules first: work top-down,
delete an item in the same commit that lands it, and remember `main` is not the live site
(Pages serves `gh-pages`; see its Deploy section). Dated plans and handoffs are history.

Check Git state and the 2.9.0 [changelog](CHANGELOG.md) before editing. The current
starter and fitting adapters are `novice-ships.js`, `pve-frontier.js`,
`recovered-fittings.js`, `section-art.js`, `turret-art.js` and `battery-audio.js`.
`forge-reset.js` owns the one-time development reset. The six original combat and
editor sources remain hash protected; extend them through adapters.

Incoming art lives under `art/review/`; preserve it and select explicit assets for
`art/keyed/`. The nine accepted section and turret files have manifests there.
[Art integration notes](docs/ART_NOVICE_FLEET.md) record provenance and prompts.
Dated handoffs describe their recorded moment; the living plan and latest
changelog describe current work. Run browser checks muted with
`PULSE_SERVER=unix:/nonexistent`. Pages serves `gh-pages`, not `main`.
