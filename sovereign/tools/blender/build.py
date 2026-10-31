"""Build Blender ship scripts into game models.

    /opt/blender-venv/bin/python tools/blender/build.py green_seed

Each tools/blender/ships/<name>.py defines META (name, hull) and build(kit).
Writes src/data/models/<META['name']>.
"""
import importlib.util
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, '..', '..'))
sys.path.insert(0, HERE)
import shipkit  # noqa: E402

for name in sys.argv[1:]:
    spec = importlib.util.spec_from_file_location(name, os.path.join(HERE, 'ships', name + '.py'))
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    shipkit.reset()
    shipkit._mats.clear()
    mod.build(shipkit)
    out = os.path.join(ROOT, 'src', 'data', 'models', mod.META['name'])
    os.makedirs(os.path.join(HERE, 'out'), exist_ok=True)
    raw = os.path.join(HERE, 'out', mod.META['name'].replace('.glb', '.raw.glb'))  # kept for studio renders
    tris = shipkit.export(raw, mod.META.get('tile', 4.0))
    # Shrink for the single-file build with vertex quantization (KHR_mesh_quantization, gltfpack).
    # No meshopt compression: its decoder needs WebAssembly, which strict page policies (the Claude
    # artifact viewer) block. -kn keeps marker empties by name, -km keeps palette material names.
    import subprocess
    subprocess.run(['npx', 'gltfpack', '-i', raw, '-o', out, '-kn', '-km'], cwd=ROOT, check=True)
    print(f"blender model {mod.META['name']} · raw {os.path.getsize(raw) // 1024} KB → packed {os.path.getsize(out) // 1024} KB · {tris} triangles")
    print(f"  uncompressed copy for renders: {os.path.relpath(raw, ROOT)}")
