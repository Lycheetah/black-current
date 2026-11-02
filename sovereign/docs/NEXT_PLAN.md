# Sovereign Eclipse · The next stretch (R0.21 – R0.30)

Written after R0.20. It ties together the three plans already in the repo (`BUILD_PATH.md` for
gameplay, `VISUAL_PLAN.md` for the look, `docs/concepts/` for ships) and adds the Sector Forge, the
environment editor. Mac reorders anything.

## 1. Where we are

| Area | State | Against the EVE bar |
|---|---|---|
| Flight, combat, anatomy damage | solid; locks and turret tracking fixed in R0.20 | close in feel, behind in effects |
| Scale | true EVE scale (frigate 60 m … titan 21 km) | matches |
| Ships | 4 hero hulls (Green Seed, Gravity Fang, Maw Cruiser, Black Sun); about 250 still generated | heroes good, generated ones weak |
| Fitting | EVE-style window, 27 canon modules, budgets, live stats, saved fits | close; missing manual active modules |
| World | 2 sectors hand-coded in JS; boxy stations; faceted rocks; noise sky; no planets | far behind |
| Lighting | no shadows; the hull material is one tiling plate texture | far behind |
| Career | induction, ops, wrecks, loss, cover, market, research, fleet | the skeleton of EVE's loop |

The biggest gaps are the **world** (stations, sky, planets, belts) and **lighting and materials**.
Both are visual, and both are easier with a tool to build sectors in. That shapes the order below.

## 2. Principles (unchanged, restated)

1. **One release is one playable batch**, checked once (`tools/smoke.mjs`) and published only after
   the check passes. Never in parallel.
2. **Tools before content when a tool multiplies the content.** The concept pipeline made three
   ships in one session. The Sector Forge should do the same for sectors.
3. **The EVE bar on everything visual**: golden frames and scorecards, honest scores.
4. **The simulation owns the game; content is data**, validated at load.
5. **Alternate the tracks** (tools, visuals, ships, gameplay) so every release feels new.

## 3. The Sector Forge (environment editor)

### What it is
A standalone page like the Hull Forge (`dist/sector-forge.html`): open a sector, change it, see it,
export it. The game loads the exported file as it loads hull blueprints.

### Step 1 · Sectors become data (no visible change)
Today Naraka and Erebos are JavaScript (`src/world/*.js`) with scenery hard-wired in
`render/sector-scene.js`. They become **sector files** (`src/data/sectors/<id>.json`, schema
`sovereign.sector/1`):

```
id, name, desc, security {level, label}, home, launch {offset}
star {kind: blacksun | cold | warm, name, pos, radius, color}
sky {a, b, warm, density, stars}                       // nebula palette and starfield
landmarks [{id, name, kind, pos, radius, solid, build, opts, leadsTo}]
                                                        // build: asterion | bastion | pillar_gate |
                                                        // wreckfield | breach | cathedral | well | bone_ring | beacon
belts [{center, count, spread, size [min,max], seed, kind: rock | ice | metal}]
gates {landmarkId: {to, arrive, requires}}
operation, drill
```
- A validator (as for blueprints) reports errors in plain words.
- `sector-scene.js` builds scenery from `build` names and belts, not from sector ids.
- Naraka and Erebos are converted one-to-one, and the release check must pass unchanged.

### Step 2 · The editor
- **Plan view (top-down) and elevation view (side)**, drawn on canvas like the map: drag
  landmarks, belts and the star; scroll to zoom; grid in km.
- **Inspector**: name, kind, scenery type, radius, solid, gate target, belt count, spread, rock size
  and seed.
- **Sky panel**: nebula colours (three pickers), density, star count, star colour and position.
- **3D preview**: the game's own renderer showing the sector; orbit or fly a free camera.
- **Add, duplicate, delete**; undo and redo; **validation** live in a side panel.
- **Export** sector JSON. Saving happens in the browser (local), since the artifact viewer cannot
  download files. Copy-to-clipboard is the hand-off: the JSON goes into `src/data/sectors/`.

### Step 3 · New kinds of things to place (with the visual track)
Planets and moons (atmosphere shader), nebula clouds, ice and metal belts, Blender stations and
gates as they arrive, ambient traffic routes, and later anomaly and signature sites.

### Done when
Mac can open the Forge, move Asterion, recolour Naraka's sky, add a belt, paste the file into the
game, and fly it.

## 4. Fitting, part 2 (smaller)
- Modules you switch on yourself: afterburner (speed burst on capacitor), manual boosters and repairers
  on keys (F1 to F4), and a **module bar** on the HUD with cycle rings, as in EVE.
- Heat and overload later (an EVE depth feature), behind the bar.

## 5. Release order

| # | Release | Track | Delivers |
|---|---|---|---|
| R0.21 | **Sector Forge 1** | tool | sectors as data (Step 1) and the editor's plan view, inspector, sky panel and export (Step 2 without 3D) |
| R0.22 | **Light and metal** | visual | V0.4 hull material (paint, metal, trim, glow masks, tiling detail normal, wear) and V2 sun shadows on ships and stations: the biggest single jump in looks |
| R0.23 | **Sector Forge 2 and the sky** | tool + visual | 3D preview in the Forge; V3: Blender-rendered nebula skies, planets and moons, sculpted asteroid belts, all placeable |
| R0.24 | **Savanah line** | ships | Green Seed folded into a Savanah family: frigate, cruiser and battleship through concept, EVE bar and Blender |
| R0.25 | **Active modules** | gameplay | Fitting part 2: afterburner, manual modules on F-keys, HUD module bar |
| R0.26 | **Stations and gates** | visual | V4: Asterion, Helios Bastion, the PILLAR and the Ancient Gate as Blender hero models, placed through the Forge |
| R0.27 | **Trade** | gameplay | a market at every station, NPC stock, hauling between Asterion and Helios |
| R0.28 | **Third civilisation line** | ships | chosen by Mac (AI Hunters, Cosmic Light, Amethyst Angels or another) |
| R0.29 | **Effects** | visual | V5: flipbook explosions, shield ripples, engine trails, jump tunnel |
| R0.30 | **Contracts and agents** | gameplay | the canon contracts across sectors, agents per civilisation, standing |

After R0.30 the old Phase C continues (security, industry, drones, living space, more sectors),
still alternating with a visual or ship release each time.

## 6. What Mac does in each release
- Play-test on PC and phone, and report anything broken or ugly (screenshots help most).
- Judge the golden frames and concept sheets: pick, redirect or say "you choose".
- Read the FPS from the perf overlay on the heavier visual releases (R0.22, R0.23, R0.26).

## 7. Risks
- **Shadows and big skies on phones**: shadows only on high and ultra; skies at 1k on low.
- **Asset size**: each hero hull is about 3 to 7 MB as a JSON model file. Fine as separate files;
  watch total load time and add a loading screen with progress.
- **Editor scope creep**: the Forge ships in two steps; nothing beyond Step 2 goes into R0.21.
