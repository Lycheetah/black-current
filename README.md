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

Check the current Git state and [changelog](CHANGELOG.md) before editing. The
[shipbuilding handoff](docs/HANDOFF_2026-10-25_SHIPBUILDING.md) records the current
uncommitted modular-builder batch, focused checks and remaining release gates. The
[baton handoff](docs/HANDOFF_2026-10-24_BATON.md) describes the 2.6.0 baseline; the
2.7.0 entry describes the RPG slice. Its adapters are `armory.js`,
`pilot.js`, `workshop-library.js`, `contacts.js`, `first-expedition.js`,
`ship-identity.js`, `fresh-campaign.js`, `workshop-catalog.js` and `wallet-ui.js`.
Ship identity lives on each blueprint; layout tools move existing
nodes, while cosmetic finishes leave combat stats alone. Run browser checks with
`PULSE_SERVER=unix:/nonexistent`. Commit and publish only when Mac asks.
