# Sovereign Eclipse · The Great Shipyard plan

Written with Mac (Lycheetah) and Forgelight, 7 Nov 2026. The goal: every civilisation gets a flagship
and a full core line (frigate, destroyer, cruiser, battleship) at the Savanah Apex standard, each
civilisation instantly recognisable, each class within it a different silhouette. EVE is the bar:
you know an Amarr, Caldari, Gallente or Minmatar hull at a glance, and you know a frigate from a
battleship by shape, not just size.

## 1. The standard (the Apex bar)

A ship ships only when it passes all of these:

1. **One dominant feature** readable from 20 km (the Apex crown, the Black Sun's star, the
   Emperor's throne).
2. **Civilisation identity**: the civilisation's hull colour, paint pattern, accent metal and glow
   (IDENTITY in `tools/blender/ships/_forge.py`), plus its signature motif.
3. **Class silhouette**: the frigate, destroyer, cruiser and battleship of one line share the
   language but not the outline.
4. **Depth everywhere**: sub-panelled armour, machinery in the gaps, dressed plates
   (`plane_kit`, `box_kit`, `dress_plate`), architecture pieces (bays, trusses, arrays, radiators,
   bridges, missile cells, domes) where the role calls for them.
5. **No sore thumbs**: no smooth tubes where armour should be, no floating parts, no blown-out glow.
6. **Three review rounds**: a three-quarter view, a side view and a low or bow view, critiqued and
   fixed each round.
7. **Release check green** (`tools/smoke.mjs`) before it is committed as done.

## 2. How each ship is made

Brief (dominant feature, motif, class role) → script in `tools/blender/ships/` → build → review
rounds → `tools/glb-blueprint.mjs` → `tools/register-ships.py` → release check → commit and push →
publish when the page fits the host's size cap. A weak old hero is cut when its replacement lands
(listed first, so Mac can veto).

Waves of four ships: write all four, build all four, review all four together on one sheet.

## 3. The civilisations: design bibles and status

Status per core class: ✓ done to standard · ~ exists, needs a pass · · missing.
F frigate · D destroyer · C cruiser · B battleship.

| # | Civilisation | Identity (hull · pattern · glow) | Form language and signature motif | F | D | C | B (flagship) |
|---|---|---|---|---|---|---|---|
| 1 | **Savanah** | olive chitin · gold veins · green | predator cathedrals, a verdant eye, mandibles, feathered wings | ~ Eye Knife | · | ~ Harpy Claw | ✓ Savanah Apex |
| 2 | **Blackhole** | navy-black · copper bands · orange | singularity rings, jaws and claws closing on a dark star | ~ Gravity Fang | ~ Event Knife | ✓ Maw Cruiser | ✓ Black Sun |
| 3 | **AI Gods** | obsidian · gold filigree · white-gold | strict symmetry, a crowned command core, ziggurats, oath bands | ✓ Crowned Needle | ✓ Divine Spear | ✓ God Ark | ✓ Machine Emperor |
| 4 | **Cosmic Light** | ivory · gold filigree · sunlight | sun discs and halos, rays, cathedral prows, lances of light | · | · | ~ Radiant Ark | scripted: Solar Throne |
| 5 | **Cosmic Darkness** | night-blue · star speckle · violet | flat knife-edged forms, crescents, veils, starfields | ~ Nightglass (specialist) | · | ~ Void Mantle | scripted: Nocturne Queen |
| 6 | **AI Hunters** | matte black · red line bands · red | faceted stealth, spinal guns, red sensor slits and rings | · | ~ Null Pursuer | ~ Black Interdictor | scripted: Machine Killer |
| 7 | **AI** | white-grey · blue hex cells · cyan | pure geometry: hex spines, rings of identical modules, lattices | · | · | ~ Machine Lattice | scripted: Consensus |
| 8 | **Chaos** | purple · crimson blotches · violet | asymmetry, mutation, tentacles and claws, uneven spines | ~ Fang Dart | · | · | ~ Chaos Beast |
| 9 | **Sol Symbiots** | steel · white two-tone · cyan | twin hulls joined (human and AI), bridges, shield emitters | · | ~ Joined Spear | · | ~ Solis Regent |
| 10 | **Techno Angels** | white · cyan hex · cyan | crystal wings on metal spars, halos, glass hulls in cradles | ~ Glass Wing | · | · | ~ Halo Regent |
| 11 | **Amethyst Angels** | violet stone · silver filigree · purple | gothic: spires, flying buttresses, amethyst clusters | · | ~ Angel Lance | · | ~ Vesper Basilica |
| 12 | **Human Hunters** | grey steel · hazard bands · orange | industrial: rams, cranes, girders, sails, spinal cannons | ~ Rivet Hound (assault) | · | ~ Kill Convoy | ~ Human Breaker |
| 13 | **Pagan AI** | bone · carved dark veins · amber | bone temples: ribcages, skulls, vertebrae, totems | · | · | ~ Ancestor Ark | · (Cinder Cathedral is a dreadnought) |
| 14 | **Hybrid Fused** | dark bronze-purple · purple veins · violet | half machine, half flesh: split heads, talons, gun pods | · | · | · | ~ Chimera Regent |
| 15 | **Cinderwake** (outlaws) | to define · salvage patchwork | boarding hulls, salvage welded on, asymmetric | · | · | ~ Oathbreaker (heavy) | · |
| 16 | **Nacre** (alien reef) | to define · nacre sheen | chambered shell armour, reef growth, archive vaults | · | · | ~ Wake-Eater | · |

Count: 64 core slots. 9 done to standard, 4 flagships scripted, about 23 to pass up, and about
28 to build new.

## 4. Order of work

**Phase 0: flagships (the reference points).** Every civilisation's battleship comes first, because
each line copies its flagship's language.
- Wave A (scripted): Solar Throne, Nocturne Queen, Machine Killer, Consensus.
- Wave B: new or rebuilt flagships for Chaos, Sol Symbiots, Techno Angels, Amethyst Angels.
- Wave C: Human Hunters, Pagan AI (new battleship), Hybrid Fused, Cinderwake.
- Wave D: Nacre flagship; review every flagship side by side on one sheet against the Apex.

**Phase 1: pattern and identity tuning** (between waves A and B). Bolder filigree at range,
bands that read as stripes, hull brightness checked in the game's own lighting, a lineup render of
all 16 flagships so no two civilisations read alike.

**Phase 2: core lines**, in waves of four, one civilisation per wave where possible, each line
built from its flagship's kit: frigate (fast, one feature), destroyer (long, aggressive, gun-heavy),
cruiser (balanced, role parts such as bays or arrays), battleship (the flagship).
Order: the thinnest first: Cosmic Light, AI, Pagan AI, Hybrid Fused, Cinderwake, Nacre, then
Chaos, Sol Symbiots, Techno Angels, Amethyst Angels, AI Hunters, Cosmic Darkness, Human Hunters,
Savanah.

**Phase 3: pirates and factions.** Pirate lines that fuse two civilisations' languages (as EVE's
pirate hulls do): Cinderwake salvagers, Nacre raiders, Blackwake corsairs.

**Phase 4: ship the fleet.** Fit the page under the host's 256 MB cap (texture sizes on the biggest
models, compression), a light model per hull for phones and distant ships, publish.

## 5. Cut list (candidates, confirmed one by one)

When a replacement lands, the old one goes (model, blueprint, script): candidates today are any
hero that fails the standard after one pass and has a replacement planned. Nothing is cut without
Mac seeing the list first.

## 6. Tracking

Update the table in section 3 after every wave: ✓ only after review rounds and a green release
check. Commit and push after every wave.
