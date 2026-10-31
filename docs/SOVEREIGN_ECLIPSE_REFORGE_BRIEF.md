# Sovereign Eclipse: the Reforge brief

For the Claude Code session that rebuilds Sovereign Eclipse from scratch. Mac (Lycheetah) owns design, direction and
every release decision. Written 2026-10-31 from the Black Current session that read both games.

## What Sovereign Eclipse is

A single-player 3D space-combat and exploration game set in the Black Current: capital ships that steer like heavy
vessels, physical shipwright work (**NODE = HARDPOINT = GUN**), scanner-led discovery, living civilisations and
authored operations with consequences. Tagline: *"The light you carry is not given; it is earned."*

Its original lives in `Lycheetah/lycheetah-sovereign-eclipse`:
- `SOVEREIGN_ECLIPSE_WORKMODE_0298_CONTINUE.html`: Forge 0.29.8, the newest playable file (1.6 MB, one file,
  Three.js 0.180 from jsDelivr). Sovereign Command Grid, Elite Shipwright four-stage hull forge, Overview, scanner
  Atlas (detect → triangulate → scan → understand → resolve), anatomy damage (shield → local armour → penetration →
  structure → systems), weapon groups (fore/mid/aft, manual or autonomous), AI cores, drone wings, research and
  industry, faction standing, legality and markets, mobile touch flight.
- `sovereign-eclipse/`: an older modular extraction (0.27.5.2). Data modules are clean (`src/ships/*`: classes,
  races, a 252-hull catalog, weapons, modules; `src/progression/*`; `src/zones/*`: the nine Micro-ZJ war worlds;
  `src/world/zone-registry.js`). Everything else is still a 546 KB `src/main.js`. Its `PHASE.md` shows the
  extraction stalled at camera/input, combat functions and UI.
- A later **Forge 0.77.11** is referenced by the canon bible but is not in that repository. Ask Mac for it first; it
  is the best reference if it exists.

Canon (authoritative for names, factions, hulls and places) is in `Lycheetah/black-current` `docs/canon/`:
the Master Canon Bible, the 15-civilisation Pantheon and the 270 faction hulls. `js/canon.js` there is the same canon
as data.

Black Current is a separate 2D action RPG that drew on this canon. It is not the codebase to extend.

## The goal

A clean, modular rebuild with **our own engine**: the game loop, simulation, entity data, input, camera, UI framework,
save and build pipeline are ours and written for this game. Three.js is used only as the renderer (scene graph, WebGL,
materials). Writing a raw WebGL renderer first would spend weeks before a ship flies; swap it later only if measured
need appears.

Platform: the browser (desktop first, phone supported), shipped as one HTML file like the original, so it stays
playable from a link and on itch.io.

## Architecture rules (the reasons the last two codebases got fragile)

1. **Simulation is separate from rendering.** A fixed-timestep simulation owns all game state (ships, shots, damage,
   AI, economy). Renderers and UI read it and never write it. This is what makes later co-op, replays and headless
   tests possible.
2. **One owner per rule.** Each piece of state has one module that writes it. No monkey-patching or wrapping other
   modules' functions to change behaviour; extend through explicit hooks or events.
3. **Data-driven content.** Hulls, modules, weapons, factions, zones and operations are data files imported from the
   original and the canon, validated at load.
4. **Small modules, plain modern JavaScript (ES modules, JSDoc types)**, a single build step (esbuild or similar) to
   one HTML file. No framework.
5. **Versioned saves** with migration from day one; never block a new game on a full storage quota (offer a file
   download).
6. **Lean checks.** A handful of fast headless smoke checks (boots, flies, fits, fights, saves) plus a screenshot
   script. No large test suites per feature: Mac's rule is no 36k lines of tests for 5k of game.

## Vertical slice: the first milestone

Done when Mac can, in the browser and on phone:
1. Launch from Asterion Forge in Naraka Veil under the spectral black sun.
2. Fly a capital-weighted ship with the independent orbit camera (desktop keys and touch).
3. Open the Overview, lock a target, fight one authored encounter with weapon groups and anatomy damage.
4. Dock, open the Elite Shipwright, move a hardpoint, fit a gun to it, and see the flying ship change.
5. Run one scanner signature from detect to resolve and get its reward.
6. Save, reload and continue.

Show each step with before/after screenshots. Then Mac decides whether Sovereign Eclipse becomes the flagship.

## After the slice (proposed order, Mac reorders)

1. Port the remaining zones and operations from the original (Erebos, Aion, Chaos Cradle, Deep Current).
2. The universe layer: systems joined by PILLAR gates and Micro-ZJ jumps, security levels with Warden patrols,
   persistent station stock and NPC traffic, faction standing and agents.
3. Industry and research loops; trade with route risk.
4. Titans and civilisation fleets from the 270-hull lineage.
5. Co-op on the separated simulation.

## Lessons carried from Black Current

- Work on one shared branch line; check what is live before building (a stale `main` cost a day).
- Publish through a pull request into the Pages branch that Mac merges; the session cannot push production directly.
- Make every batch visible: before/after captures with each release.
- Fitting must stay readable on a phone; team colours (cyan yours, red hostile) and visible shields read well.
- Small, bounded batches Mac can feel in one play session.

## Questions for Mac before code

1. Where is Forge 0.77.11, if it exists?
2. A fresh repository or a new branch in `lycheetah-sovereign-eclipse`? (The session needs write access.)
3. Keep the original's controls (W/S thrust, A/D yaw, R/F pitch, Q/E roll) or simplify for phone?

## Kickoff message (paste into the new session)

> Reforge Sovereign Eclipse from scratch as a 3D browser game on our own engine. Read
> `docs/SOVEREIGN_ECLIPSE_REFORGE_BRIEF.md` in Lycheetah/black-current first and follow it: study the original in
> Lycheetah/lycheetah-sovereign-eclipse (Forge 0.29.8 HTML and the modular `sovereign-eclipse/` tree) and the canon in
> black-current `docs/canon/`, ask me the brief's three questions, then propose the engine layout and build the
> vertical slice in small batches with screenshots.
