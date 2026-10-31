# Making unique ships for Sovereign Eclipse

Every hull is a **blueprint** (`sovereign.hull/1` JSON). A blueprint either describes a procedural hull
(shape sliders, civilisation signature parts) or points at a **model** (`.glb`). The game, the Elite
Shipwright and the Hull Forge read the same blueprint, so a ship made any of the ways below flies,
fits guns and takes damage the same way.

## Three ways to make a ship

### 1. Hull Forge (no modelling)
Open `dist/hull-forge.html`. Pick a civilisation and class, shape the hull with sliders, choose the
signature parts and palette, drag hardpoint nodes on the model, then **COPY** the JSON.
Save it as `src/data/blueprints/<hull id>.json`, list it in `src/data/blueprints/index.js`, run `npm run build`.

### 2. A real 3D model (Blender, or an AI 3D generator)
Make the ship in **Blender** (free), or generate it with an AI image/text-to-3D tool, then clean it
up in Blender. Export **glTF Binary (.glb)**. Rules:

| Rule | Value |
|---|---|
| Axes | nose points **−Z**, up is **+Y** (Blender: export with "+Y Up" on, the default) |
| Scale | any; the game scales the model so its length matches the hull class |
| Origin | the ship's centre of mass |
| Triangles | ≤ 30k for line ships, ≤ 100k for hero hulls and Titans |
| Textures | embedded in the .glb, ≤ 2048 px, PBR (base colour, metal/rough, normal) |
| Turrets | the game builds articulated turrets on each node (yaw ring, pitch cradle, recoiling barrels) from the fitted weapon; a model only marks where they sit |
| Hardpoints | empties named `NODE_WPN_FL`, `NODE_WPN_FR`, `NODE_WPN_ML`, `NODE_WPN_MR`, `NODE_WPN_AL`, `NODE_WPN_AR` |
| Drives | empties named `ENGINE_<anything>`; the empty's scale is the nozzle radius |
| Palette | materials named `HULL…`, `TRIM…`, `GLOW…`, `GOLD…` take the civilisation palette and team colour; any other material keeps its own textures |

Drop the .glb into the Hull Forge (**LOAD .GLB**) to check it: nodes and engines are read from the
empties, and you can drag nodes on the model surface. Then copy the .glb to `src/data/models/`,
import it in `src/data/models/index.js`, save the Forge's JSON as the hull's blueprint, and build.

AI 3D generators give a fast first shape; expect to fix scale, axes, triangle count and to add the
`NODE_` and `ENGINE_` empties by hand in Blender.

### 3. Blender scripts (how the hero hulls are made)
Blender itself runs headless as a Python module, so hulls can be modelled with Blender's real tools
(subdivision surfaces, bevels, solidify, arrays, curves) from a script and exported straight to the game.

```bash
python3 -m venv /opt/blender-venv
/opt/blender-venv/bin/pip install bpy
/opt/blender-venv/bin/python tools/blender/build.py green_seed
node tools/glb-blueprint.mjs src/data/models/green_seed_hero.glb savanah_starter
/opt/blender-venv/bin/python tools/blender/render.py src/data/models/green_seed_hero.glb shots/green_seed.png 145
```

`tools/blender/shipkit.py` holds the helpers (`loft`, `shell_patch` for armour that wraps the hull,
`tube` for curved parts, `plate`, `subsurf`, `bevel`, `array`, markers, export) and the hard-surface
techniques: `panelize` (recessed armour panels with creased seams that stay sharp under subdivision),
`weighted_normals`, `vent_grille`, `conduit`, `sensor_mast`, `windows` (warm crew windows, a scale cue).
`build.py` shrinks every model with gltfpack vertex quantization (about 2.5× smaller). Meshopt
compression is deliberately off: its decoder needs WebAssembly, which the artifact viewer blocks. An uncompressed copy is kept in `tools/blender/out/` for studio renders.
Budget: ≤ 70k triangles and ≤ 900 KB packed for hero frigates and cruisers. Each ship is a script in
`tools/blender/ships/` exporting `META` and `build(kit)`. `render.py` makes a Cycles studio render for
art review before the model goes in game. Work big to small: silhouette, then layered secondary forms,
then detail (seams, vents, lights for scale).

### 4. A three.js model script (code; good for AI coding agents)
Write `tools/models/<name>.js` exporting `meta` (`name`, `length`, `hull`) and `build()`, which returns
a Three.js group built from code, with `NODE_*` / `ENGINE_*` empties and `HULL`/`TRIM`/`GOLD`/`GLOW`
materials. Then:

```bash
node tools/model-kit.mjs <name>
```

That writes `src/data/models/<meta.name>` and, when `meta.hull` is set, the matching blueprint
`src/data/blueprints/<hull>.json` with nodes read from the empties. List both in their `index.js`
files and build. `tools/models/green_seed_hero.js` (the Savanah Green Seed) is the worked example,
following the Pantheon codex: layered chitin, gold filigree, predatory hooked bow, the great eye,
distributed eyes, hooked fins.

## Design brief per civilisation (from the Pantheon codex)

| Civilisation | Visual line |
|---|---|
| Savanah | black / gold / emerald · predatory hooks · distributed eyes · living machine ecology |
| Sol Symbiots | white / gold / cyan · flowing protective shells · witness faces · luminous neural channels |
| Chaos | purple / yellow / orange · fractured beast armour · spikes · visible rebuilds |
| Cosmic Darkness | violet starfield · silver constellation lines · cloaked wings · feline sensor forms |
| Cosmic Light | white / gold radiance · solar cores · open celestial blades · visible energy flow |
| Blackhole | midnight armour · orange accretion fire · central mass · gravitational claws |
| Hybrid Fused | industrial grey + bone lattice · violet internals · deliberate asymmetry · stitched seams |
| Human Hunters | olive industrial plate · orange pursuit marks · oversized engines · field-service geometry |
| AI Hunters | matte black · red sensor seams · spear forms · minimal external systems |
| Amethyst Angels | black / gold gothic armour · violet cores · cathedral spires · crowned masks |
| Techno Angels | white crystal frame · icy blue facets · feather arrays · distributed halo systems |
| AI Gods | polished silver-white · gold boundaries · radial reactors · central light |
| Pagan AI | bone / bronze / chains · horned skulls · furnace cores · fortress silhouettes |
| AI | grey modular blocks · cyan circuitry · replaceable geometry · no required anthropomorphism |

## Checks
`npm run smoke` boots the game with every authored model, flies, fights, refits (including dragging a
node across a model's surface), scans and saves. A model that fails to load falls back to its
procedural hull and is reported in the console.
