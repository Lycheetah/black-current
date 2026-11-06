# The Nine — Sovereign Eclipse collection III

Status: design studies, held at Mac's instruction to favour quality over quantity.
Eight initial studio renders were produced. Lattice Tyrant's production was stopped
during baking. The remaining original studies are preserved without fleet
integration. Vesper Basilica's focused rebuild is exported and integrated locally;
see `captures/elite-nine/vesper.html` for the current export and earlier comparison,
and `docs/VESPER_REBUILD.md` for its production receipt.

Original hulls authored by Caelorynth for Mackenzie Conor James Clark / Lycheetah.
The existing Savanah Apex is the project benchmark. CCP's Rifter, Kronos and ship
art articles inform silhouette, exposed systems and layered construction; no EVE
mesh, texture or other game asset is imported.

| Ship | Civilisation | Class | Length |
| --- | --- | --- | ---: |
| Iron Jackal | Human Hunters | Heavy cruiser | 330 m |
| Red Verdict | AI Hunters | Battleship | 1,000 m |
| Vesper Basilica | Amethyst Angels | Battleship | 1,000 m |
| Daybreak Reliquary | Cosmic Light | Carrier | 3,200 m |
| Silent Meridian | Cosmic Darkness | Battleship | 1,000 m |
| Ruin Regent | Chaos | Dreadnought | 3,000 m |
| Prism Seraph | Techno Angels | Carrier | 3,200 m |
| Ashen Pilgrim | Pagan AI | Battleship | 1,000 m |
| Lattice Tyrant | AI | Dreadnought | 3,000 m |

[Open the gallery and flight links](../captures/elite-nine/index.html).

Each `tools/blender/ships/<name>.py` file owns the ship's composition. `_elite.py`
shares production operations using the same ship kit and `_forge.py` armour,
machinery, conduits and weapon mounts used by the cloud-authored Apex. Plates use
consistent winding and ground their surface detail on their evaluated faces.

Editable native sources are saved before joining in `tools/blender/out/*.blend`.
The six-map Cycles baker produces 2K PBR atlases; gltfpack emits GLBs without a
WASM decoder requirement. Studio renders use the actual exports, the same light
rig as the Apex reference and 16 denoised samples.

`bash tools/forge-elite-nine.sh --run` produces the collection serially, then uses
the existing GLB blueprint importer, registry generator and game build. Weapon and
drive markers retain their existing game semantics. Names and descriptions are
registered through `src/data/ships/atelier.js`; class statistics remain governed
by the fleet catalog.

This is local, uncommitted work. The nine-hull collection is not complete or
accepted. Full gameplay regression, phone performance and Mac's final artistic
approval remain unverified.

## References

- [CCP: Viridian in Focus](https://www.eveonline.com/news/view/viridian-in-focus)
- [CCP: Iconic Ships Reimagined — Minmatar Rupture](https://www.eveonline.com/news/view/iconic-ships-reimagined-the-minmatar-rupture)
- [Rifter, official ship render](https://images.evetech.net/types/587/render?size=1024)
- [Kronos, official ship render](https://images.evetech.net/types/28661/render?size=1024)
