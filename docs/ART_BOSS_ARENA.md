# Solar Dreadnought arena · 27 October 2026

Game direction and Sovereign Eclipse canon: Mac / Lycheetah.
The guardian's exact existing name is **SOLAR DREADNOUGHT**, at Asterion Forge
sector −3,3.

## Saved production asset

`art/keyed/world/solar-ring-v1.png`: new environment plate generated through the
built-in **image_gen** tool. The selected output was copied unchanged into the
project; its original generation is preserved. `art/world-kit.json` records its
SHA-256 and the standalone embedding limit of 1024 pixels. The live site uses
the original image. No external CLI, API key or new provider runner was used.

The plate is distant parallax scenery behind live actors, not a collision map.
The existing sector boundaries remain authoritative. It replaces the generic
background treatment in the Solar arena; the campaign guardian keeps its native
1800 HP, 300 shield, phase patterns and relic reward. A connected capital model
adds the physical hull and four visible batteries. The existing native attack
patterns remain reactor-powered; destroying a battery does not silence them.

Free rehearsal uses the native holo bay with a disposable save document. It
suppresses campaign kill rewards, salvaging, roaming patrols and docking. Exit
restores the original document and save function by identity, original actor
arrays, biomass and camera. The live campaign fight uses its normal reward path.
The rehearsal's far-away dummy keeps the real chamber from clearing.

## Final generation prompt

Create one production environment background bitmap for BLACK CURRENT, a top-down modular spaceship action RPG. Use case: in-game boss arena landscape, not a poster or UI. Square composition, strict orthographic view directly from above, no perspective horizon, no camera tilt. A vast shattered ancient orbital ring surrounds an open battle space: ivory and gunmetal megastructure arcs with worn gold filigree, broken solar panels, sparse wreckage, warm amber reactor scars at the perimeter, distant dark indigo nebula and tiny stars. Strong handcrafted 2D painted game-art treatment, crisp readable shapes, restrained painterly texture, cohesive with bevelled top-down metal ship modules. Keep the central 50 percent of the image mostly empty deep blue-black space, darker and calmer than the perimeter, so bright bullets and small ships remain readable. The broken ring should be visible through the middle and outer thirds, interrupted by several wide navigable-looking gaps. Dramatic but restrained lighting, soft gold rim light, hints of cyan in very small details. NO ships, NO enemies, NO character, NO text, NO labels, NO logo, NO HUD, NO borders, NO corner vignettes. Opaque background; it will sit behind live gameplay, not act as a collision mask. Aim for a memorable ruined solar arena suitable for both landscape desktop and portrait mobile crops.

## Capture

See [TRAILER_CAPTURE.md](TRAILER_CAPTURE.md). Native boss phases and shots are
gameplay. Test captures may seed positions/phase thresholds for repeatability;
they do not establish phone FPS, encounter balance or normal progression time.

Final candidate: **22/22** focused packaged/offline checks. Native three-phase
patterns, real campaign relic, zero-reward rehearsal kill, death reset, exact
save/storage/actor/biomass restoration, mobile controls, asset and package hashes
passed. Screenshots were inspected. Fresh-pilot entry is covered without first
opening the editor. Full npm regression and actual phone play remain pending.
