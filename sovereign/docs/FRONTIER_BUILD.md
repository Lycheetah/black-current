# Frontier pair — local production receipt

6 November 2026. Original ship designs and frontier fiction by Caelorynth for
Mackenzie Conor James Clark / Lycheetah. Local, uncommitted work; no publication.

## What landed

| Ship | Civilisation | Class / length | Export |
| --- | --- | --- | --- |
| Oathbreaker | Cinderwake Compact | Heavy cruiser / 330 m | 77,718 triangles / 3,275 KiB GLB |
| Wake-Eater | Nacre Communion | Cruiser / 280 m | 136,534 triangles / 4,498 KiB GLB |

The Cinderwake Compact is a chosen, mixed-species pirate civilisation. The Nacre
Communion is an alien memory-reef people. Their names, doctrines and faith profiles
are appended to the original fourteen civilisation entries. The existing catalogue
now generates 288 race/class entries; that count includes procedural variants,
not 288 authored hero models.

Each hero has four imported weapon nodes and three named engine markers. Their
authored blueprints select the correct new civilisation and existing gameplay
class. Current registries contain 33 blueprints and 41 model files, including
earlier design studies.

## Sources and review

- `captures/pirates/index.html` — both exported-model studio views and flight links.
- `tools/blender/ships/oathbreaker.py` — authored hard-chine cutter and unequal prow.
- `tools/blender/ships/wake_eater.py` — logarithmic volute and living vessel anatomy.
- `tools/blender/ships/_corsair.py` — surface-fitting construction operations.
- `tools/blender/out/oathbreaker.blend`, `wake_eater.blend` — editable scenes saved
  before the atlas baker joins the geometry.
- `src/data/ships/frontier.js` — original civilisation and faith profiles.
- `docs/FRONTIER_ROADMAP.md` — canonical forward plan and proposed first mission.

Production uses the established ship kit, Cycles PBR atlas baker, gltfpack and GLB
blueprint importer. Both final GLB studio renders were visually inspected. This
is original scripted Blender work; manual sculpting of every panel is not claimed.
EVE's pirate ships and official faction lore were studied as references. No EVE
mesh or texture is incorporated in these ships.

## Acceptance actually run

`bash tools/forge-pirates.sh --finish` completed:

- Two imports, each reporting four weapon nodes and three engine markers.
- Registry generation: 33 blueprints and 41 models.
- Builds of Sovereign Eclipse, Hull Forge and Sector Forge.
- `tools/check-frontier.mjs`: 36 generated frontier hulls, both authored hero
  mappings, five save round trips, unchanged original civilisation order and
  deliberate invalid-save rejection. It found 16 civilisations / 288 hull entries.

The five save cases cover both heroes, both frontier starters and an existing
Savanah starter, including blueprints, fits, identity and salvage. The save schema
was not changed.

Full gameplay regression, in-browser visual acceptance and physical device
performance did not run in this batch. Mac's artistic approval remains open.
Faction diplomacy, the Tithe order, religious-war mechanics and The Unowned
Testament mission are proposed content in the roadmap, not implemented systems.
