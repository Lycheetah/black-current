# Three original hulls

Commissioned by **Mackenzie Conor James Clark / Lycheetah**, 5 November 2026.
Designed and modelled by **Caelorynth (Codex)** using Sovereign Eclipse's existing
Blender production pipeline. The civilisations, game and Lycheetah Framework are
Mac's work; the shared ship kit, baker, loader and simulation come from the project
and its existing cloud-agent work.

Local, uncommitted collection based on `claude/sharp-cannon-fmkpsn`, source
`7a437c926568394b477f817acc64f17e53f6b0c9`. Not published.

| Hull | Civilisation / existing class | Length | Design |
| --- | --- | --- | --- |
| Nightglass | Cosmic Darkness / specialist frigate | 75 m | Folded violet mantle, split optical lance, silver astrometry |
| Cinder Cathedral | Pagan AI / dreadnought | 3,000 m | Cut bronze citadel, ivory buttresses, open furnace throat |
| Open Hand | Sol Symbiots / carrier | 3,200 m | Porcelain shells around an open bay, protective arches, inhabited galleries |

These replace three previously generated class/civilisation models. All earlier
authored hulls remain available. The collection adds names, descriptions, geometry
and blueprints; existing flight, fitting and combat rules still own behaviour.
Open Hand's rescue role is art direction, not a new rescue mechanic.

## Inspect and fly

Serve the `sovereign/` folder locally and open
[the visual collection](../captures/atelier/index.html). It offers studio views,
the actual browser renderer from two angles and direct flight links using the
existing development capture mode. It does not require earning capital hulls in
a campaign. The studio photographs import the exported raw GLB.

## Source and production

- Geometry: `tools/blender/ships/nightglass.py`, `cinder_cathedral.py`, `open_hand.py`.
- Shared collection geometry: `tools/blender/ships/_atelier.py`.
- Existing production spine: `tools/blender/build.py`, `shipkit.py`,
  `tools/glb-blueprint.mjs`, `tools/register-ships.py`, `tools/build.mjs`.
- Native editable sources: `tools/blender/out/<name>.blend`, saved before the baker
  joins the geometry. This generated folder is ignored by Git.
- Game models: `src/data/models/<name>_hero.glb` and authored blueprint JSON.

The adapter invokes the existing `build.py`. Each ship supplies `META`, `build(k)`
and `LOOKS`. Production uses the same six-pass Cycles baker, 2048-pixel atlas,
embedded PBR maps and gltfpack quantization. Named hardpoint and drive empties are
retained. Meshopt compression stays off to avoid a WebAssembly decoder requirement.
On this laptop the adapter uses one sample for texture-data passes and four for
ambient occlusion. The material recipes and 2K resolution are retained. Set
`ATELIER_DATA_SAMPLES=12 ATELIER_AO_SAMPLES=12` to reproduce the cloud baker's
default sample budget. Studio lighting renders remain at 32 samples.

```sh
blender --background -noaudio --factory-startup --threads 6 --python-exit-code 1 \
  --python tools/blender/build-atelier.py -- nightglass cinder_cathedral open_hand
node tools/glb-blueprint.mjs src/data/models/nightglass_hero.glb cosmic_darkness_specialist_frigate
node tools/glb-blueprint.mjs src/data/models/cinder_cathedral_hero.glb pagan_ai_dreadnought
node tools/glb-blueprint.mjs src/data/models/open_hand_hero.glb sol_symbiots_carrier
python3 tools/register-ships.py
npm run build
node tools/witness-atelier.mjs
```

Set `NOBAKE=1` for an inexpensive geometry pass. Studio photographs:

```sh
blender --background -noaudio --factory-startup --threads 6 --python-exit-code 1 \
  --python tools/blender/render-atelier.py -- nightglass cinder_cathedral open_hand
```

Run heavy stages sequentially. Studio rendering defaults to six CPU threads. The
focused witness starts and closes its own local HTTP server and browser.

## Acceptance boundary

The focused witness examines three actual GLBs, embedded baked maps, exact bank
and drive counts and a 70k-triangle geometry ceiling. Known-bad copies prove it
rejects a missing hardpoint and a missing normal map. It boots the real game for
every hull, checks authored-model selection and world scale, checks live turrets
and drives, moves the ship and captures two views. The result is
[witness.json](../captures/atelier/witness.json).

Captures do not establish phone performance, combat balance, CCP production parity
or Mac's final artistic judgement. EVE is the visual target, not an independently
established quality verdict.
