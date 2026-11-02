# Sovereign Eclipse · Visual Plan (the road to EVE-class looks)

Mac's verdict on R0.19: "cool, but nowhere near EVE quality." That's correct. This plan covers what's
wrong with the image, why, and the order we fix it in. Each step ends with screenshots Mac can judge.

## 1. Honest gap: what is on screen today

| Element | Today | EVE | Gap |
|---|---|---|---|
| Ships | Procedural lofted hulls from code, plus one Blender hull (Green Seed). Shared tiling plate texture. | Hand-modelled hulls with authored UVs, layered materials (paint, bare metal, trim, decals, wear), glowing details, hundreds of small parts. | **Huge**: the single biggest reason it looks amateur |
| Materials | One plating texture, a rim light hack, flat colour per faction | Tiling detail normals, masks for paint, metal and trim, faction palettes, dirt, scorch, decals, lit windows | Huge |
| Stations / gates | Built from boxes, cylinders and tori in code | Mega-structures, each a hero model with lights, moving parts and scale cues | Huge |
| Asteroids | Low-poly faceted blobs, flat shaded | Sculpted rock with normal maps, layered colour, belts with depth | Large |
| Sky | Procedural noise nebula baked to a 512–1024 cube, Points starfield | Painted HDR nebula layers, 4k+ cubes, star clusters, a distant galaxy band | Large |
| Planets | None | Planets and moons with atmosphere, clouds and city lights | Missing |
| Lighting | Directional key, fill and rim, IBL from the procedural sky, **no shadows** | One strong sun, sharp self-shadowing on hulls, IBL, AO | Large: no self-shadowing makes hulls look like plastic |
| FX | Additive sprites: muzzle, hit, simple explosion | Flipbook explosions, shockwaves, debris, engine trails, shield ripples, warp tunnel | Large |
| Post | Bloom, ACES, vignette, optional grain and fringe | Tuned tonemap, lens flare, light shafts, DoF in station views | Medium |
| Camera | Orbit and chase, fixed FOV | Cinematic inertia, ship-size framing, undock and jump moments | Medium |
| UI | Custom panels with consistent colours, but inconsistent density and typography | Photon UI: one design system, icon set, radial menu, very clean overview | Medium |

**The truth about the target.** EVE is twenty years of a studio with hundreds of artists on a native
DirectX engine. We are one browser file on WebGL2 that must run on a phone. Parity in every frame is
not realistic. **What is realistic is EVE-class hero shots.** A ship close-up, a station undock, a
belt under a sun or a fight with explosions can read as the same calibre as EVE when the assets are
authored properly and the lighting is right. Almost all of the gap is **assets and materials**, not
engine features. The engine we have can already draw everything in this plan.

## 2. Constraints and how we beat them

| Constraint | Effect | Answer |
|---|---|---|
| Artifact page policy: inline scripts, **no WebAssembly** | No Draco, no meshopt, no KTX2/Basis (all decode with WASM) | Quantized glTF (works today), WebP textures, JS-only decoding. Textures sized by quality tier |
| Single 3.2 MB HTML today | Real assets need 30–60 MB | **Step V0.1: test multi-file artifacts.** The artifact host takes up to 256 files and 64 MB per publish. If the page can fetch its own files, assets move out of the HTML and load on demand. If it can't, assets stay embedded and we hold a strict budget (≈18 MB) |
| Phones | GPU fill rate and memory are small | Quality tiers already exist. Each asset ships high and low texture sets plus mesh LODs. Shadows, AO and big sky cubes only on high and ultra |
| No real GPU in the build container (software renderer only) | Can't measure real FPS here | Perf overlay plus Mac's devices as the benchmark. Mac reports FPS from the overlay on phone and PC each visual release |
| Blender is available headless (5.2, Cycles) | Every asset can be authored and baked in code | Python scripts, so every asset is reproducible and editable |

## 3. The look we are aiming at (art bible, short)

- **One hard sun per sector, deep shadows, rim light from the sky.** Hulls read through light and
  shadow, not through glow.
- **Scale through detail density.** Big hulls carry small things: windows, antennas, plating seams,
  running lights, hangar bays.
