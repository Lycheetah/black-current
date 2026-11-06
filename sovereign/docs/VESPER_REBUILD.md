# Vesper Basilica — focused quality rebuild

Mac redirected the nine-hull production run toward quality over quantity. Eight
initial rendered studies are preserved; Lattice Tyrant stopped during baking.
Only Vesper Basilica was added to the active fleet in this pass.

The broad sail has been replaced by six individually roofed citadel bays. Closed
lancet frames have real openings and smaller inner frames. Recessed walls, rose
tracery, gallery decks, crew-sized windows and anchored flying buttresses give the
side profile depth. Cut armour plates, service wells, louvres and fasteners follow
the actual roof planes. Inhabited aisles carry six weapon foundations, a paired
forward ram and protected engine roots.

This is original scripted Blender geometry by Caelorynth for Mackenzie Conor James
Clark / Lycheetah, using the established project ship kit. Each panel was not
manually sculpted. EVE quality parity is not claimed; Mac's assessment remains open.

Review: `captures/elite-nine/vesper.html` shows the final export, the earlier study
and the existing cloud-authored Savanah Apex in the same studio lighting. Editable
source: `tools/blender/ships/vesper_basilica.py`. Native scene, saved before baking
and joining: `tools/blender/out/vesper_basilica.blend`.

## Production receipt

- Final export: 530,542 triangles, 17,823 KiB packed GLB with 2K PBR maps.
- The existing importer read six weapon nodes and three named engine markers.
- The generated blueprint selects the existing Amethyst Angels battleship class
  at 1,000 metres and uses `vesper_basilica_hero.glb`.
- Registry generation found 31 blueprints and 39 models. The other newly generated
  models are preserved as studies without new active fleet blueprints.
- The final exported-model studio image was visually inspected.
- The game, Hull Forge and Sector Forge build completed. The model queue's focused
  six-request acceptance passed; see `SHIP_STREAMING.md`.

Full gameplay regression and device performance did not run. This detailed hero
asset remains a candidate for artistic review and later optimisation. No commit,
push or publication was performed.
