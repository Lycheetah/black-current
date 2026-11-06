# Three new beasts — second ship collection

Original designs by Caelorynth for Mackenzie Conor James Clark / Lycheetah.
Uses the established cloud-agent Blender ship kit, Cycles baker and model pipeline.

- Rivet Hound: Human Hunters assault frigate, 70 m.
- Eidolon Bastion: Hybrid Fused dreadnought, 3,000 m.
- Thorn Sovereign: Savanah carrier, 3,200 m.

[Open the collection](../captures/atelier-ii/index.html). Each hull has a direct
flight link. The existing Savanah Apex is credited separately as the comparison
hull and appears in the same studio lighting. Rifter and Kronos informed the
study of exposed systems, negative space, armour layering and density; their
models were not imported.

Editable scripts live under `tools/blender/ships/`; `_foundry.py` composes the
existing Apex armour, machinery, conduits, barbette and drive functions.
Native sources are saved before joining/baking in `tools/blender/out/`.
Exports are in `src/data/models/`, and the existing blueprint importer reads
weapon-bank and drive markers into `src/data/blueprints/`.

Production settings reuse the measured laptop configuration: 2K PBR atlas,
one sample for texture data, four for ambient occlusion; 16-sample denoised
Cycles studio photographs. One production batch and one visual/build acceptance
pass; no additional browser verification harness for this collection.

Local and uncommitted. No push or publication is authorized. Existing combat,
flight and fitting rules are retained. Gameplay regression, device performance
and final artistic approval remain outside the completed production checks.