- **Materials tell the faction.** Paint colours, trim metals and glow colour per civilisation, from
  `ART_DIRECTION_SHIPS.md`.
- **Space is dark, light is precious.** Nebula colour stays in the background. Bloom only on true
  emitters.
- **Motion has weight.** Capitals turn slowly, the camera lags slightly, explosions push debris.

## 3b. Close-up inspection (a hard requirement)

Mac wants to zoom right in to see ship detail, so every hero asset is built to hold up **at the
closest zoom**, not just at fighting range.
- The camera can come in to about 0.6 ship-lengths from the centre (live since this plan). The near
  plane follows the zoom so the hull never clips.
- **Texel density:** hero hulls get at least 2k baked maps (4k for capitals on ultra), plus the
  tiling detail normal and roughness so plating stays crisp at any distance. Each civilisation gets
  a small decal sheet: hull numbers, faction marks, hazard stripes, vents.
- **Modelled detail, not painted:** real bevels, recessed panels, hatches, sensor domes, antennas,
  RCS thrusters and lit windows that read as geometry with depth.
- **LOD0 is the close-up mesh.** LODs only kick in once the hull is small on screen.
- **Hangar inspection mode** (V6): free orbit and focus on any part of your ship while docked, with
  DoF, like EVE's ship spin in the hangar.
- Golden frame 1 becomes a **pair**: one three-quarter view, one extreme close-up on a turret and
  hull section. `captures/visual-before/` holds today's close-ups as the starting point.

## 3c. The EVE bar (standing rule)

EVE sets the bar. **Every concept sheet, every model and every golden frame is measured against EVE**,
every time, with an honest score:
- Concept sheets carry a scorecard against the EVE frigate standard (Rifter, Rupture): thumbnail
  read, front and back, believable function, one memorable feature, mass and proportion, surface
  detail. PASS, WEAK or FAIL, with the reason.
- Golden frames are judged side by side with EVE screenshots of the same kind of shot (ship
  close-up, undock, belt, fight). Mac's own EVE screenshots are the reference. CCP's art is never
  copied into the repo or the game; we study the principles, not the shapes.
- Nothing moves to the next stage while it still has a FAIL that stage is meant to fix.

## 4. Golden frames (how we judge progress)

`tools/golden.mjs` renders the same **eight fixed shots** at ultra every visual release:
1. Hero frigate: three-quarter view with the sun behind, plus an extreme close-up of a turret and the plating.
2. Battleship side profile at mid distance.
3. Undock from Asterion Forge.
4. Asteroid belt with a ship for scale.
5. The PILLAR gate.
6. Mid-fight: tracers, hits and an explosion.
7. Erebos Reach: Helios Bastion and the cold star.
8. Station screen (UI).

Each release posts **before/after pairs**, and Mac judges them side by side with EVE reference
shots. Nothing ships as "better" unless the pairs show it.

## 4b. Scale pass (in progress)

EVE-sized space, set with Mac: frigate 60 m, destroyer 140 m, cruiser 280 m, battlecruiser 480 m,
battleship 1 km, dreadnought and carrier about 3 km, titan **21 km** ("ours have to be bigger").
- `src/core/scale.js`: `WORLD = 6` multiplies every distance and speed in space (sector layout,
  station and gate sizes, lock, dock, gate, loot, scan and gun ranges, ship speeds), so combat
  and travel timing stay as tuned. `CLASS_LENGTH` gives real hull lengths. Hit maths keeps its
  tuned signature radius (`flight.sig`), so no combat rebalance is needed.
- Renderer: landmark visuals, rock fields, beacons and dust are scaled; the camera can zoom out to
  30 km; the near plane follows the zoom; reversed depth is requested for long-range precision.
- The Gravity Fang (60 m) and Green Seed (55 m) are wired in at real length.
- **Still to do:** pass the release check on the new scale (the test distances are scaled; it
  has not been run end to end yet), then publish. After that: the Maw Cruiser (280 m) and Black Sun
  (1 km) concepts redone at true size, with detail in metres (2 m windows, hangar doors,
  running-light strips) so their size reads.
- Noted: the title screen's civilisation picker overflows on a 640×360 screen.

## 5. The phases

### V0 · Foundation (1 release)
- **V0.1 Multi-file test:** publish a tiny artifact with `index.html` plus `test.glb` and
  `test.webp` and check that it loads them on desktop and phone. This sets the asset budget for
  everything else.
- **V0.2 Asset loader:** load assets by quality tier with a progress bar, falling back to embedded
  assets.
- **V0.3 Golden frames tool** and a reference board of EVE shots for comparison.
- **V0.4 Material system rework (the core of the look):** one shader for all hulls:
  - a mask texture: R paint, G bare metal, B trim, A glow;
  - per-faction palette uniforms (paint ×2, trim metal, glow colour);
  - a **tiling detail normal** and roughness at small scale, laid over the baked large-scale normal
    and AO (EVE's main trick);
  - wear, dirt and scorch from a grunge map plus curvature;
  - window and running-light emissive driven by the glow mask, with a slow flicker.

### V1 · Ships (3 releases: the biggest win)
- **Blender kitbash library:** engines, nozzles, turrets (hero models with barrels for the moving
  turrets), antennas, radiators, hangar bays, armour plates, greebles, window strips. Built once,
  used by every hull.
- **Hero hulls in Blender**, authored UVs, baked normal, AO and curvature, and masks for the V0.4
  shader:
  - V1a: three civilisations × frigate, destroyer, cruiser, battleship (12 hulls), starting with
    Blackhole "Zero Maw" and Savanah.
  - V1b: the next five civilisations (20 hulls).
  - V1c: the last six civilisations, plus the capitals shown in the induction and fights.
- Hulls that don't have a hero model yet keep the procedural hull, now **using the new material**,
  so even they improve.
- **Turret models** per weapon family with yaw, pitch and recoil, replacing the code-built turrets.

### V2 · Lighting (1 release)
- **Sun shadows** on ships and stations: cascaded shadow maps on high and ultra, a single map on
  medium, off on low. This one change removes the "plastic toy" look.
- **GTAO** ambient occlusion on high and ultra.
- **Neutral (Khronos/AgX-style) tonemap** to replace ACES' orange push; exposure set per sector.
- Per-sector light rigs: sun colour and intensity, sky fill and rim from the sector palette.
- Specular IBL from the new high-resolution sky (V3), not the procedural bake.

### V3 · Environment (2 releases)
- **Sky:** Blender-rendered nebula cube maps per sector (volumetric shader, HDR), layered with a
  galaxy band and star clusters. 2k per face on high, 1k on low.
- **Planets and moons:** a sphere shader with atmosphere scattering, cloud layer, terminator and
  night-side city lights. One planet and a moon per sector, placed for composition.
- **Asteroids:** 10 sculpted rocks from Blender (normal and AO baked, two LODs), instanced into belts
  with size variety, slow tumble and colour variation. Ice and metal variants for Erebos.
- **Space dust and nebula wisps** near clouds for parallax and a sense of speed.
- Sun lens flare and light shafts when the sun is in view.

### V4 · Stations and gates (2 releases)
- Rebuild **Asterion Forge**, **Helios Bastion**, **the PILLAR** and **the Ancient Gate** as Blender
  hero models with the V0.4 materials, hangar mouths, docking lights, moving rings and traffic
  (small NPC shuttles on loops).
- Landmark sites (Cold Cathedral, Mirror Well, Bone Ring, Current Breach) re-authored in Blender to
  their canon descriptions.

### V5 · Effects (1 release)
- **Flipbook explosions** rendered in Blender (fire and smoke volumes, 8×8 sheets): small, ship and
  capital sizes, with shockwave ring, debris chunks and lingering embers.
- Muzzle flash flipbooks per weapon family, beam cores with heat shimmer, missile trails.
- Shield impact: a hex ripple on the shield shape. Armour hits throw sparks and leave scorch decals.
- Engine trails on fast ships, plus jump spool and jump tunnel effects for ZJ and gates.

### V6 · Camera and moments (1 release)
- Camera inertia and framing scaled to ship size; adjustable FOV; DoF in the station view.
- Cinematic undock (a short rail shot out of the hangar), gate jump sequence, a slow-motion beat on
  a capital kill.

### V7 · Interface (1 release)
- One design system: type scale, spacing, panel styles and an **SVG icon set** (ship classes,
  factions, sites, modules).
- Overview, target panel and HUD redrawn to that system; radial menu on the selected object (fly to,
  orbit, lock, loot, jump); cleaner phone layout.

### V8 · Devices (continuous)
- Budgets per tier (triangles, draw calls, texture memory). Each release Mac reports FPS from the
  perf overlay on phone and PC; we tune tiers until high runs at 60 on a mid PC and low at 30 or
  more on a mid phone.

## 6. Order and pace

| Step | Releases | Why here |
|---|---|---|
| V0 Foundation | 1 | Everything depends on the asset budget and the new material |
| V1a Ships (first 12 hulls) | 1 | The thing Mac cares about most: Rifter and Rupture calibre |
| V2 Lighting | 1 | Shadows make every asset look twice as good |
| V3 Environment | 2 | Sky, planets and asteroids fill most of every frame |
| V1b/V1c Ships | 2 | The rest of the fleet |
| V4 Stations and gates | 2 | Undock and gates are the money shots |
| V5 Effects | 1 | Combat feel |
| V6 Camera | 1 | Moments |
| V7 Interface | 1 | Photon-class UI |

About **12 visual releases**. Gameplay releases (modules, trade, contracts) **pause** until V0–V3
are done, per Mac's order: graphics engine first, then UI, then gameplay. After V3 they alternate
one-for-one with visual releases.

## 7. Risks

- **Multi-file artifacts may be blocked.** The fallback is embedded assets at about 18 MB, with
  fewer hero hulls at 1k textures, still far above today.
- **Phone memory.** Big textures may crash older phones. Low tier ships 512 px textures and no
  shadows.
- **Taste.** Golden frames keep this honest, and Mac has the final say on every look.

## Hero hulls pass 2 and the turret set (R0.24b)

What made the first hero hulls read as procedural, against the EVE bar: limbs that were smooth
tubes with rings, big plain armour plates, nothing in the gaps between them, windows scattered
over armour like dominoes, flat-disc barbettes, and code-built guns.

New kit tools (`tools/blender/shipkit.py`, "pass 2"):
- `limb`: a limb of overlapping faceted armour sleeves (6 to 8 sides, flared lips, a dark core,
  a faceted fang tip) instead of a soft tube; returns a sampler to place spines and talons.
- `shell_patch(panels=…)`: irregular recessed sub-panels cut into every armour plate.
- `machinery`: equipment stacks, tanks, clamped pipe runs, vent blocks and dishes placed on
  the hull surface (in the gaps, or low on top of plates as hardware).
- `armour_ring`, `cowl`, `deck_windows` (windows only on the inner hull and superstructure),
  `surf` (point and normal on a loft), and hard edges kept sharp by angle on every part.

Maw Cruiser: segmented jaws with faceted fangs and spines, an armoured collar ring, ribbed vanes
with emitter pods, machinery and conduits, stepped barbettes, drive cowls (210k triangles).
Black Sun: segmented claws with spines and talons, a three-hoop containment cage around the star,
an armoured singularity ring, ribbed blades with sensor pods, the same armour and machinery
treatment (269k triangles).

Turrets (`tools/blender/turrets.py`, `src/data/models/turrets.glb`): five authored families
(cannon, rail, beam, plasma, launcher) split at the joints the game animates (base, yaw housing,
pitch mantlet, barrel). Every hardpoint on every ship uses them; the generated turret remains
the fallback until the file loads. Review sheet: `tools/blender/turret_preview.py`.

Studio frames: `docs/concepts/maw_cruiser_v2_*.png`, `black_sun_v2_*.png`, `turrets_v1.png`.
Next: the Gravity Fang and Green Seed get the same pass; texture density (4k bake or a tiling
detail layer) is the next visible gap on close zoom.
